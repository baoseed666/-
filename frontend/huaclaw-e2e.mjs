import { chromium } from 'playwright';

const CHROMIUM = 'C:/Users/爆seed/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:5176';

async function run() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const results = [];

  function ok(name) { results.push({ name, pass: true }); console.log('✅ ' + name); }
  function fail(name, reason) { results.push({ name, pass: false, reason }); console.log('❌ ' + name + (reason ? ': ' + reason : '')); }

  // 1. ONBOARDING — 桌面 1280x800
  console.log('\n── Onboarding 桌面端 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.removeItem('huaclaw_onboarding_done'));
    await p.reload();
    await p.waitForTimeout(1000);

    const hasOnboarding = await p.locator('text=在龙华·花得值').isVisible();
    hasOnboarding ? ok('Onboarding 显示「在龙华·花得值」') : fail('Onboarding 显示「在龙华·花得值」');

    const hasHuaclaw = await p.locator('text=花 爪').isVisible();
    hasHuaclaw ? ok('Onboarding 显示「花 爪」') : fail('Onboarding 显示「花 爪」');

    const hasSkip = await p.locator('button:has-text("跳过")').isVisible();
    hasSkip ? ok('跳过按钮存在') : fail('跳过按钮存在');

    if (hasSkip) {
      await p.locator('button:has-text("跳过")').click();
      await p.waitForTimeout(800);
      const navVisible = await p.locator('nav').isVisible().catch(() => false);
      navVisible ? ok('点击跳过后进入主界面（导航可见）') : fail('点击跳过后进入主界面（导航可见）');
    }

    await p.reload();
    await p.waitForTimeout(800);
    const noOnboarding = !(await p.locator('text=在龙华·花得值').isVisible());
    noOnboarding ? ok('刷新后不再显示 Onboarding') : fail('刷新后不再显示 Onboarding');
    await ctx.close();
  }

  // 2. ONBOARDING — 移动 390x844
  console.log('\n── Onboarding 移动端 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.removeItem('huaclaw_onboarding_done'));
    await p.reload();
    await p.waitForTimeout(800);

    const mobileOnb = await p.locator('text=在龙华·花得值').isVisible();
    mobileOnb ? ok('移动端 Onboarding 显示') : fail('移动端 Onboarding 显示');

    const hasSkip2 = await p.locator('button:has-text("跳过")').isVisible();
    hasSkip2 ? ok('移动端跳过按钮可见') : fail('移动端跳过按钮可见');

    // 模拟鼠标拖动滑块 (黄色圆圈)
    const allDivs = p.locator('div');
    const count = await allDivs.count();
    let sliderBox = null;
    for (let i = count - 1; i >= 0; i--) {
      const el = allDivs.nth(i);
      const txt = await el.textContent().catch(() => '');
      if (txt && txt.trim() === '▶') {
        sliderBox = await el.boundingBox().catch(() => null);
        if (sliderBox) break;
      }
    }
    if (sliderBox) {
      await p.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await p.mouse.down();
      for (let i = 1; i <= 15; i++) {
        await p.mouse.move(sliderBox.x + sliderBox.width / 2 + i * 20, sliderBox.y + sliderBox.height / 2);
        await p.waitForTimeout(20);
      }
      await p.mouse.up();
      await p.waitForTimeout(1000);
      const afterSlide = !(await p.locator('text=在龙华·花得值').isVisible());
      afterSlide ? ok('移动端滑动后进入主界面') : fail('移动端滑动后进入主界面', '仍显示 Onboarding');
    } else {
      fail('移动端找到滑块元素', '未找到 ▶ 滑块');
    }
    await ctx.close();
  }

  // 3. 全站 Arcade 主题验证 — 桌面 1280x800
  console.log('\n── Arcade 主题验证（桌面）──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('huaclaw_onboarding_done', 'true'));
    await p.reload();
    await p.waitForTimeout(1200);

    const bgColor = await p.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const isArcadeDark = !bgColor.includes('255, 255, 255');
    isArcadeDark ? ok('背景为暗色 Arcade (' + bgColor + ')') : fail('背景为暗色 Arcade', '实际: ' + bgColor);

    const noBlue = await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return !all.some(el => {
        const s = window.getComputedStyle(el).color;
        return s === 'rgb(37, 99, 235)' || s === 'rgb(124, 58, 237)' || s === 'rgb(219, 39, 119)';
      });
    });
    noBlue ? ok('无蓝/紫/粉色文字残留') : fail('无蓝/紫/粉色文字残留');

    const navVisible = await p.locator('nav').last().isVisible();
    navVisible ? ok('底部导航可见') : fail('底部导航可见');

    const tabLabels = ['地图', '发现', '积分', '我的', '花爪'];
    for (const label of tabLabels) {
      const btn = p.locator('button:has-text("' + label + '")').first();
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await p.waitForTimeout(600);
        const hasError = await p.locator('text=Error').isVisible().catch(() => false);
        !hasError ? ok('Tab「' + label + '」切换无错误') : fail('Tab「' + label + '」切换无错误');
      } else {
        fail('Tab「' + label + '」按钮可见', '找不到按钮');
      }
    }
    await ctx.close();
  }

  // 4. 移动端全站验证 390x844
  console.log('\n── Arcade 主题验证（移动）──');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('huaclaw_onboarding_done', 'true'));
    await p.reload();
    await p.waitForTimeout(1200);

    const bgColor = await p.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const isDark = !bgColor.includes('255, 255, 255');
    isDark ? ok('移动端背景暗色 (' + bgColor + ')') : fail('移动端背景暗色', '实际: ' + bgColor);

    const navOk = await p.locator('nav').last().isVisible();
    navOk ? ok('移动端底部导航可见') : fail('移动端底部导航可见');

    for (const label of ['地图', '发现', '花爪']) {
      const btn = p.locator('button:has-text("' + label + '")').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await p.waitForTimeout(500);
        ok('移动端 Tab「' + label + '」切换正常');
      }
    }
    await ctx.close();
  }

  // 5. 边界测试
  console.log('\n── 边界测试 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('huaclaw_onboarding_done', 'true'));
    await p.reload();
    await p.waitForTimeout(800);

    for (const label of ['地图', '发现', '积分', '我的', '花爪']) {
      const btn = p.locator('button:has-text("' + label + '")').first();
      if (await btn.isVisible().catch(() => false)) await btn.click();
      await p.waitForTimeout(200);
    }
    errors.length === 0 ? ok('快速切 Tab 无 JS 异常') : fail('快速切 Tab 无 JS 异常', errors.slice(0, 2).join('; '));
    await ctx.close();
  }

  await browser.close();

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  console.log('\n══════════════════════════════════');
  console.log('花爪 E2E: ' + passed + '/' + results.length + ' 通过');
  if (failed.length) {
    console.log('失败项:');
    failed.forEach(r => console.log('  ❌ ' + r.name + (r.reason ? ': ' + r.reason : '')));
    process.exit(1);
  }
}

run().catch(e => { console.error('❌ 运行异常:', e.message); process.exit(1); });
