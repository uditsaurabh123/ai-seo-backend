const { useEffect, useMemo, useState } = React;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const departmentIcons = {
  Finance: "🏦",
  Operations: "⚙️",
  HR: "👥",
  Sales: "📈",
};

const departmentColors = {
  Finance: "#1f6fff",
  Operations: "#16a34a",
  HR: "#7c3aed",
  Sales: "#0ea5e9",
};

const navItems = ["Overview", "Board", "Tasks", "Reviews", "Reports", "People", "Documents", "Settings"];
const roleOptions = ["admin", "manager", "reviewer", "employee", "executive"];
const rolePersonDefaults = { reviewer: "rev-201", employee: "emp-101" };
const taskStatuses = ["Open", "In Review", "Pending Review", "Blocked", "Completed"];

function App() {
  const [board, setBoard] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [role, setRole] = useState("admin");
  const [view, setView] = useState("board");
  const [filters, setFilters] = useState({ department: "All", status: "All", risk: "All", search: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoard(role);
  }, [role]);

  async function loadBoard(activeRole = role) {
    setLoading(true);
    const personId = rolePersonDefaults[activeRole];
    const query = new URLSearchParams({ role: activeRole });
    if (personId) query.set("personId", personId);
    const response = await fetch(`/api/workyodha/board?${query.toString()}`);
    const payload = await response.json();
    setBoard(payload.board);
    setSelectedTaskId((current) => current || payload.board.tasks[0]?.id);
    setLoading(false);
  }

  async function updateTask(taskId, patch) {
    const response = await fetch(`/api/workyodha/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, role, personId: rolePersonDefaults[role] }),
    });
    const payload = await response.json();
    setBoard(payload.board);
    setSelectedTaskId(taskId);
  }

  const filteredTasks = useMemo(() => {
    if (!board) return [];
    const term = filters.search.trim().toLowerCase();
    return board.tasks.filter((task) => {
      const matchesDepartment = filters.department === "All" || task.department === filters.department;
      const matchesStatus = filters.status === "All" || task.status === filters.status;
      const matchesRisk = filters.risk === "All" || task.riskLevel === filters.risk;
      const matchesSearch =
        !term ||
        [task.title, task.assignee.name, task.reviewer.name, task.department]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesDepartment && matchesStatus && matchesRisk && matchesSearch;
    });
  }, [board, filters]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) || filteredTasks[0];

  if (loading || !board) {
    return <div className="hero"><h1><span>WorkYodha</span> loading command board…</h1></div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Header />
        <Metrics totals={board.totals} />
        <div className="workspace">
          <Filters board={board} filters={filters} setFilters={setFilters} />
          <section className="board-canvas">
            <BoardToolbar role={role} setRole={setRole} view={view} setView={setView} />
            {view === "board" ? (
              <ConnectedBoard
                tasks={filteredTasks}
                departments={board.departments}
                selectedTaskId={selectedTask?.id}
                setSelectedTaskId={setSelectedTaskId}
                role={role}
              />
            ) : (
              <TaskList tasks={filteredTasks} setSelectedTaskId={setSelectedTaskId} />
            )}
          </section>
          <DetailPanel task={selectedTask} updateTask={updateTask} />
        </div>
        <WhyItMatters />
      </main>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">⚔️</div>WorkYodha</div>
      <nav className="nav-list">
        {navItems.map((item) => (
          <button className={`nav-item ${item === "Board" ? "active" : ""}`} key={item}>
            <span>{item === "Board" ? "▦" : "◌"}</span>{item}
          </button>
        ))}
      </nav>
      <div className="profile-card"><div className="avatar">RS</div><div><strong>Rohit Sharma</strong><br /><small>Admin</small></div></div>
      <div className="help-card">🎧 Need help?<br />Chat with support</div>
    </aside>
  );
}

function Header() {
  return (
    <header className="hero">
      <h1><span>WorkYodha</span> Interactive Organizational Task Board</h1>
      <p>A live operational map that connects every active task to its owner, reviewer, evidence, deadline, hours, and labor overhead cost.</p>
    </header>
  );
}

function Metrics({ totals }) {
  const cards = [
    ["📋", "Open Tasks", totals.openTasks, "+ live", "#1f6fff"],
    ["✅", "Pending Reviews", totals.pendingReviews, `${totals.missingEvidence} proof items`, "#7c3aed"],
    ["🕒", "Total Hours", totals.totalHours.toFixed(1), "estimated work", "#14b8a6"],
    ["₹", "Labor Overhead Cost", currency.format(totals.totalCost), "across org", "#f59e0b"],
    ["⚠️", "Deadline Risk", totals.deadlineRisks, "delayed/high risk", "#ef4444"],
  ];

  return (
    <section className="metrics">
      {cards.map(([icon, label, value, note, color]) => (
        <article className="metric-card" key={label}>
          <div className="metric-icon" style={{ background: color }}>{icon}</div>
          <div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">▲ {note}</div></div>
        </article>
      ))}
    </section>
  );
}

function Filters({ board, filters, setFilters }) {
  const departments = ["All", ...new Set(board.departments.map((department) => department.name))];
  const risks = ["All", "High Risk", "Medium Risk", "Low Risk"];
  return (
    <aside className="filter-panel">
      <div className="panel-title"><h2>Filters</h2><button className="link-button" onClick={() => setFilters({ department: "All", status: "All", risk: "All", search: "" })}>Reset</button></div>
      <FilterSelect label="Department" value={filters.department} values={departments} onChange={(department) => setFilters({ ...filters, department })} />
      <FilterSelect label="Status" value={filters.status} values={["All", ...taskStatuses]} onChange={(status) => setFilters({ ...filters, status })} />
      <FilterSelect label="Risk" value={filters.risk} values={risks} onChange={(risk) => setFilters({ ...filters, risk })} />
      <div className="filter-group"><label>Search assignee, reviewer, or task</label><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search command board" /></div>
      <button className="secondary-button">＋ Add Filter</button>
    </aside>
  );
}

function FilterSelect({ label, value, values, onChange }) {
  return (
    <div className="filter-group"><label>{label}</label><select value={value} onChange={(event) => onChange(event.target.value)}>{values.map((item) => <option key={item}>{item}</option>)}</select></div>
  );
}

function BoardToolbar({ role, setRole, view, setView }) {
  return (
    <div className="board-toolbar">
      <div className="role-tabs">
        {roleOptions.map((option) => <button key={option} className={`pill ${role === option ? "active" : ""}`} onClick={() => setRole(option)}>{option.toUpperCase()}</button>)}
      </div>
      <div className="view-tabs">
        <button className={`pill ${view === "board" ? "active" : ""}`} onClick={() => setView("board")}>▦ Board View</button>
        <button className={`pill ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>☰ List View</button>
        <button className="pill">⛶ 100%</button>
      </div>
    </div>
  );
}

function ConnectedBoard({ tasks, departments, selectedTaskId, setSelectedTaskId, role }) {
  const visibleDepartments = role === "executive" ? departments.filter((department) => department.tasks > 0) : departments;
  return (
    <div className="department-grid">
      {visibleDepartments.map((department) => {
        const departmentTasks = tasks.filter((task) => task.department === department.name);
        if (!departmentTasks.length) return null;
        return (
          <div className="department-column" key={department.name}>
            <div className="connection-line" />
            <button className="department-node" onClick={() => setSelectedTaskId(departmentTasks[0].id)}>
              <div className="node-icon" style={{ background: departmentColors[department.name] }}>{departmentIcons[department.name]}</div>
              <div><strong>{department.name}</strong><br /><small>{departmentTasks.length} tasks • {currency.format(departmentTasks.reduce((sum, task) => sum + task.laborCost, 0))}</small></div>
              <span>⌄</span>
            </button>
            <PersonNode person={departmentTasks[0].assignee} type="Assignee" onClick={() => setSelectedTaskId(departmentTasks[0].id)} />
            {departmentTasks.map((task) => <TaskCard key={task.id} task={task} selected={selectedTaskId === task.id} onClick={() => setSelectedTaskId(task.id)} />)}
            <PersonNode person={departmentTasks[0].reviewer} type="Reviewer" reviewer onClick={() => setSelectedTaskId(departmentTasks[0].id)} />
          </div>
        );
      })}
    </div>
  );
}

function PersonNode({ person, type, reviewer, onClick }) {
  return (
    <button className={reviewer ? "reviewer-node" : "person-node"} onClick={onClick}>
      <div className="avatar">{person.avatar}</div>
      <div className="person-meta"><strong>{person.name}</strong><span>{type} • {person.role}</span></div>
    </button>
  );
}

function TaskCard({ task, selected, onClick }) {
  return (
    <button className={`task-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="task-card-header"><h3>{task.title}</h3><span className={`badge ${badgeClass(task.riskLevel)}`}>{task.riskLevel}</span></div>
      <div className="badge-list"><span className={`badge ${badgeClass(task.status)}`}>{task.status}</span><span className="badge">{task.priority}</span></div>
      <TaskRow label="Assignee" value={task.assignee.name} />
      <TaskRow label="Reviewer" value={task.reviewer.name} />
      <TaskRow label="Due Date" value={`${formatDate(task.deadline)} • ${task.overdue ? "Overdue" : `${Math.max(task.hoursRemaining, 0)}h left`}`} />
      <TaskRow label="Est. Hours" value={`${task.estimatedHours} hrs`} />
      <TaskRow label="Labor Cost" value={currency.format(task.laborCost)} />
      <div className="evidence-chips">{task.evidence.map((item) => <span className="evidence-chip" key={item.id}>{item.type}</span>)}</div>
    </button>
  );
}

function TaskRow({ label, value }) {
  return <div className="task-row"><span>{label}</span><strong>{value}</strong></div>;
}

function TaskList({ tasks, setSelectedTaskId }) {
  return (
    <div className="list-view">
      {tasks.map((task) => (
        <button className="list-row" key={task.id} onClick={() => setSelectedTaskId(task.id)}>
          <strong>{task.title}<br /><small>{task.department}</small></strong>
          <span>{task.assignee.name}<br /><small>{task.assignee.role}</small></span>
          <span>{task.reviewer.name}<br /><small>{task.reviewer.approvalStatus}</small></span>
          <span>{formatDate(task.deadline)}</span>
          <span className="money">{currency.format(task.laborCost)}</span>
        </button>
      ))}
    </div>
  );
}

function DetailPanel({ task, updateTask }) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(task?.notes || "");
  }, [task?.id]);

  if (!task) {
    return <aside className="detail-panel"><div className="panel-title"><h3>Selected Task Details</h3></div><p>No task selected.</p></aside>;
  }

  function updateEvidence(evidenceId, status) {
    updateTask(task.id, { evidence: [{ id: evidenceId, status }] });
  }

  return (
    <aside className="detail-panel">
      <div className="panel-title"><h3>Selected Task Details</h3><button className="close-button">×</button></div>
      <div className="task-card-header"><h2>{task.title}</h2><span className={`badge ${badgeClass(task.status)}`}>{task.status}</span></div>
      <div className="detail-section">
        <h4>Assignee</h4>
        <PersonSummary person={task.assignee} extra={`${task.assignee.workload}% workload • ${task.estimatedHours}h • ${currency.format(task.assignee.hourlyCost)}/h`} />
      </div>
      <div className="detail-section">
        <h4>Reviewer</h4>
        <PersonSummary person={task.reviewer} extra={`${task.reviewer.approvalStatus} • ${task.reviewer.pendingReviews} pending reviews`} />
        <p>{task.reviewer.responsibility}</p>
      </div>
      <div className="detail-section">
        <h4>Evidence Requirements</h4>
        {task.evidence.map((item) => (
          <div className="evidence-row" key={item.id}>
            <div><strong>{item.type}</strong><br /><small>{item.format} • {item.status}</small></div>
            <div className="evidence-actions">
              <button className="icon-button" title="View or upload">↗</button>
              <button className="icon-button" title="Approve" onClick={() => updateEvidence(item.id, "Approved")}>✓</button>
              <button className="icon-button" title="Reject" onClick={() => updateEvidence(item.id, "Rejected")}>!</button>
            </div>
          </div>
        ))}
      </div>
      <div className="detail-section">
        <TaskRow label="Deadline" value={`${formatDate(task.deadline)} • ${task.overdue ? "Overdue" : `${Math.max(task.hoursRemaining, 0)}h left`}`} />
        <TaskRow label="Estimated" value={`${task.estimatedHours} hours`} />
        <TaskRow label="Labor Cost" value={currency.format(task.laborCost)} />
        <TaskRow label="Risk" value={task.riskLevel} />
        <label>Status</label>
        <select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value })}>{taskStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      </div>
      <div className="detail-section">
        <h4>Notes</h4>
        <textarea rows="5" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <button className="primary-button" onClick={() => updateTask(task.id, { notes })}>Update Task</button>
      </div>
    </aside>
  );
}

function PersonSummary({ person, extra }) {
  return <div className="person-node"><div className="avatar">{person.avatar}</div><div className="person-meta"><strong>{person.name}</strong><span>{person.role} • {person.department}<br />{extra}</span></div></div>;
}

function WhyItMatters() {
  const cards = [
    ["🎯", "Why this matters", "Execution becomes visible, connected, and measurable."],
    ["👁️", "See every owner instantly", "One unified board to view work across departments, teams, and owners."],
    ["🛡️", "Track proof and reviews", "Know who reviews what and the exact evidence needed for every task."],
    ["📊", "Understand cost and risk", "Make faster decisions with real-time visibility into effort, cost, and delays."],
  ];
  return <section className="why-grid">{cards.map(([icon, title, text]) => <article className="why-card" key={title}><div className="why-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>;
}

function badgeClass(value) {
  return String(value).toLowerCase().replace(/\s+/g, "-").replace("high-risk", "high").replace("medium-risk", "medium").replace("low-risk", "low").replace("pending-review", "review").replace("in-review", "review").replace("requested-changes", "requested");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
