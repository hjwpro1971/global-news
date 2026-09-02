/**
 * GLOBAL MACRO -> KR STOCK IMPACT MONITOR
 * Application Logic & 2-Stage AI Simulation Engine
 * 
 * Features:
 * - 10 Detailed Realistic News Impact Analysis Models (No quantitative percentage predictions)
 * - Real-time World Market Clocks (New York, London, Seoul)
 * - 2-Stage Pipeline Simulation (1st Stage Title Screening -> 2nd Stage LLM Deep Transmission Analysis)
 * - Dynamic Multi-Criteria Filtering (Search, Sentiment, Sector, Impact Score, Stock Tags)
 * - Qualitative Stock Direction & Intensity Analysis Modal Interaction (Chart.js removed)
 */

// ==========================================================================
// 1. DATA MODEL & NEWS DATASET (10 Realistic Global Macro & Sector News)
// ==========================================================================

/**
 * @typedef {Object} TargetStockImpact
 * @property {string} name - Stock Name (e.g., 삼성전자)
 * @property {string} ticker - Stock Code (e.g., 005930)
 * @property {'BULLISH'|'BEARISH'} sentiment - Direction (호재 / 악재)
 * @property {string} impactLevel - Impact Strength (e.g., "최상 (Very High)", "높음 (High)", "중간 (Moderate)")
 * @property {string} reasoning - Detailed Cause & Impact Background
 * @property {string[]} keyDrivers - Key catalyst factors
 */

/**
 * @typedef {Object} NewsImpactAnalysis
 * @property {string} id
 * @property {string} titleEn
 * @property {string} titleKr
 * @property {string} source
 * @property {string} timestamp
 * @property {string} category
 * @property {number} impactScore - (-100 to +100)
 * @property {'BULLISH'|'BEARISH'|'NEUTRAL'} sentiment
 * @property {string} summary
 * @property {Object} phase1Filtering
 * @property {string[]} phase1Filtering.matchKeywords
 * @property {number} phase1Filtering.priorityScore
 * @property {boolean} phase1Filtering.passed
 * @property {string} phase1Filtering.screeningReason
 * @property {Object} phase2DeepAnalysis
 * @property {string} phase2DeepAnalysis.articleContext
 * @property {string} phase2DeepAnalysis.shortTermOutlook
 * @property {string} phase2DeepAnalysis.longTermOutlook
 * @property {string[]} phase2DeepAnalysis.riskFactors
 */
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

let newsDataset = [];

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
    searchQuery: "",
    selectedSentiment: "ALL",
    selectedSector: "ALL",
    minImpactScore: 0,
    selectedStock: null,
    sortBy: "impact-desc",
    currentModalNewsId: null,
    isSimulating: false,
    // [2026-09-02] Tracks which content currently occupies #shortlist-section - 'shortlist'
    // (default, news_shortlist via get-shortlist.js) or 'domestic' (국내뉴스 TOP 10 via
    // /api/domestic-news). See toggleDomesticNewsPanel().
    shortlistPanelMode: 'shortlist'
};

function getFilteredDataset() {
    return newsDataset.filter(item => {
        // 1. Search Query
        if (appState.searchQuery.trim() !== "") {
            const q = appState.searchQuery.toLowerCase();
            const matchTitleEn = item.titleEn.toLowerCase().includes(q);
            const matchTitleKr = item.titleKr.toLowerCase().includes(q);
            const matchSummary = item.summary.toLowerCase().includes(q);
            const matchCategory = item.category.toLowerCase().includes(q);
            const matchStocks = item.phase2DeepAnalysis.targetStocks.some(s => 
                s.name.toLowerCase().includes(q) || s.ticker.includes(q)
            );
            if (!matchTitleEn && !matchTitleKr && !matchSummary && !matchCategory && !matchStocks) {
                return false;
            }
        }

        // 2. Sentiment Filter
        if (appState.selectedSentiment !== "ALL") {
            if (item.sentiment !== appState.selectedSentiment) {
                return false;
            }
        }

        // 3. Sector Filter
        if (appState.selectedSector !== "ALL") {
            if (item.category !== appState.selectedSector) {
                return false;
            }
        }

        // 4. Impact Score Threshold Filter
        if (Math.abs(item.impactScore) < appState.minImpactScore) {
            return false;
        }

        // 5. Selected Stock Pill Filter
        if (appState.selectedStock) {
            const hasStock = item.phase2DeepAnalysis.targetStocks.some(s => s.name === appState.selectedStock);
            if (!hasStock) return false;
        }

        return true;
    }).sort((a, b) => {
        if (appState.sortBy === "impact-desc") {
            return Math.abs(b.impactScore) - Math.abs(a.impactScore);
        } else if (appState.sortBy === "score-desc") {
            return b.impactScore - a.impactScore;
        } else if (appState.sortBy === "score-asc") {
            return a.impactScore - b.impactScore;
        } else if (appState.sortBy === "latest") {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return 0;
    });
}

function updateMetricsUI(filteredData) {
    const totalCount = newsDataset.length;
    const bullCount = newsDataset.filter(d => d.sentiment === "BULLISH").length;
    const bearCount = newsDataset.filter(d => d.sentiment === "BEARISH").length;
    const highImpactCount = newsDataset.filter(d => Math.abs(d.impactScore) >= 75).length;

    const metricEl = document.getElementById('metric-total-news');
    if (metricEl) metricEl.textContent = `총 수집 뉴스 ${totalCount}건 | 호재 ${bullCount}건 | 악재 ${bearCount}건`;
    document.getElementById('news-count-badge').textContent = `${filteredData.length}개 분석 완료`;
}

// ==========================================================================
// 4. UI RENDERING ENGINE (Hero Banner & News Cards)
// ==========================================================================

function renderHeroSection(filteredData) {
    const heroWrapper = document.getElementById('hero-card-wrapper');
    if (!heroWrapper) return;

    if (filteredData.length === 0) {
        heroWrapper.innerHTML = `<div class="no-results"><p>필터 조건에 일치하는 하이라이트 뉴스가 없습니다.</p></div>`;
        return;
    }

    const heroNews = [...filteredData].sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore))[0];
    const isBull = heroNews.sentiment === "BULLISH";
    const gaugeWidth = Math.abs(heroNews.impactScore);

    const heroNewsUrl = escapeHtml(getNewsUrl(heroNews));
    const stockTagsHtml = heroNews.phase2DeepAnalysis.targetStocks.map(stock => `
        <span class="stock-tag-item ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <i class="fa-solid ${stock.sentiment === 'BULLISH' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            ${escapeHtml(stock.name)} (${escapeHtml(stock.ticker)}) · ${stock.sentiment === 'BULLISH' ? '호재 🟢' : '악재 🔴'} (${escapeHtml(stock.impactLevel)})
        </span>
    `).join('');

    heroWrapper.innerHTML = `
        <div class="hero-card ${!isBull ? 'bearish-hero' : ''}">
            <div class="hero-top-meta">
                <div class="hero-badge-group">
                    <span class="top-impact-badge"><i class="fa-solid fa-fire"></i> TOP 1 IMPACT</span>
                    <span class="badge-category">${escapeHtml(heroNews.category)}</span>
                </div>
                <span class="hero-time-source">
                    <i class="fa-regular fa-clock"></i>
                    <a href="${heroNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="원문 보기">
                        ${escapeHtml(heroNews.source)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a> • ${escapeHtml(heroNews.timestamp)}
                </span>
            </div>

            <h3 class="hero-title-en">
                <a href="${heroNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                    ${escapeHtml(heroNews.titleEn)} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
                </a>
            </h3>
            <h4 class="hero-title-kr">
                <a href="${heroNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                    ${escapeHtml(heroNews.titleKr)}
                </a>
            </h4>

            <!-- Body Details & Stock Impact Preview -->
            <div class="hero-body-content">
                <div class="mechanism-box">
                    <h4><i class="fa-solid fa-diagram-project"></i> 증시 파급 메커니즘 (Transmission)</h4>
                    <p>${escapeHtml(heroNews.phase2DeepAnalysis.transmissionMechanism)}</p>
                </div>
                <div class="hero-stocks-box">
                    <h4><i class="fa-solid fa-chart-line"></i> 수혜/피해 주요 관심 종목</h4>
                    <div class="hero-stock-tags">
                        ${stockTagsHtml}
                    </div>
                </div>
            </div>

            <div class="hero-card-footer">
                <button class="btn btn-primary btn-open-modal" data-id="${escapeHtml(heroNews.id)}">
                    <i class="fa-solid fa-file-contract"></i> 2단계 심층 파이프라인 리포트 전체보기
                </button>
            </div>
        </div>
    `;
}

function renderNewsGrid(filteredData) {
    const gridEl = document.getElementById('news-grid');
    const noResultsEl = document.getElementById('no-results');
    if (!gridEl) return;

    if (filteredData.length === 0) {
        gridEl.innerHTML = '';
        noResultsEl.classList.remove('hidden');
        return;
    }

    noResultsEl.classList.add('hidden');

    gridEl.innerHTML = filteredData.map(news => {
        const isBull = news.sentiment === "BULLISH";
        const newsUrl = escapeHtml(getNewsUrl(news));
        const stockPillsHtml = news.phase2DeepAnalysis.targetStocks.map(s => `
            <span class="mini-stock-pill ${s.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
                ${escapeHtml(s.name)} (${escapeHtml(s.ticker)}) · ${s.sentiment === 'BULLISH' ? '호재' : '악재'} (${escapeHtml(s.impactLevel)})
            </span>
        `).join('');

        return `
            <div class="news-card ${isBull ? 'sentiment-bullish' : 'sentiment-bearish'}">
                <div>
                    <div class="card-top-meta">
                        <span class="badge-category">${escapeHtml(news.category)}</span>
                        <span class="card-impact-badge ${isBull ? 'bullish' : 'bearish'}">
                            ${news.impactScore > 0 ? '+' : ''}${news.impactScore}점
                        </span>
                    </div>

                    <h3 class="card-title-kr" title="원문 보기">
                        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                            ${escapeHtml(news.titleKr)} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
                        </a>
                    </h3>
                    <p class="card-title-en" title="원문 보기">${escapeHtml(news.titleEn)}</p>
                    <p class="card-summary">${escapeHtml(news.summary)}</p>
                </div>

                <div>
                    <div class="card-stocks-row">
                        ${stockPillsHtml}
                    </div>

                    <div class="card-action-bar">
                        <span class="card-source-time">
                            <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="원문 보기">
                                ${escapeHtml((news.source || '').split(' ')[0])} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a> • ${escapeHtml(news.timestamp)}
                        </span>
                        <button class="btn-card-detail btn-open-modal" data-id="${escapeHtml(news.id)}">
                            보고서 보기 <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveFilterCount() {
    let count = 0;
    if (appState.searchQuery.trim() !== "") count++;
    if (appState.selectedSentiment !== "ALL") count++;
    if (appState.selectedSector !== "ALL") count++;
    if (appState.minImpactScore > 0) count++;
    if (appState.selectedStock !== null) count++;

    const badge = document.getElementById('mobile-filter-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function syncStockPillSelection() {
    document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(pill => {
        const stockName = pill.getAttribute('data-stock');
        if (appState.selectedStock === stockName) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    document.querySelectorAll('#mobile-quick-stock-chips .quick-chip').forEach(chip => {
        const stockName = chip.getAttribute('data-stock');
        if ((stockName === 'ALL' && appState.selectedStock === null) || (stockName === appState.selectedStock)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

function renderApp() {
    const filteredData = getFilteredDataset();
    updateMetricsUI(filteredData);
    updateActiveFilterCount();
    syncStockPillSelection();
    renderHeroSection(filteredData);
    renderNewsGrid(filteredData);
    attachDynamicEventListeners();
}

// ==========================================================================
// 5. DETAILED ANALYSIS REPORT MODAL (Qualitative & Transmission Analysis)
// ==========================================================================

function openModal(newsId) {
    const news = newsDataset.find(n => n.id.toString() === newsId.toString());
    if (!news) return;

    appState.currentModalNewsId = newsId;
    const isBull = news.sentiment === "BULLISH";

    // Populate Header & Meta
    document.getElementById('modal-category').textContent = news.category;
    const modalNewsUrl = escapeHtml(getNewsUrl(news));
    const modalSourceTimeEl = document.getElementById('modal-source-time');
    if (modalSourceTimeEl) {
        modalSourceTimeEl.innerHTML = `
            <a href="${modalNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="원문 보기">
                ${escapeHtml(news.source)} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a> • ${escapeHtml(news.timestamp)}
        `;
    }
    const modalTitleEl = document.getElementById('modal-title');
    if (modalTitleEl) {
        modalTitleEl.innerHTML = `
            <a href="${modalNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                ${escapeHtml(news.titleKr)} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
            </a>
        `;
    }
    const modalOrigTitleEl = document.getElementById('modal-original-title');
    if (modalOrigTitleEl) {
        modalOrigTitleEl.innerHTML = `
            <a href="${modalNewsUrl}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보기">
                ${escapeHtml(news.titleEn)}
            </a>
        `;
    }

    // Score Banner
    const scoreNumEl = document.getElementById('modal-score-number');
    scoreNumEl.textContent = `${news.impactScore > 0 ? '+' : ''}${news.impactScore}`;
    scoreNumEl.className = `score-number ${isBull ? 'text-green' : 'text-red'}`;

    const sentBadge = document.getElementById('modal-sentiment-badge');
    sentBadge.textContent = isBull ? "강한 호재 (STRONG BULLISH 🟢)" : "강한 악재 (STRONG BEARISH 🔴)";
    sentBadge.className = `sentiment-badge ${isBull ? 'bullish' : 'bearish'}`;

    document.getElementById('modal-sentiment-desc').textContent = news.summary;

    // Stage 2 Article Context Deep Dive
    const contextEl = document.getElementById('modal-article-context');
    const p2 = news.phase2DeepAnalysis || {};
    if (contextEl && p2.articleContext) {
        contextEl.innerHTML = `<p>${escapeHtml(p2.articleContext)}</p>`;
    }

    // Stage 2 Step-by-Step Path
    const stepPathContainer = document.getElementById('modal-step-path');
    if (stepPathContainer && p2.stepByStepPath) {
        stepPathContainer.innerHTML = p2.stepByStepPath.map((step, idx) => `
            <div class="step-path-item">
                <span class="step-badge">STEP ${idx + 1}</span>
                <span class="step-desc">${escapeHtml(step)}</span>
            </div>
        `).join('');
    }

    // Stage 2 Impacted Sectors
    const sectorsContainer = document.getElementById('modal-impacted-sectors');
    if (sectorsContainer && p2.impactedSectors) {
        sectorsContainer.innerHTML = p2.impactedSectors.map(sec => `
            <span class="sector-tag-chip ${sec.direction === 'UP' ? 'up' : 'down'}">
                <i class="fa-solid ${sec.direction === 'UP' ? 'fa-circle-chevron-up' : 'fa-circle-chevron-down'}"></i>
                ${escapeHtml(sec.sector)} (${sec.direction === 'UP' ? '수혜 🟢' : '영향/부담 🔴'})
            </span>
        `).join('');
    }

    // Stage 2 Transmission Mechanism Text
    document.getElementById('modal-transmission-text').textContent = p2.transmissionMechanism || "전파 경로 데이터 없음";

    // Target Stock Impact Cards List
    const stockListEl = document.getElementById('modal-stock-list');
    const stocks = p2.targetStocks || [];
    stockListEl.innerHTML = stocks.map(stock => `
        <div class="stock-impact-card ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <div class="stock-card-header">
                <div class="stock-identity">
                    <span class="stock-name">${escapeHtml(stock.name)}</span>
                    <span class="stock-ticker-code">(${escapeHtml(stock.ticker)})</span>
                </div>
                <div class="stock-direction-badge ${stock.sentiment === 'BULLISH' ? 'bullish' : 'bearish'}">
                    <i class="fa-solid ${stock.sentiment === 'BULLISH' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                    ${stock.sentiment === 'BULLISH' ? '호재 🟢' : '악재 🔴'} | 영향도: ${escapeHtml(stock.impactLevel)}
                </div>
            </div>
            <div class="stock-reasoning-body">
                <p class="stock-reasoning"><strong>영향 배경 및 세부 이유:</strong> ${escapeHtml(stock.reasoning)}</p>
                ${stock.keyDrivers && stock.keyDrivers.length > 0 ? `
                    <div class="stock-key-drivers">
                        ${stock.keyDrivers.map(d => `<span class="driver-tag">#${escapeHtml(d)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Outlook & Risk Factors
    document.getElementById('modal-short-term').textContent = p2.shortTermOutlook || "단기 전망 데이터가 없습니다.";
    document.getElementById('modal-long-term').textContent = p2.longTermOutlook || "중장기 전망 데이터가 없습니다.";
    
    const riskListEl = document.getElementById('modal-risk-list');
    const risks = p2.riskFactors || ["리스크 요인 데이터가 없습니다."];
    riskListEl.innerHTML = risks.map(risk => `<li>${escapeHtml(risk)}</li>`).join('');

    // Show Modal Overlay
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset scroll position to top
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
        modalBody.scrollTop = 0;
    }
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    appState.currentModalNewsId = null;
}

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

// autoTriggerPipeline=false: only ever reads what's already in the DB - never starts
// the RSS+Gemini pipeline on its own. Used for page load and after cache-clear, so
// opening/reloading the page (or the "캐시 초기화" icon) can never silently kick off
// an analysis run - only the explicit "뉴스분석" button may do that.
async function fetchLiveRssNews(forceRefresh = false, autoTriggerPipeline = true) {
    try {
        // 1. Check if DB has today's news
        appState.isSimulating = true;
        updateConsoleProgress(10, "[SYSTEM] DB 연동 캐시 확인 중...");
        
        if (!forceRefresh) {
            try {
            const dbHeaders = {};
            const localSupaUrl = localStorage.getItem('supabase_url_override');
            const localSupaKey = localStorage.getItem('supabase_key_override');
            if (localSupaUrl && localSupaKey) {
                dbHeaders['x-supabase-url'] = localSupaUrl;
                dbHeaders['x-supabase-key'] = localSupaKey;
            }

            const dbCheckRes = await fetch('/api/get-today-news', { headers: dbHeaders });
            if (dbCheckRes.ok) {
                const dbData = await dbCheckRes.json();
                // isStale=true means the API fell back to an older batch (no news saved
                // today yet, e.g. cron failed) - that's NOT a cache hit. Treating it as
                // one meant the "뉴스분석" button (and every page load) would silently
                // keep re-showing yesterday's data forever and never re-run the pipeline.
                if (dbData.success && dbData.hasNews && !dbData.isStale && dbData.data.length > 0) {
                    // Map DB schema to frontend schema with SAFE DEFAULTS
                    newsDataset = dbData.data.map(item => ({
                        id: item.id || Math.random().toString(36).substr(2, 9),
                        titleKr: item.title || "No Title",
                        titleEn: item.original_title || "No Title",
                        url: item.url || "",
                        summary: item.summary || "",
                        source: item.source || "Unknown Source",
                        timestamp: item.published_at || new Date().toLocaleString(),
                        category: item.sector || "Uncategorized",
                        impactScore: item.impact_score || 0,
                        sentiment: (item.impact_score || 0) >= 0 ? "BULLISH" : "BEARISH",
                        phase1Filtering: {
                            matchKeywords: ["DB에서 불러옴"],
                            priorityScore: 90,
                            screeningReason: "Supabase DB에 캐싱된 데이터입니다."
                        },
                        phase2DeepAnalysis: {
                            context: item.theme || item.article_context || "",
                            articleContext: item.article_context || item.theme || "본문 문맥 정보가 없습니다.",
                            stepByStepPath: (typeof item.step_by_step_path === 'string' ? JSON.parse(item.step_by_step_path) : item.step_by_step_path) || ["DB 연동 데이터", "캐싱 로드 완료"],
                            impactedSectors: [{ sector: item.sector || "해당섹터", direction: "UP" }],
                            targetStocks: (typeof item.target_stocks === 'string' ? JSON.parse(item.target_stocks) : item.target_stocks) || [],
                            transmissionMechanism: item.transmission_mechanism || "",
                            shortTermOutlook: item.short_term_outlook || "단기 전망 데이터가 없습니다.",
                            longTermOutlook: item.long_term_outlook || "중장기 전망 데이터가 없습니다.",
                            riskFactors: ["리스크 요인 데이터가 없습니다."]
                        }
                    }));
                    
                    localStorage.setItem('cached_news_dataset', JSON.stringify(newsDataset));
                    if (dbData.isStale) {
                        updateConsoleProgress(100, "[알림] 오늘의 뉴스를 아직 수집하지 못했습니다. 가장 최근 뉴스(" + newsDataset.length + "건)를 표시합니다.");
                    } else {
                        updateConsoleProgress(100, "[CACHE HIT] DB에서 오늘 날짜의 최신 뉴스(" + newsDataset.length + "건)를 즉시 불러왔습니다!");
                    }
                    appState.isSimulating = false;
                    try { renderApp(); } catch(err) { console.error("Render error:", err); }
                    return;
                }
            }
            } catch (dbErr) {
                console.error('[DB Check Error]', dbErr);
                // Ignore DB error and proceed with RSS fetch
            }
        }

        if (!autoTriggerPipeline) {
            // Passive read-only call (page load / cache clear): DB had nothing usable,
            // but we must NOT start the paid Gemini pipeline on our own - only the
            // "뉴스분석" button click may do that.
            appState.isSimulating = false;
            updateConsoleProgress(0, "[알림] 오늘자 분석 데이터가 없습니다. '뉴스분석' 버튼을 눌러 새로 생성하세요.");
            try { renderApp(); } catch (err) { console.error("Render error:", err); }
            return;
        }

        // 2. DB Cache Miss or forceRefresh -> Run normal pipeline
        updateConsoleProgress(30, "[CACHE MISS] 오늘자 데이터가 없습니다. 라이브 RSS 파이프라인 가동...");
        
        const rssResponse = await fetch('/api/news-rss');
        if (!rssResponse.ok) throw new Error('Failed to fetch raw RSS');
        const rssData = await rssResponse.json();
        
        if (!rssData || !rssData.items || rssData.items.length === 0) {
            throw new Error('최근 24시간 내에 조건에 맞는 글로벌 경제/증시 뉴스가 없습니다. 검색 조건을 넓혀 다시 시도합니다.');
        }

        updateConsoleProgress(60, "[1차 엑기스] RSS 수집 완료. Gemini AI 분석 요청 중...");
        console.log('[Live RSS] Fetched', rssData.items.length, 'articles. Sending to Gemini AI for selection and analysis...');
        
        const headers = { 'Content-Type': 'application/json' };

            const localSupaUrl = localStorage.getItem('supabase_url_override');
            if (localSupaUrl) {
                headers['x-supabase-url'] = localSupaUrl;
                headers['x-supabase-key'] = localStorage.getItem('supabase_key_override');
            }

            const analyzeResponse = await fetch('/api/analyze-news', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ articles: rssData.items })
            });
            
            if (!analyzeResponse.ok) {
                const err = await analyzeResponse.text();
                if (analyzeResponse.status === 500 && err.includes('Server is missing GEMINI_API_KEY')) {
                    throw new Error('서버에 GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. Vercel 대시보드에서 환경 변수를 설정해주세요.');
                }
                throw new Error('Analyze API Error: ' + err);
            }
            
            const analyzedData = await analyzeResponse.json();
            if (analyzedData.success && analyzedData.dataset) {
                newsDataset = analyzedData.dataset;
                localStorage.setItem('cached_news_dataset', JSON.stringify(newsDataset));
                
                if (analyzedData.dbError) {
                    updateConsoleProgress(100, "[WARNING] AI 분석은 성공했으나 DB 저장에 실패했습니다.");
                    console.error('[Live RSS DB Error]', analyzedData.dbError);
                    alert("AI 분석은 완료되었으나 Supabase DB에 저장하지 못했습니다.\n원인: " + analyzedData.dbError + "\n\n(Supabase 테이블에 url, article_context 등의 컬럼이 추가되어 있는지 확인해주세요.)");
                } else {
                    updateConsoleProgress(100, "[2차 LLM 분석 및 저장] AI 분석 완료 및 DB 자동 저장 성공!");
                }
                
                console.log('[Live RSS Integration Success]', newsDataset.length, 'AI analyzed articles loaded!');
            }
    } catch (e) {
        console.error('[Live RSS Integration Error]', e.message);
        updateConsoleProgress(0, "[ERROR] 파이프라인 에러: " + e.message);
    } finally {
        appState.isSimulating = false;
        try { renderApp(); } catch(err) { console.error("Render error:", err); }
    }
}

// Data-changing controls that must not be usable while a pipeline run is in flight -
// re-clicking any of these mid-run is what caused last time's lock conflicts (409s)
// and shortlist mix-ups between overlapping requests.
function setDataActionsDisabled(disabled) {
    const btnSaveSupabase = document.getElementById('btn-save-supabase');
    if (btnSaveSupabase) btnSaveSupabase.disabled = disabled;
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) logoIcon.style.pointerEvents = disabled ? 'none' : '';
}

function runPipelineSimulation() {
    if (appState.isSimulating) return;

    appState.isSimulating = true;
    const runBtn = document.getElementById('btn-run-simulation');

    if (runBtn) {
        runBtn.disabled = true;
        // 문구·경과시간은 startRunBtnProgress()의 타이머가 그린다 (단계는 percent에서 파생).
        startRunBtnProgress();
    }
    setDataActionsDisabled(true);

    // autoTriggerPipeline=true: explicit user click, allowed to start a new analysis run.
    fetchLiveRssNews(false, true).finally(() => {
        stopRunBtnProgress();
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> <span class="btn-text" style="font-weight: bold;">뉴스분석</span>`;
        }
        setDataActionsDisabled(false);
        appState.isSimulating = false;
        renderApp();
        fetchAndRenderShortlist();
    });
}

// ==========================================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function attachDynamicEventListeners() {
    document.querySelectorAll('.btn-open-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newsId = e.currentTarget.getAttribute('data-id');
            openModal(newsId);
        });
    });
}

function initEventListeners() {
    const btnSaveSupabase = document.getElementById('btn-save-supabase');
    if (btnSaveSupabase) {
        btnSaveSupabase.addEventListener('click', async () => {
            if (appState.isSimulating) {
                alert('뉴스 수집/분석이 진행 중입니다. 완료된 후 다시 시도해주세요.');
                return;
            }
            if (!newsDataset || newsDataset.length === 0) {
                alert('저장할 데이터가 없습니다. 먼저 분석을 실행해 주세요.');
                return;
            }
            const btnOriginalText = btnSaveSupabase.innerHTML;
            btnSaveSupabase.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
            btnSaveSupabase.disabled = true;
            
            try {
                const payload = newsDataset.map(item => ({
                    title: item.titleKr,
                    original_title: item.titleEn,
                    summary: item.summary,
                    source: item.source,
                    published_at: item.timestamp,
                    sector: item.category,
                    theme: item.phase2DeepAnalysis?.context || '',
                    impact_score: item.impactScore,
                    target_stocks: item.phase2DeepAnalysis?.targetStocks || [],
                    transmission_mechanism: item.phase2DeepAnalysis?.transmissionMechanism || []
                }));
                
                const response = await fetch('/api/save-supabase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload })
                });
                
                if (response.ok) {
                    alert('성공적으로 저장되었습니다!');
                } else {
                    const err = await response.text();
                    alert('저장 실패 (Vercel 설정 확인 필요): ' + err);
                }
            } catch (e) {
                alert('오류 발생: ' + e.message);
            } finally {
                btnSaveSupabase.innerHTML = btnOriginalText;
                btnSaveSupabase.disabled = false;
            }
        });
    }

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
        if (!document.getElementById('modal-backdrop') || document.getElementById('modal-backdrop').classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    }

    if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', openMobileDrawer);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileDrawer);
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);

    document.querySelectorAll('#mobile-quick-stock-chips .quick-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const stockName = e.currentTarget.getAttribute('data-stock');
            if (stockName === 'ALL') {
                appState.selectedStock = null;
            } else {
                if (appState.selectedStock === stockName) {
                    appState.selectedStock = null;
                } else {
                    appState.selectedStock = stockName;
                }
            }
            renderApp();
        });
    });

    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.searchQuery = e.target.value;
            if (clearSearchBtn) {
                if (e.target.value.length > 0) clearSearchBtn.classList.remove('hidden');
                else clearSearchBtn.classList.add('hidden');
            }
            renderApp();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            appState.searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            renderApp();
        });
    }

    document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            appState.selectedSentiment = e.currentTarget.getAttribute('data-sentiment');
            renderApp();
        });
    });

    const sectorSelect = document.getElementById('sector-select');
    if (sectorSelect) {
        sectorSelect.addEventListener('change', (e) => {
            appState.selectedSector = e.target.value;
            renderApp();
        });
    }

    const impactRange = document.getElementById('impact-range');
    const impactRangeVal = document.getElementById('impact-range-val');
    if (impactRange) {
        impactRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            appState.minImpactScore = val;
            if (impactRangeVal) {
                impactRangeVal.textContent = val === 0 ? "전체 보기" : `${val}점 이상`;
            }
            renderApp();
        });
    }

    document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const stockName = e.currentTarget.getAttribute('data-stock');
            if (appState.selectedStock === stockName) {
                appState.selectedStock = null;
            } else {
                appState.selectedStock = stockName;
            }
            renderApp();
        });
    });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.sortBy = e.target.value;
            renderApp();
        });
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    const resetEmptyBtn = document.getElementById('btn-reset-empty');
    
    const resetAllFilters = () => {
        appState.searchQuery = "";
        appState.selectedSentiment = "ALL";
        appState.selectedSector = "ALL";
        appState.minImpactScore = 0;
        appState.selectedStock = null;
        appState.sortBy = "impact-desc";

        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (sectorSelect) sectorSelect.value = 'ALL';
        if (impactRange) impactRange.value = 0;
        if (impactRangeVal) impactRangeVal.textContent = '0점 이상';
        if (sortSelect) sortSelect.value = 'impact-desc';

        document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('data-sentiment') === 'ALL') b.classList.add('active');
        });

        document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(p => p.classList.remove('active'));

        renderApp();
    };

    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
    if (resetEmptyBtn) resetEmptyBtn.addEventListener('click', resetAllFilters);

    const runSimBtn = document.getElementById('btn-run-simulation');
    if (runSimBtn) {
        runSimBtn.addEventListener('click', runPipelineSimulation);
    }

    const domesticNewsBtn = document.getElementById('btn-domestic-news');
    if (domesticNewsBtn) {
        domesticNewsBtn.addEventListener('click', toggleDomesticNewsPanel);
    }

    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalFooterClose = document.getElementById('modal-footer-close');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalFooterClose) modalFooterClose.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
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
            closeModal();
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
async function toggleDomesticNewsPanel() {
    const btn = document.getElementById('btn-domestic-news');
    const titleEl = document.getElementById('shortlist-section-title');

    if (appState.shortlistPanelMode === 'domestic') {
        // Switch back to the regular shortlist view.
        appState.shortlistPanelMode = 'shortlist';
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-newspaper"></i> 오늘의 선별 뉴스';
        if (btn) btn.classList.remove('active-toggle');
        fetchAndRenderShortlist();
        return;
    }

    appState.shortlistPanelMode = 'domestic';
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-newspaper"></i> 국내뉴스 TOP 10 (24시간 파급력)';
    if (btn) btn.classList.add('active-toggle');
    await fetchAndRenderDomesticNews();
}

window.toggleDomesticNewsPanel = toggleDomesticNewsPanel;

async function fetchAndRenderDomesticNews() {
    const gridEl = document.getElementById('shortlist-grid');
    const noResultsEl = document.getElementById('shortlist-no-results');
    const countBadge = document.getElementById('shortlist-count-badge');
    if (!gridEl) return;

    gridEl.innerHTML = `<div class="ticker-loading"><i class="fa-solid fa-spinner fa-spin text-blue"></i> 국내 경제지 24시간 뉴스 분석 중...</div>`;
    if (noResultsEl) noResultsEl.classList.add('hidden');

    try {
        const resp = await fetch('/api/domestic-news');
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || `HTTP ${resp.status}`);

        // Bail out if the user switched back to the shortlist view while this was loading.
        if (appState.shortlistPanelMode !== 'domestic') return;

        const items = data.items || [];
        if (countBadge) countBadge.textContent = items.length + '개';

        if (items.length === 0) {
            gridEl.innerHTML = '';
            if (noResultsEl) {
                noResultsEl.querySelector('p').textContent = '지난 24시간 동안 선별된 국내 뉴스가 없습니다.';
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
    // 1. Check Cache First
    const cachedNews = localStorage.getItem('cached_news_dataset');
    if (cachedNews) {
        try {
            newsDataset = JSON.parse(cachedNews);
            console.log('[Cache] Loaded', newsDataset.length, 'articles from local cache.');
        } catch(e) {
            console.error('[Cache Error]', e);
        }
    }

    fetchTossMacroIndicators();
    startGlobalMarketClocks();
    initEventListeners();
    renderApp();
    // Screening-stage list (news_shortlist) - read-only, no Gemini deep-analysis cost.
    // Shown separately from the deep-analysis hero/grid below, which currently has
    // little/no data while deep analysis is paused (DEEP_ANALYSIS_ENABLED=false).
    fetchAndRenderShortlist();

    // 2. Fetch fresh data in background only if there's no cache or if we want to force refresh
    renderTrendChart();
    // autoTriggerPipeline=false: page load only ever reads existing DB data, never
    // starts a new (paid) analysis run on its own.
    fetchLiveRssNews(false, false).then(() => renderApp());
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
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('[Shortlist Fetch Error]', e);
    }
}

// Cache clearing function
window.clearCacheAndReload = function() {
    if (appState.isSimulating) {
        alert('뉴스 수집/분석이 진행 중입니다. 완료된 후 다시 시도해주세요.');
        return;
    }
    if (confirm('로컬 캐시를 초기화하고 데이터를 새로 불러오시겠습니까?')) {
        localStorage.clear();
        location.reload();
    }
};

// ==========================================================================
// 8. MACRO TREND CHART CONTROLLER
// ==========================================================================
let macroTrendChartInstance = null;

async function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    try {
        const dbHeaders = {};
        const localSupaUrl = localStorage.getItem('supabase_url_override');
        const localSupaKey = localStorage.getItem('supabase_key_override');
        if (localSupaUrl && localSupaKey) {
            dbHeaders['x-supabase-url'] = localSupaUrl;
            dbHeaders['x-supabase-key'] = localSupaKey;
        }

        const res = await fetch('/api/get-trend-data', { headers: dbHeaders });
        if (!res.ok) throw new Error('Failed to fetch trend data');
        
        const data = await res.json();
        if (!data.success || !data.trend || data.trend.length === 0) {
            return;
        }

        const labels = data.trend.map(d => d.date);
        const scores = data.trend.map(d => d.avgScore);

        if (macroTrendChartInstance) {
            macroTrendChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        macroTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '일평균 증시 온도',
                    data: scores,
                    borderColor: function(context) {
                        const chart = context.chart;
                        const {chartArea} = chart;
                        if (!chartArea) return null;
                        return scores[scores.length - 1] >= 0 ? '#00e676' : '#ff1744';
                    },
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        if (scores[scores.length - 1] >= 0) {
                            gradient.addColorStop(0, 'rgba(0, 230, 118, 0.5)');
                            gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)');
                        } else {
                            gradient.addColorStop(0, 'rgba(255, 23, 68, 0.5)');
                            gradient.addColorStop(1, 'rgba(255, 23, 68, 0.0)');
                        }
                        return gradient;
                    },
                    borderWidth: 2,
                    pointBackgroundColor: '#1a1f2c',
                    pointBorderColor: scores.map(s => s >= 0 ? '#00e676' : '#ff1744'),
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 31, 44, 0.9)',
                        titleColor: '#8892b0',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y > 0 ? '+' + context.parsed.y : context.parsed.y;
                                    label += context.parsed.y >= 0 ? ' (호재)' : ' (악재)';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#8892b0', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)', borderDash: [5, 5], drawBorder: false },
                        ticks: { 
                            color: '#8892b0', 
                            font: { family: 'Inter', size: 10 },
                            callback: function(value) { return value > 0 ? '+' + value : value; }
                        }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
    } catch (err) {
        console.error('[Trend Chart Error]', err);
    }
}
