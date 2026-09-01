import {
    buildDomesticRssUrls, fetchAllRssItems, rankByHeadlineFrequency,
    screenDomesticArticles, DOMESTIC_NEWS_TOP_N, filterDomesticEconomicArticles
} from './_lib/newsAnalysis.js';

export const maxDuration = 30;

// 헤더 "국내뉴스" 카드 전용, 온디맨드(클릭 시점) 엔드포인트. 글로벌 파이프라인
// (analyze-news.js / cron-update-news.js)과 달리 Supabase에 저장하지 않고, fetch_state
// 워터마크/락도 건드리지 않는다 - 그 두 상태는 글로벌 매크로 수집 전용이라 공유하면
// 서로의 증분수집 기준시각과 동시실행 락을 오염시킨다. 매 클릭마다 최근 24시간을
// 다시 스크리닝하는 단순한 요청-응답 구조로 충분하다(딥분석 없음, 스크리닝만).
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY environment variable.' });
    }

    try {
        const rssUrls = buildDomesticRssUrls();
        const allItems = await fetchAllRssItems(rssUrls);

        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (item.title && item.link && !uniqueMap.has(item.link)) {
                uniqueMap.set(item.link, item);
            }
        });

        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        const articles = filterDomesticEconomicArticles(
            Array.from(uniqueMap.values())
                .filter(item => new Date(item.pubDate).getTime() > twentyFourHoursAgo)
                .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
                .slice(0, 400)
        );

        if (articles.length === 0) {
            return res.status(200).json({ success: true, items: [] });
        }

        const candidates = rankByHeadlineFrequency(articles);
        const shortlist = await screenDomesticArticles(candidates, GEMINI_API_KEY);

        const top10 = shortlist
            .sort((a, b) => (b.headlineFrequencyScore ?? 0) - (a.headlineFrequencyScore ?? 0))
            .slice(0, DOMESTIC_NEWS_TOP_N)
            .map((item, idx) => ({
                rank: idx + 1,
                title: item.title,
                url: item.url,
                source: item.source,
                pubDate: item.pubDate,
                category: item.category,
                reason: item.reason
            }));

        return res.status(200).json({ success: true, items: top10 });
    } catch (error) {
        console.error('[Domestic News Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
