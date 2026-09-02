// Shared pipeline logic for analyze-news.js (user-triggered) and cron-update-news.js (scheduled).
// Keeping this in one place avoids the two routes drifting apart when prompts/models change.

// Category-grouped Google News RSS search queries. Kept as search queries (not per-outlet
// feeds) because per-outlet RSS formats vary enough to need their own parsers - out of scope
// for this pass. Expanding beyond 2 queries widens headline coverage before the local
// frequency ranking below picks candidates, without adding any paid API calls.
//
// Each query carries a `group` label. This is NOT the same as NEWS_CATEGORIES (which
// Gemini assigns per-article) - it's used earlier, purely locally, so
// rankByHeadlineFrequency can cap how many of the top candidates come from one query
// group. Without this, a single heavy-news-volume topic (e.g. a big China trade data
// release) can fill the entire local shortlist by token-frequency alone and starve out
// other groups - including ones with genuinely market-moving news that day (e.g. a Fed
// official signalling a rate hike) - before Gemini screening ever sees them.
export const RSS_QUERIES = [
    { group: 'fed_rates', query: 'Fed+OR+FOMC+OR+"interest+rate"+OR+"rate+cut"+OR+"rate+hike"+when:1d' },
    { group: 'semiconductor', query: 'Semiconductor+OR+chip+OR+"AI+capex"+OR+Nvidia+when:1d' },
    { group: 'inflation', query: 'inflation+OR+CPI+OR+"jobs+report"+OR+recession+when:1d' },
    { group: 'geopolitics', query: 'geopolitics+OR+tariff+OR+sanctions+OR+war+when:1d' },
    { group: 'oil', query: 'oil+OR+commodity+OR+"crude+price"+OR+OPEC+when:1d' },
    { group: 'jobs', query: '"nonfarm+payrolls"+OR+"unemployment+rate"+OR+"jobs+report"+when:1d' }, // US labor market
    { group: 'treasury_yield', query: '"treasury+yield"+OR+"10-year+yield"+OR+"bond+market"+when:1d' }, // US rates transmission mechanism
    { group: 'ism_pmi', query: 'ISM+OR+"manufacturing+PMI"+OR+"factory+activity"+when:1d' }, // US leading indicator
    { group: 'china', query: 'China+OR+"Chinese+economy"+OR+"China+PMI"+when:1d' }, // Korea's largest trading partner
    { group: 'fed_rates_kr', query: '%EA%B8%88%EB%A6%AC+OR+%ED%99%98%EC%9C%A8+OR+%EC%97%B0%EC%A4%80+when:1d' }, // 금리 OR 환율 OR 연준
    { group: 'semiconductor_kr', query: '%EB%B0%98%EB%8F%84%EC%B2%B4+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+OR+%EC%BD%94%EC%8A%A4%EB%8B%A5+when:1d' }, // 반도체 OR 코스피 OR 코스닥
    { group: 'macro_kr', query: '%EA%B8%80%EB%A1%9C%EB%B2%8C+%EA%B2%BD%EC%A0%9C+OR+%EC%A6%9D%EC%8B%9C+OR+%EB%AC%B4%EC%97%AD+when:1d' }, // 글로벌 경제 OR 증시 OR 무역
    { group: 'foreign_flows_kr', query: '%EC%99%B8%EA%B5%AD%EC%9D%B8+%EC%88%9C%EB%A7%A4%EC%88%98+OR+%EC%88%9C%EB%A7%A4%EB%8F%84+OR+%EB%AC%B4%EC%97%AD%EC%88%98%EC%A7%80+when:1d' } // 외국인 순매수 OR 순매도 OR 무역수지
];

function buildRssUrl(query, lang) {
    return `https://news.google.com/rss/search?q=${query}&hl=${lang === 'ko' ? 'ko&gl=KR&ceid=KR:ko' : 'en-US&gl=US&ceid=US:en'}`;
}

// Returns [{ url, group }] so callers can tag each fetched item with the query group
// it came from - required for the diversity cap in rankByHeadlineFrequency below.
export function buildRssUrls() {
    return RSS_QUERIES.flatMap(({ group, query }) => [
        { url: buildRssUrl(query, 'en'), group },
        { url: buildRssUrl(query, 'ko'), group }
    ]);
}

// 국내 6대 경제지 - 헤더 "국내뉴스" 카드용, buildRssUrls()의 글로벌 매크로 쿼리와는
// 별개 소스. site: 필터로 각 언론사 도메인의 24시간 이내 기사만 Google News RSS로
// 가져온다. 언론사별 자체 RSS 포맷을 각각 파싱하는 대신 기존 parseRssItems()를
// 그대로 재사용할 수 있어 유지보수 포인트가 하나로 유지된다.
export const DOMESTIC_ECONOMIC_OUTLETS = [
    { group: 'hankyung', name: '한국경제', domain: 'hankyung.com' },
    { group: 'mk', name: '매일경제', domain: 'mk.co.kr' },
    { group: 'sedaily', name: '서울경제', domain: 'sedaily.com' },
    { group: 'herald', name: '헤럴드경제', domain: 'heraldcorp.com' },
    { group: 'hankookilbo', name: '한국일보', domain: 'hankookilbo.com' },
    { group: 'ajunews', name: '아주경제', domain: 'ajunews.com' }
];

// [2026-09-02] site:도메인 단독 검색은 그 언론사의 전 섹션(정치/사회/연예/스포츠 포함)을
// 다 가져온다 - 실측 확인: 국내뉴스 후보 40건 중 절반 가까이가 연예(mk.co.kr 드라마
// 기사 다수)/사건사고/지자체 미담이었음. 검색어 자체에 경제 키워드를 OR로 추가해
// 수집 단계에서부터 경제 관련어가 있는 기사만 가져오도록 좁힘 - filterDomesticEconomicArticles
// (포토/시상식 패턴만 거름)만으로는 이 정도 비중을 감당 못 함이 실측으로 확인됨.
const DOMESTIC_ECONOMIC_KEYWORDS = '경제+OR+증시+OR+코스피+OR+코스닥+OR+기업+OR+금리+OR+산업+OR+투자+OR+수출';

// Returns [{ url, group }], same shape as buildRssUrls(), so fetchAllRssItems() works
// unchanged for this source too.
export function buildDomesticRssUrls() {
    return DOMESTIC_ECONOMIC_OUTLETS.map(({ group, domain }) => ({
        url: buildRssUrl(`site:${domain}+(${DOMESTIC_ECONOMIC_KEYWORDS})+when:1d`, 'ko'),
        group
    }));
}

// 6대 경제지는 경제 기사 외에 포토/시상식/연예 섹션도 함께 RSS에 실어 보낸다. 이런
// 기사는 "[포토]"/"[MK포토]" 같은 대괄호 태그로 시작하는 경우가 대부분이고, 여러
// 매체가 같은 시상식을 동시 보도하면서 headline-frequency 점수를 진짜 경제뉴스보다
// 높게 받아 스크리닝 후보 풀(rankByHeadlineFrequency의 MAX_CANDIDATES=40)을 잠식하는
// 문제가 실측으로 확인됐다(2026-09-02, "올해의 브랜드 대상" 포토뉴스가 헤드라인
// 빈도 1위). Gemini 스크리닝에 넘기기 전에 로컬에서 걸러낸다.
const NON_ECONOMIC_TITLE_PATTERN = /\[(포토|MK포토|화보|영상|카드뉴스|만평)\]|시상식|레드카펫|포토콜/;

export function filterDomesticEconomicArticles(articles) {
    return articles.filter(a => !NON_ECONOMIC_TITLE_PATTERN.test(a.title || ''));
}

// [2026-08-08] Social-media aggregator feeds (Facebook page RSS syndication is the
// observed case) put the full post text in <title> instead of a real headline. A post
// with 2 full sentences tokenizes to 30+ words vs. a normal headline's 5-10, so it shares
// enough common tokens with that day's real coverage to win the headline-frequency score
// outright (observed: a Facebook post scored 134, the day's highest, while every genuine
// headline scored under 70). Block known SNS domains at parse time so this can't happen
// regardless of scoring tweaks made later.
const BLOCKED_SOURCE_DOMAINS = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'threads.net'];

function isBlockedSource(source) {
    const normalized = (source || '').toLowerCase();
    return BLOCKED_SOURCE_DOMAINS.some(d => normalized.includes(d));
}

// [2026-08-10] Market-research promo sites (IndexBox, MarketWatch-style aggregators,
// paid-report vendors) title their listings like "X Market to Reach $Y by 2035" and
// often stuff in an unrelated hot keyword (observed: "...on Semiconductor Cleanroom
// Demand" tacked onto a fabrics-market report) purely to get picked up by keyword-based
// RSS searches. This let a fabrics report win the day's "반도체/IT" category slot ahead
// of any real semiconductor news, and Gemini deep-analysis then invented a plausible-
// sounding Samsung/SK hynix impact story around it. Filter the title pattern at parse
// time rather than trying to catch this downstream.
// [2026-08-23] "Growth"/"Growth Driven by" slipped through the original pattern
// (only matched "to grow", not the noun "growth") - observed directly: "Glove Port
// Inserts Market Growth Driven by Semiconductor Fab Expansion Through 2035" reached
// the shortlist by stuffing "Semiconductor" into the title exactly like the fabrics
// report this filter was built to catch. Added "growth" and "outlook" as additional
// trigger words alongside the original list.
const MARKET_RESEARCH_TITLE_PATTERN = /\bmarket\b.{0,40}\b(to reach|to hit|to grow|growth|outlook|size|forecast|cagr)\b/i;

// Known market-research/paid-report aggregator domains whose entire output is this kind
// of listing - a source-level check catches title phrasings the regex above can't
// anticipate, without needing the title to match a specific pattern at all.
const MARKET_RESEARCH_SOURCE_DOMAINS = ['indexbox', 'openpr.com', 'marketresearch.com', 'businesswire.com'];

function isMarketResearchTitle(title, source) {
    if (MARKET_RESEARCH_TITLE_PATTERN.test(title || '')) return true;
    const normalizedSource = (source || '').toLowerCase();
    return MARKET_RESEARCH_SOURCE_DOMAINS.some(d => normalizedSource.includes(d));
}

export function parseRssItems(xmlText, queryGroup = null) {
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

        if (rawTitle && link && !isBlockedSource(source) && !isMarketResearchTitle(rawTitle, source)) {
            items.push({ title: rawTitle, link, pubDate, source, queryGroup });
        }
    }
    return items;
}

// [2026-08-11] cron-update-news.js and news-rss.js each fetched buildRssUrls()'s 26 URLs
// (13 queries x en/ko) one at a time in a `for...await` loop. Even at ~1s per Google News
// RSS request, 26 sequential requests alone can approach/exceed cron-job.org's 30s
// timeout before Gemini screening or deep analysis even start - this is what caused the
// "Failed (timeout)" cron run on 2026-08-11. Fetching all feeds concurrently instead
// turns ~26x sequential latency into ~1x (bounded by the slowest single feed).
export async function fetchAllRssItems(rssUrls) {
    const results = await Promise.all(rssUrls.map(async ({ url, group }) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                }
            });
            if (!response.ok) return [];
            const xmlText = await response.text();
            return parseRssItems(xmlText, group);
        } catch (e) {
            console.error('[RSS Fetch Error]', url, e.message);
            return [];
        }
    }));
    return results.flat();
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

// Tiered source trust list. `weight` feeds the headline-frequency score below (a Tier-1
// exclusive report gets a floor even with zero cross-outlet repetition); the tier order
// also drives sourcePriorityRank() (picking a cluster's representative article) via
// flattening below, so the two never disagree about which sources rank higher.
const SOURCE_TIERS = [
    { weight: 1.5, sources: ['reuters', 'bloomberg', 'wall street journal', 'wsj', 'financial times', 'ft', 'yonhap', '연합뉴스'] },
    { weight: 1.2, sources: ['cnbc', 'nikkei', 's&p global', '한국경제', '매일경제'] }
    // anything not listed falls through to weight 1.0 / lowest cluster-representative priority.
];

// 3-char-or-shorter abbreviations (ft, wsj) can appear as a substring inside an unrelated
// outlet name (e.g. "Aftenposten" contains "ft"), so match those on a word boundary.
// Longer names (reuters, bloomberg...) are safe with plain substring matching, including
// suffixed variants like "Bloomberg.com".
function matchesSource(normalizedSource, candidate) {
    return candidate.length <= 3
        ? new RegExp(`\\b${candidate}\\b`, 'i').test(normalizedSource)
        : normalizedSource.includes(candidate);
}

function findSourceTier(source) {
    const normalized = (source || '').toLowerCase();
    return SOURCE_TIERS.find(tier => tier.sources.some(s => matchesSource(normalized, s)));
}

function sourceWeight(source) {
    return findSourceTier(source)?.weight ?? 1.0;
}

// Kept separate from sourceWeight() so callers never compare the 1.5 float literal
// directly - if SOURCE_TIERS is reordered or its weights change, this still means
// exactly "top tier" without needing to be updated in lockstep.
function isTopTierSource(source) {
    return findSourceTier(source) === SOURCE_TIERS[0];
}

const SOURCE_PRIORITY = SOURCE_TIERS.flatMap(tier => tier.sources);

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

// [2026-08-13] Plain Jaccard over full-headline tokens badly under-clusters the same
// event across languages: a Korean headline about US CPI and an English one about the
// same CPI print share only "cpi" out of ~12-13 tokens each (Jaccard ~0.04, nowhere
// near SIMILARITY_CLUSTER_THRESHOLD 0.35) because every surrounding word differs by
// language. Observed directly on 2026-08-13: 22 of 40 candidates were all the same
// "US CPI cools, AI/semiconductor rally" story in KR/EN, none of which clustered
// together, so the diversity-capped Gemini screening step only had ~15-18 genuinely
// distinct stories to choose from despite 40 raw candidates.
// These are highly specific, low-ambiguity event anchors (acronyms/proper nouns that
// appear verbatim in Korean text too, e.g. "CPI" inside a Korean headline). Sharing
// even ONE of these is treated as the same underlying event regardless of language -
// deliberately excluded are broad theme words (AI, 반도체/semiconductor, 금리/rate)
// that would over-merge genuinely distinct stories sharing only a topic, not an event.
const EVENT_ANCHOR_TOKENS = new Set([
    'cpi', 'fomc', 'nvidia', '엔비디아', 'opec', 'nonfarm', 'ism',
    'fed', '연준', 'boj', 'ecb',
    // [2026-08-13] Added after the first anchor pass still left ~15 "same CPI print"
    // headlines unclustered - many outlets wrote "inflation"/"물가" instead of the
    // literal acronym "CPI". Still a specific same-day macro release, not a broad topic.
    'inflation', '물가', '인플레이션'
]);

function sharesEventAnchor(setA, setB) {
    for (const t of setA) {
        if (EVENT_ANCHOR_TOKENS.has(t) && setB.has(t)) return true;
    }
    return false;
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
// [2026-08-13] Raised from 20 to 40: with LIST_SIZE also raised to 20 (see below),
// giving Gemini only 20 raw candidates left no headroom once the theme-diversity
// rule dropped same-event duplicates - observed directly, a 20-candidate batch
// screened down to just 8 shortlist items on a CPI/AI-rally-heavy day. Gemini needs
// a genuinely wider pool to find 20 DISTINCT stories from, not just 20 candidates
// to rubber-stamp.
const MAX_CANDIDATES = 40;
// [2026-08-07] On a heavy news day for one RSS query group (e.g. a big China trade
// data release), that group's articles can share enough repeated tokens (country
// name, "trade", "exports"...) to dominate the token-frequency score and fill ALL
// MAX_CANDIDATES slots by itself - even when a different group has genuinely
// market-moving news that day (e.g. a Fed official signalling a rate hike). Capping
// candidates-per-query-group guarantees every RSS query at least gets a chance to
// reach Gemini screening, rather than being drowned out purely by story volume.
// [2026-08-13] Raised from 4 to 8 alongside MAX_CANDIDATES 20->40, keeping the same
// ~5x ratio so the per-group ceiling scales with the larger pool instead of becoming
// the binding constraint that stops any single busy group from ever supplying its
// fair share of the now-larger candidate list.
const MAX_CANDIDATES_PER_QUERY_GROUP = 8;

// [2026-08-24] Observed directly: china's raw daily volume (China is covered by both
// English "china" and, indirectly, oil/geopolitics/semiconductor queries) let it fill
// its full 8-slot allowance almost every day, then pick up MORE representation via
// China-mentioning articles that happened to rank into other groups. Result: China went
// from 11.5% of the raw 30h collection to 30% of the 40-candidate pool to 40% of the
// final 20-item shortlist - a 3.5x amplification purely from one group's news volume,
// not from China actually mattering 3.5x more to KOSPI/KOSDAQ that day. A tighter cap
// on just this one group (other groups keep the default 8) leaves more slots open for
// fed_rates/oil/geopolitics/etc. to compete on their own merits instead of losing ties
// to a group with structurally more daily output.
const QUERY_GROUP_CANDIDATE_CAPS = { china: 4 };

function candidateCapForGroup(group) {
    return QUERY_GROUP_CANDIDATE_CAPS[group] ?? MAX_CANDIDATES_PER_QUERY_GROUP;
}

// [2026-08-04 redesign] The pipeline used to conflate "which articles are worth
// showing" with "which articles are worth spending Gemini deep-analysis tokens
// on" - both were capped at the same small number (7), so once deep analysis was
// wired to the same list, a single busy news event could dominate everything
// downstream with no visibility into why. Now screening produces a wider
// shortlist (a cheap, single Lite call regardless of size) that gets saved and
// can be inspected on its own; only a smaller top-N of THAT list goes on to the
// expensive structured deep-analysis call.
// [2026-08-13] Raised from 14 to 20 at user request: shortlist was landing as low as
// 8 items because the screening prompt only ever said "MAXIMUM N", so Gemini's
// theme-diversity filtering had no floor to respect. Requirement is now a hard
// minimum of 20 distinct (non-duplicate) stories, enforced in the prompt below.
export const LIST_SIZE = 20; // how many articles the screening step selects into the shortlist
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

    // BASE_SCORE ensures a genuine exclusive (zero token overlap with anything else that
    // day) doesn't score exactly 0 - multiplying 0 by any source weight is still 0, so an
    // additive floor is what actually lets source trust rescue an exclusive from the cut.
    const BASE_SCORE = 1;
    const scored = articles.map((article, idx) => {
        let freqScore = 0;
        tokenSets[idx].forEach(token => { freqScore += Math.max(0, freq.get(token) - 1); }); // -1: don't count the article's own headline
        const score = (BASE_SCORE + freqScore) * sourceWeight(article.source);
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
            const similar = jaccardSimilarity(scored[i].tokens, scored[j].tokens) >= SIMILARITY_CLUSTER_THRESHOLD
                || sharesEventAnchor(scored[i].tokens, scored[j].tokens);
            if (similar) {
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

    // Diversity pass: take top-scoring articles up to MAX_CANDIDATES_PER_QUERY_GROUP per
    // RSS query group first, then backfill any remaining slots by pure score. This is the
    // same two-phase pattern as selectTopForDeepAnalysis() below, one stage earlier in
    // the pipeline. queryGroup is null for callers that don't tag it (e.g. ad-hoc use) -
    // those items are treated as their own ungrouped bucket and never crowd anything out.
    const perGroupCount = new Map();
    const diverse = [];
    for (const c of clustered) {
        if (diverse.length >= limit) break;
        const group = c.article.queryGroup ?? `__ungrouped_${c.idx}`;
        const countSoFar = perGroupCount.get(group) || 0;
        if (countSoFar >= candidateCapForGroup(group)) continue;
        diverse.push(c);
        perGroupCount.set(group, countSoFar + 1);
    }
    if (diverse.length < limit) {
        for (const c of clustered) {
            if (diverse.length >= limit) break;
            if (!diverse.includes(c)) diverse.push(c);
        }
    }

    // Top-tier-source floor: if no Tier-1 source made it into the candidates (e.g. every
    // Reuters/Bloomberg story that day was an exclusive with too little cross-outlet
    // repetition to out-score a busy topic), swap the single lowest-scoring candidate for
    // the best-scoring excluded Tier-1 article. MAX_CANDIDATES stays fixed either way, so
    // this never changes Gemini screening's token cost.
    if (!diverse.some(c => isTopTierSource(c.article.source))) {
        const bestExcludedTopTier = clustered
            .filter(c => !diverse.includes(c) && isTopTierSource(c.article.source))
            .sort((a, b) => b.score - a.score)[0];
        if (bestExcludedTopTier) {
            diverse.sort((a, b) => a.score - b.score);
            diverse[0] = bestExcludedTopTier;
            // Restore the descending-by-score contract this function's return value has
            // everywhere else - current callers re-sort by headlineFrequencyScore anyway,
            // but keeping the invariant true avoids surprising a future caller that doesn't.
            diverse.sort((a, b) => b.score - a.score);
        }
    }

    // [2026-08-18] Korean-language query groups (_kr suffix) floor: the score formula
    // rewards cross-outlet repetition, which structurally favors English stories - dozens
    // of English outlets independently cover the same Fed/CPI print, while only a handful
    // of Korean outlets exist to repeat any one Korean story. Observed directly: all 4 _kr
    // groups (fed_rates_kr, semiconductor_kr, macro_kr, foreign_flows_kr) were shut out of
    // the 40-candidate pool entirely on a day where their raw collection had 114 articles
    // combined - not because they were less relevant to the Korean market, but because
    // "many outlets repeated it" penalizes a language with fewer outlets by construction.
    // This isn't about preferring Korean sources - it's removing an artifact of outlet
    // count from a score that's supposed to measure market relevance. Backfill one
    // highest-scoring excluded article per shut-out _kr group, same swap-the-lowest
    // pattern as the top-tier-source floor above (MAX_CANDIDATES unchanged).
    // Swap out the CURRENT lowest-scoring slot not already claimed by an earlier backfill
    // this loop - reusing diverse[0] naively across iterations would let a later group's
    // backfill evict an earlier group's, since the just-inserted (typically low-scoring)
    // article becomes the new diverse[0] on the very next iteration.
    const backfilledIndices = new Set();
    for (const krGroup of ['fed_rates_kr', 'semiconductor_kr', 'macro_kr', 'foreign_flows_kr']) {
        if (diverse.some(c => c.article.queryGroup === krGroup)) continue;
        // Search `scored` (pre-clustering), not `clustered` - a _kr article that lost its
        // cluster's representative slot to a higher-source-priority non-Korean article
        // (see sourcePriorityRank sort above) would otherwise be invisible here even
        // though it was never actually excluded from consideration, just absorbed.
        const bestExcluded = scored
            .filter(c => c.article.queryGroup === krGroup)
            .sort((a, b) => b.score - a.score)[0];
        if (!bestExcluded || diverse.includes(bestExcluded)) continue;

        let swapAt = -1;
        let swapScore = Infinity;
        diverse.forEach((c, i) => {
            if (backfilledIndices.has(i)) return;
            if (c.score < swapScore) { swapScore = c.score; swapAt = i; }
        });
        if (swapAt === -1) continue; // every slot already claimed by an earlier backfill this pass

        diverse[swapAt] = bestExcluded;
        backfilledIndices.add(swapAt);
    }
    diverse.sort((a, b) => b.score - a.score);

    // `articleIndex` preserves the position in the ORIGINAL `articles` array (pre-ranking).
    // screenArticles/deepAnalyzeArticles must echo this back as `originalId` - if a caller
    // uses the candidate list's own position instead, `articles[originalId]` in
    // cron-update-news.js/analyze-news.js silently resolves to an unrelated article.
    return diverse.map(c => ({ ...c.article, headlineFrequencyScore: c.score, articleIndex: c.idx }));
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

Rank articles by how directly they move KOSPI/KOSDAQ, prioritizing in this order:
1. US Fed policy / interest rates (directly drives foreign capital flows into/out of Korea)
2. Semiconductor/AI industry news (Korea's largest export sector - Samsung/SK Hynix supply chain)
3. US-China relations and China's economy (Korea's largest trade partner and a competing exporter)
4. Oil/commodity prices and USD/KRW (Korea imports nearly all its energy - direct cost/inflation impact)
5. Geopolitical events with a clear transmission path to Korean exports, energy costs, or risk sentiment
6. US macro data (CPI, jobs, PMI) that shifts Fed rate expectations
Deprioritize news with no plausible transmission mechanism to Korean markets (e.g. a single
foreign company's unrelated product launch, local politics with no trade/rate/supply-chain link).

Your task is to select EXACTLY ${LIST_SIZE} articles - this is a REQUIRED COUNT, not a ceiling.
Only merge two articles into one selection when they cover the literal same event (see
THEME DIVERSITY RULE below); do not drop articles just because they feel lower-impact once
you already have a handful - keep going down the list by score until you reach ${LIST_SIZE}
distinct stories. If, and only if, the provided articles genuinely do not contain ${LIST_SIZE}
distinct underlying stories (e.g. an unusually quiet news day), select as many distinct stories
as actually exist and no more - never pad with true duplicates just to hit the count.

**THEME DIVERSITY RULE**: Several articles below may describe the SAME underlying macro
event from different angles (e.g. one is a fact-check, one is a political reaction, one is
the market's price move) - these count as ONE story even if their headlines and wording
differ. Select AT MOST 2 articles per underlying event/theme, prioritizing the one with the
clearest direct market impact. Do NOT let a single busy news event (e.g. one day's oil-price
story) fill most of your selection - actively look for distinct, unrelated stories/sectors so
the final list reflects a spread of what actually matters today, not one repeated topic.
This applies to broad ongoing THEMES, not just single news events - e.g. "US Treasury/bond
market direction is uncertain" is one theme even across separately-timed articles (an
explainer, an analyst forecast, a commentary on a specific investor's operations) that
never mention the exact same headline event. If multiple articles are all just restating
"the bond market is unsettled/uncertain/at a turning point" with different framing, that is
still ONE theme - pick the single clearest one and use the freed slots for a genuinely
different subject (a specific company, a specific data release, a specific policy action),
not another restatement of the same uncertainty.

**THEME SHARE CAP**: Beyond the per-theme article cap above, no single broad macro theme
(e.g. "Trump tariffs/geopolitics", "Fed rate hikes/hawkish commentary", "Iran war/Middle
East tensions") should make up more than 20-25% of the ${LIST_SIZE} selected articles (i.e.
at most 4-5 of ${LIST_SIZE}). If the candidate pool is dominated by 2-3 themes, select only
the 1-2 clearest, highest-impact articles from each and actively fill the remaining slots
with genuinely different sectors/subjects (e.g. batteries, biotech, autos, semiconductors,
commodities, domestic Korean policy) even if their individual headlineFrequencyScore is
lower - a lower-frequency but distinct-sector story is more valuable here than a 6th
restatement of the same macro theme.

For each selected article, classify it into EXACTLY ONE of these categories:
${JSON.stringify(NEWS_CATEGORIES)}
Classification guide for the categories that are easiest to confuse:
- 거시경제: global/US market-wide valuation, global GDP, broad multi-factor macro outlook
  (e.g. "US equities' resilience to high rates", "global liquidity conditions") - use this,
  NOT 국내증시, when the article's subject is the US or global market, not Korea's.
- 국내증시: KOSPI/KOSDAQ index levels, Korean market flows/supply-demand, policy or data
  that is specifically about the Korean market - reserve this for articles actually about
  Korea's own market, not foreign markets that merely "could affect" it eventually.
- 반도체/IT: specific big-tech earnings (Broadcom, Nvidia, etc.), AI chips, hardware supply
  chain - use this over 기업/산업 when a named semiconductor/tech company or product is the
  actual subject, even if a macro data point (e.g. a jobs report) is mentioned alongside it.
- 통화정책/금리: central bank (Fed, BOK, ECB) rate decisions/commentary, treasury yields,
  bond market moves specifically tied to policy expectations.

Raw articles:
${JSON.stringify(articles.map(a => ({ id: a.articleIndex, title: a.title, source: a.source, headlineFrequencyScore: a.headlineFrequencyScore ?? 0 })), null, 2)}

Output exactly a JSON array. Do NOT wrap in markdown blocks, just raw JSON. Do NOT
translate, rename, or add any JSON keys beyond exactly these three - only the VALUES
of "reason" should be Korean:
[
  {
    "id": 0,
    "category": "one of the categories listed above, exactly as written",
    "reason": "Exactly 2 Korean sentences, in Korean. First sentence: what actually happened (the concrete fact/event, not a vague paraphrase of the headline). Second sentence: the specific transmission mechanism to the Korean market - you MUST name at least one concrete Korean industry/sector (e.g. 정유·화학·해운, 반도체 장비/소부장, 2차전지, 자동차, 바이오, 금융/은행) rather than a generic phrase like '한국 수출 기업' or '국내 기업들'. Bad: '한국 수출 기업들의 대외 리스크를 높이는 요인이 됩니다.' Good: '원유 수송 차질과 유가 변동성 확대로 정유·화학·해운 업종의 원가 부담이 커집니다.'"
  }
]
`;
}

// [2026-09-02] 10 -> 20 (사용자 요청) - 아래 프롬프트의 "정확히 N개 선정" 및
// "한 주제가 N개 중 M개를 초과하지 않도록"가 이 상수를 그대로 참조하므로 함께 반영됨.
export const DOMESTIC_NEWS_TOP_N = 20;
// 10건 기준 "3개 초과 금지"였던 테마 다양성 상한(30%)을 20건에도 동일 비율로 유지.
const DOMESTIC_THEME_MAX = 6;

// 국내뉴스 카드 전용 스크리닝 프롬프트 - buildScreeningPrompt()와 달리 "한국 시장에
// 대한 파급력"을 KOSPI/KOSDAQ 전이 경로가 아니라 국내 경제 전반(정책/기업/산업/금융/
// 부동산 등)에 대한 실질적 영향력 기준으로 판단한다. 별도 프롬프트로 분리한 이유는
// 카테고리 체계와 선정 기준 자체가 다르기 때문 - 같은 함수에 옵션 분기를 추가하면
// 두 기준이 뒤섞여 어느 쪽 회귀 테스트도 신뢰할 수 없게 된다.
export function buildDomesticScreeningPrompt(articles) {
    return `
당신은 대한민국 6대 경제지(한국경제/매일경제/서울경제/헤럴드경제/한국일보/아주경제)의
지난 24시간 기사 중 오늘 가장 파급력이 큰 뉴스를 선별하는 데스크입니다.

아래 기사 목록은 언론사 간 동일 사안 중복 보도 빈도로 1차 정렬되어 있습니다
(headlineFrequencyScore가 높을수록 여러 매체가 오늘 비중 있게 다뤘다는 뜻).

최대 ${DOMESTIC_NEWS_TOP_N}개의 기사를 선정하세요 - 이것은 상한이지 반드시 채워야 할
목표치가 아닙니다. 선정 기준(우선순위 순):
1. 국내 경제 정책(금리, 세제, 부동산, 규제) 변화 - 파급 범위가 넓고 즉시 시장/가계에 영향
2. 국내 대기업/주요 산업(반도체, 자동차, 배터리, 금융, 조선 등)의 실적·투자·구조적 변화
3. 국내 증시(코스피/코스닥) 자금 흐름, 외국인 수급, 지수 변동의 원인이 되는 사건
4. 고용·물가·무역수지 등 국내 거시지표 발표
5. 국내 경제에 직접적 파급력이 있는 대외 이슈(환율, 미국/중국 정책의 국내 전이)
같은 사안을 다룬 여러 매체 기사는 하나로 취급하고 그중 가장 명확한 기사 하나만 선택하세요.
한 가지 주제(예: 하나의 정책 발표)가 전체 선정 건수 중 ${DOMESTIC_THEME_MAX}개를 초과하지
않도록 분야를 다양하게 안배하세요.

**절대 포함하지 마세요**: 단순 화제성/미담 기사(지자체 지원금, 사건사고, 재난 구호,
스포츠·연예 이슈), 위 5가지 기준과 무관한 개별 기업 단신(신제품 출시, 수상 소식,
사회공헌 활동 등 실질적 시장 파급력이 없는 보도자료성 기사), 국내 경제와 무관한
해외 인물/사건. 기사 제목에 "AI"라는 단어가 있다는 것만으로 경제 뉴스로 착각하지
마세요 - "AI 영상이 화제" 같은 콘텐츠성 기사는 위 5가지 기준에 해당하지 않으면 제외
대상입니다. 오늘 위 기준을 충족하는 기사가 ${DOMESTIC_NEWS_TOP_N}개보다 적다면, 그
개수만큼만 선정하고 억지로 채우지 마세요 - 기준 미달 기사로 채우는 것보다 적게
선정하는 것이 낫습니다.

각 선정 기사에 대해 다음 카테고리 중 정확히 하나를 지정하세요:
${JSON.stringify(NEWS_CATEGORIES)}

원본 기사 목록:
${JSON.stringify(articles.map(a => ({ id: a.articleIndex, title: a.title, source: a.source, headlineFrequencyScore: a.headlineFrequencyScore ?? 0 })), null, 2)}

정확히 JSON 배열만 출력하세요. 마크다운 코드블록으로 감싸지 마세요. 아래 3개 키 외에
다른 키를 추가/번역/변경하지 마세요 ("reason"의 값만 한국어로 작성):
[
  {
    "id": 0,
    "category": "위 카테고리 중 하나, 표기 그대로",
    "reason": "정확히 2문장, 한국어. 첫 문장: 실제로 일어난 일(헤드라인의 막연한 재서술이 아닌 구체적 사실/사건). 둘째 문장: 국내 경제/시장에 미치는 구체적 파급 경로 - '국내 기업들', '경제 전반' 같은 막연한 표현 대신 구체적인 업종/주체(예: 반도체 장비, 2차전지, 건설/부동산, 은행/금융지주, 자동차 부품)를 명시할 것."
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
// [2026-08-25] 3.1-flash-lite → 3.7-flash. Verified present in this account's
// /v1beta/models listing (version 3.7-flash-08-2026). Pinned to an explicit version
// rather than the `gemini-flash-latest` alias: an alias silently re-points to a new
// model, which is exactly how the 2026-08-04 outage above went unnoticed.
// Note this is a full Flash, not Lite — better instruction-following for the screening
// prompt, at a higher per-token cost and faster free-tier quota burn.
// [2026-08-27] 3.7-flash was returning sustained 503 "high demand" errors - new/preview
// models see a capacity crunch right after release that per Google's own forum reports
// can last 1-3 weeks. Tried, in order, live-verified via /api/analyze-news each time:
//   - gemini-3.1-flash (non-Lite): 404 "not found for API version v1beta" - not
//     available on this account/API version at all.
//   - gemini-3.7-flash-lite: also 404, same error - the 3.7 generation's Lite variant
//     isn't available on this account either, despite the assumption that Lite tiers
//     get separate/wider capacity allocations than their full-size preview siblings.
// Landed on 3.1-flash-lite: the only value actually confirmed reachable on this
// account (PRO_MODEL below has run on it since 2026-08-04). Revert to 3.7-flash
// (non-Lite) once its 503s clear, if screening ever needs the extra
// instruction-following headroom over Lite.
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
// [2026-08-20] Defaults tightened from (retries:3, baseDelayMs:3000) - with 3x exponential
// backoff that meant up to 3000+9000+27000ms just in retry sleeps, before even counting the
// fetch calls themselves. The caller of this function sits inside cron-update-news.js, which
// is invoked by cron-job.org's free tier - hard-capped at a 30s timeout that cannot be raised
// (Vercel's own maxDuration is 60s and was never the actual constraint). A single degenerate
// retry sequence could blow past 30s on its own even before the JSON-parse retry in
// callScreeningModel below (which calls this AGAIN) stacks on top. On a schedule that reruns
// daily, failing fast and letting tomorrow's cron pick up the window is strictly better than
// a slow retry that gets killed by the platform timeout with nothing saved either way.
export async function fetchWithRetry(url, options, { retries = 1, baseDelayMs = 1000 } = {}) {
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

// [2026-08-14] Observed directly: Flash occasionally falls into a degenerate repetition
// loop mid-response (e.g. the "category" value for one item became the token "통화"
// repeated hundreds of times), burning the entire maxOutputTokens budget on garbage and
// leaving the JSON truncated/invalid. This broke every cron/manual run that day - nothing
// got saved because screenArticles threw before saveShortlist was ever reached. Retry once
// at temperature 0 (the current call already uses 0.1) before giving up, since a repeat
// call rarely repeats the same degenerate loop.
async function callScreeningModel(articles, apiKey, temperature, promptBuilder = buildScreeningPrompt) {
    const flashResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${FLASH_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptBuilder(articles) }] }],
            // [2026-08-19] Raised from 8192 to 16384 after reason was expanded from 1
            // sentence to 2 (fact + specific transmission mechanism) - a clean 20-item
            // response now runs roughly 200-300 tokens/item. Still mainly a ceiling on how
            // much a degenerate repetition loop (see comment above) can burn before the
            // call returns, not an expected normal-case size.
            generationConfig: { temperature, responseMimeType: "application/json", maxOutputTokens: 16384 }
        })
    });

    if (!flashResponse.ok) {
        const errBody = await flashResponse.text();
        throw new Error(`Gemini Flash API Error: ${flashResponse.status} ${errBody}`);
    }

    const flashData = await flashResponse.json();
    return extractGeminiText(flashData, 'Gemini Flash screening');
}

// [2026-08-27] The prompt's THEME SHARE CAP (see buildScreeningPrompt) asks Gemini to
// cap any one broad theme at 20-25% of the list, but a Lite-tier model doesn't reliably
// self-audit that across 20 picks - observed directly: an Iran-war-heavy news day still
// produced 6/20 (30%) Iran/Hormuz-themed articles despite the explicit instruction and
// example. Enforce it in code instead of trusting the model: count how many selected
// articles share a broad-theme keyword, and swap out the lowest-scoring excess ones for
// the best-scoring not-yet-selected candidates from the original 40-item pool.
const BROAD_THEME_KEYWORDS = [
    { theme: 'iran_middle_east', pattern: /이란|호르무즈|중동|hormuz|iran|middle east/i },
    { theme: 'trump_tariffs', pattern: /트럼프|관세|무역\s*전쟁|tariff|trade war/i },
    { theme: 'fed_rates', pattern: /연준|금리|fed\b|rate hike|treasury yield|국채\s*금리/i }
];
const MAX_PER_BROAD_THEME = 4; // ~20% of LIST_SIZE(20) - matches the prompt's stated cap

function enforceThemeShareCap(selected, allCandidates) {
    const usedIds = new Set(selected.map(s => s.originalId));
    const result = [...selected];

    for (const { pattern } of BROAD_THEME_KEYWORDS) {
        const matching = result
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => pattern.test(item.title || ''));
        if (matching.length <= MAX_PER_BROAD_THEME) continue;

        // Keep the highest-scoring MAX_PER_BROAD_THEME, replace the rest.
        matching.sort((a, b) => (b.item.headlineFrequencyScore ?? 0) - (a.item.headlineFrequencyScore ?? 0));
        const toReplace = matching.slice(MAX_PER_BROAD_THEME);

        for (const { idx } of toReplace) {
            const replacement = allCandidates
                .filter(c => !usedIds.has(c.articleIndex) && !pattern.test(c.title || ''))
                .sort((a, b) => (b.headlineFrequencyScore ?? 0) - (a.headlineFrequencyScore ?? 0))[0];
            if (!replacement) continue; // no non-theme candidate left; leave as-is rather than drop a slot

            usedIds.delete(result[idx].originalId);
            usedIds.add(replacement.articleIndex);
            // This swap-in never went through Gemini, so it has no real category/reason -
            // reusing the article it's replacing would attach a completely wrong reason
            // to the new headline. '기타' + a neutral marker are honest placeholders; the
            // downstream UI shows the reason as-is, so this must never look like an AI
            // judgment about the replacement article.
            result[idx] = {
                originalId: replacement.articleIndex,
                title: replacement.title,
                originalTitle: replacement.title,
                url: replacement.link,
                pubDate: replacement.pubDate,
                source: replacement.source,
                headlineFrequencyScore: replacement.headlineFrequencyScore ?? 0,
                category: '기타',
                reason: '테마 편중 완화를 위해 자동 대체된 기사입니다.'
            };
        }
    }
    return result;
}

export async function screenArticles(articles, apiKey) {
    const screeningText = await callScreeningModel(articles, apiKey, 0.1);

    let screenedList;
    try {
        screenedList = parseGeminiJsonArray(screeningText, 'Gemini Flash screening');
    } catch (parseErr) {
        console.warn('[Screening Retry] first response was not valid JSON, retrying once at temperature 0');
        const retryText = await callScreeningModel(articles, apiKey, 0);
        screenedList = parseGeminiJsonArray(retryText, 'Gemini Flash screening');
    }

    // Gemini echoes back the `id` we gave it in buildScreeningPrompt, which is each
    // candidate's `articleIndex` (its position in the ORIGINAL articles array) - not
    // this `articles`/`candidates` array's own position. Look candidates up by that
    // original index so `originalId` stays valid once it reaches deepAnalyzeArticles.
    const byOriginalIndex = new Map(articles.map(a => [a.articleIndex, a]));

    const mapped = screenedList.map(item => {
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

    return enforceThemeShareCap(mapped, articles);
}

// 국내뉴스 카드 전용 - screenArticles()와 같은 응답 스키마(id/category/reason)를 쓰지만
// 별도 프롬프트(buildDomesticScreeningPrompt)와 별도 개수(DOMESTIC_NEWS_TOP_N)를 쓰므로
// enforceThemeShareCap(글로벌 전용 이란/관세/연준 테마 캡)은 적용하지 않는다 - 국내
// 기사에 그 키워드 매칭 로직을 그대로 씌우면 엉뚱한 주제를 "테마"로 오인해 대체된다.
export async function screenDomesticArticles(articles, apiKey) {
    const screeningText = await callScreeningModel(articles, apiKey, 0.1, buildDomesticScreeningPrompt);

    let screenedList;
    try {
        screenedList = parseGeminiJsonArray(screeningText, 'Gemini Flash domestic screening');
    } catch (parseErr) {
        console.warn('[Domestic Screening Retry] first response was not valid JSON, retrying once at temperature 0');
        const retryText = await callScreeningModel(articles, apiKey, 0, buildDomesticScreeningPrompt);
        screenedList = parseGeminiJsonArray(retryText, 'Gemini Flash domestic screening');
    }

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
            category: NEWS_CATEGORIES.includes(item.category) ? item.category : '기타',
            reason: item.reason || ''
        };
    }).filter(a => a.title);
}

// [2026-08-14] Deliberately separate from screenArticles(): asking Flash to translate
// titles AS PART OF the screening/categorization JSON schema (tried and reverted the
// same day) made the whole structured response unstable - Gemini started renaming JSON
// keys into Korean, scrambling title/original_title, and mangling reason sentences.
// A plain "translate this numbered list of titles" call with no schema constraints is a
// much narrower task, far less likely to destabilize into the same failure mode. One
// extra cheap Flash call for the whole shortlist (not per-article), so cost stays low.
export async function translateTitlesToKorean(titles, apiKey) {
    if (titles.length === 0) return [];

    const prompt = `Translate each of these ${titles.length} English news headlines into natural, concise Korean.
Output ONLY a JSON array of ${titles.length} strings, in the exact same order as the input, one translation per headline.
If a headline is already in Korean, return it unchanged (but you may lightly clean up spacing/particles).
Do not add, remove, merge, or reorder items - the output array length must equal the input length.

Input headlines:
${JSON.stringify(titles, null, 2)}`;

    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${FLASH_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 4096 }
        })
    });

    if (!response.ok) {
        console.warn('[Title Translation Warning]', response.status, await response.text());
        return titles; // fall back to original (English) titles rather than failing the run
    }

    try {
        const data = await response.json();
        const translated = JSON.parse(extractGeminiText(data, 'Title translation'));
        // Length mismatch means the model dropped/merged/added items - unsafe to trust
        // positional mapping, so fall back to originals rather than risk misattribution.
        if (!Array.isArray(translated) || translated.length !== titles.length) {
            console.warn('[Title Translation Warning] length mismatch, falling back to English titles');
            return titles;
        }
        return translated.map((t, i) => (typeof t === 'string' && t.trim()) ? t : titles[i]);
    } catch (e) {
        console.warn('[Title Translation Warning]', e.message);
        return titles;
    }
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
    return parseGeminiJsonArray(responseText, 'Gemini Pro deep analysis');
}

// Shared by screenArticles and deepAnalyzeArticles: Gemini occasionally emits a
// well-formed JSON array followed by stray extra characters/brackets after it
// (observed 2026-08-05 on deep analysis: a valid 5-item array, then three more
// unmatched `]`/`}` tokens tacked on) or gets truncated mid-array on an unusually
// long response. Recover by extracting just the first balanced top-level array
// instead of failing the whole batch (and, upstream, the whole cron run with a 500).
function parseGeminiJsonArray(responseText, label) {
    try {
        return JSON.parse(responseText);
    } catch (parseErr) {
        const recovered = extractFirstJsonArray(responseText);
        if (recovered !== null) {
            try {
                return JSON.parse(recovered);
            } catch (recoverErr) {
                // fall through to the original error below
            }
        }
        console.error(`Failed to parse ${label} output:`, responseText);
        throw new Error(`${label} output was not valid JSON`);
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

// [2026-08-11] Added a same-KST-day dedup here because news_shortlist has no unique
// constraint on url and overlapping cron/manual runs could insert the same article
// twice. [2026-08-26] Removed: get-shortlist.js was rewritten (see its own comment) to
// show only the single most-recently-saved batch instead of blending everything saved
// "today" - so cross-run duplicates are no longer a display problem, the old run simply
// isn't shown at all once a new one lands. But this dedup kept filtering against EVERY
// run saved so far today, so on a day with several runs, each new run had most of its
// 20 items rejected as "already seen" (observed directly: a fresh 20-item run reduced to
// 3 saved rows) - the opposite of what get-shortlist.js now needs, which is the full,
// intact batch to display. Old batches are still bounded by purgeOldNews (14 days) below.
// [2026-09-02] `table` parameterized so domestic-news.js can reuse this for
// domestic_news_shortlist instead of duplicating the insert logic. Deliberately a
// separate table from news_shortlist, not a shared one with a type column - see
// supabase-domestic-news.sql for why (different trigger/lock semantics per source).
export async function saveShortlist(supabaseUrl, supabaseKey, shortlist, table = 'news_shortlist') {
    const payload = shortlist.map(item => ({
        title: item.titleKr || item.title,
        original_title: item.originalTitle || item.title,
        source: item.source || '',
        category: item.category || '기타',
        reason: item.reason || '',
        url: item.url || '',
        published_at: item.pubDate || null,
        // [2026-08-08] news_shortlist.headline_frequency_score is an `integer` column, but
        // the source-trust weighting added 2026-08-07 (sourceWeight() multiplies by 1.5/1.2)
        // made this a non-integer float (e.g. 7 * 1.5 = 10.5). Postgres/PostgREST rejects a
        // float insert into an integer column, which silently failed the WHOLE shortlist
        // insert for two days straight (2026-08-07, 2026-08-08 cron runs) - deep analysis
        // downstream kept working because it never touches this table, so the failure was
        // invisible outside news_shortlist going stale. Round here so this can never
        // recur even if another float-producing scoring tweak lands later.
        headline_frequency_score: Math.round(item.headlineFrequencyScore ?? 0),
        ...(item.rank != null ? { rank: item.rank } : {})
    }));

    await purgeOldNews(supabaseUrl, supabaseKey, 14, table);

    if (payload.length === 0) {
        return { ok: true, status: 200, text: async () => '[]' };
    }

    return fetch(`${supabaseUrl}/rest/v1/${table}`, {
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
