import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  test('手机号+验证码完整登录', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('抠门大王');

    await page.fill('input[type="tel"]', '13800138000');
    await page.click('button:has-text("获取验证码")');
    await expect(page.locator('button:has-text("60s")')).toBeVisible();

    await page.fill('input[maxlength="6"]', '123456');
    await page.click('button:has-text("开始挑战")');
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=发起省钱挑战')).toBeVisible();
  });

  test('手机号格式错误 → 提示错误', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '1234');
    await page.click('button:has-text("获取验证码")');
    await expect(page.locator('text=手机号格式错误')).toBeVisible();
  });

  test('错误验证码 → 提示验证码错误', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="tel"]', '13800138001');
    await page.click('button:has-text("获取验证码")');
    await page.fill('input[maxlength="6"]', '000000');
    await page.click('button:has-text("开始挑战")');
    await expect(page.locator('text=验证码错误')).toBeVisible();
  });

  test('未登录访问 /leaderboard → 重定向到 /login', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});
