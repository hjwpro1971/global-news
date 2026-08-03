-- my-news 신뢰성 개편을 위한 Supabase 스키마 변경
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

-- 1. impactScore 산정 근거를 저장할 컬럼 (PDCA "Do/Check" 최소 구현: 감사 로그)
ALTER TABLE news_impacts ADD COLUMN IF NOT EXISTS score_reason text;

-- 2. 같은 기사가 중복 저장되지 않도록 url unique 제약
--    (이미 중복 데이터가 있으면 이 문장이 실패합니다 - 아래 참고 쿼리로 먼저 정리하세요)
ALTER TABLE news_impacts ADD CONSTRAINT news_impacts_url_unique UNIQUE (url);

-- 3. 증분 수집 시각 + cron/수동 실행 락을 관리할 상태 테이블 (단일 행만 사용)
CREATE TABLE IF NOT EXISTS fetch_state (
    id integer PRIMARY KEY DEFAULT 1,
    last_fetched_at timestamptz,
    is_analyzing boolean NOT NULL DEFAULT false,
    analyzing_started_at timestamptz,
    CONSTRAINT fetch_state_singleton CHECK (id = 1)
);

INSERT INTO fetch_state (id, last_fetched_at, is_analyzing)
VALUES (1, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- ── 참고: 2번 UNIQUE 제약이 "duplicate key" 에러로 실패하는 경우 ──
-- 아래 쿼리로 기존 중복 url 중 가장 최근 것만 남기고 정리한 뒤 2번을 다시 실행하세요.
-- DELETE FROM news_impacts a USING news_impacts b
-- WHERE a.url = b.url AND a.url <> '' AND a.id < b.id;
