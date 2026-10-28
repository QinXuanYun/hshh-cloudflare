# hshh 页面设计改造 — 设计规格书

## 一、路由架构（方案 B：产品子路由）

### 1.1 路由表

| 路由 | 页面 | 是否依赖产品 |
|---|---|---|
| `#home/{product}` | 首页（Banner + 功能图标 + 四大价值 + 大师 + 作品） | ✅ |
| `#craft/{product}` | 工艺教学（材料工具 + 5个步骤） | ✅ |
| `#reading/{product}` | 智能伴读（4 个 Tab） | ✅ |
| `#study` | 研学（各产品作品汇总） | ❌ |
| `#profile` | 个人中心 | ❌ |
| `#viewer?model={id}` | 3D 模型预览 | ❌ |
| `#scan` | 二维码扫描 | ❌ |

### 1.2 默认路由

首次访问 → `#home/oufen`（默认展示藕粉）。

### 1.3 底部导航栏

保持 5 个 Tab，href 改为带 product 参数：

```
首页  → #home/{product}
工艺  → #craft/{product}
伴读  → #reading/{product}
研学  → #study           ← 不依赖产品
我的  → #profile          ← 不依赖产品
```

---

## 二、产品数据（4 款）

### 2.1 基本信息

```javascript
var PRODUCTS = {
  oufen: {
    id: 'oufen',
    name: '藕粉',
    emoji: '🌸',
    subtitle: '带孩子探索非遗之美',
    desc: '传统藕粉制作，体验手冲藕粉的乐趣',
    colors: {
      primary: '#F7E1D7',   // 藕粉色
      accent: '#8B7355',    // 棕茶色
      gold: '#D4B98C',      // 浅金色
      light: '#FBF8F5'      // 米白底
    },
    productTag: '藕粉·幼儿非遗'
  },
  mahua: {
    id: 'mahua',
    name: '麻花',
    emoji: '🥨',
    subtitle: '百年手艺，一捻成型',
    desc: '天津麻花制作技艺，搓出金黄酥脆',
    colors: {
      primary: '#D4A06A',   // 焦糖棕
      accent: '#8B6914',    // 深褐
      gold: '#E8C87A',      // 金黄
      light: '#FDF6EC'      // 暖米白
    },
    productTag: '麻花·幼儿非遗'
  },
  rosecake: {
    id: 'rosecake',
    name: '鲜花饼',
    emoji: '🌹',
    subtitle: '花香入饼，酥甜相宜',
    desc: '云南鲜花饼制作，以花入馔的传统点心',
    colors: {
      primary: '#F0C4C4',   // 淡玫瑰粉
      accent: '#C48A8A',    // 玫瑰褐
      gold: '#E8B4B4',      // 粉金
      light: '#FEF0F0'      // 淡粉底
    },
    productTag: '鲜花饼·幼儿非遗'
  },
  taigubing: {
    id: 'taigubing',
    name: '太谷饼',
    emoji: '🫓',
    subtitle: '枣香浓郁，甜而不腻',
    desc: '山西太谷饼，百年传承的炉烤技艺',
    colors: {
      primary: '#E8C87A',   // 暖土黄
      accent: '#A08040',    // 土褐
      gold: '#F0D898',      // 麦金
      light: '#FEF8E8'      // 淡黄底
    },
    productTag: '太谷饼·幼儿非遗'
  }
};
```

### 2.2 主题色体系

| 产品 | 主色 primary | 强调色 accent | 金色 gold | 底色 light |
|------|-------------|--------------|----------|-----------|
| 藕粉 | #F7E1D7 | #8B7355 | #D4B98C | #FBF8F5 |
| 麻花 | #D4A06A | #8B6914 | #E8C87A | #FDF6EC |
| 鲜花饼 | #F0C4C4 | #C48A8A | #E8B4B4 | #FEF0F0 |
| 太谷饼 | #E8C87A | #A08040 | #F0D898 | #FEF8E8 |

---

## 三、首页 `#home/{product}`

### 3.1 产品切换标签

Banner 上方增加横向滑动产品标签：

```
[ 🌸 藕粉 ] [ 🥨 麻花 ] [ 🌹 鲜花饼 ] [ 🫓 太谷饼 ]
```

- 当前激活标签加粗 / 下划线 / 主题色高亮
- 点击后切换到对应的 `#home/{product}`，全局换色

### 3.2 Banner 区域

- 标题动态：`沪上呼呼·{产品名}非遗`
- 副标题、Banner 图片（可用 placehold + 主题色）都按产品替换

### 3.3 功能图标栏

- 5 个入口保持（非遗馆 / 大师坊 / 手工坊 / 研学 / 活动）
- 图标样式根据主题色微调 hover/active 色

### 3.4 四大价值模块（原「发现非遗模块」）

固定结构，内容按产品定制：

```
┌─ 四大价值 ─────────────────────────┐
│                                      │
│  📜 历史价值    🔧 工艺价值        │
│  该非遗的历史渊源…  工艺独特性描述…   │
│                                      │
│  👨‍👩‍👧 人文价值    📡 传播价值        │
│  人文关怀表达…    现代传播方式…       │
│                                      │
└──────────────────────────────────────┘
```

### 3.5 大师专栏 + 最新作品

- 保持现有卡片列表结构
- 内容可考虑按产品过滤（或保持跨产品展示）

### 3.6 AR 扫一扫入口

- 保持，不依赖产品

---

## 四、工艺教学 `#craft/{product}`

### 4.1 页面结构

```
┌─ 顶部：返回 + 产品名称 ─────────────┐
│  ← 首页  |  藕粉·工艺教学            │
├─ 材料工具 ──────────────────────────┤
│  [ 藕粉 200g ] [ 碗 ] [ 勺 ] …      │
├─ 工艺特色 ──────────────────────────┤
│  一句话描述该工艺的特色              │
├─ 制作步骤（5 步） ──────────────────┤
│  Step 1：准备材料                    │
│  Step 2：……                          │
│  Step 3：……                          │
│  Step 4：……                          │
│  Step 5：完成！                      │
└──────────────────────────────────────┘
```

### 4.2 产品专属数据示例

**藕粉 5 步骤：**
1. 准备藕粉、凉水、开水、碗勺
2. 先用少量凉水化开藕粉
3. 冲入滚烫开水快速搅拌
4. 搅拌至透明糊状
5. 加入桂花/蜂蜜调味

**麻花 5 步骤：**
1. 准备面粉、鸡蛋、糖、油
2. 和面醒发
3. 搓条拧成麻花
4. 油锅炸至金黄
5. 控油晾凉

**鲜花饼 5 步骤：**
1. 准备面粉、玫瑰酱、猪油
2. 制作油皮和油酥
3. 包馅成型
4. 烤箱烘烤
5. 出炉晾凉

**太谷饼 5 步骤：**
1. 准备面粉、枣泥、糖稀
2. 和面揉匀
3. 分剂包枣泥
4. 压扁沾芝麻
5. 炉烤至金黄

---

## 五、智能伴读 `#reading/{product}`

### 5.1 页面结构

```
┌─ 顶部：返回 + 产品名称 ─────────────┐
│  ← 首页  |  藕粉·智能伴读            │
├─ 4 个分类 Tab ──────────────────────┤
│  [ 绘本伴读 ] [ 有声故事 ] [ 科普视频 ] [ 研学作品 ] │
├─ 内容区域 ──────────────────────────┤
│  （根据 Tab 展示对应内容卡片列表）     │
└──────────────────────────────────────┘
```

### 5.2 每个产品的内容

每个产品都需要 4 个 Tab 的内容（每条含：标题、封面图占位、简介、链接或资源 id）：

**藕粉：**
- 绘本伴读：3-5 本与藕粉/非遗相关的绘本
- 有声故事：藕粉传说、非遗小故事
- 科普视频：藕粉制作过程科普
- 研学作品：藕粉手工作品展示

**麻花 / 鲜花饼 / 太谷饼：**
类似结构，内容按产品替换。

### 5.3 数据格式

```javascript
readingContent: {
  pictureBook: [
    { title: '绘本标题', cover: '封面图url', summary: '简介' }
  ],
  audioStory: [
    { title: '故事标题', cover: '封面', audioUrl: '音频资源' }
  ],
  scienceVideo: [
    { title: '视频标题', cover: '封面', videoUrl: '视频资源' }
  ],
  studyWork: [
    { title: '作品标题', cover: '封面', author: '小作者' }
  ]
}
```

---

## 六、研学 `#study` （通用）

保持现有研学页，展示所有产品的研学作品 / 活动，不做产品依赖。

---

## 七、个人中心 `#profile` （通用）

保持现有个人中心，展示积分、徽章、收藏等，不按产品拆分。

---

## 八、实现策略

### 8.1 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `js/data.js` | ✅ 新增 | 添加 `PRODUCTS` 数据对象，按产品分离所有内容 |
| `js/app.js` | 🔄 重写路由部分 | 解析 `#page/product` 格式，所有渲染函数接受 product 参数 |
| `index.html` | 🔄 更新 | 底部导航 href、页面标题动态化 |
| `css/style.css` | 🔄 扩展 | 新增产品颜色变量、产品切换标签样式、伴读 Tab 样式 |
| `js/scanner.js` | ❌ 不变 | 扫描功能不依赖产品 |

### 8.2 JS 架构变更

**路由解析：**
```javascript
function parseHash() {
  var hash = location.hash.replace('#', '');
  var parts = hash.split('/');
  var page = parts[0] || 'home';
  var product = parts[1] || 'oufen'; // 默认藕粉
  // fallback: 如果当前路由不支持产品，忽略
  if (['viewer', 'scan', 'study', 'profile'].indexOf(page) !== -1) {
    product = null;
  }
  return { page: page, product: product };
}
```

**主题切换：**
- 在 `<div id="app">` 上设置 `data-product="oufen"`
- CSS 用属性选择器切换颜色变量

### 8.3 CSS 产品颜色系统

```css
/* 默认：藕粉 */
:root, [data-product="oufen"] {
  --primary: #F7E1D7;
  --accent: #8B7355;
  --gold: #D4B98C;
  --bg: #FBF8F5;
}
[data-product="mahua"] {
  --primary: #D4A06A;
  --accent: #8B6914;
  --gold: #E8C87A;
  --bg: #FDF6EC;
}
[data-product="rosecake"] {
  --primary: #F0C4C4;
  --accent: #C48A8A;
  --gold: #E8B4B4;
  --bg: #FEF0F0;
}
[data-product="taigubing"] {
  --primary: #E8C87A;
  --accent: #A08040;
  --gold: #F0D898;
  --bg: #FEF8E8;
}
```

---

## 九、视觉参考示意

> 如需实际渲染效果，可随时生成 mockup 图 🔮

---

规格书到此。你审阅一下，确认后我开始实现 🐱
