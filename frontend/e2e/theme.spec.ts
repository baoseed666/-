import { test, expect, devices } from '@playwright/test'

async function setupPage(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'test-token')
    localStorage.setItem('koumen_onboarding_done', 'true')
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test.describe('主题切换 — 桌面端', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    // Clear theme before each test for a clean slate
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('theme'))
  })

  test('默认为夜间模式', async ({ page }) => {
    await setupPage(page)
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(theme === '' || theme === undefined).toBeTruthy()
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toMatch(/rgb\(10,\s*10,\s*10\)/)
  })

  test('点击切换按钮 → 白天模式', async ({ page }) => {
    await setupPage(page)
    const toggle = page.getByRole('button', { name: /切换到白天模式/ })
    await expect(toggle).toBeVisible()
    await toggle.click()
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(theme).toBe('light')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bg).toMatch(/rgb\(255,\s*251,\s*240\)/)
  })

  test('切换后刷新 → 白天模式持久化', async ({ page }) => {
    await setupPage(page)
    await page.evaluate(() => localStorage.setItem('theme', 'light'))
    await page.reload()
    await page.waitForLoadState('networkidle')
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(theme).toBe('light')
  })

  test('白天模式下切换 → 恢复夜间模式', async ({ page }) => {
    await setupPage(page)
    await page.evaluate(() => localStorage.setItem('theme', 'light'))
    await page.reload()
    await page.waitForLoadState('networkidle')
    const toggle = page.getByRole('button', { name: /切换到夜间模式/ })
    await toggle.click()
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(['', 'dark']).toContain(theme)
  })

  test('快速连续点击不崩溃', async ({ page }) => {
    await setupPage(page)
    const toggle = page.getByRole('button', { name: /切换/ })
    for (let i = 0; i < 10; i++) await toggle.click()
    await expect(page.locator('text=Uncaught')).not.toBeVisible()
  })

  test('所有可用页面 — 白天模式无崩溃', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('koumen_onboarding_done', 'true')
      localStorage.setItem('theme', 'light')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const routes = ['/', '/map', '/metaverse', '/leaderboard', '/profile', '/points', '/emotion', '/dashboard']
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const dt = await page.evaluate(() => document.documentElement.dataset.theme)
      expect(dt).toBe('light')
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      expect(bg).not.toMatch(/rgb\(10,\s*10,\s*10\)/)
    }
  })

  test('切换按钮 aria-label 随主题更新', async ({ page }) => {
    await setupPage(page)
    const toggle = page.getByRole('button', { name: /切换到白天模式/ })
    await expect(toggle).toBeVisible()
    await toggle.click()
    const toggleAfter = page.getByRole('button', { name: /切换到夜间模式/ })
    await expect(toggleAfter).toBeVisible()
  })
})

test.describe('主题切换 — 移动端 iPhone 14', () => {
  test.use({ ...devices['iPhone 14'] })

  test('移动端切换按钮可见且可点击', async ({ page }) => {
    await setupPage(page)
    const toggle = page.getByRole('button', { name: /切换到白天模式/ })
    await expect(toggle).toBeVisible()
    await toggle.tap()
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(theme).toBe('light')
  })

  test('移动端白天模式 — 各页面导航正常', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('koumen_onboarding_done', 'true')
      localStorage.setItem('theme', 'light')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    for (const route of ['/', '/map', '/leaderboard']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const dt = await page.evaluate(() => document.documentElement.dataset.theme)
      expect(dt).toBe('light')
    }
  })

  test('移动端夜间模式 — 底部导航可见且不被按钮遮挡', async ({ page }) => {
    await setupPage(page)
    const bottomNav = page.locator('nav').last()
    await expect(bottomNav).toBeVisible()
    const toggle = page.getByRole('button', { name: /切换/ })
    const toggleBox = await toggle.boundingBox()
    const navBox = await bottomNav.boundingBox()
    if (toggleBox && navBox) {
      expect(toggleBox.y + toggleBox.height).toBeLessThan(navBox.y)
    }
  })
})
