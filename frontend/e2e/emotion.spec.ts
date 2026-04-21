import { test, expect, Page } from '@playwright/test';

const LONGHUA_GEO = { latitude: 31.1890, longitude: 121.4614 };

async function login(page: Page, phone = '13999990002') {
  await page.goto('/login');
  await page.fill('input[type="tel"]', phone);
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
}

async function fillAllQuestions(page: Page) {
  await page.click('button:has-text("快速版 5题")');
  for (let qi = 0; qi < 5; qi++) {
    const cardButtons = page.locator('.card-arcade').nth(qi).locator('button');
    await cardButtons.first().click();
  }
}

// ══════════════════════════════════════════════════════════════
// 1. 情绪测试完整链路
// ══════════════════════════════════════════════════════════════
test.describe('情绪Agent完整链路', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('未答题 → 提交按钮显示"还差N题"且禁用', async ({ page }) => {
    await page.goto('/emotion');
    await page.click('button:has-text("快速版 5题")');
    const btn = page.locator('button:has-text("还差")');
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('答完5题 → 按钮变为"开始情绪分析"且可点击', async ({ page }) => {
    await page.goto('/emotion');
    await fillAllQuestions(page);
    const btn = page.locator('button:has-text("🔮 开始情绪分析")');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('完整链路：答题 → AI分析 → 显示情绪标签+路线', async ({ page }) => {
    await page.goto('/emotion');
    await fillAllQuestions(page);
    await page.click('button:has-text("🔮 开始情绪分析")');

    // analyzing阶段
    await expect(page.locator('text=AI 正在感知你的情绪')).toBeVisible();

    // 等待result阶段（SSE流式，最多90秒）
    await expect(page.locator('text=你的情绪标签')).toBeVisible({ timeout: 90000 });

    // 情绪标签非空
    const labelEl = page.locator('.card-arcade').first().locator('p.text-arcade-gold');
    const labelText = await labelEl.textContent();
    expect(labelText?.trim().length).toBeGreaterThan(0);

    // 有路线卡片
    const routeCards = page.locator('text=为你推荐 3 条场景路线').locator('~ div .card-arcade');
    // 至少有1张路线卡
    await expect(page.locator('text=打卡签到 +10积分').first()).toBeVisible();
  }, 120000);

  test('路线卡片可展开显示stops', async ({ page }) => {
    await page.goto('/emotion');
    await fillAllQuestions(page);
    await page.click('button:has-text("🔮 开始情绪分析")');
    await expect(page.locator('text=你的情绪标签')).toBeVisible({ timeout: 90000 });

    // 第一张路线默认展开（expandedRoute = 0）
    // 找到第一个stop的time字段
    const firstStop = page.locator('.font-mono').first();
    await expect(firstStop).toBeVisible();
    const timeText = await firstStop.textContent();
    expect(timeText?.trim().length).toBeGreaterThan(0);
  }, 120000);

  test('打卡签到 → 按钮变为"✓ 已打卡"', async ({ page }) => {
    await login(page, '13999990099');
    await page.goto('/emotion');
    await fillAllQuestions(page);
    await page.click('button:has-text("🔮 开始情绪分析")');
    await expect(page.locator('text=你的情绪标签')).toBeVisible({ timeout: 90000 });

    const checkinBtn = page.locator('button:has-text("📍 打卡签到 +10积分")').first();
    await expect(checkinBtn).toBeEnabled();
    await checkinBtn.click();

    await expect(page.locator('button:has-text("✓ 已打卡 +10积分")').first()).toBeVisible({ timeout: 10000 });
  }, 120000);

  test('重新测试 → 回到模式选择页', async ({ page }) => {
    await page.goto('/emotion');
    await fillAllQuestions(page);
    await page.click('button:has-text("🔮 开始情绪分析")');
    await expect(page.locator('text=你的情绪标签')).toBeVisible({ timeout: 90000 });

    await page.click('button:has-text("重新测试")');
    await expect(page.locator('text=省钱人格 SQTI')).toBeVisible();
  }, 120000);

  test('深度版12题：答完12题 → 按钮变为"开始情绪分析"', async ({ page }) => {
    await page.goto('/emotion');
    await page.click('button:has-text("深度版 12题")');
    for (let qi = 0; qi < 12; qi++) {
      const cardButtons = page.locator('.card-arcade').nth(qi).locator('button');
      await cardButtons.first().click();
    }
    const btn = page.locator('button:has-text("🔮 开始情绪分析")');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });
});

// ══════════════════════════════════════════════════════════════
// 2. 移动端布局（390×844）
// ══════════════════════════════════════════════════════════════
test.describe('移动端：情绪页布局', () => {
  test.use({
    geolocation: LONGHUA_GEO,
    permissions: ['geolocation'],
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('iPhone14：问卷页无横向溢出', async ({ page }) => {
    await page.goto('/emotion');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('iPhone14：结果页路线卡不溢出', async ({ page }) => {
    await page.goto('/emotion');
    await fillAllQuestions(page);
    await page.click('button:has-text("🔮 开始情绪分析")');
    await expect(page.locator('text=你的情绪标签')).toBeVisible({ timeout: 90000 });

    const cards = page.locator('.card-arcade');
    const count = await cards.count();
    const viewport = page.viewportSize();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const box = await cards.nth(i).boundingBox();
      if (box && viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
      }
    }
  }, 120000);
});
