const CATEGORY_LABELS = {
    movie: '电影',
    series: '剧集',
    anime: '番剧',
    game: '游戏',
    music: '音乐'
};

const CATEGORY_ICONS = {
    movie: '🎬',
    series: '📺',
    anime: '🌸',
    game: '🎮',
    music: '🎵'
};

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));

const STORAGE_KEY = 'content-tracker-v2';
const RSS_STORAGE_KEY = 'anime-rss-tracker-v1';
const TMDB_ENDPOINT = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_ENDPOINT = 'https://image.tmdb.org/t/p/w342';
const TMDB_API_KEY = '';

const defaultEntries = [
    {
        id: 'tmdb:movie:157336',
        category: 'movie',
        title: '星际穿越',
        rating: 8.7,
        year: 2014,
        platform: 'TMDB',
        tags: ['科幻', '电影'],
        description: '以 TMDB 为准的电影记录示例。',
        media: {
            source: 'tmdb',
            tmdbType: 'movie',
            tmdbId: 157336,
            poster: '',
            cast: [],
            collection: ''
        },
        createdAt: new Date('2026-01-01').toISOString(),
        updatedAt: new Date('2026-01-01').toISOString()
    },
    {
        id: 'tmdb:tv:1399',
        category: 'series',
        title: 'Game of Thrones',
        rating: 9.2,
        year: 2011,
        platform: 'TMDB',
        tags: ['剧集', '奇幻'],
        description: '剧集示例，支持季/集页面。',
        media: {
            source: 'tmdb',
            tmdbType: 'tv',
            tmdbId: 1399,
            poster: '',
            cast: [],
            collection: ''
        },
        createdAt: new Date('2026-01-02').toISOString(),
        updatedAt: new Date('2026-01-02').toISOString()
    }
];

class ContentService {
    constructor(storageKey, rssStorageKey) {
        this.storageKey = storageKey;
        this.rssStorageKey = rssStorageKey;
    }

    read() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
            this.write(defaultEntries);
            return [...defaultEntries];
        }
        try {
            return JSON.parse(raw);
        } catch {
            this.write(defaultEntries);
            return [...defaultEntries];
        }
    }

    write(items) {
        localStorage.setItem(this.storageKey, JSON.stringify(items));
    }

    listRss() {
        const raw = localStorage.getItem(this.rssStorageKey);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    writeRss(items) {
        localStorage.setItem(this.rssStorageKey, JSON.stringify(items));
    }

    async list({ category = 'all', keyword = '', sortBy = 'updatedAt' } = {}) {
        let items = this.read();
        const keywordText = keyword.trim().toLowerCase();

        if (category !== 'all') {
            items = items.filter((it) => it.category === category);
        }

        if (keywordText) {
            items = items.filter((it) => {
                const cast = (it.media?.cast || []).join(' ');
                const blob = `${it.title} ${it.platform || ''} ${it.description || ''} ${(it.tags || []).join(' ')} ${cast}`.toLowerCase();
                return blob.includes(keywordText);
            });
        }

        return [...items].sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title, 'zh-Hans-CN');
            if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }

    async getById(id) {
        return this.read().find((it) => it.id === id) || null;
    }

    normalizeEntry(input) {
        const now = new Date().toISOString();
        const tags = Array.isArray(input.tags) ? input.tags : [];
        const normalized = {
            ...input,
            tags,
            rating: input.rating === '' || input.rating == null ? null : Number(input.rating),
            year: input.year === '' || input.year == null ? null : Number(input.year),
            platform: String(input.platform || '').trim(),
            description: String(input.description || '').trim(),
            media: input.media && typeof input.media === 'object' ? input.media : null,
            updatedAt: now
        };

        if (normalized.media?.source === 'tmdb' && normalized.media.tmdbType && normalized.media.tmdbId) {
            normalized.id = `tmdb:${normalized.media.tmdbType}:${normalized.media.tmdbId}`;
        }

        if (!normalized.id) {
            normalized.id = crypto.randomUUID();
            normalized.createdAt = now;
        }

        return normalized;
    }

    async save(input) {
        const items = this.read();
        const normalized = this.normalizeEntry(input);

        const index = items.findIndex((it) => it.id === normalized.id || (input.id && it.id === input.id));
        if (index >= 0) {
            normalized.createdAt = items[index].createdAt;
            items[index] = normalized;
        } else {
            normalized.createdAt = normalized.createdAt || new Date().toISOString();
            items.unshift(normalized);
        }

        this.write(items);
        return normalized;
    }

    async remove(id) {
        this.write(this.read().filter((it) => it.id !== id));
    }

    async clearAll() {
        this.write([]);
    }

    normalizeImportEntry(raw) {
        const title = String(raw?.title || '').trim();
        const category = VALID_CATEGORIES.has(raw?.category) ? raw.category : '';
        if (!title || !category) return null;

        return this.normalizeEntry({
            id: raw?.id || null,
            category,
            title,
            rating: raw?.rating,
            year: raw?.year,
            platform: raw?.platform || '',
            tags: Array.isArray(raw?.tags) ? raw.tags.map((v) => String(v).trim()).filter(Boolean).slice(0, 15) : [],
            description: raw?.description || '',
            media: raw?.media && typeof raw.media === 'object' ? raw.media : null,
            createdAt: raw?.createdAt,
            updatedAt: raw?.updatedAt
        });
    }

    async importEntries(rawEntries) {
        if (!Array.isArray(rawEntries)) throw new Error('导入文件格式错误：应为 JSON 数组。');
        const normalized = rawEntries.map((item) => this.normalizeImportEntry(item)).filter(Boolean);
        if (!normalized.length) throw new Error('导入失败：没有可用记录。');
        this.write(normalized);
        return normalized.length;
    }

    async searchMediaMatch({ title, year, category }) {
        if (!title.trim()) return { state: 'error', message: '请输入影视标题。', results: [] };
        if (!TMDB_API_KEY) return { state: 'error', message: '请先配置 TMDB_API_KEY。', results: [] };
        if (!['movie', 'series', 'anime'].includes(category)) return { state: 'error', message: '当前分类无需 TMDB 匹配。', results: [] };

        const tmdbType = category === 'movie' ? 'movie' : 'tv';
        const results = await this.searchTmdbMulti({ title, year, tmdbType });

        if (!results.length) return { state: 'empty', message: '未找到匹配结果。', results: [] };
        return {
            state: results.length > 1 ? 'multiple' : 'single',
            message: `找到 ${results.length} 个 TMDB 结果。`,
            results: results.slice(0, 10)
        };
    }

    async searchTmdbMulti({ title, year, tmdbType }) {
        const languages = ['zh-CN', 'en-US'];
        const merged = [];
        const seen = new Set();

        for (const language of languages) {
            const params = new URLSearchParams({
                api_key: TMDB_API_KEY,
                query: title.trim(),
                language,
                include_adult: 'false'
            });

            if (year) {
                if (tmdbType === 'movie') params.set('year', String(year));
                else params.set('first_air_date_year', String(year));
            }

            try {
                const response = await fetch(`${TMDB_ENDPOINT}/search/${tmdbType}?${params.toString()}`);
                if (!response.ok) continue;
                const data = await response.json();
                const rawResults = Array.isArray(data?.results) ? data.results : [];

                rawResults.forEach((item) => {
                    const id = Number(item.id);
                    if (!id || seen.has(id)) return;
                    seen.add(id);
                    merged.push({
                        source: 'tmdb',
                        externalId: String(id),
                        tmdbType,
                        title: item.title || item.name || item.original_title || item.original_name || '',
                        altTitle: item.original_title || item.original_name || '',
                        year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null,
                        poster: item.poster_path ? `${TMDB_IMAGE_ENDPOINT}${item.poster_path}` : '',
                        overview: item.overview || ''
                    });
                });
            } catch {
                // ignore single language failure
            }
        }

        return merged;
    }

    async getMediaDetail(result) {
        if (result.source !== 'tmdb') throw new Error('unsupported-source');
        return this.getTmdbDetail(result.tmdbType, result.externalId);
    }

    async getTmdbDetail(tmdbType, tmdbId) {
        const params = new URLSearchParams({
            api_key: TMDB_API_KEY,
            language: 'zh-CN',
            append_to_response: 'credits'
        });

        const response = await fetch(`${TMDB_ENDPOINT}/${tmdbType}/${encodeURIComponent(tmdbId)}?${params.toString()}`);
        if (!response.ok) throw new Error('tmdb-network');

        const data = await response.json();
        if (data?.success === false) throw new Error(data.status_message || 'tmdb-error');

        const cast = Array.isArray(data?.credits?.cast)
            ? data.credits.cast.slice(0, 8).map((it) => it.name).filter(Boolean)
            : [];

        const seasons = tmdbType === 'tv' && Array.isArray(data.seasons)
            ? data.seasons
                .filter((season) => Number(season.season_number) > 0)
                .map((season) => ({
                    seasonNumber: season.season_number,
                    name: season.name || `第 ${season.season_number} 季`,
                    overview: season.overview || '',
                    episodeCount: season.episode_count || 0,
                    airDate: season.air_date || ''
                }))
            : [];

        return {
            source: 'tmdb',
            tmdbType,
            externalId: String(tmdbId),
            title: data.title || data.name || '',
            year: Number((data.release_date || data.first_air_date || '').slice(0, 4)) || null,
            description: data.overview || '',
            rating: Number(data.vote_average) || null,
            platform: 'TMDB',
            tags: Array.isArray(data.genres) ? data.genres.map((it) => it.name).join(', ') : '',
            poster: data.poster_path ? `${TMDB_IMAGE_ENDPOINT}${data.poster_path}` : '',
            cast,
            collection: data.belongs_to_collection?.name || '',
            seasons
        };
    }

    async getSeasonEpisodes(tmdbId, seasonNumber) {
        if (!TMDB_API_KEY) throw new Error('tmdb-api-key-missing');
        const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'zh-CN' });
        const response = await fetch(`${TMDB_ENDPOINT}/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(seasonNumber)}?${params.toString()}`);
        if (!response.ok) throw new Error('tmdb-network');

        const data = await response.json();
        const episodes = Array.isArray(data.episodes)
            ? data.episodes.map((ep) => ({
                seasonNumber: Number(ep.season_number),
                episodeNumber: Number(ep.episode_number),
                name: ep.name || '',
                overview: ep.overview || '',
                airDate: ep.air_date || '',
                rating: Number(ep.vote_average) || null,
                still: ep.still_path ? `${TMDB_IMAGE_ENDPOINT}${ep.still_path}` : ''
            }))
            : [];

        return {
            seasonName: data.name || `第 ${seasonNumber} 季`,
            seasonOverview: data.overview || '',
            episodes
        };
    }

    async getEpisodeDetail(tmdbId, seasonNumber, episodeNumber) {
        if (!TMDB_API_KEY) throw new Error('tmdb-api-key-missing');
        const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'zh-CN' });
        const response = await fetch(`${TMDB_ENDPOINT}/tv/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(seasonNumber)}/episode/${encodeURIComponent(episodeNumber)}?${params.toString()}`);
        if (!response.ok) throw new Error('tmdb-network');

        const data = await response.json();
        return {
            seasonNumber,
            episodeNumber,
            name: data.name || '',
            overview: data.overview || '',
            airDate: data.air_date || '',
            rating: Number(data.vote_average) || null,
            still: data.still_path ? `${TMDB_IMAGE_ENDPOINT}${data.still_path}` : ''
        };
    }

    async fetchSteamDetail(appId) {
        const safeAppId = String(appId || '').trim();
        if (!safeAppId) throw new Error('missing-appid');

        const endpoint = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(safeAppId)}&l=schinese`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('steam-network');

        const data = await response.json();
        const payload = data?.[safeAppId];
        if (!payload?.success || !payload?.data) throw new Error('steam-invalid');

        const game = payload.data;
        return {
            appId: safeAppId,
            title: game.name || '',
            year: Number((game.release_date?.date || '').match(/\d{4}/)?.[0]) || null,
            description: game.short_description || '',
            tags: Array.isArray(game.genres) ? game.genres.map((it) => it.description).join(', ') : '',
            poster: game.header_image || '',
            platform: 'Steam'
        };
    }

    parseNeteaseBulkText(rawText) {
        return String(rawText || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [title, artist] = line.split('-').map((part) => part.trim());
                if (!title) return null;
                return {
                    id: crypto.randomUUID(),
                    category: 'music',
                    title,
                    rating: null,
                    year: null,
                    platform: '网易云音乐',
                    tags: ['网易云导入', artist || '未知歌手'],
                    description: artist ? `歌手：${artist}` : '歌手：未知',
                    media: { source: 'netease', externalId: '', poster: '' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            })
            .filter(Boolean);
    }

    async importNeteaseBulk(rawText) {
        const parsed = this.parseNeteaseBulkText(rawText);
        if (!parsed.length) throw new Error('请输入至少一条有效音乐记录。');
        const items = this.read();
        this.write([...parsed, ...items]);
        return parsed.length;
    }

    addRssSubscription({ title, url }) {
        const safeTitle = String(title || '').trim();
        const safeUrl = String(url || '').trim();
        if (!safeTitle || !safeUrl) throw new Error('订阅名称和 URL 不能为空。');

        const list = this.listRss();
        if (list.some((it) => it.url === safeUrl)) throw new Error('该 RSS 已存在。');

        const item = {
            id: crypto.randomUUID(),
            title: safeTitle,
            url: safeUrl,
            updatedAt: new Date().toISOString(),
            latestItems: [],
            lastError: ''
        };

        this.writeRss([item, ...list]);
        return item;
    }

    removeRssSubscription(id) {
        this.writeRss(this.listRss().filter((it) => it.id !== id));
    }

    async refreshRssSubscriptions() {
        const list = this.listRss();
        const refreshed = await Promise.all(list.map(async (item) => {
            try {
                const response = await fetch(item.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'application/xml');
                const entries = Array.from(xml.querySelectorAll('item')).slice(0, 8).map((node) => ({
                    title: node.querySelector('title')?.textContent?.trim() || '无标题',
                    link: node.querySelector('link')?.textContent?.trim() || '',
                    pubDate: node.querySelector('pubDate')?.textContent?.trim() || ''
                }));

                return {
                    ...item,
                    updatedAt: new Date().toISOString(),
                    latestItems: entries,
                    lastError: ''
                };
            } catch (error) {
                return {
                    ...item,
                    updatedAt: new Date().toISOString(),
                    lastError: `刷新失败：${String(error.message || '未知错误')}`
                };
            }
        }));

        this.writeRss(refreshed);
        return refreshed;
    }
}

const service = new ContentService(STORAGE_KEY, RSS_STORAGE_KEY);

const state = {
    activeView: 'listView',
    activeCategory: 'all',
    selectedId: null,
    mediaResults: [],
    openSeasonEpisodes: [],
    currentEpisode: null
};

const dom = {
    navBtns: document.querySelectorAll('.nav-btn'),
    viewButtons: document.querySelectorAll('[data-view]'),
    listStatus: document.getElementById('listStatus'),
    cardGrid: document.getElementById('cardGrid'),
    detailContent: document.getElementById('detailContent'),
    episodeContent: document.getElementById('episodeContent'),
    createBtn: document.getElementById('createBtn'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    importFileInput: document.getElementById('importFileInput'),
    categoryTabs: document.querySelectorAll('.category-tab'),
    searchInput: document.getElementById('searchInput'),
    sortBy: document.getElementById('sortBy'),
    entryForm: document.getElementById('entryForm'),
    entryId: document.getElementById('entryId'),
    entryCategory: document.getElementById('entryCategory'),
    entryTitle: document.getElementById('entryTitle'),
    entryRating: document.getElementById('entryRating'),
    entryYear: document.getElementById('entryYear'),
    entryPlatform: document.getElementById('entryPlatform'),
    entryTags: document.getElementById('entryTags'),
    entryDescription: document.getElementById('entryDescription'),
    tmdbSection: document.getElementById('tmdbSection'),
    mediaTitle: document.getElementById('mediaTitle'),
    mediaYear: document.getElementById('mediaYear'),
    mediaSearchBtn: document.getElementById('mediaSearchBtn'),
    mediaStatus: document.getElementById('mediaStatus'),
    mediaResults: document.getElementById('mediaResults'),
    steamSection: document.getElementById('steamSection'),
    steamAppId: document.getElementById('steamAppId'),
    steamFetchBtn: document.getElementById('steamFetchBtn'),
    steamStatus: document.getElementById('steamStatus'),
    musicSection: document.getElementById('musicSection'),
    musicBulkInput: document.getElementById('musicBulkInput'),
    musicBulkImportBtn: document.getElementById('musicBulkImportBtn'),
    musicStatus: document.getElementById('musicStatus'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    rssTitle: document.getElementById('rssTitle'),
    rssUrl: document.getElementById('rssUrl'),
    addRssBtn: document.getElementById('addRssBtn'),
    refreshRssBtn: document.getElementById('refreshRssBtn'),
    rssStatus: document.getElementById('rssStatus'),
    rssList: document.getElementById('rssList')
};

const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const setStatus = (el, message, type = 'info') => {
    if (!el) return;
    const prefix = type === 'error' ? '⚠️ ' : type === 'success' ? '✅ ' : '';
    el.textContent = `${prefix}${message || ''}`;
};

const switchView = (viewId) => {
    state.activeView = viewId;
    ['listView', 'detailView', 'episodeView', 'editorView', 'subscriptionView'].forEach((id) => {
        document.getElementById(id)?.classList.toggle('hidden', id !== viewId);
    });
    dom.navBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewId));
};

const parseTags = (value) => String(value || '')
    .split(',')
    .map((it) => it.trim())
    .filter(Boolean)
    .slice(0, 15);

const isTmdbCategory = (category) => ['movie', 'series', 'anime'].includes(category);

const getMediaLink = (item) => {
    if (item.media?.source === 'tmdb' && item.media.tmdbType && item.media.tmdbId) {
        return `https://www.themoviedb.org/${item.media.tmdbType}/${item.media.tmdbId}`;
    }
    if (item.media?.source === 'steam' && item.media.appId) {
        return `https://store.steampowered.com/app/${encodeURIComponent(item.media.appId)}`;
    }
    return '';
};

const getMediaPoster = (item) => item.media?.poster || '';

const buildPoster = (url, className) => {
    if (!url) return `<div class="${className}">无封面</div>`;
    return `<div class="${className}"><img src="${escapeHtml(url)}" alt="封面"></div>`;
};

const setActiveCategory = (category) => {
    state.activeCategory = category;
    document.body.dataset.categoryTheme = category;
    dom.categoryTabs.forEach((btn) => {
        const active = btn.dataset.category === category;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
    });
};

const clearDataPanels = () => {
    state.mediaResults = [];
    state.openSeasonEpisodes = [];
    state.currentEpisode = null;
    dom.mediaResults.innerHTML = '';
    setStatus(dom.mediaStatus, '');
    setStatus(dom.steamStatus, '');
    setStatus(dom.musicStatus, '');
};

const toggleDataSections = (category) => {
    dom.tmdbSection.classList.toggle('hidden', !isTmdbCategory(category));
    dom.steamSection.classList.toggle('hidden', category !== 'game');
    dom.musicSection.classList.toggle('hidden', category !== 'music');
    if (category !== 'game') dom.steamAppId.value = '';
};

const renderList = async () => {
    setStatus(dom.listStatus, '加载中...');
    dom.cardGrid.innerHTML = '';

    const items = await service.list({
        category: state.activeCategory,
        keyword: dom.searchInput.value,
        sortBy: dom.sortBy.value
    });

    if (!items.length) {
        setStatus(dom.listStatus, '暂无数据，请先新增一条记录。');
        return;
    }

    setStatus(dom.listStatus, `共 ${items.length} 条记录`);
    dom.cardGrid.innerHTML = items.map((item) => `
        <article class="card card--${item.category}" aria-label="${escapeHtml(item.title)}">
            ${buildPoster(getMediaPoster(item), 'card-poster')}
            <div class="card-body">
                <h3>${CATEGORY_ICONS[item.category] || '📚'} ${escapeHtml(item.title)}</h3>
                <div class="card-meta">${CATEGORY_LABELS[item.category] || item.category} · ${item.year || '未知年份'} · 评分 ${item.rating ?? '-'}</div>
                <div class="card-meta">来源：${escapeHtml(item.platform || '-')}</div>
                <div class="badges">${(item.tags || []).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>
                <button class="btn" type="button" data-action="view" data-id="${item.id}">查看详情</button>
            </div>
        </article>
    `).join('');
};

const buildRelationItems = async (item) => {
    const all = await service.list({ category: 'all', keyword: '', sortBy: 'updatedAt' });
    const others = all.filter((it) => it.id !== item.id);

    const samePlatform = others.filter((it) => it.platform && item.platform && it.platform === item.platform).slice(0, 8);
    const itemTags = new Set(item.tags || []);
    const sameTag = others.filter((it) => (it.tags || []).some((tag) => itemTags.has(tag))).slice(0, 8);

    const castSet = new Set(item.media?.cast || []);
    const sameCast = others.filter((it) => (it.media?.cast || []).some((cast) => castSet.has(cast))).slice(0, 8);

    const sameSeries = others.filter((it) => {
        if (item.media?.collection && it.media?.collection) return item.media.collection === it.media.collection;
        return item.media?.tmdbType === 'tv' && it.media?.tmdbType === 'tv' && item.category === it.category;
    }).slice(0, 8);

    return { samePlatform, sameTag, sameCast, sameSeries };
};

const renderDetail = async () => {
    const item = await service.getById(state.selectedId);
    if (!item) {
        setStatus(dom.listStatus, '记录不存在或已删除。', 'error');
        switchView('listView');
        await renderList();
        return;
    }

    const relations = await buildRelationItems(item);

    const seasonPanel = (item.media?.tmdbType === 'tv' && Array.isArray(item.media?.seasons) && item.media.seasons.length)
        ? `
            <section>
                <h3>剧 -> 季 -> 集页面</h3>
                <ul class="season-list">
                    ${item.media.seasons.map((season) => `
                        <li>
                            <strong>${escapeHtml(season.name || `第 ${season.seasonNumber} 季`)}</strong>
                            <span>共 ${season.episodeCount || 0} 集</span>
                            <button class="btn" type="button" data-action="open-season" data-season="${season.seasonNumber}">查看本季</button>
                        </li>
                    `).join('')}
                </ul>
            </section>
        `
        : '';

    const relationSection = (title, items) => `
        <section>
            <h3>${title}</h3>
            ${items.length ? `<ul class="relation-list">${items.map((it) => `<li><button class="link-btn" data-action="open-related" data-id="${it.id}">${escapeHtml(it.title)}</button></li>`).join('')}</ul>` : '<p class="muted">暂无</p>'}
        </section>
    `;

    dom.detailContent.innerHTML = `
        <ul class="detail-list">
            <li><strong>分类</strong>${CATEGORY_LABELS[item.category] || '-'}</li>
            <li><strong>标题</strong>${escapeHtml(item.title)}</li>
            <li><strong>评分</strong>${item.rating ?? '-'}</li>
            <li><strong>年份</strong>${item.year ?? '-'}</li>
            <li><strong>来源</strong>${escapeHtml(item.platform || '-')}</li>
            <li><strong>标签</strong>${(item.tags || []).map(escapeHtml).join(' / ') || '-'}</li>
            <li><strong>简介</strong>${escapeHtml(item.description || '-')}</li>
            <li><strong>ID</strong>${escapeHtml(item.id)}</li>
            <li><strong>外部链接</strong>${getMediaLink(item) ? `<a href="${getMediaLink(item)}" target="_blank" rel="noopener noreferrer">跳转来源页</a>` : '-'}</li>
            <li><strong>封面</strong>${getMediaPoster(item) ? `<a href="${escapeHtml(getMediaPoster(item))}" target="_blank" rel="noopener noreferrer">查看封面</a>` : '-'}</li>
            <li><strong>主要演员</strong>${(item.media?.cast || []).map(escapeHtml).join(' / ') || '-'}</li>
            <li><strong>更新时间</strong>${new Date(item.updatedAt).toLocaleString('zh-CN')}</li>
        </ul>
        ${seasonPanel}
        ${relationSection('同系列', relations.sameSeries)}
        ${relationSection('同演员', relations.sameCast)}
        ${relationSection('同标签', relations.sameTag)}
        ${relationSection('同平台', relations.samePlatform)}
    `;

    dom.detailContent.dataset.category = item.category || '';
};

const renderEpisodeView = (item, seasonInfo, episodeInfo = null) => {
    const episodes = seasonInfo?.episodes || [];
    const detailBlock = episodeInfo
        ? `
            <article class="episode-detail-box">
                <h3>第 ${episodeInfo.episodeNumber} 集：${escapeHtml(episodeInfo.name || '未命名')}</h3>
                <p>${escapeHtml(episodeInfo.overview || '暂无剧情简介')}</p>
                <p class="muted">播出：${escapeHtml(episodeInfo.airDate || '-')} · 评分：${episodeInfo.rating ?? '-'}</p>
                ${episodeInfo.still ? `<a href="${escapeHtml(episodeInfo.still)}" target="_blank" rel="noopener noreferrer">查看剧照</a>` : '<p class="muted">暂无剧照</p>'}
            </article>
        `
        : '';

    dom.episodeContent.innerHTML = `
        <h3>${escapeHtml(item.title)} · ${escapeHtml(seasonInfo.seasonName || '季详情')}</h3>
        <p>${escapeHtml(seasonInfo.seasonOverview || '暂无季简介')}</p>
        <ul class="episode-list">
            ${episodes.map((ep) => `
                <li>
                    <div>
                        <strong>第 ${ep.episodeNumber} 集：${escapeHtml(ep.name || '未命名')}</strong>
                        <p>${escapeHtml(ep.overview || '暂无剧情')}</p>
                        <p class="muted">播出：${escapeHtml(ep.airDate || '-')} · 评分：${ep.rating ?? '-'}</p>
                    </div>
                    <button class="btn" type="button" data-action="open-episode" data-season="${ep.seasonNumber}" data-episode="${ep.episodeNumber}">独立页面</button>
                </li>
            `).join('') || '<li>暂无剧集数据</li>'}
        </ul>
        ${detailBlock}
    `;
};

const fillForm = (item = null) => {
    dom.entryForm.reset();
    dom.entryForm.dataset.media = '';
    clearDataPanels();

    if (!item) {
        dom.entryId.value = '';
        const defaultCategory = state.activeCategory === 'all' ? '' : state.activeCategory;
        dom.entryCategory.value = defaultCategory;
        toggleDataSections(defaultCategory);
        return;
    }

    dom.entryId.value = item.id;
    dom.entryCategory.value = item.category;
    dom.entryTitle.value = item.title || '';
    dom.entryRating.value = item.rating ?? '';
    dom.entryYear.value = item.year ?? '';
    dom.entryPlatform.value = item.platform || '';
    dom.entryTags.value = (item.tags || []).join(', ');
    dom.entryDescription.value = item.description || '';
    dom.entryForm.dataset.media = item.media ? JSON.stringify(item.media) : '';
    toggleDataSections(item.category);
};

const validateEntry = (entry) => {
    if (!entry.category) return '请选择分类。';
    if (!entry.title?.trim()) return '请输入标题。';
    if (entry.rating != null && entry.rating !== '' && (Number(entry.rating) < 1 || Number(entry.rating) > 10)) return '评分范围应为 1-10。';
    if (entry.year != null && entry.year !== '' && (Number(entry.year) < 1900 || Number(entry.year) > 2100)) return '年份范围应为 1900-2100。';
    return '';
};

const openCreateView = () => {
    state.selectedId = null;
    fillForm(null);
    switchView('editorView');
};

const openEditView = async () => {
    if (!state.selectedId) return;
    const item = await service.getById(state.selectedId);
    if (!item) return;
    fillForm(item);
    switchView('editorView');
};

const exportEntries = () => {
    const items = service.read();
    if (!items.length) {
        setStatus(dom.listStatus, '当前没有可导出的记录。');
        return;
    }

    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(dom.listStatus, `导出成功，共 ${items.length} 条记录。`, 'success');
};

const importEntries = async (file) => {
    if (!file) return;
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const count = await service.importEntries(data);
        state.selectedId = null;
        switchView('listView');
        await renderList();
        setStatus(dom.listStatus, `导入成功，共 ${count} 条记录。`, 'success');
    } catch (error) {
        setStatus(dom.listStatus, String(error.message || '导入失败，请检查 JSON 文件。'), 'error');
    } finally {
        dom.importFileInput.value = '';
    }
};

const clearAllEntries = async () => {
    if (!window.confirm('确认删除全部记录吗？此操作不可恢复。')) return;
    await service.clearAll();
    state.selectedId = null;
    switchView('listView');
    await renderList();
    setStatus(dom.listStatus, '已删除全部记录。', 'success');
};

const handleMediaSearch = async () => {
    const title = dom.mediaTitle.value.trim();
    const year = dom.mediaYear.value;
    const category = dom.entryCategory.value;

    setStatus(dom.mediaStatus, '自动匹配 TMDB 中...');
    dom.mediaSearchBtn.disabled = true;

    const result = await service.searchMediaMatch({ title, year, category });
    state.mediaResults = result.results;
    dom.mediaSearchBtn.disabled = false;

    if (result.state === 'error' || result.state === 'empty') {
        dom.mediaResults.innerHTML = '';
        setStatus(dom.mediaStatus, result.message, result.state === 'error' ? 'error' : 'info');
        return;
    }

    setStatus(dom.mediaStatus, result.message, 'success');
    dom.mediaResults.innerHTML = result.results.map((item) => `
        <li class="imdb-item">
            ${buildPoster(item.poster, 'imdb-poster')}
            <div>
                <span class="imdb-source">TMDB ${escapeHtml(item.tmdbType.toUpperCase())}</span>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${item.year || '-'} · ID ${escapeHtml(item.externalId)} ${item.altTitle ? `· 原名 ${escapeHtml(item.altTitle)}` : ''}</p>
            </div>
            <button class="btn" type="button" data-action="fill-media" data-type="${item.tmdbType}" data-id="${item.externalId}">回填</button>
        </li>
    `).join('');
};

const fillFromTmdb = async (tmdbType, externalId) => {
    try {
        setStatus(dom.mediaStatus, '拉取详情中...');
        const detail = await service.getMediaDetail({ source: 'tmdb', tmdbType, externalId });

        dom.entryTitle.value = detail.title || dom.entryTitle.value;
        dom.entryYear.value = detail.year ?? dom.entryYear.value;
        dom.entryDescription.value = detail.description || dom.entryDescription.value;
        dom.entryRating.value = detail.rating ?? dom.entryRating.value;
        dom.entryPlatform.value = detail.platform || dom.entryPlatform.value;

        const mergedTags = parseTags(`${dom.entryTags.value},${detail.tags || ''}`);
        dom.entryTags.value = mergedTags.join(', ');

        dom.entryForm.dataset.media = JSON.stringify({
            source: 'tmdb',
            tmdbType: detail.tmdbType,
            tmdbId: Number(detail.externalId),
            poster: detail.poster,
            cast: detail.cast,
            collection: detail.collection,
            seasons: detail.seasons
        });

        setStatus(dom.mediaStatus, '已回填 TMDB 信息（ID 以 TMDB 为准）。', 'success');
    } catch (error) {
        setStatus(dom.mediaStatus, String(error.message || '获取详情失败。'), 'error');
    }
};

const handleSteamFetch = async () => {
    try {
        const appId = dom.steamAppId.value;
        setStatus(dom.steamStatus, '正在抓取 Steam...');
        const game = await service.fetchSteamDetail(appId);

        dom.entryTitle.value = game.title || dom.entryTitle.value;
        dom.entryYear.value = game.year ?? dom.entryYear.value;
        dom.entryDescription.value = game.description || dom.entryDescription.value;
        dom.entryPlatform.value = 'Steam';
        dom.entryTags.value = parseTags(`${dom.entryTags.value},${game.tags || ''}`).join(', ');

        dom.entryForm.dataset.media = JSON.stringify({
            source: 'steam',
            appId: game.appId,
            poster: game.poster
        });

        setStatus(dom.steamStatus, `Steam 抓取成功（AppID: ${game.appId}）。`, 'success');
    } catch (error) {
        setStatus(dom.steamStatus, `Steam 抓取失败：${String(error.message || '未知错误')}`, 'error');
    }
};

const handleMusicBulkImport = async () => {
    try {
        const count = await service.importNeteaseBulk(dom.musicBulkInput.value);
        dom.musicBulkInput.value = '';
        await renderList();
        setStatus(dom.musicStatus, `网易云批量导入成功，共 ${count} 条。`, 'success');
    } catch (error) {
        setStatus(dom.musicStatus, String(error.message || '导入失败'), 'error');
    }
};

const renderRssList = () => {
    const list = service.listRss();
    if (!list.length) {
        dom.rssList.innerHTML = '<li class="imdb-item">暂无订阅，请先添加 RSS。</li>';
        return;
    }

    dom.rssList.innerHTML = list.map((item) => `
        <li class="imdb-item rss-item">
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.url)}</p>
                <p class="muted">最近刷新：${new Date(item.updatedAt).toLocaleString('zh-CN')}</p>
                ${item.lastError ? `<p class="status-error">${escapeHtml(item.lastError)}</p>` : ''}
                ${(item.latestItems || []).length ? `<ul class="rss-entries">${item.latestItems.map((entry) => `<li>${entry.link ? `<a href="${escapeHtml(entry.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(entry.title)}</a>` : escapeHtml(entry.title)} ${entry.pubDate ? `<span class="muted">(${escapeHtml(entry.pubDate)})</span>` : ''}</li>`).join('')}</ul>` : '<p class="muted">暂无更新条目</p>'}
            </div>
            <button class="btn danger" type="button" data-action="remove-rss" data-id="${item.id}">删除</button>
        </li>
    `).join('');
};

const handleAddRss = () => {
    try {
        service.addRssSubscription({ title: dom.rssTitle.value, url: dom.rssUrl.value });
        dom.rssTitle.value = '';
        dom.rssUrl.value = '';
        renderRssList();
        setStatus(dom.rssStatus, 'RSS 订阅添加成功。', 'success');
    } catch (error) {
        setStatus(dom.rssStatus, String(error.message || '添加失败'), 'error');
    }
};

const handleRefreshRss = async () => {
    setStatus(dom.rssStatus, '正在刷新 RSS...');
    await service.refreshRssSubscriptions();
    renderRssList();
    setStatus(dom.rssStatus, 'RSS 刷新完成（若源站不支持跨域会显示失败信息）。', 'success');
};

const setupEvents = () => {
    dom.viewButtons.forEach((btn) => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    dom.createBtn.addEventListener('click', openCreateView);
    dom.exportBtn.addEventListener('click', exportEntries);
    dom.importBtn.addEventListener('click', () => {
        dom.importFileInput.value = '';
        dom.importFileInput.click();
    });

    dom.importFileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        await importEntries(file);
    });

    dom.clearAllBtn.addEventListener('click', clearAllEntries);

    [dom.searchInput, dom.sortBy].forEach((el) => {
        el.addEventListener('input', renderList);
        el.addEventListener('change', renderList);
    });

    dom.categoryTabs.forEach((tab) => {
        tab.addEventListener('click', async () => {
            setActiveCategory(tab.dataset.category);
            await renderList();
        });
    });

    dom.cardGrid.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action="view"]');
        if (!target) return;
        state.selectedId = target.dataset.id;
        await renderDetail();
        switchView('detailView');
    });

    dom.detailContent.addEventListener('click', async (event) => {
        const openRelated = event.target.closest('[data-action="open-related"]');
        if (openRelated) {
            state.selectedId = openRelated.dataset.id;
            await renderDetail();
            return;
        }

        const openSeason = event.target.closest('[data-action="open-season"]');
        if (openSeason) {
            const item = await service.getById(state.selectedId);
            if (!item?.media?.tmdbId) return;
            try {
                const seasonNumber = Number(openSeason.dataset.season);
                const seasonInfo = await service.getSeasonEpisodes(item.media.tmdbId, seasonNumber);
                state.openSeasonEpisodes = seasonInfo.episodes;
                state.currentEpisode = null;
                renderEpisodeView(item, seasonInfo, null);
                switchView('episodeView');
            } catch (error) {
                window.alert(`加载季信息失败：${String(error.message || '未知错误')}`);
            }
        }
    });

    dom.episodeContent.addEventListener('click', async (event) => {
        const openEpisode = event.target.closest('[data-action="open-episode"]');
        if (!openEpisode) return;

        const item = await service.getById(state.selectedId);
        if (!item?.media?.tmdbId) return;

        try {
            const seasonNumber = Number(openEpisode.dataset.season);
            const episodeNumber = Number(openEpisode.dataset.episode);
            const seasonInfo = await service.getSeasonEpisodes(item.media.tmdbId, seasonNumber);
            const episodeInfo = await service.getEpisodeDetail(item.media.tmdbId, seasonNumber, episodeNumber);
            renderEpisodeView(item, seasonInfo, episodeInfo);
        } catch (error) {
            window.alert(`加载集详情失败：${String(error.message || '未知错误')}`);
        }
    });

    dom.editBtn.addEventListener('click', openEditView);

    dom.deleteBtn.addEventListener('click', async () => {
        if (!state.selectedId) return;
        if (!window.confirm('确认删除这条记录吗？')) return;
        await service.remove(state.selectedId);
        state.selectedId = null;
        switchView('listView');
        await renderList();
        setStatus(dom.listStatus, '已删除记录。', 'success');
    });

    dom.entryCategory.addEventListener('change', () => {
        toggleDataSections(dom.entryCategory.value);
        clearDataPanels();
    });

    dom.mediaSearchBtn.addEventListener('click', handleMediaSearch);
    dom.mediaResults.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action="fill-media"]');
        if (!target) return;
        void fillFromTmdb(target.dataset.type, target.dataset.id);
    });

    dom.steamFetchBtn.addEventListener('click', handleSteamFetch);
    dom.musicBulkImportBtn.addEventListener('click', handleMusicBulkImport);

    dom.entryForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const entry = {
            id: dom.entryId.value || null,
            category: dom.entryCategory.value,
            title: dom.entryTitle.value.trim(),
            rating: dom.entryRating.value,
            year: dom.entryYear.value,
            platform: dom.entryPlatform.value.trim(),
            tags: parseTags(dom.entryTags.value),
            description: dom.entryDescription.value.trim(),
            media: dom.entryForm.dataset.media ? JSON.parse(dom.entryForm.dataset.media) : null
        };

        const validationError = validateEntry(entry);
        if (validationError) {
            setStatus(dom.mediaStatus, validationError, 'error');
            return;
        }

        await service.save(entry);
        setStatus(dom.mediaStatus, '保存成功。', 'success');
        switchView('listView');
        await renderList();
    });

    dom.entryForm.addEventListener('reset', () => {
        window.setTimeout(() => {
            dom.entryId.value = '';
            dom.entryForm.dataset.media = '';
            clearDataPanels();
        }, 0);
    });

    dom.addRssBtn.addEventListener('click', handleAddRss);
    dom.refreshRssBtn.addEventListener('click', () => {
        void handleRefreshRss();
    });

    dom.rssList.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action="remove-rss"]');
        if (!target) return;
        service.removeRssSubscription(target.dataset.id);
        renderRssList();
        setStatus(dom.rssStatus, '订阅已删除。', 'success');
    });
};

const runBasicFlowTests = () => {
    const testEntry = { category: 'movie', title: 'x', rating: 8.5, year: 2024 };
    console.assert(validateEntry(testEntry) === '', 'valid entry should pass');
    console.assert(validateEntry({ ...testEntry, rating: 11 }) !== '', 'invalid rating should fail');
    console.assert(parseTags('a, b ,,,c').length === 3, 'tags parser should trim and remove empty');
};

const init = async () => {
    document.getElementById('year').textContent = String(new Date().getFullYear());
    setActiveCategory('all');
    setupEvents();
    runBasicFlowTests();
    renderRssList();
    await renderList();
};

void init();
