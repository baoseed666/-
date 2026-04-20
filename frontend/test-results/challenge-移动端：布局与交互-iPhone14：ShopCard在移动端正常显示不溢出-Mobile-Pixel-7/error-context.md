# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: challenge.spec.ts >> 移动端：布局与交互 >> iPhone14：ShopCard在移动端正常显示不溢出
- Location: e2e\challenge.spec.ts:300:3

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 90000ms exceeded.
Call log:
  - waiting for locator('[data-testid="shop-card"]') to be visible

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
    - generic [ref=e32]: HP ¥100 / ¥100
    - generic [ref=e33]: MP × 3
  - generic [ref=e36]:
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]: 🏆 隐藏成就
        - button "✓ 完成" [ref=e41] [cursor=pointer]
      - paragraph [ref=e42]: 完成自煮火锅+免费展览组合，总花费控制在30元以内（食材约25元，展览免费）。
    - generic [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]: ⚡ 支线任务
        - button "✓ 完成" [ref=e47] [cursor=pointer]
      - paragraph [ref=e48]: 参观朵云轩当期展览，享受免费或学生折扣（如有学生证），作为餐前活动。
      - list [ref=e49]:
        - listitem [ref=e50]:
          - generic [ref=e51]: ›
          - text: 利用展览免费部分省钱，或出示学生证享受5折
    - generic [ref=e53]:
      - generic [ref=e54]:
        - generic [ref=e55]: 🎯 主线任务
        - button "✓ 完成" [ref=e56] [cursor=pointer]
      - paragraph [ref=e57]: 利用ALDI特惠早市购买火锅食材，替换用户提议的火锅店用餐，原因：ALDI早市特惠品种限量，能大幅降低食材成本，且下午时段人流较少，适合错峰采购。
      - list [ref=e58]:
        - listitem [ref=e59]:
          - generic [ref=e60]: ›
          - text: 提前到ALDI早市抢购特惠火锅食材（如蔬菜、肉类），注意限量供应
        - listitem [ref=e61]:
          - generic [ref=e62]: ›
          - text: 自带锅具和调料，避免额外购买
        - listitem [ref=e63]:
          - generic [ref=e64]: ›
          - text: 拼单购买大包装食材分摊成本
      - generic [ref=e65]: 💡 位置未知或该城市暂无店铺数据，请手动搜索
  - button "🏆 完成挑战，生成战报" [ref=e67] [cursor=pointer]
```

# Test source

```ts
  202 | 
  203 |   test('预算1元（极端低）→ AI不崩溃，生成任务', async ({ page }) => {
  204 |     await page.fill('textarea', '预算1元，随便吃');
  205 |     await page.click('button:has-text("发起省钱挑战")');
  206 |     await page.waitForURL(/\/challenge\/.+/);
  207 |     await page.waitForTimeout(5000);
  208 |     await expect(page.locator('text=省钱挑战')).toBeVisible();
  209 |   }, 30000);
  210 | 
  211 |   test('预算超大（999999元）→ AI正常处理', async ({ page }) => {
  212 |     await page.fill('textarea', '预算999999元，请给我最奢华的省钱方案');
  213 |     await page.click('button:has-text("发起省钱挑战")');
  214 |     await page.waitForURL(/\/challenge\/.+/);
  215 |     await page.waitForTimeout(5000);
  216 |     await expect(page.locator('text=省钱挑战')).toBeVisible();
  217 |   }, 30000);
  218 | 
  219 |   test('ShopCard图片加载失败 → emoji占位符而非破图', async ({ page }) => {
  220 |     await page.route('**/*.jpg', (route) => route.abort());
  221 |     await page.route('**/*.png', (route) => route.abort());
  222 |     await page.route('**/meituan.net/**', (route) => route.abort());
  223 |     await page.route('**/dpfile.com/**', (route) => route.abort());
  224 | 
  225 |     await createChallenge(page, '火锅，预算100元，3人');
  226 |     await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });
  227 | 
  228 |     const brokenImgs = await page.locator('[data-testid="shop-image"]:visible').count();
  229 |     expect(brokenImgs).toBe(0);
  230 |   }, 120000);
  231 | });
  232 | 
  233 | // ══════════════════════════════════════════════════════════════
  234 | // 5. AI 决策能力
  235 | // ══════════════════════════════════════════════════════════════
  236 | test.describe('AI决策能力测试', () => {
  237 |   test.use({ geolocation: LONGHUA_GEO, permissions: ['geolocation'] });
  238 | 
  239 |   test.beforeEach(async ({ page }) => { await login(page); });
  240 | 
  241 |   test('3人火锅150元 → 任务含叠加优惠关键词', async ({ page }) => {
  242 |     await createChallenge(page, '3人聚餐，预算150元，想吃火锅，徐汇龙华，要求评分4.5以上');
  243 |     await page.waitForSelector('.task-badge-main', { timeout: 90000 });
  244 | 
  245 |     const taskTexts = await page.locator('.card-arcade p').allTextContents();
  246 |     const savingKeywords = ['优惠', '团购', '折扣', '省', '满减', '券', '套餐'];
  247 |     const hasSavingContent = taskTexts.some((t) => savingKeywords.some((k) => t.includes(k)));
  248 |     expect(hasSavingContent).toBe(true);
  249 |   }, 90000);
  250 | 
  251 |   test('店铺推荐优惠详情文字非空', async ({ page }) => {
  252 |     await createChallenge(page, '烧烤，预算80元，2人');
  253 |     await page.waitForSelector('[data-testid="shop-discount-details"]', { timeout: 90000 });
  254 | 
  255 |     const details = page.locator('[data-testid="shop-discount-details"] p').first();
  256 |     const text = await details.textContent();
  257 |     expect(text?.trim().length).toBeGreaterThan(0);
  258 |     const hasDiscountInfo = /[折元减优惠套餐]/.test(text ?? '');
  259 |     expect(hasDiscountInfo).toBe(true);
  260 |   }, 90000);
  261 | 
  262 |   test('推荐店铺按距离从近到远排列', async ({ page }) => {
  263 |     await createChallenge(page, '烧烤，预算100元，3人');
  264 |     await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });
  265 | 
  266 |     const addrLocators = page.locator('[data-testid="shop-address"]');
  267 |     const count = await addrLocators.count();
  268 | 
  269 |     if (count >= 2) {
  270 |       const distances: number[] = [];
  271 |       for (let i = 0; i < Math.min(count, 3); i++) {
  272 |         const text = await addrLocators.nth(i).textContent() ?? '';
  273 |         const mMatch = text.match(/(\d+(?:\.\d+)?)(km|m)/);
  274 |         if (mMatch) {
  275 |           const val = parseFloat(mMatch[1]);
  276 |           distances.push(mMatch[2] === 'km' ? val * 1000 : val);
  277 |         }
  278 |       }
  279 |       if (distances.length >= 2) {
  280 |         for (let i = 0; i < distances.length - 1; i++) {
  281 |           expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
  282 |         }
  283 |       }
  284 |     }
  285 |   }, 90000);
  286 | });
  287 | 
  288 | // ══════════════════════════════════════════════════════════════
  289 | // 6. 移动端适配（390×844 iPhone 14）
  290 | // ══════════════════════════════════════════════════════════════
  291 | test.describe('移动端：布局与交互', () => {
  292 |   test.use({
  293 |     geolocation: LONGHUA_GEO,
  294 |     permissions: ['geolocation'],
  295 |     viewport: { width: 390, height: 844 },
  296 |   });
  297 | 
  298 |   test.beforeEach(async ({ page }) => { await login(page); });
  299 | 
  300 |   test('iPhone14：ShopCard在移动端正常显示不溢出', async ({ page }) => {
  301 |     await createChallenge(page, '火锅，预算100元，2人');
> 302 |     await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });
      |                ^ Error: page.waitForSelector: Test timeout of 90000ms exceeded.
  303 | 
  304 |     const card = page.locator('[data-testid="shop-card"]').first();
  305 |     const box = await card.boundingBox();
  306 |     expect(box).toBeTruthy();
  307 | 
  308 |     const viewport = page.viewportSize();
  309 |     if (box && viewport) {
  310 |       expect(box.width).toBeLessThanOrEqual(viewport.width);
  311 |       expect(box.x).toBeGreaterThanOrEqual(0);
  312 |     }
  313 |   }, 90000);
  314 | 
  315 |   test('iPhone14：CityPulseBar不溢出屏幕', async ({ page }) => {
  316 |     await createChallenge(page, '咖啡，预算50元');
  317 |     const bar = page.locator('[data-testid="city-pulse-bar"]');
  318 |     await expect(bar).toBeVisible({ timeout: 15000 });
  319 | 
  320 |     const box = await bar.boundingBox();
  321 |     const viewport = page.viewportSize();
  322 |     if (box && viewport) {
  323 |       expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  324 |     }
  325 |   }, 30000);
  326 | 
  327 |   test('移动端：完成任务按钮可点击', async ({ page }) => {
  328 |     await createChallenge(page, '今晚烧烤，预算30，2人');
  329 |     await page.waitForSelector('.task-badge-main', { timeout: 90000 });
  330 | 
  331 |     const completeBtn = page.locator('button:has-text("✓ 完成")').first();
  332 |     await expect(completeBtn).toBeVisible();
  333 |     await completeBtn.click();
  334 |     await expect(page.locator('text=✓ 已完成').first()).toBeVisible();
  335 |   }, 90000);
  336 | 
  337 |   test('移动端：EventCard在CityPulseBar内横向滚动不溢出', async ({ page }) => {
  338 |     await createChallenge(page, '今晚活动，预算0元');
  339 |     const bar = page.locator('[data-testid="city-pulse-bar"]');
  340 |     await expect(bar).toBeVisible({ timeout: 15000 });
  341 | 
  342 |     // 页面无横向滚动条
  343 |     const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  344 |     const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  345 |     expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  346 |   }, 30000);
  347 | });
  348 | 
```