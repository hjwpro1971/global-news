import { parseRssItems, buildRssUrls } from './_lib/newsAnalysis.js';

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

        const allItems = [];

        for (const { url, group } of rssUrls) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                    }
                });

                if (response.ok) {
                    const xmlText = await response.text();
                    // queryGroup travels with each item in the JSON response so the
                    // browser can pass it back via /api/analyze-news, letting
                    // rankByHeadlineFrequency's diversity cap work on this path too.
                    const items = parseRssItems(xmlText, group);
                    allItems.push(...items);
                }
            } catch (e) {
                console.error('[RSS Fetch Error]', url, e.message);
            }
        }

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
