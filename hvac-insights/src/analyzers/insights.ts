export interface InsightDetail {
  title: string;
  summary: string;
  details: string[];
  relatedPosts: { title: string; subreddit: string; score: number; url: string }[];
  actionItems: string[];
}

export interface DailyInsight {
  summary: string;
  keyInsights: string[];
  keyInsightDetails?: InsightDetail[];
  trendingTopics: string[];
  sentimentAnalysis: {
    overall: string;
    positive: string[];
    negative: string[];
  };
  recommendations: string[];
  brandMentions: { brand: string; sentiment: string; mentions: number }[];
  customerNeeds?: string[];
  painPoints?: string[];
}

// 고객 니즈/페인 포인트 키워드 패턴
const PAIN_POINT_PATTERNS = [
  { pattern: /not working|doesn'?t work|stopped working|broken|failed/gi, category: '제품 고장/작동 불량' },
  { pattern: /too expensive|cost too much|overpriced|price.*high|expensive/gi, category: '높은 비용 부담' },
  { pattern: /noisy|loud|noise|sound|humming/gi, category: '소음 문제' },
  { pattern: /not cooling|not heating|won'?t cool|won'?t heat|no heat|no cool/gi, category: '냉난방 성능 부족' },
  { pattern: /high.*bill|energy.*cost|electric.*bill|utility.*bill/gi, category: '에너지 비용 우려' },
  { pattern: /hard to.*install|installation.*issue|difficult.*setup/gi, category: '설치 어려움' },
  { pattern: /bad.*service|terrible.*support|no response|won'?t call back/gi, category: '고객 서비스 불만' },
  { pattern: /warranty|guarantee|coverage/gi, category: '워런티/보증 이슈' },
  { pattern: /leak|leaking|water.*damage/gi, category: '누수 문제' },
  { pattern: /short.*cycle|cycling|turns.*on.*off/gi, category: '잦은 온오프 반복' },
];

const NEED_PATTERNS = [
  { pattern: /recommend|suggestion|which.*should|best.*brand|advice/gi, category: '제품 추천 요청' },
  { pattern: /quiet|silent|low.*noise/gi, category: '저소음 제품 선호' },
  { pattern: /energy.*efficient|save.*energy|efficient|seer/gi, category: '에너지 효율성 중시' },
  { pattern: /smart|wifi|app|remote.*control|automation/gi, category: '스마트 기능 요구' },
  { pattern: /cheap|affordable|budget|save.*money|cost.*effective/gi, category: '가성비 중시' },
  { pattern: /reliable|dependable|last.*long|durable/gi, category: '내구성/신뢰성 중시' },
  { pattern: /eco.*friendly|green|environment|carbon/gi, category: '친환경 제품 선호' },
  { pattern: /easy.*install|diy|self.*install/gi, category: 'DIY/쉬운 설치 선호' },
  { pattern: /zone|multi.*zone|room.*by.*room/gi, category: '존 컨트롤 기능 요구' },
  { pattern: /heat.*pump|mini.*split|ductless/gi, category: '히트펌프/미니스플릿 관심' },
];

const BRAND_SENTIMENT_PATTERNS = {
  positive: /love|great|excellent|best|amazing|recommend|happy|satisfied|perfect/gi,
  negative: /hate|terrible|worst|awful|avoid|regret|disappointed|horrible|never.*again/gi,
};

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json() as { response: string };
  return data.response;
}

export async function analyzeData(
  redditPosts: any[],
  newsArticles: any[]
): Promise<DailyInsight> {

  // 텍스트 기반 심층 분석 먼저 수행
  const deepAnalysis = performDeepAnalysis(redditPosts);

  const postsText = redditPosts.slice(0, 20).map(p =>
    `[r/${p.subreddit}] ${p.title} (Score: ${p.score})\n${p.content?.substring(0, 300) || ''}`
  ).join('\n\n');

  const newsText = newsArticles.slice(0, 10).map(a =>
    `[${a.source}] ${a.title}`
  ).join('\n');

  const prompt = `You are an HVAC market analyst specializing in customer needs analysis. Analyze the following Reddit posts from North American HVAC communities.

## Reddit Posts (${redditPosts.length} total)
${postsText}

Based on the posts above, identify:
1. What problems are customers facing? (pain points)
2. What features/products do customers want? (needs)
3. Which brands are mentioned positively/negatively?
4. What are the emerging trends?

Respond with ONLY valid JSON (no markdown):
{"summary":"2-3 sentence Korean summary of customer sentiment","keyInsights":["Korean insight about customer need 1","Korean insight about pain point 2","Korean insight about trend 3"],"trendingTopics":["topic1","topic2"],"sentimentAnalysis":{"overall":"Korean description","positive":["Korean positive"],"negative":["Korean concern"]},"recommendations":["Korean business recommendation 1","Korean product improvement suggestion 2"],"brandMentions":[{"brand":"Name","sentiment":"positive/negative/neutral","mentions":5}],"customerNeeds":["Korean need 1","Korean need 2"],"painPoints":["Korean pain point 1","Korean pain point 2"]}

Write all Korean fields in Korean language.`;

  console.log('   Calling Ollama llama3.2...');

  try {
    const responseText = await callOllama(prompt);

    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const jsonStartIndex = jsonText.indexOf('{');
    const jsonEndIndex = jsonText.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || deepAnalysis.summary,
      keyInsights: Array.isArray(parsed.keyInsights) && parsed.keyInsights.length > 0
        ? parsed.keyInsights : deepAnalysis.keyInsights,
      trendingTopics: Array.isArray(parsed.trendingTopics) && parsed.trendingTopics.length > 0
        ? parsed.trendingTopics : deepAnalysis.trendingTopics,
      sentimentAnalysis: parsed.sentimentAnalysis || deepAnalysis.sentimentAnalysis,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations : deepAnalysis.recommendations,
      brandMentions: Array.isArray(parsed.brandMentions) && parsed.brandMentions.length > 0
        ? parsed.brandMentions : deepAnalysis.brandMentions,
      customerNeeds: parsed.customerNeeds || deepAnalysis.customerNeeds,
      painPoints: parsed.painPoints || deepAnalysis.painPoints,
    };

  } catch (e) {
    console.error('   AI 분석 실패, 키워드 기반 분석으로 대체:', e);
    return deepAnalysis;
  }
}

function performDeepAnalysis(posts: any[]): DailyInsight {
  const allText = posts.map(p => `${p.title} ${p.content || ''}`).join(' ');
  const allTextLower = allText.toLowerCase();

  // 페인 포인트 분석
  const painPointCounts: Record<string, number> = {};
  for (const { pattern, category } of PAIN_POINT_PATTERNS) {
    const matches = allText.match(pattern) || [];
    if (matches.length > 0) {
      painPointCounts[category] = (painPointCounts[category] || 0) + matches.length;
    }
  }
  const topPainPoints = Object.entries(painPointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${category} (${count}건 언급)`);

  // 고객 니즈 분석
  const needCounts: Record<string, number> = {};
  for (const { pattern, category } of NEED_PATTERNS) {
    const matches = allText.match(pattern) || [];
    if (matches.length > 0) {
      needCounts[category] = (needCounts[category] || 0) + matches.length;
    }
  }
  const topNeeds = Object.entries(needCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${category} (${count}건 언급)`);

  // 브랜드 분석
  const brands = ['carrier', 'trane', 'lennox', 'goodman', 'rheem', 'daikin', 'mitsubishi', 'fujitsu', 'ecobee', 'nest', 'honeywell', 'bosch'];
  const brandMentions = brands
    .map(brand => {
      const mentions = (allTextLower.match(new RegExp(brand, 'g')) || []).length;
      if (mentions === 0) return null;

      // 브랜드 주변 텍스트로 감성 분석
      const brandRegex = new RegExp(`.{0,100}${brand}.{0,100}`, 'gi');
      const brandContexts = allText.match(brandRegex) || [];
      const brandText = brandContexts.join(' ');

      const positiveMatches = brandText.match(BRAND_SENTIMENT_PATTERNS.positive) || [];
      const negativeMatches = brandText.match(BRAND_SENTIMENT_PATTERNS.negative) || [];

      let sentiment = 'neutral';
      if (positiveMatches.length > negativeMatches.length) sentiment = 'positive';
      else if (negativeMatches.length > positiveMatches.length) sentiment = 'negative';

      return {
        brand: brand.charAt(0).toUpperCase() + brand.slice(1),
        mentions,
        sentiment,
      };
    })
    .filter((b): b is { brand: string; mentions: number; sentiment: string } => b !== null)
    .sort((a, b) => b.mentions - a.mentions);

  // 트렌딩 토픽
  const topicPatterns: Record<string, RegExp> = {
    '히트펌프': /heat\s*pump/gi,
    '미니스플릿': /mini\s*split|ductless/gi,
    '스마트 온도조절기': /smart\s*thermostat|ecobee|nest/gi,
    '에너지 효율': /energy\s*efficien|seer\s*\d+|efficiency/gi,
    '냉매 교체': /refrigerant|r410a|r22|freon/gi,
    'DIY 설치': /diy|self\s*install/gi,
    '존 컨트롤': /zone|multi.*zone/gi,
    '인버터 기술': /inverter|variable\s*speed/gi,
  };

  const topicCounts = Object.entries(topicPatterns)
    .map(([topic, pattern]) => ({
      topic,
      count: (allText.match(pattern) || []).length
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const trendingTopics = topicCounts.slice(0, 4).map(t => t.topic);

  // 서브레딧 분포
  const subredditCounts: Record<string, number> = {};
  for (const post of posts) {
    subredditCounts[post.subreddit] = (subredditCounts[post.subreddit] || 0) + 1;
  }
  const topSubreddits = Object.entries(subredditCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // 관련 게시물 찾기 헬퍼 함수
  function findRelatedPosts(keywords: RegExp, limit: number = 5) {
    return posts
      .filter(p => keywords.test(`${p.title} ${p.content || ''}`))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(p => ({
        title: p.title.substring(0, 80) + (p.title.length > 80 ? '...' : ''),
        subreddit: p.subreddit,
        score: p.score,
        url: p.url
      }));
  }

  // 인사이트 생성
  const keyInsights: string[] = [];
  const keyInsightDetails: InsightDetail[] = [];

  // 1. 고객 불만 인사이트
  if (topPainPoints.length > 0) {
    const painCategory = topPainPoints[0].split(' (')[0];
    keyInsights.push(`고객 주요 불만: ${topPainPoints[0]}`);

    const painPattern = PAIN_POINT_PATTERNS.find(p => p.category === painCategory)?.pattern || /problem|issue/gi;
    const relatedPosts = findRelatedPosts(painPattern);

    keyInsightDetails.push({
      title: `고객 주요 불만: ${painCategory}`,
      summary: `${painCategory} 관련 불만이 가장 많이 언급되었습니다. 이는 제품/서비스 개선의 핵심 영역입니다.`,
      details: [
        `총 ${painPointCounts[painCategory]}건의 관련 언급 발견`,
        `전체 불만 카테고리 중 1위`,
        ...topPainPoints.slice(1, 4).map((p, i) => `${i + 2}위: ${p}`)
      ],
      relatedPosts,
      actionItems: [
        `${painCategory} 해결을 위한 제품 개선 검토`,
        '고객 지원 프로세스 강화',
        '관련 FAQ 및 가이드 제작'
      ]
    });
  }

  // 2. 고객 니즈 인사이트
  if (topNeeds.length > 0) {
    const needCategory = topNeeds[0].split(' (')[0];
    keyInsights.push(`고객 주요 니즈: ${topNeeds[0]}`);

    const needPattern = NEED_PATTERNS.find(p => p.category === needCategory)?.pattern || /want|need/gi;
    const relatedPosts = findRelatedPosts(needPattern);

    keyInsightDetails.push({
      title: `고객 주요 니즈: ${needCategory}`,
      summary: `고객들이 가장 원하는 것은 "${needCategory}"입니다. 이 니즈를 충족시키는 것이 경쟁력의 핵심입니다.`,
      details: [
        `총 ${needCounts[needCategory]}건의 관련 언급 발견`,
        `전체 니즈 카테고리 중 1위`,
        ...topNeeds.slice(1, 4).map((n, i) => `${i + 2}위: ${n}`)
      ],
      relatedPosts,
      actionItems: [
        `${needCategory} 관련 기능/서비스 강화`,
        '마케팅 메시지에 해당 니즈 반영',
        '경쟁사 대비 차별화 포인트로 활용'
      ]
    });
  }

  // 3. 브랜드 인사이트
  if (brandMentions.length > 0) {
    const topBrand = brandMentions[0];
    keyInsights.push(`가장 많이 언급된 브랜드: ${topBrand.brand} (${topBrand.mentions}회, ${topBrand.sentiment === 'positive' ? '긍정적' : topBrand.sentiment === 'negative' ? '부정적' : '중립적'} 평가)`);

    const brandPattern = new RegExp(topBrand.brand, 'gi');
    const relatedPosts = findRelatedPosts(brandPattern);

    keyInsightDetails.push({
      title: `브랜드 분석: ${topBrand.brand}`,
      summary: `${topBrand.brand}가 커뮤니티에서 가장 많이 언급되고 있으며, 전반적으로 ${topBrand.sentiment === 'positive' ? '긍정적' : topBrand.sentiment === 'negative' ? '부정적' : '중립적'}인 평가를 받고 있습니다.`,
      details: [
        `총 ${topBrand.mentions}회 언급`,
        `감성 분석 결과: ${topBrand.sentiment === 'positive' ? '긍정적' : topBrand.sentiment === 'negative' ? '부정적' : '중립적'}`,
        ...brandMentions.slice(1, 5).map((b, i) => `${i + 2}위: ${b.brand} (${b.mentions}회, ${b.sentiment === 'positive' ? '긍정' : b.sentiment === 'negative' ? '부정' : '중립'})`)
      ],
      relatedPosts,
      actionItems: [
        `${topBrand.brand}의 강점/약점 벤치마킹`,
        '경쟁 브랜드 대비 포지셔닝 전략 수립',
        '브랜드 인지도 향상 방안 검토'
      ]
    });
  }

  // 4. 기술 트렌드 인사이트
  if (trendingTopics.length > 0) {
    keyInsights.push(`주목받는 기술 트렌드: ${trendingTopics.slice(0, 2).join(', ')}`);

    const topTopic = trendingTopics[0];
    const topicPattern = topicPatterns[topTopic] || /technology|tech/gi;
    const relatedPosts = findRelatedPosts(topicPattern);

    keyInsightDetails.push({
      title: `기술 트렌드: ${topTopic}`,
      summary: `"${topTopic}"이 현재 HVAC 커뮤니티에서 가장 주목받는 기술 트렌드입니다.`,
      details: [
        `${topTopic} 관련 ${topicCounts.find(t => t.topic === topTopic)?.count || 0}건 언급`,
        ...topicCounts.slice(0, 4).map((t, i) => `${i + 1}위: ${t.topic} (${t.count}건)`)
      ],
      relatedPosts,
      actionItems: [
        `${topTopic} 관련 제품 라인업 검토`,
        '기술 트렌드에 맞는 R&D 투자',
        '시장 선점을 위한 마케팅 전략'
      ]
    });
  }

  // 5. 커뮤니티 활동 인사이트
  if (topSubreddits.length > 0) {
    keyInsights.push(`활발한 커뮤니티: ${topSubreddits.map(([name, count]) => `r/${name}(${count}건)`).join(', ')}`);

    const topSubreddit = topSubreddits[0][0];
    const subredditPosts = posts
      .filter(p => p.subreddit === topSubreddit)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => ({
        title: p.title.substring(0, 80) + (p.title.length > 80 ? '...' : ''),
        subreddit: p.subreddit,
        score: p.score,
        url: p.url
      }));

    keyInsightDetails.push({
      title: `커뮤니티 분석: r/${topSubreddit}`,
      summary: `r/${topSubreddit}이 가장 활발한 HVAC 관련 커뮤니티입니다. 이 커뮤니티의 의견이 시장 트렌드를 주도합니다.`,
      details: [
        `r/${topSubreddit}: ${topSubreddits[0][1]}건 게시물`,
        ...topSubreddits.slice(1).map(([name, count]) => `r/${name}: ${count}건 게시물`),
        `총 분석 게시물: ${posts.length}건`
      ],
      relatedPosts: subredditPosts,
      actionItems: [
        `r/${topSubreddit} 커뮤니티 정기 모니터링`,
        '주요 인플루언서/전문가 파악',
        '커뮤니티 피드백 기반 제품 개선'
      ]
    });
  }

  // 요약 생성
  const summary = `오늘 북미 HVAC 커뮤니티에서 ${posts.length}개의 게시물을 분석했습니다. ` +
    (topPainPoints.length > 0 ? `주요 고객 불만은 "${topPainPoints[0].split(' (')[0]}"이며, ` : '') +
    (topNeeds.length > 0 ? `"${topNeeds[0].split(' (')[0]}"에 대한 니즈가 높게 나타났습니다. ` : '') +
    (brandMentions.length > 0 ? `${brandMentions[0].brand}가 가장 많이 언급되었습니다.` : '');

  // 추천 사항 생성
  const recommendations: string[] = [];

  if (painPointCounts['높은 비용 부담'] > 0) {
    recommendations.push('가격 경쟁력 강화 또는 파이낸싱 옵션 제공 검토');
  }
  if (painPointCounts['소음 문제'] > 0) {
    recommendations.push('저소음 제품 라인업 강화 및 마케팅 강조');
  }
  if (needCounts['에너지 효율성 중시'] > 0) {
    recommendations.push('에너지 효율 등급(SEER) 강조 및 비용 절감 효과 홍보');
  }
  if (needCounts['스마트 기능 요구'] > 0) {
    recommendations.push('스마트홈 연동 기능 강화 및 앱 사용성 개선');
  }
  if (recommendations.length < 2) {
    recommendations.push('고객 피드백 기반 제품 개선 로드맵 수립');
    recommendations.push('온라인 커뮤니티 모니터링을 통한 VOC 수집 체계 구축');
  }

  return {
    summary,
    keyInsights,
    keyInsightDetails,
    trendingTopics: trendingTopics.length > 0 ? trendingTopics : ['HVAC 시스템', '에너지 효율', '스마트 기술'],
    sentimentAnalysis: {
      overall: `분석 대상 ${posts.length}개 게시물 중 페인포인트 ${Object.keys(painPointCounts).length}개 카테고리, 니즈 ${Object.keys(needCounts).length}개 카테고리 발견`,
      positive: topNeeds.slice(0, 3).map(n => n.split(' (')[0]),
      negative: topPainPoints.slice(0, 3).map(p => p.split(' (')[0]),
    },
    recommendations,
    brandMentions,
    customerNeeds: topNeeds,
    painPoints: topPainPoints,
  };
}
