import { useEffect, useState, useCallback } from "react";
import {
  Handle, Position, ReactFlow, Background, BackgroundVariant,
  type Edge, type Node, type NodeProps, useNodesState, useEdgesState,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskStatus = "pending" | "in_progress" | "completed";
type Lang = "zh" | "en";
type ThemeId = "dark" | "tokyo" | "light" | "ㄚ" | "beige";

type AgentTask = {
  id: string; description: string; status: TaskStatus;
  dependencies: string[]; ai_feedback?: string | null; tasks?: AgentTask[];
};
type AgentMemory = { tasks: AgentTask[] };
type Workspace = { id: string; name: string; lang: string; path: string };
type TaskNodeData = {
  id: string; description: string; status: TaskStatus;
  dependencies: string[]; ai_feedback?: string | null;
  sl: { pending: string; inProgress: string; completed: string };
  onStatusChange: (id: string, s: TaskStatus) => void;
};

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  zh: {
    appTitle: "控制中心",
    taskFlow: "任務流程", rules: "規則", mods: "模組", settings: "設定",
    taskDetails: "任務詳情", taskId: "任務 ID", desc: "描述",
    deps: "依賴項目", noDeps: "無 — 根任務", aiFeedback: "AI 回饋",
    pending: "待處理", inProgress: "執行中", completed: "已完成",
    feedbackBadge: "💬 含 AI 回饋",
    aiRules: "AI 指令規則",
    addRule: "+ 新增指令", addRuleTitle: "新增 AI 指令",
    addRulePlaceholder: "輸入 AI 指令內容...",
    deleteRuleTitle: "刪除指令",
    deleteRuleConfirm: "確定要刪除這條指令嗎？",
    confirm: "確認", cancel: "取消",
    agentsMdToggle: "啟用 AGENTS.md 技能路由",
    agentsMdDesc: "啟用後，AI 將依照 AGENTS.md 規則自動選用對應技能提示詞。",
    skillsTitle: "技能提示詞", skillsDesc: "勾選後，所選技能將附加到 AI 指令中。",
    catBackend: "後端 & 架構", catMobile: "行動 & UI/UX",
    catTesting: "測試 & 文件", catQuality: "程式品質",
    settingsTitle: "設定", langLabel: "介面語言", themeLabel: "介面主題",
    themes: { light: "白色", tokyo: "Tokyo 電子風", dark: "黑色", forest: "森林綠", beige: "米棕色" },
    workspaces: "工作區", addWorkspace: "+ 新增工作區",
    removeWs: "移除", wsName: "工作區名稱", wsLang: "程式語言",
    wsPath: "JSON 路徑", wsPathPlaceholder: "D:\\Projects\\your-ai-project\\workspace",
    aiHowTitle: "AI 如何區分工作區？",
    aiHowBody: "每個工作區對應一個獨立的 agent_memory.json 路徑。讓 AI 代理（Codex、Antigravity 等）讀寫對應工作區的 JSON 路徑，即可讓多個 AI 各自操作獨立的任務圖，互不干擾。",
    activeWs: "當前工作區",
    howItWorks: "運作原理",
    howSteps: [
      { title: "共用 JSON 任務檔案", body: "Codex、Antigravity 等 AI 代理與本應用程式共享同一個 agent_memory.json。AI 寫入任務與回饋，使用者從 UI 更新狀態，兩者即時同步。" },
      { title: "檔案即時監聽", body: "Tauri 後端使用 notify crate 監聽 workspace 目錄。任何外部程式（包括 AI）修改 JSON 後，圖表會在毫秒內自動重新渲染。" },
      { title: "多 AI 並行協作", body: "Codex 可處理程式碼生成，Antigravity 可處理規劃與回顧。兩者均透過讀寫 agent_memory.json 的 status 與 ai_feedback 欄位來交換上下文，不需要直接通訊。" },
      { title: "人工監控", body: "使用者在 Task Flow 視圖中即時觀察 AI 進度，點擊節點改變狀態即可指揮 AI 進行下一步，無需手動編輯 JSON。" },
    ],
    aiGuideTitle: "與 AI 代理 (Codex/Antigravity) 協作指南",
    aiGuideSteps: [
      { title: "1. \u914d\u7f6e\u7368\u7acb Workspace", body: "\u5728\u4e0a\u65b9\u300e\u5de5\u4f5c\u5340\u300f\u5340\u584a\u52a0\u5165\u65b0\u5c08\u6848\uff0c\u586b\u5beb\u5c08\u5c6c\u7684 JSON \u8def\u5f91\uff08\u4f8b\u5982 D:\\\\ProjectA\\\\workspace\uff09\u3002\u8f38\u5165\u5b8c\u7562\u5f8c\u8a18\u5f97\u9ede\u64ca\u300c\u78ba\u8a8d\u300d\u6309\u9215\u4f86\u5957\u7528\u65b0\u8def\u5f91\u3002" },
      { title: "\ud83e\udde0 Antigravity\uff08\u898f\u5283\u5e2b\uff09\u6307\u5357", body: "Antigravity \u8ca0\u8cac\u7406\u89e3\u9700\u6c42\u3001\u62c6\u89e3\u4efb\u52d9\uff0c\u4e26\u5beb\u5165 JSON\u3002\u8acb\u5c0d Antigravity \u4e0b\u9054\u985e\u4f3c\u4ee5\u4e0b\u6307\u4ee4\uff1a\n\n\u300e\u4f60\u662f\u4e00\u4f4d AI \u958b\u767c\u898f\u5283\u5e2b\u3002\u8acb\u5e6b\u6211\u898f\u5283\u4e00\u500b\u767b\u5165\u7cfb\u7d71\uff0c\u4e26\u5c07\u898f\u5283\u7d50\u679c\u66f4\u65b0\u5230 D:\\\\Projects\\\\my-project\\\\workspace\\\\agent_memory.json\u3002\n\n\u26a0\ufe0f \u56b4\u683c\u683c\u5f0f\u8981\u6c42 \u2014 \u6bcf\u500b\u4efb\u52d9\u7bc0\u9ede\u5fc5\u9808\u4e14\u53ea\u80fd\u5305\u542b\u4ee5\u4e0b\u6b04\u4f4d\uff1a\n{  \"id\": \"task-001\",\n   \"description\": \"\u4efb\u52d9\u63cf\u8ff0\u6587\u5b57\",\n   \"status\": \"pending\",\n   \"dependencies\": [],\n   \"ai_feedback\": \"\" }\n\n\u2022 id \u2014 \u552f\u4e00\u8b58\u5225\u78bc\uff08\u5982 task-001, task-002\uff09\n\u2022 description \u2014 \u4efb\u52d9\u8aaa\u660e\uff08\u5fc5\u586b\uff0c\u5716\u8868\u7bc0\u9ede\u986f\u793a\u6b64\u6b04\u4f4d\uff09\n\u2022 status \u2014 \u53ea\u80fd\u662f pending / in_progress / completed\n\u2022 dependencies \u2014 \u524d\u7f6e\u4efb\u52d9 id \u9663\u5217\uff08\u7b2c\u4e00\u500b\u4efb\u52d9\u8a2d []\uff09\n\u2022 ai_feedback \u2014 \u5b8c\u6210\u5f8c\u7684\u53cd\u7701\u6216\u5099\u8a3b\n\n\u274c \u7981\u6b62\u65b0\u589e title\u3001design\u3001findings \u7b49\u81ea\u8a02\u6b04\u4f4d\uff0c\u5426\u5247 UI \u7121\u6cd5\u6b63\u78ba\u6e32\u67d3\u3002\u300f" },
      { title: "\u2699\ufe0f Codex\uff08\u57f7\u884c\u8005\uff09\u6307\u5357", body: "Codex \u8ca0\u8cac\u64b0\u5beb\u5be6\u969b\u7a0b\u5f0f\u78bc\u3002\u8acb\u5c0d Codex \u4e0b\u9054\u985e\u4f3c\u4ee5\u4e0b\u6307\u4ee4\uff1a\n\n\u300e\u8acb\u8b80\u53d6 D:\\\\Projects\\\\my-project\\\\workspace\\\\agent_memory.json\uff0c\u5c0b\u627e status \u70ba in_progress \u7684\u4efb\u52d9\u3002\u57f7\u884c\u8a72\u4efb\u52d9\u5f8c\uff0c\u5982\u679c\u5b8c\u6210\uff0c\u8acb\u5c07 JSON \u4e2d\u7684\u72c0\u614b\u6539\u70ba completed\uff0c\u4e26\u5728 ai_feedback \u7559\u4e0b\u4f60\u4fee\u6539\u4e86\u54ea\u4e9b\u6a94\u6848\u6216\u906d\u9047\u7684\u554f\u984c\u3002\u300f" },
      { title: "\ud83e\uddd1\u200d\ud83d\udcbb \u4eba\u985e\uff08\u4f60\uff09\u7684\u65e5\u5e38\u5de5\u4f5c\u5faa\u74b0", body: "\u2460 \u898f\u5283\u968e\u6bb5\uff1a\u4f60\u8981\u6c42 Antigravity \u898f\u5283\u4efb\u52d9\u3002\u5b83\u5c07\u4efb\u52d9\u5beb\u5165 JSON\uff08\u72c0\u614b\u70ba pending \ud83d\udfe1\uff09\u3002\n\u2461 \u76e3\u63a7\u8207\u6279\u51c6\uff1a\u4f60\u5728 Topology Viewer \u4e2d\u770b\u5230\u65b0\u9577\u51fa\u7684\u5716\u8868\u7bc0\u9ede\u3002\u9ede\u64ca\u4f60\u60f3\u958b\u59cb\u7684\u4efb\u52d9\uff0c\u624b\u52d5\u5c07\u72c0\u614b\u5207\u63db\u70ba in_progress \ud83d\udd35\u3002\u9019\u4ee3\u8868\u4e86\u4f60\u7684\u6279\u51c6\u57f7\u884c\u3002\n\u2462 \u57f7\u884c\u968e\u6bb5\uff1a\u4f60\u547d\u4ee4 Codex \u53bb\u8655\u7406 in_progress \u7684\u4efb\u52d9\u3002\n\u2463 \u56de\u9867\u968e\u6bb5\uff1aCodex \u5b8c\u6210\u5f8c\uff0c\u7bc0\u9ede\u5728 UI \u8b8a\u6210 completed \ud83d\udfe2\u3002\u9ede\u64ca\u7bc0\u9ede\uff0c\u53f3\u5074\u6ed1\u51fa\u9762\u677f\u53ef\u95b1\u8b80 ai_feedback\uff0c\u78ba\u8a8d AI \u7684\u60f3\u6cd5\uff0c\u4e26\u6839\u64da\u7d50\u679c\u9032\u884c\u4e0b\u4e00\u6ce2\u898f\u5283\u3002" },
      { title: "\ud83d\udca1 \u78ba\u4fdd AI \u5403\u5230\u8a2d\u5b9a (AGENTS.md)", body: "\u5728\u958b\u555f\u5c0d\u8a71\u7684\u7576\u4e0b\uff0c\u4f60\u5fc5\u9808\u7d66 AI \u521d\u59cb\u6307\u4ee4\uff1a\u300e\u8acb\u8a73\u95b1\u5de5\u4f5c\u76ee\u9304\u4e0b\u7684 AGENTS.md \u4e26\u9075\u5b88\u898f\u7bc4\u300f\uff0cAI \u624d\u6703\u555f\u52d5\u4e26\u5403\u5230\u6240\u6709\u7684\u898f\u5247\u3002" },
    ],
    opManual: "操作說明",
    opSteps: [
      { title: "載入任務", body: "Tauri 啟動時自動讀取 workspace/agent_memory.json。設定 AGENT_WORKSPACE_DIR 可指向自訂目錄。" },
      { title: "任務節點互動", body: "點選節點 → 右側詳情面板滑出。透過下拉選單改變狀態 → 即時寫回 JSON。" },
      { title: "多工作區支援", body: "在設定中新增多個工作區，每個工作區有獨立的任務圖。" },
      { title: "技能提示詞", body: "在模組頁勾選需要的技能，AI 閱讀 AGENTS.md 後會按照對應場景載入提示詞。" },
    ],
    aiTipsTitle: "AI 對話技巧", aiTipsDesc: "提煉自實際工作流，點擊展開。",
    tips: [
      { title: "📥 先餵資料，再說「stop」", body: "在要求 AI 執行任務之前，先分批提供所有背景資料，明確告知待命，讓 AI 充分吸收整體脈絡。" },
      { title: "📌 版本鎖定規則", body: "在 AGENTS.md 中明確列出每種語言的最新穩定版本，強制 AI 使用最新語法。" },
      { title: "🧠 注入 .agent 技能庫", body: "將領域知識技能目錄提前塞入 .agent/skills/，讓 AI 在開發前讀取對應技能。" },
      { title: "🔄 結構化 JSON 溝通", body: "善用 agent_memory.json 的節點結構讓 AI 明確記錄每步，透過本工具視覺化整體進度。" },
      { title: "🎯 小批次迭代原則", body: "每次只讓 AI 處理一個明確子任務，完成後驗收再進行下一步。" },
    ],
  },
  en: {
    appTitle: "Control Center",
    taskFlow: "Task Flow", rules: "Rules", mods: "MODs", settings: "Settings",
    taskDetails: "Task Details", taskId: "Task ID", desc: "Description",
    deps: "Dependencies", noDeps: "None — root task", aiFeedback: "AI Feedback",
    pending: "Pending", inProgress: "In Progress", completed: "Completed",
    feedbackBadge: "💬 AI Feedback attached",
    aiRules: "AI Instruction Rules",
    addRule: "+ Add Rule", addRuleTitle: "Add AI Instruction",
    addRulePlaceholder: "Enter AI instruction...",
    deleteRuleTitle: "Delete Instruction",
    deleteRuleConfirm: "Are you sure you want to delete this instruction?",
    confirm: "Confirm", cancel: "Cancel",
    agentsMdToggle: "Enable AGENTS.md Skill Routing",
    agentsMdDesc: "When enabled, the AI will automatically select skill prompts based on AGENTS.md routing rules.",
    skillsTitle: "Active Skill Prompts", skillsDesc: "Checked skills will be appended to AI instructions automatically.",
    catBackend: "Backend & Architecture", catMobile: "Mobile & UI/UX",
    catTesting: "Testing & Docs", catQuality: "Code Quality",
    settingsTitle: "Settings", langLabel: "UI Language", themeLabel: "UI Theme",
    themes: { light: "White", tokyo: "Tokyo Electronic", dark: "Black", forest: "Forest Green", beige: "Beige" },
    workspaces: "Workspaces", addWorkspace: "+ Add Workspace",
    removeWs: "Remove", wsName: "Workspace Name", wsLang: "Language",
    wsPath: "JSON Path", wsPathPlaceholder: "D:\\Projects\\your-ai-project\\workspace",
    aiHowTitle: "How does AI distinguish workspaces?",
    aiHowBody: "Each workspace maps to a unique agent_memory.json file path. Configure your AI agents (Codex, Antigravity, etc.) to read from and write to each workspace's designated JSON path. This lets multiple AIs operate on completely independent task graphs without interfering with each other.",
    activeWs: "Active Workspace",
    howItWorks: "How It Works",
    howSteps: [
      { title: "Shared JSON Task File", body: "Codex, Antigravity, and this app share the same agent_memory.json. AIs write tasks and feedback; users update status from the UI — everything syncs in real time." },
      { title: "Live File Watching", body: "The Tauri backend uses the notify crate to watch the workspace directory. Any external program modifying the JSON causes the graph to re-render within milliseconds." },
      { title: "Multi-AI Parallel Collaboration", body: "Codex handles code generation, Antigravity handles planning and review. Both exchange context through status and ai_feedback fields without direct communication." },
      { title: "Human Oversight", body: "Users observe AI progress in real time. Clicking a node to change its status directly directs the AI to the next step — no manual JSON editing required." },
    ],
    aiGuideTitle: "Collaboration Guide: Codex / Antigravity",
    aiGuideSteps: [
      { title: "1. Configure Workspace", body: "Add a new workspace and specify an absolute JSON path (e.g., D:\\Proj\\workspace) so your AI agents don't step on each other. Remember to click 'Confirm' after entering the path to apply the change." },
      { title: "\ud83e\udde0 Antigravity (Planner) Guide", body: "Antigravity understands requirements, decomposes tasks, and writes them to JSON. Give it a prompt like:\n\n'You are an AI development planner. Plan a login system and update D:\\\\Projects\\\\my-project\\\\workspace\\\\agent_memory.json.\n\n\u26a0\ufe0f Strict format required \u2014 each task node must contain ONLY these fields:\n{  \"id\": \"task-001\",\n   \"description\": \"Task description text\",\n   \"status\": \"pending\",\n   \"dependencies\": [],\n   \"ai_feedback\": \"\" }\n\n\u2022 id \u2014 unique identifier (e.g. task-001, task-002)\n\u2022 description \u2014 task description (required, displayed on graph nodes)\n\u2022 status \u2014 must be pending / in_progress / completed\n\u2022 dependencies \u2014 array of prerequisite task ids (first task uses [])\n\u2022 ai_feedback \u2014 reflection or notes after completion\n\n\u274c Do NOT add custom fields like title, design, findings, etc. The UI cannot render them.'" },
      { title: "⚙️ Codex (Executor) Guide", body: "Codex writes actual code. Give it a prompt like:\n\n'Read D:\\Projects\\my-project\\workspace\\agent_memory.json and find tasks with status in_progress. Execute the task, then change the JSON status to completed and leave a note in ai_feedback describing which files you modified or issues encountered.'" },
      { title: "🧑\u200d💻 Human (You) Daily Workflow", body: "① Planning: Ask Antigravity to plan tasks. It writes them to JSON (status: pending 🟡).\n② Monitor & Approve: New nodes appear in Topology Viewer. Click a task you want to start and switch it to in_progress 🔵 — this is your approval.\n③ Execution: Command Codex to handle in_progress tasks.\n④ Review: After Codex finishes, nodes turn completed 🟢. Click a node to open the detail panel, read ai_feedback, confirm the AI's work, then begin the next planning cycle." },
      { title: "💡 Ensuring AI reads AGENTS.md", body: "This UI toggle prepares the markdown file, but you must still explicitly tell your AI: 'Read AGENTS.md and follow its rules' when you start the conversation." },
    ],
    opManual: "Operating Manual",
    opSteps: [
      { title: "Load Tasks", body: "Tauri reads workspace/agent_memory.json on startup. Set AGENT_WORKSPACE_DIR to use a custom directory." },
      { title: "Node Interaction", body: "Click a node → the detail panel slides out. Change status via dropdown → writes back to JSON instantly." },
      { title: "Multi-Workspace Support", body: "Add multiple workspaces in Settings, each with its own independent task graph." },
      { title: "Skill Prompts", body: "Check needed skills in MODs. The AI will load corresponding prompts based on AGENTS.md rules." },
    ],
    aiTipsTitle: "AI Prompting Techniques", aiTipsDesc: "Extracted from real workflows. Click to expand.",
    tips: [
      { title: "📥 Feed Data First, Then Say 'stop'", body: "Before asking the AI to execute, feed all background data incrementally and tell it to stand by until you say 'stop'." },
      { title: "📌 Lock Version Rules", body: "Clearly list the latest stable version of every language in AGENTS.md, forcing the AI to use current syntax." },
      { title: "🧠 Inject .agent Skill Libraries", body: "Pre-load domain knowledge skill directories into .agent/skills/ so the AI reads them before development." },
      { title: "🔄 Structured JSON Communication", body: "Use the node structure of agent_memory.json to let the AI explicitly record each step." },
      { title: "🎯 Small Batch Iteration Principle", body: "Let the AI handle one clear sub-task at a time, verify, then proceed to the next." },
    ],
  },
};

// ─── Constants ───────────────────────────────────────────────────────────────
const ALL_LANGS = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Dart", "Swift", "Kotlin", "C++", "C#", "Java", "Ruby", "PHP"];

const THEME_LIST: { id: ThemeId; accentNode: string }[] = [
  { id: "light", accentNode: "#0284c7" },
  { id: "tokyo", accentNode: "#ff2eff" },
  { id: "dark", accentNode: "#6366f1" },
  { id: "forest", accentNode: "#22c55e" },
  { id: "beige", accentNode: "#b45309" },
];

const ALL_SKILLS = [
  { id: "backend-architect", cat: "backend", zh: "後端架構師", en: "Backend Architect" },
  { id: "api-design-principles", cat: "backend", zh: "API 設計原則", en: "API Design Principles" },
  { id: "data-pipeline-architect", cat: "backend", zh: "資料管線架構師", en: "Data Pipeline Architect" },
  { id: "fastapi-swagger-sync", cat: "backend", zh: "FastAPI Swagger 同步", en: "FastAPI Swagger Sync" },
  { id: "graphql-resolver-gen", cat: "backend", zh: "GraphQL 解析器生成", en: "GraphQL Resolver Gen" },
  { id: "api-contract-sync", cat: "backend", zh: "API 合約同步", en: "API Contract Sync" },
  { id: "react-native-expert", cat: "mobile", zh: "React Native 專家", en: "React Native Expert" },
  { id: "react-native-perf-boost", cat: "mobile", zh: "React Native 效能優化", en: "React Native Perf Boost" },
  { id: "mobile-sensor-integrator", cat: "mobile", zh: "行動感測器整合", en: "Mobile Sensor Integrator" },
  { id: "ui-ux-pro-max-skill", cat: "mobile", zh: "UI/UX 專業技能", en: "UI/UX Pro Max" },
  { id: "gamification-ui-kit", cat: "mobile", zh: "遊戲化 UI 套件", en: "Gamification UI Kit" },
  { id: "design-to-code-bridge", cat: "mobile", zh: "設計轉程式碼橋接", en: "Design to Code Bridge" },
  { id: "tdd-workflows-tdd-cycle", cat: "testing", zh: "TDD 工作流程", en: "TDD Workflows" },
  { id: "qa-auto-tester-pro", cat: "testing", zh: "QA 自動測試", en: "QA Auto Tester Pro" },
  { id: "doc-gen-pro", cat: "testing", zh: "文件生成器", en: "Doc Gen Pro" },
  { id: "code-refactoring-refactor-clean", cat: "quality", zh: "程式碼重構", en: "Code Refactoring" },
  { id: "code-review-ai-ai-review", cat: "quality", zh: "AI 程式碼審查", en: "Code Review AI" },
  { id: "python-ast-visualizer", cat: "quality", zh: "Python AST 視覺化", en: "Python AST Visualizer" },
  { id: "git-commit-standardizer", cat: "quality", zh: "Git 提交標準化", en: "Git Commit Standardizer" },
  { id: "python-algo-optimizer", cat: "quality", zh: "Python 演算法優化", en: "Python Algo Optimizer" },
];

const CAT_KEYS = ["backend", "mobile", "testing", "quality"] as const;

const DEFAULT_MEMORY: AgentMemory = {
  tasks: [
    {
      id: "task-001", description: "Initialize desktop topology viewer scaffold", status: "completed", dependencies: [],
      ai_feedback: "Tauri 2.0 + Vite scaffolded cleanly. Recommend pinning Rust edition to 2021.",
      tasks: [
        { id: "task-001-01", description: "Set up Tauri + React + Vite architecture", status: "completed", dependencies: ["task-001"] },
        { id: "task-001-02", description: "Create fixed sidebar and route shells", status: "completed", dependencies: ["task-001-01"] },
      ]
    },
    {
      id: "task-002", description: "Render DAG from agent memory with dagre auto-layout", status: "in_progress", dependencies: ["task-001-02"],
      ai_feedback: "Dagre LR layout wired. nodesep=60, ranksep=130. No overlaps on complex trees.",
      tasks: [
        { id: "task-002-01", description: "Map dependencies into directed edges", status: "completed", dependencies: ["task-002"] },
        {
          id: "task-002-02", description: "Display glowing status task cards", status: "in_progress", dependencies: ["task-002-01"],
          ai_feedback: "In-progress nodes now emit pulsing amber glow via CSS keyframe animation."
        },
      ]
    },
    {
      id: "task-003", description: "Two-way sync: write status changes back to JSON", status: "completed", dependencies: ["task-002-02"],
      ai_feedback: "save_agent_memory Tauri IPC implemented. Optimistic UI update fires before async write."
    },
    { id: "task-004", description: "Persist settings, rules and mods across sessions", status: "pending", dependencies: ["task-003"] },
  ],
};

const DEFAULT_RULES = [
  "Please use the latest syntax for the current version of each programming language.",
  "Iterate on the existing code architecture. Do not create new files unless absolutely necessary.",
  "Operate with maximum efficiency and avoid any redundant or bloated code.",
];

// ─── Hooks ────────────────────────────────────────────────────────────────────
function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const s = localStorage.getItem(key); if (s !== null) return JSON.parse(s); } catch { }
    return initial;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState] as const;
}

// ─── Graph Utilities ───────────────────────────────────────────────────────────
function flattenTasks(tasks: AgentTask[], depth = 0): Array<AgentTask & { depth: number }> {
  return tasks.flatMap((t) => [
    { ...t, dependencies: t.dependencies ?? [], description: t.description || (t as any).title || t.id, depth },
    ...flattenTasks(t.tasks ?? [], depth + 1),
  ]);
}

function getLayouted(nodes: Node<TaskNodeData>[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 130 });
  nodes.forEach((n) => g.setNode(n.id, { width: 280, height: 155 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const p = g.node(n.id);
      return { ...n, targetPosition: Position.Left, sourcePosition: Position.Right, position: { x: p.x - 140, y: p.y - 77 } };
    }),
    edges,
  };
}

function buildFlow(memory: AgentMemory, sl: TaskNodeData["sl"], onChange: (id: string, s: TaskStatus) => void) {
  const flat = flattenTasks(memory.tasks);
  const idSet = new Set(flat.map((t) => t.id));

  // Auto-chain: if a task has no valid dependencies, link it to the previous task
  flat.forEach((t, i) => {
    const validDeps = (t.dependencies ?? []).filter((d) => idSet.has(d));
    if (validDeps.length === 0 && i > 0) {
      t.dependencies = [flat[i - 1].id];
    } else {
      t.dependencies = validDeps;
    }
  });

  const nodes = flat.map((t) => ({
    id: t.id, type: "taskNode",
    data: { id: t.id, description: t.description, status: t.status, dependencies: t.dependencies, ai_feedback: t.ai_feedback, sl, onStatusChange: onChange },
    position: { x: 0, y: 0 },
  }));
  const edges = flat.flatMap((t) =>
    (t.dependencies ?? []).map((dep) => ({
      id: `${dep}-${t.id}`, source: dep, target: t.id,
      animated: t.status === "in_progress",
      style: { strokeWidth: 2, stroke: t.status === "completed" ? "#22d3ee" : t.status === "in_progress" ? "#f59e0b" : "#334155" },
    }))
  );
  return getLayouted(nodes, edges);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, children, onConfirm, onCancel, confirmText, cancelText, danger = false }: {
  title: string; children: React.ReactNode; onConfirm: () => void; onCancel: () => void;
  confirmText: string; cancelText: string; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-[480px] rounded-2xl border shadow-2xl p-6 panel-bg" style={{ borderColor: "var(--border-c)" }}>
        <h3 className="text-base font-bold t1 mb-4">{title}</h3>
        <div>{children}</div>
        <div className="flex gap-3 mt-6 justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-bold border transition-colors t2"
            style={{ borderColor: "var(--border-c)", background: "var(--bg-card)" }}>
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors text-white ${danger ? "bg-red-600 hover:bg-red-500" : "bg-sky-600 hover:bg-sky-500"}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Node ────────────────────────────────────────────────────────────────
function TaskNode({ data, selected }: NodeProps<TaskNodeData>) {
  const cfg = {
    completed: { card: "border-cyan-500/40", bg: "rgba(8,47,73,0.4)", glow: "glow-cyan", dot: "bg-cyan-400", sel: "border-cyan-500/40 text-cyan-300" },
    in_progress: { card: "border-amber-500/50", bg: "rgba(69,26,3,0.4)", glow: "glow-amber", dot: "bg-amber-400 animate-ping", sel: "border-amber-500/50 text-amber-300" },
    pending: { card: "border-slate-700/50", bg: "rgba(15,23,42,0.4)", glow: "", dot: "bg-slate-600", sel: "border-slate-700/50 text-slate-400" },
  }[data.status];

  return (
    <div className={`w-[280px] rounded-xl border backdrop-blur-xl p-4 shadow-xl transition-all duration-300 ${cfg.card} ${cfg.glow} ${selected ? "ring-2 ring-blue-400 scale-[1.04]" : ""}`}
      style={{ background: cfg.bg }}>
      <Handle type="target" position={Position.Left} style={{ background: "#334155", width: 10, height: 10, border: "2px solid #0f172a" }} />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--t3)" }}>{data.id}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      </div>
      <p className="text-sm font-medium leading-relaxed line-clamp-3 mb-3" style={{ color: "var(--t1)" }}>{data.description}</p>
      <select value={data.status} onClick={(e) => e.stopPropagation()}
        onChange={(e) => data.onStatusChange(data.id, e.target.value as TaskStatus)}
        className={`w-full cursor-pointer outline-none rounded-lg px-2 py-1.5 text-xs font-bold bg-black/30 border backdrop-blur-sm focus:ring-1 focus:ring-blue-500 ${cfg.sel}`}>
        <option value="pending">🟡 {data.sl.pending}</option>
        <option value="in_progress">🔵 {data.sl.inProgress}</option>
        <option value="completed">🟢 {data.sl.completed}</option>
      </select>
      {data.ai_feedback && (
        <div className="mt-2 px-2 py-1 rounded text-[10px] font-semibold border" style={{ color: "var(--accent)", borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
          💬 AI Note
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#334155", width: 10, height: 10, border: "2px solid #0f172a" }} />
    </div>
  );
}
const NODE_TYPES = { taskNode: TaskNode };

// ─── Task Flow View ───────────────────────────────────────────────────────────
function TaskFlowView({ memory, workspaces, activeWsId, setActiveWsId, onChange, t, lang }: {
  memory: AgentMemory; workspaces: Workspace[]; activeWsId: string;
  setActiveWsId: (id: string) => void; onChange: (id: string, s: TaskStatus) => void;
  t: typeof T["en"]; lang: Lang;
}) {
  const sl = { pending: t.pending, inProgress: t.inProgress, completed: t.completed };
  const [nodes, setNodes, onNodesChange] = useNodesState<TaskNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<TaskNodeData | null>(null);

  useEffect(() => {
    const { nodes: n, edges: e } = buildFlow(memory, sl, onChange);
    setNodes(n); setEdges(e);
  }, [memory, t, onChange, setNodes, setEdges]); // eslint-disable-line

  const onNodeClick = useCallback((_: unknown, node: Node) => setSelected(node.data as TaskNodeData), []);
  const onPaneClick = useCallback(() => setSelected(null), []);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Workspace tabs */}
      {workspaces.length > 0 && (
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {workspaces.map((ws) => (
            <button key={ws.id} type="button" onClick={() => setActiveWsId(ws.id)}
              className="flex flex-col items-start px-3 py-2 rounded-lg text-xs font-bold border transition-all"
              style={ws.id === activeWsId
                ? { background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)" }
                : { background: "var(--bg-card)", borderColor: "var(--border-c)", color: "var(--t3)" }}>
              <span>{ws.name} · {ws.lang}</span>
              {ws.path && <span className="font-mono mt-0.5 opacity-60" style={{ fontSize: "9px" }}>{ws.path}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1 rounded-2xl border overflow-hidden shadow-2xl" style={{ borderColor: "var(--border-c)", background: "var(--bg-card)" }}>
        {memory.tasks.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="text-5xl mb-4 opacity-20">⬡</div>
            <p className="text-sm font-bold opacity-30" style={{ color: "var(--t2)" }}>
              {lang === "zh" ? "此工作區尚無任務。在設定中指定 JSON 路徑，或讓 AI 代理寫入資料。" : "No tasks in this workspace yet. Set the JSON path in Settings or let an AI agent write data."}
            </p>
          </div>
        )}
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick} onPaneClick={onPaneClick} fitView nodeTypes={NODE_TYPES}>
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--grid)" />
        </ReactFlow>

        {/* Detail slide panel */}
        <aside className={`absolute top-0 right-0 h-full w-80 flex flex-col border-l shadow-2xl transform transition-transform duration-500 ease-out ${selected ? "translate-x-0" : "translate-x-full"}`}
          style={{ background: "var(--bg-panel)", borderColor: "var(--border-c)", backdropFilter: "blur(20px)" }}>
          {selected && (
            <>
              <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "var(--border-c)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--accent)" }}>{t.taskDetails}</h3>
                <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors t3 hover:t1"
                  style={{ background: "var(--bg-card)" }}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest t3">{t.taskId}</label>
                  <div className="mt-1 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: "var(--bg-card)", color: "var(--accent)" }}>{selected.id}</div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest t3">{t.desc}</label>
                  <p className="mt-1 text-sm leading-relaxed t1">{selected.description}</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest t3">{t.deps}</label>
                  {selected.dependencies.length > 0
                    ? <ul className="mt-2 space-y-1">{selected.dependencies.map((d) => (
                      <li key={d} className="text-xs font-mono px-3 py-1.5 rounded-lg border" style={{ background: "var(--bg-card)", color: "var(--accent)", borderColor: "var(--border-c)" }}>{d}</li>
                    ))}</ul>
                    : <p className="mt-1 text-xs italic t3">{t.noDeps}</p>
                  }
                </div>
                {selected.ai_feedback && (
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{t.aiFeedback}</label>
                    <div className="mt-2 p-4 rounded-xl border" style={{ background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--t1)" }}>{selected.ai_feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Rules View ───────────────────────────────────────────────────────────────
function RulesView({ t, rules, setRules }: { t: typeof T["en"]; rules: string[]; setRules: React.Dispatch<React.SetStateAction<string[]>> }) {
  const [addModal, setAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [newRule, setNewRule] = useState("");

  const handleAdd = () => {
    if (!newRule.trim()) return;
    setRules((r) => [...r, newRule.trim()]);
    setNewRule(""); setAddModal(false);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl border shadow-xl p-6 panel-bg overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h2 className="text-xl font-bold t1">{t.aiRules}</h2>
        <button type="button" onClick={() => setAddModal(true)}
          className="text-xs font-bold px-4 py-2 rounded-lg border transition-all"
          style={{ color: "var(--accent)", borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
          {t.addRule}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="flex gap-3 items-start p-4 rounded-xl border card-bg">
            <div className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-[10px] font-black"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <p className="flex-1 text-sm leading-relaxed t1">{rule}</p>
            <button type="button" onClick={() => setDeleteTarget(i)}
              className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold t3 hover:bg-red-900/30 hover:text-red-400 transition-colors">
              −
            </button>
          </div>
        ))}
      </div>

      {addModal && (
        <Modal title={t.addRuleTitle} onConfirm={handleAdd} onCancel={() => { setAddModal(false); setNewRule(""); }} confirmText={t.confirm} cancelText={t.cancel}>
          <textarea autoFocus value={newRule} onChange={(e) => setNewRule(e.target.value)}
            placeholder={t.addRulePlaceholder} rows={4}
            className="w-full rounded-xl border p-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 t1"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-c)" }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
          />
        </Modal>
      )}

      {deleteTarget !== null && (
        <Modal title={t.deleteRuleTitle} onConfirm={() => { setRules((r) => r.filter((_, i) => i !== deleteTarget)); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} confirmText={t.confirm} cancelText={t.cancel} danger>
          <p className="text-sm t2">{t.deleteRuleConfirm}</p>
          <div className="mt-3 p-3 rounded-lg border text-sm t2" style={{ background: "var(--bg-card)", borderColor: "var(--border-c)" }}>
            {rules[deleteTarget]}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MODs View ────────────────────────────────────────────────────────────────
function ModsView({ t, lang, agentsEnabled, setAgentsEnabled, activeSkills, setActiveSkills }: {
  t: typeof T["en"]; lang: Lang;
  agentsEnabled: boolean; setAgentsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  activeSkills: Record<string, boolean>; setActiveSkills: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const catLabel: Record<string, string> = {
    backend: t.catBackend, mobile: t.catMobile, testing: t.catTesting, quality: t.catQuality,
  };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border shadow-xl p-6 panel-bg">
      <h2 className="text-xl font-bold t1 mb-6">{t.mods}</h2>

      {/* AGENTS.md toggle */}
      <div className="p-5 rounded-xl border card-bg mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold t1">AGENTS.md</p>
          <p className="text-xs t3 mt-0.5">{t.agentsMdDesc}</p>
        </div>
        <button type="button" onClick={() => setAgentsEnabled((v) => !v)}
          className="relative w-12 h-6 rounded-full flex-shrink-0 transition-colors duration-300"
          style={{ background: agentsEnabled ? "var(--accent)" : "var(--bg-card)", border: "1px solid var(--border-c)" }}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${agentsEnabled ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Skill list */}
      <p className="text-[10px] font-bold uppercase tracking-widest t3 mb-1">{t.skillsTitle}</p>
      <p className="text-xs t3 mb-5">{t.skillsDesc}</p>
      <div className="space-y-6">
        {CAT_KEYS.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-widest t3 mb-2 px-1">{catLabel[cat]}</p>
            <div className="space-y-2">
              {ALL_SKILLS.filter((s) => s.cat === cat).map((skill) => (
                <label key={skill.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border card-bg cursor-pointer transition-all hover:brightness-110">
                  <input type="checkbox" className="w-4 h-4 flex-shrink-0" style={{ accentColor: "var(--accent)" }}
                    checked={Boolean(activeSkills[skill.id])}
                    onChange={(e) => setActiveSkills((cur) => ({ ...cur, [skill.id]: e.target.checked }))} />
                  <span className="text-sm t1">{lang === "zh" ? skill.zh : skill.en}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView({ lang, setLang, theme, setTheme, workspaces, setWorkspaces, t }: {
  lang: Lang; setLang: (l: Lang) => void; theme: ThemeId; setTheme: (th: ThemeId) => void;
  workspaces: Workspace[]; setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  t: typeof T["en"];
}) {
  const [openTip, setOpenTip] = useState<number | null>(null);
  const [draftPaths, setDraftPaths] = useState<Record<string, string>>({});
  const addWs = () => setWorkspaces((ws) => [...ws, { id: `ws-${Date.now()}`, name: `Project ${ws.length + 1}`, lang: "TypeScript", path: "" }]);
  const removeWs = (id: string) => setWorkspaces((ws) => ws.filter((w) => w.id !== id));
  const updateWs = (id: string, field: "name" | "lang" | "path", val: string) => setWorkspaces((ws) => ws.map((w) => w.id === id ? { ...w, [field]: val } : w));

  const inputStyle = { background: "var(--bg-card)", borderColor: "var(--border-c)", color: "var(--t1)" };

  return (
    <div className="h-full overflow-y-auto rounded-2xl border shadow-xl p-6 panel-bg">
      <h2 className="text-xl font-bold t1 mb-8">{t.settingsTitle}</h2>

      {/* Language */}
      <section className="mb-7 p-5 rounded-xl border card-bg">
        <label className="text-[10px] font-bold uppercase tracking-widest t3 mb-3 block">{t.langLabel}</label>
        <div className="flex gap-3">
          {(["zh", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className="px-5 py-2 rounded-lg text-sm font-bold border transition-all"
              style={lang === l ? { background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)" } : inputStyle}>
              {l === "zh" ? "中文" : "English"}
            </button>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section className="mb-7 p-5 rounded-xl border card-bg">
        <label className="text-[10px] font-bold uppercase tracking-widest t3 mb-3 block">{t.themeLabel}</label>
        <div className="flex flex-wrap gap-2">
          {THEME_LIST.map(({ id }) => (
            <button key={id} type="button" onClick={() => setTheme(id)}
              className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
              style={theme === id ? { background: "var(--accent-bg)", borderColor: "var(--accent)", color: "var(--accent)" } : inputStyle}>
              {t.themes[id]}
            </button>
          ))}
        </div>
      </section>

      {/* Workspaces */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest t3">{t.workspaces}</p>
          <button type="button" onClick={addWs} className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: "var(--accent)", borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
            {t.addWorkspace}
          </button>
        </div>
        {/* AI workspace path info */}
        <div className="mb-4 p-4 rounded-xl border flex gap-3" style={{ background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
          <span style={{ color: "var(--accent)" }}>💡</span>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>{t.aiHowTitle}</p>
            <p className="text-xs mt-1 t2 leading-relaxed">{t.aiHowBody}</p>
          </div>
        </div>
        <div className="space-y-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="p-4 rounded-xl border card-bg space-y-3">
              <div className="flex gap-3 items-center">
                <input value={ws.name} onChange={(e) => updateWs(ws.id, "name", e.target.value)}
                  placeholder={t.wsName} className="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ ...inputStyle, borderColor: "var(--border-c)" }} />
                <select value={ws.lang} onChange={(e) => updateWs(ws.id, "lang", e.target.value)}
                  className="rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-1" style={inputStyle}>
                  {ALL_LANGS.map((l) => <option key={l}>{l}</option>)}
                </select>
                {workspaces.length > 1 && (
                  <button type="button" onClick={() => removeWs(ws.id)}
                    className="text-xs font-bold px-2 py-1.5 flex-shrink-0 t3 hover:text-red-400 transition-colors border rounded-lg"
                    style={{ borderColor: "var(--border-c)" }}>
                    {t.removeWs}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input value={draftPaths[ws.id] ?? ws.path} onChange={(e) => setDraftPaths({ ...draftPaths, [ws.id]: e.target.value })}
                  placeholder={t.wsPathPlaceholder}
                  className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1"
                  style={{ ...inputStyle, borderColor: "var(--border-c)", opacity: 0.85 }} />
                <button type="button"
                  onClick={() => draftPaths[ws.id] !== undefined && updateWs(ws.id, "path", draftPaths[ws.id])}
                  className="text-xs font-bold px-3 py-2 rounded-lg border transition-all"
                  style={draftPaths[ws.id] !== undefined && draftPaths[ws.id] !== ws.path ?
                    { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } :
                    { ...inputStyle, opacity: 0.5, cursor: "not-allowed" }
                  }
                  disabled={draftPaths[ws.id] === undefined || draftPaths[ws.id] === ws.path}>
                  {t.confirm}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-widest t3 mb-4">{t.howItWorks}</p>
        <div className="grid gap-3">
          {t.howSteps.map((step, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl border card-bg">
              <div className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ background: "var(--accent)", boxShadow: `0 4px 12px var(--accent-bg)` }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div><p className="text-sm font-bold t1">{step.title}</p><p className="mt-1 text-xs t3 leading-relaxed">{step.body}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Collaboration Guide */}
      <section className="mb-7">
        <div className="mb-4 p-4 rounded-xl border flex gap-3" style={{ background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
          <span style={{ color: "var(--accent)" }}>🔰</span>
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>{t.aiGuideTitle}</p>
        </div>
        <div className="grid gap-3">
          {t.aiGuideSteps.map((step, i) => (
            <div key={i} className="p-4 rounded-xl border card-bg">
              <p className="text-sm font-bold t1 mb-1" style={i === t.aiGuideSteps.length - 1 ? { color: "var(--accent)" } : undefined}>
                {step.title}
              </p>
              <p className="text-xs t3 leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Op manual */}
      <section className="mb-7">
        <p className="text-[10px] font-bold uppercase tracking-widest t3 mb-4">{t.opManual}</p>
        <div className="grid gap-3">
          {t.opSteps.map((step, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl border card-bg">
              <div className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ background: "var(--t3)" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div><p className="text-sm font-bold t1">{step.title}</p><p className="mt-1 text-xs t3 leading-relaxed">{step.body}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Tips */}
      <section className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest t3 mb-1">{t.aiTipsTitle}</p>
        <p className="text-xs t3 mb-4">{t.aiTipsDesc}</p>
        <div className="space-y-2">
          {t.tips.map((tip, i) => (
            <div key={i} className="rounded-xl border card-bg overflow-hidden">
              <button type="button" onClick={() => setOpenTip(openTip === i ? null : i)}
                className="w-full flex justify-between items-center px-5 py-3.5 text-sm font-bold t1 text-left transition-all hover:brightness-110">
                <span>{tip.title}</span>
                <span className={`ml-2 t3 text-xs transition-transform duration-300 flex-shrink-0 ${openTip === i ? "rotate-180" : ""}`}>▾</span>
              </button>
              {openTip === i && (
                <div className="px-5 pb-4 text-xs t2 leading-relaxed border-t pt-3" style={{ borderColor: "var(--border-c)" }}>{tip.body}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ t }: { t: typeof T["en"] }) {
  const location = useLocation();
  const items = [
    { label: t.taskFlow, to: "/" }, { label: t.rules, to: "/rules" },
    { label: t.mods, to: "/mods" }, { label: t.settings, to: "/settings" },
  ];
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r p-5 flex flex-col z-50"
      style={{ background: "var(--sidebar)", borderColor: "var(--border-c)" }}>
      <div className="flex items-center gap-3 mb-8 mt-1 px-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent)", boxShadow: `0 4px 16px var(--accent-bg)` }}>
          <div className="w-2.5 h-2.5 rounded-full bg-white/90" style={{ boxShadow: "0 0 8px rgba(255,255,255,0.9)" }} />
        </div>
        <span className="text-sm font-extrabold leading-tight tracking-wide" style={{ color: "var(--t1)" }}>{t.appTitle}</span>
      </div>
      <nav className="space-y-1 flex-1">
        {items.map(({ label, to }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to}
              className="flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200"
              style={active
                ? { background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent)", marginLeft: "4px" }
                : { color: "var(--t3)", border: "1px solid transparent" }}>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 border-t" style={{ borderColor: "var(--border-c)" }}>
        <p className="text-[9px] font-semibold tracking-wider uppercase leading-relaxed t3">
          AI Agent Topology Viewer<br />Tauri 2.0 · TS 5.8 · ReactFlow 11
        </p>
      </div>
    </aside>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = usePersistedState<Lang>("app_lang", "zh");
  const [theme, setTheme] = usePersistedState<ThemeId>("app_theme", "dark");
  const [workspaces, setWorkspaces] = usePersistedState<Workspace[]>("workspaces", [
    { id: "ws-default", name: "Project 1", lang: "TypeScript", path: "" },
  ]);
  const [activeWsId, setActiveWsId] = usePersistedState("active_ws_id", "ws-default");
  const [memoryMap, setMemoryMap] = usePersistedState<Record<string, AgentMemory>>("memory_map", {});

  // Each workspace gets truly independent memory; only the first default gets demo data
  const activeMemory = memoryMap[activeWsId] ?? (activeWsId === "ws-default" ? DEFAULT_MEMORY : { tasks: [] });
  const t = T[lang];

  const [rules, setRules] = usePersistedState<string[]>("ai_rules_arr", DEFAULT_RULES);
  const [agentsEnabled, setAgentsEnabled] = usePersistedState("mods_agents_enabled", false);
  const [activeSkills, setActiveSkills] = usePersistedState<Record<string, boolean>>("mods_skills", {});

  // Write AGENTS.md when dependencies change
  useEffect(() => {
    const ws = workspaces.find((w) => w.id === activeWsId);
    if (!ws?.path || !agentsEnabled) return;

    const active = ALL_SKILLS.filter(s => activeSkills[s.id]);
    let md = `# AGENTS.md\n\n> This file is auto-generated by the AI Agent Topology Viewer.\n\n`;
    md += `## Global Rules\n\n`;
    rules.forEach((r, i) => { md += `${i + 1}. ${r}\n`; });

    if (active.length > 0) {
      md += `\n## Active Skills\n\nThe following skills must be applied strictly:\n\n`;
      active.forEach(s => { md += `- **${s.en}**: ${s.zh}\n`; });
    }

    invoke("save_workspace_file", { path: ws.path, filename: "AGENTS.md", content: md }).catch(console.error);
  }, [activeWsId, workspaces, rules, agentsEnabled, activeSkills]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const ws = workspaces.find((w) => w.id === activeWsId);
    const invokeArgs = ws?.path ? { path: ws.path } : undefined;
    const cmd = ws?.path ? "load_agent_memory_from" : "load_agent_memory";
    invoke<AgentMemory>(cmd, invokeArgs)
      .then((p) => { if (p?.tasks?.length) setMemoryMap((m) => ({ ...m, [activeWsId]: p })); })
      .catch(() => {
        const saveCmd = ws?.path ? "save_agent_memory_to" : "save_agent_memory";
        const saveArgs = ws?.path ? { path: ws.path, memory: { tasks: [] } } : { memory: { tasks: [] } };
        invoke(saveCmd, saveArgs).catch(() => { });
        setMemoryMap((m) => ({ ...m, [activeWsId]: { tasks: [] } }));
      });
    let unlisten: (() => void) | undefined;
    listen<AgentMemory>("agent_memory_updated", (e) => {
      if (e.payload?.tasks?.length) setMemoryMap((m) => ({ ...m, [activeWsId]: e.payload }));
    }).then((l) => (unlisten = l)).catch(() => { });
    return () => unlisten?.();
  }, [activeWsId]); // eslint-disable-line

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const updated: AgentMemory = JSON.parse(JSON.stringify(activeMemory));
    const patch = (tasks: AgentTask[]): boolean => {
      for (const t of tasks) {
        if (t.id === taskId) { t.status = newStatus; return true; }
        if (t.tasks && patch(t.tasks)) return true;
      }
      return false;
    };
    patch(updated.tasks);
    setMemoryMap((m) => ({ ...m, [activeWsId]: updated }));
    const ws = workspaces.find((w) => w.id === activeWsId);
    const cmd = ws?.path ? "save_agent_memory_to" : "save_agent_memory";
    const args = ws?.path ? { path: ws.path, memory: updated } : { memory: updated };
    try { await invoke(cmd, args); } catch { /* browser */ }
  }, [activeMemory, activeWsId, setMemoryMap]);

  return (
    <div className="relative h-screen w-full font-sans overflow-hidden bg-grid">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, var(--orb1) 0%, transparent 70%)`, filter: "blur(70px)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, var(--orb2) 0%, transparent 70%)`, filter: "blur(90px)" }} />
      </div>
      <div className="relative z-10 flex h-full">
        <Sidebar t={t} />
        <main className="ml-56 flex-1 h-screen p-5">
          <Routes>
            <Route path="/" element={<TaskFlowView memory={activeMemory} workspaces={workspaces} activeWsId={activeWsId} setActiveWsId={setActiveWsId} onChange={handleStatusChange} t={t} lang={lang} />} />
            <Route path="/rules" element={<RulesView t={t} rules={rules} setRules={setRules} />} />
            <Route path="/mods" element={<ModsView t={t} lang={lang} agentsEnabled={agentsEnabled} setAgentsEnabled={setAgentsEnabled} activeSkills={activeSkills} setActiveSkills={setActiveSkills} />} />
            <Route path="/settings" element={<SettingsView lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} workspaces={workspaces} setWorkspaces={setWorkspaces} t={t} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
