# AGENTS.md

Read this file first before contributing to this AI Agent Topology Viewer project.

## Product Goal

- **Main Objective:** A small Windows desktop application that provides a graphic, structural log (DAG topology) to help users easily understand the tasks, task nodes, and big-picture context for coding AI Agents (like Codex and Antigravity). This helps in planning subsequent tasks.
- **AI Collaboration:** Ensures AI reads and writes standard JSON correctly, enhancing task understanding and significantly reducing execution errors.
- **Current Architecture:** Tauri, React, ReactFlow, Vite, Tailwind CSS.

## Version Policy

- **Tauri:** `2.0`
- **React Frontend:** `19.1.0`
- **TypeScript:** `~5.8.3`
- **Vite:** `7.0.4`
- **Tailwind CSS:** `3.4.17`
- **ReactFlow:** `11.11.4`

*(If introducing backend AI wrappers, ensure versions trace the latest stable standards, such as Python `3.14.3` and the latest API integrations like `google-genai` for Gemini).*

## Core Engineering Rules

1. **Latest Syntax:** You must use the current, latest, and most stable syntax for every programming language and SDK implemented.
2. **Minimize New Files:** Iterate explicitly on the existing code architecture. Do not create new files to iterate unless absolutely necessary.
3. **Maximum Efficiency:** Operate with maximum efficiency and extreme precision. Avoid any redundant, slow, or bloated code. 

## Documentation Rules

- **README Synchronization:** Every time the source code is updated, the `README.md` file MUST be updated to reflect the new state.
- Keep documents precise and verifiable.
