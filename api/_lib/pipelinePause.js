// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// [SSOT] 뉴스 수집·분석 파이프라인 일시 정지 스위치 — 이 파일이 유일한 소유자.
//
// 2026-11-19 사용자 요청으로 해외/국내 뉴스 수집·Gemini 분석을 전부 정지했다.
// 스케줄(cron-job.org)은 저장소 밖에 있어 코드로 끌 수 없으므로, 호출이 들어와도
// Gemini·Supabase 쓰기 전에 즉시 반환하도록 각 진입점 맨 앞에서 이 스위치를 본다.
// 조회 전용 라우트(get-shortlist, get-domestic-news)는 대상이 아니다 — 화면은 마지막
// 저장 결과를 계속 보여준다.
//
// 재개: PIPELINE_PAUSED를 false로 바꿔 배포. (cron-job.org 작업도 꺼두었다면 다시 켤 것)
//
// 200으로 응답하는 이유: cron-job.org는 실패 응답이 반복되면 실패 알림을 보내고 작업을
// 자동 비활성화할 수 있어, "정상적으로 건너뜀"으로 기록되게 한다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PIPELINE_PAUSED = true;

export const PAUSED_MESSAGE = '뉴스 수집·분석이 일시 정지 상태입니다.';

/**
 * 정지 상태면 응답을 보내고 true를 반환한다.
 * 사용법: `if (respondIfPaused(res)) return;`
 */
export function respondIfPaused(res) {
    if (!PIPELINE_PAUSED) return false;
    res.status(200).json({ success: false, paused: true, error: PAUSED_MESSAGE, items: [] });
    return true;
}
