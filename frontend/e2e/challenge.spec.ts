import { test, expect, Page, BrowserContext } from '@playwright/test';

// ── 深圳龙华坐标（种子数据所在区域）
const LONGHUA_GEO = { latitude: 22.7468, longitude: 114.0397 };

async function login(page: Page, phone = '13999990001') {
  await page.goto('/login');
  await page.fill('input[type="tel"]', phone);
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
}

async function createChallenge(page: Page, text: string, city = '深圳') {
  await page.selectOption('select', city);
  await page.fill('textarea', text);
  await page.click('button:has-text("发起省钱挑战")');
  await page.waitForURL(/\/challenge\/.+/);
}

// ══════════════════════════════════════════════════════════════
// 1. 正常流程：带位置的完整链路
// ══════════════════════════════════════════════════════════════
test.describe('挑战正常流程（带位置）', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('创建挑战 → AI生成任务 → 主线任务含推荐店铺卡片', async ({ page }) => {
    await createChallenge(page, '今晚龙华烧烤，预算90元，3人');

    await expect(page.locator('[data-testid="location-ok"]')).toBeVisible({ timeout: 8000 });

    // 等待AI生成任务
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });
    await expect(page.locator('.task-badge-main')).toBeVisible();

    // 主线任务应有推荐店铺区块
    const shopRecs = page.locator('[data-testid="shop-recommendations"]').first();
    await expect(shopRecs).toBeVisible({ timeout: 5000 });

    // ShopCard存在
    const shopCards = page.locator('[data-testid="shop-card"]');
    await expect(shopCards.first()).toBeVisible();
    expect(await shopCards.count()).toBeGreaterThan(0);
  }, 120000);

  test('ShopCard包含店铺名称、地址+距离、优惠标签', async ({ page }) => {
    await createChallenge(page, '3人火锅，预算150元');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const card = page.locator('[data-testid="shop-card"]').first();

    // 店名不为空
    const name = await card.locator('[data-testid="shop-name"]').textContent();
    expect(name?.trim().length).toBeGreaterThan(0);

    // 地址存在
    const addr = card.locator('[data-testid="shop-address"]');
    await expect(addr).toBeVisible();
    const addrText = await addr.textContent();
    expect(addrText?.length).toBeGreaterThan(0);

    // 距离文字（因为有位置，距离应是具体数字而非"位置未知"）
    expect(addrText).not.toContain('位置未知');

    // 优惠类型标签至少一个
    const discountTypes = card.locator('[data-testid="shop-discount-types"] span');
    const dtCount = await discountTypes.count();
    expect(dtCount).toBeGreaterThan(0);
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
      href === '#'; // externalUrl为null时的降级
    expect(isValidPlatform).toBe(true);

    // 有真实链接的卡片应在新标签页打开
    if (href !== '#') {
      expect(await card.getAttribute('target')).toBe('_blank');
      expect(await card.getAttribute('rel')).toContain('noopener');
    }
  }, 120000);

  test('ShopCard平台标识正确（点评/美团）', async ({ page }) => {
    await createChallenge(page, '烧烤，预算80元，2人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const platforms = page.locator('[data-testid="shop-platform"]');
    const count = await platforms.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = await platforms.nth(i).textContent();
      expect(['点评', '美团', '外链']).toContain(text?.trim());
    }
  }, 120000);

  test('完整链路：创建→店铺推荐→完成任务→生成战报', async ({ page }) => {
    await createChallenge(page, '今晚烧烤，预算30，2人');
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    // 验证三类任务都有
    await expect(page.locator('.task-badge-main')).toBeVisible();
    await expect(page.locator('.task-badge-side')).toBeVisible();
    await expect(page.locator('.task-badge-hidden')).toBeVisible();

    // 安全护栏：不含危险内容
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('垃圾桶');
    expect(bodyText).not.toContain('乞讨');
    expect(bodyText).not.toContain('拾荒');

    // 完成一个任务
    await page.click('button:has-text("✓ 完成")');
    await expect(page.locator('text=✓ 已完成').first()).toBeVisible();

    // 生成战报流程
    await page.click('button:has-text("完成挑战，生成战报")');
    await expect(page.locator('text=确认完成挑战')).toBeVisible();
    await page.fill('input[type="number"]', '25');
    await page.click('button:has-text("确认")');

    await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
  }, 180000);
});

// ══════════════════════════════════════════════════════════════
// 2. 边界情况：拒绝位置授权
// ══════════════════════════════════════════════════════════════
test.describe('边界：拒绝位置授权', () => {
  // 不设置 geolocation permissions → 浏览器会拒绝
  test.use({ permissions: [] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('拒绝定位 → 显示"位置未知"badge且主线任务有降级提示', async ({ page }) => {
    await page.selectOption('select', '深圳');
    await page.fill('textarea', '烧烤，预算60元，2人');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);

    // 等待AI生成（location-denied 或 location-ok 其中一个会出现）
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    // 无位置时的提示：no-shops-hint 或 distanceText 为"位置未知"
    const noShopsHints = await page.locator('[data-testid="no-shops-hint"]').count();
    const locationDenied = await page.locator('[data-testid="location-denied"]').count();
    const shopCards = await page.locator('[data-testid="shop-card"]').count();

    // 要么有降级提示，要么位置被拒绝显示，要么店铺不显示距离
    // 至少有一种降级处理存在
    const hasDegradation = noShopsHints > 0 || locationDenied > 0 || shopCards === 0;
    expect(hasDegradation).toBe(true);

    // 如果有shop cards，距离应显示"位置未知"
    if (shopCards > 0) {
      const addrText = await page.locator('[data-testid="shop-address"]').first().textContent();
      expect(addrText).toContain('位置未知');
    }
  }, 120000);
});

// ══════════════════════════════════════════════════════════════
// 3. 边界情况：极端输入
// ══════════════════════════════════════════════════════════════
test.describe('边界：极端输入', () => {
  test.use({ geolocation: LONGHUA_GEO, permissions: ['geolocation'] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('空输入 → 发起挑战按钮禁用', async ({ page }) => {
    await expect(page.locator('button:has-text("发起省钱挑战")')).toBeDisabled();
  });

  test('预算1元（极端低）→ AI不崩溃，生成任务', async ({ page }) => {
    await page.fill('textarea', '预算1元，随便吃');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=省钱挑战')).toBeVisible();
    // 页面不崩溃（无JS error alert）
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
    // 屏蔽所有图片请求来模拟加载失败
    await page.route('**/*.jpg', (route) => route.abort());
    await page.route('**/*.png', (route) => route.abort());
    await page.route('**/meituan.net/**', (route) => route.abort());
    await page.route('**/dpfile.com/**', (route) => route.abort());

    await createChallenge(page, '火锅，预算100元，3人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    // 图片加载失败后应显示emoji，不显示broken图标
    // 检查没有src指向失败图片的img标签（已隐藏）
    const brokenImgs = await page.locator('[data-testid="shop-image"]:visible').count();
    // 失败的图片应被隐藏（onError处理），所以visible数量应为0
    // 或者根本就没有img（imageUrl为null显示emoji div）
    // 总之不应有visible的broken img
    expect(brokenImgs).toBe(0);
  }, 120000);
});

// ══════════════════════════════════════════════════════════════
// 4. AI 决策能力
// ══════════════════════════════════════════════════════════════
test.describe('AI决策能力测试', () => {
  test.use({ geolocation: LONGHUA_GEO, permissions: ['geolocation'] });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('3人火锅150元 → 任务含叠加优惠关键词', async ({ page }) => {
    await createChallenge(page, '3人聚餐，预算150元，想吃火锅，徐汇区，要求评分4.5以上');
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
    // 优惠文字应包含金额或折扣信息
    const hasDiscountInfo = /[折元减优惠套餐]/.test(text ?? '');
    expect(hasDiscountInfo).toBe(true);
  }, 90000);

  test('推荐店铺按距离从近到远排列', async ({ page }) => {
    await createChallenge(page, '烧烤，预算100元，3人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const addrLocators = page.locator('[data-testid="shop-address"]');
    const count = await addrLocators.count();

    if (count >= 2) {
      // 提取距离数字（m或km）
      const distances: number[] = [];
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await addrLocators.nth(i).textContent() ?? '';
        const mMatch = text.match(/(\d+(?:\.\d+)?)(km|m)/);
        if (mMatch) {
          const val = parseFloat(mMatch[1]);
          distances.push(mMatch[2] === 'km' ? val * 1000 : val);
        }
      }
      // 如果提取到了距离，验证从近到远
      if (distances.length >= 2) {
        for (let i = 0; i < distances.length - 1; i++) {
          expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
        }
      }
    }
  }, 90000);
});

// ══════════════════════════════════════════════════════════════
// 5. 移动端适配（iPhone 14）
// ══════════════════════════════════════════════════════════════
test.describe('移动端：ShopCard布局', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('iPhone14：ShopCard在移动端正常显示不溢出', async ({ page }) => {
    await createChallenge(page, '火锅，预算100元，2人');
    await page.waitForSelector('[data-testid="shop-card"]', { timeout: 90000 });

    const card = page.locator('[data-testid="shop-card"]').first();
    const box = await card.boundingBox();

    expect(box).toBeTruthy();
    // 卡片宽度不超过视口宽度
    const viewport = page.viewportSize();
    if (box && viewport) {
      expect(box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }
  }, 90000);

  test('移动端：完成任务按钮可点击', async ({ page }) => {
    await createChallenge(page, '今晚烧烤，预算30，2人');
    await page.waitForSelector('.task-badge-main', { timeout: 90000 });

    const completeBtn = page.locator('button:has-text("✓ 完成")').first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await expect(page.locator('text=✓ 已完成').first()).toBeVisible();
  }, 90000);
});
