import React, { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";

const API_URL = "/api";

// Lazy-load the isolated 3D Graph component
const Graph3D = lazy(() => import("./Graph3D"));

// Simple Error Boundary to catch render crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "#ef4444", background: "#0f172a", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <h3>Graph Failed to Load</h3>
          <pre style={{ maxWidth: 600, overflow: "auto", background: "#000", padding: 10 }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const DARK_THEME = {
  bg: "#050b14",
  panel: "#0a1628",
  border: "#1e293b",
  accent: "#00d4ff",
  danger: "#ff3d5a",
  warning: "#ffb020",
  success: "#00e5a0",
  text: "#e2e8f0",
  muted: "#64748b",
  node: "#3b82f6",
  suspicious: "#ef4444",
  edge: "#1e293b",
  ringEdge: "#ef4444",
  hub: "#8b5cf6",
  graphBg: "#030912",
  cardBg: "linear-gradient(145deg, #0f172a 0%, #050b14 100%)",
  cardBgHover: "linear-gradient(145deg, #111d33 0%, #070e1a 100%)",
  inputBg: "#060d17",
  headerBg: "rgba(10,22,40,0.9)",
  overlayBg: "rgba(0,0,0,0.8)",
  pillBg: "rgba(5,11,20,0.9)",
  labelColor: "#cbd5e1"
};

const LIGHT_THEME = {
  bg: "#f1f5f9",
  panel: "#ffffff",
  border: "#e2e8f0",
  accent: "#0284c7",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#059669",
  text: "#1e293b",
  muted: "#64748b",
  node: "#3b82f6",
  suspicious: "#ef4444",
  edge: "#cbd5e1",
  ringEdge: "#ef4444",
  hub: "#8b5cf6",
  graphBg: "#f8fafc",
  cardBg: "linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)",
  cardBgHover: "linear-gradient(145deg, #f8fafc 0%, #e8eef5 100%)",
  inputBg: "#f1f5f9",
  headerBg: "rgba(255,255,255,0.92)",
  overlayBg: "rgba(0,0,0,0.5)",
  pillBg: "rgba(255,255,255,0.9)",
  labelColor: "#334155"
};

let COLORS = DARK_THEME;
const updateGlobalColors = (c) => { COLORS = c; };

// --- Utils ---
const formatDate = (ts) => {
  if (!ts || ts === "NaN") return "N/A";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "Invalid Date";
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { return "Error"; }
};

const Icons = {
  Dashboard: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Graph: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Accounts: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Rings: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  Raw: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Upload: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Download: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Expand: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  Play: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>,
  Pause: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>,
  Trace: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Report: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Close: () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
};

function DonutChart({ data, size = 180 }) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let startAngle = 0;
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: '50%', border: `4px solid ${COLORS.border}` }} />;
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ transform: "rotate(-90deg)" }}>
      {data.map((item, i) => {
        const sliceAngle = (item.value / total) * 360;
        const largeArc = sliceAngle > 180 ? 1 : 0;
        const x1 = 100 * Math.cos((Math.PI * startAngle) / 180);
        const y1 = 100 * Math.sin((Math.PI * startAngle) / 180);
        const x2 = 100 * Math.cos((Math.PI * (startAngle + sliceAngle)) / 180);
        const y2 = 100 * Math.sin((Math.PI * (startAngle + sliceAngle)) / 180);
        const path = `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;
        startAngle += sliceAngle;
        return <path key={i} d={path} fill={item.color} stroke={COLORS.bg} strokeWidth="3" opacity="0.9" />;
      })}
      <circle cx="0" cy="0" r="60" fill={COLORS.panel} />
      <text x="0" y="5" textAnchor="middle" fill={COLORS.text} fontSize="24" transform="rotate(90)" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{total}</text>
    </svg>
  );
}

function BarChart({ data, height = 180 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", height, gap: 12, paddingBottom: 24 }}>
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ fontWeight: "bold", fontSize: 11, color: d.color }}>{d.value}</div>
            <div style={{ width: "100%", height: `${(d.value / max) * 100}%`, background: d.color, opacity: 0.8, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "all 0.4s ease-out", position: "relative" }}>
              <div style={{ position: "absolute", top: -15, width: "100%", textAlign: "center", fontSize: 9, color: COLORS.muted }}>{pct}%</div>
            </div>
            <div style={{ fontSize: 10, color: COLORS.muted, whiteSpace: "nowrap" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, subtext, color = COLORS.accent }) {
  return (
    <div style={{ background: `linear-gradient(145deg, ${COLORS.panel} 0%, ${COLORS.bg} 100%)`, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, flex: 1, minWidth: 200, position: "relative", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: color, filter: "blur(60px)", opacity: 0.15 }} />
      <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: color, fontFamily: "monospace", textShadow: `0 0 20px ${color}40` }}>{value}</div>
      {subtext && <div style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

function PatternBadge({ pattern }) {
  const getColor = (p) => {
    if (p.includes("cycle")) return COLORS.accent;
    if (p.includes("smurf")) return COLORS.warning;
    if (p.includes("shell")) return COLORS.danger;
    if (p.includes("centrality")) return COLORS.hub;
    return COLORS.text;
  };
  return (
    <span style={{ background: `${getColor(pattern)}15`, color: getColor(pattern), border: `1px solid ${getColor(pattern)}30`, padding: "4px 8px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.5 }}>
      {pattern.replace(/_/g, " ")}
    </span>
  );
}

// --- Modals & Advanced Views ---

// 1. SAR Report Modal
function SARReport({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const reportText = useMemo(() => {
    if (!result) return "";
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString();

    const riskBands = { critical: [], high: [], medium: [], low: [] };
    result.suspicious_accounts.forEach(a => {
      if (a.suspicion_score >= 80) riskBands.critical.push(a);
      else if (a.suspicion_score >= 60) riskBands.high.push(a);
      else if (a.suspicion_score >= 40) riskBands.medium.push(a);
      else riskBands.low.push(a);
    });

    const formatAcct = (a, idx) => [
      `  ${idx + 1}. Account ID:   ${a.account_id}`,
      `     Risk Score:   ${a.suspicion_score}/100`,
      `     Ring:         ${a.ring_id}`,
      `     Patterns:     ${a.detected_patterns.join(', ')}`,
      `     Centrality:   Degree=${a.centrality?.degree || 0}, Betweenness=${a.centrality?.betweenness || 0}`,
    ].join('\n');

    const formatRing = (r, idx) => [
      `  ${idx + 1}. ${r.ring_id}`,
      `     Pattern:    ${r.pattern_type.replace(/_/g, ' ').toUpperCase()}`,
      `     Risk Score: ${r.risk_score}/100`,
      `     Members (${r.member_accounts.length}): ${r.member_accounts.join(', ')}`,
    ].join('\n');

    return [
      `╔══════════════════════════════════════════════════════════════╗`,
      `║         SUSPICIOUS ACTIVITY REPORT (SAR) — DRAFT           ║`,
      `╚══════════════════════════════════════════════════════════════╝`,
      ``,
      `Report Date:     ${date} at ${time}`,
      `Generated By:    RIFT Forensics Engine v1.0`,
      `Classification:  CONFIDENTIAL — LAW ENFORCEMENT SENSITIVE`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  1. EXECUTIVE SUMMARY`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `  Total Accounts Analyzed:       ${result.summary.total_accounts_analyzed}`,
      `  Suspicious Accounts Flagged:   ${result.summary.suspicious_accounts_flagged}`,
      `  Fraud Rings Detected:          ${result.summary.fraud_rings_detected}`,
      `  Processing Time:               ${result.summary.processing_time_seconds}s`,
      ``,
      `  Automated graph-based analysis detected potential money`,
      `  laundering activity involving cyclic fund transfers,`,
      `  structuring (smurfing), and layered shell networks.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  2. RISK-RANKED SUSPICIOUS ENTITIES`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      ...(riskBands.critical.length ? [`  ▓▓ CRITICAL RISK (80-100) — ${riskBands.critical.length} Account(s)`, ``, ...riskBands.critical.map(formatAcct), ``] : []),
      ...(riskBands.high.length ? [`  ▒▒ HIGH RISK (60-79) — ${riskBands.high.length} Account(s)`, ``, ...riskBands.high.map(formatAcct), ``] : []),
      ...(riskBands.medium.length ? [`  ░░ MEDIUM RISK (40-59) — ${riskBands.medium.length} Account(s)`, ``, ...riskBands.medium.map(formatAcct), ``] : []),
      ...(riskBands.low.length ? [`  ·· LOW RISK (1-39) — ${riskBands.low.length} Account(s)`, ``, ...riskBands.low.map(formatAcct), ``] : []),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  3. FRAUD RINGS DETAIL`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      ...result.fraud_rings.map(formatRing),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  4. METHODOLOGY`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `  Detection Algorithms:`,
      `    • Cycle Detection (length 3-5) via NetworkX simple_cycles`,
      `    • Fan-In/Fan-Out Smurfing within 72h temporal window`,
      `    • Layered Shell Network identification (degree 2-3 chains)`,
      `    • Betweenness Centrality analysis for hidden organisers`,
      ``,
      `  Scoring Factors:`,
      `    • Cycle participation:      +50-80 pts`,
      `    • Smurfing (fan-out):       +35 pts`,
      `    • Smurfing (fan-in+out):    +30 pts`,
      `    • Shell layering:           +40 pts`,
      `    • High centrality bridge:   +15 pts`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  DISCLAIMER: This is an automated pre-screening report.`,
      `  All findings require human review before regulatory filing.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');
  }, [result]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: COLORS.overlayBg, zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 820, height: "85vh", background: COLORS.panel, borderRadius: 16, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `${COLORS.bg}80` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icons.Report />
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>SAR Report Generator</h2>
            <span style={{ fontSize: 10, background: `${COLORS.warning}20`, color: COLORS.warning, padding: "2px 8px", borderRadius: 4 }}>DRAFT</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, color: COLORS.muted, cursor: "pointer", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Close />
          </button>
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
          <pre style={{ width: "100%", margin: 0, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 24, fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{reportText}</pre>
        </div>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 12, background: `${COLORS.bg}80` }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, padding: "10px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 11 }}>CLOSE</button>
          <button onClick={handleCopy} style={{ background: copied ? COLORS.success : COLORS.accent, border: 0, padding: "10px 24px", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 11, color: "#000", transition: "all 0.2s" }}>{copied ? '✓ COPIED!' : 'COPY TO CLIPBOARD'}</button>
        </div>
      </div>
    </div>
  );
}

// 2. Timeline Control
function TimelineControl({ minTime, maxTime, currentTime, onChange, onPlayPause, isPlaying }) {
  if (!minTime || !maxTime) return null;
  const progress = (currentTime - minTime) / (maxTime - minTime);

  return (
    <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", width: "60%", background: "rgba(10,22,40,0.9)", padding: "12px 24px", borderRadius: 12, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16, zIndex: 50, backdropFilter: "blur(10px)" }}>
      <button onClick={onPlayPause} style={{ background: COLORS.accent, border: 0, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#000" }}>
        {isPlaying ? <Icons.Pause /> : <Icons.Play />}
      </button>
      <div style={{ flex: 1 }}>
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLORS.muted, marginTop: 4 }}>
          <span>{formatDate(new Date(minTime))}</span>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>{formatDate(new Date(currentTime))}</span>
          <span>{formatDate(new Date(maxTime))}</span>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, links, focusNode }) {
  const [expanded, setExpanded] = useState(false);
  const transactions = useMemo(() => {
    if (!expanded || !links) return [];
    return links.filter(l => l.source === account.account_id || l.target === account.account_id);
  }, [expanded, links, account.account_id]);

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${account.suspicion_score >= 80 ? COLORS.danger : COLORS.border}`, borderRadius: 12, overflow: "hidden", transition: "all 0.2s" }}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              onClick={() => focusNode(account.account_id)}
              style={{ cursor: "pointer", width: 40, height: 40, background: account.suspicion_score >= 80 ? `${COLORS.danger}20` : `${COLORS.warning}20`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "transform 0.2s" }}
            >
              {account.suspicion_score >= 80 ? '🚩' : '⚠️'}
            </div>
            <div>
              <div
                onClick={() => focusNode(account.account_id)}
                style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: COLORS.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: "transparent", transition: "all 0.2s" }}
                onMouseOver={e => e.target.style.textDecorationColor = COLORS.accent}
                onMouseOut={e => e.target.style.textDecorationColor = "transparent"}
              >
                {account.account_id}
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>Detected in: <span style={{ color: COLORS.text }}>{account.ring_id}</span></div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: account.suspicion_score >= 80 ? COLORS.danger : COLORS.warning }}>{account.suspicion_score}</div>
          </div>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ width: `${account.suspicion_score}%`, height: "100%", background: account.suspicion_score >= 80 ? COLORS.danger : COLORS.warning, borderRadius: 3 }} />
        </div>

        {/* Centrality Stats inside Card */}
        {account.centrality && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: COLORS.muted }}>BETWEENNESS</div>
              <div style={{ fontWeight: 700, color: COLORS.hub }}>{account.centrality.betweenness}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: COLORS.muted }}>DEGREE</div>
              <div style={{ fontWeight: 700, color: COLORS.node }}>{account.centrality.degree}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {account.detected_patterns.map(p => <PatternBadge key={p} pattern={p} />)}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", padding: 10, background: "rgba(255,255,255,0.03)", border: "none", color: COLORS.accent, fontSize: 11, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {expanded ? "HIDE TRANSACTIONS" : "VIEW TRANSACTIONS"} <Icons.Expand />
        </button>
      </div>
      {expanded && (
        <div style={{ background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${COLORS.border}`, padding: 0 }}>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead style={{ background: "rgba(255,255,255,0.02)", color: COLORS.muted, position: "sticky", top: 0 }}>
                <tr>
                  <th style={{ padding: 10, textAlign: "left" }}>Type</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Counterparty</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Amount</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => {
                  const isIncoming = t.target === account.account_id;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "8px 10px", color: isIncoming ? COLORS.success : COLORS.warning }}>{isIncoming ? "IN" : "OUT"}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", color: COLORS.text }}>{isIncoming ? t.source : t.target}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>{t.amount.toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: COLORS.muted }}>{formatDate(t.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RingCard({ ring, focusNode }) {
  const [hovered, setHovered] = useState(false);
  const riskColor = ring.risk_score >= 90 ? COLORS.danger : ring.risk_score >= 70 ? "#f97316" : COLORS.warning;
  const severityLabel = ring.risk_score >= 90 ? "CRITICAL" : ring.risk_score >= 70 ? "HIGH" : "MEDIUM";
  const patternLabel = ring.pattern_type.replace(/_/g, " ").toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? COLORS.cardBgHover : COLORS.cardBg,
        border: `1px solid ${hovered ? riskColor + '40' : COLORS.border}`,
        borderRadius: 16, padding: 0, marginBottom: 20, overflow: "hidden", position: "relative",
        boxShadow: hovered ? `0 0 30px -8px ${riskColor}30` : `0 0 20px -10px ${COLORS.danger}20`,
        transition: "all 0.25s ease-out",
        transform: hovered ? "translateY(-2px)" : "none"
      }}
    >
      <div style={{ width: 5, height: "100%", background: `linear-gradient(180deg, ${riskColor}, ${riskColor}60)`, position: "absolute", left: 0, top: 0 }} />
      <div style={{ padding: "20px 24px 16px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: 1 }}>{ring.ring_id}</span>
            <span style={{ background: `${riskColor}18`, color: riskColor, padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, border: `1px solid ${riskColor}30`, letterSpacing: 0.5 }}>{severityLabel}</span>
          </div>
          <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: 0.5 }}>{patternLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: riskColor, lineHeight: 1, fontFamily: "monospace" }}>{ring.risk_score}</div>
          <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 4, letterSpacing: 1 }}>RISK</div>
        </div>
      </div>
      {/* Risk bar */}
      <div style={{ height: 3, background: `${COLORS.border}40`, margin: "0 28px 0 28px" }}>
        <div style={{ width: `${ring.risk_score}%`, height: "100%", background: `linear-gradient(90deg, ${riskColor}60, ${riskColor})`, borderRadius: 2, transition: "width 0.6s ease-out" }} />
      </div>
      <div style={{ padding: "14px 24px 18px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>MEMBERS · {ring.member_accounts.length}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ring.member_accounts.map(m => (
            <span
              onClick={() => focusNode(m)}
              key={m}
              style={{
                background: `${COLORS.border}60`, color: COLORS.muted, padding: "5px 10px", borderRadius: 6,
                fontSize: 11, fontFamily: "monospace", border: `1px solid ${COLORS.border}80`,
                cursor: "pointer", transition: "all 0.15s",
                backdropFilter: "blur(4px)"
              }}
              onMouseOver={e => { e.target.style.color = COLORS.accent; e.target.style.borderColor = COLORS.accent; e.target.style.background = `${COLORS.accent}10`; }}
              onMouseOut={e => { e.target.style.color = COLORS.muted; e.target.style.borderColor = `${COLORS.border}80`; e.target.style.background = `${COLORS.border}60`; }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphDims, setGraphDims] = useState({ w: 800, h: 600 });
  const [pendingFocus, setPendingFocus] = useState(null);
  const [showSAR, setShowSAR] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('rift-theme') !== 'light'; }
    catch (e) { return true; }
  });

  const COLORS = useMemo(() => darkMode ? DARK_THEME : LIGHT_THEME, [darkMode]);

  // Sync global COLORS for util components
  useEffect(() => {
    updateGlobalColors(COLORS);
  }, [COLORS]);

  // Sync CSS custom properties for theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tooltip-bg', darkMode ? '#0f172a' : '#ffffff');
    root.style.setProperty('--tooltip-text', darkMode ? '#e2e8f0' : '#1e293b');
    root.style.setProperty('--tooltip-border', darkMode ? '#1e293b' : '#e2e8f0');
    root.style.setProperty('--scrollbar-track', darkMode ? '#050b14' : '#f1f5f9');
    root.style.setProperty('--scrollbar-thumb', darkMode ? '#1e293b' : '#cbd5e1');
    root.style.setProperty('--scrollbar-hover', darkMode ? '#334155' : '#94a3b8');
    root.style.setProperty('--popup-bg', darkMode ? '#0f172a' : '#ffffff');
    root.style.setProperty('--popup-text', darkMode ? '#94a3b8' : '#475569');
    root.style.setProperty('--popup-border', darkMode ? '#1e293b' : '#e2e8f0');
    root.style.setProperty('--accent', darkMode ? '#00d4ff' : '#0284c7');
    document.body.style.backgroundColor = COLORS.bg;
  }, [darkMode, COLORS]);

  // Path Tracer State
  const [traceSource, setTraceSource] = useState("");
  const [traceTarget, setTraceTarget] = useState("");
  const [tracePath, setTracePath] = useState(null);

  // Timeline State — use separate state for bounds vs playhead to avoid unnecessary re-renders
  const [timelineBounds, setTimelineBounds] = useState({ min: 0, max: 0 });
  const [timelineCurrent, setTimelineCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef();
  const graphRef = useRef();
  const fgRef = useRef(); // Keeping ref for camera controls if possible, though handling across boundary is tricky. 
  // We'll trust the internal camera logic or move controls to Graph3D later. For now, let's just render.

  useEffect(() => {
    if (activeTab !== "graph" || !graphRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        const h = Math.round(e.contentRect.height);
        if (w > 0 && h > 0) setGraphDims({ w, h });
      }
    });
    obs.observe(graphRef.current);
    return () => obs.disconnect();
  }, [activeTab]);


  // Timeline Animation Loop — uses requestAnimationFrame for smooth playback
  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    let lastTime = performance.now();
    const step = (timelineBounds.max - timelineBounds.min) / 200; // 200 steps total

    const tick = (now) => {
      const dt = now - lastTime;
      if (dt >= 30) { // ~33fps, smooth enough
        lastTime = now;
        setTimelineCurrent(prev => {
          const next = prev + step;
          if (next >= timelineBounds.max) {
            setIsPlaying(false);
            return timelineBounds.max;
          }
          return next;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, timelineBounds.max, timelineBounds.min]);

  const requestFocus = useCallback((nodeId) => {
    setPendingFocus(nodeId);
    setActiveTab("graph");
  }, []);

  // Cross-tab focus: when pendingFocus is set and graph tab is active, navigate to node
  useEffect(() => {
    if (activeTab === "graph" && pendingFocus && result) {
      const tryFocus = () => {
        const fg = fgRef.current;
        if (!fg) return;
        const node = result._graph.nodes.find(n => n.id === pendingFocus);
        if (node) {
          // Force graph internal nodes have x,y after simulation
          const gNode = fg.graphData().nodes.find(n => n.id === pendingFocus);
          if (gNode && gNode.x !== undefined) {
            const distance = 120;
            const distRatio = 1 + distance / Math.hypot(gNode.x || 0, gNode.y || 0, gNode.z || 0);
            fg.cameraPosition(
              { x: (gNode.x || 0) * distRatio, y: (gNode.y || 0) * distRatio, z: (gNode.z || 0) * distRatio },
              { x: gNode.x || 0, y: gNode.y || 0, z: gNode.z || 0 },
              1200
            );
            setSelectedNode(gNode);
          }
        }
      };
      // Small delay to let graph tab mount and simulation settle
      const t = setTimeout(tryFocus, 300);
      setPendingFocus(null);
      return () => clearTimeout(t);
    }
  }, [activeTab, pendingFocus, result]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError("Invalid file format."); return; }
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      let res;
      try {
        res = await fetch(`${API_URL}/analyze`, { method: "POST", body: formData });
      } catch (networkErr) {
        throw new Error(`Cannot connect to backend at ${API_URL}. Make sure the backend server is running (cd backend && uvicorn main:app --reload --port 8000).`);
      }
      if (!res.ok) {
        let detail = "Analysis failed";
        try {
          const errBody = await res.json();
          detail = errBody.detail || detail;
        } catch (_) { /* ignore parse error */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setResult(data);

      // Init Timeline Stats
      const timestamps = data._graph.links.map(l => new Date(l.timestamp).getTime()).filter(t => !isNaN(t));
      if (timestamps.length > 0) {
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);
        setTimelineBounds({ min, max });
        setTimelineCurrent(max); // Default: show all edges
        setIsPlaying(false);
      }

      setActiveTab("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleTrace = useCallback(() => {
    if (!traceSource || !traceTarget || !result) return;
    // Build Adjacency List
    const adj = {};
    result._graph.links.forEach(l => {
      if (!adj[l.source]) adj[l.source] = [];
      adj[l.source].push(l.target);
    });
    // BFS
    const queue = [[traceSource]];
    const visited = new Set();
    let foundPath = null;
    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];
      if (node === traceTarget) { foundPath = path; break; }
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = adj[node] || [];
      for (const n of neighbors) {
        queue.push([...path, n]);
      }
    }
    setTracePath(foundPath);
    if (!foundPath) alert("No path found (directed).");
  }, [traceSource, traceTarget, result]);

  // Build graph data only once per result/tracePath — NOT per timeline tick
  const graphData = useMemo(() => {
    if (!result?._graph) return { nodes: [], links: [] };

    // Pre-parse timestamps for links
    const parsedLinks = result._graph.links.map(l => ({
      ...l,
      _ts: new Date(l.timestamp).getTime()
    }));

    // Mark Path Links
    const pathEdges = new Set();
    if (tracePath) {
      for (let i = 0; i < tracePath.length - 1; i++) {
        pathEdges.add(`${tracePath[i]}|${tracePath[i + 1]}`);
      }
    }

    return {
      nodes: result._graph.nodes.map(n => ({ ...n, id: n.id })),
      links: parsedLinks.map(l => ({
        ...l,
        is_path: pathEdges.has(`${l.source}|${l.target}`)
      }))
    };
  }, [result, tracePath]);

  // Timeline visibility — uses a callback so graph structure never changes
  const linkVisibility = useCallback((link) => {
    if (!link._ts || isNaN(link._ts)) return true;
    return link._ts <= timelineCurrent;
  }, [timelineCurrent]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    if (fgRef.current) {
      const distance = 120;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
        1200
      );
    }
  }, []);

  // Removed local nodeThreeObject definition since it relies on THREE. 
  // It will be handled inside Graph3D.jsx. 
  // We passed necessary props (selectedNode, tracePath, darkMode) to Graph3D instead.

  // Dashboard Stats logic (omitted repetition, same as before) ...
  const dashboardStats = useMemo(() => {
    if (!result) return null;
    const patterns = result.suspicious_accounts.flatMap(a => a.detected_patterns);
    const patternCounts = patterns.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {});
    const donutData = Object.entries(patternCounts).map(([k, v], i) => ({ label: k, value: v, color: [COLORS.accent, COLORS.danger, COLORS.warning, COLORS.success][i % 4] })).filter(d => d.value > 0);
    const scores = result.suspicious_accounts.map(a => a.suspicion_score);
    const bins = [0, 0, 0, 0, 0];
    scores.forEach(s => { if (s < 20) bins[0]++; else if (s < 40) bins[1]++; else if (s < 60) bins[2]++; else if (s < 80) bins[3]++; else bins[4]++; });
    const histData = [{ label: "0-20", value: bins[0], color: COLORS.success }, { label: "20-40", value: bins[1], color: COLORS.success }, { label: "40-60", value: bins[2], color: COLORS.warning }, { label: "60-80", value: bins[3], color: COLORS.warning }, { label: "80+", value: bins[4], color: COLORS.danger }];
    return { donutData, histData };
  }, [result, darkMode]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      {showSAR && <SARReport result={result} onClose={() => setShowSAR(false)} />}

      {/* Header */}
      <div style={{ height: 60, borderBottom: `1px solid ${COLORS.border}`, background: COLORS.headerBg, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="RIFT Forensics" style={{ height: 40, objectFit: "contain" }} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: COLORS.text }}>RIFT<span style={{ fontWeight: 400, color: COLORS.muted }}>FORENSICS</span></span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Theme Toggle */}
          <button onClick={() => { setDarkMode(p => { const next = !p; try { localStorage.setItem('rift-theme', next ? 'dark' : 'light'); } catch { } return next; }); }} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, width: 36, height: 36, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="5" strokeWidth="2" /><path strokeLinecap="round" strokeWidth="2" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {result && (
            <>
              <button onClick={() => {
                const { _graph, ...jsonResult } = result;
                const blob = new Blob([JSON.stringify(jsonResult, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "results.json";
                a.click();
                URL.revokeObjectURL(url);
              }} style={{ background: COLORS.success, color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Download /> DOWNLOAD JSON
              </button>
              <button onClick={() => setShowSAR(true)} style={{ background: COLORS.warning, color: "#000", border: 0, padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Report /> GENERATE SAR
              </button>
            </>
          )}

          <button onClick={() => fileInputRef.current?.click()} style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}`, color: COLORS.accent, padding: "8px 20px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Upload /> UPLOAD CSV
          </button>
          <input ref={fileInputRef} type="file" hidden onChange={handleUpload} accept=".csv" />
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
        {/* Sidebar Nav */}
        <div style={{ width: 80, borderRight: `1px solid ${COLORS.border}`, background: COLORS.panel, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, gap: 8 }}>
          {["dashboard", "graph", "accounts", "rings", "raw"].map(tab => {
            const labels = { dashboard: "Dashboard", graph: "Network Graph", accounts: "Flagged Accounts", rings: "Fraud Rings", raw: "Raw JSON" };
            return (
              <div key={tab} onClick={() => setActiveTab(tab)} title={labels[tab]} style={{ width: 50, height: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", borderRadius: 8, background: activeTab === tab ? `${COLORS.accent}15` : "transparent", color: activeTab === tab ? COLORS.accent : COLORS.muted, transition: "all 0.2s", position: "relative" }}>
                {Icons[tab.charAt(0).toUpperCase() + tab.slice(1)] ? Icons[tab.charAt(0).toUpperCase() + tab.slice(1)]() : null}
                <span className="nav-tooltip">{labels[tab]}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: "auto", position: "relative", background: COLORS.bg }}>
          <div style={{ padding: 40, maxWidth: 1600, margin: "0 auto" }}>

            {/* Landing & Loading (Same as before) ... */}
            {!result && !loading && (
              <div style={{ height: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `2px dashed ${COLORS.border}`, borderRadius: 24, background: "rgba(255,255,255,0.01)" }}>
                <div style={{ fontSize: 60, marginBottom: 24, opacity: 0.5 }}>📂</div>
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>Perform Financial Analysis</h2>
                <p style={{ color: COLORS.muted, marginBottom: 32 }}>Upload a transaction CSV to detect money muling rings.</p>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: COLORS.accent, color: "#000", border: 0, padding: "14px 40px", fontSize: 14, fontWeight: 700, cursor: "pointer", borderRadius: 8 }}>SELECT CSV FILE</button>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: 120 }}>
                <div style={{ width: 60, height: 60, border: `4px solid ${COLORS.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s infinite linear", margin: "0 auto 32px" }} />
                <div style={{ letterSpacing: 6, fontSize: 16, color: COLORS.accent, fontWeight: 700 }}>ANALYZING GRAPH</div>
                <div style={{ marginTop: 12, color: COLORS.muted }}>Detecting cycles, smurfing patterns, and shell networks...</div>
                <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
              </div>
            )}

            {error && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: COLORS.overlayBg, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.danger}`, padding: 30, borderRadius: 12, maxWidth: 400, textAlign: "center", boxShadow: "0 0 40px rgba(255,61,90,0.2)" }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                  <h3 style={{ color: COLORS.danger, fontSize: 18, marginBottom: 8 }}>Analysis Error</h3>
                  <p style={{ color: COLORS.text, marginBottom: 24, lineHeight: 1.5 }}>{error}</p>
                  <button onClick={() => setError(null)} style={{ background: COLORS.danger, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>DISMISS</button>
                </div>
              </div>
            )}

            {result && activeTab === "dashboard" && (
              // Same Dashboard Logic
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <StatCard label="Total Analyzed" value={result.summary.total_accounts_analyzed} subtext="Source Accounts & Entities" color={COLORS.node} />
                  <StatCard label="Suspicious" value={result.summary.suspicious_accounts_flagged} subtext="High Risk Detected" color={COLORS.danger} />
                  <StatCard label="Fraud Rings" value={result.summary.fraud_rings_detected} subtext="Circular Networks" color={COLORS.warning} />
                  <StatCard label="Processing Time" value={`${result.summary.processing_time_seconds}s`} subtext="Analysis Duration" color={COLORS.success} />
                </div>
                <div style={{ display: "flex", gap: 24, height: 350 }}>
                  <div style={{ flex: 1, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <h3 style={{ fontSize: 16, margin: 0 }}>Pattern Distribution</h3>
                        <span className="chart-info-trigger" style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${COLORS.muted}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.muted }}>i</span>
                          <span className="chart-info-popup">Shows the breakdown of detected crime typologies (e.g. cycle laundering, smurfing, shell layering) across all flagged accounts. Each slice represents the proportion of accounts exhibiting that pattern.</span>
                        </span>
                      </div>
                      <div style={{ color: COLORS.muted, fontSize: 12, maxWidth: 200, marginBottom: 16 }}>Breakdown of detected financial crime typologies in this dataset.</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{dashboardStats.donutData.map((d, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} /><span style={{ color: COLORS.text, fontWeight: 500 }}>{d.label}</span><span style={{ color: COLORS.muted }}>({Math.round((d.value / dashboardStats.donutData.reduce((a, b) => a + b.value, 0)) * 100)}%)</span></div>))}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 250 }}><DonutChart data={dashboardStats.donutData} /></div>
                  </div>
                  <div style={{ flex: 1, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, margin: 0 }}>Risk Score Distribution</h3>
                      <span className="chart-info-trigger" style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${COLORS.muted}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.muted }}>i</span>
                        <span className="chart-info-popup">Histogram grouping all flagged accounts by their computed suspicion score. Scores combine cycle membership (+50–80), smurfing (+30–35), shell layering (+40), and centrality bonuses (+15). Higher concentrations on the right indicate a dangerous network.</span>
                      </span>
                    </div>
                    <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 20 }}>Histogram of suspicion scores for flagged accounts.</div>
                    <BarChart data={dashboardStats.histData} height={200} />
                  </div>
                </div>
              </div>
            )}

            {result && activeTab === "graph" && (
              <div style={{ height: "calc(100vh - 140px)", display: "flex", borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                <div ref={graphRef} style={{ flex: 1, background: COLORS.graphBg, position: "relative" }}>

                  {/* Color Legend */}
                  <div style={{ position: "absolute", top: 16, left: 16, zIndex: 20, background: COLORS.pillBg, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 10, display: "flex", flexDirection: "column", gap: 5, backdropFilter: "blur(8px)" }}>
                    {[
                      { color: "#ef4444", label: "Critical (80+)" },
                      { color: "#f97316", label: "High (50-79)" },
                      { color: "#eab308", label: "Medium (<50)" },
                      { color: "#a855f7", label: "Bridge Node" },
                      { color: "#06b6d4", label: "Hub" },
                      { color: "#4a6fa5", label: "Normal" },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, boxShadow: `0 0 4px ${item.color}40` }} />
                        <span style={{ color: COLORS.muted }}>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Timeline Control */}
                  <TimelineControl
                    minTime={timelineBounds.min} maxTime={timelineBounds.max} currentTime={timelineCurrent}
                    onChange={val => setTimelineCurrent(val)}
                    onPlayPause={() => setIsPlaying(p => !p)}
                    isPlaying={isPlaying}
                  />

                  <ErrorBoundary>
                    <Suspense fallback={<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent }}>Loading 3D Engine...</div>}>
                      <Graph3D
                        ref={fgRef}
                        graphData={graphData}
                        width={graphDims.w}
                        height={graphDims.h}
                        backgroundColor={COLORS.graphBg}
                        selectedNode={selectedNode}
                        tracePath={tracePath}
                        darkMode={darkMode}
                        COLORS={COLORS}
                        linkColor={l => l.is_path ? '#ffb020' : (l.is_ring ? '#ef4444' : COLORS.edge)}
                        linkWidth={l => l.is_path ? 1.5 : (l.is_ring ? 0.8 : 0.2)}
                        linkOpacity={0.6}
                        linkDirectionalArrowLength={3}
                        linkDirectionalArrowRelPos={0.9}
                        linkDirectionalParticles={l => l.is_path ? 4 : (l.is_ring ? 2 : 0)}
                        linkDirectionalParticleWidth={1.5}
                        linkDirectionalParticleSpeed={l => l.is_path ? 0.012 : 0.006}
                        linkVisibility={linkVisibility}
                        d3VelocityDecay={0.3}
                        onNodeClick={handleNodeClick}
                        enableNodeDrag={true}
                        enableNavigationControls={true}
                        showNavInfo={false}
                        warmupTicks={80}
                        cooldownTicks={150}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </div>

                {/* Graph Sidebar */}
                <div style={{ width: 300, background: COLORS.panel, borderLeft: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>

                  {/* Path Tracer */}
                  <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                    <h3 style={{ fontSize: 9, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px 0" }}>
                      <Icons.Trace /> PATH TRACER
                    </h3>
                    <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                      <input placeholder="Source Account" value={traceSource} onChange={e => setTraceSource(e.target.value)} style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, padding: "7px 10px", color: COLORS.text, borderRadius: 6, fontSize: 11, fontFamily: "monospace", outline: "none" }} />
                      <input placeholder="Target Account" value={traceTarget} onChange={e => setTraceTarget(e.target.value)} style={{ background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, padding: "7px 10px", color: COLORS.text, borderRadius: 6, fontSize: 11, fontFamily: "monospace", outline: "none" }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handleTrace} style={{ flex: 1, background: COLORS.accent, color: "#000", border: 0, padding: 7, borderRadius: 6, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>TRACE</button>
                        {tracePath && <button onClick={() => setTracePath(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, padding: "7px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>CLEAR</button>}
                      </div>
                    </div>
                    {tracePath && (
                      <div style={{ marginTop: 10, padding: 8, background: `${COLORS.warning}10`, borderRadius: 6, border: `1px solid ${COLORS.warning}30` }}>
                        <div style={{ fontSize: 10, color: COLORS.warning, fontWeight: 700 }}>✓ Path: {tracePath.length - 1} hop{tracePath.length > 2 ? 's' : ''}</div>
                        <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 4, fontFamily: "monospace", lineHeight: 1.4 }}>{tracePath.join(' → ')}</div>
                      </div>
                    )}
                  </div>

                  {/* Selected Node Detail */}
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, background: "rgba(0,0,0,0.15)" }}>
                    <h3 style={{ fontSize: 9, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: 0 }}>SELECTED ENTITY</h3>
                  </div>
                  {selectedNode ? (() => {
                    const acct = result.suspicious_accounts.find(a => a.account_id === selectedNode.id);
                    const nodeColor = selectedNode.suspicious && selectedNode.score >= 80 ? COLORS.danger : selectedNode.suspicious && selectedNode.score >= 50 ? "#f97316" : selectedNode.suspicious ? COLORS.warning : COLORS.node;
                    return (
                      <div style={{ padding: 16, flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, wordBreak: "break-all", marginBottom: 14, fontFamily: "monospace" }}>{selectedNode.id}</div>

                        {/* Risk Score */}
                        {acct && (
                          <div style={{ background: `${nodeColor}10`, padding: 14, borderRadius: 8, border: `1px solid ${nodeColor}30`, marginBottom: 14, textAlign: "center" }}>
                            <div style={{ fontSize: 32, fontWeight: 700, color: nodeColor, fontFamily: "monospace" }}>{selectedNode.score}</div>
                            <div style={{ fontSize: 9, color: COLORS.muted, letterSpacing: 1, marginTop: 2 }}>SUSPICION SCORE</div>
                            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 8 }}>
                              <div style={{ width: `${selectedNode.score}%`, height: "100%", background: `linear-gradient(90deg, ${nodeColor}80, ${nodeColor})`, borderRadius: 2 }} />
                            </div>
                          </div>
                        )}

                        {/* Stats Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#06b6d4" }}>{selectedNode.in_degree}</div>
                            <div style={{ fontSize: 8, color: COLORS.muted, letterSpacing: 0.5 }}>IN-DEGREE</div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#f97316" }}>{selectedNode.out_degree}</div>
                            <div style={{ fontSize: 8, color: COLORS.muted, letterSpacing: 0.5 }}>OUT-DEGREE</div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#a855f7" }}>{selectedNode.centrality_score ? selectedNode.centrality_score.toFixed(3) : '0'}</div>
                            <div style={{ fontSize: 8, color: COLORS.muted, letterSpacing: 0.5 }}>BETWEENNESS</div>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 6, textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{selectedNode.in_degree + selectedNode.out_degree}</div>
                            <div style={{ fontSize: 8, color: COLORS.muted, letterSpacing: 0.5 }}>TOTAL DEG</div>
                          </div>
                        </div>

                        {/* Patterns */}
                        {acct && acct.detected_patterns.length > 0 && (
                          <div>
                            <div style={{ fontSize: 9, color: COLORS.muted, letterSpacing: 1, marginBottom: 6 }}>DETECTED PATTERNS</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {acct.detected_patterns.map(p => <PatternBadge key={p} pattern={p} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontSize: 11, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 28, opacity: 0.3 }}>🔍</div>
                      Click a node to inspect
                    </div>
                  )}
                </div>
              </div>
            )}

            {result && activeTab === "accounts" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 20 }}>
                {result.suspicious_accounts.map(acc => <AccountCard key={acc.account_id} account={acc} links={result._graph.links} focusNode={requestFocus} />)}
              </div>
            )}
            {result && activeTab === "rings" && (
              <div style={{ maxWidth: 1000, margin: "0 auto" }}>{result.fraud_rings.map(ring => <RingCard key={ring.ring_id} ring={ring} focusNode={requestFocus} />)}</div>
            )}
            {result && activeTab === "raw" && (
              <div style={{ background: COLORS.panel, padding: 24, borderRadius: 12, border: `1px solid ${COLORS.border}`, maxHeight: "80vh", overflow: "auto" }}><pre style={{ margin: 0, fontSize: 11, color: COLORS.muted, fontFamily: "monospace" }}>{JSON.stringify(result, null, 2)}</pre></div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
