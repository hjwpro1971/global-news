import { getPendingSummaries, patchArticleSummaries, SUMMARY_TABLES } from './_lib/newsAnalysis.js';
import { requireBatchAuth } from './_lib/batchAuth.js';

// NAS(news_enricher.py)가 본문을 읽어 요약을 채우는 폴링 파이프라인 전용 엔드포인트.
// GET과 POST를 한 파일에 합친 이유는 순전히 Vercel Hobby 플랜의 함수 개수 상한(12개)
// 때문 - 이전에도 같은 이유로 디버그 전용 파일들을 지운 전례가 있다(git log 참고).
// 사용 빈도가 낮은 NAS 전용 내부 API 두 개를 굳이 별도 함수로 유지할 필요가 없어 합쳤다.
//
//   GET  : 두 shortlist 테이블 중 summary_status='pending'인 행을 {table, id, url, title}로 반환.
//   POST : NAS가 본문 기반 요약을 채운 뒤 body { table, updates: [{id, reason, status}] }로 되돌려줌.
//
// 화면 조회용 get-shortlist.js/get-domestic-news.js(최신 배치 1건만 반환)와는 별개다 -
// 이쪽은 테이블 무관하게 "미완료 전체"를 반환하는 배치 처리 전용. 인증은 cron
// 엔드포인트와 동일한 X-Batch-Key(requireBatchAuth).
export default async function handler(req, res) {
    if (requireBatchAuth(req, res)) return;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'SUPABASE_URL/SUPABASE_KEY is not set' });
    }

    if (req.method === 'GET') {
        try {
            const pending = await getPendingSummaries(supabaseUrl, supabaseKey);
            return res.status(200).json({ success: true, pending });
        } catch (error) {
            console.error('[Get Pending Summaries Error]', error);
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        const { table, updates } = req.body || {};
        if (!SUMMARY_TABLES.includes(table)) {
            return res.status(400).json({ error: `Invalid table. Expected one of: ${SUMMARY_TABLES.join(', ')}` });
        }
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Invalid input. Expected a non-empty updates array.' });
        }
        for (const u of updates) {
            if (u.id == null || typeof u.reason !== 'string' || !['done', 'failed'].includes(u.status)) {
                return res.status(400).json({ error: 'Each update needs { id, reason: string, status: "done"|"failed" }.' });
            }
        }

        try {
            const { updatedCount, errors } = await patchArticleSummaries(supabaseUrl, supabaseKey, table, updates);
            return res.status(200).json({ success: true, updatedCount, errors });
        } catch (error) {
            console.error('[Update Summary Error]', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
