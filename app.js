// League of Legends Skin Browser - Main Application Logic

// Configuration
const SKIN_DATA_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/resources/default/skin_ids.json';
const SKIN_FILE_BASE_URL = 'https://raw.githubusercontent.com/Alban1911/LeagueSkins/main/skins';
const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const DDRAGON_CHAMPION_URL = 'https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json';
const COMMUNITY_DRAGON_SKINS_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json';

// Chroma color mapping (from Community Dragon)
const CHROMA_COLORS = {
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

// State
let allSkinData = {};
let champions = [];
let ddragonChampions = []; // From DDragon API
let ddragonVersion = '14.23.1';
let selectedChampionId = null;
let currentDownload = null;
let chromaInfoCache = new Map(); // From Community Dragon

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const appMain = document.getElementById('appMain');
const headerStats = document.getElementById('headerStats');
const championCount = document.getElementById('championCount');
const skinCount = document.getElementById('skinCount');
const championGrid = document.getElementById('championGrid');
const championSearch = document.getElementById('championSearch');
const championView = document.getElementById('championView');
const skinView = document.getElementById('skinView');
const backBtn = document.getElementById('backBtn');
const selectedChampionName = document.getElementById('selectedChampionName');
const skinCountDisplay = document.getElementById('skinCountDisplay');
const championAvatar = document.getElementById('championAvatar');
const skinCarousel = document.getElementById('skinCarousel');
const scrollLeft = document.getElementById('scrollLeft');
const scrollRight = document.getElementById('scrollRight');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    showLoading(true);
    try {
        // Load DDragon version and champions in parallel - make them non-blocking
        await Promise.allSettled([
            loadDDragonVersion(),
            loadDDragonChampions()
        ]);

        // Load skin data (required)
        await loadSkinData();

        // Load chroma info (optional - don't block on failure)
        loadChromaInfo().catch(() => {});

        buildChampionList();
        updateStats();
        renderChampionGrid(champions);
        setupEventListeners();
        showLoading(false);
        showMainApp();
    } catch (error) {
        showLoading(false);
        showError(error.message);
    }
}

async function loadDDragonVersion() {
    try {
        const response = await fetch(DDRAGON_VERSIONS_URL);
        if (response.ok) {
            const versions = await response.json();
            ddragonVersion = versions[0];
        }
    } catch (e) {
        // Use fallback version
    }
}

async function loadDDragonChampions() {
    const url = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch DDragon champions: ${response.status}`);

    const json = await response.json();
    ddragonChampions = Object.values(json.data)
        .filter(c => parseInt(c.key, 10) < 60000 && !c.id.startsWith('Jade_'))
        .map(c => ({
            id: c.id,
            key: c.key,
            name: c.name,
            title: c.title
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadSkinData() {
    const response = await fetch(SKIN_DATA_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch skin data: ${response.status} ${response.statusText}`);
    }
    allSkinData = await response.json();
}

async function loadChromaInfo() {
    try {
        const response = await fetch(COMMUNITY_DRAGON_SKINS_URL);
        if (response.ok) {
            const data = await response.json();
            for (const [, skin] of Object.entries(data)) {
                if (!skin.chromas) continue;
                for (const c of skin.chromas) {
                    chromaInfoCache.set(c.id, {
                        colors: c.colors ?? [],
                        parentId: skin.id
                    });
                }
            }
        }
    } catch (e) {
        // Chroma info is optional
    }
}

function buildChampionList() {
    const championMap = new Map();

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

        championMap.get(championId).skins.push({
            id: skinId,
            name: skinName
        });
    }

    champions = Array.from(championMap.values()).sort((a, b) => a.id - b.id);
    champions.forEach(champ => {
        champ.skins.sort((a, b) => a.id - b.id);
    });
}

function updateStats() {
    const totalChampions = champions.length;
    const totalSkins = champions.reduce((sum, c) => sum + c.skins.length, 0);
    championCount.textContent = `${totalChampions} Champions`;
    skinCount.textContent = `${totalSkins} Skins`;
    headerStats.style.display = 'flex';
}

function getDDragonChampionId(championName) {
    // Map skin_ids.json champion name to DDragon champion ID
    const champ = ddragonChampions.find(c =>
        c.name.toLowerCase() === championName.toLowerCase()
    );
    return champ ? champ.id : championName.replace(/[^a-zA-Z]/g, '');
}

function getChampionKey(championName) {
    const champ = ddragonChampions.find(c =>
        c.name.toLowerCase() === championName.toLowerCase()
    );
    return champ ? champ.key : null;
}

function renderChampionGrid(championList) {
    championGrid.innerHTML = '';

    championList.forEach(champ => {
        const card = document.createElement('div');
        card.className = 'champion-card';
        card.dataset.championId = champ.id;
        card.setAttribute('role', 'listitem');
        card.tabIndex = 0;

        const ddragonId = getDDragonChampionId(champ.name);
        const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonId}.png`;

        card.innerHTML = `
            <img class="champion-card-icon" src="${iconUrl}" alt="${escapeHtml(champ.name)}" loading="lazy" onerror="this.style.display='none'">
            <div class="champion-card-name">${escapeHtml(champ.name)}</div>
            <div class="champion-card-skin-count">${champ.skins.length} skins</div>
        `;

        card.addEventListener('click', () => selectChampion(champ.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectChampion(champ.id);
            }
        });

        championGrid.appendChild(card);
    });
}

function filterChampions(query) {
    const filtered = champions.filter(champ =>
        champ.name.toLowerCase().includes(query.toLowerCase())
    );
    renderChampionGrid(filtered);
}

// Parse skin name to extract base name and chroma variant
function parseSkinName(skinName) {
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

// Get splash num for a skin (resolves chromas to base skin's num)
function getSplashNum(skin) {
    if (!skin.isChroma) return skin.num;

    // Find base skin by matching baseName in allSkinData
    const baseSkinEntry = Object.entries(allSkinData).find(([id, name]) => {
        const parsed = parseSkinName(name);
        return !parsed.isChroma && parsed.baseName === skin.baseName;
    });

    if (baseSkinEntry) {
        return parseInt(baseSkinEntry[0], 10) % 1000;
    }
    return skin.num;
}

// Group skins by base skin line (group chromas together)
function groupSkinsByLine(skins) {
    const groups = new Map();

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

        const group = groups.get(key);
        const isChroma = parsed.isChroma;
        const chromaInfo = chromaInfoCache.get(skin.id);

        if (!isChroma) {
            group.baseSkin = {
                ...skin,
                num: skin.id % 1000,
                isChroma: false,
                splashNum: skin.id % 1000
            };
        } else {
            const splashNum = getSplashNum({ ...skin, isChroma: true, baseName: parsed.baseName });
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

function selectChampion(championId) {
    const champ = champions.find(c => c.id === championId);
    if (!champ) return;

    selectedChampionId = championId;
    selectedChampionName.textContent = champ.name;

    const skinLines = groupSkinsByLine(champ.skins);
    const totalSkins = skinLines.reduce((sum, g) => sum + (g.baseSkin ? 1 : 0) + g.chromas.length, 0);
    skinCountDisplay.textContent = `${totalSkins} skins (${skinLines.length} skin lines)`;

    // Set champion avatar using DDragon icon
    const ddragonId = getDDragonChampionId(champ.name);
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${ddragonId}.png`;
    championAvatar.innerHTML = `<img src="${iconUrl}" alt="${escapeHtml(champ.name)}" onerror="this.parentElement.textContent='${champ.name.charAt(0)}'; this.parentElement.style.background='${generateColorFromString(champ.name)}'; this.remove()">`;

    renderSkinCarousel(skinLines, ddragonId);
    showSkinView();
}

function renderSkinCarousel(skinLines, ddragonChampionId) {
    skinCarousel.innerHTML = '';

    skinLines.forEach((line, lineIndex) => {
        if (line.baseSkin) {
            const card = createSkinCard(line.baseSkin, ddragonChampionId, line.chromas, true);
            skinCarousel.appendChild(card);
        } else if (line.chromas.length > 0) {
            const card = createSkinCard(line.chromas[0], ddragonChampionId, line.chromas, false);
            skinCarousel.appendChild(card);
        }
    });

    updateScrollIndicators();
}

function createSkinCard(skin, ddragonChampionId, chromas, isBaseSkin) {
    const card = document.createElement('div');
    card.className = 'skin-card';
    card.dataset.skinId = skin.id;
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;

    const splashNum = skin.splashNum !== undefined ? skin.splashNum : (skin.id % 1000);
    const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${splashNum}.jpg`;

    let chromaIndicators = '';
    if (chromas.length > 0) {
        chromaIndicators = `
            <div class="skin-chromas">
                ${chromas.map(c => `
                    <span class="chroma-dot" style="background: ${c.color};" title="${escapeHtml(c.chromaName)}"></span>
                `).join('')}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="skin-card-image-wrapper">
            <img class="skin-card-image" src="${splashUrl}" alt="${escapeHtml(skin.name)}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 112%22%3E%3Crect fill=%22%232a2a4a%22 width=%22200%22 height=%22112%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
            ${chromaIndicators}
            ${isBaseSkin && chromas.length > 0 ? '<span class="skin-base-badge">Base</span>' : ''}
        </div>
        <div class="skin-card-name">${escapeHtml(skin.name)}</div>
        <div class="skin-card-id">ID: ${skin.id}</div>
    `;

    card.addEventListener('click', (e) => {
        if (chromas.length > 0 && !e.target.classList.contains('chroma-dot')) {
            showChromaSelector(skin, chromas, ddragonChampionId);
        } else if (chromas.length === 0) {
            downloadSkin(skin.id, skin.name);
        }
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (chromas.length > 0) {
                showChromaSelector(skin, chromas, ddragonChampionId);
            } else {
                downloadSkin(skin.id, skin.name);
            }
        }
    });

    card.querySelectorAll('.chroma-dot').forEach((dot, idx) => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const chroma = chromas[idx];
            downloadSkin(chroma.id, chroma.name);
        });
    });

    return card;
}

function showChromaSelector(baseSkin, chromas, ddragonChampionId) {
    const overlay = document.createElement('div');
    overlay.className = 'chroma-selector-overlay';
    overlay.innerHTML = `
        <div class="chroma-selector">
            <div class="chroma-selector-header">
                <h3>${escapeHtml(baseSkin.name)} - Chromas</h3>
                <button class="chroma-close" aria-label="Close">&times;</button>
            </div>
            <div class="chroma-grid">
                <div class="chroma-option base" data-skin-id="${baseSkin.id}">
                    <img src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${baseSkin.splashNum || (baseSkin.id % 1000)}.jpg"
                         alt="${escapeHtml(baseSkin.name)}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 112%22%3E%3Crect fill=%22%232a2a4a%22 width=%22200%22 height=%22112%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
                    <div class="chroma-option-info">
                        <span class="chroma-option-name">${escapeHtml(baseSkin.name)}</span>
                        <span class="chroma-option-id">ID: ${baseSkin.id}</span>
                    </div>
                    <span class="chroma-badge">Base</span>
                </div>
                ${chromas.map(c => `
                    <div class="chroma-option" data-skin-id="${c.id}" style="border-color: ${c.color};">
                        <img src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ddragonChampionId}_${c.splashNum || (c.id % 1000)}.jpg"
                             alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 112%22%3E%3Crect fill=%22%232a2a4a%22 width=%22200%22 height=%22112%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
                        <div class="chroma-option-info">
                            <span class="chroma-option-name">${escapeHtml(c.name)}</span>
                            <span class="chroma-option-id">ID: ${c.id}</span>
                        </div>
                        ${c.colors && c.colors.length > 0 ? `
                            <div class="chroma-color-swatch" style="background: ${c.colors.length > 1 ? `linear-gradient(135deg, ${c.colors[0]} 0% 50%, ${c.colors[1]} 50% 100%)` : c.colors[0]};"></div>
                        ` : `
                            <div class="chroma-color-swatch" style="background: ${c.color};"></div>
                        `}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('.chroma-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    overlay.querySelectorAll('.chroma-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const skinId = parseInt(opt.dataset.skinId, 10);
            const skinName = chromas.find(c => c.id === skinId)?.name || baseSkin.name;
            downloadSkin(skinId, skinName);
            close();
        });
    });

    const handleKey = (e) => {
        if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    overlay.addEventListener('remove', () => document.removeEventListener('keydown', handleKey), { once: true });

    requestAnimationFrame(() => overlay.style.opacity = '1');
}

async function downloadSkin(skinId, skinName) {
    cleanupPreviousDownload();

    const championId = Math.floor(skinId / 1000);
    let url = `${SKIN_FILE_BASE_URL}/${championId}/${skinId}/${skinId}.fantome`;

    showToast(`Downloading ${skinName}...`, 'info');

    try {
        let response = await fetch(url);

        if (response.status === 404) {
            const baseSkinId = findBaseSkinId(championId, skinId);
            if (baseSkinId && baseSkinId !== skinId) {
                url = `${SKIN_FILE_BASE_URL}/${championId}/${baseSkinId}/${skinId}/${skinId}.fantome`;
                response = await fetch(url);
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const filename = `${skinId}.fantome`;
        const blobUrl = URL.createObjectURL(blob);

        currentDownload = { skinId, blobUrl, filename };
        triggerDownload(blob, filename);

        showToast(`Downloaded ${skinName} (${formatBytes(blob.size)})`, 'success');
    } catch (error) {
        showToast(`Download failed: ${error.message}`, 'error');
        cleanupPreviousDownload();
    }
}

function findBaseSkinId(championId, skinId) {
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

function cleanupPreviousDownload() {
    if (currentDownload) {
        URL.revokeObjectURL(currentDownload.blobUrl);
        currentDownload = null;
    }
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showChampionView() {
    championView.style.display = 'block';
    skinView.style.display = 'none';
    selectedChampionId = null;
    championSearch.value = '';
    championSearch.focus();
}

function showSkinView() {
    championView.style.display = 'none';
    skinView.style.display = 'block';
}

function showMainApp() {
    appMain.style.display = 'block';
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    appMain.style.display = 'none';
}

function setupEventListeners() {
    championSearch.addEventListener('input', (e) => {
        filterChampions(e.target.value);
    });

    backBtn.addEventListener('click', showChampionView);

    retryBtn.addEventListener('click', () => {
        errorContainer.style.display = 'none';
        init();
    });

    scrollLeft.addEventListener('click', () => {
        skinCarousel.scrollBy({ left: -300, behavior: 'smooth' });
    });

    scrollRight.addEventListener('click', () => {
        skinCarousel.scrollBy({ left: 300, behavior: 'smooth' });
    });

    skinCarousel.addEventListener('scroll', updateScrollIndicators);

    document.addEventListener('keydown', (e) => {
        if (skinView.style.display !== 'none') {
            if (e.key === 'ArrowLeft') {
                skinCarousel.scrollBy({ left: -300, behavior: 'smooth' });
            } else if (e.key === 'ArrowRight') {
                skinCarousel.scrollBy({ left: 300, behavior: 'smooth' });
            } else if (e.key === 'Escape') {
                showChampionView();
            }
        }
    });
}

function updateScrollIndicators() {
    const { scrollLeft: sl, scrollWidth, clientWidth } = skinCarousel;
    const atStart = sl <= 10;
    const atEnd = sl + clientWidth >= scrollWidth - 10;

    document.getElementById('scrollLeft').style.opacity = atStart ? '0' : '0.5';
    document.getElementById('scrollRight').style.opacity = atEnd ? '0' : '0.5';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 35%)`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}