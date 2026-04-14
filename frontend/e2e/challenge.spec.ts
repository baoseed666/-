import { test, expect, Page } from '@playwright/test';

async function login(page: Page, phone = '13999990001') {
  await page.goto('/login');
  await page.fill('input[type="tel"]', phone);
  await page.click('button:has-text("获取验证码")');
  await page.fill('input[maxlength="6"]', '123456');
  await page.click('button:has-text("开始挑战")');
  await page.waitForURL('/');
}

test.describe('挑战全链路', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('创建挑战 → AI流式生成任务 → 完成任务 → 生成战报', async ({ page }) => {
    await page.fill('textarea', '今晚烧烤，预算30，2人');
    await page.selectOption('select', '上海');
    await page.click('button:has-text("发起省钱挑战")');

    await page.waitForURL(/\/challenge\/.+/);
    await expect(page.locator('text=省钱挑战')).toBeVisible();

    await page.waitForSelector('.task-badge-main', { timeout: 60000 });
    await expect(page.locator('.task-badge-main')).toBeVisible();
    await expect(page.locator('.task-badge-side')).toBeVisible();
    await expect(page.locator('.task-badge-hidden')).toBeVisible();

    const pageText = await page.locator('body').textContent();
    expect(pageText).not.toContain('垃圾桶');
    expect(pageText).not.toContain('乞讨');

    await page.click('button:has-text("✓ 完成")');
    await expect(page.locator('text=已完成').first()).toBeVisible();

    await page.click('button:has-text("完成挑战，生成战报")');
    await expect(page.locator('text=确认完成挑战')).toBeVisible();
    await page.fill('input[type="number"]', '12');
    await page.click('button:has-text("确认")');

    await page.waitForURL(/\/report\/.+/, { timeout: 60000 });
    await expect(page.locator('text=BATTLE REPORT')).toBeVisible();
    await expect(page.locator('text=成功省下')).toBeVisible();
  }, 120000);

  test('3人火锅150元 → AI应生成叠加优惠方案', async ({ page }) => {
    await page.fill('textarea', '3人聚餐，预算150元，想吃火锅，徐汇区，要求评分4.5以上');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForSelector('.task-badge-main', { timeout: 60000 });

    const taskTexts = await page.locator('.card-arcade p').allTextContents();
    const savingKeywords = ['优惠', '团购', '折扣', '省', '满减', '券', '套餐'];
    const hasSavingContent = taskTexts.some((t) => savingKeywords.some((k) => t.includes(k)));
    expect(hasSavingContent).toBe(true);
  }, 90000);

  test('空输入 → 按钮禁用', async ({ page }) => {
    await expect(page.locator('button:has-text("发起省钱挑战")')).toBeDisabled();
  });

  test('预算1元 → AI仍能生成方案（不崩溃）', async ({ page }) => {
    await page.fill('textarea', '预算1元，随便');
    await page.click('button:has-text("发起省钱挑战")');
    await page.waitForURL(/\/challenge\/.+/);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=省钱挑战')).toBeVisible();
  }, 30000);
});
