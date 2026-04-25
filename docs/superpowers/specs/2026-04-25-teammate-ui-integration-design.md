# 队员 UI 集成设计规格

**日期：** 2026-04-25  
**目标：** 将队员（helloswills30-cmd）设计的 React + shadcn 前端中，现有项目缺失的 2 个页面，转换为 Vue3 并以 Arcade 黑金主题集成进抠门大王项目。

---

## 1. 背景与决策

队员设计了 8 个页面（React + Tailwind v4 + shadcn/ui，暖橙色系）。经逐页比对：

| 队员页面 | 现有项目 | 决策 |
|---------|---------|------|
| Onboarding | 无 | ✅ **集成（全新增）** |
| PointsAlliance | PointsView（功能弱） | ✅ **集成（增强替换）** |
| SavingsChallenge | HomeView | 跳过 |
| SavingsRoute | ChallengeView | 跳过 |
| MoodQuiz + MoodExplore | EmotionView | 跳过 |
| Explore | MapView | 跳过 |
| MyProfile | ProfileView | 跳过 |

**集成策略（方案 B）：** 保留 Arcade 黑金主题，仅集成新增内容，所有组件转换为 Vue3 + Arcade 设计语言。

---

## 2. 页面规格

### 2.1 OnboardingView（新增路由 `/onboarding`）

**功能：** App 首次启动引导页，展示品牌视觉，用户向右滑动/点击进入主页。

**视觉设计（Arcade 主题转换）：**
- 背景：4列瀑布流图片网格（食物/消费场景图），叠加 `rgba(10,10,10,0.7)` 暗色遮罩
- 中心：品牌 logo + 标语「不买立省100%」（Arcade 金色 `#ffdd00`，flicker 动画）
- 底部：「向右滑动进入」滑动轨道组件（金色轨道 + 白色滑块），滑动到底触发路由跳转
- 字体：`ZCOOL QingKe HuangYou`（标题）+ `Courier New`（副标）
- CRT 扫描线效果（与全局一致）

**交互：**
- 滑动解锁：`touchstart/touchmove/touchend` 原生事件，滑动比例 ≥ 80% 触发
- 鼠标拖拽：PC 端支持 `mousedown/mousemove/mouseup`
- 跳过按钮：右上角文字按钮，直接跳转
- 到达后写入 `localStorage['onboarding_done'] = true`，后续访问直接跳过

**路由逻辑：**
- 路由守卫：`/` 根路径检查 `localStorage['onboarding_done']`，未完成则重定向 `/onboarding`
- 完成后跳转 `/`（HomeView）
- 无需登录认证

**文件：**
- 创建：`frontend/src/views/OnboardingView.vue`
- 修改：`frontend/src/router/index.ts`（添加路由 + 守卫逻辑）

---

### 2.2 PointsView 增强（替换现有 `/points`）

**现状分析：**  
当前 PointsView 只有：积分余额展示 + 来源拆解 + 兑换渠道解锁提示（静态）。

**队员设计的增量功能（需集成）：**
1. **跨店积分汇总卡** — 按商家/平台分组显示积分分布，支持折叠展开
2. **积分增值预警** — 高亮即将过期/可升级的积分，带倒计时
3. **Agent 建议区块** — 展示 AI 生成的「本周最优积分行动」，含一键执行按钮（发起对应挑战或跳转外链）

**视觉（保持 Arcade 主题）：**
- 积分汇总卡：`card-arcade` 样式，商家名用 `#ffdd00` 高亮，数值用 `.stat-number`（Orbitron 字体）
- 预警标签：红色 `#ff4444` 脉冲徽章（`pulseGold` 动画变体）
- Agent 建议：绿色 `#00ff88` 边框卡片，标题前加 `▶ AGENT 建议`，按钮用 `btn-arcade`

**数据来源：**
- 积分汇总：扩展 `GET /users/my-points` 响应，后端添加 `breakdown` 字段（各来源详情）
- Agent 建议：调用现有 AI 接口或静态 mock（hackathon 阶段），文案由前端 hardcode 兜底

**文件：**
- 修改：`frontend/src/views/PointsView.vue`（保留现有结构，追加 3 个新区块）
- 修改：`frontend/src/api/client.ts`（可选：扩展 `myPoints` 响应类型）

---

## 3. 技术规格

### 3.1 开发约束
- **Worktree 开发：** 在 `feature/teammate-ui-integration` 分支的 worktree 中进行
- **不修改后端：** PointsAlliance Agent 建议在 hackathon 阶段用 mock 数据，不改后端
- **不破坏现有页面：** 仅新增 OnboardingView，修改 PointsView（追加，不删除现有功能）
- **Arcade 主题严格一致：** 使用 `globals.css` 中已有的 class，不引入新的颜色变量

### 3.2 Worktree 操作
```bash
cd /d/projects/抠门大王
git worktree add .worktrees/teammate-ui -b feature/teammate-ui-integration
```

### 3.3 lint + build 验证
```bash
# 前端
cd .worktrees/teammate-ui/frontend
npm run lint && npm run build
```

### 3.4 Playwright E2E 验收标准

**OnboardingView：**
- 桌面端（1280×800）：页面加载正常，跳过按钮可点，滑块可拖至底，触发跳转
- 移动端（390×844）：触摸滑动解锁完整流程
- 边界：`localStorage['onboarding_done']` = true 时，访问 `/` 不再弹出 Onboarding
- 边界：直接访问 `/onboarding` 时不崩溃

**PointsView 增强：**
- 桌面端 + 移动端：积分汇总卡正常展示，折叠/展开交互
- 预警标签显示（mock 数据）
- Agent 建议区块展示，「一键执行」按钮点击后触发对应操作（跳转或创建挑战）
- 原有积分余额、兑换渠道功能不回归

---

## 4. 花爪（hackathon-project）

队员设计中**无花爪相关内容**，此次集成不涉及花爪项目。

---

## 5. 不在范围内

- 抠门大王后端改动（除 myPoints 响应字段类型注解外）
- 其他 6 个重叠页面的 UI 重设计
- 花爪项目任何修改
- 设计语言向暖橙色系迁移
