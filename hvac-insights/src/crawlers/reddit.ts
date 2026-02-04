import puppeteer, { Browser, Page } from 'puppeteer';

export interface RedditPost {
  title: string;
  content: string;
  author: string;
  score: number;
  comments: number;
  url: string;
  subreddit: string;
  createdAt: string;
}

const HVAC_SUBREDDITS = ['HVAC', 'hvacadvice', 'ecobee', 'nest', 'homeowners', 'HomeImprovement'];

export async function crawlReddit(limit: number = 10): Promise<RedditPost[]> {
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const posts: RedditPost[] = [];

  try {
    for (const subreddit of HVAC_SUBREDDITS) {
      console.log(`Crawling r/${subreddit}...`);
      const page: Page = await browser.newPage();

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Reddit JSON API 사용 (스크래핑보다 안정적)
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      const content = await page.evaluate(() => document.body.innerText);

      try {
        const data = JSON.parse(content);
        const children = data?.data?.children || [];

        for (const child of children) {
          const post = child.data;

          // HVAC 관련 키워드 필터링
          const hvacKeywords = ['hvac', 'ac', 'air condition', 'furnace', 'heat pump', 'thermostat',
                               'carrier', 'trane', 'lennox', 'goodman', 'rheem', 'daikin',
                               'ecobee', 'nest', 'smart thermostat', 'mini split', 'ductless'];
          const text = `${post.title} ${post.selftext}`.toLowerCase();
          const isHvacRelated = hvacKeywords.some(kw => text.includes(kw));

          // HVAC 전문 서브레딧은 모든 게시물 수집
          const hvacSubreddits = ['HVAC', 'hvacadvice', 'ecobee', 'nest'];
          if (isHvacRelated || hvacSubreddits.includes(subreddit)) {
            posts.push({
              title: post.title,
              content: post.selftext?.substring(0, 2000) || '',
              author: post.author,
              score: post.score,
              comments: post.num_comments,
              url: `https://reddit.com${post.permalink}`,
              subreddit: subreddit,
              createdAt: new Date(post.created_utc * 1000).toISOString()
            });
          }
        }
      } catch (e) {
        console.error(`Failed to parse r/${subreddit}:`, e);
      }

      await page.close();

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } finally {
    await browser.close();
  }

  return posts;
}
