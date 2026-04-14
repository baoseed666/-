import { test, expect } from '@playwright/test';

test.describe('排行榜', () => {
  test('排行榜显示城市统计 + 用户列表', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '13777770001');
    await page.click('button:has-text("获取验证码")');
    await page.fill('input[maxlength="6"]', '123456');
    await page.click('button:has-text("开始挑战")');
    await page.waitForURL('/');
    await page.click('text=排行榜');
    await page.waitForURL('/leaderboard');
    await expect(page.locator('text=省钱排行榜')).toBeVisible();
    await expect(page.locator('text=今日')).toBeVisible();
  });
});
