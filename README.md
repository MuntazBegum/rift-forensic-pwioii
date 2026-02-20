

---

# 🔍 Forensics Engine — Money Muling Detection System

> **RIFT 2026 Hackathon** · Graph Theory / Financial Crime Detection Track

**Live Demo:** [rift-forensic-pwioii.vercel.app](https://rift-forensic-pwioii.vercel.app/)

**GitHub:** [MuntazBegum/rift-forensic-pwioii](https://github.com/MuntazBegum/rift-forensic-pwioii/)

---

## 📑 Table of Contents

* [📌 Overview](https://www.google.com/search?q=%23-overview)
* [🚀 Tech Stack](https://www.google.com/search?q=%23-tech-stack)
* [🏗 System Architecture](https://www.google.com/search?q=%23-system-architecture)
* [🧠 Algorithm Approach](https://www.google.com/search?q=%23-algorithm-approach)
* [🛡 Temporal Heuristic Engine](https://www.google.com/search?q=%23-temporal-heuristic-engine-false-positive-control)
* [⚙️ Installation & Local Development](https://www.google.com/search?q=%23%EF%B8%8F-installation--local-development)
* [☁️ Deployment](https://www.google.com/search?q=%23%EF%B8%8F-deployment)
* [⚠️ Limitations](https://www.google.com/search?q=%23%EF%B8%8F-limitations)
* [👥 Team](https://www.google.com/search?q=%23-team)

---

## 📌 Overview

A real-time, graph-based Financial Forensics Engine that detects money muling networks in transaction data. Upload a CSV, get an interactive force-directed graph highlighting fraud rings, and download a structured JSON report — all in under 30 seconds.

---

## 🚀 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18 + Vite + `react-force-graph-2d` |
| **Backend** | Python 3.11 + FastAPI + Pandas + NetworkX |
| **Frontend Hosting** | Vercel (free tier) |
| **Backend Hosting** | Render (free tier) |
| **Database** | None (in-memory CSV processing) |

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

```

---

## 🧠 Algorithm Approach

### 1. Graph Construction

Every unique `sender_id` and `receiver_id` becomes a node. Each transaction becomes a directed edge `sender → receiver` with `amount` and `timestamp` as edge attributes.

### 2. Cycle Detection (Money Muling Rings)

Uses `networkx.simple_cycles()` to enumerate all elementary cycles in the directed graph. We filter to lengths **3, 4, and 5**, which represent the typical layering depth of money muling operations. Each detected cycle is assigned a `RING_XXX` identifier.

### 3. Smurfing Detection (Fan-in / Fan-out)

* **Fan-in:** Any node with `in_degree ≥ 10` is flagged as a potential aggregation hub.
* **Fan-out:** Any node with `out_degree ≥ 10` is flagged as a potential distribution hub.
* All smurfing nodes are grouped into a single smurfing ring entry.

### 4. Suspicion Score Calculation

Each flagged account receives a score from 0–100:

| Signal | Score Contribution |
| --- | --- |
| **Cycle Participation** | Base +50, plus +10 per additional cycle (max +30 bonus) |
| **Layered Shell Network** | +40 |
| **Fan-Out** *(Smurfing Dispersal)* | +35 |
| **Fan-In** *(Smurfing Aggregation)* | +30 (only if funds move onward; otherwise -10 for merchants) |
| **High Velocity Pass-through** | +15 (if both In-Degree > 5 and Out-Degree > 5) |
| **High Centrality Bridge** | +15 (if Betweenness Centrality > 0.1) |

---

## 🛡 Temporal Heuristic Engine (False-Positive Control)

> **💡 The key innovation for avoiding payroll/merchant account traps.**

The engine checks every account with `out_degree > 50`. If **all outgoing transactions occur on the same day of the month** (e.g., always the 1st or 15th), the account is classified as a **payroll or subscription processor** and is:

1. Removed from the `suspicious_accounts` array.
2. Given a reset suspicion score of `0`.
3. Excluded from any fraud ring visualizations.

This heuristic is computationally cheap (a single `groupby` on `day_of_month`) and directly addresses the rubric requirement to avoid flagging legitimate high-volume payroll accounts.

---

## ⚙️ Installation & Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate     # Windows: use this (not 'source')
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # Set VITE_API_URL=http://localhost:8000
npm run dev

```

---

## ☁️ Deployment

### Deploy Backend → Render (Free)

1. Push the `backend/` folder to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your GitHub repo.
4. Set **Build Command:** `pip install -r requirements.txt`
5. Set **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Set **Environment:** `Python 3.11`
7. Click **Deploy**. Copy the `https://your-app.onrender.com` URL.

### Deploy Frontend → Vercel (Free)

1. Push the `frontend/` folder to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo.
3. Set **Framework Preset:** `Vite`.
4. Add **Environment Variable:** `VITE_API_URL` = *your Render URL*.
5. Click **Deploy**.

---

## ⚠️ Limitations

* **Algorithmic Complexity:** `nx.simple_cycles()` has an exponential worst-case complexity on dense graphs. Performance degrades on graphs with >5,000 nodes or extremely high edge density. *Future Fix: Replace with Johnson's algorithm with depth cutoff.*
* **Static Thresholds:** The smurfing threshold (≥10) is currently hardcoded. Real fraud systems tune this per institution type.
* **Statelessness:** No persistent storage; results are not saved between sessions.
* **Heuristic Simplicity:** The payroll heuristic uses day-of-month only; a more robust version would use time-series clustering.

---

## 👥 Team

| Name | Role |
| --- | --- |
| **Mohammed Farhan Ahmed** | Backend / Algorithm |
| **Muntaz Begum** | Frontend / Visualization |
| **Sneha Bera** | Data & Testing |
| **Mohammed Ammar Ahmed** | Deployment & Docs |

---

