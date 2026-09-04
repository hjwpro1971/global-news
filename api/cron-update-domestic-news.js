import { collectAndSaveDomesticNews } from './_lib/newsAnalysis.js';
import { requireBatchAuth } from './_lib/batchAuth.js';

export const maxDuration = 30;

// 🕐 cron-update-news.js(해외뉴스)와 별개의 스케줄로 cron-job.org에 등록한다.
//    한 작업 안에서 순차 처리하면 cron-job.org 무료 플랜의 30초 고정 타임아웃을
//    넘길 위험이 커서(해외뉴스 파이프라인만으로도 13~20초 소요 실측됨) 별도
//    작업으로 분리했다. 인증은 동일하게 X-Batch-Key 헤더(BATCH_TRIGGER_KEY).
//    /api/domestic-news(헤더 "국내뉴스" 버튼)와 로직은 collectAndSaveDomesticNews()로
//    공유하지만, 그쪽은 인증 없이 화면에서 직접 호출하는 별도 엔드포인트다.
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (requireBatchAuth(req, res)) return;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    try {
        const { items, saveError } = await collectAndSaveDomesticNews(
            GEMINI_API_KEY,
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        return res.status(200).json({
            success: true,
            message: saveError ? `Collected but save FAILED: ${saveError}` : 'Domestic news cron completed successfully',
            itemCount: items.length,
            saveError
        });
    } catch (error) {
        console.error('[Domestic News Cron Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
