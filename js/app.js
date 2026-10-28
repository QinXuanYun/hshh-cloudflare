/**
 * 沪上呼呼·藕粉非遗 — Hash Router + Page Renderer
 * 
 * Route table:
 *   #home     → 首页
 *   #culture  → 非遗文化页（研学）
 *   #craft    → 工艺教学页
 *   #reading  → 智能伴读页
 *   #profile  → 个人中心页
 */

(function () {
  'use strict';

  // ── Route Table ──────────────────────────────────────────────
  var routes = ['home', 'study', 'craft', 'reading', 'profile', 'viewer', 'shop', 'ebook'];

  // ── Hash Parser (page/product) ──────────────────────────────
  function parseHash() {
    var hash = window.location.hash.replace('#', '') || 'home';
    var qPos = hash.indexOf('?');
    var base = qPos === -1 ? hash : hash.substring(0, qPos);
    var parts = base.split('/');
    var page = parts[0];
    var product = parts.length > 1 ? parts[1] : null;
    if (['home', 'craft', 'reading', 'study', 'profile', 'shop', 'ebook'].indexOf(page) === -1) {
      product = null;
    }
    return { page: page, product: product };
  }

  function getCurrentProduct() {
    var parsed = parseHash();
    return parsed.product || 'oufen';
  }

  // ── Product Switcher Component ──────────────────────────────
  function renderProductSwitcher(currentProduct) {
    var ids = window.PRODUCT_IDS;
    var html = '<section class="product-switcher"><div class="product-switcher-scroll">';
    for (var i = 0; i < ids.length; i++) {
      var p = window.PRODUCTS[ids[i]];
      var active = ids[i] === currentProduct ? ' active' : '';
      var currentPage = parseHash().page;
      html += '<a class="product-switcher-tab' + active + '" href="#' + currentPage + '/' + ids[i] + '">'
           + p.emoji + ' <span>' + p.name + '</span></a>';
    }
    html += '</div></section>';
    return html;
  }

  // ── Page Render Functions (exported as globals) ──
  window.renderHome = function (product) {
    var p = window.getProduct(product);
    return '\
      ' + renderProductSwitcher(product) + '\
      <!-- Banner -->\
      <section class="home-banner">\
        <div class="banner-content">\
          <h1 class="banner-title">沪上呼呼·幼儿非遗启蒙 —— ' + p.name + '</h1>\
          <p class="banner-subtitle">' + p.bannerSubtitle + '</p>\
          <a class="banner-btn" href="#study">' + p.bannerBtn + '</a>\
        </div>\
        <div class="banner-image">\
          <img src="' + p.bannerImg + '" alt="' + p.name + '">\
        </div>\
      </section>\
      \
      <!-- 6 核心入口 (3×2) -->\
      <section class="home-entrances">\
        <div class="entrance-scroll">\
          <a class="entrance-item" href="#shop">\
            <span class="entrance-icon">🛒</span>\
            <span class="entrance-label">周边购买</span>\
          </a>\
          <a class="entrance-item" href="#reading">\
            <span class="entrance-icon">📖</span>\
            <span class="entrance-label">音频伴读</span>\
          </a>\
          <a class="entrance-item" href="#ebook">\
            <span class="entrance-icon">📚</span>\
            <span class="entrance-label">电子订阅</span>\
          </a>\
          <a class="entrance-item" href="#craft/' + product + '">\
            <span class="entrance-icon">🔧</span>\
            <span class="entrance-label">工艺学习</span>\
          </a>\
          <a class="entrance-item" href="#study">\
            <span class="entrance-icon">🎒</span>\
            <span class="entrance-label">文旅研学</span>\
          </a>\
          <a class="entrance-item" href="javascript:void(0)">\
            <span class="entrance-icon">📍</span>\
            <span class="entrance-label">园所资源</span>\
          </a>\
        </div>\
      </section>\
      \
      <!-- 发现 (static) -->\
      <section class="home-section">\
        <div class="section-header">\
          <h2 class="section-title">发现</h2>\
        </div>\
        <div class="discover-all">\
' + (function() { var dh = ''; var allP = window.getProductList(); for (var gpi = 0; gpi < allP.length; gpi++) { var gp = allP[gpi]; var items = gp.discover || []; var maxItems = Math.min(items.length, 2); dh += '<div class=\"discover-group\"><h3 class=\"discover-group-title\">' + gp.emoji + ' ' + gp.name + '</h3><div class=\"discover-grid\">'; for (var gci = 0; gci < maxItems; gci++) { var it = items[gci]; var iid = it.id + '-' + gp.id; var ic = window.Data && window.Data.isCollected(iid) ? '❤' : '♡'; dh += '<div class=\"discover-card\" data-item-id=\"' + iid + '\" onclick=\"window.location.hash=&#39;craft/' + gp.id + '&#39;\"><div class=\"discover-card-img-wrap\"><img src=\"' + it.img + '\" alt=\"' + it.title + '\"><button class=\"discover-card-fav\" data-item-id=\"' + iid + '\">' + ic + '</button></div><div class=\"card-info\"><h3>' + it.title + '</h3><p>' + it.desc + '</p></div></div>'; } dh += '</div></div>'; } return dh; })() + '\
        </div>\
      </section>\
      \
      <!-- 大师专栏 (static) -->\
      <section class="home-section">\
        <div class="section-header">\
          <h2 class="section-title">大师专栏</h2>\
        </div>\
        <div class="masters-list">\
' + (function() { var mh = ''; var allP = window.getProductList(); for (var mi = 0; mi < Math.min(allP.length, 2); mi++) { var mp = allP[mi]; mh += '<div class=\"master-card\"><div class=\"master-avatar\"><img src=\"https://placehold.co/80x80/' + mp.colors.primary.replace('#','') + '/' + mp.colors.accent.replace('#','') + '?text=' + mp.master.initial + '\" alt=\"' + mp.master.name + '\"></div><div class=\"master-info\"><h3>非遗传承人·' + mp.master.name + '</h3><p>' + mp.master.desc + '</p><a class=\"master-link\" href=\"#\">了解更多 →</a></div></div>'; } return mh; })() + '\
        </div>\
      </section>\
      \
      \
      <!-- AR扫一扫入口 -->\
      <a class="ar-scan-btn" href="#viewer?scan">📷 AR 扫一扫</a>\
    ';
  };

  /**
   * After-render hook for home page: wire up collection toggle buttons.
   */
  window.afterRenderHome = function () {
    var favBtns = document.querySelectorAll('.discover-card-fav');
    for (var i = 0; i < favBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var itemId = btn.getAttribute('data-item-id');
          if (!itemId) return;

          if (window.Data.isCollected(itemId)) {
            // Find the collection entry to remove
            var all = window.Data.getCollections();
            var entry = null;
            for (var j = 0; j < all.length; j++) {
              if (all[j].itemId === itemId) {
                entry = all[j];
                break;
              }
            }
            if (entry) {
              window.Data.removeCollection(entry.id, function () {
                btn.textContent = '♡';
              });
            }
          } else {
            // Get card title and image for the item
            var card = btn.closest('.discover-card');
            var title = card ? card.querySelector('.card-info h3').textContent : itemId;
            var img = card ? card.querySelector('img').src : '';
            window.Data.addCollection({
              type: 'discover',
              itemId: itemId,
              title: title,
              image: img
            }, function () {
              btn.textContent = '❤';
            });
          }
        });
      })(favBtns[i]);
    }
  };

  window.renderStudy = function (product) {
    // Detail page: #study/{productId}
    if (product) {
      var p = window.getProduct(product);
      var study = p.study || {};
      var sched = study.schedule || {};

      var day1 = sched.day1 || {};
      var day2 = sched.day2 || {};
      var checkpoints = study.checkpoints || [];
      var tasks = study.interactiveTasks || [];

      var cpHtml = '';
      for (var cpi = 0; cpi < checkpoints.length; cpi++) {
        var cp = checkpoints[cpi];
        cpHtml += '<div class="study-cp-item"><span class="study-cp-num">' + (cpi + 1) + '</span><div class="study-cp-body"><h4>' + cp.name + '</h4><p class="study-cp-task">🎯 ' + cp.task + '</p></div></div>';
      }

      var tasksHtml = '';
      for (var tki = 0; tki < tasks.length; tki++) {
        var tk = tasks[tki];
        var pid = product;
        tasksHtml += '<div class="study-task-item"><h4>' + (tki + 1) + '. ' + tk.name + '</h4>';
        if (tk.items && tk.items.length > 0) {
          tasksHtml += '<div class="study-task-items">';
          for (var tii = 0; tii < tk.items.length; tii++) {
            var ck = window.Data ? window.Data.getStudyTaskItemChecked(pid, tki, tii) : false;
            var ch = ck ? '☑' : '☐';
            tasksHtml += '<span class="study-task-tag' + (ck ? ' checked' : '') + '" data-study-product="' + pid + '" data-study-task="' + tki + '" data-study-item="' + tii + '" onclick="window.toggleStudyItem(this)">' + ch + ' ' + tk.items[tii] + '</span>';
          }
          tasksHtml += '</div>';
        }
        // Add input field for task 2 (index 1) and task 3 (index 2)
        if (tki === 1 || tki === 2) {
          var savedInput = window.Data ? window.Data.getStudyTaskInput(pid, tki) : '';
          tasksHtml += '<textarea class="study-task-input" data-study-product="' + pid + '" data-study-task="' + tki + '" oninput="window.saveStudyTaskInput(this)" placeholder="' + (tki === 1 ? '写下你的制作配方...' : '提出你的问题...') + '">' + savedInput + '</textarea>';
        }
        tasksHtml += '</div>';
      }

      return '\
        <section class="study-detail-banner">\
          <a class="study-detail-back" href="#study">← 返回研学列表</a>\
          <h1 class="study-detail-title">' + (study.emoji || '') + ' ' + (study.name || p.name) + '</h1>\
          <p class="study-detail-intro">' + (study.intro || '') + '</p>\
        </section>\
        <div class="study-detail-body">\
          <section class="study-section">\
            <h2 class="study-section-title">📅 两日研学路线</h2>\
            <div class="study-day">\
              <h3 class="study-day-title">Day1 ' + (day1.title || '') + '</h3>\
              <div class="study-slot"><span class="study-slot-label">上午</span><p>' + (day1.morning || '') + '</p></div>\
              <div class="study-slot"><span class="study-slot-label">下午</span><p>' + (day1.afternoon || '') + '</p></div>\
              <div class="study-slot"><span class="study-slot-label">晚上</span><p>' + (day1.evening || '') + '</p></div>\
            </div>\
            <div class="study-day">\
              <h3 class="study-day-title">Day2 ' + (day2.title || '') + '</h3>\
              <div class="study-slot"><span class="study-slot-label">上午</span><p>' + (day2.morning || '') + '</p></div>\
              <div class="study-slot"><span class="study-slot-label">下午</span><p>' + (day2.afternoon || '') + '</p></div>\
            </div>\
          </section>\
          <section class="study-section">\
            <h2 class="study-section-title">📍 行程打卡</h2>\
            <div class="study-cp-list">' + cpHtml + '</div>\
          </section>\
          <section class="study-section">\
            <h2 class="study-section-title">🎮 互动任务</h2>\
            <div class="study-task-list">' + tasksHtml + '</div>\
          </section>\
          <section class="study-section">\
            <h2 class="study-section-title">🛡️ 幼儿动态与安全提示</h2>\
            <div class="study-safety">\
              <div class="study-safety-item">\
                <span class="study-safety-icon">👶</span>\
                <div class="study-safety-body">\
                  <h4>幼儿状态</h4>\
                  <p>活动期间请密切关注孩子的体力和情绪变化，适时休息</p>\
                </div>\
              </div>\
              <div class="study-safety-item">\
                <span class="study-safety-icon">💧</span>\
                <div class="study-safety-body">\
                  <h4>补水提醒</h4>\
                  <p>每 30 分钟提醒孩子喝一次水，随身携带保温杯</p>\
                </div>\
              </div>\
              <div class="study-safety-item">\
                <span class="study-safety-icon">🧴</span>\
                <div class="study-safety-body">\
                  <h4>防晒防蚊</h4>\
                  <p>户外活动前涂抹儿童防晒霜，随身携带防蚊贴或驱蚊液</p>\
                </div>\
              </div>\
              <div class="study-safety-item">\
                <span class="study-safety-icon">🆘</span>\
                <div class="study-safety-body">\
                  <h4>紧急联系</h4>\
                  <p>研学场地地址及紧急联系电话请提前保存，如遇突发情况请及时联系带队老师</p>\
                </div>\
              </div>\
            </div>\
          </section>\
        </div>\
      ';
    }

    // List page: #study (show 4 route cards)
    var allProds = window.getProductList();
    var cardsHtml = '';
    for (var si = 0; si < allProds.length; si++) {
      var sp = allProds[si];
      var sd = sp.study || {};
      cardsHtml += '<a class="study-route-card" href="#study/' + sp.id + '">\
        <div class="study-route-emoji">' + (sd.emoji || '') + '</div>\
        <div class="study-route-info">\
          <h3 class="study-route-name">' + (sd.name || sp.name) + '</h3>\
          <p class="study-route-desc">' + (sd.intro ? sd.intro.substring(0, 60) + '…' : '') + '</p>\
        </div>\
        <div class="study-route-arrow">→</div>\
      </a>';
    }
    return '\
      <section class="study-banner">\
        <h1 class="study-title">🎒 研学路线</h1>\
        <p class="study-subtitle">选择一条路线，开启非遗研学之旅</p>\
        <div class="study-divider"><span class="study-divider-line"></span></div>\
      </section>\
      <div class="study-route-list">' + cardsHtml + '</div>\
    ';
  };

  window.renderProfile = function (subpage) {
    // If subpage is given, render sub-page instead of main profile
    if (subpage) return renderProfileSubpage(subpage);
    var scoreInfo = window.Data ? window.Data.getUserScore() : { score: 1280, level: 1, levelName: '\u975e\u9057\u5c0f\u840c\u65b0', progress: 28 };
    var colCount = window.Data ? window.Data.getCollections().length : 3;
    var badgeCount = window.Data ? window.Data.getBadges().length : 2;
    var notifChecked = window.Data ? (window.Data.getSetting('notification', true) ? 'checked' : '') : 'checked';
    var darkChecked = window.Data ? (window.Data.getSetting('darkMode', false) ? 'checked' : '') : '';
    var wifiChecked = window.Data ? (window.Data.getSetting('wifiOnly', true) ? 'checked' : '') : 'checked';
    var badgesList = window.Data ? window.Data.getBadges() : [];
    var badgesHtml = '';
    if (badgesList.length === 0) {
      badgesHtml = '<p style="grid-column:1/-1;text-align:center;color:var(--accent);font-size:13px;padding:20px 0">\u7ee7\u7eed\u5b66\u4e60\u548c\u63a2\u7d22\uff0c\u89e3\u9501\u6210\u5c31\u5fbd\u7ae0\u5427\uff01</p>';
    } else {
      for (var bi = 0; bi < badgesList.length; bi++) {
        var b = badgesList[bi];
        badgesHtml += '<div class="profile-badge-item unlocked"><div class="profile-badge-circle">' + (b.icon || '🏅') + '</div><span class="profile-badge-label">' + b.name + '</span></div>';
      }
    }
    return '\
      <section class="profile-header">\
        <div class="profile-avatar">\
          <img src="https://placehold.co/80x80/F7E1D7/8B7355?text=\u547c\u547c" alt="\u7528\u6237\u5934\u50cf">\
        </div>\
        <div class="profile-user">\
          <h2 class="profile-name">\u975e\u9057\u5c0f\u8fbe\u4eba</h2>\
          <span class="profile-badge">Lv.' + scoreInfo.level + ' ' + scoreInfo.levelName + '</span>\
        </div>\
        <div class="profile-progress">\
          <div class="profile-progress-bar">\
            <div class="profile-progress-fill" style="width:' + scoreInfo.progress + '%"></div>\
          </div>\
          <span class="profile-progress-text">\u79ef\u5206 ' + scoreInfo.score + ' \u00b7 \u8ddd\u79bb\u4e0b\u4e00\u7ea7\u8fd8\u5dee ' + (100 - scoreInfo.progress) + '%</span>\
        </div>\
      </section>\
      <section class="profile-menu">\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/collections\'">\
          <span class="profile-menu-icon">📖</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u6211\u7684\u6536\u85cf</span>\
            <span class="profile-menu-desc" id="profile-col-count">\u5df2\u6536\u85cf ' + colCount + ' \u4e2a\u5185\u5bb9</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/history\'">\
          <span class="profile-menu-icon">📜</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u7814\u5b66\u8bb0\u5f55</span>\
            <span class="profile-menu-desc" id="profile-badge-count">\u5df2\u5b8c\u6210 ' + badgeCount + ' \u9879\u6210\u5c31</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/achievements\'">\
          <span class="profile-menu-icon">🏆</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u6210\u5c31\u5fbd\u7ae0</span>\
            <span class="profile-menu-desc">\u5df2\u83b7\u5f97 ' + badgeCount + ' \u679a\u5fbd\u7ae0</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/resources\'">\
          <span class="profile-menu-icon">📥</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u79bb\u7ebf\u8d44\u6e90</span>\
            <span class="profile-menu-desc">\u5df2\u7f13\u5b58 2 \u4e2a\u6a21\u578b</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/works\'">\
          <span class="profile-menu-icon">📐</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u6211\u7684\u4f5c\u54c1</span>\
            <span class="profile-menu-desc">\u4e0a\u4f20 8 \u4e2a\u4f5c\u54c1</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
        <div class="profile-menu-item" onclick="window.location.hash=\'profile/settings\'">\
          <span class="profile-menu-icon">\u2699\ufe0f</span>\
          <div class="profile-menu-info">\
            <span class="profile-menu-label">\u8bbe\u7f6e</span>\
          </div>\
          <span class="profile-menu-arrow">\u203a</span>\
        </div>\
      </section>\
      <section class="profile-section">\
        <div class="section-header">\
          <h2 class="section-title">\u6211\u7684\u6210\u5c31</h2>\
        </div>\
        <div class="profile-achievements" id="profile-achievements">\
          ' + badgesHtml + '\
        </div>\
      </section>\
      <section class="profile-section">\
        <div class="section-header">\
          <h2 class="section-title">\u8bbe\u7f6e</h2>\
        </div>\
        <div class="profile-settings">\
          <div class="profile-setting-item">\
            <span class="profile-setting-label">📢 \u6d88\u606f\u901a\u77e5</span>\
            <label class="profile-switch">\
              <input type="checkbox" data-setting-key="notification" onchange="if(window.Data)window.Data.setSetting(&#39;notification&#39;,this.checked)" ' + notifChecked + '>\
              <span class="profile-slider"></span>\
            </label>\
          </div>\
          <div class="profile-setting-item">\
            <span class="profile-setting-label">🌙 \u591c\u95f4\u6a21\u5f0f</span>\
            <label class="profile-switch">\
              <input type="checkbox" data-setting-key="darkMode" onchange="if(window.Data)window.Data.setSetting(&#39;darkMode&#39;,this.checked)" ' + darkChecked + '>\
              <span class="profile-slider"></span>\
            </label>\
          </div>\
          <div class="profile-setting-item">\
            <span class="profile-setting-label">📶 \u4ec5WiFi\u4e0b\u8f7d</span>\
            <label class="profile-switch">\
              <input type="checkbox" data-setting-key="wifiOnly" onchange="if(window.Data)window.Data.setSetting(&#39;wifiOnly&#39;,this.checked)" ' + wifiChecked + '>\
              <span class="profile-slider"></span>\
            </label>\
          </div>\
        </div>\
      </section>\
    ';
  };

  // ── Profile Sub-pages ──────────────────────────────────────
  function renderProfileSubpage(subpage) {
    var pages = {
      collections: {
        title: '📖 我的收藏',
        icon: '📖',
        render: function() {
          var items = window.Data ? window.Data.getCollections() : [];
          if (!items.length) {
            return '<p style="text-align:center;color:var(--accent);padding:40px 20px">还没有收藏内容，去发现页看看吧～</p>';
          }
          var html = '';
          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            html += '<div class="profile-sub-card"><span class="profile-sub-card-icon">' + (it.icon || '📄') + '</span><div class="profile-sub-card-info"><div class="profile-sub-card-title">' + it.name + '</div><div class="profile-sub-card-desc">' + (it.desc || '') + '</div></div></div>';
          }
          return html;
        }
      },
      history: {
        title: '📜 研学记录',
        icon: '📜',
        render: function() {
          var records = [
            { name: '糯糯藕粉·非遗研学', status: '已完成', progress: '100%', icon: '🥣' },
            { name: '脆脆小麻花·古法体验', status: '进行中', progress: '60%', icon: '🥨' }
          ];
          var html = '';
          for (var i = 0; i < records.length; i++) {
            var r = records[i];
            var statusClass = r.status === '已完成' ? 'profile-sub-status-done' : 'profile-sub-status-progress';
            html += '<div class="profile-sub-card"><span class="profile-sub-card-icon">' + r.icon + '</span><div class="profile-sub-card-info"><div class="profile-sub-card-title">' + r.name + '</div><div class="profile-sub-card-desc">' + r.status + ' <span class="' + statusClass + '">' + r.progress + '</span></div></div></div>';
          }
          return html;
        }
      },
      achievements: {
        title: '🏆 成就徽章',
        icon: '🏆',
        render: function() {
          var badges = window.Data ? window.Data.getBadges() : [];
          if (!badges.length) {
            return '<p style="text-align:center;color:var(--accent);padding:40px 20px">继续学习和探索，解锁成就徽章吧！</p>';
          }
          var html = '<div class="profile-sub-badge-grid">';
          for (var i = 0; i < badges.length; i++) {
            var b = badges[i];
            html += '<div class="profile-badge-item unlocked"><div class="profile-badge-circle">' + (b.icon || '🏅') + '</div><span class="profile-badge-label">' + b.name + '</span></div>';
          }
          html += '</div>';
          return html;
        }
      },
      resources: {
        title: '📥 离线资源',
        icon: '📥',
        render: function() {
          var resources = [
            { name: '藕粉制作工艺·3D模型', size: '12.5 MB', status: '已缓存' },
            { name: '麻花非遗故事·音频', size: '8.2 MB', status: '已缓存' },
            { name: '鲜花饼制作·视频教程', size: '156 MB', status: '未缓存' }
          ];
          var html = '';
          for (var i = 0; i < resources.length; i++) {
            var r = resources[i];
            var statusClass = r.status === '已缓存' ? 'profile-sub-status-done' : 'profile-sub-status-pending';
            html += '<div class="profile-sub-card"><span class="profile-sub-card-icon">📦</span><div class="profile-sub-card-info"><div class="profile-sub-card-title">' + r.name + '</div><div class="profile-sub-card-desc">' + r.size + ' · <span class="' + statusClass + '">' + r.status + '</span></div></div></div>';
          }
          return html;
        }
      },
      works: {
        title: '📐 我的作品',
        icon: '📐',
        render: function() {
          var works = [
            { name: '我的第一碗藕粉', desc: '2026-05-30 上传' },
            { name: '麻花制作小能手', desc: '2026-05-28 上传' },
            { name: '鲜花饼彩绘', desc: '2026-05-25 上传' }
          ];
          var html = '';
          for (var i = 0; i < works.length; i++) {
            var w = works[i];
            html += '<div class="profile-sub-card"><span class="profile-sub-card-icon">🎨</span><div class="profile-sub-card-info"><div class="profile-sub-card-title">' + w.name + '</div><div class="profile-sub-card-desc">' + w.desc + '</div></div></div>';
          }
          return html;
        }
      },
      settings: {
        title: '⚙️ 设置',
        icon: '⚙️',
        render: function() {
          var notifChecked = window.Data ? (window.Data.getSetting('notification', true) ? 'checked' : '') : 'checked';
          var darkChecked = window.Data ? (window.Data.getSetting('darkMode', false) ? 'checked' : '') : '';
          var wifiChecked = window.Data ? (window.Data.getSetting('wifiOnly', true) ? 'checked' : '') : 'checked';
          var elderChecked = window.Data ? (window.Data.getSetting('elderMode', true) ? 'checked' : '') : 'checked';
          return '\
            <div class="profile-settings">\
              <div class="profile-setting-item">\
                <span class="profile-setting-label">📢 消息通知</span>\
                <label class="profile-switch">\
                  <input type="checkbox" data-setting-key="notification" onchange="if(window.Data)window.Data.setSetting(&#39;notification&#39;,this.checked)" ' + notifChecked + '>\
                  <span class="profile-slider"></span>\
                </label>\
              </div>\
              <div class="profile-setting-item">\
                <span class="profile-setting-label">🌙 夜间模式</span>\
                <label class="profile-switch">\
                  <input type="checkbox" data-setting-key="darkMode" onchange="if(window.Data)window.Data.setSetting(&#39;darkMode&#39;,this.checked)" ' + darkChecked + '>\
                  <span class="profile-slider"></span>\
                </label>\
              </div>\
              <div class="profile-setting-item">\
                <span class="profile-setting-label">📶 仅WiFi下载</span>\
                <label class="profile-switch">\
                  <input type="checkbox" data-setting-key="wifiOnly" onchange="if(window.Data)window.Data.setSetting(&#39;wifiOnly&#39;,this.checked)" ' + wifiChecked + '>\
                  <span class="profile-slider"></span>\
                </label>\
              </div>\
              <div class="profile-setting-item">\
                <span class="profile-setting-label">🔍 长辈大字版</span>\
                <label class="profile-switch">\
                  <input type="checkbox" data-setting-key="elderMode" onchange="if(window.setElderMode)window.setElderMode(this.checked)" ' + elderChecked + '>\
                  <span class="profile-slider"></span>\
                </label>\
              </div>\
            </div>\
          ';
        }
      }
    };

    var pd = pages[subpage];
    if (!pd) {
      return '<div class="page-placeholder"><p>页面未找到</p></div>';
    }

    return '\
      <section class="profile-sub-page">\
        <div class="profile-sub-header" onclick="window.location.hash=\'profile\'">\
          <span class="profile-sub-back">‹ 返回</span>\
          <h2 class="profile-sub-title">' + pd.title + '</h2>\
          <span></span>\
        </div>\
        <div class="profile-sub-content">' + pd.render() + '</div>\
      </section>\
    ';
  }

  window.renderCraft = function (product) {
    var p = window.getProduct(product);
    var materialsHtml = '';
    for (var mi = 0; mi < p.craftMaterials.length; mi++) {
      var m = p.craftMaterials[mi];
      materialsHtml += '<div class="craft-tool-item">'
        + '<span class="craft-tool-icon">' + m.icon + '</span>'
        + '<div class="craft-tool-name">' + m.name + '</div>'
        + '<div class="craft-tool-desc">' + m.desc + '</div>'
        + '</div>';
    }
    var tagsHtml = '';
    for (var ti = 0; ti < p.craftTags.length; ti++) {
      var t = p.craftTags[ti];
      tagsHtml += '<div class="craft-tag-item">'
        + '<div class="craft-tag-circle">' + t.letter + '</div>'
        + '<span class="craft-tag-label">' + t.label + '</span>'
        + '</div>';
    }
    var stepsHtml = '';
    for (var si = 0; si < p.craftSteps.length; si++) {
      var s = p.craftSteps[si];
      stepsHtml += '<div class="craft-step">'
        + '<div class="craft-step-number">' + s.num + '</div>'
        + '<div class="craft-step-body">'
        + '<div class="craft-step-header">'
        + '<span class="craft-step-icon">' + s.icon + '</span>'
        + '<span class="craft-step-title">' + s.title + '</span>'
        + '</div>'
        + '<img class="craft-step-img" src="' + s.img + '" alt="' + s.title + '">'
        + '<p class="craft-step-desc">' + s.desc + '</p>'
        + '</div>'
        + '</div>';
    }
    return '\
      <section class="craft-banner">\
        <h1 class="craft-title">🔧 ' + p.name + ' \u00b7 \u5de5\u827a\u6559\u5b66</h1>\
        <p class="craft-subtitle">\u5b66\u4e60' + p.name + '\u7684\u4f20\u7edf\u5236\u4f5c\u5de5\u827a\uff0c\u52a8\u624b\u4f53\u9a8c\u975e\u9057\u9b45\u529b</p>\
        <div class="craft-divider"><span class="craft-divider-line"></span></div>\
      </section>\
      ' + renderProductSwitcher(product) + '\
      <section class="craft-section">\
        <div class="section-header">\
          <h2 class="section-title">🧰 \u6750\u6599\u4e0e\u5de5\u5177</h2>\
        </div>\
        <div class="craft-tools-grid">' + materialsHtml + '</div>\
      </section>\
      <section class="craft-section">\
        <div class="section-header">\
          <h2 class="section-title">🏷\ufe0f \u5de5\u827a\u7279\u70b9</h2>\
        </div>\
        <div class="craft-tags-scroll">' + tagsHtml + '</div>\
      </section>\
      <section class="craft-section">\
        <div class="section-header">\
          <h2 class="section-title">📋 \u4e94\u5927\u5de5\u5e8f</h2>\
        </div>\
        <div class="craft-timeline">' + stepsHtml + '</div>\
      </section>\
      <!-- \u975e\u9057\u6587\u5316\u00b7\u56db\u5927\u4ef7\u503c -->\
      <section class="craft-section">\
        <div class="section-header">\
          <h2 class="section-title">🏛\ufe0f \u975e\u9057\u6587\u5316\u00b7\u56db\u5927\u4ef7\u503c</h2>\
        </div>\
        <div class="culture-grid-inline">\
' + (function() { var cultureKeys = ['history', 'craft', 'humanity', 'spread']; var ch = ''; for (var ci2 = 0; ci2 < cultureKeys.length; ci2++) { var val = p.culture[cultureKeys[ci2]]; ch += '<div class=\"culture-card\"><img src=\"https://placehold.co/400x200/' + p.colors.primary.replace('#','') + '/' + p.colors.accent.replace('#','') + '?text=' + encodeURIComponent(val.title) + '\" alt=\"' + val.title + '\"><div class=\"culture-card-body\"><span class=\"culture-card-icon\">' + val.icon + '</span><h3 class=\"culture-card-title\">' + val.title + '</h3><p class=\"culture-card-desc\">' + val.desc + '</p><button class=\"culture-card-btn\" onclick=\"window.showCultureModal(\'' + product + '\',\'' + val.title + '\')\">\u4e86\u89e3\u8be6\u60c5</button></div></div>'; } return ch; })() + '\
        </div>\
      </section>\
    ';
  };

  window.renderReading = function (product) {
    var p = window.getProduct(product);

    // Banner
    var html = '\
      <section class="reading-banner">\
        <div class="reading-banner-bg">\
          <h1 class="reading-banner-title">\u667a\u80fd\u4f34\u8bfb</h1>\
          <p class="reading-banner-desc">\u8fb9\u770b\u8fb9\u5b66\uff0c\u966a\u4f34\u5b69\u5b50\u63a2\u7d22\u975e\u9057\u6587\u5316</p>\
          <div class="reading-banner-divider"><\/div>\
        </div>\
      </section>';

    // Categories: audio, video, works
    var cats = [
      { key: 'audio', label: '\u{1F3B5} \u97f3\u9891' },
      { key: 'video', label: '\u{1F3AC} \u89c6\u9891' },
      { key: 'works', label: '\u{1F3A8} \u4f5c\u54c1' }
    ];

    for (var ci = 0; ci < cats.length; ci++) {
      var cat = cats[ci];
      var items = p.reading[cat.key] || [];
      if (items.length === 0) continue;

      html += '<div class="reading-category">';
      html += '<h2 class="reading-category-title">' + cat.label + '</h2>';
      html += '<div class="reading-category-scroll">';

      for (var ri = 0; ri < items.length; ri++) {
        var item = items[ri];
        var escapedDesc = item.desc.replace(/'/g, "\\'");

        html += '<div class="reading-media-card">';
        html += '<img class="reading-media-img" src="' + item.img + '" alt="' + item.desc + '">';
        html += '<div class="reading-media-info">';
        html += '<span class="reading-media-name">' + item.desc + '</span>';
        html += '<div class="reading-media-controls">';

        if (cat.key === 'audio') {
          html += '<button class="reading-ctrl-btn reading-ctrl-play" onclick="window.showMediaModal(\'audio\',\'' + escapedDesc + '\')">\u25b6 \u64ad\u653e</button>';
          html += '<button class="reading-ctrl-btn reading-ctrl-dl" onclick="window.readingDownload(\'' + escapedDesc + '\')">\u2b07 \u4e0b\u8f7d</button>';
        } else if (cat.key === 'video') {
          html += '<button class="reading-ctrl-btn reading-ctrl-play" onclick="window.showMediaModal(\'video\',\'' + escapedDesc + '\')">\u25b6 \u64ad\u653e</button>';
        } else if (cat.key === 'works') {
          html += '<button class="reading-ctrl-btn reading-ctrl-view" onclick="window.showMediaModal(\'image\',\'' + escapedDesc + '\')">\u{1F441} \u67e5\u770b</button>';
        }

        html += '</div></div></div>';
      }

      html += '</div></div>';
    }

    // \u9694\u4ee3\u4eb2\u5b50\u5c0f\u6307\u5f15
    html += '\
      <section class="reading-tips">\
        <h2 class="reading-tips-title">\u{1F474}\u{1F475} \u9694\u4ee3\u4eb2\u5b50\u5c0f\u6307\u5f15</h2>\
        <div class="reading-tips-card">\
          <h3 class="reading-tips-heading">\u7956\u5b59\u9605\u8bfb\u5c0f\u6280\u5de7</h3>\
          <ul class="reading-tips-list">\
            <li>\u{1F4D6} \u4e00\u8d77\u6307\u7740\u7ed8\u672c\u56fe\u7247\u8bb2\uff0c\u8ba9\u5b69\u5b50\u8ddf\u7740\u4f60\u7684\u58f0\u97f3\u8d70\u8fdb\u6545\u4e8b</li>\
            <li>\u{1F5E3}\ufe0f \u8bfb\u5b8c\u540e\u95ee\u5b69\u5b50\"\u4f60\u6700\u559c\u6b22\u54ea\u4e00\u9875\uff1f\"\uff0c\u9f13\u52b1\u8868\u8fbe\u611f\u53d7</li>\
            <li>\u{1F3AD} \u7528\u4e0d\u540c\u7684\u58f0\u97f3\u6a21\u4eff\u6545\u4e8b\u91cc\u7684\u89d2\u8272\uff0c\u8ba9\u9605\u8bfb\u66f4\u6709\u8da3</li>\
            <li>\u{1F504} \u540c\u4e00\u672c\u4e66\u53ef\u4ee5\u53cd\u590d\u8bfb\uff0c\u6bcf\u6b21\u5b69\u5b50\u90fd\u4f1a\u6709\u65b0\u53d1\u73b0</li>\
            <li>\u{1F4F1} \u6253\u5f00\u97f3\u9891\u6216\u89c6\u9891\uff0c\u548c\u5b69\u5b50\u4e00\u8d77\u8fb9\u770b\u8fb9\u542c\u8fb9\u5b66</li>\
          </ul>\
        </div>\
      </section>';

    return html;
  };

  window.readingDownload = function (name) {
    alert('\u4e0b\u8f7d\u529f\u80fd\u5373\u5c06\u4e0a\u7ebf\uff0c\u656c\u8bf7\u671f\u5f85\uff1a' + name);
  };

  /**
  /**
   * After-render hook for profile page: wire up settings toggles.
   */
  window.afterRenderProfile = function () {
    // Settings toggle change handlers
    var toggles = document.querySelectorAll('.profile-setting-item input[type="checkbox"]');
    for (var t = 0; t < toggles.length; t++) {
      (function (cb) {
        cb.addEventListener('change', function () {
          var key = cb.getAttribute('data-setting-key');
          if (key) {
            window.Data.setSetting(key, cb.checked);
          }
        });
      })(toggles[t]);
    }

    // Async: update badge display from IndexedDB if cache just populated
    function refreshBadgeUI() {
      var badgeItems = document.querySelectorAll('#profile-achievements .profile-badge-item');
      for (var i = 0; i < badgeItems.length; i++) {
        var item = badgeItems[i];
        var badgeId = item.getAttribute('data-badge-id');
        if (!badgeId) continue;
        var unlocked = window.Data.hasBadge(badgeId);
        if (unlocked) {
          item.className = 'profile-badge-item unlocked';
          var circle = item.querySelector('.profile-badge-circle');
          if (circle) circle.textContent = '🏅';
          var hint = item.querySelector('.profile-badge-hint');
          if (hint) {
            // Find original hint
            var defs = [
              { id: 'first_visit', hint: '了解藕粉起源' },
              { id: 'craftsman',   hint: '完成一次工艺学习' },
              { id: 'ambassador',  hint: '分享给 3 个朋友' },
              { id: 'reader',      hint: '读完 5 本绘本' },
              { id: 'explorer',    hint: '完成 3 次研学' },
              { id: 'master',      hint: '待解锁' }
            ];
            for (var d = 0; d < defs.length; d++) {
              if (defs[d].id === badgeId) {
                hint.textContent = defs[d].hint;
                break;
              }
            }
          }
        }
      }
      // Update badge count in menu
      var badgeCount = window.Data.getBadges().length;
      var badgeDescEl = document.getElementById('profile-badge-count');
      if (badgeDescEl) badgeDescEl.textContent = '已完成 ' + badgeCount + ' 项成就';
      var badgeMenuEl = document.querySelector('.profile-menu-item:nth-child(3) .profile-menu-desc');
      if (badgeMenuEl) badgeMenuEl.textContent = '已获得 ' + badgeCount + ' 枚徽章';
      var colCount = window.Data.getCollections().length;
      var colDescEl = document.getElementById('profile-col-count');
      if (colDescEl) colDescEl.textContent = '已收藏 ' + colCount + ' 个内容';
    }

    // If DB is already ready, refresh now; otherwise wait
    refreshBadgeUI();
  };

  // ── URL Query Param Helper ──────────────────────────────────
  function getUrlParam(hash, param) {
    var match = hash.match(new RegExp('[?&]' + param + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  // ── 3D Viewer / Scanner Page ─────────────────────────────────
  window.renderViewer = function () {
    var hash = window.location.hash;
    // Detect scan mode: hash includes ?scan (with or without value)
    var isScan = /[?&]scan($|[&=])/.test(hash);

    // ── Scan mode ────────────────────────────────────────────
    if (isScan) {
      setTimeout(function () {
        // Start QR scanner after DOM is ready
        if (window.Scanner) window.Scanner.start();
      }, 100);
      return '\
        <div class="scanner-page">\
          <div class="scanner-header">\
            <button onclick="window.history.back()" class="scanner-close">✕</button>\
            <span>扫描二维码</span>\
          </div>\
          <div class="scanner-viewfinder">\
            <video id="scanner-video" autoplay playsinline></video>\
            <canvas id="scanner-canvas" style="display:none"></canvas>\
            <div class="scanner-frame"></div>\
          </div>\
          <p class="scanner-hint">将二维码置于框内自动识别</p>\
        </div>\
      ';
    }

    // ── 3D Viewer mode ──────────────────────────────────────
    var modelId = getUrlParam(hash, 'model') || 'default';
    var modelSrc = 'assets/models/' + modelId + '.usdz';
    var modelName = (modelId !== 'default') ? '模型 ' + modelId : '加载中...';

    return '\
      <div class="viewer-page">\
        <div class="viewer-topbar">\
          <button class="viewer-back" onclick="window.history.back()">← 返回</button>\
          <span class="viewer-title">3D 预览</span>\
        </div>\
        <model-viewer \
          id="model-viewer" \
          src="' + modelSrc + '" \
          ar \
          ar-modes="webxr scene-viewer quick-look" \
          camera-controls \
          auto-rotate \
          shadow-intensity="1" \
          style="width:100%; height:calc(100vh - 120px);">\
        </model-viewer>\
        <div class="viewer-info">\
          <p id="viewer-model-name">' + modelName + '</p>\
        </div>\
      </div>\
    ';
  };

  // ── 周边购买 ──────────────────────────────────────────────────
  window.renderShop = function (product) {
    var p = window.getProduct(product);
    var items = (window.SHOP_ITEMS || {})[product] || [];
    var cart = JSON.parse(localStorage.getItem('hshh_cart') || '[]');
    var html = '\
      ' + window.renderProductSwitcher(product) + '\
      <div class="shop-page">\
        <div class="shop-header">\
          <h2>' + p.emoji + ' ' + p.name + ' 周边好物</h2>\
          <p>精选非遗文创好物，把传统文化带回家</p>\
        </div>\
        <div class="shop-grid">';
    for (var si = 0; si < items.length; si++) {
      var it = items[si];
      var iid = it.id + '-' + product;
      var inCart = cart.indexOf(iid) > -1;
      var btnText = inCart ? '✓ 已加入' : '加入购物车';
      html += '\
        <div class="shop-card">\
          <div class="shop-card-img">\
            <img src="' + it.image + '" alt="' + it.name + '">\
            <span class="shop-tag">热卖</span>\
          </div>\
          <div class="shop-card-info">\
            <h3>' + it.name + '</h3>\
            <p class="shop-desc">' + it.desc + '</p>\
            <div class="shop-price-row">\
              <span class="shop-price">¥' + it.price + '</span>\
              <span class="shop-origin-price">¥' + it.originPrice + '</span>\
            </div>\
            <p class="shop-sold">已售 ' + it.sold + ' 件</p>\
            <div class="shop-actions">\
              <button class="shop-cart-btn" data-item-id="' + iid + '">' + btnText + '</button>\
              <a class="shop-buy-btn" href="' + it.link + '" target="_blank" rel="noopener">立即购买</a>\
            </div>\
          </div>\
        </div>';
    }
    html += '\
        </div>\
        <div class="shop-cart-bar">\
          <a class="shop-cart-link" href="javascript:void(0)" id="shopCartToggle">🛒 购物车 <span class="cart-count-badge">' + cart.length + '</span></a>\
        </div>\
      </div>\
      <div class="shop-checkout-overlay" id="shopCheckoutOverlay">\
        <div class="shop-checkout-panel">\
          <div class="shop-checkout-header">\
            <h3>📋 购物车结算</h3>\
            <button class="shop-checkout-close" id="shopCheckoutClose">✕</button>\
          </div>\
          <div class="shop-checkout-list" id="shopCheckoutList"></div>\
          <div class="shop-checkout-form">\
            <input type="text" placeholder="收货人姓名" id="checkoutName">\
            <input type="tel" placeholder="收货人电话" id="checkoutPhone">\
            <input type="text" placeholder="收货地址" id="checkoutAddress">\
            <button class="checkout-submit" id="checkoutSubmit">提交订单</button>\
          </div>\
        </div>\
      </div>';
    return html;
  };

  window.afterRenderShop = function () {
    // Cart toggle
    var cartToggle = document.getElementById('shopCartToggle');
    var overlay = document.getElementById('shopCheckoutOverlay');
    var closeBtn = document.getElementById('shopCheckoutClose');
    if (cartToggle && overlay) {
      cartToggle.addEventListener('click', function () {
        overlay.style.display = 'flex';
        renderCheckoutList();
      });
    }
    if (closeBtn && overlay) {
      closeBtn.addEventListener('click', function () {
        overlay.style.display = 'none';
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }

    // Cart add/remove
    var cartBtns = document.querySelectorAll('.shop-cart-btn');
    for (var ci = 0; ci < cartBtns.length; ci++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var itemId = btn.getAttribute('data-item-id');
          if (!itemId) return;
          var cart = JSON.parse(localStorage.getItem('hshh_cart') || '[]');
          var idx = cart.indexOf(itemId);
          if (idx > -1) {
            cart.splice(idx, 1);
            btn.textContent = '加入购物车';
          } else {
            cart.push(itemId);
            btn.textContent = '✓ 已加入';
          }
          localStorage.setItem('hshh_cart', JSON.stringify(cart));
          var badge = document.querySelector('.cart-count-badge');
          if (badge) badge.textContent = cart.length;
        });
      })(cartBtns[ci]);
    }

    // Checkout submit
    var checkoutBtn = document.getElementById('checkoutSubmit');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        var name = document.getElementById('checkoutName').value;
        var phone = document.getElementById('checkoutPhone').value;
        var addr = document.getElementById('checkoutAddress').value;
        if (!name || !phone || !addr) {
          alert('请填写完整的收货信息');
          return;
        }
        var cart = JSON.parse(localStorage.getItem('hshh_cart') || '[]');
        if (cart.length === 0) {
          alert('购物车为空，请先添加商品');
          return;
        }
        localStorage.setItem('hshh_cart', '[]');
        alert('✅ 订单提交成功！\\n\\n我们将尽快为您发货。');
        var overlay = document.getElementById('shopCheckoutOverlay');
        if (overlay) overlay.style.display = 'none';
        var badge = document.querySelector('.cart-count-badge');
        if (badge) badge.textContent = '0';
        var btns = document.querySelectorAll('.shop-cart-btn');
        for (var bi = 0; bi < btns.length; bi++) {
          btns[bi].textContent = '加入购物车';
        }
      });
    }
  };

  function renderCheckoutList() {
    var list = document.getElementById('shopCheckoutList');
    if (!list) return;
    var cart = JSON.parse(localStorage.getItem('hshh_cart') || '[]');
    if (cart.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--accent);padding:20px;">购物车是空的，快去逛逛吧 🛒</p>';
      return;
    }
    var html = '';
    for (var ci = 0; ci < cart.length; ci++) {
      var parts = cart[ci].split('-');
      var itemId = parts[0];
      var prodId = parts.slice(1).join('-');
      var items = (window.SHOP_ITEMS || {})[prodId] || [];
      var item = null;
      for (var ii = 0; ii < items.length; ii++) {
        if (items[ii].id === itemId) { item = items[ii]; break; }
      }
      if (item) {
        html += '<div class="checkout-item"><span class="checkout-item-name">' + item.name + '</span><span class="checkout-item-price">¥' + item.price + '</span></div>';
      }
    }
    list.innerHTML = html;
  }

  // ── 电子订阅 ──────────────────────────────────────────────────
  window.renderEbookList = function () {
    var html = '\
      <div class="ebook-page">\
        <div class="ebook-header">\
          <h2>📚 电子订阅</h2>\
          <p>精选非遗启蒙电子绘本，陪伴孩子快乐成长</p>\
        </div>\
        <div class="ebook-list-outer">\
          <div class="ebook-card-big" onclick="window.location.hash=\'ebook/huiben\'">\
            <div class="ebook-card-big-cover">\
              <img src="assets/huiben/1.jpg" alt="非遗启蒙绘本">\
            </div>\
            <div class="ebook-card-big-info">\
              <h3>非遗启蒙绘本</h3>\
              <p>共15页 · 适合3-6岁幼儿 · 精美手绘插图</p>\
              <p class="ebook-card-desc">通过生动有趣的绘本故事，带领孩子了解中国传统非遗技艺，培养文化自豪感。</p>\
              <span class="ebook-free-tag">免费阅读</span>\
            </div>\
          </div>\
        </div>\
      </div>';
    return html;
  };

  window.renderEbookDetail = function () {
    var total = 15;
    var html = '\
      <div class="ebook-detail">\
        <div class="ebook-toolbar">\
          <a class="ebook-back-btn" href="#ebook">‹ 返回</a>\
          <span class="ebook-title-bar">非遗启蒙绘本</span>\
          <span></span>\
        </div>\
        <div class="ebook-viewport" id="ebookViewport">\
          <div class="ebook-page-flip" id="ebookPageFlip">\
            <img id="ebookPageImg" src="assets/huiben/1.jpg" alt="第1页">\
          </div>\
          <div class="ebook-tap-left" id="ebookTapLeft"></div>\
          <div class="ebook-tap-right" id="ebookTapRight"></div>\
        </div>\
        <div class="ebook-footer">\
          <button class="ebook-nav-btn" id="ebookPrevBtn">‹</button>\
          <div class="ebook-progress">\
            <span id="ebookPageNum">1</span><span class="ebook-total"> / ' + total + '</span>\
          </div>\
          <button class="ebook-nav-btn" id="ebookNextBtn">›</button>\
        </div>\
      </div>';
    return html;
  };

  window.afterRenderEbookDetail = function () {
    var total = 15;
    var current = 1;
    var locked = false;
    var img = document.getElementById('ebookPageImg');
    var flip = document.getElementById('ebookPageFlip');

    function goTo(n, dir) {
      if (locked || n < 1 || n > total || n === current) return;
      locked = true;

      var newSrc = 'assets/huiben/' + n + '.jpg';
      if (dir === 'left') {
        // Flip page from left to right (prev)
        flip.style.transition = 'transform 0.4s ease';
        flip.style.transformOrigin = 'right center';
        flip.style.transform = 'rotateY(90deg)';
        setTimeout(function() {
          img.src = newSrc;
          flip.style.transition = 'none';
          flip.style.transform = 'rotateY(-90deg)';
          flip.style.transformOrigin = 'left center';
          setTimeout(function() {
            flip.style.transition = 'transform 0.4s ease';
            flip.style.transform = 'rotateY(0deg)';
            setTimeout(function() {
              flip.style.transition = 'none';
              flip.style.transformOrigin = 'center center';
              current = n;
              updateUI();
              locked = false;
            }, 420);
          }, 20);
        }, 420);
      } else {
        // Flip page from right to left (next)
        flip.style.transition = 'transform 0.4s ease';
        flip.style.transformOrigin = 'left center';
        flip.style.transform = 'rotateY(-90deg)';
        setTimeout(function() {
          img.src = newSrc;
          flip.style.transition = 'none';
          flip.style.transform = 'rotateY(90deg)';
          flip.style.transformOrigin = 'right center';
          setTimeout(function() {
            flip.style.transition = 'transform 0.4s ease';
            flip.style.transform = 'rotateY(0deg)';
            setTimeout(function() {
              flip.style.transition = 'none';
              flip.style.transformOrigin = 'center center';
              current = n;
              updateUI();
              locked = false;
            }, 420);
          }, 20);
        }, 420);
      }
    }

    function updateUI() {
      var numEl = document.getElementById('ebookPageNum');
      if (numEl) numEl.textContent = current;
    }

    function goNext() { goTo(current + 1, 'right'); }
    function goPrev() { goTo(current - 1, 'left'); }

    var nextBtn = document.getElementById('ebookNextBtn');
    var prevBtn = document.getElementById('ebookPrevBtn');
    if (nextBtn) nextBtn.addEventListener('click', goNext);
    if (prevBtn) prevBtn.addEventListener('click', goPrev);

    var tapRight = document.getElementById('ebookTapRight');
    var tapLeft = document.getElementById('ebookTapLeft');
    if (tapRight) tapRight.addEventListener('click', goNext);
    if (tapLeft) tapLeft.addEventListener('click', goPrev);

    document.addEventListener('keydown', function pageKey(e) {
      if (window.location.hash.indexOf('ebook/huiben') > -1) {
        if (e.key === 'ArrowRight') goNext();
        if (e.key === 'ArrowLeft') goPrev();
      }
    });

    updateUI();
  };

  // ── Render Dispatch ──────────────────────────────────────────
  var renderMap = {
    home:    'renderHome',
    study:   'renderStudy',
    craft:   'renderCraft',
    reading: 'renderReading',
    profile: 'renderProfile',
    viewer:  'renderViewer',
    shop:    'renderShop',
    ebook:   'renderEbookList'
  };

  // ── After-render Hooks (called after innerHTML is set) ──────
  var afterRenderMap = {
    home:    'afterRenderHome',
    profile: 'afterRenderProfile',
    shop:    'afterRenderShop',
    ebook:   'afterRenderEbookDetail',
    study:   'afterRenderStudy'
  };

  function renderPage(pageName, product) {
    var app = document.getElementById('app');
    if (!app) return;

    var renderFnName = renderMap[pageName];
    if (!renderFnName) {
      app.innerHTML = '<div class="page-placeholder"><p>页面未找到</p></div>';
      return;
    }

    var renderFn = window[renderFnName];
    if (typeof renderFn !== 'function') {
      app.innerHTML = '<div class="page-placeholder"><p>页面加载异常</p></div>';
      return;
    }

    // Determine active product / subrender param
    var activeProduct;
    if (pageName === 'study') {
      // study: null = list view, value = detail page
      activeProduct = product;
    } else if (['home', 'craft', 'reading', 'shop'].indexOf(pageName) !== -1) {
      // home/craft/reading/shop: default to first product
      activeProduct = product || 'oufen';
    } else if (pageName === 'ebook') {
      // ebook: null = list, huiben = detail
      activeProduct = product;
    } else {
      activeProduct = null;
    }

    // Dispatch rendering
    if (pageName === 'profile') {
      // Profile page: product param is the sub-page identifier (null = main page)
      app.innerHTML = renderFn(product);
    } else if (pageName === 'ebook' && product) {
      // ebook detail page
      var detailFn = window['renderEbookDetail'];
      app.innerHTML = typeof detailFn === 'function' ? detailFn() : '<div class="page-placeholder"><p>加载失败</p></div>';
    } else {
      app.innerHTML = renderFn(activeProduct);
    }

    // Apply theme colors only for product-aware pages
    if (activeProduct && ['home', 'craft', 'reading'].indexOf(pageName) !== -1) {
      var pp = window.getProduct(activeProduct);
      applyTheme(pp);
    }

    // Call after-render hook if one exists (skip for profile sub-pages)
    var afterFnName;
    if (pageName === 'ebook') {
      afterFnName = product ? 'afterRenderEbookDetail' : null;
    } else {
      afterFnName = afterRenderMap[pageName];
    }
    if (afterFnName && typeof window[afterFnName] === 'function') {
      window[afterFnName]();
    }
  }

  // ── Apply Theme Colors ────────────────────────────────────────
  function applyTheme(p) {
    var style = document.getElementById('product-theme-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'product-theme-style';
      document.head.appendChild(style);
    }
    style.textContent = '\
      :root {\
        --product-primary: ' + p.colors.primary + ';\
        --product-accent: ' + p.colors.accent + ';\
        --product-gold: ' + p.colors.gold + ';\
        --product-light: ' + p.colors.light + ';\
        --product-dark: ' + p.colors.dark + ';\
      }\
    ';
  }

  // ── Active Tab Highlight ─────────────────────────────────────
  function updateActiveTab(hash) {
    var fullPage = hash.replace('#', '') || 'home';
    var pageName = fullPage.split('?')[0].split('/')[0];
    var tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(function (item) {
      var tab = item.getAttribute('data-tab');
      if (tab === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // ── Route Change Handler ─────────────────────────────────────
  function onHashChange() {
    var hash = window.location.hash || '#home';
    var parsed = parseHash();
    renderPage(parsed.page, parsed.product);
    updateActiveTab(hash);
  }

  // ── Tab Click Handler ────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Ensure Data layer is initialized before first render
    window.Data.openDB(function () {
      // Initial render from URL hash
      if (!window.location.hash) {
        window.location.hash = 'home';
      }
      onHashChange();

      // Listen for hash changes
      window.addEventListener('hashchange', onHashChange);

      // Tab click handler (backup for direct clicks)
      var tabBar = document.getElementById('tabBar');
      if (tabBar) {
        tabBar.addEventListener('click', function (e) {
          var tabItem = e.target.closest('.tab-item');
          if (tabItem) {
            var tab = tabItem.getAttribute('data-tab');
            var productPages = ['home', 'craft', 'reading'];
            var currentProduct = getCurrentProduct();
            if (productPages.indexOf(tab) !== -1) {
              window.location.hash = tab + '/' + currentProduct;
            } else if (tab === 'study') {
              // study tab always goes to list page
              window.location.hash = 'study';
            } else {
              window.location.hash = tab;
            }
          }
        });
      }
    });
  });

})();

/* ══════════════════════════════════════════════════════════════
   Global Reading Tab Function (for reading page category switch)
   ══════════════════════════════════════════════════════════════ */

/**
 * Switch reading category tab.
 * @param {string} category - 'books', 'audio', 'video', or 'works'
 */
// switchReadingTab removed — no longer needed in the new reading page design.

/* ══════════════════════════════════════════════════════════════
   Study Task Functions (研学互动任务)
   ══════════════════════════════════════════════════════════════ */

/**
 * Toggle a study task item checkbox.
 * @param {HTMLElement} el - The clicked span element
 */
window.toggleStudyItem = function (el) {
  'use strict';
  if (!el) return;
  var productId = el.getAttribute('data-study-product');
  var taskIdx = parseInt(el.getAttribute('data-study-task'), 10);
  var itemIdx = parseInt(el.getAttribute('data-study-item'), 10);
  if (!window.Data || !productId) return;
  var checked = window.Data.toggleStudyTaskItem(productId, taskIdx, itemIdx);
  el.className = 'study-task-tag' + (checked ? ' checked' : '');
  el.textContent = (checked ? '☑' : '☐') + ' ' + el.textContent.substring(1).trim();
  // Trigger afterRenderStudy for other elements
};

/**
 * Save study task input value.
 * @param {HTMLElement} el - The textarea element
 */
window.saveStudyTaskInput = function (el) {
  'use strict';
  if (!el) return;
  var productId = el.getAttribute('data-study-product');
  var taskIdx = parseInt(el.getAttribute('data-study-task'), 10);
  if (!window.Data || !productId) return;
  window.Data.setStudyTaskInput(productId, taskIdx, el.value);
};

/**
 * After-render hook for study detail page.
 * Wires up any remaining elements that need event listeners.
 */
window.afterRenderStudy = function () {
  'use strict';
  // Restore textarea values from saved state (innerHTML doesn't preserve value attrs)
  var inputs = document.querySelectorAll('.study-task-input');
  for (var i = 0; i < inputs.length; i++) {
    var inp = inputs[i];
    var productId = inp.getAttribute('data-study-product');
    var taskIdx = parseInt(inp.getAttribute('data-study-task'), 10);
    if (window.Data && productId) {
      var saved = window.Data.getStudyTaskInput(productId, taskIdx);
      if (saved) inp.value = saved;
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   Culture Detail Modal (非遗文化·四大价值详情)
   ══════════════════════════════════════════════════════════════ */

/**
 * Show a modal with the full culture details (4 values) for a product.
 * @param {string} productId
 * @param {string} currentTitle - The title of the clicked value
 */
window.showCultureModal = function (productId, currentTitle) {
  'use strict';

  // Close any existing modal first
  var existing = document.getElementById('cultureModal');
  if (existing) {
    existing.parentNode.removeChild(existing);
  }

  var p = window.getProduct(productId);
  if (!p || !p.culture) return;

  var cultureKeys = ['history', 'craft', 'humanity', 'spread'];
  var cultureLabels = {
    history: '历史价值',
    craft: '工艺价值',
    humanity: '人文价值',
    spread: '传播价值'
  };

  var itemsHtml = '';
  for (var i = 0; i < cultureKeys.length; i++) {
    var key = cultureKeys[i];
    var val = p.culture[key];
    if (!val) continue;
    var isActive = (val.title === currentTitle);
    itemsHtml += '<div class="culture-detail-item' + (isActive ? ' active' : '') + '">'
      + '<div class="culture-detail-header">'
      + '<span class="culture-detail-icon">' + val.icon + '</span>'
      + '<div>'
      + '<span class="culture-detail-label">' + (cultureLabels[key] || key) + '</span>'
      + '<h3 class="culture-detail-title">' + val.title + '</h3>'
      + '</div>'
      + '</div>'
      + '<p class="culture-detail-desc">' + val.desc + '</p>'
      + '</div>';
  }

  // Build overlay
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'cultureModal';

  // Build content card
  var content = document.createElement('div');
  content.className = 'modal-content culture-modal-content';

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';

  // Title
  var titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.textContent = '🏛️ 非遗文化·四大价值';

  // Product name
  var pnameEl = document.createElement('p');
  pnameEl.className = 'modal-subtitle';
  pnameEl.textContent = p.name;

  // Items container
  var itemsDiv = document.createElement('div');
  itemsDiv.className = 'culture-detail-list';
  itemsDiv.innerHTML = itemsHtml;

  // Assemble
  content.appendChild(closeBtn);
  content.appendChild(titleEl);
  content.appendChild(pnameEl);
  content.appendChild(itemsDiv);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Close on overlay background click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      window.closeCultureModal();
    }
  });

  // Close button click
  closeBtn.addEventListener('click', window.closeCultureModal);
};

/**
 * Close the culture detail modal.
 */
window.closeCultureModal = function () {
  'use strict';
  var overlay = document.getElementById('cultureModal');
  if (overlay) {
    overlay.parentNode.removeChild(overlay);
  }
};

/* ══════════════════════════════════════════════════════════════
   Elder Large Font Mode (长辈大字版)
   ══════════════════════════════════════════════════════════════ */

/**
 * Toggle elder large font mode.
 * @param {boolean} on
 */
window.setElderMode = function (on) {
  'use strict';
  if (on === undefined) {
    on = window.Data ? window.Data.getSetting('elderMode', true) : true;
  }
  if (window.Data) {
    window.Data.setSetting('elderMode', on);
  }
  document.body.classList.toggle('elder-mode', on);
};

// Initialize elder mode on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    window.setElderMode();
  });
} else {
  window.setElderMode();
}

// Suppress unhandled promise rejections from browser extensions on study pages
window.addEventListener('unhandledrejection', function (e) {
  if (e.reason && typeof e.reason.stack === 'string' &&
      e.reason.stack.indexOf('single-file-bootstrap') !== -1) {
    e.preventDefault();
  }
});

/* ══════════════════════════════════════════════════════════════
   Global Modal Functions (for culture page media playback)
   ══════════════════════════════════════════════════════════════ */

/**
 * Show a media modal overlay with placeholder content.
 * @param {string} type - 'video' or 'audio'
 * @param {string} title - Display title for the modal
 */
window.showMediaModal = function (type, title) {
  'use strict';

  // Close any existing modal first
  var existing = document.getElementById('mediaModal');
  if (existing) {
    existing.parentNode.removeChild(existing);
  }

  // Build overlay
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'mediaModal';

  // Build content card
  var content = document.createElement('div');
  content.className = 'modal-content';

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';

  // Title
  var titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  // Media placeholder
  var placeholder = document.createElement('div');
  placeholder.className = 'modal-placeholder';
  placeholder.textContent = (type === 'video')
    ? '视频播放区域 (CCTV纪录片片段)'
    : '音频播放区域 (喜马拉雅音频)';

  // Assemble
  content.appendChild(closeBtn);
  content.appendChild(titleEl);
  content.appendChild(placeholder);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Close on overlay background click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      window.closeMediaModal();
    }
  });

  // Close button click
  closeBtn.addEventListener('click', window.closeMediaModal);
};

/**
 * Close the media modal overlay.
 */
window.closeMediaModal = function () {
  'use strict';
  var overlay = document.getElementById('mediaModal');
  if (overlay) {
    overlay.parentNode.removeChild(overlay);
  }
};
