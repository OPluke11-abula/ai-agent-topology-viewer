# AI Agent Topology Viewer

> 一款高效能的 AI 多代理協作任務視覺化工具，使用 **Tauri 2.0 + React + ReactFlow** 建構。適合搭配 **Codex**、**Antigravity** 等 AI 代理共同使用的指揮控制台。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| **即時 DAG 視覺化** | 讀取 `agent_memory.json`，以有向無環圖呈現 AI 任務樹，支援 dagre 自動排版 |
| **自動初始化工作區** | 無痛建立 AI 協作環境！自動生成 `agent_memory.json` 骨架與 `AGENTS.md` 規則文檔 |
| **雙向狀態同步** | 點擊任務節點改變狀態，即時寫回 JSON，AI 代理可即時感知 |
| **強大防呆與容錯** | 內建 Auto-chain 與屬性回退機制，當 AI JSON 缺少依賴定義時也能自動串聯防崩潰 |
| **5 種視覺主題** | 黑色 / Tokyo 電子風 / 白色 / 森林綠 / 米棕色，一鍵切換 |
| **中英語言切換** | 全介面文字支援繁體中文 / English 即時切換 |
| **多工作區管理** | 為不同專案設定獨立 JSON 路徑，多位 AI 代理平行作業互不干擾 |
| **MODs 技能路由** | 基於 AGENTS.md 的技能提示詞勾選，內置多達 20 個專業開發者技能標籤 |
| **規則卡片系統** | AI 指令各自獨立一張卡片，自由新增/刪除專案等級指令 |
| **Codex & Antigravity 協作** | 三者透過共享 JSON 實現非同步多 AI 並行協作 |

---

## 🚀 快速開始

### 前置需求

- [Node.js](https://nodejs.org/) v20+
- [Rust](https://rustup.rs/) + `cargo`
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)

### 安裝與開發

```bash
# 複製專案
git clone https://github.com/your-username/ai-agent-topology-viewer.git
cd ai-agent-topology-viewer

# 安裝前端依賴
npm install

# 啟動 Vite 開發伺服器（瀏覽器模式，不需 Rust）
npm run dev

# 啟動完整 Tauri 桌面應用程式
npm run tauri dev
```

---

## 📖 完整使用說明與 AI 協作指南

本工具的設計理念是作為 **人類與多個 AI 代理（如 Codex 和 Antigravity）的視覺化溝通橋樑**。所有的狀態同步都透過單一個 JSON 檔案 (`agent_memory.json`) 達成。

### 角色分工

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Antigravity             Codex                         │
│   (規劃 + 架構決策)        (程式碼生成 + 執行)              │
│         │                      │                        │
│         └──────────┬───────────┘                        │
│                    ↓                                    │
│           agent_memory.json                             │
│           (共用任務狀態檔)                                │
│                    ↑                                    │
│                    │                                    │
│     AI Agent Topology Viewer (你的控制視窗)              │
│     (即時視覺化 + 人工干預 + 狀態管理)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🧠 Antigravity (規劃師) 指南

Antigravity 負責理解需求、拆解任務，並寫入 JSON。請對 Antigravity 下達類似以下指令：

> 「你是一位 AI 開發規劃師。請幫我規劃一個登入系統，並將規劃結果更新到 `D:\Projects\my-project\workspace\agent_memory.json`。
> 
> ⚠️ 嚴格格式要求 — 每個任務節點必須且只能包含以下欄位：
> ```json
> {
>   "id": "task-001",
>   "description": "任務描述文字",
>   "status": "pending",
>   "dependencies": [],
>   "ai_feedback": ""
> }
> ```
> ❌ 禁止新增 title、design、findings 等自訂欄位，否則 UI 無法正確渲染。」

### ⚙️ Codex (執行者) 指南

Codex 負責撰寫實際程式碼。請對 Codex 下達類似以下指令：

> 「請讀取 `D:\Projects\my-project\workspace\agent_memory.json` 尋找 `status` 為 `in_progress` 的任務。
> 執行該任務後，如果完成，請將 JSON 中的狀態改為 `completed`，並在 `ai_feedback` 留下你修改了哪些檔案或遭遇的問題。」

### 🧑‍💻 人類 (你) 的日常工作循環

1. **規劃階段**：你要求 Antigravity 規劃任務。它將任務寫入 JSON (狀態為 `pending` 🟡)。
2. **監控與批准**：你在 Topology Viewer 中看到新長出的圖表節點。點擊你想開始的任務，手動將狀態切換為 `in_progress` 🔵。這代表了你的**批准執行**。
3. **執行階段**：你命令 Codex 去處理 `in_progress` 的任務。
4. **回顧階段**：Codex 完成後，節點在 UI 變成 `completed` 🟢。點擊節點右側滑出面板，你可以閱讀 `ai_feedback`，確認 AI 的想法。並根據結果進行下一波規劃。

---

## 📁 專案結構

```
ai-agent-topology-viewer/
├── src/                    # React 前端
│   ├── App.tsx             # 主應用程式（所有元件）
│   └── index.css           # 5 主題 CSS 變數系統
├── src-tauri/              # Rust 後端
│   └── src/lib.rs          # Tauri IPC 指令 + 檔案監聽
├── .agent/skills/          # AI 技能提示詞庫（20 個）
├── workspace/              # 預設 JSON 工作區
│   └── agent_memory.json
├── .github/workflows/      # GitHub Actions CI/CD
│   └── release.yml         # 自動打包 Windows .exe/.msi
├── AGENTS.md               # AI 代理規則文件
└── CONTRIBUTING.md         # 貢獻指南
```

---

## 🎨 主題系統

| 主題 | 風格 |
|------|------|
| 🌑 黑色 | 純黑極簡科技 |
| ⚡ Tokyo 電子風 | 深夜電馭叛客，電光青藍 + 洋紅光暈 |
| ☀️ 白色 | 乾淨明亮，簡約現代 |
| 🌲 森林綠 | 自然林地感，苔蘚綠調 + 晨光金色 |
| 📋 米棕色 | 溫潤奶油，沉穩閱讀感 |

---

## 📦 自動發佈 (CI/CD)

推送 `v*` Tag 即自動觸發 GitHub Actions 打包：

```bash
git tag v1.0.0
git push origin v1.0.0
```

打包完成後，可於 GitHub Releases 頁面下載：
- `ai-agent-topology-viewer_x.x.x_x64-setup.exe` (NSIS 安裝程式)
- `ai-agent-topology-viewer_x.x.x_x64_en-US.msi` (MSI 安裝套件)

### ⚠️ Windows 執行警告排除 (SmartScreen)
由於這是獨立開源專案，安裝檔尚未購買高昂的微軟數位簽章，下載後雙擊可能會被 **Windows 11 / SmartScreen 攔截**，這是正常現象。請依以下步驟解除封鎖：

1. 對下載的 `.exe` 安裝檔點擊**右鍵**，選擇 **[內容]**。
2. 在「一般」分頁的最下方，找到「安全性」區塊，勾選 **[解除封鎖]**。
3. 點擊 **[套用]** 與 **[確定]**。
4. 再次雙擊執行檔即可安裝。（若執行時仍跳出藍色畫面，請點擊「其他資訊」→「仍要執行」）。

---

## 🌐 多工作區 & AI 路徑配置

在設定頁為每個專案指定獨立的 JSON 路徑：

```
工作區 A → D:\Projects\project-a\workspace
工作區 B → D:\Projects\project-b\workspace
```

讓 Codex / Antigravity 讀寫對應路徑的 `agent_memory.json`，即可讓多個 AI 平行作業互不干擾。

---

## 🤝 貢獻方式

詳見 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 授權

[MIT License](./LICENSE) © 2025
