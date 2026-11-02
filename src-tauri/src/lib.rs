mod commands;
mod error;
mod state;

pub use commands::*;
pub use error::*;
pub use state::*;

use tauri::plugin::{Builder, TauriPlugin};

pub fn plugin() -> TauriPlugin<tauri::Wry> {
    Builder::new("bahnana")
        .setup(|app, _api| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Initialize skin service state
                let _ = state::SkinsState::init(&app_handle).await;
            });
            Ok(())
        })
        .build()
}