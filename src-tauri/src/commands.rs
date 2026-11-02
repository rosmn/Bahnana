use crate::error::{AppError, AppResult, IpcResult};
use crate::state::{
    SkinCatalog, DownloadedSkin, DownloadSkinArgs, ApplySkinArgs, RemoveSkinArgs,
    SkinsState, skins_dir, catalog_cache_path, fetch_latest_version, build_catalog_from_data_dragon,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use ureq;

const LEAGUE_SKINS_BASE: &str = "https://raw.githubusercontent.com/Alban1911/LeagueSkins/main";

/// Fetch the skin catalog from Data Dragon (with local caching)
#[tauri::command]
#[specta::specta]
pub async fn fetch_skin_catalog(
    app: AppHandle,
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<SkinCatalog> {
    let cache_path = catalog_cache_path(&app);

    // Check cache first
    if cache_path.exists() {
        if let Ok(cached) = fs::read_to_string(&cache_path) {
            if let Ok(catalog) = serde_json::from_str::<SkinCatalog>(&cached) {
                let mut skins_guard = skins.lock().unwrap();
                *skins_guard.catalog() = Mutex::new(Some(catalog.clone()));
                return IpcResult::ok(catalog);
            }
        }
    }

    // Fetch latest version and build catalog
    let version = fetch_latest_version(&app).await?;
    let catalog = build_catalog_from_data_dragon(&app, &version).await?;

    // Cache it
    let cache_json = serde_json::to_string(&catalog).unwrap_or_default();
    fs::write(&cache_path, cache_json).ok();

    let mut skins_guard = skins.lock().unwrap();
    *skins_guard.catalog() = Mutex::new(Some(catalog.clone()));

    IpcResult::ok(catalog)
}

/// Get cached skin catalog
#[tauri::command]
#[specta::specta]
pub async fn get_skin_catalog(
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<Option<SkinCatalog>> {
    let catalog = skins.lock().unwrap().catalog().lock().unwrap().clone();
    IpcResult::ok(catalog)
}

/// Download a single skin from LeagueSkins
#[tauri::command]
#[specta::specta]
pub async fn download_skin(
    app: AppHandle,
    args: DownloadSkinArgs,
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<DownloadedSkin> {
    // Get catalog
    let catalog = {
        let skins_guard = skins.lock().unwrap();
        skins_guard.catalog().lock().unwrap().clone()
    }.ok_or_else(|| crate::error::AppError::Other("Catalog not loaded. Call fetch_skin_catalog first.".to_string()))?;

    let skin_meta = catalog
        .skins
        .get(&args.skin_id)
        .ok_or_else(|| crate::error::AppError::Other(format!("Skin {} not found in catalog", args.skin_id)))?;

    let champion_key = &skin_meta.champion_id;
    let skin_id = &skin_meta.id;

    let base = skins_dir(&app);
    let skin_dir = base.join(&skin_meta.champion_name).join(&skin_meta.name);
    fs::create_dir_all(&skin_dir).map_err(|e| crate::error::AppError::Other(e.to_string()))?;

    let zip_path = skin_dir.join(format!("{}.zip", skin_id));

    // Check if already downloaded
    if zip_path.exists() {
        let downloaded = DownloadedSkin {
            skin_id: skin_id.clone(),
            champion_name: skin_meta.champion_name.clone(),
            skin_name: skin_meta.name.clone(),
            zip_path: zip_path.to_string_lossy().into_owned(),
            applied: false,
        };
        skins.lock().unwrap().downloaded().lock().unwrap().insert(skin_id.clone(), downloaded.clone());
        return IpcResult::ok(downloaded);
    }

    // LeagueSkins repo uses: skins/{champion_key}/{full_skin_id}/{full_skin_id}.fantome
    let url = format!("{}/skins/{}/{}/{}.fantome", LEAGUE_SKINS_BASE, champion_key, skin_id, skin_id);

    let mut resp = ureq::get(&url)
        .call()
        .map_err(|e| crate::error::AppError::Other(format!("Download failed: {e}")))?;

    let mut bytes = Vec::new();
    resp.into_body().into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| crate::error::AppError::Other(format!("Read failed: {e}")))?;

    if bytes.is_empty() {
        return Err(crate::error::AppError::Other("Downloaded file is empty".to_string())).into();
    }

    fs::write(&zip_path, &bytes).map_err(|e| crate::error::AppError::Other(format!("Write failed: {e}")))?;

    let downloaded = DownloadedSkin {
        skin_id: skin_id.clone(),
        champion_name: skin_meta.champion_name.clone(),
        skin_name: skin_meta.name.clone(),
        zip_path: zip_path.to_string_lossy().into_owned(),
        applied: false,
    };

    skins.lock().unwrap().downloaded().lock().unwrap().insert(skin_id.clone(), downloaded.clone());

    IpcResult::ok(downloaded)
}

/// Apply a downloaded skin using the patcher
#[tauri::command]
#[specta::specta]
pub async fn apply_skin(
    args: ApplySkinArgs,
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<()> {
    let mut skins_map = skins.lock().unwrap().downloaded().lock().unwrap();
    let skin = skins_map
        .get_mut(&args.skin_id)
        .ok_or_else(|| crate::error::AppError::Other(format!("Skin {} not downloaded", args.skin_id)))?;

    // TODO: Actually apply the skin using the patcher
    // For now, just mark as applied
    skin.applied = true;

    IpcResult::ok(())
}

/// Remove a downloaded skin
#[tauri::command]
#[specta::specta]
pub async fn remove_skin(
    app: AppHandle,
    args: RemoveSkinArgs,
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<()> {
    let catalog = {
        let skins_guard = skins.lock().unwrap();
        skins_guard.catalog().lock().unwrap().clone()
    }.ok_or_else(|| crate::error::AppError::Other("Catalog not loaded".to_string()))?;

    let skin_meta = catalog
        .skins
        .get(&args.skin_id)
        .ok_or_else(|| crate::error::AppError::Other(format!("Skin {} not found in catalog", args.skin_id)))?;

    let base = skins_dir(&app);
    let skin_dir = base.join(&skin_meta.champion_name).join(&skin_meta.name);

    if skin_dir.exists() {
        fs::remove_dir_all(&skin_dir).map_err(|e| crate::error::AppError::Other(e.to_string()))?;
    }

    skins.lock().unwrap().downloaded().lock().unwrap().remove(&args.skin_id);

    IpcResult::ok(())
}

/// List all downloaded skins
#[tauri::command]
#[specta::specta]
pub async fn list_downloaded_skins(
    app: AppHandle,
    skins: State<'_, Mutex<SkinsState>>,
) -> IpcResult<Vec<DownloadedSkin>> {
    let catalog = {
        let skins_guard = skins.lock().unwrap();
        skins_guard.catalog().lock().unwrap().clone()
    }.ok_or_else(|| crate::error::AppError::Other("Catalog not loaded".to_string()))?;

    let base = skins_dir(&app);
    let mut skins_vec = Vec::new();

    let downloaded_map = skins.lock().unwrap().downloaded().lock().unwrap();

    for (skin_id, downloaded) in downloaded_map.iter() {
        if let Some(skin_meta) = catalog.skins.get(skin_id) {
            let zip_path = base.join(&skin_meta.champion_name).join(&skin_meta.name).join(format!("{}.zip", skin_id));
            if zip_path.exists() {
                skins_vec.push(DownloadedSkin {
                    skin_id: skin_id.clone(),
                    champion_name: skin_meta.champion_name.clone(),
                    skin_name: skin_meta.name.clone(),
                    zip_path: zip_path.to_string_lossy().into_owned(),
                    applied: downloaded.applied,
                });
            }
        }
    }

    IpcResult::ok(skins_vec)
}