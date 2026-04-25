# 花爪地图集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 抠门大王生成路线后，一键跳转花爪 REALMAP 标签页，在 Leaflet 地图上叠加路线（虚线+编号标记+底部 Banner）

**Architecture:** 抠门大王前端新增 `useHuaclawMap.ts` composable（唯一编码入口），将 KoumenRoute 序列化为 base64 JSON 写入 URL params；花爪 App.jsx mount 时读取 URL params 并传入 RealMap；RealMap 渲染 Leaflet Polyline + 紫色 DivIcon + 固定底部 Banner。

**Tech Stack:** 抠门大王：Vue3 + TypeScript + Vite（port 5173）；花爪：React + Vite + react-leaflet（port 5174）；测试：Playwright（已配置）

**设计规格：** `D:/projects/抠门大王/docs/superpowers/specs/2026-04-25-huaclaw-map-integration-design.md`

---

## 文件清单

| 操作 | 路径 | 职责 |
|------|------|------|
| **创建** | `frontend/src/composables/useHuaclawMap.ts` | KoumenRoute 编码 + window.open，唯一入口 |
| **修改** | `frontend/src/views/ChallengeView.vue` | 添加"花爪地图"按钮 + 数据组装 |
| **修改** | `frontend/src/views/EmotionView.vue` | 每条路线卡片添加"花爪打卡"按钮 |
| **修改** | `hackathon-project/src/App.jsx` | mount 解析 URL params → externalRoute state |
| **修改** | `hackathon-project/src/RealMap.jsx` | 接收 externalRoute → Polyline + DivIcon + Banner |
| **创建** | `frontend/e2e/huaclaw-map.spec.ts` | Playwright E2E 测试 |

---

## Task 1: 建立 Git Worktree（两个项目）

**Files:** 无代码修改，仅 worktree 操作

- [ ] **Step 1: 抠门大王项目建 worktree**

```bash
cd /d/projects/抠门大王
echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: ignore worktrees dir" 2>/dev/null || true
git worktree add .worktrees/map-integration -b feature/huaclaw-map-integration
cd .worktrees/map-integration/frontend && npm install
```

- [ ] **Step 2: 花爪项目建 worktree**

```bash
cd /c/Users/爆seed/hackathon-project
git check-ignore -q .worktrees || echo ".worktrees/" >> .gitignore
git add .gitignore 2>/dev/null; git commit -m "chore: ignore worktrees dir" 2>/dev/null || true
git worktree add .worktrees/map-integration -b feature/huaclaw-map-integration
cd .worktrees/map-integration && npm install
```

---

## Task 2: 创建 `useHuaclawMap.ts` composable

**Files:**
- Create: `D:/projects/抠门大王/.worktrees/map-integration/frontend/src/composables/useHuaclawMap.ts`

- [ ] **Step 1: 创建文件**

```typescript
// frontend/src/composables/useHuaclawMap.ts
export interface KoumenStop {
  seq: number;
  time?: string;
  name: string;
  activity: string;
  cost: number;
  save?: number;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface KoumenRoute {
  type: 'challenge' | 'emotion';
  title: string;
  totalSave?: number;
  totalCost?: number;
  stops: KoumenStop[];
}

const HUACLAW_ORIGIN = 'http://localhost:5174';

export function openInHuaclawMap(route: KoumenRoute): void {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(route))));
  window.open(`${HUACLAW_ORIGIN}/?koumen=${encoded}`, '_blank');
}
```

- [ ] **Step 2: 提交**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration
git add frontend/src/composables/useHuaclawMap.ts
git commit -m "feat(koumen): add useHuaclawMap composable — encode route to HuaClaw URL"
```

---

## Task 3: ChallengeView.vue — 添加"花爪地图"按钮

**Files:**
- Modify: `D:/projects/抠门大王/.worktrees/map-integration/frontend/src/views/ChallengeView.vue`

**注意：** 加载 `frontend-design` + `ui-ux-pro-max` skill 辅助前端设计。

- [ ] **Step 1: 在 `<script setup>` 顶部添加 import**

在现有 import 块末尾追加：
```typescript
import { openInHuaclawMap, type KoumenRoute } from '../composables/useHuaclawMap';
```

- [ ] **Step 2: 添加 `handleOpenHuaclawMap` 函数**

在 `<script setup>` 中，`completeTask` 函数之后插入：
```typescript
function handleOpenHuaclawMap() {
  const stops = (challenge.value?.tasks ?? []).map((task, i) => {
    const shop = store.shopMatches[i]?.[0];
    return {
      seq: i + 1,
      name: shop?.name ?? task.description.slice(0, 20),
      activity: task.description,
      cost: shop?.avgPrice ?? 0,
      save: shop ? Math.round((shop.avgPrice ?? 0) * 0.2) : undefined,
      lat: shop?.lat ?? undefined,
      lng: shop?.lng ?? undefined,
      address: shop?.address ?? undefined,
    };
  });

  const route: KoumenRoute = {
    type: 'challenge',
    title: challenge.value?.input_text?.slice(0, 30) ?? '省钱挑战路线',
    totalSave: stops.reduce((s, p) => s + (p.save ?? 0), 0) || undefined,
    stops,
  };
  openInHuaclawMap(route);
}
```

- [ ] **Step 3: 在模板中添加按钮**

在 `<!-- Complete button -->` 区块的 `<button @click="showCompleteModal = true">` **之前**插入（保持在同一 `fixed bottom` div 内）：

```html
<button
  v-if="challenge?.tasks?.length && !streaming"
  @click="handleOpenHuaclawMap"
  class="btn-arcade w-full justify-center text-sm mb-2 border-arcade-green text-arcade-green"
  style="background:transparent;"
>
  🗺 在花爪地图查看路线
</button>
```

- [ ] **Step 4: 检查 `ShopRecommendation` 类型是否含 lat/lng**

```bash
grep -n "lat\|lng" /d/projects/抠门大王/frontend/src/components/shop/ShopCard.vue | head -10
```

若 `ShopRecommendation` 无 `lat/lng` 字段，`shop?.lat` 会是 `undefined`，符合兜底逻辑，无需修改类型。

- [ ] **Step 5: 提交**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration
git add frontend/src/views/ChallengeView.vue
git commit -m "feat(challenge): add HuaClaw map button after tasks load"
```

---

## Task 4: EmotionView.vue — 添加"花爪打卡"按钮

**Files:**
- Modify: `D:/projects/抠门大王/.worktrees/map-integration/frontend/src/views/EmotionView.vue`

**注意：** 加载 `frontend-design` + `ui-ux-pro-max` skill。

- [ ] **Step 1: 添加 import**

在现有 import 块末尾追加：
```typescript
import { openInHuaclawMap, type KoumenRoute } from '../composables/useHuaclawMap';
```

- [ ] **Step 2: 添加 `handleEmotionCheckin` 函数**

在 `<script setup>` 中 `handleCheckin` 函数**之后**插入：
```typescript
function handleOpenHuaclawMapEmotion(route: typeof result.value.routes[number]) {
  const stops = route.stops.map((stop, i) => ({
    seq: i + 1,
    time: stop.time,
    name: stop.recommended_shops?.[0]?.name ?? stop.place,
    activity: stop.activity,
    cost: stop.estimated_cost,
    address: stop.recommended_shops?.[0]?.address ?? undefined,
  }));

  const kr: KoumenRoute = {
    type: 'emotion',
    title: route.title,
    totalCost: route.total_cost,
    stops,
  };
  openInHuaclawMap(kr);
}
```

- [ ] **Step 3: 在模板中每张路线卡片底部添加按钮**

找到 `<button @click="handleCheckin(ri)"` 这一行，在其**之前**（同一 `v-if="expandedRoute === ri"` 区块内）插入：

```html
<button
  @click="handleOpenHuaclawMapEmotion(route)"
  class="btn-arcade text-sm w-full justify-center mt-2"
  style="border-color:rgba(16,185,129,0.5);color:#10b981;background:transparent;"
>
  🗺 花爪地图打卡
</button>
```

- [ ] **Step 4: 提交**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration
git add frontend/src/views/EmotionView.vue
git commit -m "feat(emotion): add HuaClaw map checkin button on each route card"
```

---

## Task 5: 花爪 App.jsx — URL 解析 + externalRoute state

**Files:**
- Modify: `C:/Users/爆seed/hackathon-project/.worktrees/map-integration/src/App.jsx`

- [ ] **Step 1: 添加 externalRoute state**

在现有 state 声明区（`const [emotionPoints...` 附近）末尾追加：
```javascript
const [externalRoute, setExternalRoute] = useState(null);
```

- [ ] **Step 2: mount 时解析 URL 参数**

在 `App` 函数体内，所有 state 声明之后，`boostAlignment` 函数之前插入：
```javascript
useEffect(() => {
  const raw = new URLSearchParams(window.location.search).get('koumen');
  if (!raw) return;
  try {
    setExternalRoute(JSON.parse(decodeURIComponent(escape(atob(raw)))));
    setActiveTab('REALMAP');
  } catch (_) {
    // 静默忽略损坏数据
  }
  window.history.replaceState({}, '', window.location.pathname);
}, []);
```

- [ ] **Step 3: 将 externalRoute 传入 RealMap**

找到现有 `<RealMap` 使用位置（REALMAP tab，约第 514 行），在其 props 中加入：
```jsx
<RealMap
  onClose={() => { setActiveTab('HOME'); setEmotionSub('LANDING'); }}
  focusId={focusNodeId}
  onOpenDashboard={() => { setActiveTab('HOME'); setEmotionSub('DASHBOARD'); }}
  persona={persona}
  externalRoute={externalRoute}
  onClearRoute={() => setExternalRoute(null)}
/>
```

- [ ] **Step 4: 提交**

```bash
cd /c/Users/爆seed/hackathon-project/.worktrees/map-integration
git add src/App.jsx
git commit -m "feat(app): parse koumen URL param and route to REALMAP with external route"
```

---

## Task 6: 花爪 RealMap.jsx — 叠层渲染

**Files:**
- Modify: `C:/Users/爆seed/hackathon-project/.worktrees/map-integration/src/RealMap.jsx`

**注意：** 加载 `frontend-design` + `ui-ux-pro-max` skill。

龙华区中心锚点（兜底坐标）：`[31.1735, 121.4452]`

- [ ] **Step 1: 添加 Polyline import**

在现有 react-leaflet import 行末尾添加 `Polyline`：
```javascript
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Polyline } from 'react-leaflet';
```

- [ ] **Step 2: 更新函数签名，接收新 props**

```javascript
export default function RealMap({ onClose, focusId, onOpenDashboard, externalRoute, onClearRoute }) {
```

- [ ] **Step 3: 添加 resolveStopPositions 函数（组件外部）**

在 `export default function RealMap` **之前**插入（保持与现有 `createPoiIcon`、`ClusterBadge` 同层）：

```javascript
const LONGHUA_CENTER = [31.1735, 121.4452];

function resolveStopPositions(stops) {
  return stops.map((stop, i) => {
    if (stop.lat && stop.lng) return [stop.lat, stop.lng];
    return [LONGHUA_CENTER[0] + i * 0.003, LONGHUA_CENTER[1] + i * 0.003];
  });
}

function createExternalStopIcon(seq) {
  return L.divIcon({
    className: 'external-stop-marker',
    html: `<div style="
      width:26px;height:26px;
      background:#7c3aed;
      border:2px solid #ffffffcc;
      border-radius:50%;
      box-shadow:0 0 12px #7c3aed88,0 0 24px #7c3aed44;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:11px;font-weight:bold;
    ">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}
```

- [ ] **Step 4: 在 MapContainer 内渲染叠层**

找到 `<MapContainer` 内的 `<FitBounds pois={filteredPois} />` 这一行，在其**之后**追加：

```jsx
{externalRoute && (() => {
  const positions = resolveStopPositions(externalRoute.stops);
  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{ color: '#ffdd00', weight: 2.5, dashArray: '8 5', opacity: 0.85 }}
      />
      {externalRoute.stops.map((stop, i) => (
        <Marker key={i} position={positions[i]} icon={createExternalStopIcon(stop.seq)}>
          <Tooltip permanent={false} direction="top">
            <span style={{ fontSize: '12px' }}>
              {stop.time ? `${stop.time} · ` : ''}{stop.name}<br />
              {stop.activity}{stop.save ? ` · 省 ¥${stop.save}` : ''}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
})()}
```

- [ ] **Step 5: 添加底部 Banner**

在 `</div>` 最外层关闭标签之前（`real-map-container` div 内），追加：

```jsx
{externalRoute && (
  <div style={{
    position: 'fixed', bottom: '72px', left: 0, right: 0,
    background: 'rgba(10,10,20,0.92)',
    borderTop: '1px solid rgba(124,58,237,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', zIndex: 1000,
    gap: '8px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      <span style={{ fontSize: '14px' }}>🗺</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#ffdd00', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {externalRoute.title}
        </div>
        <div style={{ color: '#10b981', fontSize: '11px' }}>
          {externalRoute.totalSave
            ? `预计节省 ¥${externalRoute.totalSave}`
            : externalRoute.totalCost
              ? `预计花费 ¥${externalRoute.totalCost}`
              : `${externalRoute.stops.length} 个站点`}
        </div>
      </div>
    </div>
    <button
      onClick={onClearRoute}
      style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', flexShrink: 0 }}
    >
      ✕ 关闭
    </button>
  </div>
)}
```

- [ ] **Step 6: 提交**

```bash
cd /c/Users/爆seed/hackathon-project/.worktrees/map-integration
git add src/RealMap.jsx
git commit -m "feat(realmap): render external KoumenRoute overlay — polyline + markers + banner"
```

---

## Task 7: Playwright E2E 测试

**Files:**
- Create: `D:/projects/抠门大王/.worktrees/map-integration/frontend/e2e/huaclaw-map.spec.ts`

**前提：** 抠门大王后端 (3000)、前端 (5173)、花爪 (5174) 三个服务同时运行。

- [ ] **Step 1: 创建测试文件**

```typescript
// frontend/e2e/huaclaw-map.spec.ts
import { test, expect, chromium } from '@playwright/test';

const KOUMEN_URL = 'http://localhost:5173';
const HUACLAW_URL = 'http://localhost:5174';

// ─── 登录 helper ──────────────────────────────────────────
async function login(page: import('@playwright/test').Page) {
  await page.goto(`${KOUMEN_URL}/login`);
  await page.getByPlaceholder(/手机号/).fill('13800138000');
  await page.getByRole('button', { name: /发送验证码/ }).click();
  await page.getByPlaceholder(/验证码/).fill('123456');
  await page.getByRole('button', { name: /登录/ }).click();
  await expect(page).toHaveURL(/\//);
}

// ─── Suite 1: 挑战路线 → 花爪地图 ────────────────────────
test.describe('ChallengeView → HuaClaw Map', () => {
  test('桌面端：挑战完成后可跳转到花爪地图且叠层可见', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);

    // 创建挑战
    await page.goto(`${KOUMEN_URL}/`);
    await page.getByPlaceholder(/今天想省钱|想干嘛|输入/).first().fill('今晚烧烤 2人 预算60');
    await page.getByRole('button', { name: /开始省钱|生成挑战/ }).first().click();

    // 等待任务加载
    await expect(page.getByTestId('task-card').first()).toBeVisible({ timeout: 30000 });

    // 花爪地图按钮可见
    const mapBtn = page.getByRole('button', { name: /花爪地图/ });
    await expect(mapBtn).toBeVisible();

    // 点击后打开新标签
    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      mapBtn.click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');

    // 花爪自动进入 REALMAP 并显示 Banner
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });
    await expect(huaclawPage.locator('text=省钱').or(huaclawPage.locator('text=站点'))).toBeVisible();

    // URL 参数已被清除
    expect(huaclawPage.url()).not.toContain('koumen=');

    // 关闭 Banner
    await huaclawPage.getByRole('button', { name: /✕ 关闭/ }).click();
    await expect(huaclawPage.locator('text=预计节省').or(huaclawPage.locator('text=预计花费'))).not.toBeVisible();

    await ctx.close();
  });

  test('移动端（390×844）：跳转后 Banner 不遮挡地图操作', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${KOUMEN_URL}/`);
    await page.getByPlaceholder(/今天想省钱|想干嘛|输入/).first().fill('下午茶 1人 预算30');
    await page.getByRole('button', { name: /开始省钱|生成挑战/ }).first().click();
    await expect(page.getByTestId('task-card').first()).toBeVisible({ timeout: 30000 });

    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      page.getByRole('button', { name: /花爪地图/ }).click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });

    // Banner 不遮挡筛选按钮（筛选按钮仍可点击）
    const filterBtn = huaclawPage.getByRole('button', { name: /筛选/ });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    await expect(huaclawPage.locator('.filter-panel')).toBeVisible();

    await ctx.close();
  });
});

// ─── Suite 2: 情绪路线 → 花爪地图 ────────────────────────
test.describe('EmotionView → HuaClaw Map', () => {
  test('桌面端：情绪结果路线卡片"花爪打卡"按钮可用', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${KOUMEN_URL}/emotion`);
    // 选快速版
    await page.getByRole('button', { name: /快速版/ }).click();
    // 回答所有问题（选每题第一个选项）
    const questions = page.locator('.card-arcade').filter({ hasText: /\. / });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator('button').first().click();
    }
    await page.getByRole('button', { name: /开始情绪分析/ }).click();
    await expect(page.locator('text=为你推荐')).toBeVisible({ timeout: 20000 });

    // 展开第一条路线
    await page.locator('.card-arcade').filter({ hasText: /¥/ }).first().click();

    // 花爪打卡按钮可见
    const checkinBtn = page.getByRole('button', { name: /花爪地图打卡/ }).first();
    await expect(checkinBtn).toBeVisible();

    // 点击后新标签打开花爪
    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      checkinBtn.click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });

    // Banner 应显示路线名称
    const bannerTitle = huaclawPage.locator('[style*="ffdd00"]').filter({ hasText: /.+/ }).first();
    await expect(bannerTitle).toBeVisible();
    const titleText = await bannerTitle.textContent();
    expect(titleText?.length).toBeGreaterThan(2);

    await ctx.close();
  });

  test('移动端（390×844）：情绪路线跳转花爪地图', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
    const [huaclawPage] = await Promise.all([
      ctx.waitForEvent('page'),
      page.getByRole('button', { name: /花爪地图打卡/ }).first().click(),
    ]);
    await huaclawPage.waitForLoadState('domcontentloaded');
    await expect(huaclawPage.locator('text=🗺')).toBeVisible({ timeout: 10000 });

    await ctx.close();
  });
});

// ─── Suite 3: 边界场景 ────────────────────────────────────
test.describe('边界场景', () => {
  test('URL 参数损坏 → 花爪静默打开首页不报错', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${HUACLAW_URL}/?koumen=INVALID_BASE64!!!`);
    await page.waitForLoadState('domcontentloaded');

    // 不应跳到 REALMAP，不应有 JS 报错
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1500);
    expect(errors.filter(e => !e.includes('leaflet'))).toHaveLength(0);

    // URL 参数应已被清除
    expect(page.url()).not.toContain('koumen=');
    await ctx.close();
  });

  test('stops 全部无坐标 → 兜底偏移标记出现在龙华区，不崩溃', async ({ browser }) => {
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
    const encoded = Buffer.from(encodeURIComponent(JSON.stringify(route))).toString('base64');
    await page.goto(`${HUACLAW_URL}/?koumen=${encoded}`);
    await page.waitForLoadState('domcontentloaded');

    // Banner 出现
    await expect(page.locator('text=无坐标测试路线')).toBeVisible({ timeout: 10000 });
    // 地图加载（canvas 或 leaflet tile 可见）
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 8000 });

    await ctx.close();
  });
});
```

- [ ] **Step 2: 验证测试可运行（不要求 pass，先确认语法正确）**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration/frontend
npx playwright test e2e/huaclaw-map.spec.ts --list
```

预期输出：列出所有测试名称，无语法错误

- [ ] **Step 3: 启动三个服务，执行测试**

```bash
# Terminal 1: 抠门大王后端
cd /d/projects/抠门大王/backend && npm run start:dev

# Terminal 2: 抠门大王前端（worktree）
cd /d/projects/抠门大王/.worktrees/map-integration/frontend && npm run dev

# Terminal 3: 花爪（worktree）
cd /c/Users/爆seed/hackathon-project/.worktrees/map-integration && npm run dev

# Terminal 4: 执行测试
cd /d/projects/抠门大王/.worktrees/map-integration/frontend
npx playwright test e2e/huaclaw-map.spec.ts --reporter=line
```

预期：7 个测试全部 PASS

- [ ] **Step 4: 提交**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration
git add frontend/e2e/huaclaw-map.spec.ts
git commit -m "test(e2e): HuaClaw map integration — challenge/emotion/edge cases, desktop+mobile"
```

---

## Task 8: Simplify 审查 + Lint/Build + 合并

- [ ] **Step 1: 调用 Simplify skill 审查改动文件**

对以下文件调用 `simplify` skill：
- `useHuaclawMap.ts`
- `ChallengeView.vue`（改动部分）
- `EmotionView.vue`（改动部分）
- `App.jsx`（改动部分）
- `RealMap.jsx`（改动部分）

- [ ] **Step 2: 抠门大王前端 lint + build**

```bash
cd /d/projects/抠门大王/.worktrees/map-integration/frontend
npm run build
```

预期：无 TypeScript 错误，build 成功

- [ ] **Step 3: 花爪 lint + build**

```bash
cd /c/Users/爆seed/hackathon-project/.worktrees/map-integration
npm run build
```

预期：无错误，build 成功

- [ ] **Step 4: 调用 `git-merge-to-develop` skill 合并两个项目**

按照 git-merge-to-develop 原则，将 `feature/huaclaw-map-integration` 分支合并回 `main`（或 `dev`）。

- [ ] **Step 5: 清理 worktrees**

```bash
cd /d/projects/抠门大王 && git worktree remove .worktrees/map-integration
cd /c/Users/爆seed/hackathon-project && git worktree remove .worktrees/map-integration
```

---

## 自检（Spec Coverage）

| 规格要求 | 对应任务 |
|----------|---------|
| useHuaclawMap 唯一编码入口 | Task 2 |
| ChallengeView 花爪按钮 | Task 3 |
| EmotionView 每条路线打卡按钮 | Task 4 |
| App.jsx URL 解析 + setActiveTab | Task 5 |
| RealMap Polyline + 编号标记 | Task 6 |
| 底部 Banner + 关闭按钮 | Task 6 |
| 无坐标兜底偏移 | Task 6 |
| URL 清除 | Task 5 |
| E2E 桌面+移动端 | Task 7 |
| 边界场景（损坏参数/无坐标）| Task 7 |
| Simplify + lint + build | Task 8 |
| git-merge-to-develop | Task 8 |
