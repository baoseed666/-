# 抠门大王·城市级升级 — 设计规格文档 v2.0

**日期：** 2026-04-17  
**版本：** v2.0（城市级升级，基于 v1.0 主设计规格）  
**黑客松截止：** 2026-04-24  
**目标区域：** 上海市徐汇区龙华街道社区  

---

## 1. 升级目标

从"个人工具级"升级为"城市级"产品：

| 维度 | 升级前 | 升级后 |
|------|-------|-------|
| 地理范围 | 多城市泛化 | 上海徐汇区龙华街道（固定） |
| 数据来源 | 21家种子店铺（含深圳/北京/广州） | 50+家龙华街道真实店铺 |
| 城市感知 | 无 | 天气 + 当前活动 + 人流量 + 营业状态 |
| AI行为 | 生成"建议" | 执行完整工作流（查空位→规划路线→给出预约链接） |
| 分类体系 | 20类 | 扩展至 30 类（含文化体验/艺术展览/沉浸体验/亲子科技等） |

---

## 2. 地理范围设计

### 2.1 街区划分（neighborhood 字段）

新增 `shops.neighborhood` varchar 字段，区分龙华街道内的商圈单元：

| neighborhood | 核心地址 | 坐标中心 |
|-------------|---------|---------|
| `龙华会` | 徐汇区龙华路2778号 | 31.1892, 121.4539 |
| `西岸凤巢` | 徐汇区云锦路683号 | 31.1714, 121.4635 |
| `西岸梦中心` | 徐汇区龙腾大道2260号 | 31.1567, 121.4692 |
| `朵云轩` | 徐汇区天钥桥路1188号 | 31.1784, 121.4529 |
| `滨江步道` | 徐汇滨江公共区域 | 31.1650, 121.4680 |

### 2.2 数据库 Migration

```sql
-- 1. shops 表新增 neighborhood 字段
ALTER TABLE shops ADD COLUMN neighborhood VARCHAR;

-- 2. 城市活动表（新建）
CREATE TABLE city_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,           -- '庙会'|'市集'|'展览'|'演出'|'运动'|'夜市'|'快闪'|'沙龙'
  venue VARCHAR NOT NULL,
  neighborhood VARCHAR NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  description TEXT,
  discounts JSONB DEFAULT '{}',    -- {'券': '满100抵30', '渠道': '龙华会小程序'}
  booking_url VARCHAR,
  tags TEXT[] DEFAULT '{}',        -- ['免费','亲子','非遗','户外']
  cost_low INT DEFAULT 0,
  cost_high INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- is_active 通过查询条件实现，不存字段：
-- WHERE start_date <= NOW() AND end_date >= NOW()
```

---

## 3. 扩展分类体系

`ChallengesService.inferShopCategory()` 是唯一入口，扩展至 30 类：

### 3.1 完整分类枚举

**餐饮·饮品**
- `咖啡奶茶` — 现有
- `甜品蛋糕` — 现有
- `小吃简餐` — 现有（兜底）
- `本帮沪菜` — **新增**（松鹤楼、淘小馆）

**餐饮·锅类**
- `火锅` — 现有
- `烧烤烤肉` — 现有（含趁烧等烤串）

**餐饮·地域菜**
- `江浙菜` — 现有
- `川湘菜` — 现有（瓦屋）
- `粤菜` — 现有
- `云贵菜` — 现有
- `西北菜` — 现有
- `风味地方菜` — 现有
- `傣味菜` — **新增**（胡麻傣味）

**餐饮·异国料理**
- `西餐` — 现有
- `日料` — 现有
- `韩料` — 现有
- `东南亚菜` — 现有（桂芭蕉）
- `泰国料理` — **新增**（四面泰）
- `自助餐` — 现有

**餐饮·其他**
- `鱼鲜海鲜` — 现有
- `自然酒馆` — **新增**（RCKLESS）

**文化体验（全新大类）**
- `文化体验` — **新增**（归朝欢国风照相馆）
- `艺术展览` — **新增**（朵云轩美术馆、西岸穹顶）
- `非遗体验` — **新增**（朵云轩大师工作室、南方非遗展）
- `沉浸体验` — **新增**（三体体验馆、DiscoTopia、Aark Space）

**娱乐**
- `KTV` — 现有
- `电影院` — 现有（朵云轩杜比全景声影城）
- `桌游` — 现有
- `密室逃脱` — 现有
- `亲子科技` — **新增**（奈尔宝科技馆）

**购物**
- `购物` — 现有（ALDI、优衣库）
- `户外运动` — **新增**（On昂跑、Patagonia、Mammut、GOEASY）
- `潮流服饰` — **新增**（BAPE、UNDEFEATED、ARMY LOGIC）

**户外**
- `户外公园` — 现有（滨江步道、风之谷体育公园）

### 3.2 关键词映射规则（inferShopCategory 新增规则）

```typescript
// 本帮沪菜
if (/本帮|沪菜|上海菜|红烧肉|糖醋|葱油|松鹤楼|淘小馆|苏式汤面/.test(t)) return '本帮沪菜';

// 泰国料理
if (/泰国|泰式|泰餐|四面泰|冬阴功/.test(t)) return '泰国料理';

// 傣味菜
if (/傣|傣味|傣族|傣菜|胡麻/.test(t)) return '傣味菜';

// 自然酒馆
if (/自然酒|红酒|酒馆|wine|rckless|小酒馆/.test(t)) return '自然酒馆';

// 文化体验
if (/汉服|国风|写真|照相馆|古装|旗袍|妆造/.test(t)) return '文化体验';

// 艺术展览
if (/美术馆|展览|博物馆|画展|艺术展|朵云轩|西岸穹顶/.test(t)) return '艺术展览';

// 非遗体验
if (/非遗|传统工艺|刺绣|盘扣|珐琅|木版水印/.test(t)) return '非遗体验';

// 沉浸体验
if (/沉浸|三体|轮滑|disco|舞托邦|aark|剧本沉浸/.test(t)) return '沉浸体验';

// 亲子科技
if (/亲子|科技馆|儿童|奈尔宝|乐园|益智/.test(t)) return '亲子科技';

// 户外运动
if (/跑步|登山|户外运动|on昂跑|lululemon|patagonia|mammut|攀岩/.test(t)) return '户外运动';

// 潮流服饰
if (/潮牌|bape|undefeated|supreme|潮流|streetwear|army logic/.test(t)) return '潮流服饰';
```

---

## 4. 店铺种子数据（50家龙华街道真实店铺）

完整 seed 数据在 `ShopSeedService` 中实现，按 neighborhood 分组：

### 4.1 龙华会（17家）

| 名称 | 分类 | 人均 | 评分 | 折扣 | 外部链接 |
|------|------|------|------|------|---------|
| 松鹤楼苏式汤面 | 本帮沪菜 | 60 | 4.6 | 早市满30减10 | 大众点评 |
| 柿合缘新京菜 | 风味地方菜 | 280 | 4.5 | 团购套餐9折 | 大众点评 |
| 逸道精致中餐 | 江浙菜 | 200 | 4.4 | 工作日午市8折 | 大众点评 |
| 四面泰 | 泰国料理 | 110 | 4.5 | 双人套餐立减30 | 大众点评 |
| 趁烧火锅 | 烧烤烤肉 | 190 | 4.7 | 全国唯一店·工作日8.5折 | 大众点评 |
| Grande A'moo甜品 | 甜品蛋糕 | 55 | 4.5 | 新客立减10元 | 大众点评 |
| MANNER咖啡(龙华会) | 咖啡奶茶 | 22 | 4.6 | 自带杯减5元 | 美团 |
| 开吉茶馆 | 咖啡奶茶 | 45 | 4.4 | 下午3点后买一送一 | 大众点评 |
| RCKLESS自然酒馆 | 自然酒馆 | 120 | 4.3 | 工作日欢乐时光6折 | 大众点评 |
| 奥乐齐ALDI(龙华会) | 购物 | 80 | 4.7 | 自有品牌会员享积分 | 美团 |
| 优衣库(龙华会) | 购物 | 200 | 4.5 | UT联名/周限定折扣 | 美团 |
| 魅KTV(龙华会) | KTV | 90 | 4.3 | 小程序预约享7折·工作日套餐 | 大众点评 |
| GOEASY够意思 | 户外运动 | 600 | 4.5 | 会员首购9折 | 大众点评 |
| UNDEFEATED | 潮流服饰 | 1200 | 4.5 | — | 大众点评 |
| ARMY LOGIC | 潮流服饰 | 450 | 4.3 | 季末折扣最高5折 | 大众点评 |
| 甬府尊鲜 | 鱼鲜海鲜 | 400 | 4.6 | 商务套餐预约享赠品 | 大众点评 |
| 龙华会夜市摊位 | 小吃简餐 | 30 | 4.4 | 无优惠·当季限定 | — |

### 4.2 西岸凤巢（7家）

| 名称 | 分类 | 人均 | 评分 | 折扣 |
|------|------|------|------|------|
| M Stand(西岸凤巢) | 咖啡奶茶 | 45 | 4.6 | 首杯新客立减8元 |
| SeeSaw Coffee | 咖啡奶茶 | 48 | 4.5 | 积分换购周边 |
| 蔡嘉法式甜品 | 甜品蛋糕 | 85 | 4.5 | 双份套餐9折 |
| LeTAO | 甜品蛋糕 | 70 | 4.6 | 招牌双层芝士蛋糕买2送1 |
| FIKA WAKA | 咖啡奶茶 | 90 | 4.4 | — |
| 奈尔宝科技馆 | 亲子科技 | 220 | 4.7 | 会员早场享8折 |
| 三体沉浸式体验馆 | 沉浸体验 | 150 | 4.6 | 工作日立减30元 |

### 4.3 西岸梦中心（20家）

| 名称 | 分类 | 人均 | 评分 | 折扣 |
|------|------|------|------|------|
| 蓝瓶咖啡Blue Bottle | 咖啡奶茶 | 60 | 4.8 | — |
| M Stand(梦中心江边店) | 咖啡奶茶 | 45 | 4.7 | 江景座位免预约 |
| 阿嬷手作 | 甜品蛋糕 | 35 | 4.5 | 10人以上团购9折 |
| 瓦屋川菜(上海首店) | 川湘菜 | 110 | 4.6 | 新店开业9折 |
| 桂芭蕉 | 东南亚菜 | 200 | 4.5 | 需取号等位·无折扣 |
| 胡麻傣味 | 傣味菜 | 120 | 4.4 | 午市套餐立减20 |
| Mozzarella e Vino | 西餐 | 200 | 4.5 | 工作日商务套餐8.5折 |
| CRAFTED By | 西餐 | 300 | 4.6 | 露台位需提前预约 |
| BLOOMARKET美食市集 | 小吃简餐 | 80 | 4.5 | 30+品牌，无统一折扣 |
| DiscoTopia舞托邦 | 沉浸体验 | 180 | 4.7 | 工作日入场票7折 |
| Aark Space | 沉浸体验 | 150 | 4.5 | 新客首次体验8折 |
| SFC露天水岸剧场 | 艺术展览 | 80 | 4.6 | 早鸟票9折 |
| lululemon(梦中心) | 户外运动 | 800 | 4.5 | 周末社群活动免费 |
| On昂跑跑者基地 | 户外运动 | 1000 | 4.6 | 体验跑步活动免费 |
| Patagonia | 户外运动 | 1500 | 4.7 | — |
| Mammut猛犸象 | 户外运动 | 1500 | 4.6 | — |
| HELLY HANSEN | 户外运动 | 1200 | 4.5 | — |
| BAPE GALLERY™ | 潮流服饰 | 1800 | 4.6 | 艺术联名限量 |
| EXI.T | 潮流服饰 | 500 | 4.4 | 季末清仓6折 |
| 西岸梦中心停车场 | 户外公园 | 0 | 4.0 | 消费满200免停车费 |

### 4.4 朵云轩艺术中心（4家）

| 名称 | 分类 | 人均 | 评分 | 折扣 |
|------|------|------|------|------|
| 朵云轩杜比全景声影城 | 电影院 | 85 | 4.8 | 工作日场次立减20·会员积分兑票 |
| 朵云轩美术馆 | 艺术展览 | 30 | 4.7 | 部分展览免费·学生5折 |
| 朵云轩博物馆 | 非遗体验 | 0 | 4.6 | 常设展免费 |
| 南方非遗展示中心 | 非遗体验 | 0 | 4.5 | 全部免费 |

### 4.5 滨江步道及其他（4家）

| 名称 | 分类 | 人均 | 评分 | 折扣 |
|------|------|------|------|------|
| 归朝欢国风照相馆 | 文化体验 | 350 | 4.8 | 闺蜜双人套餐9折 |
| 星巴克甄选店(龙华) | 咖啡奶茶 | 55 | 4.5 | 下午3-5点第2杯半价 |
| 西岸风之谷体育公园 | 户外公园 | 20 | 4.5 | 工作日早场免费 |
| 龙华广场（青铜花苞） | 户外公园 | 0 | 4.4 | 免费·散步打卡 |

---

## 5. 城市活动系统（CityEventsModule）

### 5.1 Entity

```typescript
@Entity('city_events')
export class CityEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() type: string;          // 庙会/市集/展览/演出/运动/夜市/快闪/沙龙
  @Column() venue: string;
  @Column() neighborhood: string;
  @Column({ type: 'timestamp' }) startDate: Date;
  @Column({ type: 'timestamp' }) endDate: Date;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'jsonb', default: '{}' }) discounts: Record<string, string>;
  @Column({ nullable: true }) bookingUrl: string;
  @Column({ type: 'text', array: true, default: '{}' }) tags: string[];
  @Column({ default: 0 }) costLow: number;
  @Column({ default: 0 }) costHigh: number;
  @CreateDateColumn() createdAt: Date;
}
```

### 5.2 Service 关键方法

```typescript
// 返回当前正在举办的活动（startDate <= now <= endDate）
async getActiveEvents(): Promise<CityEvent[]>

// 注入 AI 上下文的文本摘要
async getEventsContext(): Promise<string>
// 输出格式: "当前活动：[结缘市集] 龙华会·免费入场，满100抵30券"
```

### 5.3 Seed 活动数据

| 活动名称 | 类型 | 地点 | 时间窗口 | 折扣 |
|---------|------|------|---------|------|
| 龙华庙会·妙会春灵 | 庙会 | 龙华广场 | 4月10-13日（已结束，保留历史） | 满100抵30券·5万张 |
| 结缘市集（季节性） | 市集 | 龙华会妙街 | 每月第一个周末 | 免费入场 |
| 西岸国际咖啡生活节 | 快闪 | 徐汇滨江 | 五一前后（4月30-5月4日） | 消费补贴满100抵30 |
| SFC露天水岸剧场 | 演出 | 西岸梦中心江边 | 常态化周末 | 早鸟票9折 |
| DiscoTopia主题夜 | 夜市 | 西岸梦中心 | 每周五六日 | 工作日7折 |
| On昂跑社群跑步 | 运动 | On昂跑跑者基地 | 每周六早7点 | 免费 |
| lululemon瑜伽课 | 运动 | 西岸梦中心lululemon | 每周末下午 | 免费 |
| 朵云轩当期展览 | 展览 | 朵云轩美术馆 | 持续更新 | 部分免费 |
| ALDI特惠早市 | 市集 | 奥乐齐ALDI龙华会 | 每天早7-9点 | 特惠品种限量 |

### 5.4 API 端点

```
GET /city/events          ?active=true&neighborhood=龙华会
GET /city/pulse           返回 CityPulse 聚合数据
```

---

## 6. CityPulseService（城市智能层）

聚合所有城市实时数据，注入 AI 上下文。黑客松阶段用规则引擎模拟，接口设计面向未来真实 API。

```typescript
interface CityPulse {
  weather: {
    temp: number;         // 当前温度（°C）
    desc: string;         // '晴' | '多云' | '小雨' | '大风'
    suitable: boolean;    // 是否适合户外活动
    icon: string;         // '☀️' | '🌤️' | '🌧️' | '💨'
  };
  crowdLevel: 'low' | 'medium' | 'high';  // 根据时间+活动日历推算
  activeEvents: CityEvent[];
  hotNeighborhood: string;   // 当前最热街区
  openShopsCount: number;    // 当前营业店铺数
  tip: string;               // 'ALDI早市还有30分钟，快去！'
}
```

**人流量推算规则：**
- 工作日 10:00-18:00 → `low`
- 工作日 18:00-21:00 → `medium`
- 周末 + 节假日 + 活动期间 → `high`
- 周末活动日 + 节假日 → `high` 且提示"人多建议提前到"

---

## 7. AmapService（路线规划）

### 7.1 配置

```env
AMAP_API_KEY=494cc785c8e297a74e347b7dc4191a5a
```

### 7.2 接口封装

```typescript
@Injectable()
export class AmapService {
  // 步行路线规划
  async getWalkingRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<{
    distance: number;    // 米
    duration: number;    // 秒
    summary: string;     // '步行约 18 分钟（1.2 km）'
    steps: string[];     // 分步路线说明
  }>
}
```

**高德步行 API 调用：**
```
GET https://restapi.amap.com/v3/direction/walking
  ?origin={lng},{lat}
  &destination={lng},{lat}
  &key=494cc785c8e297a74e347b7dc4191a5a
```

注意：高德坐标顺序为 `lng,lat`（经度在前）。

### 7.3 API 端点

```
GET /transit/route?fromLat=&fromLng=&toLat=&toLng=
```

---

## 8. 自主工作流引擎（SSE 扩展）

### 8.1 新增 SSE 事件类型

```
city_pulse     → { weather, crowdLevel, activeEvents, hotNeighborhood }
action_query   → { message: '正在查询龙华会当前营业店铺...' }
shop_matched   → { shop, route: { distance, duration, summary }, bookingUrl }
route_planned  → { from, to, distance, duration, summary, steps }
booking_ready  → { shopName, url, discountHint }
complete       → { challengeId }
```

### 8.2 streamTasks 执行流程

```
1. 推送 city_pulse（当前天气/活动/人流）
2. 推送 action_query（"正在匹配龙华街道店铺..."）
3. 获取 shopContext + eventsContext（注入 AI）
4. AI 流式输出 plan chunks（task_chunk 事件）
5. 解析完成后，对每个 main task：
   a. 匹配真实店铺（按分类+距离）
   b. 调用 AmapService 计算步行路线
   c. 推送 shop_matched（含路线信息）
   d. 推送 booking_ready（含大众点评/美团真实链接）
6. 推送 complete
```

### 8.3 增强版 AI Prompt 上下文

```typescript
function buildChallengePrompt(input: ChallengeInput): string {
  return `
用户需求：${input.rawText}
预算：¥${input.budget}，人数：${input.peopleCount}，区域：上海徐汇区龙华街道，时段：${input.timeOfDay}

【城市实时状态】
天气：${input.cityPulse.weather.icon} ${input.cityPulse.weather.desc} ${input.cityPulse.weather.temp}°C
当前人流：${crowdLevelText[input.cityPulse.crowdLevel]}
今日热点区域：${input.cityPulse.hotNeighborhood}

【正在举办的活动】
${input.eventsContext || '暂无特别活动'}

【可用店铺（按距离排序 Top15）】
${input.shopContext}

请生成3套省钱方案（地狱/普通/简单），充分利用城市实时信息，具体说明如何利用活动/折扣/时段省钱。
...（JSON schema 不变）
  `;
}
```

---

## 9. 前端变更

### 9.1 新组件

| 组件 | 位置 | 功能 |
|------|------|------|
| `CityPulseBar.vue` | `components/city/` | 首页顶部城市状态条（天气/人流/活动数量） |
| `EventCard.vue` | `components/city/` | 活动卡片（名称/时间/折扣/预约按钮） |
| `RouteCard.vue` | `components/city/` | 步行路线卡（距离/时间/简要导航） |

### 9.2 现有组件变更

**HomeView.vue：**
- 顶部加入 `CityPulseBar`（实时天气 + 今日活动数 + 热点街区）
- "城市今日活动"轮播区（展示 active events）

**ChallengeView.vue：**
- 处理新 SSE 事件：
  - `city_pulse` → 更新 `CityPulseBar`
  - `action_query` → 显示"AI 执行中..."动画
  - `shop_matched` → 展示 `ShopCard` + `RouteCard`
  - `booking_ready` → 展示"立即预约"按钮（链接至大众点评/美团）

**ShopCard.vue：**
- 新增"今日折扣"标签（显示 `discountTypes` + `discounts` 中最优一条）
- 新增"去预约"按钮（跳转 `externalUrl`）
- 新增路线信息（步行时间/距离）

### 9.3 移除内容

- 城市选择器（固定龙华街道，无需用户选择）
- 多城市排行榜（改为"龙华街道今日省钱榜"）

---

## 10. 完整 API 端点变更

**新增：**
```
GET  /city/pulse              城市实时状态（天气/人流/活动）
GET  /city/events             活动列表（?active=true&neighborhood=）
GET  /transit/route           步行路线（?fromLat=&fromLng=&toLat=&toLng=）
```

**变更：**
```
GET /shops                   新增 ?neighborhood= 过滤参数
GET /leaderboard             城市改为徐汇区龙华街道
GET /stats/city              固定返回龙华街道数据
```

---

## 11. 开发规范（强制执行）

### 11.1 开发流程

每次开发任务必须严格遵循以下流程：

1. **Worktree 隔离**：所有开发在 git worktree 中执行
2. **Skill 指导**：
   - 前端相关：加载 `frontend-design` 和 `ui-ux-pro-max` 两个 skill
   - 代码完成后：调用 `simplify` skill 审查
   - 验收阶段：遵循 `superpowers:verification-before-completion`
3. **PJR（Pre-merge Review）**：lint + build + 逻辑验证 + 合并
4. **合并**：遵循 `git-merge-to-develop` 原则合并回 dev 分支

### 11.2 代码质量原则（三禁一必）

**严禁补丁式修复**：任何修改必须追溯根源，通过重构或调整现有逻辑实现，
不得在错误设计之上叠加补偿层。

**严禁冗余**：修改过程可以复杂，但最终代码必须是最简洁却完整地实现需求的形式，
不留冗余参数、废弃方法或过渡层。

**严禁多入口**：同一业务逻辑只能有一个权威实现。分类映射统一由
`ChallengesService.inferShopCategory` 负责，禁止在其他地方出现硬编码品类字符串。

**必须最简完整**：结果代码要最简洁而完整，不留注释掉的代码、调试用 log、临时变量。

### 11.3 验收标准

**前端验收（Playwright，桌面端 + 移动端）：**
- 完整业务链路逐按钮/逐输入/逐跳转模拟真实用户操作
- 正常场景：完整流程走通（输入需求 → SSE流 → 方案展示 → 预约按钮）
- 边界场景：
  - 无 GPS 权限时降级处理
  - 网络中断时 SSE 断线处理
  - 超预算方案的 UI 提示
  - 店铺无折扣时的展示
- 秉持"找茬"思想：验证内容正确性（文字、折扣数据、路线信息），不只验证布局

**后端验收：**
- 非 AI 接口：正常结果 + 预期异常两类测试
- AI 接口：复杂场景测试（"今晚龙华街道有活动，预算100，想带娃"等边界输入）
  - 决策能力：Prompt + 上下文能否让 AI 生成城市级方案
  - 执行能力：工具链（AmapService/ShopService/EventsService）能否正确执行

---

## 12. 实施顺序（方案 A：数据优先）

| 阶段 | 内容 | 文件范围 |
|------|------|---------|
| Phase 1 | Migration + CityEvent Entity + seed数据全量替换 + inferShopCategory扩展 | `database/`, `scraper/shop-seed.service.ts`, `challenges/challenges.service.ts` |
| Phase 2 | CityEventsModule + CityPulseService + AmapService | 新建 `city/`, `transit/` 模块 |
| Phase 3 | streamTasks SSE扩展（新事件类型 + 城市数据注入） | `challenges/challenges.service.ts`, `challenges/ai/prompts.ts` |
| Phase 4 | 前端：CityPulseBar + EventCard + RouteCard + ShopCard 升级 + ChallengeView SSE处理 | `frontend/src/` |
| Phase 5 | E2E 测试（Playwright 桌面端 + 移动端） | `e2e/` |

---

## 13. 范围外（本次不做）

- 真实天气 API 对接（用规则引擎模拟，接口设计兼容未来扩展）
- 真实人流量 API（同上）
- 用户自定义偏好地图
- 多语言支持
