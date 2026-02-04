import { crawlReddit } from './crawlers/reddit';
import { crawlNews } from './crawlers/news';
import { analyzeData } from './analyzers/insights';
import {
  initDatabase,
  saveRedditPosts,
  saveNewsArticles,
  saveDailyReport,
  getTodayData
} from './utils/database';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

async function sendNotification(title: string, message: string): Promise<void> {
  const script = `display notification "${message}" with title "${title}" sound name "Glass"`;
  exec(`osascript -e '${script}'`, (error) => {
    if (error) console.error('Notification failed:', error);
  });
}

function translateSentiment(sentiment: string): string {
  const map: Record<string, string> = {
    'positive': '긍정적',
    'negative': '부정적',
    'neutral': '중립'
  };
  return map[sentiment.toLowerCase()] || sentiment;
}

async function generateHTMLReport(insight: any, date: string): Promise<string> {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HVAC 시장 인사이트 - ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background: #f5f5f5; color: #333; line-height: 1.8; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
    header h1 { font-size: 2rem; margin-bottom: 10px; }
    header .date { opacity: 0.8; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card h2 { color: #1e3a5f; margin-bottom: 16px; font-size: 1.3rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
    .summary { font-size: 1.1rem; color: #444; white-space: pre-line; }
    .insights-list { list-style: none; }
    .insights-list li { padding: 12px 0; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; }
    .insights-list li:last-child { border-bottom: none; }
    .insights-list li::before { content: "💡"; margin-right: 12px; font-size: 1.2rem; }
    .topics { display: flex; flex-wrap: wrap; gap: 10px; }
    .topic-tag { background: #e3f2fd; color: #1565c0; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; }
    .sentiment { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
    .sentiment-box { padding: 16px; border-radius: 8px; }
    .sentiment-positive { background: #e8f5e9; border-left: 4px solid #4caf50; }
    .sentiment-negative { background: #ffebee; border-left: 4px solid #f44336; }
    .sentiment-box h3 { font-size: 1rem; margin-bottom: 8px; }
    .sentiment-box ul { list-style: disc; margin-left: 20px; }
    .brands { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .brand-card { background: #fafafa; padding: 16px; border-radius: 8px; text-align: center; }
    .brand-name { font-weight: 600; font-size: 1.1rem; }
    .brand-sentiment { font-size: 0.85rem; margin-top: 4px; padding: 4px 12px; border-radius: 12px; display: inline-block; }
    .brand-sentiment.positive { background: #c8e6c9; color: #2e7d32; }
    .brand-sentiment.negative { background: #ffcdd2; color: #c62828; }
    .brand-sentiment.neutral { background: #e0e0e0; color: #616161; }
    .recommendations li { padding: 10px 0; }
    .recommendations li::before { content: "✅"; margin-right: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-box { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 1.8rem; font-weight: bold; color: #1e3a5f; }
    .stat-label { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
    footer { text-align: center; padding: 20px; color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌡️ 북미 HVAC 시장 일일 인사이트</h1>
      <div class="date">리포트 날짜: ${date}</div>
    </header>

    <div class="card">
      <h2>📊 요약</h2>
      <p class="summary">${insight.summary}</p>
    </div>

    <div class="card">
      <h2>💡 핵심 인사이트</h2>
      <ul class="insights-list">
        ${insight.keyInsights.map((i: string) => `<li>${i}</li>`).join('')}
      </ul>
    </div>

    <div class="card">
      <h2>🔥 트렌딩 토픽</h2>
      <div class="topics">
        ${insight.trendingTopics.map((t: string) => `<span class="topic-tag">${t}</span>`).join('')}
      </div>
    </div>

    <div class="card">
      <h2>🎯 고객 니즈 분석</h2>
      <div class="sentiment">
        <div class="sentiment-box sentiment-positive">
          <h3>💚 고객이 원하는 것 (Needs)</h3>
          <ul>
            ${(insight.customerNeeds || insight.sentimentAnalysis.positive).map((n: string) => `<li>${n}</li>`).join('')}
          </ul>
        </div>
        <div class="sentiment-box sentiment-negative">
          <h3>💔 고객 불만 사항 (Pain Points)</h3>
          <ul>
            ${(insight.painPoints || insight.sentimentAnalysis.negative).map((p: string) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📈 감성 분석</h2>
      <p style="margin-bottom: 16px;"><strong>종합 평가:</strong> ${insight.sentimentAnalysis.overall}</p>
      <div class="sentiment">
        <div class="sentiment-box sentiment-positive">
          <h3>👍 긍정적 요소</h3>
          <ul>
            ${insight.sentimentAnalysis.positive.map((p: string) => `<li>${p}</li>`).join('')}
          </ul>
        </div>
        <div class="sentiment-box sentiment-negative">
          <h3>👎 우려 사항</h3>
          <ul>
            ${insight.sentimentAnalysis.negative.map((n: string) => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>🏷️ 브랜드 언급 현황</h2>
      <div class="brands">
        ${insight.brandMentions.map((b: any) => `
          <div class="brand-card">
            <div class="brand-name">${b.brand}</div>
            <div class="brand-sentiment ${b.sentiment}">${translateSentiment(b.sentiment)} (${b.mentions}회 언급)</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <h2>✅ 추천 사항</h2>
      <ul class="recommendations insights-list">
        ${insight.recommendations.map((r: string) => `<li>${r}</li>`).join('')}
      </ul>
    </div>

    <footer>
      HVAC 인사이트 분석기 | Powered by Ollama AI
    </footer>
  </div>
</body>
</html>`;

  const reportPath = path.join(__dirname, '../data/reports', `report-${date}.html`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, html);

  return reportPath;
}

async function main(): Promise<void> {
  console.log('🚀 Starting HVAC Insights Collection...\n');

  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Initialize database
    console.log('📦 Initializing database...');
    initDatabase();

    // 2. Crawl data
    console.log('\n🔍 Crawling Reddit...');
    const redditPosts = await crawlReddit(15);
    console.log(`   Found ${redditPosts.length} HVAC-related posts`);

    console.log('\n📰 Crawling News...');
    const newsArticles = await crawlNews();
    console.log(`   Found ${newsArticles.length} news articles`);

    // 3. Save to database
    console.log('\n💾 Saving to database...');
    const savedPosts = saveRedditPosts(redditPosts);
    const savedArticles = saveNewsArticles(newsArticles);
    console.log(`   Saved ${savedPosts} new posts, ${savedArticles} new articles`);

    // 4. Analyze with AI
    console.log('\n🤖 Analyzing with Claude AI...');
    const insight = await analyzeData(redditPosts, newsArticles);

    // 5. Save report
    saveDailyReport({
      date: today,
      summary: insight.summary,
      keyInsights: insight.keyInsights,
      trendingTopics: insight.trendingTopics,
      sentimentAnalysis: insight.sentimentAnalysis,
      recommendations: insight.recommendations
    });

    // 6. Generate HTML report
    console.log('\n📝 Generating HTML report...');
    const reportPath = await generateHTMLReport(insight, today);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Complete! (${elapsed}s)`);
    console.log(`   Report: ${reportPath}`);

    // 7. Send notification
    await sendNotification(
      'HVAC 인사이트 완료',
      `${today} 일일 리포트가 준비되었습니다. ${insight.keyInsights.length}개의 인사이트가 생성되었습니다.`
    );

    // 8. Open report in browser
    exec(`open "${reportPath}"`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await sendNotification('HVAC 인사이트 오류', '일일 리포트 생성에 실패했습니다.');
    process.exit(1);
  }
}

main();
