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
    '%EA%B8%88%EB%A6%AC+OR+%ED%99%98%EC%9C%A8+OR+%EC%97%B0%EC%A4%80+when:1d', // 금리 OR 환율 OR 연준
    '%EB%B0%98%EB%8F%84%EC%B2%B4+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+OR+%EC%BD%94%EC%8A%A4%EB%8B%A5+when:1d', // 반도체 OR 코스피 OR 코스닥
    '%EA%B8%80%EB%A1%9C%EB%B2%8C+%EA%B2%BD%EC%A0%9C+OR+%EC%A6%9D%EC%8B%9C+OR+%EB%AC%B4%EC%97%AD+when:1d' // 글로벌 경제 OR 증시 OR 무역
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

function tokenize(title) {
    return (title || '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
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

const SIMILARITY_CLUSTER_THRESHOLD = 0.5;
const HIGH_IMPACT_SCORE_THRESHOLD = 6;
const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 7;

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

    return clustered.slice(0, limit).map(c => ({ ...c.article, headlineFrequencyScore: c.score }));
}

export function buildScreeningPrompt(articles) {
    return `
You are a highly efficient news screener for the South Korean Stock Market.
I will provide you with a list of global news articles, already pre-filtered by headline-frequency
across many outlets (higher headlineFrequencyScore = discussed more widely today).
Your task is to identify the top MAXIMUM 10 articles that have the HIGHEST impact on the Korean stock market (KOSPI/KOSDAQ).
Ignore duplicates, low-impact news, or generic opinions.

Raw articles:
${JSON.stringify(articles.map((a, i) => ({ id: i, title: a.title, source: a.source, headlineFrequencyScore: a.headlineFrequencyScore ?? 0 })), null, 2)}

Output exactly a JSON array containing the selected article IDs. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "id": 0,
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

Output exactly a JSON array containing the deep analysis for EACH of the provided articles. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "originalId": (the originalId from the input),
    "titleKr": "Translate the title to Korean dynamically and naturally",
    "category": "e.g., 통화정책/금융, 반도체/IT, 거시경제",
    "impactScore": (integer between 50 and 100),
    "scoreReason": "1-2 sentences explaining how the 40/30/30 weighted rubric produced this score",
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

const FLASH_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-2.5-pro';

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

    return screenedList.map(item => ({
        originalId: item.id,
        title: articles[item.id]?.title,
        source: articles[item.id]?.source,
        headlineFrequencyScore: articles[item.id]?.headlineFrequencyScore ?? 0
    })).filter(a => a.title);
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
        console.error('Failed to parse Gemini output:', responseText);
        throw new Error('Gemini output was not valid JSON');
    }
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

export async function purgeOldNews(supabaseUrl, supabaseKey, olderThanDays) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    try {
        await fetch(`${supabaseUrl}/rest/v1/news_impacts?created_at=lt.${cutoff}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
    } catch (delErr) {
        console.warn('[Supabase Cleanup Warning]', delErr);
    }
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
