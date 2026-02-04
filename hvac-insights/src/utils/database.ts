import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/hvac_insights.db');

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reddit_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      author TEXT,
      score INTEGER,
      comments INTEGER,
      url TEXT UNIQUE,
      subreddit TEXT,
      created_at TEXT,
      collected_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT,
      url TEXT UNIQUE,
      snippet TEXT,
      published_at TEXT,
      collected_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT UNIQUE,
      summary TEXT,
      key_insights TEXT,
      trending_topics TEXT,
      sentiment_analysis TEXT,
      recommendations TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reddit_created ON reddit_posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(report_date);
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function saveRedditPosts(posts: any[]): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO reddit_posts (title, content, author, score, comments, url, subreddit, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const post of posts) {
    const result = stmt.run(
      post.title,
      post.content,
      post.author,
      post.score,
      post.comments,
      post.url,
      post.subreddit,
      post.createdAt
    );
    if (result.changes > 0) inserted++;
  }

  return inserted;
}

export function saveNewsArticles(articles: any[]): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO news_articles (title, source, url, snippet, published_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const article of articles) {
    const result = stmt.run(
      article.title,
      article.source,
      article.url,
      article.snippet,
      article.publishedAt
    );
    if (result.changes > 0) inserted++;
  }

  return inserted;
}

export function saveDailyReport(report: {
  date: string;
  summary: string;
  keyInsights: string[];
  trendingTopics: string[];
  sentimentAnalysis: any;
  recommendations: string[];
}): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO daily_reports (report_date, summary, key_insights, trending_topics, sentiment_analysis, recommendations)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    report.date,
    report.summary,
    JSON.stringify(report.keyInsights),
    JSON.stringify(report.trendingTopics),
    JSON.stringify(report.sentimentAnalysis),
    JSON.stringify(report.recommendations)
  );
}

export function getTodayData(): { posts: any[]; articles: any[] } {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  const posts = db.prepare(`
    SELECT * FROM reddit_posts
    WHERE date(collected_at) = ?
    ORDER BY score DESC
  `).all(today);

  const articles = db.prepare(`
    SELECT * FROM news_articles
    WHERE date(collected_at) = ?
  `).all(today);

  return { posts, articles };
}

export function getRecentReports(days: number = 7): any[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM daily_reports
    ORDER BY report_date DESC
    LIMIT ?
  `).all(days);
}
