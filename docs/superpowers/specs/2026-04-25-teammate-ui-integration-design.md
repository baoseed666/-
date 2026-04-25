# 队员 UI 集成 + 花爪 UI 统一设计规格

**日期：** 2026-04-25  
**范围：** 抠门大王（D:/projects/抠门大王）+ 花爪（C:/Users/爆seed/hackathon-project）

---

## 1. 背景与决策

队员（helloswills30-cmd）设计了 8 个 React + shadcn/ui 页面，全部针对抠门大王，无花爪内容。

**集成决策（方案 B：保留 Arcade 主题，只集成增量）：**

| 队员页面 | 现有项目对应 | 决策 |
|---------|------------|------|
| Onboarding | 抠门大王：无；花爪：无 | ✅ 两个项目都新增 |
| PointsAlliance | PointsView（功能弱） | ✅ 抠门大王增强替换 |
| 其余 6 个页面 | 均已有对应实现 | 跳过 |

**附加需求：** 花爪整体 UI 与抠门大王统一为 Arcade 黑金风格（花爪当前为蓝/紫/粉玻璃态）。

---

## 2. 抠门大王改动规格

### 2.1 OnboardingView（新增 `/onboarding`）

**视觉：**
- 背景：4列瀑布流消费场景图 + `rgba(10,10,10,0.7)` 暗色遮罩
- 中心：品牌 logo + 标语「不买立省100%」（`#ffdd00` flicker 动画）
- 底部：滑动解锁轨道（金色轨道 + 白色滑块）
- CRT 扫描线（全局一致）

**交互：**
- 触摸/鼠标拖拽滑动，比例 ≥ 80% 触发跳转至 `/`
- 跳过按钮（右上角）直接跳转
- 完成写入 `localStorage['koumen_onboarding_done'] = true`

**路由守卫：**
- 根路径 `/` 检查 localStorage，未完成重定向 `/onboarding`
- 无需登录认证

**文件：**
- 创建：`frontend/src/views/OnboardingView.vue`
- 修改：`frontend/src/router/index.ts`

### 2.2 PointsView 增强（`/points`）

**新增三个区块（追加，不删除现有功能）：**
1. **跨店积分汇总卡** — 按来源分组，`card-arcade` 样式，数值用 `.stat-number`（Orbitron）
2. **积分增值预警** — 即将过期/可升级积分，红色 `#ff4444` 脉冲徽章
3. **Agent 建议区块** — `▶ AGENT 建议` 绿色边框卡片，「一键执行」`btn-arcade` 按钮，Hackathon 阶段 hardcode mock 数据

**文件：** 修改 `frontend/src/views/PointsView.vue`

---

## 3. 花爪改动规格

### 3.1 OnboardingView（新增）

**触发逻辑：**
- App.jsx mount 时检查 `localStorage['huaclaw_onboarding_done']`
- 未完成：渲染 OnboardingView 覆盖全屏，完成后设置 flag，切换到正常 tab 视图
- 已完成：直接进入正常 tab 视图

**视觉（Arcade 主题，与抠门大王一致）：**
- 背景：4列图片瀑布流 + `rgba(10,10,10,0.75)` 遮罩（图片用现有 `src/assets/` 内容或占位色块）
- 中心：花爪 logo + 标语「在龙华·花得值」（`#ffdd00` flicker 动画）
- 底部：同款滑动解锁轨道
- CRT 扫描线伪元素（与抠门大王统一实现）

**文件：**
- 创建：`src/Onboarding.jsx`（替换现有占位 Onboarding.jsx，内容完全重写）
- 修改：`src/App.jsx`（mount 检查逻辑）

### 3.2 花爪全局 UI Arcade 化

**目标：** 花爪视觉语言与抠门大王 Arcade 主题一致。不改业务逻辑，只改样式。

**色彩系统替换（`src/index.css` CSS 变量）：**

| 当前变量 | 当前值 | 替换为 |
|---------|-------|-------|
| `--bg-dark` | `#050505` | `#0a0a0a`（arcade-black） |
| `--accent-blue` | `#2563eb` | `#ffdd00`（arcade-gold） |
| `--accent-purple` | `#7c3aed` | `#00ff88`（arcade-green） |
| `--accent-pink` | `#db2777` | `#ff4444`（arcade-red） |
| `--glass-bg` | `rgba(255,255,255,0.03)` | `rgba(255,221,0,0.03)`（arcade-dim tint） |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(51,51,0,0.8)`（arcade-border） |

**字体替换（`src/index.css`）：**
- 正文字体：`Courier New, monospace`（移除 Outfit）
- 标题字体：引入 `ZCOOL QingKe HuangYou`（与抠门大王一致），替换 Playfair Display
- Orbitron 字体用于数字统计（`.stat-number`）

**组件样式（全局 class 调整）：**
- `.glass-panel` → 改为 Arcade card 样式：`background:#1a1a00; border:1px solid #333300; border-radius:4px`
- `.btn-primary` → 改为 arcade 按钮：`border:1px solid #ffdd00; color:#ffdd00; background:transparent; font-family:monospace`，悬停填充金色
- `.text-gradient` → 改为纯金色 `#ffdd00` + flicker 动画
- 保留所有 Framer Motion 动画，仅改颜色参数

**CRT 扫描线（`src/index.css`）：**
```css
body::after {
  content: '';
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
  );
  animation: scanline 8s linear infinite;
}
@keyframes scanline {
  0% { background-position: 0 0; }
  100% { background-position: 0 100vh; }
}
```

**地图聚类颜色（`src/mapData.js`）：**
- Cluster A：`#ffdd00`（arcade-gold，原橙色）
- Cluster B：`#00ff88`（arcade-green，原紫色）
- Cluster C：`#4488ff`（arcade-blue，保留）
- Cluster D：`#ff4444`（arcade-red，原绿色）

**文件：**
- 主改：`src/index.css`（CSS 变量 + 字体 + 全局 class + CRT）
- 小改：`src/mapData.js`（cluster 颜色）
- 按需：`src/App.css`、`src/HomePage.css` 等各页面 CSS（如有 hardcode 颜色需同步）

---

## 4. 技术约束

- **两个项目均在 Worktree 中开发**
  - 抠门大王：`git worktree add .worktrees/teammate-ui -b feature/teammate-ui-integration`
  - 花爪：`git worktree add .worktrees/ui-arcade -b feature/ui-arcade-theme`
- **不改业务逻辑**，只改视觉层
- **花爪 CSS 改动用 `replace_all_matching_properties` 方式处理跨文件颜色**，不打补丁

### lint + build
```bash
# 抠门大王前端
cd .worktrees/teammate-ui/frontend && npm run lint && npm run build

# 花爪
cd .worktrees/ui-arcade && npm run lint && npm run build
```

### Playwright E2E 验收（两个项目都走）

**Onboarding（两项目共同）：**
- 桌面（1280×800）+ 移动（390×844）：滑动解锁完整流程、跳过按钮、完成后不再出现
- 边界：localStorage 已设时直接进主界面

**抠门大王 PointsView：**
- 桌面+移动：三个新区块正常显示，折叠交互，Agent 建议按钮触发跳转
- 回归：原积分余额、兑换渠道功能不受影响

**花爪 UI 一致性：**
- 各页面主色 `#ffdd00` 正确渲染（无遗留蓝/紫色）
- CRT 扫描线可见
- Arcade 卡片样式无错位、文字无挤压
- 地图 cluster 颜色正确
- 全页面交互流程完整走一遍（情绪测试→结果→地图→积分→个人中心）

---

## 5. 不在范围内

- 抠门大王后端改动
- 花爪接入任何新 API
- 抠门大王其余 6 个重叠页面 UI 重设计
