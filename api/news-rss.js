import { buildRssUrls, fetchAllRssItems } from './_lib/newsAnalysis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Was hardcoded to 2 old search queries here while cron-update-news.js already
        // used the expanded buildRssUrls() (8 categories / 16 queries) - meant the
        // manual "뉴스분석" button pulled from a much narrower pool than the cron path,
        // so genuinely major stories (e.g. today's oil-price/record-high rally) could
        // be entirely absent from what the button ever saw. Use the same source as cron.
        const rssUrls = buildRssUrls();
        // queryGroup travels with each item in the JSON response so the browser can pass
        // it back via /api/analyze-news, letting rankByHeadlineFrequency's diversity cap
        // work on this path too. fetchAllRssItems fetches all feeds concurrently instead
        // of one at a time (see its definition for why this matters for cron timeouts).
        const allItems = await fetchAllRssItems(rssUrls);

        // Deduplicate items by link or title
        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (item.title && item.link && !uniqueMap.has(item.link)) {
                uniqueMap.set(item.link, item);
            }
        });

        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        const sortedItems = Array.from(uniqueMap.values())
            .filter(item => new Date(item.pubDate).getTime() > twentyFourHoursAgo)
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 150); // matches cron-update-news.js's cap after the expanded query set above

        return res.status(200).json({
            status: 'ok',
            count: sortedItems.length,
            items: sortedItems
        });

    } catch (error) {
        console.error('[Vercel News RSS Serverless Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
