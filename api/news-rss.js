import { parseRssItems } from './_lib/newsAnalysis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const rssUrls = [
            'https://news.google.com/rss/search?q=Semiconductor+OR+Fed+OR+FOMC+OR+Economy+OR+Korea+when:1d&hl=en-US&gl=US&ceid=US:en',
            'https://news.google.com/rss/search?q=%EA%B8%80%EB%A1%9C%EB%B2%8C+%EA%B2%BD%EC%A0%9C+OR+%EC%A6%9D%EC%8B%9C+OR+%EB%B1%98%EB%8F%84%EC%B2%B4+OR+%ED%99%98%EC%9C%A8+when:1d&hl=ko&gl=KR&ceid=KR:ko'
        ];

        const allItems = [];

        for (const url of rssUrls) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                    }
                });

                if (response.ok) {
                    const xmlText = await response.text();
                    const items = parseRssItems(xmlText);
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
            .slice(0, 50);

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
