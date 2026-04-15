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
| **雙向狀態同步** | 點擊任務節點改變狀態，即時寫回 JSON，AI 代理可即時感知 |
| **5 種視覺主題** | 黑色 / Tokyo 電子風 / 白色 / 森林綠 / 米棕色，一鍵切換 |
| **中英語言切換** | 全介面文字支援繁體中文 / English 即時切換 |
| **多工作區管理** | 為不同專案設定獨立 JSON 路徑，AI 代理依路徑區分工作區 |
| **MODs 技能路由** | 基於 AGENTS.md 的技能提示詞勾選，20 個 `.agent/skills/` 技能支援中英標籤 |
| **規則卡片系統** | AI 指令各自獨立一張卡片，+ 新增 / − 刪除均附確認 Modal |
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

## 🤝 與 AI 代理協作

### 三者分工

```
Antigravity (規劃師)       Codex (執行者)
       │                       │
       └──────────┬────────────┘
                  ↓
         agent_memory.json
         (共用任務狀態檔案)
                  ↑
     AI Agent Topology Viewer
     (你的即時控制視窗)
```

### agent_memory.json 格式

```json
{
  "tasks": [
    {
      "id": "task-001",
      "description": "實作登入 API",
      "status": "in_progress",
      "dependencies": [],
      "ai_feedback": "決定使用 JWT，TTL 設為 24h",
      "tasks": [
        {
          "id": "task-001-01",
          "description": "設計 POST /auth/login 端點",
          "status": "completed",
          "dependencies": ["task-001"]
        }
      ]
    }
  ]
}
```

### 工作流程

1. **Antigravity** 規劃任務 → 寫入 `agent_memory.json`
2. **Topology Viewer** 自動顯示任務 DAG 圖
3. **你** 在 UI 點擊任務 → 改為 `in_progress`（批准執行）
4. **Codex** 讀取 `in_progress` 任務 → 執行 → 標記 `completed` + 寫 `ai_feedback`
5. 回到步驟 1，循環迭代

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
