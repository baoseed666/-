# 抠门大王 — 设计规格文档

**日期：** 2026-04-14  
**黑客松：** 龙华·AI黑客松（青年经济赛道 2.1 青年消费新场景）  
**开发窗口：** 11天（截止 2026-04-24）  
**项目路径：** `D:/projects/抠门大王`

---

## 1. 产品定位

当所有 AI 在推荐"买什么"，抠门大王 AI 专教"怎么不买"和"怎么少买"。

把消费决策变成 PvP 游戏：拼的不是谁花得多，而是谁省得狠。  
每次成功省钱生成"战报"和"段位"，可直接发朋友圈炫耀。

**目标用户：** Z 世代（消费降级心态 + 攀比心理 + 游戏化偏好）  
**平台：** H5 Web App，移动端优先，手机浏览器扫码即用

---

## 2. 架构决策

### 2.1 整体架构（方案 C：单体 + 独立 Scraper Worker）

```
[ Vue3 H5 ]
     ↓ REST / SSE / WebSocket
[ NestJS API — 模块化单体 ]
  ├─ AuthModule       (SMS + 微信 OAuth)
  ├─ ChallengeModule  (AI 挑战引擎)
  ├─ ShopModule       (店铺搜索/匹配)
  ├─ BattleReportModule (战报 + 海报)
  ├─ LBSModule        (拼单匹配 WebSocket)
  └─ LeaderboardModule (排行榜/热力图)
     ↕ Bull 队列 (Redis)
[ Scraper Worker — 独立进程 ]
  Puppeteer + Stealth → 大众点评
  多城市 / 多品类并发，限速 1-3 req/s

[ PostgreSQL ]  [ Redis (Session + Cache + Bull) ]
```

### 2.2 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue3 + Vite + TypeScript + TailwindCSS + Pinia + Vue Router |
| 3D/动效 | Three.js (WebGL) 浏览器内渲染 + GSAP ScrollTrigger + Blender 建模导出 glTF/GLB |
| 后端 | NestJS + TypeORM + PostgreSQL + Redis |
| 爬虫 | Puppeteer + puppeteer-extra-plugin-stealth + Bull |
| AI | DeepSeek-V3（主）→ Claude claude-sonnet-4-6（兜底） |
| 图像生成 | Sharp (战报 PNG 海报) |
| 实时通信 | SSE（AI 流式输出）+ WebSocket (LBS 匹配) |

---

## 3. 模块规格

### 3.1 AuthModule

**功能：**
- 手机号 + 短信验证码登录（Phase 1，生产环境接真实短信服务商）
- 微信网页 OAuth 登录（同步开发，待微信开放平台审批后接入）
- JWT Access Token（15分钟）+ Redis Refresh Token（7天）

**Demo 桩：** 验证码固定 `123456`，SMS 服务商接口有完整实现但 disabled，配置项切换

**数据：**
```sql
users (id UUID, phone VARCHAR UNIQUE, wechat_openid VARCHAR UNIQUE NULL,
       nickname, avatar_url, total_saved DECIMAL, rank_title VARCHAR, created_at)
```

### 3.2 ChallengeModule（AI 核心）

**输入：** 自然语言文本（"今晚烧烤，预算30，2人"）  
**城市来源：** 优先取用户 Profile 中已设置的城市；未设置时，从前端 Geolocation API 反查城区，或提示用户选择  
**处理：** 原始文本直接进入 AI Prompt（AI 自行提取预算/人数/活动/时间意图）→ 结合用户城市匹配 Top15 店铺 → 注入上下文 → 生成结构化任务

**AI Provider 策略模式：**
```typescript
interface AIProvider {
  streamChallenge(input: ChallengeInput): AsyncIterable<ChallengeChunk>
  generateReport(data: ReportData): Promise<ReportText>
}
// DeepSeekProvider 失败/超时 → 自动 fallback 到 ClaudeProvider
// 两者实现相同接口，切换零业务代码改动
```

**Prompt 三层架构：**
1. **System Prompt**：角色定义（极限省钱AI，安全护栏内置，可灵活替换活动类型）
2. **Context Injection**：用户输入 + 城市实时店铺数据 + 时间段 + 天气 + 平台热词
3. **Output Schema**：JSON 强约束，直接入库无需二次解析

**Output JSON Schema：**
```json
{
  "plans": [{
    "id": "string",
    "title": "string",
    "difficulty": "地狱|普通|简单",
    "hp": "number (预算值)",
    "mp": "number (可用优惠技能数)",
    "estimated_save": "number",
    "tasks": [{
      "type": "main|side|hidden",
      "description": "string",
      "tips": ["string"],
      "shop_hint": "string|null"
    }]
  }]
}
```

**流式输出（SSE）：**
```
POST /challenges       → 立即返回 challenge_id
GET  /challenges/:id/stream → SSE 长连接
  event: plan_start    → 前端渲染加载动画
  event: task_chunk    → 逐条任务流式渲染
  event: shop_matched  → 匹配店铺，卡片弹出
  event: complete      → 三套方案全部完成
```

**安全护栏（内置于 System Prompt）：**
- 绝对禁止：翻垃圾桶、拾荒、凌晨独行、乞讨、违法行为
- 需警示：22:00 后推荐必须附加人身安全提示
- 允许灵活替换用户活动，但 tasks[0] 必须说明原因

**数据：**
```sql
challenges (id, user_id FK, input_text, budget, people_count, city, status ENUM, saved_amount, created_at)
challenge_tasks (id, challenge_id FK, type ENUM, description, tips TEXT[], shop_id FK NULL, status ENUM, sort_order)
```

### 3.3 ShopModule

**功能：** 店铺搜索（城市/品类/距离排序）、优惠信息聚合、AI 上下文注入

**数据：**
```sql
shops (id, name, category, city, district, lat, lng,
       avg_price DECIMAL, rating DECIMAL, discounts JSONB,
       open_hours JSONB, scraped_at TIMESTAMP)
```

索引：`(city, category)`、`(lat, lng)` 地理查询

**店铺分类体系（`category` 字段枚举值）：**

| 类型 | 分类值 |
|------|--------|
| 食品·饮品 | 咖啡奶茶、甜品蛋糕 |
| 食品·快餐 | 小吃简餐 |
| 食品·锅类 | 火锅 |
| 食品·烤类 | 烧烤烤肉、鱼鲜海鲜 |
| 食品·中式地域 | 川湘菜、粤菜、江浙菜、云贵菜、西北菜、风味地方菜 |
| 食品·异国料理 | 西餐、日料、韩料、东南亚菜 |
| 食品·其他 | 自助餐 |
| 娱乐 | KTV、电影院、桌游、密室逃脱、购物、户外公园 |

**分类映射规则：**  
`ChallengesService.inferShopCategory(text)` 是意图→分类的唯一入口，覆盖上述所有值，
默认兜底返回 `小吃简餐`。新增分类时，须同步更新此方法和爬虫任务配置，禁止在其他
地方出现硬编码的品类字符串映射。

**地理定位集成：**  
前端 `ChallengeView` 在 stream 开始前通过 `navigator.geolocation` 获取精确坐标，
坐标随 SSE 请求传至后端。`getContextShops` 和 `getRecommendationsForTask` 均
优先按距离排序，坐标缺失时降级为按评分排序。

### 3.4 ScraperWorker（独立进程）

**目标：** 大众点评多城市/多品类真实公开数据  
**策略：** Puppeteer + stealth 插件，Bull 队列，限速 1-3 req/s，失败自动重试  
**覆盖：** 一二线城市主要区域，按 3.3 节分类体系的所有品类  
**触发：** 管理端 `POST /admin/scraper/start`；初始全量爬取后按天增量更新

### 3.5 BattleReportModule

**功能：** AI 生成游戏风格战报文案 + Sharp 生成 PNG 分享海报

**称号体系（6段位）：**
消费韭菜 → 薅羊毛学徒 → 省钱老手 → 抠门高手 → 抠门大王 → 传说级穷鬼

**报告字段：**
```sql
battle_reports (id, challenge_id FK, headline TEXT, rank_title VARCHAR,
                percentile INT, image_url TEXT, created_at)
```

### 3.6 LBSModule

**功能：** 100m 内相似需求用户实时匹配，WebSocket 推送  
**数据：**
```sql
lbs_requests (id, user_id FK, shop_id FK NULL, lat, lng,
              tags TEXT[], status ENUM, matched_user UUID NULL, expires_at)
```

### 3.7 LeaderboardModule

**功能：** 城市省钱榜、今日热力图数据、城市实时统计（"今晚上海已有 1200 人省下 2.4 万"）

---

## 4. 完整 API 端点

```
# Auth
POST /auth/sms/send              发送验证码
POST /auth/sms/verify            验证码登录 → JWT
POST /auth/wechat/callback       微信 OAuth 回调
POST /auth/refresh               刷新 Token

# Challenge
POST /challenges                 创建挑战（返回 challenge_id）
GET  /challenges/:id             挑战详情 + 任务列表
GET  /challenges/:id/stream      SSE 流式任务生成
PATCH /challenges/:id/tasks/:tid 更新任务状态
POST /challenges/:id/complete    完成挑战，触发战报生成

# Shop
GET  /shops                      ?city=&category=&lat=&lng=&limit=
GET  /shops/:id                  店铺详情 + 优惠

# Battle Report
GET  /reports/:id                战报详情
GET  /reports/:id/image          PNG 海报（直接图片流）

# LBS
POST /lbs/request                上报位置 + 需求标签，入匹配池
WS   /lbs/match                  WebSocket：实时匹配推送

# Leaderboard
GET  /leaderboard                ?city=&limit=
GET  /heatmap                    ?city=
GET  /stats/city                 ?city=

# Admin（内部）
POST /admin/scraper/start        触发爬虫任务
GET  /admin/scraper/status       队列状态
```

---

## 5. 前端架构

### 5.1 视觉风格：霓虹街机风

- **主色：** 黑底 `#0a0a0a` + 金黄高亮 `#ffdd00` + 荧光绿 `#00ff88`
- **质感：** 街机得分板、CRT 扫描线微效果、数字跳动动画
- **3D/动效：** Three.js WebGL（参考 igloo.inc）+ GSAP + Blender 导出模型
- **交互参考：** 桌面"截图给claude"文件夹内视频（霓虹隧道穿越、3D球体、滚动驱动）

### 5.2 页面结构

| 路由 | 页面 | 核心组件 |
|------|------|---------|
| `/` | 首页（输入挑战）| 3D场景 + 自然语言输入框 |
| `/challenge/:id` | 任务面板 | 游戏化任务卡（主线/支线/隐藏）+ HP/MP |
| `/challenge/:id/stream` | AI 生成中 | SSE 流式任务逐条出现动画 |
| `/report/:id` | 战报 | 称号 + 数据 + 分享海报预览 |
| `/leaderboard` | 排行榜 | 城市榜 + 热力图 |
| `/profile` | 个人中心 | 历史挑战 + 段位 + 总省钱额 |

### 5.3 状态管理（Pinia Stores）

- `useAuthStore` — 用户信息、JWT、登录态
- `useChallengeStore` — 当前挑战、任务列表、SSE 连接
- `useLBSStore` — 位置、WebSocket、匹配状态

---

## 6. 开发排期（11天）

| 天数 | 核心任务 |
|------|---------|
| Day 1-2 | 脚手架 / Schema / Auth（SMS + 微信 OAuth 同步完成）/ 爬虫框架 + Bull |
| Day 3-4 | 爬虫跑通大众点评多城市 / ShopModule API |
| Day 5-6 | ChallengeModule AI 核心 / Prompt 工程 / SSE 流式 |
| Day 7-8 | 前端主流程 + 游戏化 UI 组件 |
| Day 9   | BattleReport / 海报 / 排行榜 / 称号 |
| Day 10  | LBS 拼单 / 热力图 / 联调 |
| Day 11  | Playwright E2E 测试 / lint + build / Demo prep |

---

## 7. Demo 阶段桩 vs 生产目标

| 功能 | Demo 阶段 | 生产目标 |
|------|---------|---------|
| 短信验证码 | 固定 `123456` | 真实短信服务商（阿里云/腾讯云） |
| 支付 | 按钮存在，跳过实际支付 | 微信支付 / 支付宝 |
| 微信登录 | 代码完成，待审批 | 审批通过后直接上线 |
| 店铺数据 | 真实爬取 | 持续增量更新 |

---

## 8. 验收标准

### 后端
- **非 AI 接口：** Jest 正常结果 + 预期异常测试（边界场景：无效参数、未授权访问、数据不存在）
- **AI 接口：** 复杂场景测试带入真实龙华街道背景（AI 决策能力 + 工具执行能力）
  - 决策能力：Prompt + 上下文能否驱动 AI 生成城市级方案
  - 执行能力：AmapService/CityPulseService/ShopsService 能否正确联动执行

### 前端
- **Playwright E2E：** 桌面端（1280×800）+ 移动端（390×844 iPhone）双设备
- **覆盖范围：** 完整业务链路（逐按钮/逐输入/逐跳转，模拟真实用户全程操作）
- **正常场景：** 输入需求 → SSE流方案 → 预约按钮点击 完整走通
- **边界场景：** 无 GPS 权限降级、SSE 断线重连、超预算提示、店铺无折扣展示
- **找茬思维：** 验证内容正确性（文字、折扣数字、路线数据），不只验证布局是否渲染

### 代码质量原则（三禁一必）

**严禁补丁式修复**：任何修改必须追溯根源，通过重构或调整现有逻辑来实现，
不得在错误设计之上叠加补偿层。

**严禁冗余**：修改过程可以复杂，但最终代码必须是最简洁却完整地实现需求的形式，
不留冗余参数、废弃方法或过渡层。

**严禁多入口**：同一业务逻辑只能有一个权威实现。分类映射统一由
`ChallengesService.inferShopCategory` 负责，DB 品类字符串统一参照 3.3 节分类表，
两者保持一致；新增品类须同时更新两处。

**必须最简完整**：结果代码最简洁而完整，不留注释掉的代码、调试 log、临时变量。

---

## 9. 开发流程规范（强制执行）

每次开发任务必须严格遵循：

1. **Worktree 隔离**：所有开发在 `git worktree` 中执行（简单任务除外）
2. **Skill 指导**：
   - 前端相关变更：加载 `frontend-design` + `ui-ux-pro-max` skill
   - 代码完成后：调用 `simplify` skill 审查冗余
   - 关键模块完成后：调用 `superpowers:code-reviewer` 独立审查
3. **PJR（Pre-merge）**：lint + build + 逻辑验证，前后端均需执行
4. **合并**：遵循 `git-merge-to-develop` 原则合并回 dev 分支
5. **E2E 验收**：Playwright 桌面端 + 移动端，带入复杂场景测试

---

## 10. 协作规范

- **回复语言：** 所有 Claude 回复必须使用中文

---

## 11. AI 交接提示词（2026-04-20）
由于你的上下文已经接近上限，现在请你写一个给后面的ai的提示词，告诉他你的目标是什么，你已经完成了什么，你有什么没有完成，他需要参考那些文档，需要遵循哪些开发原则，同时，你写的文档不要太复杂，尽可能的简洁，关于一些具体信息，可以引导后续的ai去看相关的文档，以引导为主，给我的形式是文字就可以，不需要给我文档
在上下文接近95%时直接执行上述命令


---

## 10. 范围外（不做）

- 真实返现系统
- 微信小程序原生开发（H5 即可）
- 内容审核后台
- 多语言 i18n
