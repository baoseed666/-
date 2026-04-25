import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { EmotionProfile } from './emotion-profile.entity';
import { EmotionCheckin } from './emotion-checkin.entity';
import { User } from '../users/user.entity';
import { ShopsService } from '../shops/shops.service';

const QUICK_QUESTIONS = [
  { id: 1, question: '此刻你的心情更像？', options: ['🌸 治愈系', '⚡ 能量系', '😴 慵懒系', '🌙 神秘系'] },
  { id: 2, question: '理想的社交规模？', options: ['👤 独处', '👫 2-3人小聚', '👥 5-8人派对', '🎉 大型活动'] },
  { id: 3, question: '今天最想做什么？', options: ['🍵 慢下来体验', '📸 探索打卡', '🛒 购物消费', '🎮 娱乐游玩'] },
  { id: 4, question: '预算范围？', options: ['💚 50元以内', '💛 50-150元', '🧡 150-300元', '❤️ 不限制'] },
  { id: 5, question: '时间充裕度？', options: ['⏰ 1-2小时', '🕐 半天', '🌅 全天', '🌙 晚上'] },
];

const DEEP_QUESTIONS = [
  { id: 1, question: '你今天的心情更像哪种天气？', options: ['☀️ 晴朗明媚', '🌤 云淡风轻', '🌧 细雨绵绵', '⛈ 雷阵雨'] },
  { id: 2, question: '你现在最想用什么方式"消耗"时间？', options: ['🚶 漫无目的地走走', '📖 沉浸在某个故事里', '🎵 用音乐填满空间', '🍳 动手做点什么'] },
  { id: 3, question: '理想的社交规模是？', options: ['👤 一人独处', '👫 2-3亲密好友', '👥 4-8小团体', '🎉 大型社交'] },
  { id: 4, question: '你消费的主要驱动力是什么？', options: ['🔧 功能需求', '💆 情绪疗愈', '🥂 社交仪式', '🎁 自我奖励'] },
  { id: 5, question: '你理想的消费环境是？', options: ['🤫 安静私密', '🏮 热闹有烟火气', '🌿 自然户外', '✨ 精致有腔调'] },
  { id: 6, question: '现在几点你最想出门？', options: ['🌅 上午（10点前）', '☀️ 下午（12-17点）', '🌆 傍晚（17-20点）', '🌙 夜晚（20点后）'] },
  { id: 7, question: '你的可支配预算感觉？', options: ['💚 省着花', '💛 随意花', '🧡 今天特别', '❤️ 不考虑'] },
  { id: 8, question: '什么让你最快获得满足感？', options: ['🍜 美食', '🎡 体验', '🛍 购物', '🛌 休息'] },
  { id: 9, question: '你倾向于？', options: ['📋 规划好的行程', '🎲 随走随看'] },
  { id: 10, question: '最近让你有共鸣的是？', options: ['🎵 一首歌', '🎬 一部电影', '📚 一本书', '💬 一段对话'] },
  { id: 11, question: '你的身体现在需要？', options: ['🏃 运动放松', '🧘 静止休息', '🎆 感官刺激', '🫖 温暖舒适'] },
  { id: 12, question: '你想要这次出行留下什么？', options: ['📸 美好记忆', '🎁 实用收获', '💨 情绪释放', '🤝 新的认识'] },
];

const EMOTION_SYSTEM_PROMPT = `你是"情绪消费向导"，根据用户的情绪测试答案，生成个性化的省钱人格SQTI标签和场景消费路线。场景路线要温暖、有趣、治愈，引导用户用有意义的方式疗愈情绪。输出必须是严格的JSON格式，不得有任何额外文字。`;

function buildEmotionPrompt(answers: any[], mode: 'quick' | 'deep'): string {
  const routeCount = mode === 'deep' ? 5 : 3;
  return `用户情绪测试答案（${mode === 'deep' ? '深度' : '快速'}版）：${JSON.stringify(answers)}

请根据答案生成SQTI省钱人格标签和${routeCount}条场景路线。SQTI标签类似MBTI四字组合，反映情绪消费风格。

输出格式（严格JSON）：
{
  "emotion_label": "简短情绪标签（如：那份孤独美社交感）",
  "sqti_tag": "四字SQTI标签（如：SEHC）",
  "sqti_description": "SQTI人格的一句话描述",
  "emotion_description": "${mode === 'deep' ? '3-4句' : '2-3句'}描述用户当前情绪状态",
  "routes": [
    {
      "title": "路线标题",
      "mood": "适合的情绪状态",
      "stops": [
        {
          "time": "时间段（如：下午2点）",
          "place": "地点名称",
          "activity": "具体活动描述",
          "shop_category": "从以下值中选一个：咖啡奶茶/甜品蛋糕/小吃简餐/烧烤烤肉/川湘菜/江浙菜/风味地方菜/西餐/东南亚菜/KTV/电影院/购物/户外公园/沉浸体验/户外运动/艺术展览，若无合适类别则填null",
          "estimated_cost": 预计费用数字
        }
      ],
      "total_cost": 总费用数字
    }
  ]
}`;
}

@Injectable()
export class EmotionService {
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(EmotionProfile)
    private readonly profiles: Repository<EmotionProfile>,
    @InjectRepository(EmotionCheckin)
    private readonly checkins: Repository<EmotionCheckin>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly shops: ShopsService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.get('deepseek.apiKey')!,
      baseURL: config.get('deepseek.baseUrl')!,
    });
  }

  getQuestions(mode: 'quick' | 'deep') {
    return mode === 'deep' ? DEEP_QUESTIONS : QUICK_QUESTIONS;
  }

  async *streamQuiz(user: User, answers: any[], mode: 'quick' | 'deep' = 'quick'): AsyncIterable<string> {
    yield `event: quiz_start\ndata: {}\n\n`;

    let buffer = '';
    const stream = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EMOTION_SYSTEM_PROMPT },
        { role: 'user', content: buildEmotionPrompt(answers, mode) },
      ],
      temperature: 0.8,
      max_tokens: mode === 'deep' ? 2500 : 1500,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        buffer += delta;
        yield `event: thinking_chunk\ndata: ${JSON.stringify({ chunk: delta })}\n\n`;
      }
    }

    const result = JSON.parse(buffer);
    const city = user['city'] || '上海';
    const enriched = await this.enrichRoutesWithShops(result.routes ?? [], city);
    result.routes = enriched;

    const profile = this.profiles.create({
      user,
      userId: user.id,
      answers,
      emotionLabel: result.emotion_label,
      routeSummary: JSON.stringify(result.routes),
    });
    await this.profiles.save(profile);

    yield `event: result_complete\ndata: ${JSON.stringify(result)}\n\n`;
  }

  async generateQuizResult(user: User, answers: any[], mode: 'quick' | 'deep' = 'quick'): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      stream: false,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EMOTION_SYSTEM_PROMPT },
        { role: 'user', content: buildEmotionPrompt(answers, mode) },
      ],
      temperature: 0.8,
      max_tokens: mode === 'deep' ? 2500 : 1500,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    const city = user['city'] || '上海';
    result.routes = await this.enrichRoutesWithShops(result.routes ?? [], city);

    const profile = this.profiles.create({
      user,
      userId: user.id,
      answers,
      emotionLabel: result.emotion_label,
      routeSummary: JSON.stringify(result.routes),
    });
    await this.profiles.save(profile);

    return result;
  }

  private async enrichRoutesWithShops(routes: any[], city: string): Promise<any[]> {
    return Promise.all(
      routes.map(async (route) => ({
        ...route,
        stops: await Promise.all(
          (route.stops ?? []).map(async (stop: any) => {
            if (!stop.shop_category) return stop;
            try {
              const recs = await this.shops.getRecommendationsForTask(city, stop.shop_category);
              const topShops = recs
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 2)
                .map((s) => ({
                  name: s.name,
                  rating: s.rating,
                  avgPrice: s.avgPrice,
                  address: s.address,
                  dianpingUrl: s.dianpingUrl,
                  amapNavUrl: s.amapNavUrl,
                }));
              return { ...stop, recommended_shops: topShops };
            } catch {
              return stop;
            }
          }),
        ),
      })),
    );
  }

  async getRoutes(label?: string): Promise<EmotionProfile[]> {
    const qb = this.profiles.createQueryBuilder('p').orderBy('p.created_at', 'DESC').limit(20);
    if (label) {
      qb.where('p.emotion_label ILIKE :label', { label: `%${label}%` });
    }
    return qb.getMany();
  }

  async checkin(user: User, locationName: string, lat: number, lng: number, emotionLabel: string): Promise<EmotionCheckin> {
    if (!this.config.get<boolean>('sms.demoMode')) {
      const today = new Date().toISOString().slice(0, 10);
      const key = `checkin:${user.id}:${today}`;
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 86400);
      if (count > 3) throw new ForbiddenException('每日打卡上限3次');
    }

    const record = this.checkins.create({
      user,
      userId: user.id,
      locationName,
      lat,
      lng,
      emotionLabel,
      pointsEarned: 10,
    });
    await this.checkins.save(record);

    await this.users.increment({ id: user.id }, 'points', 10);

    return record;
  }

  async getMyHistory(userId: string): Promise<EmotionProfile[]> {
    return this.profiles.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
