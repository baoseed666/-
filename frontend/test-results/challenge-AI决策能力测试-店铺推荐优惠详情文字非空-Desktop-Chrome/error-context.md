# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: challenge.spec.ts >> AI决策能力测试 >> 店铺推荐优惠详情文字非空
- Location: e2e\challenge.spec.ts:251:3

# Error details

```
Test timeout of 90000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 90000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "抠门大王" [level=1] [ref=e5]
  - paragraph [ref=e6]: MISER KING · 省钱是一种态度
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]: 手机号
      - textbox "13800138000" [ref=e10]: "13999990001"
    - generic [ref=e11]:
      - textbox "验证码" [ref=e12]: "123456"
      - button "获取验证码" [ref=e13] [cursor=pointer]
    - button "▶ 开始挑战" [ref=e14] [cursor=pointer]
    - paragraph [ref=e15]: 验证码错误，请重试
  - paragraph [ref=e16]: Demo模式：验证码固定 123456
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
> 12  |   await page.waitForURL('/');
      |              ^ Error: page.waitForURL: Test timeout of 90000ms exceeded.
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
  78  |     await expect(shopRecs).toBeVisible({ timeout: 5000 });
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
```