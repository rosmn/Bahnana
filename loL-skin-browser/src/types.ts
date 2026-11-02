// League of Legends Skin Browser - Type Definitions

// Tauri backend catalog types
export interface SkinMetadata {
  id: string;
  champion_id: string;
  champion_name: string;
  name: string;
  num: number;
  chromas: ChromaMetadata[];
}

export interface ChromaMetadata {
  id: string;
  name: string;
  colors: string[];
}

export interface ChampionCatalogEntry {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  skins: string[];
}

export interface SkinCatalog {
  champions: Record<string, ChampionCatalogEntry>;
  skins: Record<string, SkinMetadata>;
  updated_at: string;
}

export interface DownloadedSkin {
  skin_id: string;
  champion_name: string;
  skin_name: string;
  zip_path: string;
  applied: boolean;
}

export interface DDragonChampion {
  id: string;
  key: string;
  name: string;
  title: string;
}

export interface Skin {
  id: number;
  name: string;
}

export interface Champion {
  id: number;
  name: string;
  skins: Skin[];
}

export interface ParsedSkinName {
  baseName: string;
  chroma: string | null;
  isChroma: boolean;
}

export interface SkinLine {
  baseName: string;
  baseSkin: EnhancedSkin | null;
  chromas: EnhancedSkin[];
}

export interface EnhancedSkin extends Skin {
  num: number;
  isChroma: boolean;
  splashNum: number;
  chromaName?: string;
  color?: string;
  colors?: string[];
}

export interface ChromaInfo {
  colors: string[];
  parentId: number;
}

export interface ChromaCache {
  [skinId: number]: ChromaInfo;
}

// API URLs
export const SKIN_DATA_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/resources/default/skin_ids.json';
export const SKIN_FILE_BASE_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/skins';
export const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
export const DDRAGON_CHAMPION_URL = 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json';
export const COMMUNITY_DRAGON_SKINS_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json';

// Chroma color mapping
export const CHROMA_COLORS: Record<string, string> = {
  'Ruby': '#e74c3c',
  'Catseye': '#f39c12',
  'Emerald': '#27ae60',
  'Sapphire': '#3498db',
  'Amethyst': '#9b59b6',
  'Citrine': '#f1c40f',
  'Rose Quartz': '#e91e63',
  'Obsidian': '#2c3e50',
  'Pearl': '#ecf0f1',
  'Turquoise': '#1abc9c',
  'Tanzanite': '#8e44ad',
  'Peridot': '#a8e6cf',
  'Aquamarine': '#7fcdcd',
  'Meteorite': '#7f8c8d',
  'Granite': '#95a5a6',
  'Rainbow': 'linear-gradient(45deg, #e74c3c, #f39c12, #27ae60, #3498db, #9b59b6)',
  'Gilded': '#f39c12',
  'Paragon': '#9b59b6',
  'Wreathguard': '#27ae60',
  'Resolute': '#34495e',
  'Elite': '#f1c40f',
  'Worlds Early Bird': '#e74c3c',
  'Chrono': '#3498db',
  'Merc': '#e74c3c',
  'Nightshade': '#2c3e50',
  'Ghoulish': '#e74c3c',
  'Unlocked': '#f39c12',
  'Destined': '#9b59b6',
  'Golden': '#f39c12',
  'Neon Noir': '#e74c3c',
  'Sandstone': '#d4a843',
  'Plum': '#8e44ad',
  'Ivory': '#ecf0f1',
  'Garnet': '#c0392b',
  'Viridian': '#16a085',
  'Crimson': '#c0392b',
  'Onyx': '#2c3e50',
  'Bronze': '#cd7f32',
  'Silver': '#bdc3c7',
  'Gold': '#f39c12',
  'Diamond': '#3498db',
  'Master': '#9b59b6',
  'Challenger': '#e74c3c',
};