import { useEffect, useMemo, useState } from "react";
import { Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "reactflow";
import "reactflow/dist/style.css";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type TaskStatus = "pending" | "in_progress" | "completed";

type AgentTask = {
  id: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  tasks?: AgentTask[];
};

type AgentMemory = {
  tasks: AgentTask[];
};

type TaskNodeData = {
  id: string;
  description: string;
  status: TaskStatus;
};

const FALLBACK_MEMORY: AgentMemory = {
  tasks: [
    {
      id: "task-1",
      description: "Initialize topology viewer",
      status: "completed",
      dependencies: [],
      tasks: [
        {
          id: "task-1.1",
          description: "Scaffold Tauri + React frontend",
          status: "completed",
          dependencies: ["task-1"],
        },
      ],
    },
    {
      id: "task-2",
      description: "Render and update task DAG",
      status: "in_progress",
      dependencies: ["task-1.1"],
    },
  ],
};

const DEFAULT_RULES = [
  "Please use the latest syntax for the current version of each programming language.",
  "Iterate on the existing code architecture. Do not create new files unless absolutely necessary.",
  "Operate with maximum efficiency and avoid any redundant or bloated code.",
];

const PROMPT_MODIFIERS = [
  "Strictly minimize token usage",
  "Explain rationale before code edits",
  "Prioritize safe and reversible changes",
  "Focus only on files relevant to the request",
];

const MENU_ITEMS = [
  { label: "Task Flow", to: "/" },
  { label: "Rules", to: "/rules" },
  { label: "MODs", to: "/mods" },
  { label: "Settings", to: "/settings" },
];

function flattenTasks(tasks: AgentTask[], depth = 0): Array<AgentTask & { depth: number }> {
  return tasks.flatMap((task) => [
    { ...task, depth },
    ...flattenTasks(task.tasks ?? [], depth + 1),
  ]);
}

function buildFlow(memory: AgentMemory): { nodes: Node<TaskNodeData>[]; edges: Edge[] } {
  const flattened = flattenTasks(memory.tasks);
  const nodes = flattened.map((task, index) => ({
    id: task.id,
    type: "taskNode",
    data: {
      id: task.id,
      description: task.description,
      status: task.status,
    },
    position: {
      x: 80 + task.depth * 320,
      y: 80 + index * 140,
    },
  }));

  const edges = flattened.flatMap((task) =>
    task.dependencies.map((dependency) => ({
      id: `${dependency}-${task.id}`,
      source: dependency,
      target: task.id,
      animated: task.status !== "completed",
    })),
  );

  return { nodes, edges };
}

function TaskNode({ data }: NodeProps<TaskNodeData>) {
  const statusClass =
    data.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : data.status === "in_progress"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-700";

  return (
    <div className="min-w-64 rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-semibold text-slate-500">{data.id}</p>
      <p className="mt-1 text-sm text-slate-900">{data.description}</p>
      <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${statusClass}`}>
        {data.status}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { taskNode: TaskNode };

function TaskFlowView({ memory }: { memory: AgentMemory }) {
  const { nodes, edges } = useMemo(() => buildFlow(memory), [memory]);

  return (
    <div className="h-full w-full rounded-lg border border-slate-200 bg-slate-50">
      <ReactFlow nodes={nodes} edges={edges} fitView nodeTypes={NODE_TYPES} />
    </div>
  );
}

function RulesView() {
  const [rules, setRules] = useState(DEFAULT_RULES.join("\n"));

  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">AI Base Instructions / Global Memory</h2>
      <textarea
        className="mt-4 h-[70vh] w-full rounded-md border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
        value={rules}
        onChange={(event) => setRules(event.target.value)}
      />
    </div>
  );
}

function ModsView() {
  const [selectedMods, setSelectedMods] = useState<Record<string, boolean>>({});

  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Prompt Modifiers</h2>
      <div className="mt-4 space-y-3">
        {PROMPT_MODIFIERS.map((modifier) => (
          <label key={modifier} className="flex cursor-pointer items-center gap-3 rounded border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={Boolean(selectedMods[modifier])}
              onChange={(event) =>
                setSelectedMods((current) => ({
                  ...current,
                  [modifier]: event.target.checked,
                }))
              }
            />
            <span className="text-sm text-slate-800">{modifier}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SettingsView() {
  const [language, setLanguage] = useState("TypeScript");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <div className="relative h-full rounded-lg border border-slate-200 bg-white p-6 pb-20">
      <h2 className="text-lg font-semibold text-slate-900">Settings</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Language</label>
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option>TypeScript</option>
            <option>Rust</option>
            <option>Python</option>
            <option>Go</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Theme</span>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? "Switch to Dark" : "Switch to Light"}
          </button>
        </div>
      </div>

      <footer className="absolute bottom-4 left-6 text-xs text-slate-500">
        Developer Information · AI Agent Topology Viewer · Tauri 2.0
      </footer>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-slate-900 p-4 text-slate-100">
      <h1 className="mb-6 text-lg font-bold">Control Center</h1>
      <nav className="space-y-2">
        {MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`block rounded px-3 py-2 text-sm ${
                isActive ? "bg-indigo-600 text-white" : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function App() {
  const [memory, setMemory] = useState<AgentMemory>(FALLBACK_MEMORY);

  useEffect(() => {
    invoke<AgentMemory>("load_agent_memory")
      .then((payload) => {
        if (payload?.tasks?.length) {
          setMemory(payload);
        }
      })
      .catch((error) => {
        console.error("Failed to load agent_memory.json", error);
        setMemory(FALLBACK_MEMORY);
      });

    let unlisten: (() => void) | undefined;

    listen<AgentMemory>("agent_memory_updated", (event) => {
      if (event.payload?.tasks?.length) {
        setMemory(event.payload);
      }
    })
      .then((listener) => {
        unlisten = listener;
      })
      .catch(() => undefined);

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <div className="h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <main className="ml-64 h-screen p-6">
        <Routes>
          <Route path="/" element={<TaskFlowView memory={memory} />} />
          <Route path="/rules" element={<RulesView />} />
          <Route path="/mods" element={<ModsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
