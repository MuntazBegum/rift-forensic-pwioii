from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import networkx as nx
from datetime import datetime
import io

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Forensics Engine API running"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Analyze CSV for money muling networks
    """
    try:
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Build graph
        G = nx.DiGraph()
        for _, row in df.iterrows():
            sender = row['sender_id']
            receiver = row['receiver_id']
            amount = row['amount']
            timestamp = row['timestamp']
            G.add_edge(sender, receiver, amount=amount, timestamp=timestamp)
        
        # Detect cycles
        cycles = list(nx.simple_cycles(G))
        suspicious_accounts = []
        
        # Basic analysis
        for node in G.nodes():
            in_degree = G.in_degree(node)
            out_degree = G.out_degree(node)
            
            if in_degree >= 10 or out_degree >= 10:
                suspicious_accounts.append({
                    "account_id": node,
                    "in_degree": in_degree,
                    "out_degree": out_degree,
                    "suspicion_score": min(100, (in_degree + out_degree) * 5)
                })
        
        return {
            "success": True,
            "cycles_found": len(cycles),
            "suspicious_accounts": suspicious_accounts,
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges()
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
