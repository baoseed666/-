import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge, ChallengeStatus } from './challenge.entity';
import { ChallengeTask, TaskStatus } from './challenge-task.entity';
import { User } from '../users/user.entity';
import { ShopsService } from '../shops/shops.service';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ChallengeOutput } from './ai/ai-provider.interface';
import { CityPulseService } from '../city/city-pulse.service';
import { CityEventsService } from '../city/city-events.service';
import { AmapService } from '../transit/amap.service';

@Injectable()
export class ChallengesService {
  private static readonly POINTS_MULTIPLIER: Record<string, number> = {
    '地狱': 3,
    '普通': 2,
    '简单': 1,
  };

  constructor(
    @InjectRepository(Challenge)
    private readonly challenges: Repository<Challenge>,
    @InjectRepository(ChallengeTask)
    private readonly tasks: Repository<ChallengeTask>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly shops: ShopsService,
    private readonly ai: AIProviderFactory,
    private readonly cityPulse: CityPulseService,
    private readonly cityEvents: CityEventsService,
    private readonly amap: AmapService,
  ) {}

  async create(user: User, rawText: string): Promise<Challenge> {
    const { budget, peopleCount } = this.parseBasics(rawText);
    const challenge = this.challenges.create({
      user,
      inputText: rawText,
      budget,
      peopleCount,
      city: '上海',
    });
    return this.challenges.save(challenge);
  }

  async *streamTasks(
    challengeId: string,
    lat?: number,
    lng?: number,
  ): AsyncIterable<string> {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();

    const [pulse, eventsContext] = await Promise.all([
      this.cityPulse.getPulse(),
      this.cityEvents.getEventsContext(),
    ]);

    yield `event: city_pulse\ndata: ${JSON.stringify({
      weather: pulse.weather,
      crowdLevel: pulse.crowdLevel,
      hotNeighborhood: pulse.hotNeighborhood,
      openShopsCount: pulse.openShopsCount,
      tip: pulse.tip,
      activeEvents: pulse.activeEvents.map((e) => ({
        name: e.name,
        neighborhood: e.neighborhood,
        costLow: e.costLow,
        costHigh: e.costHigh,
        tags: e.tags,
        bookingUrl: e.bookingUrl,
      })),
    })}\n\n`;

    const category = this.inferShopCategory(challenge.inputText);

    yield `event: action_query\ndata: ${JSON.stringify({
      category,
      city: challenge.city,
      hasGps: !!(lat && lng),
    })}\n\n`;

    const shopContext = await this.shops.getContextShops(
      challenge.city,
      category,
      lat,
      lng,
    );
    const timeOfDay = this.getTimeOfDay();

    let buffer = '';
    yield `event: plan_start\ndata: {}\n\n`;

    for await (const chunk of this.ai.streamChallenge({
      rawText: challenge.inputText,
      budget: challenge.budget != null ? parseFloat(challenge.budget as any) : null,
      peopleCount: challenge.peopleCount,
      city: challenge.city,
      shopContext,
      timeOfDay,
      cityPulse: {
        weather: pulse.weather,
        crowdLevel: pulse.crowdLevel,
        hotNeighborhood: pulse.hotNeighborhood,
      },
      eventsContext,
    })) {
      buffer += chunk;
      yield `event: task_chunk\ndata: ${JSON.stringify({ chunk })}\n\n`;
    }

    const output: ChallengeOutput = JSON.parse(buffer);

    // Save all plans to DB so confirm-plan can access them later
    challenge.allPlans = output.plans;
    await this.challenges.save(challenge);

    const planSummaries = output.plans.map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      hp: p.hp,
      mp: p.mp,
      estimatedSave: p.estimatedSave,
      estimatedSpend: p.estimatedSpend,
      taskCount: p.tasks.length,
    }));
    yield `event: plans_ready\ndata: ${JSON.stringify({ plans: planSummaries })}\n\n`;

    yield `event: complete\ndata: ${JSON.stringify({ challengeId })}\n\n`;
  }

  async findWithTasks(id: string, userId: string) {
    const c = await this.challenges.findOne({
      where: { id, user: { id: userId } },
      relations: ['tasks', 'tasks.shop'],
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  async updateTaskStatus(
    challengeId: string,
    taskId: string,
    userId: string,
    status: TaskStatus,
  ) {
    const task = await this.tasks.findOne({
      where: {
        id: taskId,
        challenge: { id: challengeId, user: { id: userId } },
      },
      relations: ['challenge', 'challenge.user'],
    });
    if (!task) throw new NotFoundException();
    task.status = status;
    return this.tasks.save(task);
  }

  async complete(challengeId: string, userId: string, savedAmount: number) {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();
    challenge.status = ChallengeStatus.COMPLETED;
    challenge.savedAmount = savedAmount;

    const multiplier = ChallengesService.POINTS_MULTIPLIER[challenge.difficulty ?? '普通'] ?? 1;
    const estimatedSave = parseFloat(String(challenge.estimatedSave ?? 0));
    const points = Math.round(estimatedSave * multiplier);
    challenge.pointsEarned = points;

    const user = challenge.user;
    user.points = (user.points ?? 0) + points;
    await this.users.save(user);

    return this.challenges.save(challenge);
  }

  async confirmPlan(
    challengeId: string,
    userId: string,
    planIndex: number,
    lat?: number,
    lng?: number,
  ) {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();
    if (!challenge.allPlans?.length) throw new NotFoundException('Plans not ready');

    const idx = Math.max(0, Math.min(planIndex, challenge.allPlans.length - 1));
    const selectedPlan = challenge.allPlans[idx];
    challenge.difficulty = selectedPlan.difficulty;
    challenge.estimatedSave = selectedPlan.estimatedSave;
    await this.challenges.save(challenge);
    await this.persistTasks(challenge, { plans: challenge.allPlans }, lat, lng, idx);
    return this.findWithTasks(challengeId, userId);
  }

  private parseBasics(text: string): { budget: number | null; peopleCount: number } {
    const budgetMatch = text.match(/(\d+)\s*元/);
    const peopleMatch = text.match(/(\d+)\s*[人个]/);
    return {
      budget: budgetMatch ? parseFloat(budgetMatch[1]) : null,
      peopleCount: peopleMatch ? parseInt(peopleMatch[1], 10) : 1,
    };
  }

  private inferShopCategory(text: string): string {
    const t = text.toLowerCase();

    if (/本帮|沪菜|上海菜|红烧肉|糖醋|葱油|松鹤楼|淘小馆|苏式汤面/.test(t))
      return '本帮沪菜';
    if (
      /咖啡|拿铁|美式|卡布奇诺|摩卡|星巴克|瑞幸|manner|mstand|seesaw|blue bottle|蓝瓶/.test(
        t,
      )
    )
      return '咖啡奶茶';
    if (/奶茶|茶饮|喜茶|奈雪|蜜雪|霸王茶姬|茶百道|沪上阿姨|开吉|fika/.test(t))
      return '咖啡奶茶';
    if (/甜品|蛋糕|冰淇淋|布丁|慕斯|提拉米苏|甜点|糕点|letao|蔡嘉|阿嬷/.test(t))
      return '甜品蛋糕';
    if (/火锅|涮锅|涮肉|麻辣烫|冒菜|串串香/.test(t)) return '火锅';
    if (/烧烤|炭烤|撸串|烤串|bbq|烤肉|炙烤|趁烧/.test(t)) return '烧烤烤肉';
    if (/海鲜|龙虾|小龙虾|螃蟹|生蚝|鱼鲜|烤鱼|炉鱼|甬府/.test(t))
      return '鱼鲜海鲜';
    if (/寿司|日料|刺身|天妇罗|拉面|日本料理/.test(t)) return '日料';
    if (/韩国|韩料|韩式|泡菜|部队锅|韩餐/.test(t)) return '韩料';
    if (/泰国|泰式|泰餐|四面泰|冬阴功/.test(t)) return '泰国料理';
    if (/傣|傣味|傣族|傣菜|胡麻/.test(t)) return '傣味菜';
    if (/越南|东南亚|越式|河粉|桂芭蕉/.test(t)) return '东南亚菜';
    if (
      /西餐|牛排|披萨|意面|意大利|法餐|汉堡|三明治|crafted|mozzarella/.test(t)
    )
      return '西餐';
    if (/川菜|湘菜|川湘|麻辣|辣椒|重庆|长沙|瓦屋/.test(t)) return '川湘菜';
    if (/粤菜|早茶|点心|广式|港式|肠粉|虾饺/.test(t)) return '粤菜';
    if (/江浙|苏菜|浙菜|杭帮|苏帮|逸道/.test(t)) return '江浙菜';
    if (/云南|贵州|云贵|米线|过桥|酸汤|彝族/.test(t)) return '云贵菜';
    if (/西北|新疆|陕西|兰州|莜面|羊肉泡馍|肉夹馍|烩面/.test(t))
      return '西北菜';
    if (/地方菜|特色|风味|民俗|乡土|北京菜|京菜|烤鸭|柿合缘/.test(t))
      return '风味地方菜';
    if (/自助|buffet|吃到饱|无限量/.test(t)) return '自助餐';
    if (/自然酒|红酒|酒馆|wine|rckless|小酒馆/.test(t)) return '自然酒馆';
    if (/汉服|国风|写真|照相馆|古装|旗袍|妆造|归朝欢/.test(t))
      return '文化体验';
    if (/美术馆|展览|博物馆|画展|艺术展|朵云轩|西岸穹顶|sfc|剧场/.test(t))
      return '艺术展览';
    if (/非遗|传统工艺|刺绣|盘扣|珐琅|木版水印|南方非遗/.test(t))
      return '非遗体验';
    if (/沉浸|三体|轮滑|disco|舞托邦|aark|剧本沉浸|discotopia/.test(t))
      return '沉浸体验';
    if (/亲子|科技馆|儿童|奈尔宝|乐园|益智/.test(t)) return '亲子科技';
    if (
      /跑步|登山|户外运动|on昂跑|lululemon|patagonia|mammut|攀岩|goeasy|helly/.test(
        t,
      )
    )
      return '户外运动';
    if (/潮牌|bape|undefeated|supreme|潮流|streetwear|army logic|exit/.test(t))
      return '潮流服饰';
    if (/ktv|唱歌|唱k|k歌|卡拉ok|魅ktv/.test(t)) return 'KTV';
    if (/电影|影院|看片|影城/.test(t)) return '电影院';
    if (/桌游|棋牌|剧本杀|狼人杀/.test(t)) return '桌游';
    if (/密室|逃脱|密室逃脱/.test(t)) return '密室逃脱';
    if (/购物|逛街|商场|超市|买买买|aldi|优衣库|uniqlo/.test(t)) return '购物';
    if (/公园|爬山|户外|骑行|露营|健身|步道/.test(t)) return '户外公园';

    return '小吃简餐';
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 22) return 'evening';
    return 'night';
  }

  private async persistTasks(
    challenge: Challenge,
    output: ChallengeOutput,
    lat?: number,
    lng?: number,
    planIndex = 0,
  ): Promise<Array<{ taskIndex: number; recommendations: any[] }>> {
    const firstPlan = output.plans[planIndex];
    if (!firstPlan) return [];

    const budget = challenge.budget
      ? parseFloat(challenge.budget as any) / (challenge.peopleCount || 1)
      : undefined;

    const shopResults: Array<{ taskIndex: number; recommendations: any[] }> =
      [];

    const entities = await Promise.all(
      firstPlan.tasks.map(async (t, i) => {
        const task = this.tasks.create({
          challenge,
          type: t.type as any,
          description: t.description,
          tips: t.tips,
          sortOrder: i,
          shopRecommendations: [],
        });

        if (t.type === 'main') {
          const combined = `${challenge.inputText} ${t.description} ${t.shopHint ?? ''}`;
          const category = this.inferShopCategory(combined);
          try {
            const recs = await this.shops.getRecommendationsForTask(
              challenge.city,
              category,
              lat,
              lng,
              budget,
            );
            task.shopRecommendations = recs;
            shopResults.push({ taskIndex: i, recommendations: recs });

            const firstShop = recs[0];
            if (firstShop) {
              const links: import('./ai/ai-provider.interface').ActionLink[] = [];
              if (firstShop.externalUrl) {
                links.push({ type: 'book', label: '去美团预约', url: firstShop.externalUrl });
              }
              if (firstShop.lat && firstShop.lng) {
                const navUrl = `https://uri.amap.com/navigation?to=${firstShop.lng},${firstShop.lat},${encodeURIComponent(firstShop.name)}&mode=walk&callnative=0`;
                links.push({ type: 'nav', label: '高德导航', url: navUrl });
              }
              task.actionLinks = links;
            }
          } catch {
            task.shopRecommendations = [];
          }
        } else if (t.type === 'side') {
          const q = encodeURIComponent(`${t.description} ${challenge.city}`);
          task.actionLinks = [
            { type: 'search', label: '搜索攻略', url: `https://www.xiaohongshu.com/search_result?keyword=${q}` },
          ];
        }

        return task;
      }),
    );

    await this.tasks.save(entities);
    return shopResults;
  }
}
