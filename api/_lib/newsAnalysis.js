// Shared pipeline logic for analyze-news.js (user-triggered) and cron-update-news.js (scheduled).
// Keeping this in one place avoids the two routes drifting apart when prompts/models change.

// Category-grouped Google News RSS search queries. Kept as search queries (not per-outlet
// feeds) because per-outlet RSS formats vary enough to need their own parsers - out of scope
// for this pass. Expanding beyond 2 queries widens headline coverage before the local
// frequency ranking below picks candidates, without adding any paid API calls.
export const RSS_QUERIES = [
    'Fed+OR+FOMC+OR+"interest+rate"+OR+"rate+cut"+OR+"rate+hike"+when:1d',
    'Semiconductor+OR+chip+OR+"AI+capex"+OR+Nvidia+when:1d',
    'inflation+OR+CPI+OR+"jobs+report"+OR+recession+when:1d',
    'geopolitics+OR+tariff+OR+sanctions+OR+war+when:1d',
    'oil+OR+commodity+OR+"crude+price"+OR+OPEC+when:1d',
    // Added: these move markets as directly as Fed/oil/FX but had no dedicated query -
    // they were only ever caught incidentally by another query's wording.
    '"nonfarm+payrolls"+OR+"unemployment+rate"+OR+"jobs+report"+when:1d', // US labor market
    '"treasury+yield"+OR+"10-year+yield"+OR+"bond+market"+when:1d', // US rates transmission mechanism
    'ISM+OR+"manufacturing+PMI"+OR+"factory+activity"+when:1d', // US leading indicator
    'China+OR+"Chinese+economy"+OR+"China+PMI"+when:1d', // Korea's largest trading partner
    '%EA%B8%88%EB%A6%AC+OR+%ED%99%98%EC%9C%A8+OR+%EC%97%B0%EC%A4%80+when:1d', // 금리 OR 환율 OR 연준
    '%EB%B0%98%EB%8F%84%EC%B2%B4+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+OR+%EC%BD%94%EC%8A%A4%EB%8B%A5+when:1d', // 반도체 OR 코스피 OR 코스닥
    '%EA%B8%80%EB%A1%9C%EB%B2%8C+%EA%B2%BD%EC%A0%9C+OR+%EC%A6%9D%EC%8B%9C+OR+%EB%AC%B4%EC%97%AD+when:1d', // 글로벌 경제 OR 증시 OR 무역
    '%EC%99%B8%EA%B5%AD%EC%9D%B8+%EC%88%9C%EB%A7%A4%EC%88%98+OR+%EC%88%9C%EB%A7%A4%EB%8F%84+OR+%EB%AC%B4%EC%97%AD%EC%88%98%EC%A7%80+when:1d' // 외국인 순매수 OR 순매도 OR 무역수지
];

function buildRssUrl(query, lang) {
    return `https://news.google.com/rss/search?q=${query}&hl=${lang === 'ko' ? 'ko&gl=KR&ceid=KR:ko' : 'en-US&gl=US&ceid=US:en'}`;
}

export function buildRssUrls() {
    return RSS_QUERIES.flatMap(q => [buildRssUrl(q, 'en'), buildRssUrl(q, 'ko')]);
}

export function parseRssItems(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
        const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
        const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/i.exec(itemContent);

        let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        let link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        let pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
        let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Google News';

        if (rawTitle.includes(' - ')) {
            const parts = rawTitle.split(' - ');
            if (parts.length > 1) {
                source = parts.pop().trim();
                rawTitle = parts.join(' - ').trim();
            }
        }

        if (rawTitle && link) {
            items.push({ title: rawTitle, link, pubDate, source });
        }
    }
    return items;
}

// ==========================================================================
// Local headline-frequency ranking (no external NLP dependency - this project
// has no package.json, so a real morphological analyzer like kuromoji would
// break the Vercel build). This is a coarse English/Korean tokenizer: split on
// whitespace/punctuation, drop short tokens and stopwords, count frequency
// across the whole batch. Articles whose headline reuses widely-repeated
// tokens ("everyone is writing about this today") rank higher.
// ==========================================================================

const STOPWORDS = new Set([
    'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'are', 'was', 'were',
    'with', 'as', 'at', 'by', 'from', 'its', 'it', 'this', 'that', 'after', 'before', 'over',
    'up', 'down', 'new', 'says', 'said', 'will', 'be', 'has', 'have', 'had', 'more', 'than',
    '이', '그', '저', '것', '수', '등', '및', '을', '를', '이는', '있다', '했다', '한다', '위해',
    '대한', '에서', '으로', '한다고', '전했다', '밝혔다'
]);

const SOURCE_PRIORITY = [
    'reuters', 'bloomberg', 'wall street journal', 'wsj', 'financial times', 'ft',
    'cnbc', 'nikkei', 's&p global', 'yonhap', '연합뉴스', '한국경제', '매일경제'
];

// Common Korean particles glued onto the end of a noun (조사) - stripping them lets
// "코스피는"/"코스피가"/"코스피" all collapse to the same token "코스피" instead of
// three different tokens, which otherwise tanks Jaccard similarity between headlines
// about the same story. Ordered longest-first so a multi-char particle is tried before
// a shorter one that could also match as a suffix of it.
const PARTICLE_SUFFIXES = ['에서', '으로', '에게', '한테', '까지', '부터', '는', '은', '이', '가', '을', '를', '에', '와', '과', '도', '만', '의'];

function stripParticle(token) {
    for (const p of PARTICLE_SUFFIXES) {
        if (token.length > p.length + 1 && token.endsWith(p)) return token.slice(0, -p.length);
    }
    return token;
}

function tokenize(title) {
    return (title || '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map(stripParticle)
        .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const t of setA) if (setB.has(t)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function sourcePriorityRank(source) {
    const s = (source || '').toLowerCase();
    const idx = SOURCE_PRIORITY.findIndex(p => s.includes(p));
    return idx === -1 ? SOURCE_PRIORITY.length : idx;
}

const SIMILARITY_CLUSTER_THRESHOLD = 0.35;
const HIGH_IMPACT_SCORE_THRESHOLD = 6;
const MIN_CANDIDATES = 2;
// Local pre-filter candidate cap BEFORE Gemini screening (step 2 of the pipeline).
// Kept separate from LIST_SIZE/DEEP_ANALYSIS_TOP_N below: this is how many raw
// articles get shown to the screening prompt, not how many end up in the shortlist.
const MAX_CANDIDATES = 20;

// [2026-08-04 redesign] The pipeline used to conflate "which articles are worth
// showing" with "which articles are worth spending Gemini deep-analysis tokens
// on" - both were capped at the same small number (7), so once deep analysis was
// wired to the same list, a single busy news event could dominate everything
// downstream with no visibility into why. Now screening produces a wider
// shortlist (a cheap, single Lite call regardless of size) that gets saved and
// can be inspected on its own; only a smaller top-N of THAT list goes on to the
// expensive structured deep-analysis call.
const LIST_SIZE = 14; // how many articles the screening step selects into the shortlist (bumped from 12 alongside the 8->10 category expansion so newly-added categories, e.g. 중국경기/고용지표, have room to actually appear)
const DEEP_ANALYSIS_TOP_N = 5; // how many of the shortlist get full Gemini deep analysis
const DEEP_ANALYSIS_MAX_PER_CATEGORY = 2; // even within top-N, cap one category from crowding out others

// Ranks + deduplicates articles using headline token frequency, then returns a
// dynamically-sized shortlist to send to Gemini (fewer tokens spent on quiet news days).
export function rankByHeadlineFrequency(articles) {
    if (articles.length === 0) return [];

    const tokenSets = articles.map(a => new Set(tokenize(a.title)));

    const freq = new Map();
    tokenSets.forEach(set => {
        set.forEach(token => freq.set(token, (freq.get(token) || 0) + 1));
    });

    const scored = articles.map((article, idx) => {
        let score = 0;
        tokenSets[idx].forEach(token => { score += freq.get(token) - 1; }); // -1: don't count the article's own headline
        return { article, tokens: tokenSets[idx], score, idx };
    });

    // Cluster near-duplicate headlines (same story, different outlets) and keep
    // only the highest source-priority article per cluster.
    scored.sort((a, b) => b.score - a.score);
    const clustered = [];
    const used = new Array(scored.length).fill(false);

    for (let i = 0; i < scored.length; i++) {
        if (used[i]) continue;
        const cluster = [scored[i]];
        used[i] = true;
        for (let j = i + 1; j < scored.length; j++) {
            if (used[j]) continue;
            if (jaccardSimilarity(scored[i].tokens, scored[j].tokens) >= SIMILARITY_CLUSTER_THRESHOLD) {
                cluster.push(scored[j]);
                used[j] = true;
            }
        }
        cluster.sort((a, b) => sourcePriorityRank(a.article.source) - sourcePriorityRank(b.article.source));
        const representative = cluster[0];
        // Cluster score = highest score in the cluster, so a story covered by many
        // outlets still ranks by its true reach even though only one copy survives.
        const clusterScore = Math.max(...cluster.map(c => c.score));
        clustered.push({ ...representative, score: clusterScore });
    }

    clustered.sort((a, b) => b.score - a.score);

    // Dynamic cap: quiet news day -> fewer candidates sent to Gemini, busy day -> up to MAX_CANDIDATES.
    const highImpactCount = clustered.filter(c => c.score >= HIGH_IMPACT_SCORE_THRESHOLD).length;
    const limit = Math.max(MIN_CANDIDATES, Math.min(MAX_CANDIDATES, highImpactCount || MIN_CANDIDATES));

    // `articleIndex` preserves the position in the ORIGINAL `articles` array (pre-ranking).
    // screenArticles/deepAnalyzeArticles must echo this back as `originalId` - if a caller
    // uses the candidate list's own position instead, `articles[originalId]` in
    // cron-update-news.js/analyze-news.js silently resolves to an unrelated article.
    return clustered.slice(0, limit).map(c => ({ ...c.article, headlineFrequencyScore: c.score, articleIndex: c.idx }));
}

// Fixed category set so downstream code (per-category caps, dashboards) can rely on
// a closed vocabulary instead of free-text Gemini output drifting over time.
export const NEWS_CATEGORIES = [
    '통화정책/금리', '반도체/IT', '지정학', '환율/원자재', '거시경제',
    '고용/무역지표', '중국경기', '국내증시', '기업/산업', '기타'
];

export function buildScreeningPrompt(articles) {
    return `
You are a highly efficient news screener for the South Korean Stock Market.
I will provide you with a list of global news articles, already pre-filtered by headline-frequency
across many outlets (higher headlineFrequencyScore = discussed more widely today).
Your task is to identify the top MAXIMUM ${LIST_SIZE} articles that have the HIGHEST impact on the Korean stock market (KOSPI/KOSDAQ).
Ignore duplicates, low-impact news, or generic opinions.

**THEME DIVERSITY RULE**: Several articles below may describe the SAME underlying macro
event from different angles (e.g. one is a fact-check, one is a political reaction, one is
the market's price move) - these count as ONE story even if their headlines and wording
differ. Select AT MOST 2 articles per underlying event/theme, prioritizing the one with the
clearest direct market impact. Do NOT let a single busy news event (e.g. one day's oil-price
story) fill most of your selection - actively look for distinct, unrelated stories/sectors so
the final list reflects a spread of what actually matters today, not one repeated topic.

For each selected article, classify it into EXACTLY ONE of these categories:
${JSON.stringify(NEWS_CATEGORIES)}

Raw articles:
${JSON.stringify(articles.map(a => ({ id: a.articleIndex, title: a.title, source: a.source, headlineFrequencyScore: a.headlineFrequencyScore ?? 0 })), null, 2)}

Output exactly a JSON array. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "id": 0,
    "category": "one of the categories listed above, exactly as written",
    "reason": "1 sentence reason why this is high impact"
  }
]
`;
}

export function buildDeepAnalysisPrompt(selectedArticles) {
    return `
You are a top-tier Macroeconomics and Stock Market Analyst in South Korea (여의도 애널리스트).
I will provide you with a highly filtered list of critical global news articles.
Your task follows a strict PDCA methodology to analyze their deep impact on the South Korean Stock Market (KOSPI/KOSDAQ).

1. DO (Base Sentiment & Scoring Matrix):
   - Determine Sentiment strictly using this logic:
     * Monetary Policy: Rate Cut/Dovish -> BULLISH. Rate Hike/Hawkish -> BEARISH.
     * Macro Data: Goldilocks/Soft-landing -> BULLISH. Stagflation/Recession -> BEARISH.
     * Corporate/Tech: Megacap Earnings beat, AI CAPEX up -> BULLISH. Earnings miss, inventory up -> BEARISH.
     * Geopolitics: De-escalation -> BULLISH. Escalation -> BEARISH.
   - Assign Base Impact Score (50-100) using this explicit weighted rubric:
     * Market-wide transmission strength (40%): how directly and broadly this moves KOSPI/KOSDAQ.
     * Macro relevance to Korea (30%): direct linkage to Korea's economy (exports, USD/KRW, rates).
     * Headline exposure (30%): the article's \`headlineFrequencyScore\` field below - a higher
       value means many outlets independently ran this as a headline today, which should raise
       the score; a low value (isolated / niche coverage) should not be scored as high-impact
       even if the topic sounds dramatic.
2. CHECK (Korea-Specific Calibration):
   - Calibrate the base sentiment and score specifically for the South Korean market (e.g. semiconductor exports, USD/KRW).
3. ACT (Final Output Generation & CRITICAL LOGIC CHECK):
   - Finalize the calibrated impactScore (50-100) and sentiment (BULLISH/BEARISH/NEUTRAL).
   - Identify the exact domestic target stocks/sectors that will absorb this impact.
   - **CRITICAL LOGIC CHECK**: Ensure absolute logical consistency. The overall 'sentiment' MUST reflect the actual impact on the target stocks. If the article discusses a "plunge", "crash", "uncertainty", or "risk" that negatively impacts the target stocks (BEARISH), the overall 'sentiment' MUST be BEARISH. Do NOT mistakenly label an article as BULLISH just because it speculates about a future "rebound".
   - **MANDATORY RULE**: If the majority of the \`targetStocks\` are BEARISH, the top-level \`sentiment\` field MUST ALSO be BEARISH.

Here are the selected critical articles:
${JSON.stringify(selectedArticles, null, 2)}

Each article below already carries a \`category\` field assigned during screening. Your
output must ECHO that exact same category string back unchanged - do NOT reclassify or
pick a different one, even if you think another category fits better. The screening
category is used elsewhere to cap how many articles per category get analyzed, and if
you change it here the two stages disagree about what topic each article belongs to.

Output exactly a JSON array containing the deep analysis for EACH of the provided articles. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "originalId": (the originalId from the input),
    "titleKr": "Translate the title to Korean dynamically and naturally",
    "category": (copy the input article's own \`category\` field verbatim - do not invent a new one),
    "impactScore": (integer between 50 and 100 - this is a MAGNITUDE only, not a direction;
      a BEARISH article with severe negative impact should still score high, e.g. 80+),
    "scoreReason": "1-2 sentences explaining how the 40/30/30 weighted rubric produced this
      MAGNITUDE. Word it consistently with the sentiment below - for a BEARISH article, say
      the NEGATIVE impact/risk is large (e.g. '외국인 이탈 압력이 커 파급력이 높음'), never
      '높은 점수를 부여함' in a way that reads as if the news itself were positive.",
    "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
    "summary": "2-3 sentences summarizing the news",
    "phase2DeepAnalysis": {
      "articleContext": "Detailed context and background of the news (Korean)",
      "stepByStepPath": ["1단계: ...", "2단계: ...", "3단계: ..."],
      "transmissionMechanism": "A paragraph explaining the transmission mechanism to the Korean market (Korean)",
      "targetStocks": [
        {
          "name": "Stock Name",
          "ticker": "005930",
          "sentiment": "BULLISH" or "BEARISH",
          "impactLevel": "최상 (Very High)",
          "reasoning": "Reason for impact"
        }
      ],
      "shortTermOutlook": "Short term outlook",
      "longTermOutlook": "Long term outlook"
    }
  }
]
`;
}

// Screening only needs to read a title and return an ID from a fixed list, well within
// a Lite model's capability.
// [2026-08-04] gemini-2.5-flash-lite → 3.1-flash-lite. Google retired 2.5-flash-lite for
// new users and the API began returning 404 ("no longer available to new users"), which
// silently broke the daily cron — the failure surfaced only as stale news data.
// PRO_MODEL was already on 3.1; this constant was the one left behind.
const FLASH_MODEL = 'gemini-3.1-flash-lite';
// $0.25/$1.50 per 1M input/output tokens (ai.google.dev/gemini-api/docs/pricing) -
// cheaper than gemini-2.5-flash and confirmed available via /api/test-models on this
// account. The deep-analysis task here is rule-following + structured JSON output
// (the rubric/schema are fully spelled out in the prompt), not open-ended reasoning,
// so a Flash-Lite model is sufficient.
const PRO_MODEL = 'gemini-3.1-flash-lite';

// Gemini can return an empty/blocked response (safety filters, quota) with no `candidates`.
// Extracting this in one place turns that into a readable error instead of a raw TypeError.
function extractGeminiText(data, label) {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) {
        const blockReason = data?.promptFeedback?.blockReason;
        throw new Error(`${label} returned no usable content${blockReason ? ` (blockReason: ${blockReason})` : ''}: ${JSON.stringify(data).slice(0, 500)}`);
    }
    return text;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retries only on transient failures (429 rate limit, 5xx server errors). Auth/validation
// errors (4xx other than 429) fail immediately since retrying won't help and just burns time.
export async function fetchWithRetry(url, options, { retries = 3, baseDelayMs = 3000 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await fetch(url, options);
        if (response.ok) return response;

        const isRetryable = response.status === 429 || response.status >= 500;
        if (!isRetryable || attempt === retries) {
            return response;
        }

        lastError = response;
        await sleep(baseDelayMs * Math.pow(3, attempt));
    }
    return lastError;
}

export async function screenArticles(articles, apiKey) {
    const flashResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${FLASH_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: buildScreeningPrompt(articles) }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
    });

    if (!flashResponse.ok) {
        const errBody = await flashResponse.text();
        throw new Error(`Gemini Flash API Error: ${flashResponse.status} ${errBody}`);
    }

    const flashData = await flashResponse.json();
    const screenedList = JSON.parse(extractGeminiText(flashData, 'Gemini Flash screening'));

    // Gemini echoes back the `id` we gave it in buildScreeningPrompt, which is each
    // candidate's `articleIndex` (its position in the ORIGINAL articles array) - not
    // this `articles`/`candidates` array's own position. Look candidates up by that
    // original index so `originalId` stays valid once it reaches deepAnalyzeArticles.
    const byOriginalIndex = new Map(articles.map(a => [a.articleIndex, a]));

    return screenedList.map(item => {
        const source = byOriginalIndex.get(item.id);
        return {
            originalId: item.id,
            title: source?.title,
            originalTitle: source?.title,
            url: source?.link,
            pubDate: source?.pubDate,
            source: source?.source,
            headlineFrequencyScore: source?.headlineFrequencyScore ?? 0,
            // Gemini is asked to pick from NEWS_CATEGORIES but may still drift on a bad
            // day - fall back to '기타' rather than let an unexpected value break
            // anything downstream that groups/counts by category.
            category: NEWS_CATEGORIES.includes(item.category) ? item.category : '기타',
            reason: item.reason || ''
        };
    }).filter(a => a.title);
}

export async function deepAnalyzeArticles(selectedArticles, apiKey) {
    const proResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${PRO_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: buildDeepAnalysisPrompt(selectedArticles) }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
    });

    if (!proResponse.ok) {
        const errBody = await proResponse.text();
        throw new Error(`Gemini Pro API Error: ${proResponse.status} ${errBody}`);
    }

    const data = await proResponse.json();
    const responseText = extractGeminiText(data, 'Gemini Pro deep analysis');

    try {
        return JSON.parse(responseText);
    } catch (parseErr) {
        // Gemini occasionally emits a well-formed JSON array followed by stray extra
        // characters/brackets after it (observed 2026-08-05: a valid 5-item array,
        // then three more unmatched `]`/`}` tokens tacked on). Recover by extracting
        // just the first balanced top-level array instead of failing the whole batch.
        const recovered = extractFirstJsonArray(responseText);
        if (recovered !== null) {
            try {
                return JSON.parse(recovered);
            } catch (recoverErr) {
                // fall through to the original error below
            }
        }
        console.error('Failed to parse Gemini output:', responseText);
        throw new Error('Gemini output was not valid JSON');
    }
}

// Scans for the first top-level `[...]` and returns it once brackets balance out,
// tracking string/escape state so brackets inside quoted text don't get counted.
// Returns null if no balanced array is found (e.g. genuinely truncated output).
function extractFirstJsonArray(text) {
    const start = text.indexOf('[');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
        } else if (ch === '[') {
            depth++;
        } else if (ch === ']') {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return null;
}

// Post-processing logical consistency check: overall sentiment must agree with the
// majority direction of targetStocks (the model occasionally contradicts itself).
export function reconcileSentiment(sentiment, targetStocks) {
    let resolved = sentiment || "NEUTRAL";
    if (targetStocks && targetStocks.length > 0) {
        const bearishCount = targetStocks.filter(s => s.sentiment === "BEARISH").length;
        const bullishCount = targetStocks.filter(s => s.sentiment === "BULLISH").length;
        if (bearishCount > 0 && bullishCount === 0 && resolved === "BULLISH") {
            resolved = "BEARISH";
        } else if (bullishCount > 0 && bearishCount === 0 && resolved === "BEARISH") {
            resolved = "BULLISH";
        }
    }
    return resolved;
}

export async function purgeOldNews(supabaseUrl, supabaseKey, olderThanDays, table = 'news_impacts') {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    try {
        await fetch(`${supabaseUrl}/rest/v1/${table}?created_at=lt.${cutoff}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
    } catch (delErr) {
        console.warn(`[Supabase Cleanup Warning] (${table})`, delErr);
    }
}

// ==========================================================================
// news_shortlist: the "list" output of the screening step, saved BEFORE any
// deep-analysis Gemini call so it can be inspected/verified independently of
// what happens downstream (see 2026-08-04 pipeline redesign notes above).
// ==========================================================================

export async function saveShortlist(supabaseUrl, supabaseKey, shortlist) {
    const payload = shortlist.map(item => ({
        title: item.titleKr || item.title,
        original_title: item.originalTitle || item.title,
        source: item.source || '',
        category: item.category || '기타',
        reason: item.reason || '',
        url: item.url || '',
        published_at: item.pubDate || null,
        headline_frequency_score: item.headlineFrequencyScore ?? 0
    }));

    await purgeOldNews(supabaseUrl, supabaseKey, 14, 'news_shortlist');

    return fetch(`${supabaseUrl}/rest/v1/news_shortlist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
    });
}

// From the shortlist, pick the top N for the expensive deep-analysis call, capping
// how many can come from any single category so one busy topic (e.g. "이란/유가")
// can't crowd out the rest of the deep-analysis budget even if it dominates the
// shortlist itself.
export function selectTopForDeepAnalysis(shortlist, n = DEEP_ANALYSIS_TOP_N, maxPerCategory = DEEP_ANALYSIS_MAX_PER_CATEGORY) {
    const sorted = [...shortlist].sort((a, b) => (b.headlineFrequencyScore ?? 0) - (a.headlineFrequencyScore ?? 0));
    const perCategoryCount = new Map();
    const selected = [];

    for (const item of sorted) {
        if (selected.length >= n) break;
        const category = item.category || '기타';
        const countSoFar = perCategoryCount.get(category) || 0;
        if (countSoFar >= maxPerCategory) continue;
        selected.push(item);
        perCategoryCount.set(category, countSoFar + 1);
    }

    // If the per-category cap left the quota under-filled (e.g. too few categories
    // represented), backfill with whatever's left over in score order.
    if (selected.length < n) {
        for (const item of sorted) {
            if (selected.length >= n) break;
            if (!selected.includes(item)) selected.push(item);
        }
    }

    return selected;
}

export async function insertNews(supabaseUrl, supabaseKey, payload) {
    return fetch(`${supabaseUrl}/rest/v1/news_impacts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            // Requires the news_impacts_url_unique constraint (see supabase-migration.sql).
            // Without it Postgres has nothing to deduplicate on and this header is a no-op.
            'Prefer': 'return=minimal,resolution=ignore-duplicates'
        },
        body: JSON.stringify(payload)
    });
}

// ==========================================================================
// fetch_state: single-row table tracking incremental collection + a simple
// advisory lock so the cron job and a manual "뉴스분석" click don't run the
// Gemini pipeline concurrently and double-save the same day's news.
// ==========================================================================

const LOCK_STALE_MS = 5 * 60 * 1000; // treat a lock older than this as abandoned (crashed function)

export async function getFetchState(supabaseUrl, supabaseKey) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/fetch_state?id=eq.1&select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!resp.ok) throw new Error(`Failed to read fetch_state: ${resp.status}`);
    const rows = await resp.json();
    return rows[0] || { id: 1, last_fetched_at: null, is_analyzing: false, analyzing_started_at: null };
}

async function patchFetchState(supabaseUrl, supabaseKey, patch) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/fetch_state?id=eq.1`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(patch)
    });
    if (!resp.ok) {
        console.warn('[fetch_state] patch failed:', resp.status, await resp.text());
    }
}

// Returns true if the lock was acquired. Stale locks (older than LOCK_STALE_MS, meaning a
// previous run likely crashed without releasing it) are treated as free.
export async function acquireAnalysisLock(supabaseUrl, supabaseKey) {
    const state = await getFetchState(supabaseUrl, supabaseKey);
    const startedAt = state.analyzing_started_at ? new Date(state.analyzing_started_at).getTime() : 0;
    const isStale = Date.now() - startedAt > LOCK_STALE_MS;

    if (state.is_analyzing && !isStale) {
        return false;
    }

    await patchFetchState(supabaseUrl, supabaseKey, {
        is_analyzing: true,
        analyzing_started_at: new Date().toISOString()
    });
    return true;
}

export async function releaseAnalysisLock(supabaseUrl, supabaseKey) {
    await patchFetchState(supabaseUrl, supabaseKey, { is_analyzing: false });
}

// cron-only: advances last_fetched_at so the next run only pulls new articles.
// Manual (analyze-news) triggers must NOT call this - see cron-update-news.js comment.
export async function markFetchedNow(supabaseUrl, supabaseKey) {
    await patchFetchState(supabaseUrl, supabaseKey, { last_fetched_at: new Date().toISOString() });
}

const MAX_LOOKBACK_HOURS = 30; // safety ceiling if last_fetched_at is missing or very old

export function resolveCollectionWindowStart(lastFetchedAt) {
    const ceiling = Date.now() - MAX_LOOKBACK_HOURS * 60 * 60 * 1000;
    if (!lastFetchedAt) return ceiling;
    const since = new Date(lastFetchedAt).getTime();
    return Math.max(since, ceiling);
}
