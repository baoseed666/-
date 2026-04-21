import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge, ChallengeStatus } from './challenge.entity';
import { ChallengeTask, TaskStatus } from './challenge-task.entity';
import { User } from '../users/user.entity';
import { ShopsService } from '../shops/shops.service';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ChallengeOutput, ActionLink } from './ai/ai-provider.interface';
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

    const categories = this.inferShopCategories(challenge.inputText);

    yield `event: action_query\ndata: ${JSON.stringify({
      categories,
      city: challenge.city,
      hasGps: !!(lat && lng),
    })}\n\n`;

    const shopContextParts = await Promise.all(
      categories.map((cat) =>
        this.shops.getContextShops(challenge.city, cat, lat, lng).then(
          (ctx) => `【${cat}】\n${ctx}`,
        ),
      ),
    );
    const shopContext = shopContextParts.join('\n\n');
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

  async generateAsync(
    challengeId: string,
    userId: string,
    lat?: number,
    lng?: number,
  ): Promise<void> {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
    });
    if (!challenge) throw new NotFoundException();

    setImmediate(async () => {
      try {
        for await (const _ of this.streamTasks(challengeId, lat, lng)) { /* drain */ }
      } catch { /* fire-and-forget */ }
    });
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

  private static readonly CATEGORY_RULES: Array<[RegExp, string]> = [
    [/本帮|沪菜|上海菜|红烧肉|糖醋|葱油/, '本帮沪菜'],
    [/咖啡|拿铁|美式|卡布|摩卡|星巴克|瑞幸|manner|mstand|seesaw|咖啡馆|下午茶|tea|面包|烘焙/, '咖啡奶茶'],
    [/奶茶|茶饮|喜茶|奈雪|蜜雪|霸王茶姬|茶百道|沪上阿姨|茶|bubble tea/, '咖啡奶茶'],
    [/甜品|蛋糕|冰淇淋|布丁|慕斯|提拉米苏|甜点|糕点|抹茶|蛋糕店|马卡龙|芝士|奶冻/, '甜品蛋糕'],
    [/火锅|涮锅|涮肉|麻辣烫|冒菜|串串香|串串|滚锅|骨汤锅|清汤锅/, '火锅'],
    [/烧烤|炭烤|撸串|烤串|bbq|烤肉|炙烤|自助烤肉|铁板/, '烧烤烤肉'],
    [/海鲜|龙虾|小龙虾|螃蟹|生蚝|鱼鲜|烤鱼|炉鱼|蛤蜊|扇贝|鲍鱼/, '鱼鲜海鲜'],
    [/寿司|日料|刺身|天妇罗|拉面|日本料理|铁板烧|居酒屋|章鱼烧|乌冬/, '日料'],
    [/韩国|韩料|韩式|泡菜|部队锅|韩餐|韩菜|韩国菜|炸鸡啤酒|韩式炸鸡|石锅拌饭/, '韩料'],
    [/泰国|泰式|泰餐|冬阴功|越南|东南亚|越式|河粉|泰菜|泰食|越菜|越南菜|泰北|椰子鸡|东南亚菜|南洋/, '东南亚菜'],
    [/西餐|牛排|披萨|意面|法餐|汉堡|法式|法国菜|意大利|意大利菜|意式|西班牙|葡式|地中海/, '西餐'],
    [/川菜|湘菜|川湘|麻辣|辣椒|重庆|长沙|四川|水煮鱼|毛血旺|剁椒/, '川湘菜'],
    [/粤菜|早茶|点心|广式|港式|肠粉|虾饺|广东菜|粤式|港餐|港茶|叉烧|烧腊|煲仔饭/, '粤菜'],
    [/江浙|苏菜|浙菜|杭帮|苏帮|苏州菜|浙江菜|杭州菜|苏州|西湖醋鱼|东坡肉/, '江浙菜'],
    [/云南|贵州|云贵|米线|过桥|酸汤|云贵菜|彝族/, '云贵菜'],
    [/西北|新疆|陕西|兰州|羊肉泡馍|肉夹馍|大盘鸡|手抓饭|拉条子/, '西北菜'],
    [/地方菜|民俗|北京菜|烤鸭|台湾|台式|台湾菜|印度|印度菜|印度咖喱|土耳其|墨西哥|中东/, '风味地方菜'],
    [/自助|buffet|吃到饱|无限量/, '自助餐'],
    [/ktv|唱歌|唱k|k歌|卡拉ok|酒吧|夜店|live house|livehouse|清吧|驻唱|酒馆|夜生活/, 'KTV'],
    [/电影|影院|看片|影城/, '电影院'],
    [/桌游|棋牌|剧本杀|狼人杀|电竞|网咖|游戏厅|游戏|剧本|推理|密道|侦探|谁是卧底/, '桌游'],
    [/密室|逃脱/, '密室逃脱'],
    [/购物|逛街|商场|超市|便利店|逛超市|集市|市集|买东西|购物中心/, '购物'],
    [/公园|爬山|户外|骑行|露营|健身|温泉|游泳|徒步|钓鱼|攀岩|冲浪|滑板|羽毛球|网球|瑜伽/, '户外公园'],
    [/小吃|简餐|快餐|盖浇|黄焖鸡|兰州拉面|酸辣粉|螺蛳粉|炸鸡|鸡排|煎饼|包子|饺子|包饺子|馄饨|夜宵|宵夜|消夜|炒饭|炒面|鸡公煲/, '小吃简餐'],
  ];

  inferShopCategory(text: string): string {
    const t = text.toLowerCase();
    const match = ChallengesService.CATEGORY_RULES.find(([re]) => re.test(t));
    return match ? match[1] : '小吃简餐';
  }

  inferShopCategories(text: string): string[] {
    const t = text.toLowerCase();
    const seen = new Set<string>();
    for (const [re, cat] of ChallengesService.CATEGORY_RULES) {
      if (re.test(t)) seen.add(cat);
    }
    return seen.size > 0 ? [...seen] : ['小吃简餐'];
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
  ): Promise<void> {
    const plan = output.plans[planIndex];
    if (!plan) return;

    const difficulty = plan.difficulty ?? '普通';
    const budget = challenge.budget
      ? parseFloat(challenge.budget as any) / (challenge.peopleCount || 1)
      : undefined;

    const entities = await Promise.all(
      plan.tasks.map(async (t, i) => {
        const task = this.tasks.create({
          challenge,
          type: t.type as any,
          description: t.description,
          tips: t.tips,
          sortOrder: i,
          shopRecommendations: [],
          actionLinks: [],
        });

        if (t.type === 'main') {
          await this.buildMainTaskLinks(task, challenge, t.shopHint, difficulty, lat, lng, budget);
        } else if (t.type === 'side') {
          task.actionLinks = this.buildSideTaskLinks(t.description, challenge.city, difficulty);
        } else if (t.type === 'hidden') {
          task.actionLinks = this.buildHiddenTaskLinks(t.description, challenge.city, difficulty);
        }

        return task;
      }),
    );

    await this.tasks.save(entities);
  }

  /** 主线任务：真实店铺 + 大众点评 + 美团 + 高德导航 */
  private async buildMainTaskLinks(
    task: ChallengeTask,
    challenge: Challenge,
    shopHint: string | null,
    difficulty: string,
    lat?: number,
    lng?: number,
    budget?: number,
  ): Promise<void> {
    const combined = `${challenge.inputText} ${task.description} ${shopHint ?? ''}`;
    const category = this.inferShopCategory(combined);

    try {
      // 名称优先：若有 shopHint，先按名称找到目标店
      let hintShop: import('../shops/shops.service').ShopRecommendation | null = null;
      if (shopHint) {
        hintShop = await this.shops.findByHint(shopHint, challenge.city, lat, lng);
      }

      // 按品类补充推荐（最多3家，过滤掉已命名的店）
      const categoryRecs = await this.shops.getRecommendationsForTask(
        challenge.city, category, lat, lng, budget,
      );
      const others = hintShop
        ? categoryRecs.filter((r) => r.name !== hintShop!.name).slice(0, 2)
        : categoryRecs.slice(0, 3);

      const recs = hintShop ? [hintShop, ...others] : others;
      task.shopRecommendations = recs;

      const links: ActionLink[] = [];
      const bestShop = recs[0];
      if (bestShop) {
        if (bestShop.dianpingUrl) links.push({ type: 'book', label: '大众点评', url: bestShop.dianpingUrl });
        if (bestShop.meituanUrl) links.push({ type: 'book', label: '美团预约', url: bestShop.meituanUrl });
        if (bestShop.amapNavUrl) links.push({ type: 'nav', label: '高德导航', url: bestShop.amapNavUrl });
      }

      if (difficulty === '地狱') {
        const q = encodeURIComponent(shopHint ?? task.description);
        links.push({ type: 'group', label: '拼多多找团购', url: `https://mobile.yangkeduo.com/search_result.html?search_key=${q}` });
        links.push({ type: 'search', label: '什么值得买比价', url: `https://m.smzdm.com/search/?s=${q}` });
      }

      task.actionLinks = links;
    } catch {
      task.shopRecommendations = [];
      task.actionLinks = this.fallbackMainLinks(task.description, challenge.city);
    }
  }

  /** 支线任务：按难度分级的省钱攻略链接 */
  private buildSideTaskLinks(description: string, city: string, difficulty: string): ActionLink[] {
    const q = encodeURIComponent(`${description} ${city} 省钱攻略`);
    const links: ActionLink[] = [
      { type: 'search', label: '小红书攻略', url: `https://www.xiaohongshu.com/search_result?keyword=${q}` },
    ];

    if (difficulty === '地狱') {
      links.push(
        { type: 'group', label: '拼多多比价', url: `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(description)}` },
        { type: 'search', label: '闲鱼二手', url: `https://www.goofish.com/search?keyword=${encodeURIComponent(description)}` },
      );
    } else if (difficulty === '普通') {
      links.push(
        { type: 'book', label: '美团优惠券', url: `https://h5.meituan.com/rgc/index.html?keyword=${encodeURIComponent(description)}` },
      );
    } else {
      links.push(
        { type: 'book', label: '口碑优惠', url: `https://m.koubei.com/search?q=${encodeURIComponent(description)}` },
      );
    }

    links.push({ type: 'video', label: '抖音团购', url: `https://www.douyin.com/search/${encodeURIComponent(description + ' 上海龙华 团购')}` });
    return links;
  }

  /** 隐藏成就：具体省钱技巧入口 */
  private buildHiddenTaskLinks(description: string, city: string, difficulty: string): ActionLink[] {
    const q = encodeURIComponent(description);
    const links: ActionLink[] = [];

    if (/券|优惠|折扣|红包/.test(description)) {
      links.push({ type: 'search', label: '淘宝领券', url: `https://s.taobao.com/search?q=${q}+优惠券` });
      links.push({ type: 'search', label: '美团领券', url: `https://h5.meituan.com/coupon/list.html` });
    } else if (/签到|打卡|积分/.test(description)) {
      links.push({ type: 'student', label: '支付宝积分', url: 'https://render.alipay.com/p/yuyan/180020010001205809/index.html' });
    } else if (/拼团|组队|拼单/.test(description)) {
      links.push({ type: 'group', label: '发起拼单', url: `https://mobile.yangkeduo.com/search_result.html?search_key=${q}` });
    } else {
      const qCity = encodeURIComponent(`${description} ${city} 技巧`);
      links.push({ type: 'search', label: '小红书隐藏技巧', url: `https://www.xiaohongshu.com/search_result?keyword=${qCity}` });
    }

    if (difficulty === '地狱') {
      links.push({ type: 'search', label: '什么值得买', url: `https://m.smzdm.com/search/?s=${q}` });
    }

    links.push({ type: 'video', label: '抖音隐藏优惠', url: `https://www.douyin.com/search/${encodeURIComponent(description + ' 上海龙华 隐藏优惠')}` });
    return links;
  }

  private fallbackMainLinks(description: string, city: string): ActionLink[] {
    const q = encodeURIComponent(`${description} ${city}`);
    return [
      { type: 'book', label: '大众点评搜索', url: `https://m.dianping.com/search/keyword/1/0_${q}` },
      { type: 'book', label: '美团搜索', url: `https://h5.waimai.meituan.com/waimai/mindex/home?q=${q}` },
    ];
  }
}
