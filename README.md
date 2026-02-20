This looks like a fantastic hackathon project! It’s got a solid tech stack, a clear analytical approach to a real-world problem, and an easy-to-understand architecture.
I've enhanced your README with a clean Table of Contents (using anchor links), dynamic Shields.io badges for your tech stack (linked directly to their respective GitHub repositories), and improved formatting for maximum readability.
Here is your upgraded repository documentation:
# 🔍 Forensics Engine — Money Muling Detection System

> **RIFT 2026 Hackathon** · Graph Theory / Financial Crime Detection Track

[![Vercel Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://rift-forensic-pwioii.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/MuntazBegum/rift-forensic-pwioii/)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-algorithm-approach">Algorithm</a> •
  <a href="#-temporal-heuristic-engine">Heuristics</a> •
  <a href="#️-installation--local-development">Installation</a> •
  <a href="#️-deployment">Deployment</a> •
  <a href="#️-limitations">Limitations</a> •
  <a href="#-team">Team</a>
</p>

---

## 📌 Overview

A real-time, graph-based Financial Forensics Engine that detects money muling networks in transaction data. Upload a CSV, get an interactive force-directed graph highlighting fraud rings, download a structured JSON report — all in under 30 seconds.

---

## 🚀 Tech Stack

| Layer | Technology | Links & Source |
|---|---|---|
| **Frontend** | [![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://github.com/facebook/react) [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)](https://github.com/vitejs/vite) | [react-force-graph-2d](https://github.com/vasturiano/react-force-graph) |
| **Backend** | [![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://github.com/python/cpython) [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://github.com/tiangolo/fastapi) | [![Pandas](https://img.shields.io/badge/Pandas-150458?style=flat&logo=pandas&logoColor=white)](https://github.com/pandas-dev/pandas) [![NetworkX](https://img.shields.io/badge/NetworkX-000000?style=flat&logo=python)](https://github.com/networkx/networkx) |
| **Frontend Hosting**| [![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://github.com/vercel/vercel) | Vercel Free Tier |
| **Backend Hosting** | [![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white)](https://github.com/render-examples) | Render Free Tier |
| **Database** | *None* | In-memory CSV processing |

---

## 🏗 System Architecture



```text
User Browser
    │
    ▼ Upload CSV
┌─────────────────────────────────┐
│  React Frontend (Vercel)        │
│  · File Upload UI               │
│  · react-force-graph-2d canvas  │
│  · Fraud Ring Table             │
│  · JSON Export Button           │
└────────────────┬────────────────┘
                 │ POST /analyze (multipart/form-data)
                 ▼
┌─────────────────────────────────┐
│  FastAPI Backend (Render)       │
│  · Pandas: CSV parsing          │
│  · NetworkX: DiGraph build      │
│  · nx.simple_cycles(): rings    │
│  · Degree analysis: smurfing    │
│  · Temporal Heuristic Engine    │
│  · JSON response                │
└─────────────────────────────────┘

🧠 Algorithm Approach
1. Graph Construction
Every unique sender_id and receiver_id becomes a node. Each transaction becomes a directed edge sender → receiver with amount and timestamp as edge attributes.
2. Cycle Detection (Money Muling Rings)
Uses networkx.simple_cycles() to enumerate all elementary cycles in the directed graph. We filter to lengths 3, 4, and 5, which represent the typical layering depth of money muling operations. Each detected cycle is assigned a RING_XXX identifier.
3. Smurfing Detection (Fan-in / Fan-out)
 * Fan-in: Any node with in_degree ≥ 10 is flagged as a potential aggregation hub.
 * Fan-out: Any node with out_degree ≥ 10 is flagged as a potential distribution hub.
 * All smurfing nodes are grouped into a single smurfing ring entry.
4. Suspicion Score Calculation
Each flagged account receives a score from 0–100:
| Signal | Score Contribution |
|---|---|
| Cycle Participation | Base +50, plus +10 per additional cycle (max +30 bonus) |
| Layered Shell Network | +40 |
| Fan-Out (Dispersal) | +35 |
| Fan-In (Aggregation) | +30 (only if funds move onward; otherwise -10 for merchants) |
| High Pass-through | +15 (if both In-Degree > 5 and Out-Degree > 5) |
| High Centrality | +15 (if Betweenness Centrality > 0.1) |
🛡 Temporal Heuristic Engine
> The key innovation for avoiding payroll/merchant account traps.
> 
The engine checks every account with out_degree > 50. If all outgoing transactions occur on the same day of the month (e.g., always the 1st or 15th), the account is classified as a payroll or subscription processor and is:
 * Removed from the suspicious_accounts array.
 * Given a suspicion score of 0.
 * Excluded from all detected fraud rings.
This heuristic is computationally cheap (a single groupby on day_of_month) and directly addresses the rubric requirement to not flag legitimate high-volume payroll accounts.
⚙️ Installation & Local Development
Backend
cd backend
python -m venv venv
venv\Scripts\activate     # Windows: use this (not 'source')
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

Frontend
cd frontend
npm install
cp .env.example .env          # Set VITE_API_URL=http://localhost:8000
npm run dev

☁️ Deployment
Deploy Backend → Render (Free)
 * Push the backend/ folder to GitHub.
 * Go to Render → New Web Service.
 * Connect your GitHub repo.
 * Set Build Command: pip install -r requirements.txt
 * Set Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
 * Set Environment: Python 3.11
 * Click Deploy. Copy the https://your-app.onrender.com URL.
Deploy Frontend → Vercel (Free)
 * Push the frontend/ folder to GitHub.
 * Go to Vercel → New Project → Import repo.
 * Set Framework Preset: Vite.
 * Add Environment Variable: VITE_API_URL = your Render URL.
 * Click Deploy.
⚠️ Limitations
 * nx.simple_cycles() has exponential worst-case complexity on dense graphs. Performance degrades on graphs with >5,000 nodes or extremely high edge density. For production, replace with Johnson's algorithm with depth cutoff.
 * Smurfing threshold (≥10) is hardcoded. Real fraud systems tune this per institution type.
 * No persistent storage: results are not saved between sessions.
 * The payroll heuristic uses day-of-month only; a more robust version would use time-series clustering.
👥 Team
| Name | Role | GitHub Profile |
|---|---|---|
| Mohammed Farhan Ahmed | Backend / Algorithm | (Add Links) |
| Muntaz Begum | Frontend / Visualization | @MuntazBegum |
| Sneha Bera | Data & Testing | (Add Links) |
| Mohammed Ammar Ahmed | Deployment & Docs | (Add Links) |

Would you like me to help you write a quick presentation script or pitch summarizing this README for the hackathon judges?
