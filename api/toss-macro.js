export default async function handler(req, res) {
    // Enable CORS for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const tossRes = await fetch('https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://tossinvest.com/'
            }
        });

        if (!tossRes.ok) {
            throw new Error(`Toss API HTTP error: ${tossRes.status}`);
        }

        const data = await tossRes.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('[Vercel Serverless Proxy Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
