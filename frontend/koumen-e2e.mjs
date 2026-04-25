import { chromium } from 'playwright';

const CHROMIUM = 'C:/Users/爆seed/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const BASE = 'http://localhost:5175';

async function run() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const results = [];
  const screenshots = [];

  function ok(name) { results.push({ name, pass: true }); console.log(`✅ ${name}`); }
  function fail(name, reason) { results.push({ name, pass: false, reason }); console.log(`❌ ${name}${reason ? ': ' + reason : ''}`); }

  // ════════════════════════════════════════════════
  // 1. ONBOARDING — 桌面 1280×800
  // ════════════════════════════════════════════════
  console.log('\n── Onboarding 桌面端 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.removeItem('koumen_onboarding_done'));
    await p.reload();
    try {
      await p.waitForURL('**/onboarding', { timeout: 5000 });
      ok('重定向到 /onboarding');
    } catch { fail('重定向到 /onboarding', `当前URL: ${p.url()}`); }

    const sub = await p.locator('text=不买立省100%').isVisible();
    sub ? ok('包含「不买立省100%」') : fail('包含「不买立省100%」');

    const skip = await p.locator('button:has-text("跳过")').isVisible();
    skip ? ok('跳过按钮存在') : fail('跳过按钮存在');

    if (skip) {
      await p.locator('button:has-text("跳过")').click();
      await p.waitForTimeout(800);
      !p.url().includes('/onboarding') ? ok('点击跳过跳转离开 Onboarding') : fail('点击跳过跳转离开 Onboarding');
    }

    await p.reload(); await p.waitForTimeout(1000);
    !p.url().includes('/onboarding') ? ok('刷新后不再出现 Onboarding') : fail('刷新后不再出现 Onboarding');
    await ctx.close();
  }

  // ════════════════════════════════════════════════
  // 2. ONBOARDING — 移动 390×844
  // ════════════════════════════════════════════════
  console.log('\n── Onboarding 移动端 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.removeItem('koumen_onboarding_done'));
    await p.reload();
    try { await p.waitForURL('**/onboarding', { timeout: 5000 }); ok('移动端显示 Onboarding'); }
    catch { fail('移动端显示 Onboarding', p.url()); }

    const track = await p.locator('.onb-track').isVisible();
    track ? ok('滑动轨道可见') : fail('滑动轨道可见');

    // 模拟鼠标拖动滑块
    const slider = p.locator('.onb-slider');
    const box = await slider.boundingBox();
    if (box) {
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await p.mouse.down();
      for (let i = 1; i <= 15; i++) {
        await p.mouse.move(box.x + box.width / 2 + i * 20, box.y + box.height / 2);
        await p.waitForTimeout(30);
      }
      await p.mouse.up();
      await p.waitForTimeout(1000);
    }
    const afterSlide = !p.url().includes('/onboarding');
    afterSlide ? ok('移动端滑动到右端触发跳转') : fail('移动端滑动到右端触发跳转', `仍在 ${p.url()}`);
    await ctx.close();
  }

  // ════════════════════════════════════════════════
  // 3. POINTSVIEW — 桌面（需登录）
  // ════════════════════════════════════════════════
  console.log('\n── PointsView 三区块 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();

    // 先设置 onboarding done，避免被拦截
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('koumen_onboarding_done', 'true'));

    // 登录
    await p.goto(`${BASE}/login`);
    await p.waitForTimeout(500);
    await p.locator('input[type="tel"]').fill('13800138000');
    await p.locator('button:has-text("获取验证码")').click();
    await p.waitForTimeout(600);
    await p.locator('input[placeholder="验证码"]').fill('123456');
    await p.locator('button:has-text("开始挑战")').click();
    await p.waitForTimeout(2000);
    !p.url().includes('/login') ? ok('登录成功') : fail('登录成功', `仍在 ${p.url()}`);

    // 导航到积分页
    await p.goto(`${BASE}/points`);
    await p.waitForTimeout(1500);

    const checks = [
      ['积分汇总区块', 'text=积分汇总'],
      ['省钱挑战奖励', 'text=省钱挑战奖励'],
      ['积分预警区块', 'text=积分预警'],
      ['180积分即将过期', 'text=180积分即将过期'],
      ['AGENT建议区块', 'text=AGENT'],
      ['今晚烧烤双倍积分', 'text=今晚烧烤双倍积分'],
    ];
    for (const [name, sel] of checks) {
      const v = await p.locator(sel).isVisible();
      v ? ok(name) : fail(name);
    }

    // 点击汇总卡，验证折叠展开
    const cards = p.locator('.card-arcade');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      await cards.first().click();
      await p.waitForTimeout(400);
      const detail = await p.locator('text=完成8次挑战').isVisible();
      detail ? ok('点击积分卡展开详情') : fail('点击积分卡展开详情');
    }

    // 一键执行按钮
    const exec = await p.locator('button:has-text("一键执行")').first().isVisible();
    exec ? ok('一键执行按钮存在') : fail('一键执行按钮存在');

    // 边界：原有积分余额未损坏（不存在 JS error 文字）
    const noErr = !(await p.locator('text=Error').isVisible());
    noErr ? ok('页面无 JS Error 文字') : fail('页面无 JS Error 文字');

    await ctx.close();
  }

  // ════════════════════════════════════════════════
  // 4. 边界测试
  // ════════════════════════════════════════════════
  console.log('\n── 边界测试 ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    await p.evaluate(() => localStorage.setItem('koumen_onboarding_done', 'true'));
    await p.goto(`${BASE}/onboarding`);
    await p.waitForTimeout(800);
    const noError = !(await p.locator('text=404').isVisible()) && !(await p.locator('text=Error').isVisible());
    noError ? ok('直接访问 /onboarding 不崩溃') : fail('直接访问 /onboarding 不崩溃');
    await ctx.close();
  }

  await browser.close();

  // ════ 结果汇总 ════
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  console.log(`\n══════════════════════════════════`);
  console.log(`抠门大王 E2E: ${passed}/${results.length} 通过`);
  if (failed.length) {
    console.log('失败项:');
    failed.forEach(r => console.log(`  ❌ ${r.name}${r.reason ? ': ' + r.reason : ''}`));
    process.exit(1);
  }
}

run().catch(e => { console.error('❌ 运行异常:', e.message); process.exit(1); });
