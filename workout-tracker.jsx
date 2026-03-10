import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dee-workout-log";

async function loadLog() {
  try { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : {}; }
  catch { return {}; }
}
async function saveLog(log) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(log)); } catch {}
}

// ── Daily ab finisher — rotates by day of week ────────────────────────────────
// Each day gets a different combo so it never feels repetitive
const AB_FINISHERS = {
  "Monday — Lower Body A": [
    { name: "Cable Crunch",           sets: 3, reps: "15–20", equipment: "Cable (rope)" },
    { name: "Pallof Press",           sets: 3, reps: "12 ea.", equipment: "Cable" },
    { name: "Total Gym Pike",         sets: 3, reps: "12",    equipment: "Total Gym" },
  ],
  "Tuesday — Upper Body A: Push": [
    { name: "Cable Woodchop",         sets: 3, reps: "12 ea.", equipment: "Cable" },
    { name: "Total Gym Ab Crunch",    sets: 3, reps: "20",    equipment: "Total Gym" },
    { name: "Dead Bug",               sets: 3, reps: "10 ea.", equipment: "Floor" },
  ],
  "Thursday — Lower Body B": [
    { name: "Dynamic Plank Hold",     sets: 3, reps: "45 sec", equipment: "Ab Trainer" },
    { name: "Cable Woodchop",         sets: 3, reps: "12 ea.", equipment: "Cable" },
    { name: "Pallof Press",           sets: 3, reps: "12 ea.", equipment: "Cable" },
  ],
  "Friday — Upper Body B: Pull": [
    { name: "Cable Crunch",           sets: 3, reps: "15–20", equipment: "Cable (rope)" },
    { name: "Total Gym Ab Crunch",    sets: 3, reps: "20",    equipment: "Total Gym" },
    { name: "Dead Bug",               sets: 3, reps: "10 ea.", equipment: "Floor" },
  ],
  "Saturday — Core + Cardio": [
    { name: "Cable Crunch",           sets: 3, reps: "15–20", equipment: "Cable (rope)" },
    { name: "Cable Woodchop",         sets: 3, reps: "12 ea.", equipment: "Cable" },
    { name: "Total Gym Pike",         sets: 3, reps: "12",    equipment: "Total Gym" },
    { name: "Pallof Press",           sets: 3, reps: "12 ea.", equipment: "Cable" },
    { name: "Dead Bug",               sets: 3, reps: "10 ea.", equipment: "Floor" },
  ],
};

const PLAN = {
  "Monday — Lower Body A": [
    { name: "Barbell Back Squat",    sets: 4, reps: "6–8",    equipment: "Squat Rack" },
    { name: "Romanian Deadlift",     sets: 3, reps: "10–12",  equipment: "Barbell" },
    { name: "Bulgarian Split Squat", sets: 3, reps: "10 ea.", equipment: "Bench + DBs" },
    { name: "Cable Pull-Through",    sets: 3, reps: "12–15",  equipment: "Cable Low" },
    { name: "Leg Press (Total Gym)", sets: 3, reps: "15",     equipment: "Total Gym" },
    { name: "Calf Raises",           sets: 3, reps: "20",     equipment: "Barbell" },
  ],
  "Tuesday — Upper Body A: Push": [
    { name: "Incline Dumbbell Press",  sets: 4, reps: "8–10",   equipment: "Bench + DBs" },
    { name: "Flat Bench Press",        sets: 3, reps: "8–10",   equipment: "Bench + Bar" },
    { name: "Cable Chest Fly",         sets: 3, reps: "12–15",  equipment: "Cable High" },
    { name: "Seated Shoulder Press",   sets: 3, reps: "10–12",  equipment: "Bench + DBs" },
    { name: "Lateral Raises",          sets: 3, reps: "12–15",  equipment: "DBs/Cable" },
    { name: "Tricep Pushdown",         sets: 3, reps: "12–15",  equipment: "Cable Rope" },
    { name: "Push-Up Variations",      sets: 2, reps: "AMRAP",  equipment: "Total Gym" },
  ],
  "Thursday — Lower Body B": [
    { name: "Hip Thrusts",               sets: 4, reps: "10–12",  equipment: "Bench + Bar" },
    { name: "Good Mornings",             sets: 3, reps: "10–12",  equipment: "Barbell" },
    { name: "Single-Leg RDL",            sets: 3, reps: "10 ea.", equipment: "DBs/Bar" },
    { name: "Cable Standing Leg Raise",  sets: 3, reps: "12 ea.", equipment: "Cable Ankle" },
    { name: "Cable Pull-Through",        sets: 3, reps: "15",     equipment: "Cable Low" },
    { name: "Step-Ups",                  sets: 3, reps: "12 ea.", equipment: "Bench + DBs" },
  ],
  "Friday — Upper Body B: Pull": [
    { name: "LAT Pulldown",          sets: 4, reps: "8–10",   equipment: "LAT Bar" },
    { name: "Seated Cable Row",      sets: 3, reps: "10–12",  equipment: "Cable Low" },
    { name: "Total Gym Rows",        sets: 3, reps: "12–15",  equipment: "Total Gym" },
    { name: "Single-Arm Cable Row",  sets: 3, reps: "12 ea.", equipment: "Cable Low" },
    { name: "Face Pulls",            sets: 3, reps: "15–20",  equipment: "Cable Rope" },
    { name: "Bicep Curl",            sets: 3, reps: "12–15",  equipment: "DBs/Cable" },
    { name: "Hammer Curl",           sets: 2, reps: "12–15",  equipment: "DBs" },
  ],
  "Saturday — Core + Cardio": [
    { name: "MaxiClimber Sprint",    sets: 4, reps: "3 min",  equipment: "MaxiClimber" },
    { name: "Ab Trainer Crunches",   sets: 3, reps: "20",     equipment: "Ab Trainer" },
    { name: "Dynamic Plank Hold",    sets: 3, reps: "45 sec", equipment: "Ab Trainer" },
  ],
};

function getRecommendation(history) {
  const recent = [...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2);
  if (recent.length < 2) return null;
  const allStrong = recent.every(s => s.sets?.length > 0 && s.sets.every(x => x.completed && parseFloat(x.weight) > 0));
  if (!allStrong) return null;
  const ws = recent[0].sets.map(s=>parseFloat(s.weight)||0).filter(w=>w>0);
  if (!ws.length) return null;
  const avg = ws.reduce((a,b)=>a+b,0)/ws.length;
  const inc = avg < 30 ? 2.5 : 5;
  return { message: `💪 Ready to level up! Add ${inc} lbs this session.`, suggestedWeight: Math.round((avg+inc)*2)/2 };
}

function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d) { return new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); }
function maxW(sets) { const ws=(sets||[]).map(s=>parseFloat(s.weight)||0).filter(w=>w>0); return ws.length?Math.max(...ws):0; }

// ── ExerciseCard — owns its own open/closed state so typing never collapses it ─
function ExerciseCard({ ex, sessionSets, onUpdateSet, onToggleComplete, exHistory, accent=false }) {
  const [open, setOpen] = useState(false);
  const reco = getRecommendation(exHistory);
  const allDone = sessionSets.length > 0 && sessionSets.every(s => s.completed);
  const borderColor = reco ? "var(--accent)" : accent ? "rgba(76,175,125,0.5)" : "var(--border)";

  return (
    <div style={{
      background:"var(--card)", border:`1px solid ${borderColor}`,
      borderRadius:"var(--r-lg)", marginBottom:10, overflow:"hidden"
    }}>
      <div onClick={() => setOpen(o=>!o)} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"13px 16px", cursor:"pointer", gap:12
      }}>
        <div style={{flex:1}}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            {accent && <span style={{fontSize:"0.65rem", color:"var(--green)", fontFamily:"var(--font-mono)", background:"rgba(76,175,125,0.12)", border:"1px solid rgba(76,175,125,0.3)", borderRadius:4, padding:"1px 6px"}}>ABS</span>}
            <div style={{fontSize:"0.95rem", fontWeight:600, color:"var(--text)"}}>{ex.name}</div>
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginTop:4}}>
            <span className="tag">{ex.sets}×{ex.reps}</span>
            <span className="tag">{ex.equipment}</span>
            {allDone && <span className="tag green">✓ Done</span>}
            {reco && <span className="tag gold">↑ Overload</span>}
          </div>
        </div>
        <span style={{
          color:"var(--muted)", fontSize:"0.75rem", minWidth:16, textAlign:"center",
          display:"inline-block", transition:"transform 0.2s",
          transform: open ? "rotate(180deg)" : "none"
        }}>▼</span>
      </div>

      {open && (
        <div>
          {reco && (
            <div style={{
              margin:"0 14px 12px", padding:"10px 14px", borderRadius:"var(--r)",
              background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.3)",
              fontSize:"0.8rem", color:"var(--accent)", lineHeight:1.4
            }}>
              {reco.message} Suggested: <strong>{reco.suggestedWeight} lbs</strong>
            </div>
          )}
          {exHistory.length > 0 && (
            <div style={{padding:"0 14px 8px", fontSize:"0.72rem", color:"var(--muted)"}}>
              Last: <span style={{color:"var(--accent2)", fontFamily:"var(--font-mono)"}}>
                {maxW(exHistory[exHistory.length-1].sets)} lbs
              </span> · {fmt(exHistory[exHistory.length-1].date)}
            </div>
          )}
          <div style={{padding:"0 14px 14px"}}>
            <div style={{display:"grid", gridTemplateColumns:"32px 1fr 1fr 76px", gap:8, paddingBottom:6}}>
              {["#","Weight","Reps","Done"].map(h=>(
                <span key={h} style={{fontSize:"0.65rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:"var(--font-mono)"}}>{h}</span>
              ))}
            </div>
            {sessionSets.map((s, i) => (
              <div key={i} style={{display:"grid", gridTemplateColumns:"32px 1fr 1fr 76px", gap:8, marginBottom:8, alignItems:"center"}}>
                <div style={{
                  width:26, height:26, borderRadius:6, background:"var(--surface)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"0.72rem", fontFamily:"var(--font-mono)", color:"var(--muted)",
                  border:"1px solid var(--border)"
                }}>{i+1}</div>
                <input
                  type="number" inputMode="decimal"
                  placeholder={reco ? String(reco.suggestedWeight) : "lbs"}
                  value={s.weight || ""}
                  onChange={e => onUpdateSet(i, "weight", e.target.value)}
                  style={{
                    background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:7, padding:"7px 8px", fontSize:"0.82rem",
                    color:"var(--text)", fontFamily:"var(--font-mono)", width:"100%", outline:"none"
                  }}
                />
                <input
                  type="number" inputMode="numeric"
                  placeholder={ex.reps}
                  value={s.reps || ""}
                  onChange={e => onUpdateSet(i, "reps", e.target.value)}
                  style={{
                    background:"var(--surface)", border:"1px solid var(--border)",
                    borderRadius:7, padding:"7px 8px", fontSize:"0.82rem",
                    color:"var(--text)", fontFamily:"var(--font-mono)", width:"100%", outline:"none"
                  }}
                />
                <button
                  onClick={() => onToggleComplete(i)}
                  style={{
                    padding:"7px 0", borderRadius:7, width:"100%",
                    border: s.completed ? "1px solid var(--green)" : "1px solid var(--border)",
                    background: s.completed ? "rgba(76,175,125,0.15)" : "var(--surface)",
                    color: s.completed ? "var(--green)" : "var(--muted)",
                    cursor:"pointer", fontSize:"0.75rem", fontFamily:"var(--font-body)"
                  }}
                >
                  {s.completed ? "✓" : "Mark"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0d0f14; --surface:#161920; --card:#1e2230; --border:#2a2f3d;
    --accent:#e8b84b; --accent2:#5b9cf6; --green:#4caf7d;
    --text:#e8eaf0; --muted:#6b7280;
    --font-display:'Bebas Neue',sans-serif;
    --font-body:'DM Sans',sans-serif;
    --font-mono:'DM Mono',monospace;
    --r:10px; --r-lg:16px;
  }
  body { background:var(--bg); color:var(--text); font-family:var(--font-body); min-height:100vh; }
  .app { max-width:860px; margin:0 auto; padding:0 16px 100px; }
  .header { display:flex; align-items:center; justify-content:space-between; padding:24px 0 20px; border-bottom:1px solid var(--border); margin-bottom:28px; }
  .header-title { font-family:var(--font-display); font-size:2.4rem; letter-spacing:2px; color:var(--accent); line-height:1; }
  .header-sub { font-size:0.75rem; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
  .date-badge { background:var(--card); border:1px solid var(--border); border-radius:var(--r); padding:6px 14px; font-size:0.8rem; color:var(--muted); font-family:var(--font-mono); }
  .nav { display:flex; gap:6px; margin-bottom:24px; background:var(--surface); border-radius:var(--r-lg); padding:5px; border:1px solid var(--border); }
  .nav-btn { flex:1; padding:9px 6px; border:none; border-radius:var(--r); cursor:pointer; font-family:var(--font-body); font-size:0.78rem; font-weight:500; transition:all 0.18s ease; background:transparent; color:var(--muted); }
  .nav-btn.active { background:var(--accent); color:#0d0f14; font-weight:600; }
  .day-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:24px; }
  @media(min-width:600px){ .day-grid { grid-template-columns:repeat(3,1fr); } }
  .day-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px 16px; cursor:pointer; transition:all 0.18s ease; position:relative; }
  .day-card:active { border-color:var(--accent); background:rgba(232,184,75,0.08); }
  .day-card-name { font-family:var(--font-display); font-size:1.1rem; letter-spacing:1px; color:var(--accent); margin-bottom:3px; }
  .day-card-sub { font-size:0.72rem; color:var(--muted); }
  .day-card-badge { position:absolute; top:10px; right:10px; width:8px; height:8px; border-radius:50%; background:var(--green); }
  .tag { font-size:0.68rem; padding:2px 8px; border-radius:20px; font-family:var(--font-mono); background:var(--surface); border:1px solid var(--border); color:var(--muted); }
  .tag.green { background:rgba(76,175,125,0.12); border-color:var(--green); color:var(--green); }
  .tag.gold { background:rgba(232,184,75,0.12); border-color:var(--accent); color:var(--accent); }
  .section-divider { display:flex; align-items:center; gap:10px; margin:20px 0 14px; }
  .section-divider-line { flex:1; height:1px; background:var(--border); }
  .section-divider-label { font-size:0.7rem; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:1px; padding:3px 10px; border-radius:20px; }
  .back-btn { background:var(--card); border:1px solid var(--border); border-radius:var(--r); padding:7px 14px; font-size:0.78rem; cursor:pointer; color:var(--muted); font-family:var(--font-body); }
  .save-btn { width:100%; padding:15px; border:none; border-radius:var(--r-lg); background:var(--accent); color:#0d0f14; font-family:var(--font-display); font-size:1.2rem; letter-spacing:2px; cursor:pointer; }
  .toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(80px); background:var(--green); color:#fff; padding:12px 24px; border-radius:30px; font-size:0.85rem; font-weight:500; z-index:999; transition:transform 0.3s ease; white-space:nowrap; pointer-events:none; }
  .toast.show { transform:translateX(-50%) translateY(0); }
  .filter-btn { padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:var(--card); color:var(--muted); font-size:0.75rem; cursor:pointer; font-family:var(--font-body); }
  .filter-btn.active { background:rgba(91,156,246,0.15); border-color:var(--accent2); color:var(--accent2); }
  .stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
  .stat-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r); padding:14px; text-align:center; }
  .stat-val { font-family:var(--font-display); font-size:1.6rem; letter-spacing:1px; }
  .stat-val.gold{color:var(--accent)} .stat-val.blue{color:var(--accent2)} .stat-val.green{color:var(--green)}
  .stat-label { font-size:0.65rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:3px; }
  .chart-bars { display:flex; align-items:flex-end; gap:6px; height:120px; }
  .chart-bar-wrap { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end; }
  .chart-bar { width:100%; border-radius:4px 4px 0 0; background:var(--accent2); min-height:4px; position:relative; }
  .chart-bar.latest { background:var(--accent); }
  .chart-bar-label { font-size:0.58rem; color:var(--muted); font-family:var(--font-mono); text-align:center; }
  .chart-bar-val { font-size:0.6rem; color:var(--text); font-family:var(--font-mono); position:absolute; top:-16px; left:50%; transform:translateX(-50%); white-space:nowrap; }
  .styled-select { width:100%; background:var(--card); border:1px solid var(--border); border-radius:var(--r); padding:10px 14px; color:var(--text); font-size:0.85rem; font-family:var(--font-body); outline:none; cursor:pointer; }
  .empty-state { text-align:center; padding:48px 24px; color:var(--muted); font-size:0.85rem; line-height:1.8; }
  .empty-icon { font-size:2.5rem; margin-bottom:12px; }
  input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
  input[type=number] { -moz-appearance:textfield; }
`;

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("workout");
  const [log, setLog] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [toast, setToast] = useState("");
  const [histFilter, setHistFilter] = useState("all");
  const [histExpanded, setHistExpanded] = useState({});
  const [progEx, setProgEx] = useState("");

  useEffect(() => { loadLog().then(l => { setLog(l); setLoading(false); }); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 2200); };

  const sessionKey = selectedDay ? `${today()}__${selectedDay}` : null;

  const getExHistory = useCallback((exName) => {
    return Object.entries(log)
      .flatMap(([k,v]) => {
        const sets = v.sets?.[exName];
        if (!sets?.length) return [];
        return [{ date: k.split("__")[0], sets }];
      })
      .sort((a,b) => a.date.localeCompare(b.date));
  }, [log]);

  const getSessionSets = useCallback((exName, numSets) => {
    return log[sessionKey]?.sets?.[exName] ||
      Array.from({length: numSets}, () => ({weight:"", reps:"", completed:false}));
  }, [log, sessionKey]);

  const handleUpdateSet = useCallback((exName, setIdx, field, value) => {
    setLog(prev => {
      const session = prev[sessionKey] || { sets: {} };
      const allEx = [...Object.values(PLAN).flat(), ...Object.values(AB_FINISHERS).flat()];
      const ex = allEx.find(e => e.name === exName);
      const existing = session.sets[exName] ||
        Array.from({length: ex?.sets||3}, ()=>({weight:"",reps:"",completed:false}));
      const sets = existing.map((s,i) => i===setIdx ? {...s, [field]: value} : s);
      const next = { ...prev, [sessionKey]: { ...session, sets: { ...session.sets, [exName]: sets } } };
      saveLog(next);
      return next;
    });
  }, [sessionKey]);

  const handleToggleComplete = useCallback((exName, setIdx) => {
    setLog(prev => {
      const session = prev[sessionKey] || { sets: {} };
      const allEx = [...Object.values(PLAN).flat(), ...Object.values(AB_FINISHERS).flat()];
      const ex = allEx.find(e => e.name === exName);
      const existing = session.sets[exName] ||
        Array.from({length: ex?.sets||3}, ()=>({weight:"",reps:"",completed:false}));
      const sets = existing.map((s,i) => i===setIdx ? {...s, completed: !s.completed} : s);
      const next = { ...prev, [sessionKey]: { ...session, sets: { ...session.sets, [exName]: sets } } };
      saveLog(next);
      return next;
    });
  }, [sessionKey]);

  // ── Save and return to home screen ──────────────────────────────────────────
  const saveSession = async () => {
    await saveLog(log);
    showToast("✓ Session saved!");
    setTimeout(() => setSelectedDay(null), 900); // brief delay so toast is visible
  };

  const dayHasLog = (d) => Object.keys(log).some(k => k.includes(d.slice(0,10)));

  // All exercises including ab finishers for the progress dropdown
  const allExercises = [...new Set([
    ...Object.values(PLAN).flat(),
    ...Object.values(AB_FINISHERS).flat()
  ].map(e=>e.name))].sort();

  const historyEntries = Object.entries(log)
    .filter(([,v]) => Object.keys(v.sets||{}).length > 0)
    .sort(([a],[b]) => b.localeCompare(a))
    .filter(([k]) => histFilter==="all" || k.includes(histFilter.slice(0,6)));

  const progHistory = progEx ? getExHistory(progEx).slice(-8) : [];
  const progMax = progHistory.length ? Math.max(...progHistory.map(h=>maxW(h.sets))) : 0;

  if (loading) return (
    <><style>{css}</style>
    <div className="app"><div className="empty-state"><div className="empty-icon">⏳</div>Loading...</div></div></>
  );

  return (
    <><style>{css}</style>
    <div className="app">

      {/* Header */}
      <div className="header">
        <div>
          <div className="header-title">DEE'S GYM</div>
          <div className="header-sub">Progressive Overload Tracker</div>
        </div>
        <div className="date-badge">{fmt(today())}</div>
      </div>

      {/* Nav */}
      <div className="nav">
        {[["workout","🏋️ Log Workout"],["history","📋 History"],["progress","📈 Progress"]].map(([id,label])=>(
          <button key={id} className={`nav-btn${tab===id?" active":""}`}
            onClick={()=>{setTab(id);setSelectedDay(null);}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── WORKOUT: Day picker ── */}
      {tab==="workout" && !selectedDay && (
        <div>
          <div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Select Today's Workout</div>
          <div className="day-grid">
            {Object.keys(PLAN).map(day=>(
              <div key={day} className="day-card" onClick={()=>setSelectedDay(day)}>
                {dayHasLog(day) && <div className="day-card-badge"/>}
                <div className="day-card-name">{day.split("—")[0].trim()}</div>
                <div className="day-card-sub">{day.split("—")[1]?.trim()}</div>
                <div style={{marginTop:6,fontSize:"0.68rem",color:"var(--muted)"}}>
                  {PLAN[day].length} exercises + {AB_FINISHERS[day]?.length||0} abs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WORKOUT: Session ── */}
      {tab==="workout" && selectedDay && (
        <>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontFamily:"var(--font-display)",fontSize:"1.6rem",letterSpacing:"1px",color:"var(--text)"}}>{selectedDay.split("—")[0]}</div>
              <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:2}}>{selectedDay.split("—")[1]?.trim()} · {fmt(today())}</div>
            </div>
            <button className="back-btn" onClick={()=>setSelectedDay(null)}>← Days</button>
          </div>

          {/* Main exercises */}
          <div className="section-divider">
            <div className="section-divider-line"/>
            <span className="section-divider-label" style={{background:"rgba(91,156,246,0.12)",border:"1px solid rgba(91,156,246,0.3)",color:"var(--accent2)"}}>Main Work</span>
            <div className="section-divider-line"/>
          </div>

          {PLAN[selectedDay].map(ex => (
            <ExerciseCard
              key={ex.name}
              ex={ex}
              sessionSets={getSessionSets(ex.name, ex.sets)}
              onUpdateSet={(setIdx, field, value) => handleUpdateSet(ex.name, setIdx, field, value)}
              onToggleComplete={(setIdx) => handleToggleComplete(ex.name, setIdx)}
              exHistory={getExHistory(ex.name)}
            />
          ))}

          {/* Ab finisher */}
          {AB_FINISHERS[selectedDay] && (
            <>
              <div className="section-divider">
                <div className="section-divider-line"/>
                <span className="section-divider-label" style={{background:"rgba(76,175,125,0.12)",border:"1px solid rgba(76,175,125,0.4)",color:"var(--green)"}}>Ab Finisher</span>
                <div className="section-divider-line"/>
              </div>

              {AB_FINISHERS[selectedDay].map(ex => (
                <ExerciseCard
                  key={ex.name}
                  ex={ex}
                  sessionSets={getSessionSets(ex.name, ex.sets)}
                  onUpdateSet={(setIdx, field, value) => handleUpdateSet(ex.name, setIdx, field, value)}
                  onToggleComplete={(setIdx) => handleToggleComplete(ex.name, setIdx)}
                  exHistory={getExHistory(ex.name)}
                  accent={true}
                />
              ))}
            </>
          )}

          <div style={{position:"sticky",bottom:20,paddingTop:14}}>
            <button className="save-btn" onClick={saveSession}>SAVE & FINISH</button>
          </div>
        </>
      )}

      {/* ── HISTORY ── */}
      {tab==="history" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            <button className={`filter-btn${histFilter==="all"?" active":""}`} onClick={()=>setHistFilter("all")}>All</button>
            {Object.keys(PLAN).map(d=>(
              <button key={d} className={`filter-btn${histFilter===d.slice(0,6)?" active":""}`}
                onClick={()=>setHistFilter(d.slice(0,6))}>
                {d.split("—")[0].trim()}
              </button>
            ))}
          </div>
          {historyEntries.length===0
            ? <div className="empty-state"><div className="empty-icon">📋</div>No sessions logged yet.</div>
            : historyEntries.map(([key,session])=>{
              const [date,...parts]=key.split("__");
              const isOpen=histExpanded[key];
              const exercises=Object.entries(session.sets||{}).filter(([,s])=>s.length>0);
              return (
                <div key={key} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",marginBottom:12,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer"}}
                    onClick={()=>setHistExpanded(p=>({...p,[key]:!p[key]}))}>
                    <div>
                      <div style={{fontFamily:"var(--font-display)",fontSize:"1.1rem",letterSpacing:"1px",color:"var(--accent2)"}}>{fmt(date)}</div>
                      <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:2}}>{parts.join(" ")} · {exercises.length} exercises</div>
                    </div>
                    <span style={{color:"var(--muted)",fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen && (
                    <div style={{padding:"0 16px 14px"}}>
                      {exercises.map(([exName,sets])=>{
                        const isAb = Object.values(AB_FINISHERS).flat().some(e=>e.name===exName);
                        return (
                          <div key={exName} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",gap:12}}>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                {isAb && <span style={{fontSize:"0.6rem",color:"var(--green)",fontFamily:"var(--font-mono)",background:"rgba(76,175,125,0.1)",border:"1px solid rgba(76,175,125,0.3)",borderRadius:3,padding:"1px 5px"}}>ABS</span>}
                                <div style={{fontSize:"0.82rem",color:"var(--text)",fontWeight:500}}>{exName}</div>
                              </div>
                              <div style={{fontSize:"0.72rem",color:"var(--muted)",fontFamily:"var(--font-mono)",marginTop:3}}>
                                {sets.map((s,i)=>`S${i+1}: ${s.weight||"—"}lbs×${s.reps||"—"}`).join(" · ")}
                              </div>
                            </div>
                            {maxW(sets)>0 && <div style={{fontSize:"0.78rem",color:"var(--green)",fontFamily:"var(--font-mono)",whiteSpace:"nowrap"}}>{maxW(sets)} lbs</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          }
        </>
      )}

      {/* ── PROGRESS ── */}
      {tab==="progress" && (
        <>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Select Exercise</div>
            <select className="styled-select" value={progEx} onChange={e=>setProgEx(e.target.value)}>
              <option value="">— Choose an exercise —</option>
              <optgroup label="── Main Work ──">
                {[...new Set(Object.values(PLAN).flat().map(e=>e.name))].sort().map(ex=>(
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </optgroup>
              <optgroup label="── Ab Finishers ──">
                {[...new Set(Object.values(AB_FINISHERS).flat().map(e=>e.name))].sort().map(ex=>(
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {!progEx && <div className="empty-state"><div className="empty-icon">📈</div>Select an exercise to see your progression.</div>}
          {progEx && progHistory.length===0 && <div className="empty-state"><div className="empty-icon">🏗️</div>No data yet for <strong>{progEx}</strong>.</div>}

          {progEx && progHistory.length>0 && (
            <>
              <div className="stat-row">
                <div className="stat-card"><div className="stat-val gold">{progMax}</div><div className="stat-label">Max (lbs)</div></div>
                <div className="stat-card"><div className="stat-val blue">{progHistory.length}</div><div className="stat-label">Sessions</div></div>
                <div className="stat-card">
                  <div className="stat-val green">
                    {progHistory.length>=2?`+${Math.max(0,maxW(progHistory[progHistory.length-1].sets)-maxW(progHistory[0].sets))}`:"—"}
                  </div>
                  <div className="stat-label">Total Gain</div>
                </div>
              </div>
              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",padding:18,marginBottom:16}}>
                <div style={{fontSize:"0.7rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>Max Weight Per Session</div>
                <div className="chart-bars">
                  {progHistory.map((h,i)=>{
                    const w=maxW(h.sets);
                    const pct=progMax>0?(w/progMax)*100:0;
                    return (
                      <div key={i} className="chart-bar-wrap">
                        <div className={`chart-bar${i===progHistory.length-1?" latest":""}`} style={{height:`${Math.max(pct,4)}%`}}>
                          <span className="chart-bar-val">{w}</span>
                        </div>
                        <div className="chart-bar-label">{fmt(h.date).split(",")[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {(()=>{
                const reco=getRecommendation(progHistory);
                return reco?(
                  <div style={{background:"rgba(232,184,75,0.1)",border:"1px solid rgba(232,184,75,0.4)",borderRadius:"var(--r-lg)",padding:"16px 18px"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--accent)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Progressive Overload Recommendation</div>
                    <div style={{fontSize:"0.9rem",color:"var(--text)",lineHeight:1.5}}>{reco.message}</div>
                    <div style={{marginTop:8,fontFamily:"var(--font-mono)",fontSize:"0.85rem",color:"var(--accent)"}}>Next target: <strong>{reco.suggestedWeight} lbs</strong></div>
                  </div>
                ):(
                  <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",padding:"16px 18px",fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.6}}>
                    <strong style={{color:"var(--text)"}}>How overload works:</strong><br/>
                    Complete 2 sessions with all sets marked ✓ Done to unlock a weight increase recommendation.
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}

    </div>
    <div className={`toast${toast?" show":""}`}>{toast}</div>
    </>
  );
}
