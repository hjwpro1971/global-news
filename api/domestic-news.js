import { collectAndSaveDomesticNews } from './_lib/newsAnalysis.js';

export const maxDuration = 30;

// 헤더 "국내뉴스" 버튼 클릭 시 호출되는 엔드포인트. [2026-09-02] 이전에는 매번
// 재수집만 하고 저장은 안 하는 순수 요청-응답 구조였는데, 사용자 요청으로 이제
// domestic_news_shortlist 테이블에 저장까지 함 - get-domestic-news.js가 이
// 테이블에서 "가장 최근 저장된 배치"만 조회해 버튼을 다시 누르기 전까지는 그
// 결과를 그대로 보여줌(news_shortlist/get-shortlist.js와 동일한 저장->조회 패턴).
// fetch_state 워터마크/락은 여전히 건드리지 않는다 - 그건 글로벌 파이프라인
// 전용이라 공유하면 서로의 증분수집 기준시각과 동시실행 락을 오염시킨다.
//
// [2026-09-03] 실제 수집 로직은 collectAndSaveDomesticNews()로 옮겨져
// cron-update-domestic-news.js(매일 자동 실행)와 공유한다 - 이 파일은 그 함수를
// HTTP로 감싸는 얇은 래퍼일 뿐이다.
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY environment variable.' });
    }

    try {
        const { items, saveError } = await collectAndSaveDomesticNews(
            GEMINI_API_KEY,
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        return res.status(200).json({ success: true, items, saveError });
    } catch (error) {
        console.error('[Domestic News Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
