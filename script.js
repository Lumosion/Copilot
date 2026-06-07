const CATEGORY_LABELS = {
    computer: '电脑',
    tv: '电视剧',
    anime: '番剧',
    music: '音乐',
    game: '游戏'
};

const STORAGE_KEY = 'content-tracker-v1';
const OMDB_ENDPOINT = 'https://www.omdbapi.com/';
const OMDB_API_KEY = 'thewdb';
const TMDB_ENDPOINT = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_ENDPOINT = 'https://image.tmdb.org/t/p/w342';
const TMDB_API_KEY = '';

const defaultEntries = [
    {
        id: crypto.randomUUID(),
        category: 'computer',
        title: 'MacBook Pro 14',
        rating: 8.8,
        year: 2023,
        platform: 'Apple',
        tags: ['办公', '开发'],
        description: 'M3 芯片，续航稳定。',
        imdb: null,
        createdAt: new Date('2026-01-01').toISOString(),
        updatedAt: new Date('2026-01-01').toISOString()
    },
    {
        id: crypto.randomUUID(),
        category: 'tv',
        title: 'Breaking Bad',
        rating: 9.7,
        year: 2008,
        platform: 'Netflix',
        tags: ['犯罪', '剧情'],
        description: '节奏紧凑，角色成长非常完整。',
        imdb: { imdbID: 'tt0903747', rating: '9.5' },
        createdAt: new Date('2026-01-02').toISOString(),
        updatedAt: new Date('2026-01-02').toISOString()
    },
    {
        id: crypto.randomUUID(),
        category: 'anime',
        title: '攻壳机动队 SAC',
        rating: 9.2,
        year: 2002,
        platform: 'Blu-ray',
        tags: ['科幻', '赛博朋克'],
        description: '哲学讨论与动作场面兼具。',
        imdb: null,
        createdAt: new Date('2026-01-03').toISOString(),
        updatedAt: new Date('2026-01-03').toISOString()
    },
    {
        id: crypto.randomUUID(),
        category: 'music',
        title: 'Random Access Memories',
        rating: 9.1,
        year: 2013,
        platform: 'Spotify',
        tags: ['电子', '专辑'],
        description: '编曲细节丰富，耐听。',
        imdb: null,
        createdAt: new Date('2026-01-04').toISOString(),
        updatedAt: new Date('2026-01-04').toISOString()
    },
    {
        id: crypto.randomUUID(),
        category: 'game',
        title: 'The Witcher 3',
        rating: 9.6,
        year: 2015,
        platform: 'Steam',
        tags: ['RPG', '开放世界'],
        description: '支线任务质量极高。',
        imdb: null,
        createdAt: new Date('2026-01-05').toISOString(),
        updatedAt: new Date('2026-01-05').toISOString()
    }
];

class ContentService {
    constructor(storageKey) {
        this.storageKey = storageKey;
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

    async list({ category = 'all', keyword = '', sortBy = 'updatedAt' } = {}) {
        let items = this.read();
        const keywordText = keyword.trim().toLowerCase();

        if (category !== 'all') {
            items = items.filter((it) => it.category === category);
        }

        if (keywordText) {
            items = items.filter((it) => {
                const blob = `${it.title} ${it.platform || ''} ${it.description || ''} ${(it.tags || []).join(' ')}`.toLowerCase();
                return blob.includes(keywordText);
            });
        }

        const sorted = [...items].sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title, 'zh-Hans-CN');
            if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        return sorted;
    }

    async getById(id) {
        return this.read().find((it) => it.id === id) || null;
    }

    async save(input) {
        const items = this.read();
        const now = new Date().toISOString();
        const tags = input.tags || [];
        const normalized = {
            ...input,
            tags,
            rating: input.rating === '' || input.rating == null ? null : Number(input.rating),
            year: input.year === '' || input.year == null ? null : Number(input.year),
            updatedAt: now
        };

        if (!normalized.id) {
            normalized.id = crypto.randomUUID();
            normalized.createdAt = now;
            items.unshift(normalized);
        } else {
            const index = items.findIndex((it) => it.id === normalized.id);
            if (index >= 0) {
                normalized.createdAt = items[index].createdAt;
                items[index] = normalized;
            } else {
                normalized.createdAt = now;
                items.unshift(normalized);
            }
        }

        this.write(items);
        return normalized;
    }

    async remove(id) {
        const items = this.read().filter((it) => it.id !== id);
        this.write(items);
    }

    async searchMediaMatch({ title, year, category }) {
        if (!title.trim()) {
            return { state: 'error', message: '请输入影视标题。', results: [] };
        }

        const [tmdbResults, imdbResults] = await Promise.all([
            this.searchTmdb({ title, year, category }),
            this.searchImdb({ title, year, category })
        ]);

        const merged = [];
        const seen = new Set();

        [...tmdbResults, ...imdbResults].forEach((item) => {
            const key = `${(item.title || '').trim().toLowerCase()}|${item.year || ''}`;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(item);
        });

        if (!merged.length) {
            return { state: 'empty', message: '未找到匹配结果。', results: [] };
        }

        const sourceSet = new Set(merged.map((item) => item.source.toUpperCase()));
        return {
            state: merged.length > 1 ? 'multiple' : 'single',
            message: `找到 ${merged.length} 个结果（${Array.from(sourceSet).join(' + ')}）。`,
            results: merged.slice(0, 8)
        };
    }

    async searchTmdb({ title, year, category }) {
        if (!TMDB_API_KEY || !shouldShowImdb(category)) return [];

        const params = new URLSearchParams({
            api_key: TMDB_API_KEY,
            query: title.trim(),
            language: 'zh-CN',
            include_adult: 'false'
        });

        if (year) params.set('first_air_date_year', String(year));

        try {
            const response = await fetch(`${TMDB_ENDPOINT}/search/tv?${params.toString()}`);
            if (!response.ok) return [];
            const data = await response.json();
            const rawResults = Array.isArray(data?.results) ? data.results : [];
            return rawResults.slice(0, 5).map((item) => ({
                source: 'tmdb',
                externalId: String(item.id),
                title: item.name || '',
                year: item.first_air_date ? Number(item.first_air_date.slice(0, 4)) || null : null,
                poster: item.poster_path ? `${TMDB_IMAGE_ENDPOINT}${item.poster_path}` : '',
                type: 'series'
            }));
        } catch {
            return [];
        }
    }

    async searchImdb({ title, year, category }) {
        if (!shouldShowImdb(category)) return [];

        const params = new URLSearchParams({
            apikey: OMDB_API_KEY,
            s: title.trim(),
            type: 'series'
        });

        if (year) params.set('y', String(year));

        try {
            const response = await fetch(`${OMDB_ENDPOINT}?${params.toString()}`);
            if (!response.ok) return [];

            const data = await response.json();
            if (data?.Error) return [];

            const rawResults = Array.isArray(data.Search) ? data.Search : [];
            if (rawResults.length === 0) return [];

            return rawResults.slice(0, 5).map((item) => ({
                source: 'imdb',
                externalId: item.imdbID,
                title: item.Title,
                year: Number(item.Year) || null,
                poster: item.Poster !== 'N/A' ? item.Poster : '',
                type: item.Type
            }));
        } catch {
            return [];
        }
    }

    async getMediaDetail(result) {
        if (result.source === 'tmdb') return this.getTmdbDetail(result.externalId);
        return this.getImdbDetail(result.externalId);
    }

    async getImdbDetail(imdbID) {
        const params = new URLSearchParams({ apikey: OMDB_API_KEY, i: imdbID, plot: 'short' });
        const response = await fetch(`${OMDB_ENDPOINT}?${params.toString()}`);
        if (!response.ok) throw new Error('network');

        const data = await response.json();
        if (data?.Error) throw new Error(data.Error);

        return {
            source: 'imdb',
            externalId: imdbID,
            title: data.Title || '',
            year: Number(data.Year) || null,
            description: data.Plot || '',
            rating: Number(data.imdbRating) || null,
            platform: data.Production || data.Writer || '',
            tags: [data.Genre, data.Director, data.Actors].filter(Boolean).join(', '),
            poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : ''
        };
    }

    async getTmdbDetail(tmdbId) {
        if (!TMDB_API_KEY) throw new Error('tmdb-api-key-missing');
        const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'zh-CN' });
        const response = await fetch(`${TMDB_ENDPOINT}/tv/${encodeURIComponent(tmdbId)}?${params.toString()}`);
        if (!response.ok) throw new Error('network');
        const data = await response.json();
        if (data?.success === false) throw new Error(data.status_message || 'tmdb-error');

        return {
            source: 'tmdb',
            externalId: String(tmdbId),
            title: data.name || '',
            year: data.first_air_date ? Number(data.first_air_date.slice(0, 4)) || null : null,
            description: data.overview || '',
            rating: Number(data.vote_average) || null,
            platform: '',
            tags: Array.isArray(data.genres) ? data.genres.map((it) => it.name).join(', ') : '',
            poster: data.poster_path ? `${TMDB_IMAGE_ENDPOINT}${data.poster_path}` : ''
        };
    }
}

const service = new ContentService(STORAGE_KEY);

const state = {
    activeView: 'listView',
    activeCategory: 'all',
    selectedId: null,
    imdbResults: []
};

const dom = {
    navBtns: document.querySelectorAll('.nav-btn'),
    viewButtons: document.querySelectorAll('[data-view]'),
    listStatus: document.getElementById('listStatus'),
    cardGrid: document.getElementById('cardGrid'),
    detailContent: document.getElementById('detailContent'),
    detailView: document.getElementById('detailView'),
    listView: document.getElementById('listView'),
    editorView: document.getElementById('editorView'),
    createBtn: document.getElementById('createBtn'),
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
    imdbSection: document.getElementById('imdbSection'),
    imdbTitle: document.getElementById('imdbTitle'),
    imdbYear: document.getElementById('imdbYear'),
    imdbStatus: document.getElementById('imdbStatus'),
    imdbResults: document.getElementById('imdbResults'),
    imdbSearchBtn: document.getElementById('imdbSearchBtn'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn')
};

const escapeHtml = (value = '') => value
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
    ['listView', 'detailView', 'editorView'].forEach((id) => {
        document.getElementById(id)?.classList.toggle('hidden', id !== viewId);
    });
    dom.navBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewId));
};

const parseTags = (value) => value
    .split(',')
    .map((it) => it.trim())
    .filter(Boolean)
    .slice(0, 10);

const shouldShowImdb = (category) => category === 'tv' || category === 'anime';

const getMediaMeta = (item) => item.imdb || null;

const getMediaSourceLabel = (item) => {
    const source = getMediaMeta(item)?.source || (getMediaMeta(item)?.imdbID ? 'imdb' : '');
    if (source === 'tmdb') return 'TMDB';
    if (source === 'imdb') return 'IMDb';
    return '-';
};

const getMediaExternalId = (item) => getMediaMeta(item)?.externalId || getMediaMeta(item)?.imdbID || '';

const getMediaLink = (item) => {
    const source = getMediaMeta(item)?.source || (getMediaMeta(item)?.imdbID ? 'imdb' : '');
    const externalId = getMediaExternalId(item);
    if (!source || !externalId) return '';
    if (source === 'tmdb') return `https://www.themoviedb.org/tv/${encodeURIComponent(externalId)}`;
    return `https://www.imdb.com/title/${encodeURIComponent(externalId)}/`;
};

const getMediaPoster = (item) => getMediaMeta(item)?.poster || '';

const buildPoster = (url, className) => {
    if (!url) return `<div class="${className}">无封面</div>`;
    return `<div class="${className}"><img src="${escapeHtml(url)}" alt="封面"></div>`;
};

const getCategoryFlowText = (item) => {
    const platform = escapeHtml(item.platform || '未填写');
    if (item.category === 'computer') return `设备品牌：${platform}`;
    if (item.category === 'music') return `收听渠道：${platform}`;
    if (item.category === 'game') return `游戏平台：${platform}`;
    return `播放平台：${platform}`;
};

const setActiveCategory = (category) => {
    state.activeCategory = category;
    dom.categoryTabs.forEach((btn) => {
        const active = btn.dataset.category === category;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
    });
};

const clearImdbPanel = () => {
    state.imdbResults = [];
    if (dom.imdbResults) dom.imdbResults.innerHTML = '';
    setStatus(dom.imdbStatus, '');
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
        <article class="card" aria-label="${escapeHtml(item.title)}">
            ${buildPoster(getMediaPoster(item), 'card-poster')}
            <div class="card-body">
                <h3>${escapeHtml(item.title)}</h3>
                <div class="card-meta">${CATEGORY_LABELS[item.category] || item.category} · ${item.year || '未知年份'} · 评分 ${item.rating ?? '-'}</div>
                <div class="card-meta">${getCategoryFlowText(item)}</div>
                <div class="badges">${(item.tags || []).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>
                <button class="btn" type="button" data-action="view" data-id="${item.id}">查看详情</button>
            </div>
        </article>
    `).join('');
};

const renderDetail = async () => {
    const item = await service.getById(state.selectedId);
    if (!item) {
        setStatus(dom.listStatus, '记录不存在或已删除。', 'error');
        switchView('listView');
        await renderList();
        return;
    }

    dom.detailContent.innerHTML = `
        <ul class="detail-list">
            <li><strong>分类</strong>${CATEGORY_LABELS[item.category] || '-'}</li>
            <li><strong>标题</strong>${escapeHtml(item.title)}</li>
            <li><strong>评分</strong>${item.rating ?? '-'}</li>
            <li><strong>年份</strong>${item.year ?? '-'}</li>
            <li><strong>平台</strong>${escapeHtml(item.platform || '-')}</li>
            <li><strong>标签</strong>${(item.tags || []).map(escapeHtml).join(' / ') || '-'}</li>
            <li><strong>简介</strong>${escapeHtml(item.description || '-')}</li>
            <li><strong>来源</strong>${getMediaSourceLabel(item)}</li>
            <li><strong>媒体链接</strong>${getMediaLink(item) ? `<a href="${getMediaLink(item)}" target="_blank" rel="noopener noreferrer">${escapeHtml(getMediaExternalId(item))}</a>` : '-'}</li>
            <li><strong>封面</strong>${getMediaPoster(item) ? `<a href="${escapeHtml(getMediaPoster(item))}" target="_blank" rel="noopener noreferrer">查看封面</a>` : '-'}</li>
            <li><strong>更新时间</strong>${new Date(item.updatedAt).toLocaleString('zh-CN')}</li>
        </ul>
    `;
};

const fillForm = (item = null) => {
    dom.entryForm.reset();
    clearImdbPanel();

    if (!item) {
        dom.entryId.value = '';
        const defaultCategory = state.activeCategory === 'all' ? '' : state.activeCategory;
        dom.entryCategory.value = defaultCategory;
        dom.imdbSection.classList.toggle('hidden', !shouldShowImdb(defaultCategory));
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
    dom.entryForm.dataset.imdb = item.imdb ? JSON.stringify(item.imdb) : '';
    dom.imdbSection.classList.toggle('hidden', !shouldShowImdb(item.category));
};

const validateEntry = (entry) => {
    if (!entry.category) return '请选择分类。';
    if (!entry.title?.trim()) return '请输入标题。';
    if (entry.rating != null && entry.rating !== '' && (Number(entry.rating) < 1 || Number(entry.rating) > 10)) {
        return '评分范围应为 1-10。';
    }
    if (entry.year != null && entry.year !== '' && (Number(entry.year) < 1900 || Number(entry.year) > 2100)) {
        return '年份范围应为 1900-2100。';
    }
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

const handleImdbSearch = async () => {
    const title = dom.imdbTitle.value.trim();
    const year = dom.imdbYear.value;
    const category = dom.entryCategory.value;

    setStatus(dom.imdbStatus, '自动匹配 TMDB / IMDb 中...');
    dom.imdbSearchBtn.disabled = true;

    const result = await service.searchMediaMatch({ title, year, category });
    state.imdbResults = result.results;
    dom.imdbSearchBtn.disabled = false;

    if (result.state === 'error') {
        dom.imdbResults.innerHTML = '';
        setStatus(dom.imdbStatus, result.message, 'error');
        return;
    }

    if (result.state === 'empty') {
        dom.imdbResults.innerHTML = '';
        setStatus(dom.imdbStatus, result.message);
        return;
    }

    setStatus(dom.imdbStatus, result.message, 'success');
    dom.imdbResults.innerHTML = result.results.map((item) => `
        <li class="imdb-item">
            ${buildPoster(item.poster, 'imdb-poster')}
            <div>
                <span class="imdb-source">${item.source.toUpperCase()}</span>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${item.year || '-'} · ${escapeHtml(item.externalId)}</p>
            </div>
            <button class="btn" type="button" data-action="fill-imdb" data-source="${item.source}" data-external-id="${item.externalId}">回填</button>
        </li>
    `).join('');
};

const fillFromImdb = async (source, externalId) => {
    try {
        setStatus(dom.imdbStatus, '拉取详情中...');
        const detail = await service.getMediaDetail({ source, externalId });

        dom.entryTitle.value = detail.title || dom.entryTitle.value;
        dom.entryYear.value = detail.year ?? dom.entryYear.value;
        dom.entryDescription.value = detail.description || dom.entryDescription.value;
        dom.entryRating.value = detail.rating ?? dom.entryRating.value;
        dom.entryPlatform.value = detail.platform || dom.entryPlatform.value;

        const mergedTags = parseTags(`${dom.entryTags.value},${detail.tags || ''}`);
        dom.entryTags.value = mergedTags.join(', ');

        dom.entryForm.dataset.imdb = JSON.stringify({
            source: detail.source,
            externalId: detail.externalId,
            poster: detail.poster,
            rating: String(detail.rating || '')
        });
        setStatus(dom.imdbStatus, `已回填 ${detail.source.toUpperCase()} 信息。`, 'success');
    } catch (error) {
        const message = String(error.message || '').toLowerCase().includes('tmdb-api-key-missing')
            ? '请先在 script.js 中配置 TMDB_API_KEY。'
            : '获取详情失败。';
        setStatus(dom.imdbStatus, message, 'error');
    }
};

const setupEvents = () => {
    dom.viewButtons.forEach((btn) => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    dom.createBtn.addEventListener('click', openCreateView);

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
        const show = shouldShowImdb(dom.entryCategory.value);
        dom.imdbSection.classList.toggle('hidden', !show);
        if (!show) clearImdbPanel();
    });

    dom.imdbSearchBtn.addEventListener('click', handleImdbSearch);

    dom.imdbResults.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action="fill-imdb"]');
        if (!target) return;
        void fillFromImdb(target.dataset.source, target.dataset.externalId);
    });

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
            imdb: dom.entryForm.dataset.imdb ? JSON.parse(dom.entryForm.dataset.imdb) : null
        };

        const validationError = validateEntry(entry);
        if (validationError) {
            setStatus(dom.imdbStatus, validationError, 'error');
            return;
        }

        await service.save(entry);
        setStatus(dom.imdbStatus, '保存成功。', 'success');
        switchView('listView');
        await renderList();
    });

    dom.entryForm.addEventListener('reset', () => {
        window.setTimeout(() => {
            dom.entryId.value = '';
            dom.entryForm.dataset.imdb = '';
            clearImdbPanel();
        }, 0);
    });
};

const runBasicFlowTests = () => {
    const testEntry = { category: 'tv', title: 'x', rating: 8.5, year: 2024 };
    console.assert(validateEntry(testEntry) === '', 'valid entry should pass');
    console.assert(validateEntry({ ...testEntry, rating: 11 }) !== '', 'invalid rating should fail');
    console.assert(parseTags('a, b ,,,c').length === 3, 'tags parser should trim and remove empty');
};

const init = async () => {
    document.getElementById('year').textContent = String(new Date().getFullYear());
    setActiveCategory('all');
    setupEvents();
    runBasicFlowTests();
    await renderList();
};

void init();
