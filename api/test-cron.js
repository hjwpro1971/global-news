export default async function handler(req, res) {
    // Debug-only endpoint - hidden behind an admin token so it can't be used to
    // trigger unlimited Gemini-billed pipeline runs. 404 (not 401) so its
    // existence isn't disclosed to unauthenticated callers.
    if (!process.env.ADMIN_DEBUG_TOKEN || req.query.admin_token !== process.env.ADMIN_DEBUG_TOKEN) {
        return res.status(404).json({ error: 'Not Found' });
    }

    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const response = await fetch(`${protocol}://${host}/api/cron-update-news`);
        const body = await response.text();
        res.status(200).json({ status: response.status, body });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
