# 抠门大王 × 花爪地图集成 — 设计规格

**日期：** 2026-04-25  
**目标：** 抠门大王生成省钱挑战/情绪路线后，一键跳转到花爪 REALMAP 标签页，在 Leaflet 地图上叠加可视化路线（方案 A：地图叠层）

---

## 1. 整体架构

```
抠门大王前端 (localhost:5173)           花爪前端 (localhost:5174)
┌─────────────────────────┐             ┌────────────────────────────┐
│ ChallengeView.vue        │             │ App.jsx                    │
│  → "花爪地图" 按钮        │  URL params │  → mount 解析 ?koumen=     │
│  编码路线 JSON → base64   │ ──────────→ │  → setActiveTab('REALMAP') │
│                          │             │  → 传 externalRoute 到      │
│ EmotionView.vue           │             │    RealMap                 │
│  → 每条路线 "花爪打卡"     │             ├────────────────────────────┤
│  同上编码流程             │             │ RealMap.jsx                │
└─────────────────────────┘             │  → Leaflet Polyline 连线   │
                                        │  → 紫色编号 DivIcon 标注   │
                                        │  → 底部路线 Banner         │
                                        │  → X 关闭叠层              │
                                        └────────────────────────────┘
```

**跨域通信方案：URL params（base64 JSON）**
- 不依赖 localStorage（跨域不可用）、不需要后端中转
- 数据量：路线 3-8 站，base64 约 500-1500 字符，URL 安全
- 花爪读取后立即清除 URL 参数（保持 URL 干净）

---

## 2. 数据格式（KoumenRoute）

```typescript
interface KoumenStop {
  seq: number;       // 顺序编号 1,2,3...
  time?: string;     // "18:00" (情绪路线有，挑战路线无)
  name: string;      // 店铺/地点名
  activity: string;  // "烧烤" / "奶茶" / 活动描述
  cost: number;      // 预计消费（元）
  save?: number;     // 预计节省（元，挑战路线有）
  lat?: number;      // 可选：来自 shopMatches 的坐标
  lng?: number;
  address?: string;
}

interface KoumenRoute {
  type: 'challenge' | 'emotion';
  title: string;          // "今晚烧烤路线" / 情绪标签
  totalSave?: number;     // 挑战路线：总节省金额
  totalCost?: number;     // 情绪路线：总花费
  stops: KoumenStop[];
}
```

**传参方式：**
```
http://localhost:5174/?koumen=<btoa(JSON.stringify(KoumenRoute))>
```

---

## 3. 抠门大王前端改动

### 3.1 新建 composable：`useHuaclawMap.ts`
位置：`frontend/src/composables/useHuaclawMap.ts`

```typescript
export function openInHuaclawMap(route: KoumenRoute) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(route))));
  window.open(`http://localhost:5174/?koumen=${encoded}`, '_blank');
}
```

单一职责：编码 + 打开。`ChallengeView` 和 `EmotionView` 均调用此函数，不得在两处分别实现编码逻辑（禁止多入口原则）。

### 3.2 ChallengeView.vue 改动

**触发条件：** `challenge.tasks.length > 0 && !streaming`（任务加载完毕、非流式状态）

**数据来源：**
- `challenge.tasks[i].description` → `activity`
- `store.shopMatches[i][0]` → `name / lat / lng / address`
- `challenge.budget` → `totalSave`（节省 = 预算 - 实际花费，Demo 用估算值）

**UI：** 在"完成挑战"按钮上方插入一个次要按钮：
```
[ 🗺 在花爪地图查看路线 ]
```
样式：`border border-arcade-green text-arcade-green`（与现有 arcade 风格一致）

### 3.3 EmotionView.vue 改动

**触发条件：** `phase === 'result'`，每条 `result.routes[ri]` 卡片底部

**数据来源：** `route.stops[]`（含 `time/place/activity/estimated_cost/recommended_shops`）

**UI：** 每张路线卡片底部插入：
```
[ 🗺 花爪地图打卡 ]
```
样式与现有 `btn-arcade text-sm` 一致

---

## 4. 花爪前端改动

### 4.1 App.jsx 改动

在 `App` 组件 mount 阶段（`useEffect([], [])`）增加：

```javascript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('koumen');
  if (raw) {
    try {
      const route = JSON.parse(decodeURIComponent(escape(atob(raw))));
      setExternalRoute(route);
      setActiveTab('REALMAP');
    } catch (_) { /* 静默忽略损坏数据 */ }
    // 清除 URL 参数，不留痕迹
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

新增 state：`const [externalRoute, setExternalRoute] = useState(null);`

将 `externalRoute` 传入 `<RealMap>` 和 RESULT 阶段的 `setActiveTab('REALMAP')` 跳转。

### 4.2 RealMap.jsx 改动

**props 扩展：** 新增 `externalRoute`（nullable）

**渲染逻辑：**
1. `externalRoute` 不为 null 时，在 `MapContainer` 内追加：
   - `<Polyline>` 连接所有有坐标的 stops（若 stop 无坐标则用龙华区中心点附近偏移兜底）
   - 每个 stop 渲染一个紫色编号 `DivIcon`（同现有 `createPoiIcon` 风格）
2. 地图底部固定 `Banner`（`position:fixed bottom`）：
   ```
   🗺 [route.title]  节省 ¥XX  [X 关闭]
   ```
3. 点击 X → `setExternalRoute(null)`（传入 callback prop `onClearRoute`）

**坐标兜底策略：** stops 无坐标时，以龙华寺（31.1735, 121.4452）为锚点，按 stop 序号做 0.003° 步长偏移，保证在地图可见范围内有标记。

---

## 5. 现有 handleQuickSave 行为

`花爪 → 抠门大王` 方向（前 AI 已实现）保持不变：
```javascript
// HomePage.jsx line 147 — 不修改
const handleQuickSave = () => window.open('http://localhost:5173', '_blank');
```

新集成方向为 `抠门大王 → 花爪 REALMAP`，两条链路并行存在、互不干扰。

---

## 6. 工程规范

- **所有开发在 git worktree 中执行**（两个项目各自建 worktree，分支 `feature/huaclaw-map-integration`）
- **前端改动加载** `frontend-design` + `ui-ux-pro-max` skill
- **代码完成后** 调用 `simplify` skill 审查
- **合并** 遵循 `git-merge-to-develop` 原则
- **禁止补丁式修改**：`useHuaclawMap.ts` 是唯一编码入口，RealMap 通过 props 接收数据而非直接读 URL

---

## 7. E2E 验收标准

### 正常场景
1. 抠门大王登录（13800138000 / 123456）→ 创建挑战 → 等任务加载完毕 → 点击"花爪地图" → 花爪新标签打开、自动进入 REALMAP、叠层可见、Banner 显示标题+节省金额
2. 情绪测试完成 → 结果页点击路线卡片"花爪打卡" → 同上跳转验证
3. 关闭 Banner → 叠层消失、地图恢复正常 POI 视图

### 边界场景
1. URL 参数损坏/篡改 → 花爪静默忽略，正常打开首页，不报错
2. stops 全部无坐标 → 兜底偏移标记出现在龙华区中心，不崩溃
3. 移动端（390×844）Banner 不遮挡地图操作按钮
4. 桌面端（1280×800）叠层与现有 POI 点击互不干扰

### Playwright 测试范围
- 桌面端 + 移动端双设备
- 完整按钮/输入/跳转流程（不只截图，要实际点击验证）
- 找茬：Banner 文字是否显示正确省钱金额、标记编号是否从 1 开始、关闭后是否真正清除

---

## 8. 范围外（不做）

- 花爪内无 → 抠门大王的路线回传
- 生产环境 URL 配置（Demo 固定 localhost）
- 路线数据持久化存储
