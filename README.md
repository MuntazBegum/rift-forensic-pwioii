
<font size="6">🔍 Forensics Engine: Enterprise-Grade AML & Money Muling Detection</font>
> RIFT 2026 Hackathon · High-Performance Graph Theory / Financial Crime Track
> 
<p align="center">
<a href="https://www.google.com/search?q=%23-executive-summary">Executive Summary</a> •
<a href="https://www.google.com/search?q=%23-tech-stack">Tech Stack</a> •
<a href="https://www.google.com/search?q=%23-system-architecture">Architecture</a> •
<a href="https://www.google.com/search?q=%23-topological-algorithm-engine">Algorithm</a> •
<a href="https://www.google.com/search?q=%23-deterministic-heuristic-engine">Heuristics</a> •
<a href="https://www.google.com/search?q=%23-installation--local-development">Installation</a> •
<a href="https://www.google.com/search?q=%23-team">Team</a>
</p>
<a name="-executive-summary"></a>
<font size="5">📌 Executive Summary</font>
The Forensics Engine is a high-throughput graph analytics platform engineered to unmask sophisticated Anti-Money Laundering (AML) typologies. By transforming flat transaction data into a Directed Relational Topology, we isolate illicit "layering" cycles and smurfing hubs that traditional SQL-based monitoring often misses.
Key Performance Metric: Processes and visualizes complex financial networks in under 30 seconds with zero-persistence data handling for maximum privacy and GDPR/CCPA compliance.
<a name="-tech-stack"></a>
<font size="5">🚀 Tech Stack & Infrastructure</font>
| Layer | Technology | Engineering Rationale |
|---|---|---|
| Frontend UI | React 18 + Vite | Optimized for sub-second bundle loading and asynchronous state management. |
| Visualization | react-force-graph-2d | Canvas-based rendering capable of fluidly animating thousands of nodes. |
| Backend API | FastAPI (Python 3.11) | Asynchronous I/O optimization for high-concurrency data ingestion. |
| Data Processing | Pandas + NetworkX | Vectorized dataframe operations feeding directly into adjacency matrix generation. |
| Cloud Hosting | Vercel & Render | Decoupled microservices architecture with edge-network distribution. |
<a name="-system-architecture"></a>
<font size="5">🏗 System Architecture</font>
Our architecture prioritizes a stateless execution model. This ensures that heavy graph calculations are offloaded to the backend core, keeping the UI responsive for real-time investigation.
User Browser (Client)
    │
    ▼ Asynchronous CSV Ingestion
┌────────────────────────────────────────────────────────┐
│  React Presentation Layer (Vercel Edge Network)        │
│  · WebGL/Canvas Force-Directed Topology Engine         │
│  · Tabular Threat Matrix & JSON Artifact Export        │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /analyze (Multipart Stream)
                           ▼
┌────────────────────────────────────────────────────────┐
│  FastAPI Analytics Core (Render Cloud Container)       │
│  · Vectorized Graph Instantiation G=(V,E)              │
│  · Cycle Enumeration & Topological Sorting             │
│  · Temporal Heuristic Engine (Noise Suppression)       │
└────────────────────────────────────────────────────────┘

<a name="-topological-algorithm-engine"></a>
<font size="5">🧠 Topological Algorithm Engine</font>
The core engine maps financial transmissions as a directed graph G = (V, E), evaluating risk through a multi-factor weighted matrix:
1. Recursive Cycle Detection
Utilizes networkx.simple_cycles() to isolate "Circular Layering"—where funds are moved through k \in \{3, 4, 5\} intermediaries to obscure origin.
2. Hub-and-Spoke (Smurfing) Analysis
Identifies nodes based on degree distribution thresholds:
 * Aggregation Hubs (Fan-in): Nodes with In\_Degree \ge 10.
 * Dispersal Hubs (Fan-out): Nodes with Out\_Degree \ge 10.
3. Proprietary Threat Scoring Matrix
| Risk Signal | Weight | Logic |
|---|---|---|
| Cyclical Participation | +50 | Validates intentional layering circuits. |
| Fan-Out Velocity | +35 | Detects rapid illicit fund distribution. |
| Betweenness Centrality | +15 | Identifies "Bridge" accounts linking distinct fraud cells. |
<a name="-deterministic-heuristic-engine"></a>
<font size="5">🛡 Deterministic Heuristic Engine (Noise Suppression)</font>
> The primary innovation to eliminate Alert Fatigue.
> 
One of the largest challenges in AML is the misclassification of legitimate high-volume entities (e.g., payroll processors). Our engine executes a Temporal Variance Check:
If an account shows high volume (Out\_Degree > 50) but 100% of transactions occur on a fixed day-of-month (e.g., the 1st or 15th), the system classifies it as a Legitimate Processor and:
 * Forcefully zeros the suspicion score.
 * Removes the node from the fraud-ring visualization.
<a name="-installation-guide"></a>
<font size="5">⚙️ Installation & Local Development</font>
Backend Microservice
cd backend
python -m venv venv
venv\Scripts\activate     # Windows environment
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

Frontend Presentation Layer
cd frontend
npm install
cp .env.example .env      # Set VITE_API_URL=http://localhost:8000
npm run dev

<a name="-team"></a>
<font size="5">👥 Engineering Team</font>
| Name | Domain Specialization | GitHub |
|---|---|---|
| Mohammed Farhan Ahmed | Backend / Algorithmic Engineering | Profile |
| Muntaz Begum | Frontend Architecture / Visualization | @MuntazBegum |
| Sneha Bera | Data Quality & Unit Testing | Profile |
| Mohammed Ammar Ahmed | DevOps / Cloud Deployment | Profile |
