import puppeteer, { Browser, Page } from 'puppeteer';

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  snippet: string;
  publishedAt: string;
}

const SEARCH_QUERIES = [
  'HVAC market trends North America',
  'air conditioning industry news',
  'heat pump market USA Canada',
  'HVAC technology innovation',
  'Carrier Trane Lennox news'
];

export async function crawlNews(): Promise<NewsArticle[]> {
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const articles: NewsArticle[] = [];

  try {
    const page: Page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    for (const query of SEARCH_QUERIES) {
      console.log(`Searching news: ${query}...`);

      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const results = await page.evaluate(() => {
          const items: { title: string; source: string; url: string; snippet: string }[] = [];
          const articleElements = document.querySelectorAll('article');

          articleElements.forEach((article, index) => {
            if (index >= 5) return;

            const titleEl = article.querySelector('h3, h4, a[href*="./articles/"]');
            const sourceEl = article.querySelector('time')?.parentElement;
            const linkEl = article.querySelector('a[href*="./articles/"]');

            if (titleEl) {
              items.push({
                title: titleEl.textContent?.trim() || '',
                source: sourceEl?.textContent?.trim() || 'Unknown',
                url: linkEl?.getAttribute('href') || '',
                snippet: ''
              });
            }
          });

          return items;
        });

        for (const result of results) {
          if (result.title) {
            articles.push({
              ...result,
              url: result.url.startsWith('./') ? `https://news.google.com${result.url.slice(1)}` : result.url,
              publishedAt: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error(`Failed to search: ${query}`, e);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await page.close();
  } finally {
    await browser.close();
  }

  // 중복 제거
  const uniqueArticles = articles.filter((article, index, self) =>
    index === self.findIndex(a => a.title === article.title)
  );

  return uniqueArticles;
}
