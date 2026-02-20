

---

# 🔍 Forensics Engine — Advanced Money Muling Detection System

<div align="center">

> **RIFT 2026 Hackathon** · *Graph Theory / Financial Crime Detection Track*

**[🔴 Live Interactive Demo](https://rift-forensic-pwioii.vercel.app/)**   |   **[📂 GitHub Repository](https://github.com/MuntazBegum/rift-forensic-pwioii/)**

</div>

---

## 📑 Table of Contents

1. [Executive Overview](https://www.google.com/search?q=%23overview)
2. [Enterprise Tech Stack](https://www.google.com/search?q=%23tech-stack)
3. [System Architecture](https://www.google.com/search?q=%23architecture)
4. [Algorithmic Approach & Graph Theory](https://www.google.com/search?q=%23algorithms)
5. [Proprietary Temporal Heuristic Engine](https://www.google.com/search?q=%23heuristics)
6. [Local Development Guide](https://www.google.com/search?q=%23installation)
7. [Cloud Deployment](https://www.google.com/search?q=%23deployment)
8. [System Limitations & Roadmap](https://www.google.com/search?q=%23limitations)
9. [The Engineering Team](https://www.google.com/search?q=%23team)

---

## <a id="overview"></a>📌 Executive Overview

Financial institutions lose billions annually to sophisticated laundering networks. We engineered an enterprise-grade, real-time **Financial Forensics Engine** designed to autonomously detect multi-layered money muling networks and smurfing operations within massive transaction datasets.

By leveraging high-throughput in-memory processing and advanced graph-theoretic algorithms, the engine ingests raw transaction logs (CSV) and renders an interactive, force-directed topological map of hidden fraud rings in **under 30 seconds**. The system culminates in a structured, actionable JSON intelligence report ready for compliance and risk-management teams.

---

## <a id="tech-stack"></a>🚀 Enterprise Tech Stack

Our stateless, microservices-inspired architecture relies on a highly optimized modern stack:

| Layer | Technology & Purpose |
| --- | --- |
| **Frontend UI/UX** | **React 18 & Vite** – Ensures a lightning-fast virtual DOM for rendering heavy analytical dashboards. |
| **Data Visualization** | **react-force-graph-2d** – Canvas-based rendering capable of mapping thousands of nodes seamlessly. |
| **Backend API** | **Python 3.11 & FastAPI** – High-performance asynchronous API layer for rapid data ingestion. |
| **Data Pipeline** | **Pandas** – Vectorized, high-throughput memory processing for instant dataset normalization. |
| **Graph Analytics** | **NetworkX** – Deep topological traversal and complex network mathematical modeling. |
| **Cloud Hosting** | **Vercel** (Edge Delivery) & **Render** (Containerized Backend) |

---

## <a id="architecture"></a>🏗 System Architecture

The engine utilizes a decoupled, stateless architecture to ensure rapid horizontal scaling and zero data-persistence bottlenecks.

```text
[ Client Environment ]
   │
   ▼ Multipart Form Data Ingestion (CSV)
┌────────────────────────────────────────────────────────┐
│  Frontend Presentation Layer (Vercel Edge Network)     │
│  · Client-side Validation & Parsing UI                 │
│  · WebGL/Canvas Force-Directed Topology Engine         │
│  · Dynamic Threat Matrix Table                         │
│  · Automated JSON Compliance Export                    │
└──────────────────────────┬─────────────────────────────┘
                           │ Asynchronous POST /analyze
                           ▼
┌────────────────────────────────────────────────────────┐
│  Analytics & Heuristics API (Render Cloud Services)    │
│  · Vectorized Data Normalization (Pandas)              │
│  · Directed Graph Construction (NetworkX)              │
│  · Non-linear Cycle Enumeration                        │
│  · Fan-in/Fan-out Smurfing Detection                   │
│  · Temporal Heuristic Engine (False-Positive Filter)   │
└────────────────────────────────────────────────────────┘

```

---

## <a id="algorithms"></a>🧠 Algorithmic Approach & Graph Theory

### 1. Topological Graph Construction

Raw tabular data is transformed into a multi-dimensional directed graph. Unique accounts (`sender_id`, `receiver_id`) are mapped as vertices, while transaction vectors (amount, timestamp) form weighted directed edges.

### 2. Deep Cycle Enumeration (Layering Detection)

To detect the "layering" phase of money laundering, we implemented a targeted depth-search utilizing `networkx.simple_cycles()`. We strictly isolate elementary cycles of lengths **3, 4, and 5**, representing the precise structural depth typically utilized by organized muling rings to obfuscate audit trails. Identified clusters are mathematically tagged with a unique `RING_XXX` identifier.

### 3. Structural Smurfing Detection (Fan-In / Fan-Out)

We analyze vertex degrees to identify critical placement and integration hubs:

* **Fan-in (Aggregation):** In-degree ≥ 10. Flags hubs where localized mules deposit illicit funds.
* **Fan-out (Dispersal):** Out-degree ≥ 10. Flags controllers distributing funds to shell accounts.

### 4. Dynamic Suspicion Scoring Matrix

Accounts are evaluated through a rigorous, multi-variate scoring matrix (0–100 index):

| Vector Signal | Threat Weight |
| --- | --- |
| **Cycle Participation** | Base +50 (Critical Threat), +10 per overlapping cycle (Max +30) |
| **Layered Shell Network** | +40 |
| **Fan-Out (Dispersal)** | +35 |
| **Fan-In (Aggregation)** | +30 (Contextual: validates onward movement; penalizes static merchant hubs -10) |
| **High-Velocity Pass-Through** | +15 (Requires In-Degree > 5 AND Out-Degree > 5) |
| **High Centrality Bridge** | +15 (Betweenness Centrality index > 0.1) |

---

## <a id="heuristics"></a>🛡 Proprietary Temporal Heuristic Engine (False-Positive Mitigation)

> **💡 The Competitive Edge:** Standard degree-based fraud models suffer heavily from false positives by accidentally flagging corporate payroll or automated subscription processors.

To solve this, we engineered a **Temporal Heuristic Engine**. The system isolates mega-nodes (`out_degree > 50`) and executes a high-speed chronological cross-reference. If 100% of outgoing transaction vectors align on a singular chronologic axis (e.g., exclusively on the 1st or 15th of the month), the node is mathematically verified as a **Legitimate Bulk Processor**.

**Automated Remediation:**

* Extracted entirely from the `suspicious_accounts` ledger.
* Threat score forcefully zeroed.
* Bypassed in visual ring renderings.
*(This achieves enterprise-level filtering using a highly efficient `groupby` on time-series data, preserving processing speed.)*

---

## <a id="installation"></a>⚙️ Local Development Guide

To run this pipeline locally, follow these steps. For full context, ensure you are cloned from the [main repository](https://github.com/MuntazBegum/rift-forensic-pwioii/).

### 1. Backend Initialization (Python/FastAPI)

```bash
cd backend
python -m venv venv
# Activate virtual environment (Windows)
venv\Scripts\activate
# Activate virtual environment (Mac/Linux)
# source venv/bin/activate

pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

```

### 2. Frontend Initialization (React/Vite)

```bash
cd frontend
npm install
cp .env.example .env 
# Ensure you set VITE_API_URL=http://localhost:8000 in your .env
npm run dev

```

---

## <a id="deployment"></a>☁️ Cloud Deployment Protocol

### Deploy Backend via Render

1. Authenticate with [Render](https://render.com) and select **New Web Service**.
2. Bind the GitHub repository.
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Map environmental variables and execute deployment.

### Deploy Frontend via Vercel

1. Authenticate with [Vercel](https://vercel.com) and import the repository.
2. Select **Vite** as the framework preset.
3. Inject the Render API URL into the `VITE_API_URL` environment variable.
4. Deploy to Edge network.

---

## <a id="limitations"></a>⚠️ System Limitations & Future Roadmap

* **Algorithmic Constraints:** Current `nx.simple_cycles()` implementation exhibits exponential worst-case complexity  on highly dense datasets. **Production Roadmap:** Refactor to leverage Johnson’s algorithm paired with an absolute depth-cutoff limit for graphs >5,000 nodes.
* **Threshold Elasticity:** Smurfing triggers (≥10) are statically defined. Future iterations will utilize dynamic K-Means clustering to adjust thresholds based on institutional baselines.
* **State Management:** The architecture is intentionally stateless for this MVP. Production deployments will require integration with a graph database (e.g., Neo4j) for persistent state.
* **Temporal Upgrades:** The payroll heuristic currently relies on strict `day_of_month` logic. The next evolution will employ Fast Dynamic Time Warping (FastDTW) for nuanced time-series clustering.

---

## <a id="team"></a>👥 The Engineering Team

| Engineer | Core Responsibility Focus |
| --- | --- |
| **Mohammed Farhan Ahmed** | API Architecture, Graph Algorithms & Threat Scoring |
| **Muntaz Begum** | WebGL Visualization, UI/UX Engineering & Client State |
| **Sneha Bera** | Data Engineering, Pipeline Testing & Normalization |
| **Mohammed Ammar Ahmed** | Cloud Infrastructure, CI/CD Deployment & Technical Documentation |

---
