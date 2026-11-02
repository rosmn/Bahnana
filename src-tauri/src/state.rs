use crate::error::AppResult;
use chrono;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const LEAGUE_SKINS_BASE: &str = "https://raw.githubusercontent.com/Alban1911/LeagueSkins/main";
const DATA_DRAGON_BASE: &str = "https://ddragon.leagueoflegends.com/cdn";
const DEFAULT_VERSION: &str = "16.21.1";

/// Skin metadata from catalog
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SkinMetadata {
    pub id: String,
    pub champion_id: String,
    pub champion_name: String,
    pub name: String,
    pub num: u32,
    pub chromas: Vec<ChromaMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChromaMetadata {
    pub id: String,
    pub name: String,
    pub colors: Vec<String>,
}

/// Champion catalog entry
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ChampionCatalogEntry {
    pub id: String,
    pub key: String,
    pub name: String,
    pub title: String,
    pub tags: Vec<String>,
    pub skins: Vec<String>,
}

/// Full skin catalog
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SkinCatalog {
    pub champions: HashMap<String, ChampionCatalogEntry>,
    pub skins: HashMap<String, SkinMetadata>,
    pub updated_at: String,
}

/// Downloaded skin info
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadedSkin {
    pub skin_id: String,
    pub champion_name: String,
    pub skin_name: String,
    pub zip_path: String,
    pub applied: bool,
}

/// Arguments for skin operations
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DownloadSkinArgs {
    pub skin_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplySkinArgs {
    pub skin_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoveSkinArgs {
    pub skin_id: String,
}

/// State for skins service
pub struct SkinsState {
    catalog: Mutex<Option<SkinCatalog>>,
    downloaded: Mutex<HashMap<String, DownloadedSkin>>,
}

impl SkinsState {
    pub fn new() -> Self {
        Self {
            catalog: Mutex::new(None),
            downloaded: Mutex::new(HashMap::new()),
        }
    }

    pub fn catalog(&self) -> &Mutex<Option<SkinCatalog>> {
        &self.catalog
    }

    pub fn downloaded(&self) -> &Mutex<HashMap<String, DownloadedSkin>> {
        &self.downloaded
    }

    pub async fn init(app: &AppHandle) -> AppResult<()> {
        // Try to load cached catalog
        let cache_path = catalog_cache_path(app);
        if cache_path.exists() {
            if let Ok(cached) = fs::read_to_string(&cache_path) {
                if let Ok(catalog) = serde_json::from_str::<SkinCatalog>(&cached) {
                    // We can't easily set the catalog here without the state, so we'll just
                    // let the first fetch_skin_catalog call handle it
                }
            }
        }
        Ok(())
    }
}

impl Default for SkinsState {
    fn default() -> Self {
        Self::new()
    }
}

fn skins_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("skins");
    fs::create_dir_all(&dir).ok();
    dir
}

fn catalog_cache_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("skins");
    fs::create_dir_all(&dir).ok();
    dir.join("catalog.json")
}

async fn fetch_latest_version(app: &AppHandle) -> AppResult<String> {
    let url = "https://ddragon.leagueoflegends.com/api/versions.json";
    let resp = ureq::get(url)
        .call()
        .map_err(|e| crate::error::AppError::Other(format!("Failed to fetch versions: {e}")))?;
    let mut body = String::new();
    resp.into_body().into_reader().read_to_string(&mut body)
        .map_err(|e| crate::error::AppError::Other(format!("Failed to read versions response: {e}")))?;
    let versions: Vec<String> = serde_json::from_str(&body)
        .map_err(|e| crate::error::AppError::Other(format!("Failed to parse versions: {e}")))?;
    let version = versions.first().cloned().unwrap_or_else(|| DEFAULT_VERSION.to_string());
    Ok(version)
}

async fn build_catalog_from_data_dragon(app: &AppHandle, version: &str) -> AppResult<SkinCatalog> {
    let url = format!("{}/{}/data/en_US/champion.json", DATA_DRAGON_BASE, version);

    let resp = ureq::get(&url)
        .call()
        .map_err(|e| crate::error::AppError::Other(format!("Failed to fetch champion list: {e}")))?;

    let mut body = String::new();
    resp.into_body().into_reader().read_to_string(&mut body)
        .map_err(|e| crate::error::AppError::Other(format!("Failed to read champion list response: {e}")))?;
    let champion_list: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| crate::error::AppError::Other(format!("Failed to parse champion list: {e}")))?;

    let data = champion_list.get("data").ok_or_else(|| {
        crate::error::AppError::Other("Invalid champion list format".to_string())
    })?;

    let mut catalog = SkinCatalog {
        champions: HashMap::new(),
        skins: HashMap::new(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    let champion_map = data.as_object().ok_or_else(|| {
        crate::error::AppError::Other("Invalid champion data format".to_string())
    })?;

    let mut total_skins = 0;
    for (champion_name, champion_info) in champion_map {
        let champion_id = champion_info.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let champion_key = champion_info.get("key").and_then(|v| v.as_str()).unwrap_or("");
        let name = champion_info.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let title = champion_info.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let tags: Vec<String> = champion_info.get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_default();
        let champion_name = champion_info.get("name").and_then(|v| v.as_str()).unwrap_or("");

        // Fetch individual champion data for skin details
        let skin_url = format!("{}/{}/data/en_US/champion/{}.json", DATA_DRAGON_BASE, version, champion_name);
        let skin_resp = ureq::get(&skin_url).call();
        if let Ok(resp) = skin_resp {
            let mut body = String::new();
            resp.into_body().into_reader().read_to_string(&mut body)
                .map_err(|e| crate::error::AppError::Other(format!("Failed to read skin response: {e}")))?;
            if let Ok(champion_data) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(champion_obj) = champion_data.get("data").and_then(|d| d.get(champion_name)) {
                    if let Some(skins) = champion_obj.get("skins").and_then(|s| s.as_array()) {
                        let mut champion_skin_ids = Vec::new();

                        for skin in skins {
                            let skin_id = skin.get("id").and_then(|v| v.as_str()).unwrap_or("");
                            let skin_name = skin.get("name").and_then(|v| v.as_str()).unwrap_or("");
                            let skin_num = skin.get("num").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                            let has_chromas = skin.get("chromas").and_then(|v| v.as_bool()).unwrap_or(false);

                            let chromas = if has_chromas {
                                vec![ChromaMetadata {
                                    id: format!("{}_chroma", skin_id),
                                    name: "Default".to_string(),
                                    colors: vec!["#FFFFFF".to_string()],
                                }]
                            } else {
                                vec![]
                            };

                            let skin_metadata = SkinMetadata {
                                id: skin_id.to_string(),
                                champion_id: champion_key.to_string(),
                                champion_name: name.to_string(),
                                name: skin_name.to_string(),
                                num: skin_num,
                                chromas,
                            };

                            catalog.skins.insert(skin_id.to_string(), skin_metadata);
                            champion_skin_ids.push(skin_id.to_string());
                            total_skins += 1;
                        }

                        let champion_entry = ChampionCatalogEntry {
                            id: champion_id.to_string(),
                            key: champion_key.to_string(),
                            name: name.to_string(),
                            title: title.to_string(),
                            tags,
                            skins: champion_skin_ids,
                        };

                        catalog.champions.insert(champion_key.to_string(), champion_entry);
                    }
                }
            }
        }
    }

    Ok(catalog)
}