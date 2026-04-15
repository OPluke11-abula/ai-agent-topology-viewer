use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Debug, Deserialize, Serialize)]
struct AgentTask {
    id: String,
    description: String,
    status: String,
    dependencies: Vec<String>,
    #[serde(default)]
    tasks: Vec<AgentTask>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct AgentMemory {
    tasks: Vec<AgentTask>,
}

fn workspace_dir() -> PathBuf {
    std::env::var("AGENT_WORKSPACE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("workspace")
        })
}

fn agent_memory_path() -> PathBuf {
    workspace_dir().join("agent_memory.json")
}

fn read_agent_memory(path: &Path) -> Result<AgentMemory, String> {
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn emit_agent_memory_update(app_handle: &AppHandle, path: &Path) {
    match read_agent_memory(path) {
        Ok(agent_memory) => {
            let _ = app_handle.emit("agent_memory_updated", agent_memory);
        }
        Err(error) => {
            eprintln!("Failed to read agent_memory.json: {error}");
        }
    }
}

fn is_agent_memory_event(event: &Event) -> bool {
    event.paths.iter().any(|path| {
        path.file_name()
            .and_then(|file_name| file_name.to_str())
            .map(|file_name| file_name == "agent_memory.json")
            .unwrap_or(false)
    })
}

fn watch_agent_memory(app_handle: AppHandle) {
    let workspace = workspace_dir();
    let memory_path = workspace.join("agent_memory.json");

    thread::spawn(move || {
        let (tx, rx) = mpsc::channel();

        let mut watcher = match recommended_watcher(move |result| {
            let _ = tx.send(result);
        }) {
            Ok(watcher) => watcher,
            Err(error) => {
                eprintln!("Failed to initialize file watcher: {error}");
                return;
            }
        };

        if let Err(error) = watcher.watch(&workspace, RecursiveMode::NonRecursive) {
            eprintln!("Failed to watch workspace directory: {error}");
            return;
        }

        emit_agent_memory_update(&app_handle, &memory_path);

        for event in rx {
            match event {
                Ok(file_event) if is_agent_memory_event(&file_event) => {
                    emit_agent_memory_update(&app_handle, &memory_path);
                }
                Ok(_) => {}
                Err(error) => {
                    eprintln!("File watcher event error: {error}");
                }
            }
        }
    });
}

#[tauri::command]
fn load_agent_memory() -> Result<AgentMemory, String> {
    read_agent_memory(&agent_memory_path())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            watch_agent_memory(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_agent_memory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
