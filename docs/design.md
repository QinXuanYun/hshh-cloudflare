# 沪上呼呼·藕粉非遗离线 SPA 设计文档

## 概述

基于 README.txt 需求，实现一个面向幼儿/家长的离线 H5 准小程序风格的 SPA 应用，主题为"沪上呼呼·藕粉非遗"，包含 5 个页面、3D 模型展示、二维码扫码匹配模型功能。

## 技术架构

- **形式**：纯前端离线 SPA（无后端服务器）
- **路由**：hash 路由 (#home, #culture, #craft, #reading, #profile)
- **3D 模型**：Google `<model-viewer>` Web Component（支持 USDZ 渲染 + AR 预览）
- **扫码**：jsQR 库 + 浏览器 `getUserMedia`
- **数据持久化**：IndexedDB（结构化数据）+ localStorage（简单 KV）
- **零依赖框架**：原生 HTML + CSS + Vanilla JS
- **离线运行**：所有库本地引入，无 CDN

## 目录结构

```
hshh/
├── index.html                ← SPA 入口
├── css/
│   └── style.css             ← 全局样式（藕粉主题）
├── js/
│   ├── app.js                ← 路由引擎 + 全局状态
│   ├── data.js               ← IndexedDB 数据层
│   ├── scanner.js            ← 扫码逻辑
│   └── pages/
│       ├── home.js           ← 首页
│       ├── culture.js        ← 非遗文化页
│       ├── craft.js          ← 工艺教学页
│       ├── reading.js        ← 智能伴读 & 作品页
│       └── profile.js        ← 个人中心页
├── assets/
│   ├── images/               ← 占位图（后续替换）
│   ├── audio/                ← 占位音频（后续替换）
│   └── models/               ← .usdz 3D 模型
└── lib/
    ├── model-viewer.min.js   ← Google Model Viewer
    └── jsQR.js               ← 二维码扫码库
```

## 5 页面功能

1. **首页 (#home)**：Banner + 5 核心入口 + 发现藕粉 4 卡片 + 大师专栏 + 最新作品轮播
2. **非遗文化页 (#culture)**：4 大价值卡片 + 音视频播放
3. **工艺教学页 (#craft)**：材料工具区 + 工艺特点 5 标签 + 5 工序步骤
4. **智能伴读页 (#reading)**：分类标签 + 4 类内容卡片
5. **个人中心页 (#profile)**：用户信息 + 功能列表（打卡/订单/收藏等）

## 全局底部导航

5 个 tab 固定：首页、工艺、伴读、研学、我的（对应 README.txt 规范）

## 扫码→3D 流程

1. 用户点击扫码按钮 → 调用 `getUserMedia` 打开摄像头
2. jsQR 从视频帧中解析二维码内容
3. 二维码内容映射到 `assets/models/{modelId}.usdz`
4. `<model-viewer>` 渲染 3D 模型，支持 AR 预览

## 数据持久化策略

| 数据类型 | 存储方案 |
|---------|---------|
| 用户设置（昵称、偏好） | localStorage |
| 打卡勋章、收藏、订单、学习记录 | IndexedDB |
| 3D 模型文件 | 本地 .usdz 文件 |

## 实施阶段

### 第一阶段：SPA 骨架
- 构建路由引擎 + 底部导航 + 页面占位切换
- 全局藕粉主题样式

### 第二阶段：5 页面内容
- 逐个实现每个页面的 HTML 结构 + CSS + 交互逻辑

### 第三阶段：功能增强
- 3D 预览（model-viewer）+ 二维码扫码（jsQR）

### 第四阶段：数据持久化
- IndexedDB 封装 + 页面数据接入

### 第五阶段：离线验证 + 收尾
- 确保无网络依赖、占位图替换流程清晰
