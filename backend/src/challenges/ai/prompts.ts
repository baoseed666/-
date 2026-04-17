import { ChallengeInput, ReportInput } from './ai-provider.interface';

const CROWD_TEXT: Record<string, string> = {
  low: '人流稀少（好时机）',
  medium: '人流适中',
  high: '人多建议提前到',
};

export const SYSTEM_PROMPT = `你是"抠门大王"AI挑战官。你的使命：在用户预算内找到最极限的省钱方案。

核心原则：
1. 安全第一：绝对禁止推荐翻垃圾桶、拾荒、乞讨、凌晨独行、任何违法行为。
2. 22:00后的推荐必须包含"注意人身安全"提示。
3. 你可以灵活替换用户提议的活动类型，但必须在第一个任务中说明原因。
4. 鼓励：拼单、团购叠加、错峰消费、平台新用户首单、自带食材。
5. 输出必须是严格的JSON格式，不得有任何额外文字。`;

export function buildChallengePrompt(input: ChallengeInput): string {
  const citySection = input.cityPulse
    ? `
【城市实时状态】
天气：${input.cityPulse.weather.icon} ${input.cityPulse.weather.desc} ${input.cityPulse.weather.temp}°C
当前人流：${CROWD_TEXT[input.cityPulse.crowdLevel] ?? input.cityPulse.crowdLevel}
今日热点区域：${input.cityPulse.hotNeighborhood}

【正在举办的活动】
${input.eventsContext || '暂无特别活动'}
`
    : '';

  return `用户需求：${input.rawText}
预算：¥${input.budget}，人数：${input.peopleCount}人，区域：上海徐汇区龙华街道，时段：${input.timeOfDay}
${citySection}
【可用店铺（按距离排序 Top15）】
${input.shopContext}

请生成3套省钱方案（地狱/普通/简单各一套），每套包含主线任务1个、支线任务1个、隐藏成就1个。充分利用城市实时信息，具体说明如何利用活动/折扣/时段省钱。

输出格式（严格JSON）：
{
  "plans": [{
    "id": "plan_1",
    "title": "方案标题",
    "difficulty": "地狱",
    "hp": ${input.budget},
    "mp": 3,
    "estimatedSave": 数字,
    "tasks": [
      {"type":"main","description":"任务描述","tips":["技巧1","技巧2"],"shopHint":"店铺名称或null"},
      {"type":"side","description":"任务描述","tips":["技巧"],"shopHint":null},
      {"type":"hidden","description":"隐藏成就描述","tips":[],"shopHint":null}
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
  "headline": "一句话战报（例：今日击败全城89%的消费者！）",
  "rankTitle": "称号（从：消费韭菜/薅羊毛学徒/省钱老手/抠门高手/抠门大王/传说级穷鬼 中选）",
  "percentile": 0-100的整数,
  "hpConsumed": 实际消费额,
  "mpUsed": 使用的优惠技能数,
  "flavorText": "2-3句游戏风格的战斗描述"
}`;
}
