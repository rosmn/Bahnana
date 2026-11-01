// League of Legends Skin Browser - API Services

import type {
  DDragonChampion,
  Skin,
  Champion,
  ChromaCache,
} from './types';

// API URLs
const SKIN_DATA_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/resources/default/skin_ids.json';
const SKIN_FILE_BASE_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/skins';
const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const COMMUNITY_DRAGON_SKINS_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json';

// Chroma color mapping
const CHROMA_COLORS: Record<string, string> = {
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

let ddragonVersion = '14.23.1';
let ddragonChampions: DDragonChampion[] = [];
let chromaInfoCache: ChromaCache = {};

export async function loadDDragonVersion(): Promise<string> {
  try {
    const response = await fetch(DDRAGON_VERSIONS_URL);
    if (response.ok) {
      const versions = await response.json();
      ddragonVersion = versions[0];
    }
  } catch (e) {
    // Use fallback version
  }
  return ddragonVersion;
}

export async function loadDDragonChampions(): Promise<DDragonChampion[]> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch DDragon champions: ${response.status}`);

  const json = await response.json();
  ddragonChampions = Object.values(json.data)
    .filter((c: any) => parseInt(c.key, 10) < 60000 && !c.id.startsWith('Jade_'))
    .map((c: any) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      title: c.title
    }))
    .sort((a: DDragonChampion, b: DDragonChampion) => a.name.localeCompare(b.name));

  return ddragonChampions;
}

export function getDDragonChampions(): DDragonChampion[] {
  return ddragonChampions;
}

export function getDDragonVersion(): string {
  return ddragonVersion;
}

export async function loadSkinData(): Promise<Record<string, string>> {
  const response = await fetch(SKIN_DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch skin data: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function loadChromaInfo(): Promise<void> {
  try {
    const response = await fetch(COMMUNITY_DRAGON_SKINS_URL);
    if (response.ok) {
      const data = await response.json();
      for (const [, skin] of Object.entries(data)) {
        if (!skin.chromas) continue;
        for (const c of skin.chromas as any[]) {
          chromaInfoCache[c.id] = {
            colors: c.colors ?? [],
            parentId: skin.id
          };
        }
      }
    }
  } catch (e) {
    // Chroma info is optional
  }
}

export function getChromaInfoCache(): ChromaCache {
  return chromaInfoCache;
}

export function getDDragonChampionId(championName: string): string {
  const champ = ddragonChampions.find(c =>
    c.name.toLowerCase() === championName.toLowerCase()
  );
  return champ ? champ.id : championName.replace(/[^a-zA-Z]/g, '');
}

export function getChampionKey(championName: string): string | null {
  const champ = ddragonChampions.find(c =>
    c.name.toLowerCase() === championName.toLowerCase()
  );
  return champ ? champ.key : null;
}

export function buildChampionList(allSkinData: Record<string, string>): Champion[] {
  const championMap = new Map<number, Champion>();

  for (const [skinIdStr, skinName] of Object.entries(allSkinData)) {
    const skinId = parseInt(skinIdStr, 10);
    const championId = Math.floor(skinId / 1000);

    if (!championMap.has(championId)) {
      championMap.set(championId, {
        id: championId,
        name: skinName,
        skins: []
      });
    }

    championMap.get(championId)!.skins.push({
      id: skinId,
      name: skinName
    });
  }

  const champions = Array.from(championMap.values()).sort((a, b) => a.id - b.id);
  champions.forEach(champ => {
    champ.skins.sort((a, b) => a.id - b.id);
  });

  return champions;
}

export function parseSkinName(skinName: string): { baseName: string; chroma: string | null; isChroma: boolean } {
  const match = skinName.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      baseName: match[1].trim(),
      chroma: match[2].trim(),
      isChroma: true
    };
  }
  return {
    baseName: skinName,
    chroma: null,
    isChroma: false
  };
}

export interface EnhancedSkin extends Skin {
  num: number;
  isChroma: boolean;
  splashNum: number;
  chromaName?: string;
  color?: string;
  colors?: string[];
}

export function getSplashNum(skin: EnhancedSkin, allSkinData: Record<string, string>): number {
  if (!skin.isChroma) return skin.num;

  // Find base skin by matching baseName in allSkinData
  const baseSkinEntry = Object.entries(allSkinData).find(([id, name]) => {
    const parsed = parseSkinName(name);
    return !parsed.isChroma && parsed.baseName === skin.chromaName;
  });

  if (baseSkinEntry) {
    return parseInt(baseSkinEntry[0], 10) % 1000;
  }
  return skin.num;
}

export function groupSkinsByLine(
  skins: Skin[],
  allSkinData: Record<string, string>,
  chromaCache: ChromaCache
): { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }[] {
  const groups = new Map<string, { baseName: string; baseSkin: EnhancedSkin | null; chromas: EnhancedSkin[] }>();

  skins.forEach(skin => {
    const parsed = parseSkinName(skin.name);
    const key = parsed.baseName;

    if (!groups.has(key)) {
      groups.set(key, {
        baseName: parsed.baseName,
        baseSkin: null,
        chromas: []
      });
    }

    const group = groups.get(key)!;
    const isChroma = parsed.isChroma;
    const chromaInfo = chromaCache[skin.id];

    if (!isChroma) {
      group.baseSkin = {
        ...skin,
        num: skin.id % 1000,
        isChroma: false,
        splashNum: skin.id % 1000
      };
    } else {
      const splashNum = getSplashNum({ ...skin, isChroma: true, chromaName: parsed.chroma, num: skin.id % 1000, splashNum: skin.id % 1000 }, allSkinData);
      group.chromas.push({
        ...skin,
        chromaName: parsed.chroma,
        color: CHROMA_COLORS[parsed.chroma] || '#666',
        colors: chromaInfo?.colors || [],
        isChroma: true,
        num: skin.id % 1000,
        splashNum: splashNum
      });
    }
  });

  // Convert to array, sort by base skin ID
  return Array.from(groups.values()).sort((a, b) => {
    const aId = a.baseSkin?.id || (a.chromas[0]?.id || 0);
    const bId = b.baseSkin?.id || (b.chromas[0]?.id || 0);
    return aId - bId;
  });
}

export function findBaseSkinId(championId: number, skinId: number, champions: Champion[]): number | null {
  const champ = champions.find(c => c.id === championId);
  if (!champ) return null;

  const targetSkin = champ.skins.find(s => s.id === skinId);
  if (!targetSkin) return null;

  const parsed = parseSkinName(targetSkin.name);
  if (!parsed.isChroma) return null;

  const baseSkin = champ.skins.find(s => {
    const sParsed = parseSkinName(s.name);
    return !sParsed.isChroma && sParsed.baseName === parsed.baseName;
  });

  return baseSkin ? baseSkin.id : null;
}

export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}