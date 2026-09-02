import {
    buildDomesticRssUrls, fetchAllRssItems, rankByHeadlineFrequency,
    screenDomesticArticles, DOMESTIC_NEWS_TOP_N, filterDomesticEconomicArticles,
    saveShortlist
} from './_lib/newsAnalysis.js';

export const maxDuration = 30;

// 헤더 "국내뉴스" 버튼 클릭 시 호출되는 엔드포인트. [2026-09-02] 이전에는 매번
// 재수집만 하고 저장은 안 하는 순수 요청-응답 구조였는데, 사용자 요청으로 이제
// domestic_news_shortlist 테이블에 저장까지 함 - get-domestic-news.js가 이
// 테이블에서 "가장 최근 저장된 배치"만 조회해 버튼을 다시 누르기 전까지는 그
// 결과를 그대로 보여줌(news_shortlist/get-shortlist.js와 동일한 저장->조회 패턴).
// fetch_state 워터마크/락은 여전히 건드리지 않는다 - 그건 글로벌 파이프라인
// 전용이라 공유하면 서로의 증분수집 기준시각과 동시실행 락을 오염시킨다.
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

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        let saveError = null;
        if (supabaseUrl && supabaseKey && top10.length > 0) {
            try {
                const saveResp = await saveShortlist(supabaseUrl, supabaseKey, top10, 'domestic_news_shortlist');
                if (!saveResp.ok) {
                    saveError = await saveResp.text();
                    console.error('[Domestic News Save Error]', saveError);
                }
            } catch (saveErr) {
                saveError = saveErr.message;
                console.error('[Domestic News Save Error]', saveErr);
            }
        }

        return res.status(200).json({ success: true, items: top10, saveError });
    } catch (error) {
        console.error('[Domestic News Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
