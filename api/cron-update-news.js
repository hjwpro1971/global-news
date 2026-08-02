import { parseRssItems, screenArticles, deepAnalyzeArticles, reconcileSentiment, purgeOldNews, insertNews } from './_lib/newsAnalysis.js';

export const maxDuration = 60; // Allow up to 60s for Hobby users if opted in

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Fetch RSS News Directly
        const rssUrls = [
            'https://news.google.com/rss/search?q=Semiconductor+OR+Fed+OR+FOMC+OR+Economy+OR+Korea+when:1d&hl=en-US&gl=US&ceid=US:en',
            'https://news.google.com/rss/search?q=%EA%B8%80%EB%A1%9C%EB%B2%8C+%EA%B2%BD%EC%A0%9C+OR+%EC%A6%9D%EC%8B%9C+OR+%EB%B1%98%EB%8F%84%EC%B2%B4+OR+%ED%99%98%EC%9C%A8+when:1d&hl=ko&gl=KR&ceid=KR:ko'
        ];

        const allItems = [];
        for (const url of rssUrls) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (item.title && item.link && !uniqueMap.has(item.link)) {
                uniqueMap.set(item.link, item);
            }
        });
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        const articles = Array.from(uniqueMap.values())
            .filter(item => new Date(item.pubDate).getTime() > twentyFourHoursAgo)
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 50);

        if (articles.length === 0) {
            return res.status(200).json({ success: true, message: 'No articles to process.' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

        // STEP 1: Gemini Flash (Fast & Cheap Screening)
        const selectedArticles = await screenArticles(articles, GEMINI_API_KEY);

        if (selectedArticles.length === 0) {
            return res.status(200).json({ success: true, message: 'No high impact articles found.' });
        }

        // STEP 2: Gemini Pro (Deep Analysis & Quality)
        const analyzedData = await deepAnalyzeArticles(selectedArticles, GEMINI_API_KEY);

        // 3. Save to Supabase
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabasePayload = analyzedData.map(item => {
                const orig = articles[item.originalId] || {};
                const timestamp = orig.pubDate || new Date().toISOString();
                const sentiment = reconcileSentiment(item.sentiment, item.phase2DeepAnalysis?.targetStocks);

                return {
                    title: item.titleKr,
                    original_title: orig.title || '',
                    summary: item.summary,
                    source: orig.source || 'Global News',
                    published_at: timestamp,
                    sector: item.category,
                    theme: item.phase2DeepAnalysis?.articleContext || '',
                    impact_score: (sentiment === "BEARISH" ? -1 : 1) * Math.abs(item.impactScore || 50),
                    target_stocks: item.phase2DeepAnalysis?.targetStocks || [],
                    transmission_mechanism: item.phase2DeepAnalysis?.transmissionMechanism || '',
                    url: orig.link || '',
                    article_context: item.phase2DeepAnalysis?.articleContext || '',
                    step_by_step_path: item.phase2DeepAnalysis?.stepByStepPath || [],
                    short_term_outlook: item.phase2DeepAnalysis?.shortTermOutlook || '',
                    long_term_outlook: item.phase2DeepAnalysis?.longTermOutlook || ''
                };
            });

            // Delete old records older than 14 days to preserve history while maintaining clean DB
            await purgeOldNews(supabaseUrl, supabaseKey, 14);

            const dbResp = await insertNews(supabaseUrl, supabaseKey, supabasePayload);

            if (!dbResp.ok) {
                console.error('[Supabase Error]', await dbResp.text());
                throw new Error('Failed to save to Supabase');
            }
        }

        return res.status(200).json({ success: true, message: 'Cron Job Completed Successfully', count: analyzedData.length });
    } catch (error) {
        console.error('[Cron Job Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
