// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// [SSOT] 배치(무인) 호출 인증 — 이 파일이 유일한 소유자.
//
// cron-update-news는 실행될 때마다 Gemini API 비용이 발생하는데 인증이 전혀 없었다.
// 스케줄러를 Vercel Cron → cron-job.org로 옮기면서 URL이 외부 서비스에 등록되므로,
// URL이 유출돼도 남이 반복 호출해 비용을 태우지 못하도록 사전 공유 키를 요구한다.
// (Supabase 락은 '동시' 실행만 막는다 — 순차 반복 호출은 막지 못한다.)
//
// 허용하는 전달 경로 3가지:
//   · X-Batch-Key 헤더           ← cron-job.org가 쓰는 방식 (권장)
//   · ?key= 쿼리                 ← 헤더를 못 넣는 클라이언트 호환용
//   · Authorization: Bearer …    ← Vercel Cron 폴백 (커스텀 헤더를 못 보내므로)
//
// 🔒 fail-closed: BATCH_TRIGGER_KEY 미설정 시 모든 배치 호출을 차단한다. 키가 없다고
//    무인증으로 열어두면 환경변수 누락이 곧 무방비 상태가 되기 때문이다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import crypto from 'node:crypto';

// 길이가 다르면 timingSafeEqual이 throw하므로 먼저 걸러낸다.
// 길이 노출은 비밀 자체를 드러내지 않으므로 허용 가능한 트레이드오프다.
function timingSafeEqualStr(a, b) {
    const bufA = Buffer.from(String(a || ''));
    const bufB = Buffer.from(String(b || ''));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 배치 호출 인증. 차단했으면 true를 반환한다(응답도 이미 보냄).
 * 사용법: `if (requireBatchAuth(req, res)) return;`
 */
export function requireBatchAuth(req, res) {
    const expected = process.env.BATCH_TRIGGER_KEY || '';
    if (!expected) {
        res.status(503).json({
            success: false,
            message: 'BATCH_TRIGGER_KEY 환경변수가 설정되지 않아 배치 실행이 비활성화되었습니다.'
        });
        return true;
    }

    const header = req.headers['x-batch-key'];
    const bearer = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    const query = req.query?.key;
    const supplied = header || query || bearer || '';

    if (timingSafeEqualStr(supplied, expected)) return false;

    res.status(401).json({
        success: false,
        message: '배치 실행 권한이 없습니다. 유효한 배치 키가 필요합니다.'
    });
    return true;
}
