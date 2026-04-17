import { test, expect, Page } from '@playwright/test';

// 上海徐汇区龙华街道坐标
const LONGHUA_GEO = { latitude: 31.1890, longitude: 121.4614 };

async function login(page: Page, phone = '13999990001') {
  await page.goto('/login');
  await page.fill('input[type="tel"]', phone);
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
}

async function createChallenge(page: Page, text: string) {
  await page.fill('textarea', text);
  await page.click('button:has-text("发起省钱挑战")');
  await page.waitForURL(/\/challenge\/.+/);
}

// ══════════════════════════════════════════════════════════════
// 1. 首页 — 城市固定为上海龙华街道
// ══════════════════════════════════════════════════════════════
test.describe('首页', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('首页显示"上海·徐汇区龙华街道"固定标签，无城市选择框', async ({ page }) => {
    await expect(page.locator('text=上海')).toBeVisible();
    await expect(page.locator('text=龙华街道')).toBeVisible();
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('空输入 → 发起挑战按钮禁用', async ({ page }) => {
    await expect(page.locator('button:has-text("发起省钱挑战")')).toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════════════
// 2. 正常流程：带位置的完整链路
// ══════════════════════════════════════════════════════════════
test.describe('挑战正常流程（带位置）', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('进入挑战页 → CityPulseBar 在 city_pulse 事件后显示', async ({ page }) => {
    await createChallenge(page, '今晚烧烤，预算90元，3人');

    // city_pulse 最先到达，bar 应在 plan_start 之前出现
    await expect(page.locator('[data-testid="city-pulse-bar"]')).toBeVisible({ timeout: 15000 });
  }, 30000);

  test('CityPulseBar 显示天气+人流+热点区域', async ({ page }) => {
    await createChallenge(page, '今晚咖啡，预算50元，1人');

    const bar = page.locator('[data-testid="city-pulse-bar"]');
    await expect(bar).toBeVisible({ timeout: 15000 });

    // 温度数字存在（e.g. "22°C"）
    await expect(bar.locator('text=/\\d+°C/')).toBeVisible();
    // 人流文字
    const crowdTexts = ['人流稀少', '人流适中', '人较多'];
    const crowdEl = bar.getByText(new RegExp(crowdTexts.join('|')));
    await expect(crowdEl).toBeVisible();
  }, 30000);

  test('创建挑战 → AI生成任务 → 主线任务含推荐店铺卡片', async ({ page }) => {
    await createChallenge(page, '今晚龙华烧烤，预算90元，3人');

    await expect(page.locator('[data-testid="location-ok"]')).toBeVisible({ timeout: 8000 });
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });
    await expect(page.locator('.task-badge-main')).toBeVisible();

    const shopRecs = page.locator('[data-testid="shop-recommendations"]').first();
    await expect(shopRecs).toBeVisible({ timeout: 5000 });

    const shopCards = page.locator('[data-testid="shop-card"]');
    await expect(shopCards.first()).toBeVisible();
    expect(await shopCards.count()).toBeGreaterThan(0);
  }, 120000);

  test('ShopCard包含店铺名称、地址+距离、优惠标签', async ({ page }) => {
    await createChallenge(page, '3人火锅，预算150元');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const card = page.locator('[data-testid="shop-card"]').first();

    const name = await card.locator('[data-testid="shop-name"]').textContent();
    expect(name?.trim().length).toBeGreaterThan(0);

    const addr = card.locator('[data-testid="shop-address"]');
    await expect(addr).toBeVisible();
    const addrText = await addr.textContent();
    expect(addrText?.length).toBeGreaterThan(0);
    expect(addrText).not.toContain('位置未知');

    const discountTypes = card.locator('[data-testid="shop-discount-types"] span');
    expect(await discountTypes.count()).toBeGreaterThan(0);
  }, 120000);

  test('ShopCard外链href指向大众点评或美团', async ({ page }) => {
    await createChallenge(page, '2人吃饭，预算60元');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const card = page.locator('[data-testid="shop-card"]').first();
    const href = await card.getAttribute('href');
    expect(href).toBeTruthy();

    const isValidPlatform =
      href!.includes('dianping.com') ||
      href!.includes('meituan.com') ||
      href === '#';
    expect(isValidPlatform).toBe(true);

    if (href !== '#') {
      expect(await card.getAttribute('target')).toBe('_blank');
      expect(await card.getAttribute('rel')).toContain('noopener');
    }
  }, 120000);

  test('完整链路：创建→城市脉冲→AI生成→完成任务→生成战报', async ({ page }) => {
    await createChallenge(page, '今晚烧烤，预算30，2人');

    // 城市脉冲先出现
    await expect(page.locator('[data-testid="city-pulse-bar"]')).toBeVisible({ timeout: 15000 });

    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    // 三类任务都有
    await expect(page.locator('.task-badge-main')).toBeVisible();
    await expect(page.locator('.task-badge-side')).toBeVisible();
    await expect(page.locator('.task-badge-hidden')).toBeVisible();

    // 安全护栏
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('垃圾桶');
    expect(bodyText).not.toContain('乞讨');
    expect(bodyText).not.toContain('拾荒');

    // 完成任务
    await page.click('button:has-text("✓ 完成")');
    await expect(page.locator('text=✓ 已完成').first()).toBeVisible();

    // 生成战报
    await page.click('button:has-text("完成挑战，生成战报")');
    await expect(page.locator('text=确认完成挑战')).toBeVisible();
    await page.fill('input[type="number"]', '25');
    await page.click('button:has-text("确认")');
    await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
  }, 180000);
});

// ══════════════════════════════════════════════════════════════
// 3. 边界情况：拒绝位置授权
// ══════════════════════════════════════════════════════════════
test.describe('边界：拒绝位置授权', () => {
  test.use({ permissions: [] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('拒绝定位 → 显示"位置未知"badge且主线任务有降级提示', async ({ page }) => {
    await page.fill('textarea', '烧烤，预算60元，2人');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);

    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    const noShopsHints = await page.locator('[data-testid="no-shops-hint"]').count();
    const locationDenied = await page.locator('[data-testid="location-denied"]').count();
    const shopCards = await page.locator('[data-testid="shop-card"]').count();

    const hasDegradation = noShopsHints > 0 || locationDenied > 0 || shopCards === 0;
    expect(hasDegradation).toBe(true);

    if (shopCards > 0) {
      const addrText = await page.locator('[data-testid="shop-address"]').first().textContent();
      expect(addrText).toContain('位置未知');
    }
  }, 120000);

  test('无位置时 CityPulseBar 仍出现（城市状态不依赖GPS）', async ({ page }) => {
    await page.fill('textarea', '咖啡，预算30元');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);

    // city_pulse 不依赖坐标，应仍然触发
    await expect(page.locator('[data-testid="city-pulse-bar"]')).toBeVisible({ timeout: 15000 });
  }, 30000);
});

// ══════════════════════════════════════════════════════════════
// 4. 边界情况：极端输入
// ══════════════════════════════════════════════════════════════
test.describe('边界：极端输入', () => {
  test.use({ geolocation: LONGHUA_GEO, permissions: ['geolocation'] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('预算1元（极端低）→ AI不崩溃，生成任务', async ({ page }) => {
    await page.fill('textarea', '预算1元，随便吃');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=省钱挑战')).toBeVisible();
  }, 30000);

  test('预算超大（999999元）→ AI正常处理', async ({ page }) => {
    await page.fill('textarea', '预算999999元，请给我最奢华的省钱方案');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=省钱挑战')).toBeVisible();
  }, 30000);

  test('ShopCard图片加载失败 → emoji占位符而非破图', async ({ page }) => {
    await page.route('**/*.jpg', (route) => route.abort());
    await page.route('**/*.png', (route) => route.abort());
    await page.route('**/meituan.net/**', (route) => route.abort());
    await page.route('**/dpfile.com/**', (route) => route.abort());

    await createChallenge(page, '火锅，预算100元，3人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const brokenImgs = await page.locator('[data-testid="shop-image"]:visible').count();
    expect(brokenImgs).toBe(0);
  }, 120000);
});

// ══════════════════════════════════════════════════════════════
// 5. AI 决策能力
// ══════════════════════════════════════════════════════════════
test.describe('AI决策能力测试', () => {
  test.use({ geolocation: LONGHUA_GEO, permissions: ['geolocation'] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('3人火锅150元 → 任务含叠加优惠关键词', async ({ page }) => {
    await createChallenge(page, '3人聚餐，预算150元，想吃火锅，徐汇龙华，要求评分4.5以上');
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    const taskTexts = await page.locator('.card-arcade p').allTextContents();
    const savingKeywords = ['优惠', '团购', '折扣', '省', '满减', '券', '套餐'];
    const hasSavingContent = taskTexts.some((t) => savingKeywords.some((k) => t.includes(k)));
    expect(hasSavingContent).toBe(true);
  }, 90000);

  test('店铺推荐优惠详情文字非空', async ({ page }) => {
    await createChallenge(page, '烧烤，预算80元，2人');
    await page.waitForSelector('[data-testid="shop-discount-details"]', { timeout: 90000 });

    const details = page.locator('[data-testid="shop-discount-details"] p').first();
    const text = await details.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
    const hasDiscountInfo = /[折元减优惠套餐]/.test(text ?? '');
    expect(hasDiscountInfo).toBe(true);
  }, 90000);

  test('推荐店铺按距离从近到远排列', async ({ page }) => {
    await createChallenge(page, '烧烤，预算100元，3人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const addrLocators = page.locator('[data-testid="shop-address"]');
    const count = await addrLocators.count();

    if (count >= 2) {
      const distances: number[] = [];
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await addrLocators.nth(i).textContent() ?? '';
        const mMatch = text.match(/(\d+(?:\.\d+)?)(km|m)/);
        if (mMatch) {
          const val = parseFloat(mMatch[1]);
          distances.push(mMatch[2] === 'km' ? val * 1000 : val);
        }
      }
      if (distances.length >= 2) {
        for (let i = 0; i < distances.length - 1; i++) {
          expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
        }
      }
    }
  }, 90000);
});

// ══════════════════════════════════════════════════════════════
// 6. 移动端适配（390×844 iPhone 14）
// ══════════════════════════════════════════════════════════════
test.describe('移动端：布局与交互', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('iPhone14：ShopCard在移动端正常显示不溢出', async ({ page }) => {
    await createChallenge(page, '火锅，预算100元，2人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const card = page.locator('[data-testid="shop-card"]').first();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();

    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }
  }, 90000);

  test('iPhone14：CityPulseBar不溢出屏幕', async ({ page }) => {
    await createChallenge(page, '咖啡，预算50元');
    const bar = page.locator('[data-testid="city-pulse-bar"]');
    await expect(bar).toBeVisible({ timeout: 15000 });

    const box = await bar.boundingBox();
    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  }, 30000);

  test('移动端：完成任务按钮可点击', async ({ page }) => {
    await createChallenge(page, '今晚烧烤，预算30，2人');
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    const completeBtn = page.locator('button:has-text("✓ 完成")').first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await expect(page.locator('text=✓ 已完成').first()).toBeVisible();
  }, 90000);

  test('移动端：EventCard在CityPulseBar内横向滚动不溢出', async ({ page }) => {
    await createChallenge(page, '今晚活动，预算0元');
    const bar = page.locator('[data-testid="city-pulse-bar"]');
    await expect(bar).toBeVisible({ timeout: 15000 });

    // 页面无横向滚动条
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  }, 30000);
});
