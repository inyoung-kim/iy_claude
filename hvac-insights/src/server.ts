import http from 'http';
import fs from 'fs';
import path from 'path';
import { getRecentReports } from './utils/database';

const PORT = 3000;
const REPORTS_DIR = path.join(__dirname, '../data/reports');

function generateDashboardHTML(): string {
  let reports: any[] = [];
  try {
    reports = getRecentReports(30);
  } catch (e) {
    console.log('아직 리포트가 없습니다');
  }

  const reportFiles = fs.existsSync(REPORTS_DIR)
    ? fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.html')).sort().reverse()
    : [];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HVAC 시장 인사이트 대시보드</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 40px 20px; text-align: center; }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { opacity: 0.8; font-size: 1.1rem; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
    .stat-card { background: #1e293b; padding: 24px; border-radius: 12px; text-align: center; }
    .stat-value { font-size: 2.5rem; font-weight: bold; color: #3b82f6; }
    .stat-label { color: #94a3b8; margin-top: 8px; }
    .section-title { font-size: 1.5rem; margin-bottom: 20px; color: #f1f5f9; }
    .reports-list { display: flex; flex-direction: column; gap: 12px; }
    .report-item { background: #1e293b; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
    .report-item:hover { background: #334155; }
    .report-date { font-size: 1.1rem; font-weight: 500; }
    .report-link { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500; }
    .report-link:hover { background: #2563eb; }
    .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
    .empty-state p { margin-bottom: 20px; }
    .run-btn { background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌡️ 북미 HVAC 시장 인사이트</h1>
    <p>North America HVAC Market Intelligence Dashboard</p>
  </div>

  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${reportFiles.length}</div>
        <div class="stat-label">총 리포트 수</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${reports.length > 0 ? JSON.parse(reports[0]?.key_insights || '[]').length : 0}</div>
        <div class="stat-label">최신 인사이트</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${reportFiles.length > 0 ? reportFiles[0].replace('report-', '').replace('.html', '') : '-'}</div>
        <div class="stat-label">마지막 업데이트</div>
      </div>
    </div>

    <h2 class="section-title">📊 일일 리포트 목록</h2>

    ${reportFiles.length > 0 ? `
      <div class="reports-list">
        ${reportFiles.map(file => {
          const date = file.replace('report-', '').replace('.html', '');
          return `
            <div class="report-item">
              <span class="report-date">📅 ${date}</span>
              <a href="/reports/${file}" class="report-link">리포트 보기</a>
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <p>아직 리포트가 없습니다. 첫 번째 분석을 실행해보세요!</p>
        <code style="background: #1e293b; padding: 10px 20px; border-radius: 8px; display: block; margin-top: 20px;">
          cd hvac-insights && npm start
        </code>
      </div>
    `}
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(generateDashboardHTML());
    return;
  }

  if (url.startsWith('/reports/')) {
    const filename = url.replace('/reports/', '');
    const filepath = path.join(REPORTS_DIR, filename);

    if (fs.existsSync(filepath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(filepath, 'utf-8'));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('페이지를 찾을 수 없습니다');
});

server.listen(PORT, () => {
  console.log(`\n🌐 HVAC 인사이트 대시보드 실행 중: http://localhost:${PORT}\n`);
});
