import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle, X, Settings } from "lucide-react";

const STORAGE_TASKS = "focusflow:tasks";
const STORAGE_CATS = "focusflow:categories";
const STORAGE_STREAKS = "focusflow:streaks";

const DEFAULT_CATEGORIES = [
  { id: "study", name: "Study / DSA / ML", emoji: "📚", color: "#6366F1" },
  { id: "coding", name: "Coding Projects", emoji: "💻", color: "#0EA5E9" },
  { id: "fitness", name: "Fitness & Health", emoji: "🏃", color: "#22C55E" },
  { id: "placements", name: "Placements", emoji: "🗓️", color: "#F59E0B" },
  { id: "habits", name: "Personal Habits", emoji: "🧘", color: "#EC4899" },
];

const CAT_COLORS = [
  "#6366F1","#0EA5E9","#22C55E","#F59E0B","#EC4899",
  "#8B5CF6","#14B8A6","#F97316","#EF4444","#06B6D4"
];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; }

async function storageGet(key) {
  try {
    if (window.storage?.get) {
      const r = await window.storage.get(key);
      return r?.value ?? null;
    }
  } catch {}

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key, value) {
  try {
    if (window.storage?.set) {
      await window.storage.set(key, value);
      return;
    }
  } catch {}

  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function StreakIcon({ count }) {
  if (count >= 7) return <span style={{ fontSize: 18 }}>🔥</span>;
  if (count >= 3) return <span style={{ fontSize: 18 }}>⚡</span>;
  return <span style={{ fontSize: 18 }}>🌱</span>;
}

export default function FocusFlow() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [streaks, setStreaks] = useState({});
  const [viewMode, setViewMode] = useState("today");
  const [activeTab, setActiveTab] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", categoryId: "study", isHabit: false });
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("⭐");
  const [loaded, setLoaded] = useState(false);
  const [justChecked, setJustChecked] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const rawTasks = await storageGet(STORAGE_TASKS);
        if (rawTasks) setTasks(JSON.parse(rawTasks));
      } catch {}
      try {
        const rawCats = await storageGet(STORAGE_CATS);
        if (rawCats) setCategories(JSON.parse(rawCats));
      } catch {}
      try {
        const rawStreaks = await storageGet(STORAGE_STREAKS);
        if (rawStreaks) setStreaks(JSON.parse(rawStreaks));
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (loaded) storageSet(STORAGE_TASKS, JSON.stringify(tasks));
  }, [tasks, loaded]);
  useEffect(() => {
    if (loaded) storageSet(STORAGE_CATS, JSON.stringify(categories));
  }, [categories, loaded]);
  useEffect(() => {
    if (loaded) storageSet(STORAGE_STREAKS, JSON.stringify(streaks));
  }, [streaks, loaded]);

  const today = todayStr();
  const yesterday = yesterdayStr();
  const todayTasks = tasks.filter(t => t.date === today);
  const historyTasks = tasks.filter(t => t.date !== today);
  const sourceTasks = viewMode === "today" ? todayTasks : historyTasks;
  const filtered = activeTab === "all" ? sourceTasks : sourceTasks.filter(t => t.categoryId === activeTab);
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  const done = filtered.filter(t => t.completed).length;
  const pct = filtered.length ? Math.round((done / filtered.length) * 100) : 0;

  const toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nowCompleted = !task.completed;

    if (nowCompleted) {
      setJustChecked(id);
      setTimeout(() => setJustChecked(null), 600);
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: nowCompleted } : t));

    if (task.isHabit) {
      setStreaks(prev => {
        const s = prev[id] || { count: 0, lastDate: null };
        let count = s.count;
        let lastDate = s.lastDate;
        if (nowCompleted) {
          if (s.lastDate === yesterday) count = count + 1;
          else if (s.lastDate === today) count = count;
          else count = 1;
          lastDate = today;
        } else {
          count = Math.max(0, count - 1);
          lastDate = count > 0 ? yesterday : null;
        }
        return { ...prev, [id]: { count, lastDate } };
      });
    }
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, {
      id: `t_${Date.now()}`,
      title: newTask.title.trim(),
      categoryId: newTask.categoryId,
      isHabit: newTask.isHabit,
      completed: false,
      date: today,
      createdAt: Date.now(),
    }]);
    setNewTask(p => ({ ...p, title: "", isHabit: false }));
    setShowAdd(false);
  };

  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const addCat = () => {
    if (!newCatName.trim()) return;
    const color = CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)];
    setCategories(prev => [...prev, { id: `cat_${Date.now()}`, name: newCatName.trim(), emoji: newCatEmoji || "📌", color }]);
    setNewCatName(""); setNewCatEmoji("⭐");
  };

  const removeCat = (id) => {
    if (activeTab === id) setActiveTab("all");
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.filter(t => t.categoryId !== id));
  };

  const getCat = (id) => categories.find(c => c.id === id);

  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });
  const habitCards = todayTasks.filter(t => t.isHabit).map(t => ({ ...t, streak: streaks[t.id]?.count || 0 }));

  const greetMsg = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div style={{ fontFamily: "'Outfit', var(--font-sans, sans-serif)", minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .ff-reset { all: unset; cursor: pointer; }
        .ff-task { transition: background 0.12s, opacity 0.3s; }
        .ff-task:hover { background: var(--color-background-secondary) !important; }
        .ff-tab { border: none; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .ff-del-btn { transition: color 0.12s; }
        .ff-del-btn:hover { color: #EF4444 !important; }
        .ff-input {
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md);
          color: var(--color-text-primary);
          font-size: 14px; padding: 10px 14px;
          width: 100%; outline: none; font-family: inherit;
        }
        .ff-input:focus { border-color: var(--color-border-primary); }
        .ff-select {
          background: var(--color-background-secondary);
          border: 0.5px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md);
          color: var(--color-text-primary);
          font-size: 14px; padding: 10px 14px;
          width: 100%; outline: none; cursor: pointer; font-family: inherit;
        }
        .ff-primary-btn {
          width: 100%; padding: 12px; border: none;
          border-radius: var(--border-radius-md);
          background: var(--color-text-primary);
          color: var(--color-background-primary);
          font-size: 14px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.15s;
        }
        .ff-primary-btn:hover { opacity: 0.85; }
        .ff-check-anim { animation: popCheck 0.35s ease; }
        @keyframes popCheck { 0% { transform: scale(1); } 50% { transform: scale(1.35); } 100% { transform: scale(1); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--color-border-tertiary); border-radius: 2px; }
        .ff-streak-card { transition: border-color 0.3s; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
              FocusFlow — {greetMsg()}
            </p>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, lineHeight: 1.3 }}>{dateLabel}</h1>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
              {filtered.length === 0
                ? "Nothing here yet — tap + to start your day"
                : viewMode === "history"
                  ? `${done} of ${filtered.length} task${filtered.length > 1 ? "s" : ""} completed in history`
                  : `${done} of ${filtered.length} task${filtered.length > 1 ? "s" : ""} done`}
            </p>
          </div>
          <button
            className="ff-reset"
            onClick={() => setShowCatMgr(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "var(--color-text-secondary)",
              background: "var(--color-background-secondary)",
              padding: "7px 12px", borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            <Settings size={14} /> Categories
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className="ff-tab"
            onClick={() => setViewMode("today")}
            style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500,
              background: viewMode === "today" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: viewMode === "today" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            Today
          </button>
          <button
            className="ff-tab"
            onClick={() => setViewMode("history")}
            style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500,
              background: viewMode === "history" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: viewMode === "history" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            History {historyTasks.length > 0 && <span style={{ opacity: 0.6 }}>· {historyTasks.length}</span>}
          </button>
        </div>

        {/* Progress Bar */}
        {viewMode === "today" && filtered.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#6366F1", borderRadius: 99, transition: "width 0.5s ease, background 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginTop: 5 }}>
              <span style={{ color: pct === 100 ? "#22C55E" : "var(--color-text-secondary)" }}>
                {pct === 100 ? "All done! 🎉" : `${pct}% complete`}
              </span>
              <span>{filtered.length - done} remaining</span>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            className="ff-tab"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "5px 14px", borderRadius: 99, fontSize: 13, fontWeight: 500,
              background: activeTab === "all" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
              color: activeTab === "all" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            All {sourceTasks.length > 0 && <span style={{ opacity: 0.6 }}>· {sourceTasks.length}</span>}
          </button>
          {categories.map(cat => {
            const count = sourceTasks.filter(t => t.categoryId === cat.id).length;
            const active = activeTab === cat.id;
            return (
              <button key={cat.id} className="ff-tab"
                onClick={() => setActiveTab(cat.id)}
                style={{
                  padding: "5px 14px", borderRadius: 99, fontSize: 13, fontWeight: 500,
                  background: active ? cat.color : "var(--color-background-secondary)",
                  color: active ? "#fff" : "var(--color-text-secondary)",
                  border: `0.5px solid ${active ? cat.color : "var(--color-border-tertiary)"}`,
                }}
              >
                {cat.emoji} {cat.name.split("/")[0].trim()}
                {count > 0 && <span style={{ opacity: active ? 0.75 : 0.5 }}> · {count}</span>}
              </button>
            );
          })}
        </div>

        {/* Task List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 32 }}>
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "48px 20px",
              border: "0.5px dashed var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              color: "var(--color-text-secondary)",
            }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎯</div>
              <p style={{ margin: 0, fontSize: 14 }}>
                {viewMode === "history" ? "No task history in this category yet" : "No tasks in this category yet"}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.6 }}>
                {viewMode === "history" ? "Older tasks will appear here automatically" : "Tap + to add one"}
              </p>
            </div>
          ) : sortedFiltered.map(task => {
            const cat = getCat(task.categoryId);
            const streak = streaks[task.id]?.count || 0;
            const historyDate = new Date(`${task.date}T00:00:00`).toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <div
                key={task.id}
                className="ff-task"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px",
                  background: "var(--color-background-primary)",
                  borderRadius: "var(--border-radius-lg)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  opacity: task.completed ? 0.65 : 1,
                }}
              >
                <button
                  className={`ff-reset ${justChecked === task.id ? "ff-check-anim" : ""}`}
                  onClick={() => toggleTask(task.id)}
                  style={{ flexShrink: 0, display: "flex" }}
                >
                  {task.completed
                    ? <CheckCircle2 size={20} style={{ color: "#22C55E" }} />
                    : <Circle size={20} style={{ color: "var(--color-border-secondary)" }} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 400,
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {task.title}
                  </div>
                  <div style={{ marginTop: 3, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {viewMode === "history" && (
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{historyDate}</span>
                    )}
                    {cat && (
                      <span style={{
                        fontSize: 11, padding: "1px 8px", borderRadius: 99,
                        background: `${cat.color}1A`, color: cat.color, fontWeight: 500,
                      }}>
                        {cat.emoji} {cat.name.split("/")[0].trim()}
                      </span>
                    )}
                    {task.isHabit && streak > 0 && (
                      <span style={{ fontSize: 11, color: "#F59E0B" }}>
                        🔥 {streak}d streak
                      </span>
                    )}
                    {task.isHabit && streak === 0 && (
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>habit</span>
                    )}
                  </div>
                </div>

                <button
                  className="ff-reset ff-del-btn"
                  onClick={() => deleteTask(task.id)}
                  style={{ color: "var(--color-border-secondary)", flexShrink: 0, padding: 4, display: "flex" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Streak Tracker */}
        {habitCards.length > 0 && (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
              Streak Tracker
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 10 }}>
              {habitCards.map(task => (
                <div
                  key={task.id}
                  className="ff-streak-card"
                  style={{
                    background: "var(--color-background-primary)",
                    border: `0.5px solid ${task.completed ? "#F59E0B55" : "var(--color-border-tertiary)"}`,
                    borderRadius: "var(--border-radius-lg)",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ marginBottom: 6 }}><StreakIcon count={task.streak} /></div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {task.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 500, fontFamily: "var(--font-mono, monospace)", color: "#F59E0B", lineHeight: 1 }}>
                      {task.streak}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      day{task.streak !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {task.streak === 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      Complete to start streak
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      {viewMode === "today" && (
        <button
          className="ff-reset"
          onClick={() => setShowAdd(true)}
          style={{
            position: "fixed", bottom: 24, right: 24,
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--color-text-primary)",
            color: "var(--color-background-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
            zIndex: 40, transition: "transform 0.15s",
          }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Add Task Drawer */}
      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: "16px 16px 0 0", padding: "24px 20px 36px", width: "100%", maxWidth: 500, border: "0.5px solid var(--color-border-tertiary)", borderBottom: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>Add task for today</span>
              <button className="ff-reset" onClick={() => setShowAdd(false)} style={{ color: "var(--color-text-secondary)", display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              className="ff-input"
              value={newTask.title}
              onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addTask()}
              placeholder="What do you need to do?"
              style={{ marginBottom: 10 }}
            />

            <select
              className="ff-select"
              value={newTask.categoryId}
              onChange={e => setNewTask(p => ({ ...p, categoryId: e.target.value }))}
              style={{ marginBottom: 14 }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={newTask.isHabit}
                onChange={e => setNewTask(p => ({ ...p, isHabit: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#F59E0B" }}
              />
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                🔥 Track as daily habit (builds streak)
              </span>
            </label>

            <button className="ff-primary-btn" onClick={addTask}>Add task</button>
          </div>
        </div>
      )}

      {/* Category Manager */}
      {showCatMgr && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowCatMgr(false)}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-xl)", padding: "24px", width: "100%", maxWidth: 380, border: "0.5px solid var(--color-border-tertiary)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>Manage categories</span>
              <button className="ff-reset" onClick={() => setShowCatMgr(false)} style={{ color: "var(--color-text-secondary)", display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0, display: "block" }} />
                    <span style={{ fontSize: 14 }}>{cat.emoji} {cat.name}</span>
                  </div>
                  <button
                    className="ff-reset ff-del-btn"
                    onClick={() => removeCat(cat.id)}
                    style={{ color: "var(--color-border-secondary)", padding: 4, display: "flex" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
                New category
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  className="ff-input"
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  placeholder="🌟"
                  style={{ width: 52, textAlign: "center", fontSize: 18, padding: "10px 8px" }}
                />
                <input
                  className="ff-input"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCat()}
                  placeholder="Category name"
                  style={{ flex: 1 }}
                />
              </div>
              <button className="ff-primary-btn" onClick={addCat}>Add category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
