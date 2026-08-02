export default async function handler(req, res) {
    try {
        const response = await fetch("https://hjwpro-stocknews.vercel.app/api/cron-update-news");
        const body = await response.text();
        res.status(200).json({ status: response.status, body });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
