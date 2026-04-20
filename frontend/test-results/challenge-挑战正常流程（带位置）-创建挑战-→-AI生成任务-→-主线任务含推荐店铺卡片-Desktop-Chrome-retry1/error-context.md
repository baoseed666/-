# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: challenge.spec.ts >> 挑战正常流程（带位置） >> 创建挑战 → AI生成任务 → 主线任务含推荐店铺卡片
- Location: e2e\challenge.spec.ts:70:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="shop-recommendations"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="shop-recommendations"]').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "‹" [ref=e5] [cursor=pointer]:
      - /url: /
    - heading "省钱挑战" [level=2] [ref=e6]
    - generic [ref=e7]: 📍 已定位
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: 🌤️
        - generic [ref=e12]:
          - generic [ref=e13]: 22°C
          - generic [ref=e14]: 多云
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: 人较多
          - generic [ref=e18]: 人流
        - generic [ref=e19]:
          - generic [ref=e20]: 朵云轩
          - generic [ref=e21]: 热点
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]: 朵云轩当期展览
        - generic [ref=e25]: 免费
      - generic [ref=e26]:
        - generic [ref=e27]: ALDI特惠早市
        - generic [ref=e28]: ¥20起
    - paragraph [ref=e29]: ›› 今日有 1 个免费活动，别错过！
  - generic [ref=e31]:
    - generic [ref=e32]: HP ¥90 / ¥90
    - generic [ref=e33]: MP × 3
  - generic [ref=e36]:
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]: 🏆 隐藏成就
        - button "✓ 完成" [ref=e41] [cursor=pointer]
      - paragraph [ref=e42]: 隐藏成就：三人拼单ALDI新用户首单优惠，叠加特惠早市折扣，实现人均烧烤成本低于20元。
    - generic [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]: ⚡ 支线任务
        - button "✓ 完成" [ref=e47] [cursor=pointer]
      - paragraph [ref=e48]: 支线任务：下午先参观朵云轩免费展览，消磨时间并享受文化体验。
      - list [ref=e49]:
        - listitem [ref=e50]:
          - generic [ref=e51]: ›
          - text: 利用朵云轩部分免费展览，学生可享5折优惠
        - listitem [ref=e52]:
          - generic [ref=e53]: ›
          - text: 错峰参观避免人流高峰
    - generic [ref=e55]:
      - generic [ref=e56]:
        - generic [ref=e57]: 🎯 主线任务
        - button "✓ 完成" [ref=e58] [cursor=pointer]
      - paragraph [ref=e59]: 主线任务：利用ALDI特惠早市购买烧烤食材，自带工具在安全户外区域DIY烧烤。原因：替换传统烧烤店消费，通过错峰购买特惠食材和自带工具大幅省钱。
      - list [ref=e60]:
        - listitem [ref=e61]:
          - generic [ref=e62]: ›
          - text: 提前到ALDI早市抢购限量特惠品种（如肉类、蔬菜）
        - listitem [ref=e63]:
          - generic [ref=e64]: ›
          - text: 自带烧烤架、炭火和调料（可拼单分摊成本）
        - listitem [ref=e65]:
          - generic [ref=e66]: ›
          - text: 选择人少的公园或河边安全区域烧烤，注意防火
      - generic [ref=e67]: 💡 位置未知或该城市暂无店铺数据，请手动搜索
  - button "🏆 完成挑战，生成战报" [ref=e69] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | // 上海徐汇区龙华街道坐标
  4   | const LONGHUA_GEO = { latitude: 31.1890, longitude: 121.4614 };
  5   | 
  6   | async function login(page: Page, phone = '13999990001') {
  7   |   await page.goto('/login');
  8   |   await page.fill('input[type="tel"]', phone);
  9   |   await page.click('button:has-text("获取验证码")');
  10  |   await page.fill('input[maxlength="6"]', '123456');
  11  |   await page.click('button:has-text("开始挑战")');
  12  |   await page.waitForURL('/');
  13  | }
  14  | 
  15  | async function createChallenge(page: Page, text: string) {
  16  |   await page.fill('textarea', text);
  17  |   await page.click('button:has-text("发起省钱挑战")');
  18  |   await page.waitForURL(/\/challenge\/.+/);
  19  | }
  20  | 
  21  | // ══════════════════════════════════════════════════════════════
  22  | // 1. 首页 — 城市固定为上海龙华街道
  23  | // ══════════════════════════════════════════════════════════════
  24  | test.describe('首页', () => {
  25  |   test.beforeEach(async ({ page }) => { await login(page); });
  26  | 
  27  |   test('首页显示"上海·徐汇区龙华街道"固定标签，无城市选择框', async ({ page }) => {
  28  |     await expect(page.locator('text=上海')).toBeVisible();
  29  |     await expect(page.locator('text=龙华街道')).toBeVisible();
  30  |     await expect(page.locator('select')).toHaveCount(0);
  31  |   });
  32  | 
  33  |   test('空输入 → 发起挑战按钮禁用', async ({ page }) => {
  34  |     await expect(page.locator('button:has-text("发起省钱挑战")')).toBeDisabled();
  35  |   });
  36  | });
  37  | 
  38  | // ══════════════════════════════════════════════════════════════
  39  | // 2. 正常流程：带位置的完整链路
  40  | // ══════════════════════════════════════════════════════════════
  41  | test.describe('挑战正常流程（带位置）', () => {
  42  |   test.use({
  43  |     geolocation: LONGHUA_GEO,
  44  |     permissions: ['geolocation'],
  45  |   });
  46  | 
  47  |   test.beforeEach(async ({ page }) => { await login(page); });
  48  | 
  49  |   test('进入挑战页 → CityPulseBar 在 city_pulse 事件后显示', async ({ page }) => {
  50  |     await createChallenge(page, '今晚烧烤，预算90元，3人');
  51  | 
  52  |     // city_pulse 最先到达，bar 应在 plan_start 之前出现
  53  |     await expect(page.locator('[data-testid="city-pulse-bar"]')).toBeVisible({ timeout: 15000 });
  54  |   }, 30000);
  55  | 
  56  |   test('CityPulseBar 显示天气+人流+热点区域', async ({ page }) => {
  57  |     await createChallenge(page, '今晚咖啡，预算50元，1人');
  58  | 
  59  |     const bar = page.locator('[data-testid="city-pulse-bar"]');
  60  |     await expect(bar).toBeVisible({ timeout: 15000 });
  61  | 
  62  |     // 温度数字存在（e.g. "22°C"）
  63  |     await expect(bar.locator('text=/\\d+°C/')).toBeVisible();
  64  |     // 人流文字
  65  |     const crowdTexts = ['人流稀少', '人流适中', '人较多'];
  66  |     const crowdEl = bar.getByText(new RegExp(crowdTexts.join('|')));
  67  |     await expect(crowdEl).toBeVisible();
  68  |   }, 30000);
  69  | 
  70  |   test('创建挑战 → AI生成任务 → 主线任务含推荐店铺卡片', async ({ page }) => {
  71  |     await createChallenge(page, '今晚龙华烧烤，预算90元，3人');
  72  | 
  73  |     await expect(page.locator('[data-testid="location-ok"]')).toBeVisible({ timeout: 8000 });
  74  |     await page.waitForSelector('.task-badge-main', { timeout: 90000 });
  75  |     await expect(page.locator('.task-badge-main')).toBeVisible();
  76  | 
  77  |     const shopRecs = page.locator('[data-testid="shop-recommendations"]').first();
> 78  |     await expect(shopRecs).toBeVisible({ timeout: 5000 });
      |                            ^ Error: expect(locator).toBeVisible() failed
  79  | 
  80  |     const shopCards = page.locator('[data-testid="shop-card"]');
  81  |     await expect(shopCards.first()).toBeVisible();
  82  |     expect(await shopCards.count()).toBeGreaterThan(0);
  83  |   }, 120000);
  84  | 
  85  |   test('ShopCard包含店铺名称、地址+距离、优惠标签', async ({ page }) => {
  86  |     await createChallenge(page, '3人火锅，预算150元');
  87  |     await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });
  88  | 
  89  |     const card = page.locator('[data-testid="shop-card"]').first();
  90  | 
  91  |     const name = await card.locator('[data-testid="shop-name"]').textContent();
  92  |     expect(name?.trim().length).toBeGreaterThan(0);
  93  | 
  94  |     const addr = card.locator('[data-testid="shop-address"]');
  95  |     await expect(addr).toBeVisible();
  96  |     const addrText = await addr.textContent();
  97  |     expect(addrText?.length).toBeGreaterThan(0);
  98  |     expect(addrText).not.toContain('位置未知');
  99  | 
  100 |     const discountTypes = card.locator('[data-testid="shop-discount-types"] span');
  101 |     expect(await discountTypes.count()).toBeGreaterThan(0);
  102 |   }, 120000);
  103 | 
  104 |   test('ShopCard外链href指向大众点评或美团', async ({ page }) => {
  105 |     await createChallenge(page, '2人吃饭，预算60元');
  106 |     await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });
  107 | 
  108 |     const card = page.locator('[data-testid="shop-card"]').first();
  109 |     const href = await card.getAttribute('href');
  110 |     expect(href).toBeTruthy();
  111 | 
  112 |     const isValidPlatform =
  113 |       href!.includes('dianping.com') ||
  114 |       href!.includes('meituan.com') ||
  115 |       href === '#';
  116 |     expect(isValidPlatform).toBe(true);
  117 | 
  118 |     if (href !== '#') {
  119 |       expect(await card.getAttribute('target')).toBe('_blank');
  120 |       expect(await card.getAttribute('rel')).toContain('noopener');
  121 |     }
  122 |   }, 120000);
  123 | 
  124 |   test('完整链路：创建→城市脉冲→AI生成→完成任务→生成战报', async ({ page }) => {
  125 |     await createChallenge(page, '今晚烧烤，预算30，2人');
  126 | 
  127 |     // 城市脉冲先出现
  128 |     await expect(page.locator('[data-testid="city-pulse-bar"]')).toBeVisible({ timeout: 15000 });
  129 | 
  130 |     await page.waitForSelector('.task-badge-main', { timeout: 90000 });
  131 | 
  132 |     // 三类任务都有
  133 |     await expect(page.locator('.task-badge-main')).toBeVisible();
  134 |     await expect(page.locator('.task-badge-side')).toBeVisible();
  135 |     await expect(page.locator('.task-badge-hidden')).toBeVisible();
  136 | 
  137 |     // 安全护栏
  138 |     const bodyText = await page.locator('body').textContent();
  139 |     expect(bodyText).not.toContain('垃圾桶');
  140 |     expect(bodyText).not.toContain('乞讨');
  141 |     expect(bodyText).not.toContain('拾荒');
  142 | 
  143 |     // 完成任务
  144 |     await page.click('button:has-text("✓ 完成")');
  145 |     await expect(page.locator('text=✓ 已完成').first()).toBeVisible();
  146 | 
  147 |     // 生成战报
  148 |     await page.click('button:has-text("完成挑战，生成战报")');
  149 |     await expect(page.locator('text=确认完成挑战')).toBeVisible();
  150 |     await page.fill('input[type="number"]', '25');
  151 |     await page.click('button:has-text("确认")');
  152 |     await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
  153 |     await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
  154 |   }, 180000);
  155 | });
  156 | 
  157 | // ══════════════════════════════════════════════════════════════
  158 | // 3. 边界情况：拒绝位置授权
  159 | // ══════════════════════════════════════════════════════════════
  160 | test.describe('边界：拒绝位置授权', () => {
  161 |   test.use({ permissions: [] });
  162 | 
  163 |   test.beforeEach(async ({ page }) => { await login(page); });
  164 | 
  165 |   test('拒绝定位 → 显示"位置未知"badge且主线任务有降级提示', async ({ page }) => {
  166 |     await page.fill('textarea', '烧烤，预算60元，2人');
  167 |     await page.click('button:has-text("发起省钱挑战")');
  168 |     await page.waitForURL(/\/challenge\/.+/);
  169 | 
  170 |     await page.waitForSelector('.task-badge-main', { timeout: 90000 });
  171 | 
  172 |     const noShopsHints = await page.locator('[data-testid="no-shops-hint"]').count();
  173 |     const locationDenied = await page.locator('[data-testid="location-denied"]').count();
  174 |     const shopCards = await page.locator('[data-testid="shop-card"]').count();
  175 | 
  176 |     const hasDegradation = noShopsHints > 0 || locationDenied > 0 || shopCards === 0;
  177 |     expect(hasDegradation).toBe(true);
  178 | 
```