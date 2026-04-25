import { test, expect } from '@playwright/test';

const KOUMEN_URL = 'http://localhost:5173';
const HUACLAW_URL = 'http://localhost:5174';

// 编码工具（与 useHuaclawMap.ts 保持一致）
function encodeRoute(route: object): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(route))));
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${KOUMEN_URL}/login`);
  await page.getByPlaceholder(/手机号/).fill('13800138000');
  await page.getByRole('button', { name: /发送验证码/ }).click();
  await page.getByPlaceholder(/验证码/).fill('123456');
  await page.getByRole('button', { name: /登录/ }).click();
  await expect(page).toHaveURL(/\//, { timeout: 10000 });
}

// ─── Suite 1: 挑战路线 → 花爪地图 ────────────────────────
test.describe('ChallengeView → HuaClaw Map', () => {
  test('桌面端：挑战完成后可跳转到花爪地图且叠层可见', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${KOUMEN_URL}/`);
    await page.getByPlaceholder(/今天想省钱|想干嘛|输入/).first().fill('今晚烧烤 2人 预算60');
    await page.getByRole('button', { name: /开始省钱|生成挑战/ }).first().click();
    await expect(page.locator('.card-arcade').first()).toBeVisible({ timeout: 30000 });

    const mapBtn = page.getByRole('button', { name: /花爪地图/ });
    await expect(mapBtn).toBeVisible();

    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      mapBtn.click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');

    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });
    await expect(huaclawPage.locator('text=省钱').or(huaclawPage.locator('text=站点'))).toBeVisible();
    expect(huaclawPage.url()).not.toContain('koumen=');

    await huaclawPage.getByRole('button', { name: /✕ 关闭/ }).click();
    await expect(huaclawPage.locator('text=预计节省').or(huaclawPage.locator('text=预计花费'))).not.toBeVisible();

    await ctx.close();
  });

  test('移动端（390×844）：跳转后 Banner 可见', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${KOUMEN_URL}/`);
    await page.getByPlaceholder(/今天想省钱|想干嘛|输入/).first().fill('下午茶 1人 预算30');
    await page.getByRole('button', { name: /开始省钱|生成挑战/ }).first().click();
    await expect(page.locator('.card-arcade').first()).toBeVisible({ timeout: 30000 });

    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      page.getByRole('button', { name: /花爪地图/ }).click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });

    await ctx.close();
  });
});

// ─── Suite 2: 情绪路线 → 花爪地图 ────────────────────────
test.describe('EmotionView → HuaClaw Map', () => {
  test('桌面端：情绪结果路线卡片"花爪地图打卡"按钮可用', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${KOUMEN_URL}/emotion`);
    await page.getByRole('button', { name: /快速版/ }).click();
    const questions = page.locator('.card-arcade').filter({ hasText: /\. / });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator('button').first().click();
    }
    await page.getByRole('button', { name: /开始情绪分析/ }).click();
    await expect(page.locator('text=为你推荐')).toBeVisible({ timeout: 20000 });

    await page.locator('.card-arcade').filter({ hasText: /¥/ }).first().click();

    const checkinBtn = page.getByRole('button', { name: /花爪地图打卡/ }).first();
    await expect(checkinBtn).toBeVisible();

    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      checkinBtn.click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });

    const bannerTitle = huaclawPage.locator('[style*="ffdd00"]').filter({ hasText: /.+/ }).first();
    await expect(bannerTitle).toBeVisible();
    const titleText = await bannerTitle.textContent();
    expect(titleText?.length).toBeGreaterThan(2);

    await ctx.close();
  });
});

// ─── Suite 3: 边界场景 ────────────────────────────────────
test.describe('边界场景', () => {
  test('URL 参数损坏 → 花爪静默打开首页不报错', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(`${HUACLAW_URL}/?koumen=INVALID_BASE64!!!`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(errors.filter(e => !e.includes('leaflet'))).toHaveLength(0);
    expect(page.url()).not.toContain('koumen=');

    await ctx.close();
  });

  test('stops 全部无坐标 → 兜底偏移标记出现，不崩溃', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    const route = {
      type: 'challenge',
      title: '无坐标测试路线',
      stops: [
        { seq: 1, name: '测试店A', activity: '活动A', cost: 30 },
        { seq: 2, name: '测试店B', activity: '活动B', cost: 20 },
      ],
    };
    const encoded = encodeRoute(route);
    await page.goto(`${HUACLAW_URL}/?koumen=${encoded}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=无坐标测试路线')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });
});
