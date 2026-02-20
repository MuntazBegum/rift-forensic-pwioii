import time
import io
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import networkx as nx
from collections import defaultdict
from datetime import timedelta

app = FastAPI(title="Financial Forensics Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def compute_suspicion_score(node, G, cycles_by_node, smurfing_type, shell_chains):
    score = 0.0
    in_deg = G.in_degree(node)
    out_deg = G.out_degree(node)
    total_deg = in_deg + out_deg

    # 1. Cycle Participation (High Risk)
    if node in cycles_by_node:
        cycle_count = len(cycles_by_node[node])
        # Base score for being in a ring + booster for multiple rings
        score += 50 + min(30, cycle_count * 10)

    # 2. Layered Shell (Medium-High Risk)
    if node in shell_chains:
        score += 40

    # 3. Smurfing (structure + temporal)
    # Fan-out is classic muling (dispersal)
    if "fan_out" in smurfing_type.get(node, []):
        score += 35
    
    # Fan-in (aggregation) - Only flag if they also move money OUT (pass-through)
    # If they just collect (high in, low out), they are likely a merchant, not a mule.
    if "fan_in" in smurfing_type.get(node, []):
        if out_deg > 0:  # Mules must move money ONWARD
            score += 30
        else:
            # Merchant behavior: High in, Zero out (in this network). Reduce score.
            score -= 10 

    # 4. High Velocity (Pass-through behavior)
    # High volume in AND out is suspicious. High volume just one way is less so.
    if in_deg > 5 and out_deg > 5:
        score += 15

    return max(0.0, min(100.0, round(score, 2)))


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    start_time = time.time()

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    # Required columns check
    required = {"transaction_id", "sender_id", "receiver_id", "amount", "timestamp"}
    if not required.issubset(df.columns):
        raise HTTPException(status_code=400, detail=f"Missing columns. Need: {required}")

    # Data Preprocessing
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["sender_id"] = df["sender_id"].astype(str)
    df["receiver_id"] = df["receiver_id"].astype(str)
    
    # Build Graph
    G = nx.DiGraph()
    # Pre-calculate edge attributes for faster lookup
    for _, row in df.iterrows():
        # Ensure timestamp is a string for JSON serialization
        ts = row["timestamp"]
        if isinstance(ts, pd.Timestamp):
            ts = ts.isoformat()
        else:
            ts = str(ts)
            
        G.add_edge(str(row["sender_id"]), str(row["receiver_id"]),
                   amount=float(row["amount"]), timestamp=ts)

    all_nodes = list(G.nodes())
    total_accounts = len(all_nodes)
    
    fraud_rings = []
    ring_counter = 1
    # Maps node_id -> ring_id
    node_ring_map = {} 

    # ==========================================
    # 1. OPTIMIZED CYCLE DETECTION (Length 3-5)
    # ==========================================
    # Standard nx.simple_cycles is exponential. We limit search or use standard for small-medium graphs.
    # For Hackathon 10k dataset, simple_cycles MIGHT T/O. 
    # We'll use a pragmatic approach: nx.simple_cycles is usually fine for financial transaction graphs 
    # (sparse), but if it takes too long, we abort.
    
    # Finding cycles
    try:
        # We can filter cycles by length immediately
        raw_cycles = nx.simple_cycles(G)
        cycles = []
        # Limit to first 1000 cycles to prevent infinite hangs in dense attacks
        for i, c in enumerate(raw_cycles):
            if i > 5000: break 
            if 3 <= len(c) <= 5:
                cycles.append(c)
    except:
        cycles = []

    cycles_by_node = defaultdict(list)
    for i, cycle in enumerate(cycles):
        ring_id = f"RING_{ring_counter:03d}"
        ring_counter += 1
        
        # Determine strictness of cycle (money flow consistency)
        amounts = []
        for j in range(len(cycle)):
            u, v = cycle[j], cycle[(j+1)%len(cycle)]
            amounts.append(G[u][v].get("amount", 0))
        
        # Risk score: Higher if amounts are similar (structuring)
        avg_amt = sum(amounts) / len(amounts)
        variance = sum((x - avg_amt) ** 2 for x in amounts) / len(amounts)
        consistency_bonus = 20 if variance < (avg_amt * 0.2) else 0 # Bonus for uniform amounts
        
        risk_score = min(100.0, round(60 + len(cycle)*5 + consistency_bonus, 2))

        fraud_rings.append({
            "ring_id": ring_id,
            "member_accounts": cycle,
            "pattern_type": f"cycle_length_{len(cycle)}",
            "risk_score": risk_score
        })
        
        for node in cycle:
            cycles_by_node[node].append(i)
            node_ring_map[node] = ring_id

    # ==========================================
    # 2. SMURFING DETECTION (Star Patterns)
    # ==========================================
    # Instead of one giant group, we identify the "Hub" of each star
    
    smurfing_type = defaultdict(list)
    
    # Pre-calculate degrees and edges (time-sorted)
    # G.in_edges(node, data=True) returns (u, v, data)
    
    processed_smurfs = set()

    for node in G.nodes():
        # Get edges with data
        in_edges = list(G.in_edges(node, data=True))
        out_edges = list(G.out_edges(node, data=True))
        
        # 1. Fan-In Aggregation (Many -> One)
        if len(in_edges) >= 10: # Updated threshold to 10 as per requirements
            timestamps = []
            for u, v, d in in_edges:
                # Ensure timestamp is datetime
                if isinstance(d.get("timestamp"), str):
                     timestamps.append(pd.to_datetime(d["timestamp"]))
                else:
                     timestamps.append(d["timestamp"])
            
            timestamps.sort()
            if timestamps:
                duration = (timestamps[-1] - timestamps[0]).total_seconds() / 3600
                # If dense activity within 72h
                if duration <= 72:
                    smurfing_type[node].append("fan_in")
                    # Create Ring
                    members = list(set([u for u, _, _ in in_edges] + [node]))
                    
                    # Only add if significant
                    if len(members) > 2:
                        ring_id = f"RING_{ring_counter:03d}"
                        ring_counter += 1
                        
                        fraud_rings.append({
                            "ring_id": ring_id,
                            "member_accounts": members,
                            "pattern_type": "smurfing_fan_in",
                            "risk_score": min(100.0, 70 + len(members))
                        })
                        node_ring_map[node] = ring_id
                        for m in members:
                             if m not in node_ring_map: node_ring_map[m] = ring_id

        # 2. Fan-Out Distribution (One -> Many)
        if len(out_edges) >= 10: # Updated threshold to 10 as per requirements
            timestamps = []
            for u, v, d in out_edges:
                if isinstance(d.get("timestamp"), str):
                     timestamps.append(pd.to_datetime(d["timestamp"]))
                else:
                     timestamps.append(d["timestamp"])
            
            timestamps.sort()
            if timestamps:
                duration = (timestamps[-1] - timestamps[0]).total_seconds() / 3600
                if duration <= 72:
                    smurfing_type[node].append("fan_out")
                    # Create Ring
                    members = list(set([v for _, v, _ in out_edges] + [node]))
                    
                    if len(members) > 2:
                        ring_id = f"RING_{ring_counter:03d}"
                        ring_counter += 1
                        
                        fraud_rings.append({
                            "ring_id": ring_id,
                            "member_accounts": members,
                            "pattern_type": "smurfing_fan_out",
                            "risk_score": min(100.0, 70 + len(members))
                        })
                        node_ring_map[node] = ring_id
                        for m in members:
                            if m not in node_ring_map: node_ring_map[m] = ring_id

    # ==========================================
    # 3. LAYERED SHELL NETWORKS
    # ==========================================
    # Pattern: A -> Shell -> Shell -> B
    # Shell: Low total transactions (2-3) but part of a chain
    shell_chains = set()
    
    # Identify potential shell nodes: Total degree 2 or 3 (1 in, 1 out; 1 in 2 out, etc)
    # Need to calculate degrees first
    degrees = {node: (G.in_degree(node), G.out_degree(node)) for node in G.nodes()}
    potential_shells = [n for n, (in_d, out_d) in degrees.items() if 2 <= (in_d + out_d) <= 3 and in_d > 0 and out_d > 0]
    shell_set = set(potential_shells)
    
    # Look for connected components of shells
    if shell_set:
        H = G.subgraph(shell_set)
        # Find weakly connected components in the shell subgraph
        for component in nx.weakly_connected_components(H):
            if len(component) >= 2: # Chain of at least 2 shells implies A->S1->S2->B (3+ hops total)
                # Verify specific chain structure logic if needed, but WCC is a good proxy for "shell network"
                ring_id = f"RING_{ring_counter:03d}"
                ring_counter += 1
                comp_list = list(component)
                
                fraud_rings.append({
                    "ring_id": ring_id,
                    "member_accounts": comp_list,
                    "pattern_type": "layered_shell_network",
                    "risk_score": 85.0 # High risk for sophisticated layering
                })
                
                for node in component:
                    shell_chains.add(node)
                    node_ring_map[node] = ring_id

    # ==========================================
    # 4. FP CONTROL: PAYROLL / MERCHANT EXCLUSION
    # ==========================================
    # Payroll: High Fan-Out, strict temporal clustering (all same day), usually ZER0 Fan-In (from business capital)
    # Merchant: High Fan-In, Low Fan-Out (to bank), usually consistent over long info, not bursty (handled by 72h check)
    
    # Explicit White-listing (overrides suspicion)
    whitelist = set()
    for node, (in_d, out_d) in degrees.items():
        # Payroll Trap: High Out, Zero In (in this graph), all on same day
        if out_d > 20 and in_d == 0:
            out_times = [d["timestamp"] for u, v, d in G.out_edges(node, data=True)]
            # Fix: Timestamps are stored as strings in G, need to parse
            unique_days = {pd.to_datetime(t).date() for t in out_times}
            if len(unique_days) <= 2: # Allow 1-2 paydays
                whitelist.add(node)
    
    # ==========================================
    # 4b. NETWORK CENTRALITY METRICS
    # ==========================================
    try:
        deg_centrality = nx.degree_centrality(G)
        bet_centrality = nx.betweenness_centrality(G, k=min(len(G), 50))
    except Exception:
        deg_centrality = {n: 0 for n in all_nodes}
        bet_centrality = {n: 0 for n in all_nodes}

    # ==========================================
    # 5. GENERATE RESULTS
    # ==========================================
    suspicious_accounts = []
    
    # Candidates: Anyone with a pattern
    candidates = set(cycles_by_node.keys()) | set(smurfing_type.keys()) | shell_chains
    
    for node in candidates:
        if node in whitelist:
            continue
            
        score = compute_suspicion_score(node, G, cycles_by_node, smurfing_type, shell_chains)
        
        if score > 0: # Only report if score is positive
            patterns = []
            if cycles_by_node[node]: 
                lens = sorted(list(set(len(cycles[i]) for i in cycles_by_node[node])))
                patterns.extend([f"cycle_length_{l}" for l in lens])
            
            if "fan_in" in smurfing_type[node]: patterns.append("smurfing_fan_in")
            if "fan_out" in smurfing_type[node]: patterns.append("smurfing_fan_out")
            if node in shell_chains: patterns.append("layered_shell")
                
            patterns = list(set(patterns)) # dedup
            
            # Centrality Boost
            c_bet = bet_centrality.get(node, 0)
            c_deg = deg_centrality.get(node, 0)
            
            if c_bet > 0.1:
                score = min(100.0, score + 15)
                if score > 50: patterns.append("high_centrality_bridge")
            
            if score > 0:
                suspicious_accounts.append({
                    "account_id": node,
                    "suspicion_score": round(score, 2),
                    "detected_patterns": patterns,
                    "ring_id": node_ring_map.get(node, "RING_NONE"),
                    "centrality": {
                        "degree": round(c_deg, 4),
                        "betweenness": round(c_bet, 4)
                    }
                })

    # Sort
    suspicious_accounts.sort(key=lambda x: x["suspicion_score"], reverse=True)
    
    # Build Graph Response with Ring Edge Highlighting
    ring_edges = set()
    for cycle in cycles:
        for i in range(len(cycle)):
            u, v = cycle[i], cycle[(i+1)%len(cycle)]
            ring_edges.add((u, v))
            
    # Also add smurfing ring edges
    for ring in fraud_rings:
        if "smurfing" in ring["pattern_type"]:
            mems = ring["member_accounts"]
            for m1 in mems:
                for m2 in mems:
                    if G.has_edge(m1, m2):
                        ring_edges.add((m1, m2))

    susp_ids = {x["account_id"] for x in suspicious_accounts}
    
    graph_data = {
        "nodes": [
            {
                "id": n,
                "in_degree": degrees[n][0],
                "out_degree": degrees[n][1],
                "suspicious": n in susp_ids,
                "score": next((item["suspicion_score"] for item in suspicious_accounts if item["account_id"] == n), 0),
                "centrality_score": bet_centrality.get(n, 0)
            }
            for n in G.nodes()
        ],
        "links": [
            {
                "source": u, 
                "target": v, 
                "amount": float(d["amount"]),
                "timestamp": d["timestamp"],
                "is_ring": (u, v) in ring_edges
            } 
            for u, v, d in G.edges(data=True)
        ]
    }

    process_time = round(time.time() - start_time, 2)
    
    return {
        "suspicious_accounts": suspicious_accounts,
        "fraud_rings": fraud_rings,
        "summary": {
            "total_accounts_analyzed": total_accounts,
            "suspicious_accounts_flagged": len(suspicious_accounts),
            "fraud_rings_detected": len(fraud_rings),
            "processing_time_seconds": process_time
        },
        "_graph": graph_data
    }
