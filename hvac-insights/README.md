# HVAC Market Insights

북미 HVAC 시장의 트렌드, 사용자 피드백, 커뮤니티 의견을 자동으로 수집하고 AI로 분석하여 매일 인사이트를 생성하는 서비스입니다.

## 기능

- Reddit HVAC 커뮤니티 (r/HVAC, r/hvacadvice 등) 크롤링
- Google News HVAC 관련 뉴스 수집
- Claude AI를 활용한 데이터 분석 및 인사이트 생성
- 웹 대시보드로 리포트 확인
- 매일 자동 실행 (macOS LaunchAgent)
- 분석 완료 시 macOS 알림

## 설치

```bash
cd hvac-insights
npm install
```

## 사용법

### 1. 수동 실행 (인사이트 생성)
```bash
npm start
```

### 2. 대시보드 서버 실행
```bash
npm run dashboard
# http://localhost:3000 에서 확인
```

### 3. 매일 자동 실행 설정
```bash
# 매일 오전 9시에 실행
chmod +x scripts/setup-scheduler.sh
./scripts/setup-scheduler.sh 9 0

# 또는 원하는 시간 지정 (예: 오후 6시)
./scripts/setup-scheduler.sh 18 0
```

## 환경 변수

Claude API 키가 필요합니다:

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

## 폴더 구조

```
hvac-insights/
├── src/
│   ├── crawlers/      # 데이터 수집 모듈
│   ├── analyzers/     # AI 분석 모듈
│   └── utils/         # 유틸리티 (DB 등)
├── data/
│   ├── reports/       # 생성된 HTML 리포트
│   └── hvac_insights.db  # SQLite 데이터베이스
├── scripts/           # 자동화 스크립트
└── logs/             # 실행 로그
```

## 데이터 소스

| 소스 | 내용 |
|------|------|
| Reddit | r/HVAC, r/hvacadvice, r/homeowners, r/HomeImprovement |
| News | Google News HVAC 관련 검색 |

## 분석 항목

- Executive Summary (시장 요약)
- Key Insights (핵심 인사이트)
- Trending Topics (트렌딩 토픽)
- Sentiment Analysis (감성 분석)
- Brand Mentions (브랜드 언급)
- Recommendations (추천 사항)
