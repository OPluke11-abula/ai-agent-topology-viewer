# ai-agent-topology-viewer

A Tauri 2.0 desktop control center with a React (TypeScript + Vite) frontend for visualizing and managing AI agent task flows.

## Key Features
- Fixed left sidebar with 4 views: **Task Flow**, **Rules**, **MODs**, and **Settings**
- DAG task visualization with **React Flow** using custom task nodes (`id`, `description`, `status`)
- Rules view seeded with required default base instructions
- Prompt modifier selection view with checkbox-based MOD toggles
- Settings view with language selector, theme toggle, and bottom-fixed developer information footer
- Rust backend file watcher that monitors `workspace/agent_memory.json` and emits `agent_memory_updated` events
- Strict Tauri capability file scoped to log file read access only (`src-tauri/capabilities/capabilities.json`)

## Local Data
A sample hierarchical task file with dependency arrays is available at:

`/home/runner/work/ai-agent-topology-viewer/ai-agent-topology-viewer/workspace/agent_memory.json`

Set `AGENT_WORKSPACE_DIR` to change the watched workspace path.
