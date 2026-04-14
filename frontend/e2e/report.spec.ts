import { test, expect, Page } from '@playwright/test';

async function loginAndComplete(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="tel"]', '13888880001');
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');

  await page.fill('textarea', '预算50元，烧烤');
  await page.click('button:has-text("发起省钱挑战")');
  await page.waitForURL(/\/challenge\/.+/);
  await page.waitForSelector('.task-badge-main', { timeout: 60000 });
  await page.click('button:has-text("完成挑战，生成战报")');
  await page.fill('input[type="number"]', '15');
  await page.click('button:has-text("确认")');
  await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
}

test.describe('战报页', () => {
  test('战报展示完整信息：称号 + 省钱金额 + 击败比例', async ({ page }) => {
    await loginAndComplete(page);
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
    await expect(page.locator('text=成功省下')).toBeVisible();
    await expect(page.locator('text=【')).toBeVisible();
    await expect(page.locator('text=%')).toBeVisible();
  }, 120000);

  test('海报图片可访问', async ({ page }) => {
    await loginAndComplete(page);
    const img = page.locator('img[alt="战报海报"]');
    await expect(img).toBeVisible({ timeout: 10000 });
    const src = await img.getAttribute('src');
    expect(src).toMatch(/\/uploads\/reports\/.+\.png/);
  }, 120000);

  test('保存海报按钮可点击', async ({ page }) => {
    await loginAndComplete(page);
    await expect(page.locator('button:has-text("保存海报")')).toBeVisible();
    await page.click('button:has-text("保存海报")');
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
  }, 120000);
});
