# Hshh 需求变更 · 分步实施文档

**日期**: 2026-06-02  
**来源**: `2026-06-02-10-30.txt` (9项需求)

---

## 需求变更一览

| # | 需求 | 状态 |
|---|------|------|
| 1 | 首页去除"最新作品"板块 | ✅ |
| 2 | 标题改为"沪上呼呼·幼儿非遗启蒙"，产品通过"——"拼接 | ✅ |
| 3 | "发现藕粉"等全部改为"发现" | ✅ |
| 4 | product-switcher只影响Banner，"发现""大师专栏"不再随产品切换 | ✅ |
| 5 | 非遗馆→#craft，研学内容移至工艺页底部，研学页空白后填充 | ✅ |
| 6 | 移除大师坊，替换为伴读(#reading) | ✅ |
| 7 | 我的成就默认展示徽章 | ✅ (已实现) |
| 8 | 工艺页各产品材料、特点、工序更新 | ✅ |
| 9 | 空白研学页按新研学路线内容填充 | ✅ |

---

## 实施步骤

### Step 1: index.html — 标题/品牌名称更新

- `<title>` → `沪上呼呼·幼儿非遗启蒙`
- `<meta description>` → 同步更新

### Step 2: data.js — 发现标题静态化

- `discoverTitle` 从 `'发现藕粉'` → `'发现'`（4个产品各改一处）

### Step 3: data.js — 工艺页数据更新

_藕粉_: 材料(鲜莲藕、石磨、过滤布袋、蒸笼) / 标签(白细糯滑纯) / 步骤(选藕→磨浆→过滤→沉淀→蒸煮)
_麻花_: 材料(面粉、食用油、擀面杖、面盆) / 标签(酥脆香匀巧) / 步骤(备料→揉面→醒面→扭花→炸制)
_鲜花饼_: 材料(玫瑰馅料、饼皮、模具、烤盘) / 标签(香甜酥软鲜) / 步骤(备馅→揉皮→包制→压模→烘烤)
_太谷饼_: 材料(麦粉、酥油、木模具、烤炉) / 标签(松软香酥醇) / 步骤(和面→起酥→包馅→压型→烘烤)

### Step 4: data.js — 新增 study 字段

每个产品新增 `study` 对象，含:
- `name` / `emoji` / `intro` — 研学名称与介绍
- `schedule.day1` / `schedule.day2` — 两日行程(上/下午/晚上)
- `checkpoints[]` — 4个打卡点
- `interactiveTasks[]` — 3个互动任务

### Step 5: app.js — renderHome 改造

1. Banner标题: `沪上呼呼·幼儿非遗启蒙 —— {产品名}`
2. 入口改编:
   - 非遗馆 → `#craft`
   - 大师坊 → 伴读 `📖 #reading`
   - 学工坊 → `#craft/{product}`
   - 研学定制 → `#study`
3. 发现: 遍历所有4个产品，按产品分组展示其 discover 卡片，标题固定为"发现"
4. 大师专栏: 遍历所有4个产品，各显示一位大师卡片
5. 移除"最新作品"整个 `<section>`
6. 移除 `p.discoverTitle` 等动态引用

### Step 6: app.js — renderStudy 全面重构

**列表页** (`#study`):
- 4张研学路线卡片(emoji + 名称 + 简介)
- 点击跳转 `#study/{productId}`

**详情页** (`#study/{productId}`):
- 标题与介绍
- 两日行程表(上/下午/晚上)
- 4个打卡点(编号 + 名称 + 任务)
- 3个互动任务(名称 + 可选材料列表)

### Step 7: app.js — renderCraft 追加非遗文化

在工艺步骤后追加"非遗文化·四大价值"区段:
- 遍历 `p.culture` 的4个维度(history/craft/humanity/spread)
- 复用原有的 `.culture-card` 卡片样式

### Step 8: app.js — 路由适配

- `parseHash`: `['home', 'craft', 'reading']` → `['home', 'craft', 'reading', 'study']`
- Tab切换: `productPages` 追加 `'study'`
- `renderPage` 的 `usesProduct` 已有 `'study'`，无需改动

### Step 9: style.css — 新增样式

- `.discover-all` / `.discover-group` / `.discover-group-title` — 发现产品分组
- `.masters-list` — 大师列表容器
- `.culture-grid-inline` — 工艺页内联文化网格
- `.study-route-*` — 研学列表卡片
- `.study-detail-*` — 研学详情页
- `.study-section` / `.study-day` / `.study-slot` — 行程表
- `.study-cp-*` — 打卡点
- `.study-task-*` — 互动任务

---

## 验证结果

- ✅ `node --check js/app.js` — 语法通过
- ✅ `node --check js/data.js` — 语法通过
- ✅ Braces/Parens 平衡验证
- ✅ 4个产品均含 study 字段
- ✅ Simple_backend 已在 6392 端口运行
