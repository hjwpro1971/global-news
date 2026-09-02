import { DOMESTIC_NEWS_TOP_N } from './_lib/newsAnalysis.js';

// [2026-09-02] Returns the most recently saved domestic_news_shortlist batch. Companion
// to get-shortlist.js's "single latest batch" pattern (see that file's comment for why -
// multiple runs sharing one wide "today" window let an older, higher-scoring batch crowd
// out a fresh one). domestic-news.js now saves on every button click instead of being a
// pure request-response endpoint, so this is what the "국내뉴스" panel reads from between
// clicks - the button no longer needs to be re-clicked to see the last result.
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server is missing Supabase Environment Variables' });
        }

        const headers = {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        };

        const latestParams = new URLSearchParams({ select: 'created_at', order: 'created_at.desc', limit: '1' });
        const latestResp = await fetch(`${supabaseUrl}/rest/v1/domestic_news_shortlist?${latestParams.toString()}`, { headers });
        if (!latestResp.ok) {
            const errorText = await latestResp.text();
            return res.status(latestResp.status).json({ error: errorText });
        }
        const latestRows = await latestResp.json();
        if (!latestRows || latestRows.length === 0) {
            return res.status(200).json({ success: true, hasList: false, isStale: false, items: [] });
        }
        const latestCreatedAt = latestRows[0].created_at;

        const batchParams = new URLSearchParams({
            select: '*',
            order: 'rank.asc',
            limit: String(DOMESTIC_NEWS_TOP_N),
            'created_at': `eq.${latestCreatedAt}`
        });
        const batchResp = await fetch(`${supabaseUrl}/rest/v1/domestic_news_shortlist?${batchParams.toString()}`, { headers });
        if (!batchResp.ok) {
            const errorText = await batchResp.text();
            return res.status(batchResp.status).json({ error: errorText });
        }
        const batchData = await batchResp.json();

        const ageMs = Date.now() - new Date(latestCreatedAt).getTime();
        const isStale = ageMs > 24 * 60 * 60 * 1000;

        // Map DB column names (published_at) back to the shape app.js's card renderer
        // already expects (pubDate) - domestic-news.js's live response used pubDate, and
        // fetchAndRenderDomesticNews() in app.js reads item.pubDate.
        const items = batchData.map(row => ({
            rank: row.rank,
            title: row.title,
            url: row.url,
            source: row.source,
            pubDate: row.published_at,
            category: row.category,
            reason: row.reason
        }));

        return res.status(200).json({ success: true, hasList: items.length > 0, isStale, items });
    } catch (error) {
        console.error('[Domestic News Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
