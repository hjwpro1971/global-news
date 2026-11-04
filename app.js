/**
 * GLOBAL MACRO NEWS - 광범위 수집 + 중요도 스크리닝
 *
 * Features:
 * - Broad RSS collection -> cheap single Gemini screening call -> ranked shortlist
 *   (news_shortlist). No deep per-article financial-impact analysis.
 * - Real-time World Market Clocks (New York, Seoul)
 * - Domestic (국내) Top-10 shortlist via a separate, equally lightweight pipeline
 */

// ==========================================================================
// 1. SOURCE LINK HELPERS
// ==========================================================================

const GLOBAL_FINANCIAL_OUTLETS = {
    "Reuters Financial": "https://www.reuters.com/markets/",
    "Reuters": "https://www.reuters.com/markets/",
    "Ministry of Trade, Industry and Energy": "https://www.motie.go.kr",
    "Bloomberg Terminals": "https://www.bloomberg.com/markets",
    "Bloomberg": "https://www.bloomberg.com/markets",
    "Wall Street Journal": "https://www.wsj.com/news/markets",
    "Financial Times": "https://www.ft.com/markets",
    "S&P Global Commodities": "https://www.spglobal.com/commodityinsights/en",
    "S&P Global": "https://www.spglobal.com/commodityinsights/en",
    "TradeWinds Shipping": "https://www.tradewindsnews.com/",
    "TradeWinds": "https://www.tradewindsnews.com/",
    "CNBC Market Data": "https://www.cnbc.com/markets/",
    "CNBC": "https://www.cnbc.com/markets/",
    "Nikkei Asia": "https://asia.nikkei.com/Economy/",
    "EE Times": "https://www.eetimes.com/"
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getNewsUrl(news) {
    if (!news) return "https://www.reuters.com/markets/";
    
    // 1. If we have a specific direct article URL (from RSS or dataset), USE IT FIRST!
    if (news.url && news.url.startsWith('http')) {
        return news.url;
    }

    // 2. Otherwise, fallback to the official homepage of the source
    if (GLOBAL_FINANCIAL_OUTLETS[news.source]) {
        return GLOBAL_FINANCIAL_OUTLETS[news.source];
    }
    
    // Match by source name string
    const sourceStr = (news.source || "").toLowerCase();
    if (sourceStr.includes('reuters')) return "https://www.reuters.com/markets/";
    if (sourceStr.includes('bloomberg')) return "https://www.bloomberg.com/markets";
    if (sourceStr.includes('journal') || sourceStr.includes('wsj')) return "https://www.wsj.com/news/markets";
    if (sourceStr.includes('financial times') || sourceStr.includes('ft')) return "https://www.ft.com/markets";
    if (sourceStr.includes('cnbc')) return "https://www.cnbc.com/markets/";
    if (sourceStr.includes('nikkei')) return "https://asia.nikkei.com/Economy/";
    if (sourceStr.includes('spglobal') || sourceStr.includes('s&p')) return "https://www.spglobal.com/commodityinsights/en";
    if (sourceStr.includes('trade')) return "https://www.tradewindsnews.com/";
    if (sourceStr.includes('motie') || sourceStr.includes('ministry')) return "https://www.motie.go.kr";
    
    // 3. If source is unknown and no URL, fallback to searching the article title on Google News
    const searchTitle = news.titleEn && news.titleEn !== "No Title" ? news.titleEn : news.titleKr;
    if (searchTitle && searchTitle !== "No Title") {
        return `https://news.google.com/search?q=${encodeURIComponent(searchTitle)}`;
    }
    
    return "https://www.reuters.com/markets/";
}

// ==========================================================================
// 2. GLOBAL MARKET CLOCKS CONTROLLER
// ==========================================================================

function startGlobalMarketClocks() {
    function updateClocks() {
        const now = new Date();

        // New York Time (EDT / UTC-4)
        const nyOptions = { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const nyTimeStr = new Intl.DateTimeFormat('en-US', nyOptions).format(now);
        const nyHour = parseInt(nyTimeStr.split(':')[0], 10);
        document.getElementById('time-ny').textContent = `${nyTimeStr} EDT`;
        
        // NY Stock Market Open: 09:30 - 16:00
        const isNyOpen = nyHour >= 9 && nyHour < 16;
        updateMarketStatusBadge('status-ny', isNyOpen);

        // London Time (BST / UTC+1)
        const londonOptions = { timeZone: 'Europe/London', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const londonTimeStr = new Intl.DateTimeFormat('en-GB', londonOptions).format(now);
        const londonHour = parseInt(londonTimeStr.split(':')[0], 10);
        const timeLondonEl = document.getElementById('time-london');
        if (timeLondonEl) timeLondonEl.textContent = `${londonTimeStr} BST`;
        
        // London Stock Market Open: 08:00 - 16:30
        const isLondonOpen = londonHour >= 8 && londonHour < 16;
        if (document.getElementById('status-london')) updateMarketStatusBadge('status-london', isLondonOpen);

        // Seoul Time (KST / UTC+9)
        const seoulOptions = { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const seoulTimeStr = new Intl.DateTimeFormat('ko-KR', seoulOptions).format(now);
        const seoulHour = parseInt(seoulTimeStr.split(':')[0], 10);
        document.getElementById('time-seoul').textContent = `${seoulTimeStr} KST`;
        
        // Seoul KOSPI Open: 09:00 - 15:30
        const isSeoulOpen = seoulHour >= 9 && seoulHour < 15;
        updateMarketStatusBadge('status-seoul', isSeoulOpen);
    }

    updateClocks();
    setInterval(updateClocks, 1000);
}

function updateMarketStatusBadge(elementId, isOpen) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isOpen) {
        el.textContent = "OPEN";
        el.className = "market-status status-open";
    } else {
        el.textContent = "CLOSED";
        el.className = "market-status status-closed";
    }
}

// ==========================================================================
// 3. APPLICATION STATE MANAGEMENT & FILTER ENGINE
// ==========================================================================

const appState = {
    isSimulating: false,
    // [2026-09-02] Tracks which content currently occupies #shortlist-section - 'shortlist'
    // (default, news_shortlist via get-shortlist.js) or 'domestic' (국내뉴스 TOP 10 via
    // /api/domestic-news). See toggleDomesticNewsPanel().
    shortlistPanelMode: 'shortlist',
    // [2026-09-02] Manual toggle via the logo icon (GLOBAL MACRO News 앞 아이콘) - user
    // request: clicking 국내뉴스/해외뉴스 every time was burning through Gemini API calls,
    // so collection is now gated behind an explicit switch instead of firing on every
    // button click. false (blue) = read-only, buttons just show the last saved DB result.
    // true (red) = the next button click actually re-collects and saves. No auto-timeout -
    // stays in whichever state the user last set it to, persisted across reloads.
    collectMode: localStorage.getItem('collect_mode') === 'true'
};

// ==========================================================================
// 6. PIPELINE SIMULATION CONSOLE ENGINE & LIVE RSS INTEGRATION
// ==========================================================================

// ── 뉴스분석 버튼의 진행 상태 표시 ──
// Gemini 호출이 2회(스크리닝 + 심층분석) 순차로 일어나 전체가 1~3분 걸린다.
// 그 동안 버튼 문구가 "불러오는 중..."으로 고정돼 있으면 멈춘 것과 구분되지 않는다.
// 단계 문구는 updateConsoleProgress()의 percent에서 파생시켜, 호출부를 건드리지 않고
// 파이프라인 전 구간이 자동으로 반영되게 한다.
let _pipelineStageLabel = '';   // 현재 단계 문구 (타이머가 매초 다시 그린다)
let _pipelineTimerId = null;    // 경과시간 타이머 핸들
let _pipelineStartedAt = 0;

function _stageLabelFor(percent) {
    if (percent >= 100) return '💾 저장 중';
    if (percent >= 60)  return '🤖 AI 뉴스 분석 중';
    if (percent >= 30)  return '📡 뉴스 수집 중';
    return '🔍 캐시 확인 중';
}

function _renderRunBtnProgress() {
    const runBtn = document.getElementById('btn-run-simulation');
    if (!runBtn || !_pipelineStageLabel) return;
    const sec = Math.floor((Date.now() - _pipelineStartedAt) / 1000);
    const mmss = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${_pipelineStageLabel} ${mmss}`;
}

// 경과시간을 매초 갱신한다 — 초가 계속 올라가면 응답이 없어도 "살아있다"가 보인다.
function startRunBtnProgress() {
    _pipelineStartedAt = Date.now();
    _pipelineStageLabel = _stageLabelFor(0);
    stopRunBtnProgress(false);
    _pipelineTimerId = setInterval(_renderRunBtnProgress, 1000);
    _renderRunBtnProgress();
}

function stopRunBtnProgress(clearLabel = true) {
    if (_pipelineTimerId) { clearInterval(_pipelineTimerId); _pipelineTimerId = null; }
    if (clearLabel) _pipelineStageLabel = '';
}

function updateConsoleProgress(percent, msg) {
    const progressBar = document.getElementById('pipeline-progress-bar');
    const consoleTerminal = document.getElementById('console-terminal');
    if (progressBar) progressBar.style.width = percent + "%";
    if (consoleTerminal && msg) {
        const line = document.createElement('div');
        line.className = 'log-line info';
        line.textContent = msg;
        consoleTerminal.appendChild(line);
        if (consoleTerminal) consoleTerminal.scrollTop = consoleTerminal.scrollHeight;
    }
    // 파이프라인이 도는 중일 때만 버튼을 갱신한다 (타이머가 없으면 무시).
    if (_pipelineTimerId) {
        _pipelineStageLabel = _stageLabelFor(percent);
        _renderRunBtnProgress();
    }
}

// 🔒 [2026-11-05] 딥분석(news_impacts, Gemini Pro 단가 호출) 파이프라인 전체 제거 -
// 해외뉴스 버튼은 이제 항상 스크리닝 숏리스트(news_shortlist, 저렴한 Gemini 호출 1회,
// get-shortlist.js)만 읽는다. 유료 재수집 트리거(/api/analyze-news, /api/news-rss)는
// 더 이상 프론트에서 호출하지 않는다 - 수집 자체는 cron-update-news.js가 매일 자동으로
// 돌리고, 이 버튼은 그 결과를 읽기만 한다.
function runPipelineSimulation() {
    appState.shortlistPanelMode = 'shortlist';
    const domesticBtn = document.getElementById('btn-domestic-news');
    if (domesticBtn) domesticBtn.classList.remove('active-toggle');
    const overseasBtn = document.getElementById('btn-run-simulation');
    if (overseasBtn) overseasBtn.classList.add('active-toggle');
    const titleEl = document.getElementById('shortlist-section-title');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-newspaper"></i> 오늘의 선별 뉴스';
    fetchAndRenderShortlist();
}

// ==========================================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function initEventListeners() {
    const mobileFilterBtn = document.getElementById('btn-mobile-filter');
    const closeSidebarBtn = document.getElementById('btn-close-sidebar');
    const mobileDrawerBackdrop = document.getElementById('mobile-drawer-backdrop');
    const sidebarEl = document.getElementById('app-sidebar');

    function openMobileDrawer() {
        if (sidebarEl) sidebarEl.classList.add('mobile-open');
        if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileDrawer() {
        if (sidebarEl) sidebarEl.classList.remove('mobile-open');
        if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', openMobileDrawer);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileDrawer);
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);

    const runSimBtn = document.getElementById('btn-run-simulation');
    if (runSimBtn) {
        runSimBtn.addEventListener('click', runPipelineSimulation);
    }

    const domesticNewsBtn = document.getElementById('btn-domestic-news');
    if (domesticNewsBtn) {
        domesticNewsBtn.addEventListener('click', toggleDomesticNewsPanel);
    }

    // Toss Macro Modal Event Listeners
    // [2026-09-02] btn-open-toss-macro-modal was renamed/moved to clock-macro (now a
    // clock-card in market-clocks-bar with an inline onclick="openTossMacroModal()" in
    // index.html) - this lookup is now a harmless no-op kept for the close handlers below.
    const openTossBtn = document.getElementById('btn-open-toss-macro-modal');
    const closeTossBtn = document.getElementById('toss-modal-close');
    const closeTossFooterBtn = document.getElementById('toss-modal-footer-close');
    const tossModal = document.getElementById('toss-macro-modal');

    if (openTossBtn) openTossBtn.addEventListener('click', openTossMacroModal);
    if (closeTossBtn) closeTossBtn.addEventListener('click', closeTossMacroModal);
    if (closeTossFooterBtn) closeTossFooterBtn.addEventListener('click', closeTossMacroModal);
    if (tossModal) {
        tossModal.addEventListener('click', (e) => {
            if (e.target === tossModal) closeTossMacroModal();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTossMacroModal();
            closeMobileDrawer();
        }
    });
}

// ==========================================================================
// 8. TOSS 100% LIVE MACRO API INTEGRATION
// Endpoint: https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart
// ==========================================================================

const TOSS_MACRO_MAPPING = [
    { code: 'KGG01P', name: '코스피', symbol: 'KOSPI', type: 'index' },
    { code: 'QGG01P', name: '코스닥', symbol: 'KOSDAQ', type: 'index' },
    { code: 'EXCHANGE_RATE', name: '원/달러 환율', symbol: 'USD/KRW', type: 'fx' },
    { code: 'COMP.NAI', name: '나스닥', symbol: 'NASDAQ', type: 'index' },
    { code: 'SPX.CBI', name: 'S&P 500', symbol: 'S&P 500', type: 'index' },
    { code: 'SOX.NAI', name: '필라델피아 반도체', symbol: 'SOX', type: 'index' },
    { code: 'DJI.DJI', name: '다우', symbol: 'DOW', type: 'index' },
    { code: 'ROB.US10YT-RR', name: '미 10년채', symbol: 'US 10Y', type: 'bond' },
    { code: 'ROB.US2YT-RR', name: '미 2년채', symbol: 'US 2Y', type: 'bond' },
    { code: 'RGI..DXY', name: '달러인덱스', symbol: 'DXY', type: 'index' },
    { code: 'RGI..VIX', name: 'VIX 변동성지수', symbol: 'VIX', type: 'index' },
    { code: 'RFU.CLv1', name: 'WTI 원유', symbol: 'WTI', type: 'commodity' },
    { code: 'RFU.GCv1', name: '금 (Gold)', symbol: 'Gold', type: 'commodity' },
    { code: 'RFU.NQc1', name: '나스닥 선물', symbol: 'NQ Futures', type: 'futures' },
    { code: 'RFU.ESc1', name: 'S&P500 선물', symbol: 'ES Futures', type: 'futures' }
];


/**
 * Searches for an indicator item inside Toss API indexMap structure (categories or direct object keys).
 */
function findTossIndicatorItem(indexMap, code) {
    if (!indexMap) return null;

    if (indexMap[code]) return indexMap[code];

    for (const categoryKey in indexMap) {
        const categoryVal = indexMap[categoryKey];
        if (Array.isArray(categoryVal)) {
            const match = categoryVal.find(item => 
                item && (item.code === code || item.symbol === code || item.id === code)
            );
            if (match) return match;
        } else if (typeof categoryVal === 'object' && categoryVal !== null) {
            if (categoryVal.code === code || categoryVal.symbol === code) return categoryVal;
            for (const subKey in categoryVal) {
                const subItem = categoryVal[subKey];
                if (subItem && (subItem.code === code || subItem.symbol === code)) return subItem;
            }
        }
    }
    return null;
}

/**
 * Fetches real-time Toss Macro Indicators and updates the header ticker bar.
 * 100% Real-time Toss API values - FALLBACK_MACRO_DATA completely removed.
 */
/**
 * Fetches real-time Toss Macro Indicators (Triggered on site load & modal click).
 * 100% Real-time Toss API values - FALLBACK_MACRO_DATA completely removed.
 * No 15-second auto-polling interval per user request.
 */
async function fetchTossMacroIndicators() {
    const updateTimeEl = document.getElementById('toss-macro-update-time');
    const modalUpdateTimeEl = document.getElementById('toss-modal-update-time');
    if (updateTimeEl) updateTimeEl.textContent = '수집 중...';

    let indexMap = null;
    let isLive = false;

    try {
        let response;
        try {
            response = await fetch('/api/toss-macro');
            if (!response.ok) {
                response = await fetch('https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart');
            }
        } catch (e) {
            response = await fetch('https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart');
        }

        if (response && response.ok) {
            const data = await response.json();
            if (data && data.result && data.result.indexMap) {
                indexMap = data.result.indexMap;
                isLive = true;
            } else if (data && data.indexMap) {
                indexMap = data.indexMap;
                isLive = true;
            }
        }
    } catch (err) {
        console.error('[Toss Live Macro API Error]', err.message);
    }

    if (!indexMap) {
        if (updateTimeEl) updateTimeEl.textContent = 'API 연결 대기 중...';
        return;
    }

    const macroList = TOSS_MACRO_MAPPING.map(config => {
        const item = findTossIndicatorItem(indexMap, config.code);
        let latestPrice = 0;
        let basePrice = 0;
        let changeType = 'EVEN';

        if (item) {
            // Strictly reference item.price.latestPrice, item.price.basePrice, item.price.changeType from Toss API
            const p = item.price || item;
            const rawLatest = (item.price && item.price.latestPrice !== undefined) ? item.price.latestPrice : (p.latestPrice ?? p.closePrice ?? p.price);
            const rawBase = (item.price && item.price.basePrice !== undefined) ? item.price.basePrice : (p.basePrice ?? p.prevClose ?? p.base_price);
            const rawChange = (item.price && item.price.changeType) || p.changeType || 'EVEN';

            if (rawLatest !== undefined && rawLatest !== null && !isNaN(parseFloat(rawLatest))) {
                latestPrice = parseFloat(rawLatest);
            }
            if (rawBase !== undefined && rawBase !== null && !isNaN(parseFloat(rawBase))) {
                basePrice = parseFloat(rawBase);
            }
            changeType = rawChange;
        }

        if (!latestPrice || isNaN(latestPrice)) {
            return null;
        }

        const priceDiff = latestPrice - basePrice;
        const changeRate = (basePrice && basePrice > 0)
            ? ((latestPrice - basePrice) / basePrice * 100)
            : 0;

        if (changeType === 'EVEN') {
            if (priceDiff > 0) changeType = 'RISE';
            else if (priceDiff < 0) changeType = 'FALL';
            else changeType = 'EVEN';
        }

        return {
            code: config.code,
            name: config.name,
            symbol: config.symbol,
            type: config.type,
            latestPrice,
            basePrice,
            priceDiff,
            changeRate,
            changeType
        };
    }).filter(Boolean);

    if (isLive && macroList.length > 0) {
        console.log('[Toss Live Macro API Success] 토스 실시간 데이터가 100% 성공적으로 바인딩되었습니다.');
    }

    renderTossMacroTickerBar(macroList, isLive);

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}시 ${minutes}분`;
    if (updateTimeEl) updateTimeEl.textContent = timeStr;
    if (modalUpdateTimeEl) modalUpdateTimeEl.textContent = timeStr;
}

/**
 * Opens and closes Toss Macro Fullscreen Modal
 */
function openTossMacroModal() {
    const modal = document.getElementById('toss-macro-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    fetchTossMacroIndicators().catch(err => console.error('[Toss Macro Fetch Error]', err));
}

function closeTossMacroModal() {
    const modal = document.getElementById('toss-macro-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Expose globally for inline onclick handlers
window.openTossMacroModal = openTossMacroModal;
window.closeTossMacroModal = closeTossMacroModal;

/**
 * [2026-09-02] Reworked from a modal (openDomesticNewsModal) into an in-place toggle on
 * the #shortlist-section panel, per user request - "국내뉴스" now behaves like "뉴스분석":
 * clicking it replaces the panel's content instead of opening a separate overlay.
 * appState.shortlistPanelMode tracks which content currently owns the panel so
 * fetchAndRenderShortlist() (called after a pipeline run, or on page load) doesn't
 * clobber a domestic-news view the user explicitly switched to, and vice versa.
 */
// [2026-09-04] active-toggle now also applied to btn-run-simulation (해외뉴스) so exactly
// one of the two buttons is always visually highlighted as "this is what the panel is
// showing" - previously only btn-domestic-news ever got the class, so 해외뉴스 looked
// identical whether or not its content was on screen.
async function toggleDomesticNewsPanel() {
    const domesticBtn = document.getElementById('btn-domestic-news');
    const overseasBtn = document.getElementById('btn-run-simulation');
    const titleEl = document.getElementById('shortlist-section-title');

    if (appState.shortlistPanelMode === 'domestic') {
        // Switch back to the regular shortlist view.
        appState.shortlistPanelMode = 'shortlist';
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-newspaper"></i> 오늘의 선별 뉴스';
        if (domesticBtn) domesticBtn.classList.remove('active-toggle');
        if (overseasBtn) overseasBtn.classList.add('active-toggle');
        fetchAndRenderShortlist();
        return;
    }

    appState.shortlistPanelMode = 'domestic';
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-newspaper"></i> 국내뉴스 TOP 10 (24시간 파급력)';
    if (domesticBtn) domesticBtn.classList.add('active-toggle');
    if (overseasBtn) overseasBtn.classList.remove('active-toggle');
    await fetchAndRenderDomesticNews();
}

window.toggleDomesticNewsPanel = toggleDomesticNewsPanel;

async function fetchAndRenderDomesticNews() {
    const gridEl = document.getElementById('shortlist-grid');
    const noResultsEl = document.getElementById('shortlist-no-results');
    const countBadge = document.getElementById('shortlist-count-badge');
    if (!gridEl) return;

    // [2026-09-02] Gated behind the logo-icon toggle (appState.collectMode) - red re-runs
    // the live pipeline (/api/domestic-news, spends Gemini calls); blue just reads back
    // whatever was last saved (/api/get-domestic-news, no API cost). See toggleCollectMode().
    const endpoint = appState.collectMode ? '/api/domestic-news' : '/api/get-domestic-news';
    gridEl.innerHTML = appState.collectMode
        ? `<div class="ticker-loading"><i class="fa-solid fa-spinner fa-spin text-blue"></i> 국내 경제지 24시간 뉴스 분석 중...</div>`
        : `<div class="ticker-loading"><i class="fa-solid fa-spinner fa-spin text-blue"></i> 저장된 국내뉴스 불러오는 중...</div>`;
    if (noResultsEl) noResultsEl.classList.add('hidden');

    try {
        const resp = await fetch(endpoint);
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || `HTTP ${resp.status}`);

        // Bail out if the user switched back to the shortlist view while this was loading.
        if (appState.shortlistPanelMode !== 'domestic') return;

        const items = data.items || [];
        if (countBadge) countBadge.textContent = items.length + '개';

        if (items.length === 0) {
            gridEl.innerHTML = '';
            if (noResultsEl) {
                noResultsEl.querySelector('p').textContent = appState.collectMode
                    ? '지난 24시간 동안 선별된 국내 뉴스가 없습니다.'
                    : '아직 저장된 국내뉴스가 없습니다. 로고 아이콘을 눌러 수집 모드로 전환한 뒤 다시 시도해주세요.';
                noResultsEl.classList.remove('hidden');
            }
            return;
        }

        // Same news-card markup as fetchAndRenderShortlist(), so the two views look
        // consistent when toggled - only the field names differ (domestic-news.js uses
        // pubDate/rank, get-shortlist.js uses published_at).
        gridEl.innerHTML = items.map(item => {
            const url = escapeHtml(getNewsUrl({ url: item.url, source: item.source }));
            const pubDateStr = item.pubDate ? new Date(item.pubDate).toLocaleString('ko-KR') : '';
            return `
                <div class="news-card" style="padding:14px 16px;">
                    <div class="card-top-meta">
                        <span class="badge-category">${escapeHtml(item.category || '기타')}</span>
                        <span class="card-source-time">
                            <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="원문 보기">
                                ${escapeHtml(item.source || '')} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a> • ${escapeHtml(pubDateStr)}
                        </span>
                    </div>
                    <h3 class="card-title-kr" style="margin:6px 0 4px;">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                            ${item.rank ? `<span class="domestic-news-rank" style="display:inline-flex; vertical-align:middle; margin-right:6px;">${escapeHtml(String(item.rank))}</span>` : ''}${escapeHtml(item.title)}
                        </a>
                    </h3>
                    ${item.reason ? `<p class="card-summary card-summary-full" style="margin:0;">${escapeHtml(item.reason)}</p>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('[Domestic News Fetch Error]', err);
        if (appState.shortlistPanelMode === 'domestic') {
            gridEl.innerHTML = `<div class="ticker-loading"><i class="fa-solid fa-triangle-exclamation text-red"></i> 뉴스를 불러오지 못했습니다: ${escapeHtml(err.message)}</div>`;
        }
    }
}

/**
 * Renders macro indicators list to #toss-macro-grid-modal-container & #toss-macro-ticker-container.
 */
function renderTossMacroTickerBar(macroList, isLive) {
    const gridContainer = document.getElementById('toss-macro-grid-modal-container');
    const tickerContainer = document.getElementById('toss-macro-ticker-container');

    const htmlContent = macroList.map(item => {
        const isRise = item.changeType === 'RISE' || item.changeType === 'UP' || item.changeRate > 0;
        const isFall = item.changeType === 'FALL' || item.changeType === 'DOWN' || item.changeRate < 0;
        
        let stateClass = 'is-even';
        let colorClass = 'text-muted';
        let iconHtml = '<i class="fa-solid fa-minus"></i>';

        if (isRise) {
            stateClass = 'is-rise';
            colorClass = 'text-green';
            iconHtml = '🟢 <i class="fa-solid fa-caret-up"></i>';
        } else if (isFall) {
            stateClass = 'is-fall';
            colorClass = 'text-red';
            iconHtml = '🔴 <i class="fa-solid fa-caret-down"></i>';
        }

        let formattedPrice = '';
        if (item.type === 'bond') {
            formattedPrice = `${item.latestPrice.toFixed(2)}%`;
        } else if (item.type === 'fx') {
            formattedPrice = `${item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (item.type === 'commodity') {
            formattedPrice = `$${item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            formattedPrice = item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const sign = item.changeRate > 0 ? '+' : '';
        const formattedRate = `${sign}${item.changeRate.toFixed(2)}%`;
        const diffSign = item.priceDiff > 0 ? '+' : '';
        const formattedDiff = `${diffSign}${item.priceDiff.toFixed(2)}`;

        return `
            <div class="macro-chip ${stateClass}" title="원문 보기">
                <div class="chip-top">
                    <span class="chip-name">${escapeHtml(item.name)}</span>
                    <span class="chip-symbol">${escapeHtml(item.symbol)}</span>
                </div>
                <div class="chip-bottom">
                    <span class="chip-price">${formattedPrice}</span>
                    <span class="chip-change ${colorClass}">
                        ${iconHtml} ${formattedDiff} (${formattedRate})
                    </span>
                </div>
            </div>
        `;
    }).join('');

    if (gridContainer) {
        gridContainer.innerHTML = htmlContent;
    }
    if (tickerContainer) {
        tickerContainer.innerHTML = htmlContent;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyCollectModeUI();
    // 초기 패널은 항상 선별 뉴스(해외)이므로 그 버튼을 처음부터 활성 상태로 표시.
    const overseasBtnInit = document.getElementById('btn-run-simulation');
    if (overseasBtnInit) overseasBtnInit.classList.add('active-toggle');
    fetchTossMacroIndicators();
    startGlobalMarketClocks();
    initEventListeners();
    // 🔒 [2026-11-05] 딥분석(news_impacts, Gemini Pro 단가)을 완전히 제거하고 스크리닝
    // 숏리스트(news_shortlist, 저렴한 Gemini 호출 1회)만 화면에 보여주는 구조로 전환.
    // 페이지 로드는 이 읽기 전용 호출만 하고, 유료 파이프라인은 절대 자동 실행하지 않는다.
    fetchAndRenderShortlist();
});

// ==========================================================================
// SHORTLIST SECTION (news_shortlist - screening-stage results, no deep
// analysis fields like targetStocks/transmissionMechanism/outlooks exist yet)
// ==========================================================================

async function fetchAndRenderShortlist() {
    // [2026-09-02] Don't clobber the panel if the user has switched it to domestic news -
    // this function is also called after every pipeline run and on page load, and neither
    // should silently switch the view back out from under an explicit user toggle.
    if (appState.shortlistPanelMode === 'domestic') return;

    const gridEl = document.getElementById('shortlist-grid');
    const noResultsEl = document.getElementById('shortlist-no-results');
    const countBadge = document.getElementById('shortlist-count-badge');
    if (!gridEl) return;

    // [2026-09-02] Visual feedback so a manual (blue-mode) 해외뉴스 click doesn't look
    // like a no-op while the fetch is in flight - this call always hits the network even
    // in read-only mode, it just skips the paid pipeline, so a spinner is warranted.
    gridEl.innerHTML = `<div class="ticker-loading"><i class="fa-solid fa-spinner fa-spin text-blue"></i> 저장된 뉴스 불러오는 중...</div>`;
    if (noResultsEl) noResultsEl.classList.add('hidden');

    try {
        const dbHeaders = {};
        const localSupaUrl = localStorage.getItem('supabase_url_override');
        const localSupaKey = localStorage.getItem('supabase_key_override');
        if (localSupaUrl && localSupaKey) {
            dbHeaders['x-supabase-url'] = localSupaUrl;
            dbHeaders['x-supabase-key'] = localSupaKey;
        }

        const res = await fetch('/api/get-shortlist', { headers: dbHeaders });
        if (!res.ok) throw new Error('Failed to fetch shortlist');
        const data = await res.json();

        const items = (data.success && data.hasList) ? data.data : [];
        if (countBadge) countBadge.textContent = items.length + '개' + (data.isStale ? ' (최근 데이터)' : '');

        if (items.length === 0) {
            gridEl.innerHTML = '';
            if (noResultsEl) noResultsEl.classList.remove('hidden');
            return;
        }
        if (noResultsEl) noResultsEl.classList.add('hidden');

        gridEl.innerHTML = items.map(item => {
            const url = escapeHtml(getNewsUrl({ url: item.url, source: item.source }));
            return `
                <div class="news-card" style="padding:14px 16px;">
                    <div class="card-top-meta">
                        <span class="badge-category">${escapeHtml(item.category || '기타')}</span>
                        <span class="card-source-time">
                            <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="원문 보기">
                                ${escapeHtml(item.source || '')} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a> • ${escapeHtml(item.published_at || '')}
                        </span>
                    </div>
                    <h3 class="card-title-kr" style="margin:6px 0 4px;">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                            ${escapeHtml(item.title)}
                        </a>
                    </h3>
                    ${item.reason ? `<p class="card-summary card-summary-full" style="margin:0;">${escapeHtml(item.reason)}</p>` : ''}
                    ${item.summary_status === 'failed' ? `<p style="margin:6px 0 0; font-size:0.75rem; opacity:0.6;" title="언론사가 자동 접속을 막아 본문을 읽지 못했습니다"><i class="fa-solid fa-circle-info"></i> 제목 기반 요약 (본문 미확인)</p>` : ''}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('[Shortlist Fetch Error]', e);
    }
}

// [2026-09-02] Replaces the old "clear cache" click handler. Toggling INTO collect mode
// (blue -> red) also clears localStorage - turning the switch on means "I want fresh
// data next", so folding the old cache-clear behavior into that transition keeps it
// available without a separate confirm() dialog. Toggling OFF (red -> blue) doesn't
// touch the cache - the user is just going back to read-only viewing.
function applyCollectModeUI() {
    const icon = document.getElementById('logo-icon');
    if (!icon) return;
    icon.classList.toggle('collect-mode-on', appState.collectMode);
    icon.title = appState.collectMode
        ? '빨간색: 클릭 시 새로 수집 (다시 누르면 저장된 뉴스 보기로 전환)'
        : '파란색: 저장된 뉴스 보기 (클릭하면 새로 수집하는 모드로 전환)';
}

window.toggleCollectMode = function() {
    if (appState.isSimulating) {
        alert('뉴스 수집/분석이 진행 중입니다. 완료된 후 다시 시도해주세요.');
        return;
    }
    appState.collectMode = !appState.collectMode;
    localStorage.setItem('collect_mode', String(appState.collectMode));
    if (appState.collectMode) {
        const savedMode = localStorage.getItem('collect_mode');
        localStorage.clear();
        localStorage.setItem('collect_mode', savedMode);
    }
    applyCollectModeUI();
};

