# 抠门大王 — 队员 UI 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 OnboardingView（首次引导滑动解锁页）并增强 PointsView（积分汇总 + 预警 + Agent 建议），保持 Arcade 黑金主题。

**Architecture:** Vue3 SFC，Arcade 主题复用现有 `globals.css` class。Onboarding 通过 localStorage flag + 路由守卫控制显示；PointsView 追加三个新区块，不删除现有内容。不改后端，Agent 建议用 hardcode mock。

**Tech Stack:** Vue3 + Vite + TypeScript + TailwindCSS (Arcade 扩展) + Vue Router 4 + Playwright MCP

**设计规格：** `docs/superpowers/specs/2026-04-25-teammate-ui-integration-design.md`

---

## 文件清单

| 操作 | 路径 | 职责 |
|------|------|------|
| **创建** | `frontend/src/views/OnboardingView.vue` | 引导页：瀑布流背景 + 滑动解锁 |
| **修改** | `frontend/src/router/index.ts` | 添加 `/onboarding` 路由 + 根路径守卫 |
| **修改** | `frontend/src/views/PointsView.vue` | 追加积分汇总/预警/Agent建议三区块 |

---

## Task 1: 建立 Worktree

- [ ] **Step 1: 创建 worktree**
```bash
cd /d/projects/抠门大王
git worktree add .worktrees/teammate-ui -b feature/teammate-ui-integration
cd .worktrees/teammate-ui/frontend && npm install
```
预期：`.worktrees/teammate-ui/` 目录存在，`npm install` 完成无报错。

- [ ] **Step 2: 确认 tailwind.config.js 存在 arcade 扩展**
```bash
grep -n "arcade" /d/projects/抠门大王/.worktrees/teammate-ui/frontend/tailwind.config.js | head -10
```
预期：看到 `arcade: { black, gold, green, red, ... }` 等颜色定义。

---

## Task 2: 创建 OnboardingView.vue

**Files:**
- Create: `frontend/src/views/OnboardingView.vue`

- [ ] **Step 1: 创建文件**

```vue
<!-- frontend/src/views/OnboardingView.vue -->
<template>
  <div class="onb-wrap">
    <div class="waterfall">
      <div v-for="col in 4" :key="col" class="wf-col" :style="{ animationDelay: `${(col-1) * -5}s` }">
        <div v-for="row in 8" :key="row" class="wf-item" :style="wfStyle(col, row)" />
      </div>
    </div>
    <div class="onb-overlay" />
    <div class="onb-center">
      <div class="onb-title title-arcade">抠门大王</div>
      <div class="onb-sub">不买立省100%</div>
    </div>
    <button class="onb-skip btn-arcade" style="position:absolute;top:16px;right:16px;padding:6px 14px;font-size:12px;" @click="finish">
      跳过
    </button>
    <div class="onb-track">
      <span class="onb-hint">向右滑动进入</span>
      <div
        class="onb-slider"
        :style="{ transform: `translateX(${sliderX}px)` }"
        @mousedown="onMD"
        @touchstart.prevent="onTS"
      >▶</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const sliderX = ref(0)
const TRACK = 280
const KNOB = 48
const MAX = TRACK - KNOB - 4

let startX = 0

const wfStyle = (col: number, row: number) => {
  const palette = ['#1a1a00','#0a1200','#001212','#180012','#1a0800']
  return {
    background: palette[(col * 3 + row) % palette.length],
    height: `${100 + row * 18}px`,
    borderRadius: '4px',
    flexShrink: 0,
  }
}

function finish() {
  localStorage.setItem('koumen_onboarding_done', 'true')
  router.replace('/')
}

function move(x: number) {
  sliderX.value = Math.max(0, Math.min(MAX, x - startX))
  if (sliderX.value / MAX >= 0.8) finish()
}

function onMD(e: MouseEvent) {
  startX = e.clientX - sliderX.value
  const mm = (ev: MouseEvent) => move(ev.clientX)
  const mu = () => { sliderX.value = 0; window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  window.addEventListener('mousemove', mm)
  window.addEventListener('mouseup', mu)
}

function onTS(e: TouchEvent) {
  startX = e.touches[0].clientX - sliderX.value
  const tm = (ev: TouchEvent) => { ev.preventDefault(); move(ev.touches[0].clientX) }
  const te = () => { sliderX.value = 0; window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te) }
  window.addEventListener('touchmove', tm, { passive: false })
  window.addEventListener('touchend', te)
}
</script>

<style scoped>
.onb-wrap {
  position: fixed; inset: 0; background: #0a0a0a;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden; z-index: 9000;
}
.waterfall {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px; overflow: hidden; pointer-events: none;
}
.wf-col {
  display: flex; flex-direction: column; gap: 4px;
  animation: wfScroll 18s linear infinite;
}
.wf-col:nth-child(even) { animation-direction: reverse; }
@keyframes wfScroll { to { transform: translateY(-50%); } }
.onb-overlay {
  position: absolute; inset: 0;
  background: rgba(10,10,10,0.78); pointer-events: none;
}
.onb-center { position: relative; text-align: center; z-index: 1; }
.onb-title {
  font-size: 2.8rem; color: #ffdd00;
  text-shadow: 0 0 24px rgba(255,221,0,0.5);
  animation: flicker 4s ease-in-out infinite;
}
.onb-sub {
  font-family: 'Courier New', monospace;
  color: #888844; font-size: 0.95rem;
  margin-top: 8px; letter-spacing: 0.25em;
}
.onb-track {
  position: absolute; bottom: 56px;
  width: 284px; height: 52px;
  border: 1px solid #333300; border-radius: 26px;
  background: #111100; display: flex; align-items: center;
  padding: 2px; z-index: 2;
}
.onb-hint {
  position: absolute; inset: 0; display: flex;
  align-items: center; justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 11px; color: #888844; letter-spacing: 0.2em;
  pointer-events: none;
}
.onb-slider {
  width: 48px; height: 44px; border-radius: 22px;
  background: #ffdd00; color: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; cursor: grab; user-select: none;
  position: relative; z-index: 3;
  box-shadow: 0 0 14px rgba(255,221,0,0.45);
}
.onb-slider:active { cursor: grabbing; }
</style>
```

- [ ] **Step 2: 提交**
```bash
cd /d/projects/抠门大王/.worktrees/teammate-ui
git add frontend/src/views/OnboardingView.vue
git commit -m "feat(onboarding): add OnboardingView — waterfall bg + swipe-to-unlock"
```

---

## Task 3: 更新 Router（添加路由 + 根路径守卫）

**Files:**
- Modify: `frontend/src/router/index.ts`

- [ ] **Step 1: 读取当前 router 文件**
```bash
cat /d/projects/抠门大王/.worktrees/teammate-ui/frontend/src/router/index.ts
```

- [ ] **Step 2: 在 routes 数组开头添加 onboarding 路由**

在 `routes` 数组的第一项（`/login`）之前插入：
```typescript
{
  path: '/onboarding',
  name: 'Onboarding',
  component: () => import('../views/OnboardingView.vue'),
},
```

- [ ] **Step 3: 在现有根路径 `/` 的 beforeEnter 守卫中添加 onboarding 检查**

找到现有路由守卫（`router.beforeEach` 或根路径 `beforeEnter`）。在认证检查**之前**插入：
```typescript
// 根路径 onboarding 检查（在 router.beforeEach 顶部追加）
if (to.path === '/' && !localStorage.getItem('koumen_onboarding_done')) {
  return { path: '/onboarding' }
}
```

若当前 `router.beforeEach` 不存在，在 `export default router` 之前添加：
```typescript
router.beforeEach((to) => {
  if (to.path === '/' && !localStorage.getItem('koumen_onboarding_done')) {
    return { path: '/onboarding' }
  }
})
```

- [ ] **Step 4: 提交**
```bash
cd /d/projects/抠门大王/.worktrees/teammate-ui
git add frontend/src/router/index.ts
git commit -m "feat(router): add /onboarding route + root-path guard"
```

---

## Task 4: 增强 PointsView.vue（三个新区块）

**Files:**
- Modify: `frontend/src/views/PointsView.vue`

- [ ] **Step 1: 读取当前 PointsView.vue 尾部（找到最后一个区块结束位置）**
```bash
tail -50 /d/projects/抠门大王/.worktrees/teammate-ui/frontend/src/views/PointsView.vue
```

- [ ] **Step 2: 在 `<template>` 内最后一个现有区块之后、`</template>` 之前，追加三个新区块**

```vue
<!-- ── 积分汇总卡 ─────────────────────────────── -->
<section class="mt-6">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-arcade-gold font-mono text-sm tracking-widest">▶ 积分汇总</h3>
  </div>
  <div class="space-y-2">
    <div
      v-for="item in pointsBreakdown"
      :key="item.source"
      class="card-arcade p-3 flex items-center justify-between"
      @click="item.expanded = !item.expanded"
    >
      <div>
        <span class="text-arcade-gold font-mono text-xs">{{ item.source }}</span>
        <div v-if="item.expanded" class="text-arcade-muted text-xs mt-1 font-mono">{{ item.detail }}</div>
      </div>
      <span class="stat-number text-arcade-green text-sm">{{ item.points }}</span>
    </div>
  </div>
</section>

<!-- ── 积分预警 ─────────────────────────────── -->
<section class="mt-6">
  <div class="flex items-center gap-2 mb-3">
    <h3 class="text-arcade-gold font-mono text-sm tracking-widest">▶ 积分预警</h3>
    <span class="text-xs font-mono text-arcade-red animate-pulse">● ALERT</span>
  </div>
  <div class="space-y-2">
    <div
      v-for="warn in pointsWarnings"
      :key="warn.id"
      class="card-arcade p-3 border-l-2 border-arcade-red"
    >
      <div class="flex items-center justify-between">
        <span class="text-arcade-red font-mono text-xs">{{ warn.label }}</span>
        <span class="text-arcade-muted font-mono text-xs">{{ warn.deadline }}</span>
      </div>
      <div class="text-xs text-arcade-muted font-mono mt-1">{{ warn.action }}</div>
    </div>
  </div>
</section>

<!-- ── Agent 建议 ─────────────────────────────── -->
<section class="mt-6 mb-20">
  <div class="flex items-center gap-2 mb-3">
    <h3 class="text-arcade-green font-mono text-sm tracking-widest">▶ AGENT 建议</h3>
    <span class="text-xs font-mono text-arcade-muted">本周最优积分行动</span>
  </div>
  <div class="space-y-3">
    <div
      v-for="tip in agentTips"
      :key="tip.id"
      class="card-arcade p-4 border border-arcade-green/30"
      style="border-color: rgba(0,255,136,0.3);"
    >
      <div class="font-mono text-xs text-arcade-green mb-2">{{ tip.title }}</div>
      <div class="text-xs text-arcade-muted font-mono mb-3">{{ tip.desc }}</div>
      <button
        class="btn-arcade text-xs px-4 py-1"
        @click="handleAgentAction(tip)"
      >
        一键执行
      </button>
    </div>
  </div>
</section>
```

- [ ] **Step 3: 在 `<script setup>` 中追加 mock 数据和 handleAgentAction**

在现有 `<script setup lang="ts">` 内，所有现有逻辑之后追加：
```typescript
import { useRouter } from 'vue-router'
const router = useRouter()

const pointsBreakdown = ref([
  { source: '省钱挑战奖励', points: 320, detail: '完成8次挑战，累计省钱¥156', expanded: false },
  { source: '情绪打卡积分', points: 180, detail: '连续签到14天', expanded: false },
  { source: '排行榜奖励',   points: 95,  detail: '本月榜单第3名', expanded: false },
  { source: '拼单补贴',     points: 50,  detail: '成功拼单3次', expanded: false },
])

const pointsWarnings = ref([
  { id: 1, label: '180积分即将过期', deadline: '剩3天', action: '立即兑换优惠券可抵¥18消费' },
  { id: 2, label: '再省¥44可升段位', deadline: '本月底', action: '完成1次30元以上挑战即可升级' },
])

const agentTips = ref([
  {
    id: 1,
    title: '⚡ 今晚烧烤双倍积分',
    desc: '参与「龙华烧烤省钱挑战」可获双倍任务积分，预计到手 +60pts',
    action: 'challenge',
    payload: '今晚烧烤 2人 预算60',
  },
  {
    id: 2,
    title: '🎯 积分兑换最优路径',
    desc: '当前积分最优兑换：翻转咖啡5折券(消耗100pt) > 立省¥15',
    action: 'external',
    payload: 'https://www.meituan.com',
  },
])

function handleAgentAction(tip: { action: string; payload: string }) {
  if (tip.action === 'challenge') {
    router.push({ path: '/', query: { prefill: tip.payload } })
  } else {
    window.open(tip.payload, '_blank')
  }
}
```

- [ ] **Step 4: 提交**
```bash
cd /d/projects/抠门大王/.worktrees/teammate-ui
git add frontend/src/views/PointsView.vue
git commit -m "feat(points): add breakdown/warning/agent-tips sections to PointsView"
```

---

## Task 5: Lint + Build 验证

- [ ] **Step 1: lint**
```bash
cd /d/projects/抠门大王/.worktrees/teammate-ui/frontend
npm run lint
```
预期：0 errors（warnings 可接受）

- [ ] **Step 2: TypeScript 类型检查**
```bash
npm run build
```
预期：Build 成功，无 TypeScript 错误。

- [ ] **Step 3: 修复任何 lint/build 错误后再提交**
```bash
git add -A && git commit -m "fix: lint and build errors"
```

---

## Task 6: Playwright E2E 测试（使用 MCP Playwright 工具直接测试）

**前提：启动服务**
```bash
# Terminal 1: 后端
cd /d/projects/抠门大王/backend && npm run start:dev

# Terminal 2: 前端 worktree
cd /d/projects/抠门大王/.worktrees/teammate-ui/frontend && npm run dev
# 运行在 http://localhost:5173
```

- [ ] **Step 1: 清除 localStorage，测试 Onboarding 桌面端完整流程**

使用 Playwright MCP 工具：
1. 导航到 `http://localhost:5173`
2. 执行 JS 清除 flag：`localStorage.removeItem('koumen_onboarding_done')`，刷新
3. 验证自动重定向到 `/onboarding`
4. 验证页面包含「不买立省100%」文字
5. 验证跳过按钮存在且可点击
6. 点击跳过按钮，验证跳转到 `/`
7. 刷新页面，验证不再出现 Onboarding（localStorage flag 已设）

- [ ] **Step 2: 测试 Onboarding 移动端（390×844）**

1. 设置视口为 390×844
2. 清除 localStorage，刷新
3. 验证滑动轨道可见
4. 模拟触摸拖动滑块到右端（使用 drag 或 run_code 执行 touch 事件）
5. 验证触发跳转

- [ ] **Step 3: 测试 PointsView 三个新区块（桌面+移动）**

1. 登录（手机号 13800138000，验证码 123456）
2. 导航到 `/points`
3. 验证「积分汇总」区块可见，包含「省钱挑战奖励」文字
4. 点击汇总卡，验证详情折叠展开
5. 验证「积分预警」区块可见，包含「180积分即将过期」
6. 验证「AGENT 建议」区块可见，包含「今晚烧烤双倍积分」
7. 点击「一键执行」，验证跳转到首页或新标签（根据 action 类型）
8. 验证原有积分余额显示未损坏

- [ ] **Step 4: 边界测试**

1. 直接访问 `/onboarding`（已完成 flag 时）：页面正常加载，不崩溃
2. PointsView Agent 建议按钮点击：不报 JS 错误

- [ ] **Step 5: 记录测试结果**

截图记录各场景，列出发现的问题（如有），在终端报告通过/失败。

---

## Task 7: Simplify 审查 + 合并

- [ ] **Step 1: 调用 simplify skill 审查改动文件**

对以下文件运行 simplify：
- `frontend/src/views/OnboardingView.vue`
- `frontend/src/router/index.ts`（改动部分）
- `frontend/src/views/PointsView.vue`（新增部分）

- [ ] **Step 2: 调用 git-merge-to-develop skill 合并**

按 git-merge-to-develop 原则将 `feature/teammate-ui-integration` 合并回 `main`。

- [ ] **Step 3: 清理 worktree**
```bash
cd /d/projects/抠门大王
git worktree remove .worktrees/teammate-ui
```

---

## 自检（Spec Coverage）

| 规格要求 | 对应任务 |
|---------|---------|
| OnboardingView 瀑布流 + 滑动解锁 | Task 2 |
| localStorage flag + 路由守卫 | Task 3 |
| PointsView 积分汇总卡 | Task 4 |
| PointsView 积分预警 | Task 4 |
| PointsView Agent 建议 + 一键执行 | Task 4 |
| lint + build 验证 | Task 5 |
| Playwright 桌面+移动端 E2E | Task 6 |
| simplify + merge | Task 7 |
