import { ChallengeInput, ReportInput } from './ai-provider.interface';

const CROWD_TEXT: Record<string, string> = {
  low: '人流稀少（绝佳时机，店家可能给折扣）',
  medium: '人流适中',
  high: '人多建议提前到或错峰',
};

export const SYSTEM_PROMPT = `你是"抠门大王"AI挑战官。你的使命：在用户预算内找到最极限的省钱方案。

核心原则：
1. 安全第一：绝对禁止推荐翻垃圾桶、拾荒、乞讨、凌晨独行、任何违法行为。
2. 22:00后的推荐必须包含"注意人身安全"提示。
3. 你可以灵活替换用户提议的活动类型，但必须在第一个任务中说明原因。
4. 鼓励：拼单、团购叠加、错峰消费、平台新用户首单、自带食材。
5. 输出必须是严格的JSON格式，不得有任何额外文字。
6. 每个任务description必须包含具体金额（如"省约X元"），每个tips必须是可立即执行的操作步骤（如"打开美团搜索XX，用新用户券可立减Y元"）。
7. 隐藏成就必须揭示用户不知道的深度技巧（如"该店的会员日是周三，下单立减18%"或"附近某个平台刚上线的满减券未曝光"）。`;

export function buildChallengePrompt(input: ChallengeInput): string {
  const today = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  const citySection = input.cityPulse
    ? `
【城市实时状态】
日期：${today}
天气：${input.cityPulse.weather.icon} ${input.cityPulse.weather.desc} ${input.cityPulse.weather.temp}°C（${input.cityPulse.weather.suitable ? '适合出行' : '天气不佳，可考虑室内活动'}）
当前人流：${CROWD_TEXT[input.cityPulse.crowdLevel] ?? input.cityPulse.crowdLevel}
今日热点区域：${input.cityPulse.hotNeighborhood}

【正在举办的活动（可利用）】
${input.eventsContext || '暂无特别活动'}
`
    : '';

  const budgetLine = input.budget != null
    ? `预算：¥${input.budget}（${input.peopleCount}人均¥${Math.round(input.budget / input.peopleCount)}），`
    : `未指定预算（${input.peopleCount}人），请为每套方案设定合理的estimatedSpend，`;

  return `用户需求：${input.rawText}
${budgetLine}区域：上海徐汇区龙华街道，时段：${input.timeOfDay}
${citySection}
【附近可用店铺（按活动类型分组，AI应为每种活动类型都推荐对应店铺）】
${input.shopContext}

请生成3套省钱方案（地狱/普通/简单各一套）。要求：
- 地狱方案：极限省钱，利用所有可叠加优惠、拼单、错峰、新用户首单等手段，estimatedSave最大化
- 普通方案：正常省钱，合理利用团购/折扣，平衡体验和省钱
- 简单方案：轻松省钱，利用会员/积分/满减，几乎无门槛

每套方案包含：主线任务若干个（每种活动需求对应一个 main 任务，覆盖用户所有活动，具体去哪家店、怎么省钱）、支线任务1个（额外省钱技巧）、隐藏成就1个（大多数人不知道的深度技巧）。

充分利用上方的城市实时信息和店铺数据，直接点名推荐具体店铺。

输出格式（严格JSON，无额外文字）：
{
  "plans": [{
    "id": "plan_1",
    "title": "方案标题（体现省钱方向）",
    "difficulty": "地狱",
    "hp": ${input.budget ?? 100},
    "mp": 3,
    "estimatedSpend": 实际预计花费金额（数字）,
    "estimatedSave": 相比正常消费省下的金额（数字，必须是正整数）,
    "tasks": [
      {
        "type": "main",
        "description": "主线任务描述，点名具体店铺+省钱金额（如：去XX烧烤，用美团新用户首单立减20元，预计人均¥38）",
        "tips": ["具体操作步骤1（如：打开美团搜索'XX烧烤龙华店'，选择新用户专享套餐）", "具体操作步骤2（如：拼单满3人再享9折）"],
        "shopHint": "店铺名称（从上方店铺列表中选择，或根据需求命名）"
      },
      {
        "type": "side",
        "description": "支线任务描述，包含具体省钱金额（如：饭前用支付宝扫码停车场领3元无门槛券，省¥3）",
        "tips": ["具体操作步骤"],
        "shopHint": null
      },
      {
        "type": "hidden",
        "description": "隐藏成就：揭示深度省钱技巧（如：该店每周二会员日8.8折，今天正好是周二，额外省¥X）",
        "tips": ["如何触发这个隐藏技巧的步骤"],
        "shopHint": null
      }
    ]
  }]
}`;
}

export function buildReportPrompt(input: ReportInput): string {
  return `用户完成了省钱挑战：
- 预算：¥${input.budget}，实际省下：¥${input.savedAmount}，人数：${input.peopleCount}
- 完成任务数：${input.tasksCompleted}，城市：${input.city}
- 城市今日平均省钱：¥${input.cityAvgSave}

请生成游戏风格战报（严格JSON）：
{
  "headline": "一句话战报（例：今日击败全城89%的消费者！省下的钱够买X杯奶茶！）",
  "rankTitle": "称号（从：消费韭菜/薅羊毛学徒/省钱老手/抠门高手/抠门大王/传说级穷鬼 中选）",
  "percentile": 0-100的整数,
  "hpConsumed": 实际消费额,
  "mpUsed": 使用的优惠技能数,
  "flavorText": "2-3句游戏风格的战斗描述，提及具体省下的金额和使用的技巧"
}`;
}
