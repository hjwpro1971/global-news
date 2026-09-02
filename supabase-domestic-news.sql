-- [2026-09-02] 국내뉴스(헤더 "국내뉴스" 버튼) 결과를 DB에 저장하기 위한 신규 테이블.
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
--
-- 지금까지 api/domestic-news.js는 클릭할 때마다 24시간을 다시 스크리닝해서
-- 응답만 반환하고 저장하지 않는 온디맨드 구조였음(이 파일의 원래 주석 참고).
-- 요청에 따라 news_shortlist와 같은 패턴(저장 -> 다음 접속 시 DB에서 즉시 조회)으로
-- 전환하되, 기존 news_shortlist 테이블을 그대로 재사용하지 않고 별도 테이블을
-- 새로 둠 - 글로벌 파이프라인(news_shortlist)의 fetch_state 워터마크/락과
-- 국내뉴스의 클릭 시점 수집이 서로 다른 트리거를 갖고 있어, 한 테이블을 같이
-- 쓰면 "최근 배치 하나만 표시" 조회 로직(get-shortlist.js/get-domestic-news.js)이
-- 서로의 실행 결과를 뒤섞어 보여주게 됨 - 8/26에 겪었던 "여러 실행분이 섞여
-- 새 데이터가 밀려나는" 문제와 같은 유형의 버그를 처음부터 피하기 위함.
CREATE TABLE IF NOT EXISTS domestic_news_shortlist (
    id bigserial PRIMARY KEY,
    rank integer,
    title text NOT NULL,
    original_title text,
    source text,
    category text,
    reason text,
    url text,
    published_at timestamptz,
    headline_frequency_score integer,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS domestic_news_shortlist_created_at_idx ON domestic_news_shortlist (created_at DESC);
