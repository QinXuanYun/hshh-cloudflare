# 沪上呼呼·藕粉非遗离线 SPA 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 README.txt 需求文档，构建可离线运行的藕粉非遗 H5 SPA 应用（含 3D 预览 + 扫码）

**架构设计：** 纯前端离线 SPA，hash 路由，model-viewer 渲染 USDZ 3D 模型，jsQR 扫码，IndexedDB 持久化

**所有文件均在 `hshh/` 目录下，本地引用库（无 CDN）**

---

### Task 1: 项目骨架 — index.html + 路由引擎

**Files:**
- Create: `hshh/index.html`
- Create: `hshh/js/app.js`
- Create: `hshh/css/style.css`
- Create: `hshh/lib/` （占位，后续下载库文件）

- [ ] **Step 1: 创建 index.html**
  - HTML5 声明，viewport 适配移动端
  - 底部固定 5 导航栏（首页、工艺、伴读、研学、我的）
  - 内容区 `#app` 容器用于渲染各页面
  - 引入 `css/style.css`、`js/app.js`
  - 引入 `lib/model-viewer.min.js`、`lib/jsQR.js`（路径占位）

- [ ] **Step 2: 创建 app.js — hash 路由引擎**
  - 路由表：`#home`, `#culture`, `#craft`, `#reading`, `#profile`
  - 渲染函数 `renderPage(pageName)` → 设置 `#app.innerHTML`
  - 监听 `hashchange` 事件
  - 默认路由 `#home`
  - 每个页面渲染函数先返回占位内容（"XX页加载中"）

- [ ] **Step 3: 创建 style.css — 藕粉主题全局样式**
  - CSS 变量：`--primary: #F7E1D7`, `--bg: #FBF8F5`, `--accent: #8B7355`, `--gold: #D4B98C`, `--text: #5C4A3E`, `--title: #222222`
  - 全局 reset + 基础字体
  - 底部导航栏样式（固定底部，5 图标 tab）
  - 活动 tab 高亮

- [ ] **Step 4: 验证骨架**
  - 在浏览器中打开 `index.html`，确认路由切换正常，底部导航高亮正确

---

### Task 2: 首页 (#home) — Banner + 核心入口 + 发现藕粉 + 大师专栏 + 轮播

**Files:**
- Modify: `hshh/js/app.js`（替换首页渲染函数）
- Modify: `hshh/css/style.css`（追加首页样式）

- [ ] **Step 1: 首页 HTML 结构**
  - Banner 区：背景图（藕粉色渐变+占位图）、主标题「沪上呼呼·藕粉非遗」、副标题、探索非遗之美按钮
  - 5 核心入口：圆形图标横向排列（非遗馆、大师坊、学工坊、研学定制、活动中心）
  - 发现藕粉 4 卡片 2×2 网格（藕粉百科、藕粉地图、图案纹样、材料商城）
  - 大师专栏：左侧头像 + 右侧姓名+简介
  - 最新作品：横向轮播（预留滑动交互）

- [ ] **Step 2: 首页 CSS 样式**
  - Banner 圆角、渐变背景
  - 5 入口圆形图标 + 文字排版
  - 2×2 网格卡片（藕粉边框 + 圆角）
  - 大师专栏 flex 布局
  - 轮播容器（overflow-x: auto 滚动）

- [ ] **Step 3: 最新作品轮播交互**
  - 在 app.js 中为轮播添加 touch 滑动/点击放大预览功能

---

### Task 3: 非遗文化页 (#culture)

**Files:**
- Modify: `hshh/js/app.js`（替换文化页渲染函数）
- Modify: `hshh/css/style.css`（追加文化页样式）

- [ ] **Step 1: 文化页 HTML**
  - 4 大价值卡片（历史价值、工艺价值、人文价值、传播价值）
  - 每卡片：图标 + 标题 + 正文 + 配图 + 交互按钮（播放视频/查看详情）

- [ ] **Step 2: 文化页 CSS**
  - 卡片藕粉细边框 + 浅金装饰线
  - 2×2 排列

- [ ] **Step 3: 音视频交互**
  - 点击播放按钮 → 弹窗播放占位视频 / 音频
  - 弹窗关闭按钮

---

### Task 4: 工艺教学页 (#craft)

**Files:**
- Modify: `hshh/js/app.js`（替换工艺页渲染函数）
- Modify: `hshh/css/style.css`（追加工艺页样式）

- [ ] **Step 1: 工艺页 HTML**
  - 材料工具区：4 宫格图标（莲藕、纱布、石磨、竹匾）
  - 工艺特点区：5 标签（平、细、白、糯、纯）+ 简短释义
  - 五大工序步骤：纵向排列，一步一图一图标

- [ ] **Step 2: 工艺页 CSS**
  - 4 宫格布局
  - 5 标签横向排列（可滑动）
  - 步骤纵向 timeline 样式

---

### Task 5: 智能伴读 & 作品页 (#reading)

**Files:**
- Modify: `hshh/js/app.js`（替换伴读页渲染函数）
- Modify: `hshh/css/style.css`（追加伴读页样式）

- [ ] **Step 1: 伴读页 HTML**
  - 顶部 4 分类标签（绘本伴读、有声故事、科普视频、研学作品），可左右滑动切换
  - 默认显示绘本伴读卡片
  - 每类对应内容卡片（封面图 + 标题 + 播放/查看按钮）

- [ ] **Step 2: 伴读页 CSS + JS**
  - 分类标签横向 scroll
  - 标签切换显示对应内容
  - 点击播放 → 弹窗播放

---

### Task 6: 个人中心页 (#profile)

**Files:**
- Modify: `hshh/js/app.js`（替换个人中心渲染函数）
- Modify: `hshh/css/style.css`（追加个人中心样式）

- [ ] **Step 1: 个人中心 HTML**
  - 顶部用户信息：荷叶边框头像框 + 昵称（呼呼小匠人）
  - 功能列表：打卡勋章、我的订单、我的收藏、帮助中心、问题反馈、关于我们、在线客服
  - 每个功能：左侧图标 + 右侧文字 + 箭头

- [ ] **Step 2: 个人中心 CSS**
  - 列表样式，逐条排列
  - 头像框特殊造型

---

### Task 7: 3D 模型预览 + 扫码功能

**Files:**
- Create: `hshh/js/scanner.js`（扫码逻辑）
- Create: `hshh/assets/models/`（占位 .usdz 文件说明）
- Create: `hshh/lib/model-viewer.min.js`（下载）
- Create: `hshh/lib/jsQR.js`（下载）
- Modify: `hshh/js/app.js`（添加扫码入口 + 3D 预览页 `#viewer`）

- [ ] **Step 1: 下载 Model Viewer 和 jsQR**
  - 下载 `https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js` 到 `lib/`
  - 下载 `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js` 到 `lib/`

- [ ] **Step 2: 创建 scanner.js**
  - 调用 `getUserMedia` 打开后置摄像头
  - 每帧使用 jsQR 解析二维码
  - 匹配到 model ID 后触发路由跳转 `#viewer?model={id}`

- [ ] **Step 3: 添加 3D 预览路由 `#viewer`**
  - 使用 `<model-viewer>` 组件渲染对应 `.usdz` 文件
  - 支持 AR 预览按钮（`ar` 属性）
  - 返回按钮

- [ ] **Step 4: 页面集成入口**
  - 在首页或底部导航添加"AR 扫一扫"入口
  - 扫码成功后跳转 3D 预览

---

### Task 8: 数据持久化

**Files:**
- Create: `hshh/js/data.js`（IndexedDB 封装）
- Modify: `hshh/js/app.js`（集成数据层）

- [ ] **Step 1: 创建 data.js**
  - IndexedDB 封装：`openDB()`, `addRecord()`, `getRecords()`, `deleteRecord()`
  - 数据表：`collections`（收藏）、`badges`（打卡勋章）、`orders`（订单）
  - localStorage 封装：`getUserSetting()`, `setUserSetting()`

- [ ] **Step 2: 集成到各页面**
  - 收藏按钮 → 写 IndexedDB
  - 打卡勋章 → 读/写 IndexedDB
  - 用户昵称 → 读/写 localStorage

---

### Task 9: 离线验证 + 收尾

**Files:**
- Modify: `hshh/index.html`（最终检查）

- [ ] **Step 1: 离线测试**
  - 断网打开 `index.html`，确认所有功能正常
  - 确认 3D 模型渲染正常
  - 确认扫码功能正常（需真实摄像头）

- [ ] **Step 2: 占位图清理**
  - 确认所有图片路径使用 `placehold.co` 或本地占位图
  - 添加 README 说明替换图片的方法

- [ ] **Step 3: 最终检查**
  - 路由切换流畅
  - 底部导航 5 tab 正常
  - 各页面内容完整
