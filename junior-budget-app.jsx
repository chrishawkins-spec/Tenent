import { useState, useEffect, useCallback } from "react";

// ─── Storage helpers ───────────────────────────────────────────────
const store = {
  async get(key, shared = false) {
    try { return await window.storage.get(key, shared); } catch { return null; }
  },
  async set(key, val, shared = false) {
    try { return await window.storage.set(key, JSON.stringify(val), shared); } catch { return null; }
  },
  async getJSON(key, shared = false) {
    const r = await store.get(key, shared);
    if (!r) return null;
    try { return JSON.parse(r.value); } catch { return null; }
  },
};

// ─── Constants ────────────────────────────────────────────────────
const ADMIN_PASSWORD = "admin2024";

const GIFT_CATEGORIES = [
  {
    id: "immFamily",
    label: "Immediate Family",
    hint: "Parents and siblings",
    occasions: ["Birthdays", "Religious holiday(s)", "Mother's Day", "Father's Day"],
    group: "Family",
    fixedFreq: { "Mother's Day": 1, "Father's Day": 1 },
  },
  {
    id: "extFamily",
    label: "Extended Family",
    hint: "Cousins, aunts, uncles, grandparents",
    occasions: ["Birthdays", "Religious holiday(s)"],
    group: "Family",
  },
  {
    id: "friends",
    label: "Friends",
    hint: "",
    occasions: ["Birthdays", "Religious holiday(s)", "Other"],
    group: "Friends",
  },
  {
    id: "others",
    label: "Others",
    hint: "",
    occasions: ["Teachers (end of term/year)", "Other occasions"],
    group: "Others",
  },
];

const WEEKS_PER_TERM = 9;

// ─── Utility ──────────────────────────────────────────────────────
function fmt(n) {
  if (isNaN(n) || n === null || n === undefined) return "£0.00";
  return "£" + Number(n).toFixed(2);
}
function pct(n) {
  if (!n || isNaN(n)) return "0%";
  return (n * 100).toFixed(1) + "%";
}

// ─── Admin Panel ──────────────────────────────────────────────────
function AdminPanel({ onClose }) {
  const [codes, setCodes] = useState([]);
  const [newCode, setNewCode] = useState({ code: "", maxUsers: 30, startDate: "", endDate: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    const data = await store.getJSON("budget:passcodes", true);
    setCodes(data || []);
  }

  async function saveCodes(updated) {
    await store.set("budget:passcodes", updated, true);
    setCodes(updated);
  }

  async function addCode() {
    if (!newCode.code || !newCode.startDate || !newCode.endDate) {
      setMsg("Please fill in all fields."); return;
    }
    if (codes.find(c => c.code === newCode.code)) {
      setMsg("That code already exists."); return;
    }
    const updated = [...codes, { ...newCode, maxUsers: Number(newCode.maxUsers), usedBy: [] }];
    await saveCodes(updated);
    setNewCode({ code: "", maxUsers: 30, startDate: "", endDate: "" });
    setMsg("✓ Code created successfully.");
    setTimeout(() => setMsg(""), 3000);
  }

  async function deleteCode(code) {
    if (!confirm(`Delete passcode "${code}"?`)) return;
    await saveCodes(codes.filter(c => c.code !== code));
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"#1a1a2e",border:"1px solid #e94560",borderRadius:12,padding:32,width:700,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(233,69,96,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h2 style={{color:"#e94560",fontFamily:"'Playfair Display',serif",margin:0,fontSize:24}}>⚙ Admin Panel</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:24,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{background:"#0f3460",borderRadius:8,padding:20,marginBottom:24}}>
          <h3 style={{color:"#e94560",fontFamily:"'Playfair Display',serif",marginTop:0,fontSize:16}}>Create New Passcode</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[
              { label:"Passcode", key:"code", type:"text", placeholder:"e.g. CLASS2024" },
              { label:"Max Users", key:"maxUsers", type:"number", placeholder:"30" },
              { label:"Start Date", key:"startDate", type:"date" },
              { label:"End Date", key:"endDate", type:"date" },
            ].map(f => (
              <label key={f.key} style={{display:"flex",flexDirection:"column",gap:4}}>
                <span style={{color:"#aaa",fontSize:12}}>{f.label}</span>
                <input
                  type={f.type}
                  value={newCode[f.key]}
                  placeholder={f.placeholder}
                  onChange={e => setNewCode(p => ({...p,[f.key]:e.target.value}))}
                  style={{background:"#1a1a2e",border:"1px solid #444",borderRadius:6,padding:"8px 12px",color:"#fff",fontSize:14}}
                />
              </label>
            ))}
          </div>
          <button onClick={addCode} style={{marginTop:12,background:"#e94560",border:"none",borderRadius:6,padding:"10px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>
            + Create Code
          </button>
          {msg && <p style={{color:"#4ade80",marginTop:8,fontSize:13}}>{msg}</p>}
        </div>

        <h3 style={{color:"#e94560",fontFamily:"'Playfair Display',serif",fontSize:16}}>Active Passcodes</h3>
        {codes.length === 0 ? (
          <p style={{color:"#666",fontStyle:"italic"}}>No passcodes created yet.</p>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"1px solid #333"}}>
                {["Code","Max Users","Used","Start","End","Actions"].map(h => (
                  <th key={h} style={{color:"#aaa",textAlign:"left",padding:"8px 10px",fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map(c => {
                const now = new Date().toISOString().split("T")[0];
                const active = now >= c.startDate && now <= c.endDate;
                return (
                  <tr key={c.code} style={{borderBottom:"1px solid #1e1e3a"}}>
                    <td style={{padding:"8px 10px",color:"#fff",fontWeight:700}}>{c.code}</td>
                    <td style={{padding:"8px 10px",color:"#aaa"}}>{c.maxUsers}</td>
                    <td style={{padding:"8px 10px",color: (c.usedBy||[]).length >= c.maxUsers ? "#e94560" : "#4ade80"}}>{(c.usedBy||[]).length}</td>
                    <td style={{padding:"8px 10px",color:"#aaa"}}>{c.startDate}</td>
                    <td style={{padding:"8px 10px",color:"#aaa"}}>{c.endDate}</td>
                    <td style={{padding:"8px 10px"}}>
                      <span style={{marginRight:8,fontSize:11,padding:"2px 8px",borderRadius:20,background: active?"rgba(74,222,128,0.15)":"rgba(233,69,96,0.15)",color: active?"#4ade80":"#e94560"}}>
                        {active ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <button onClick={() => deleteCode(c.code)} style={{background:"rgba(233,69,96,0.2)",border:"1px solid #e94560",borderRadius:4,color:"#e94560",fontSize:11,padding:"2px 8px",cursor:"pointer"}}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────
function LoginScreen({ onLogin, onAdmin }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [tab, setTab] = useState("student");
  const [err, setErr] = useState("");

  async function handleStudentLogin() {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!code.trim()) { setErr("Please enter a passcode."); return; }
    
    const codes = await store.getJSON("budget:passcodes", true);
    if (!codes) { setErr("No passcodes set up yet. Please contact your teacher."); return; }
    
    const entry = codes.find(c => c.code === code.trim().toUpperCase());
    if (!entry) { setErr("Invalid passcode. Please check with your teacher."); return; }
    
    const now = new Date().toISOString().split("T")[0];
    if (now < entry.startDate || now > entry.endDate) {
      setErr(`This passcode is only valid from ${entry.startDate} to ${entry.endDate}.`); return;
    }
    
    const usedBy = entry.usedBy || [];
    const alreadyIn = usedBy.includes(name.trim().toLowerCase());
    if (!alreadyIn && usedBy.length >= entry.maxUsers) {
      setErr("This class session is full. Please contact your teacher."); return;
    }
    
    if (!alreadyIn) {
      const updated = codes.map(c => c.code === entry.code
        ? { ...c, usedBy: [...usedBy, name.trim().toLowerCase()] }
        : c
      );
      await store.set("budget:passcodes", updated, true);
    }
    
    onLogin(name.trim(), code.trim().toUpperCase());
  }

  function handleAdminLogin() {
    if (adminPw === ADMIN_PASSWORD) { onAdmin(); }
    else { setErr("Incorrect admin password."); }
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:20}}>
      <div style={{width:420,maxWidth:"100%"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:48,marginBottom:12}}>💰</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",color:"#e94560",fontSize:36,margin:0,lineHeight:1.1}}>Budget</h1>
          <p style={{color:"#4ade80",fontSize:14,margin:"8px 0 0",letterSpacing:3,textTransform:"uppercase"}}>Gift Planning Tool</p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"#1a1a2e",borderRadius:8,marginBottom:24,padding:4}}>
          {["student","admin"].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }}
              style={{flex:1,padding:"10px",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:13,textTransform:"capitalize",
                background: tab===t ? "#e94560" : "transparent",
                color: tab===t ? "#fff" : "#666",transition:"all 0.2s"}}>
              {t === "student" ? "👤 Student Login" : "⚙ Admin"}
            </button>
          ))}
        </div>

        <div style={{background:"#1a1a2e",borderRadius:12,padding:28,border:"1px solid #2a2a4e"}}>
          {tab === "student" ? (
            <>
              <label style={{display:"block",marginBottom:16}}>
                <span style={{color:"#aaa",fontSize:13,display:"block",marginBottom:6}}>Your Full Name</span>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah Johnson"
                  style={{width:"100%",boxSizing:"border-box",background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:8,padding:"12px 14px",color:"#fff",fontSize:15,outline:"none"}}
                  onKeyDown={e=>e.key==="Enter"&&handleStudentLogin()} />
              </label>
              <label style={{display:"block",marginBottom:20}}>
                <span style={{color:"#aaa",fontSize:13,display:"block",marginBottom:6}}>Class Passcode</span>
                <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="e.g. CLASS2024"
                  style={{width:"100%",boxSizing:"border-box",background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:8,padding:"12px 14px",color:"#fff",fontSize:15,outline:"none",letterSpacing:2,fontWeight:700}}
                  onKeyDown={e=>e.key==="Enter"&&handleStudentLogin()} />
              </label>
              <button onClick={handleStudentLogin}
                style={{width:"100%",background:"#e94560",border:"none",borderRadius:8,padding:"14px",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>
                Start Budgeting →
              </button>
            </>
          ) : (
            <>
              <label style={{display:"block",marginBottom:20}}>
                <span style={{color:"#aaa",fontSize:13,display:"block",marginBottom:6}}>Admin Password</span>
                <input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} placeholder="Enter admin password"
                  style={{width:"100%",boxSizing:"border-box",background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:8,padding:"12px 14px",color:"#fff",fontSize:15,outline:"none"}}
                  onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()} />
              </label>
              <button onClick={handleAdminLogin}
                style={{width:"100%",background:"#0f3460",border:"1px solid #e94560",borderRadius:8,padding:"14px",color:"#e94560",fontSize:16,fontWeight:700,cursor:"pointer"}}>
                Access Admin Panel →
              </button>
            </>
          )}
          {err && <p style={{color:"#e94560",fontSize:13,marginTop:12,marginBottom:0}}>{err}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Budget App ───────────────────────────────────────────────
function BudgetApp({ studentName, passcode, onLogout }) {
  const STORAGE_KEY = `budget:data:${passcode}:${studentName.toLowerCase().replace(/\s+/g,"_")}`;

  const initGifts = () => {
    const obj = {};
    GIFT_CATEGORIES.forEach(cat => {
      cat.occasions.forEach(occ => {
        obj[`${cat.id}_${occ}_amount`] = "";
        obj[`${cat.id}_${occ}_recipients`] = "";
        obj[`${cat.id}_${occ}_times`] = cat.fixedFreq?.[occ] ?? "";
      });
    });
    return obj;
  };

  const [tab, setTab] = useState("gifts");
  const [budget, setBudget] = useState("");
  const [gifts, setGifts] = useState(initGifts);
  const [weeklyActual, setWeeklyActual] = useState(Array(WEEKS_PER_TERM).fill(""));
  const [weeksInTerm, setWeeksInTerm] = useState(WEEKS_PER_TERM);
  const [saved, setSaved] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Load saved data
  useEffect(() => {
    (async () => {
      const data = await store.getJSON(STORAGE_KEY);
      if (data) {
        if (data.budget !== undefined) setBudget(data.budget);
        if (data.gifts) setGifts(data.gifts);
        if (data.weeklyActual) setWeeklyActual(data.weeklyActual);
        if (data.weeksInTerm) setWeeksInTerm(data.weeksInTerm);
      }
    })();
  }, []);

  const saveData = useCallback(async () => {
    await store.set(STORAGE_KEY, { budget, gifts, weeklyActual, weeksInTerm });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [budget, gifts, weeklyActual, weeksInTerm]);

  // ─ Calculations ─
  function giftAnnual(catId, occ) {
    const a = parseFloat(gifts[`${catId}_${occ}_amount`]) || 0;
    const r = parseFloat(gifts[`${catId}_${occ}_recipients`]) || 0;
    const t = parseFloat(gifts[`${catId}_${occ}_times`]) || 0;
    return a * r * t;
  }

  const groupTotals = { Family: 0, Friends: 0, Others: 0 };
  GIFT_CATEGORIES.forEach(cat => {
    cat.occasions.forEach(occ => {
      groupTotals[cat.group] = (groupTotals[cat.group] || 0) + giftAnnual(cat.id, occ);
    });
  });
  const totalExpenses = Object.values(groupTotals).reduce((a, b) => a + b, 0);
  const budgetNum = parseFloat(budget) || 0;
  const surplus = budgetNum - totalExpenses;

  // Weekly calculations
  const annualBudgetForTerm = budgetNum;
  const termBudget = annualBudgetForTerm / 3;
  const weeklyFood = totalExpenses > 0 ? (groupTotals.Family / 52) : 0;
  const weeklyRent = totalExpenses > 0 ? (groupTotals.Friends / (weeksInTerm * 3)) : 0;

  let remaining = termBudget;
  const weekRows = [];
  for (let w = 0; w <= weeksInTerm; w++) {
    const actual = parseFloat(weeklyActual[w]) || 0;
    const expected = remaining;
    if (w > 0) remaining -= actual;
    weekRows.push({ week: w, actual, expected });
  }

  // ─ Input helper ─
  const inp = (key, placeholder = "", type = "number", extra = {}) => (
    <input
      type={type}
      value={gifts[key] ?? ""}
      placeholder={placeholder}
      min={extra.min ?? 0}
      onChange={e => setGifts(p => ({...p, [key]: e.target.value}))}
      style={{
        background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:6,
        padding:"8px 10px",color:"#fff",fontSize:13,width:"90px",boxSizing:"border-box"
      }}
    />
  );

  const TABS = [
    { id:"gifts", label:"🎁 Gifts" },
    { id:"summary", label:"📊 Summary" },
    { id:"weekly", label:"📅 Weekly" },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",fontFamily:"'DM Sans',sans-serif",color:"#fff"}}>
      {/* Header */}
      <div style={{background:"#1a1a2e",borderBottom:"1px solid #e94560",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontFamily:"'Playfair Display',serif",color:"#e94560",fontSize:20,fontWeight:700}}>💰 Junior Budget</span>
          <span style={{color:"#4ade80",fontSize:14}}>Welcome, <strong>{studentName}</strong></span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={saveData} style={{background:saved?"#4ade80":"#0f3460",border:"1px solid "+(saved?"#4ade80":"#444"),borderRadius:6,padding:"8px 18px",color:saved?"#0d0d1a":"#fff",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.3s"}}>
            {saved ? "✓ Saved!" : "💾 Save"}
          </button>
          <button onClick={onLogout} style={{background:"none",border:"1px solid #444",borderRadius:6,padding:"8px 14px",color:"#aaa",fontSize:13,cursor:"pointer"}}>
            Logout
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{background:"#1a1a2e",padding:"0 24px",display:"flex",gap:4,borderBottom:"1px solid #2a2a4e"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{padding:"14px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,fontWeight:tab===t.id?700:400,
              color:tab===t.id?"#e94560":"#666",borderBottom:tab===t.id?"2px solid #e94560":"2px solid transparent",
              transition:"all 0.2s",marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px"}}>

        {/* ═══ GIFTS TAB ═══ */}
        {tab === "gifts" && (
          <div>
            {/* Annual budget input */}
            <div style={{background:"#1a1a2e",borderRadius:12,padding:20,marginBottom:24,border:"1px solid #2a2a4e",display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
              <div>
                <div style={{color:"#aaa",fontSize:12,marginBottom:6}}>How much do you plan to spend on gifts this year?</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#4ade80",fontSize:20,fontWeight:700}}>£</span>
                  <input type="number" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="0.00"
                    style={{background:"#0d0d1a",border:"1px solid #e94560",borderRadius:8,padding:"10px 14px",color:"#fff",fontSize:22,fontWeight:700,width:140}} />
                  <span style={{color:"#666",fontSize:13}}>per year</span>
                </div>
              </div>
              <div style={{marginLeft:"auto",textAlign:"right"}}>
                <div style={{color:"#aaa",fontSize:12}}>Budgeted so far</div>
                <div style={{color: surplus >= 0 ? "#4ade80" : "#e94560",fontSize:24,fontWeight:700}}>{fmt(totalExpenses)}</div>
                <div style={{color:"#666",fontSize:12}}>of {fmt(budgetNum)}</div>
              </div>
            </div>

            {GIFT_CATEGORIES.map(cat => (
              <div key={cat.id} style={{background:"#1a1a2e",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #2a2a4e"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <h3 style={{margin:0,color:"#e94560",fontFamily:"'Playfair Display',serif",fontSize:17}}>{cat.label}</h3>
                    {cat.hint && <p style={{margin:"4px 0 0",color:"#666",fontSize:12}}>{cat.hint}</p>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:"#aaa",fontSize:11}}>Category total</div>
                    <div style={{color:"#4ade80",fontWeight:700,fontSize:16}}>{fmt(groupTotals[cat.group])}</div>
                  </div>
                </div>

                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr>
                        {["Occasion","Avg. Amount (£)","Recipients","Times/year","Annual Total"].map(h => (
                          <th key={h} style={{color:"#666",textAlign:"left",padding:"6px 8px",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cat.occasions.map(occ => {
                        const annual = giftAnnual(cat.id, occ);
                        const fixedFreq = cat.fixedFreq?.[occ];
                        return (
                          <tr key={occ} style={{borderTop:"1px solid #0d0d1a"}}>
                            <td style={{padding:"8px 8px",color:"#ddd"}}>{occ}</td>
                            <td style={{padding:"8px 8px"}}>{inp(`${cat.id}_${occ}_amount`, "0.00")}</td>
                            <td style={{padding:"8px 8px"}}>{inp(`${cat.id}_${occ}_recipients`, "0")}</td>
                            <td style={{padding:"8px 8px"}}>
                              {fixedFreq !== undefined
                                ? <span style={{color:"#aaa",paddingLeft:10}}>{fixedFreq}×</span>
                                : inp(`${cat.id}_${occ}_times`, "0")}
                            </td>
                            <td style={{padding:"8px 8px",color: annual > 0 ? "#4ade80" : "#444",fontWeight:700}}>{annual > 0 ? fmt(annual) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SUMMARY TAB ═══ */}
        {tab === "summary" && (
          <div>
            <div style={{background:"#1a1a2e",borderRadius:12,padding:28,marginBottom:20,border:"1px solid #2a2a4e"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",color:"#e94560",margin:"0 0 8px"}}>Annual Gifting Summary</h2>
              <p style={{color:"#666",margin:"0 0 24px",fontSize:13}}>{studentName}'s Budget Report</p>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:28}}>
                <div style={{background:"#0f3460",borderRadius:10,padding:18,textAlign:"center",border:"1px solid #1a4a80"}}>
                  <div style={{color:"#aaa",fontSize:12,marginBottom:6}}>ANNUAL BUDGET</div>
                  <div style={{color:"#4ade80",fontSize:28,fontWeight:700}}>{fmt(budgetNum)}</div>
                </div>
                <div style={{background:"#0f3460",borderRadius:10,padding:18,textAlign:"center",border:"1px solid #1a4a80"}}>
                  <div style={{color:"#aaa",fontSize:12,marginBottom:6}}>TOTAL EXPENSES</div>
                  <div style={{color:"#e94560",fontSize:28,fontWeight:700}}>{fmt(totalExpenses)}</div>
                </div>
                <div style={{background: surplus >= 0 ? "rgba(74,222,128,0.1)" : "rgba(233,69,96,0.1)",borderRadius:10,padding:18,textAlign:"center",border:`1px solid ${surplus>=0?"rgba(74,222,128,0.3)":"rgba(233,69,96,0.3)"}`}}>
                  <div style={{color:"#aaa",fontSize:12,marginBottom:6}}>SURPLUS / DEFICIT</div>
                  <div style={{color: surplus>=0?"#4ade80":"#e94560",fontSize:28,fontWeight:700}}>{fmt(surplus)}</div>
                </div>
              </div>

              {/* Bar chart */}
              <h3 style={{color:"#aaa",fontSize:14,fontWeight:600,marginBottom:14}}>Spending by Category</h3>
              {Object.entries(groupTotals).map(([group, total]) => {
                const pctVal = budgetNum > 0 ? (total / budgetNum) * 100 : 0;
                const colors = { Family:"#e94560", Friends:"#4ade80", Others:"#f59e0b" };
                return (
                  <div key={group} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{color:"#ddd",fontSize:13}}>{group}</span>
                      <span style={{color:colors[group],fontSize:13,fontWeight:700}}>{fmt(total)} ({pctVal.toFixed(1)}%)</span>
                    </div>
                    <div style={{background:"#0d0d1a",borderRadius:99,height:10,overflow:"hidden"}}>
                      <div style={{background:colors[group],width:`${Math.min(100,pctVal)}%`,height:"100%",borderRadius:99,transition:"width 0.5s"}} />
                    </div>
                  </div>
                );
              })}

              {/* % over/underspend */}
              {budgetNum > 0 && (
                <div style={{marginTop:20,background:"#0d0d1a",borderRadius:8,padding:16,textAlign:"center"}}>
                  <div style={{color:"#aaa",fontSize:12,marginBottom:4}}>PERCENTAGE {surplus>=0?"UNDERSPEND":"OVERSPEND"}</div>
                  <div style={{color: surplus>=0?"#4ade80":"#e94560",fontSize:22,fontWeight:700}}>
                    {Math.abs(((surplus/budgetNum)*100)).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Detailed breakdown */}
            <div style={{background:"#1a1a2e",borderRadius:12,padding:24,border:"1px solid #2a2a4e"}}>
              <h3 style={{color:"#e94560",fontFamily:"'Playfair Display',serif",margin:"0 0 16px"}}>Detailed Breakdown</h3>
              {GIFT_CATEGORIES.map(cat => (
                <div key={cat.id} style={{marginBottom:20}}>
                  <h4 style={{color:"#ddd",margin:"0 0 8px",fontSize:14}}>{cat.label}</h4>
                  {cat.occasions.map(occ => {
                    const annual = giftAnnual(cat.id, occ);
                    if (!annual) return null;
                    return (
                      <div key={occ} style={{display:"flex",justifyContent:"space-between",padding:"6px 12px",background:"#0d0d1a",borderRadius:6,marginBottom:4}}>
                        <span style={{color:"#aaa",fontSize:13}}>{occ}</span>
                        <span style={{color:"#4ade80",fontWeight:700,fontSize:13}}>{fmt(annual)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ WEEKLY TAB ═══ */}
        {tab === "weekly" && (
          <div>
            <div style={{background:"#1a1a2e",borderRadius:12,padding:20,marginBottom:16,border:"1px solid #2a2a4e",display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <div>
                <div style={{color:"#aaa",fontSize:12,marginBottom:4}}>Weeks in this term</div>
                <input type="number" value={weeksInTerm} min={1} max={20}
                  onChange={e=>setWeeksInTerm(parseInt(e.target.value)||9)}
                  style={{background:"#0d0d1a",border:"1px solid #444",borderRadius:6,padding:"8px 12px",color:"#fff",fontSize:16,width:70}} />
              </div>
              <div style={{flex:1,display:"flex",gap:16,flexWrap:"wrap"}}>
                {[
                  {label:"Term Budget",val:fmt(termBudget),color:"#4ade80"},
                  {label:"Weekly Budget",val:fmt(termBudget/weeksInTerm),color:"#4ade80"},
                  {label:"Annual Budget",val:fmt(budgetNum),color:"#4ade80"},
                ].map(s => (
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{color:"#666",fontSize:11}}>{s.label}</div>
                    <div style={{color:s.color,fontWeight:700,fontSize:16}}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"#1a1a2e",borderRadius:12,padding:20,border:"1px solid #2a2a4e"}}>
              <p style={{color:"#666",fontSize:13,marginTop:0}}>Enter your actual spending each week. The tracker will show your remaining balance versus expected.</p>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #2a2a4e"}}>
                      {["Week","Actual Spend (£)","Running Remaining","Expected Remaining","Status"].map(h => (
                        <th key={h} style={{color:"#aaa",textAlign:"left",padding:"10px 12px",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length: weeksInTerm+1}, (_,w) => {
                      const actual = parseFloat(weeklyActual[w]) || 0;
                      const weeklyTarget = termBudget / weeksInTerm;
                      const expectedRemaining = termBudget - (w * weeklyTarget);
                      let runningRemaining = termBudget;
                      for (let i=0; i<=w; i++) runningRemaining -= (parseFloat(weeklyActual[i]) || 0);
                      const status = w === 0 ? null : runningRemaining >= expectedRemaining ? "✓ On track" : "↑ Overspent";
                      return (
                        <tr key={w} style={{borderBottom:"1px solid #0d0d1a"}}>
                          <td style={{padding:"10px 12px",fontWeight:700,color:"#e94560"}}>{w === 0 ? "Start" : `Week ${w}`}</td>
                          <td style={{padding:"10px 12px"}}>
                            {w === 0
                              ? <span style={{color:"#666",fontSize:12}}>—</span>
                              : <input type="number" value={weeklyActual[w] ?? ""} placeholder="0.00" min={0}
                                  onChange={e => {
                                    const next = [...weeklyActual];
                                    next[w] = e.target.value;
                                    setWeeklyActual(next);
                                  }}
                                  style={{background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:6,padding:"6px 10px",color:"#fff",width:100}} />
                            }
                          </td>
                          <td style={{padding:"10px 12px",color: runningRemaining >= 0 ? "#4ade80" : "#e94560",fontWeight:700}}>{fmt(runningRemaining)}</td>
                          <td style={{padding:"10px 12px",color:"#aaa"}}>{fmt(expectedRemaining)}</td>
                          <td style={{padding:"10px 12px"}}>
                            {status && <span style={{fontSize:12,padding:"3px 10px",borderRadius:99,
                              background: status.includes("✓") ? "rgba(74,222,128,0.15)" : "rgba(233,69,96,0.15)",
                              color: status.includes("✓") ? "#4ade80" : "#e94560"}}>
                              {status}
                            </span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div style={{marginTop:16,textAlign:"center"}}>
          <button onClick={saveData} style={{background:"#e94560",border:"none",borderRadius:8,padding:"12px 36px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>
            {saved ? "✓ Saved!" : "💾 Save My Budget"}
          </button>
        </div>
      </div>

      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState("login"); // login | app | admin
  const [studentName, setStudentName] = useState("");
  const [passcode, setPasscode] = useState("");

  if (state === "admin") return (
    <>
      <AdminPanel onClose={() => setState("login")} />
      <div style={{minHeight:"100vh",background:"#0d0d1a"}} />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
    </>
  );

  if (state === "app") return (
    <BudgetApp studentName={studentName} passcode={passcode} onLogout={() => setState("login")} />
  );

  return (
    <LoginScreen
      onLogin={(name, code) => { setStudentName(name); setPasscode(code); setState("app"); }}
      onAdmin={() => setState("admin")}
    />
  );
}
