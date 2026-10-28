/**
 * 沪上呼呼·藕粉非遗 — 数据持久化层
 *
 * IndexedDB（收藏/徽章/订单）+ localStorage（用户设置/积分）统一封装。
 * 使用内存缓存，读取操作同步返回，写入后自动刷新缓存。
 *
 * 使用方式：
 *   window.Data.openDB(function () { … });   // 确保 DB 就绪
 *   window.Data.getUserScore();               // 同步返回
 *   window.Data.getCollections();             // 同步返回（内存缓存）
 *   window.Data.addBadge('first_visit', '初识藕粉');
 */

(function () {
  'use strict';

  var Data = {};

  // ── In-memory Cache ──────────────────────────────────────────
  var _cache = {
    collections: [],
    badges: []
  };
  var _db = null;
  var _dbReady = false;
  var _opening = false;
  var _pending = [];

  // ── Level System ─────────────────────────────────────────────
  var LEVELS = [
    { level: 1, min: 0,    max: 99,   name: '非遗入门者' },
    { level: 2, min: 100,  max: 299,  name: '非遗小学徒' },
    { level: 3, min: 300,  max: 599,  name: '非遗小匠人' },
    { level: 4, min: 600,  max: 999,  name: '非遗传承人' },
    { level: 5, min: 1000, max: 9999, name: '非遗大师' }
  ];

  /**
   * Calculate level info from score.
   */
  function calcLevel(score) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (score >= LEVELS[i].min) {
        return {
          level: LEVELS[i].level,
          levelName: LEVELS[i].name,
          min: LEVELS[i].min,
          max: LEVELS[i].max
        };
      }
    }
    return { level: 1, levelName: LEVELS[0].name, min: 0, max: 99 };
  }

  /**
   * Calculate progress percentage within current level.
   */
  function calcProgress(score) {
    var info = calcLevel(score);
    if (!info.max || info.max <= info.min) return 100;
    var pct = ((score - info.min) / (info.max - info.min)) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  // ── IndexedDB ─────────────────────────────────────────────────
  var DB_NAME = 'HushangDB';
  var DB_VERSION = 1;

  function openDBInternal(callback) {
    // Prevent opening the DB twice
    if (_opening) {
      if (callback) {
        enqueue(function () { if (callback) callback(null); });
      }
      return;
    }
    _opening = true;

    var request;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      console.error('[Data] indexedDB.open() error:', err);
      _opening = false;
      if (callback) callback(err);
      return;
    }

    request.onupgradeneeded = function (e) {
      var db = e.target.result;

      if (!db.objectStoreNames.contains('collections')) {
        var colStore = db.createObjectStore('collections', { keyPath: 'id', autoIncrement: true });
        colStore.createIndex('itemId', 'itemId', { unique: false });
      }
      if (!db.objectStoreNames.contains('badges')) {
        db.createObjectStore('badges', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = function (e) {
      _db = e.target.result;
      _dbReady = true;

      // Graceful error handler for the connection
      _db.onerror = function (ev) {
        console.error('[Data] DB connection error:', ev.target.error);
      };

      loadCache(function () {
        if (callback) callback(null);
        flushPending();
      });
    };

    request.onerror = function (e) {
      console.error('[Data] IndexedDB open error:', e.target.error);
      _opening = false;
      if (callback) callback(e.target.error);
    };
  }

  /**
   * Load all data from IndexedDB into in-memory cache.
   */
  function loadCache(callback) {
    if (!_db) {
      if (callback) callback();
      return;
    }

    try {
      var tx = _db.transaction(['collections', 'badges'], 'readonly');

      tx.objectStore('collections').getAll().onsuccess = function (e) {
        _cache.collections = e.target.result || [];
      };
      tx.objectStore('badges').getAll().onsuccess = function (e) {
        _cache.badges = e.target.result || [];
      };

      tx.oncomplete = function () {
        if (callback) callback();
      };
      tx.onerror = function (e) {
        console.warn('[Data] loadCache tx error:', e.target.error);
        if (callback) callback();
      };
    } catch (err) {
      console.warn('[Data] loadCache error:', err);
      if (callback) callback();
    }
  }

  function flushPending() {
    var arr = _pending.slice();
    _pending = [];
    for (var i = 0; i < arr.length; i++) {
      try { arr[i](); } catch (e) { console.warn('[Data] pending fn error:', e); }
    }
  }

  function enqueue(fn) {
    if (_dbReady) {
      try { fn(); } catch (e) { console.warn('[Data] enqueue fn error:', e); }
    } else {
      _pending.push(fn);
    }
  }

  // ── Public: openDB ───────────────────────────────────────────
  /**
   * Open IndexedDB and populate cache. Callback fires when ready.
   * @param {Function} [callback] — fires with (err|null)
   */
  Data.openDB = function (callback) {
    if (_dbReady) {
      // DB is already ready — fire callback asynchronously
      if (callback) {
        setTimeout(function () { callback(null); }, 0);
      }
      return;
    }
    openDBInternal(callback);
  };

  // ── Collections ──────────────────────────────────────────────
  /**
   * Add an item to collections.
   * @param {Object} item — { type, itemId, title, image }
   * @param {Function} [callback] — fires with (err, id)
   */
  Data.addCollection = function (item, callback) {
    enqueue(function () {
      var tx = _db.transaction('collections', 'readwrite');
      var store = tx.objectStore('collections');
      var data = {
        type: item.type || '',
        itemId: item.itemId || '',
        title: item.title || '',
        image: item.image || '',
        createdAt: Date.now()
      };
      var req = store.add(data);
      req.onsuccess = function () {
        loadCache(function () {
          if (callback) callback(null, req.result);
        });
      };
      req.onerror = function (e) {
        if (callback) callback(e.target.error);
      };
    });
  };

  /**
   * Get all collection items (sync from cache).
   * @returns {Array}
   */
  Data.getCollections = function () {
    return _cache.collections.slice();
  };

  /**
   * Remove a collection item by its DB id.
   * @param {number} id
   * @param {Function} [callback]
   */
  Data.removeCollection = function (id, callback) {
    enqueue(function () {
      var tx = _db.transaction('collections', 'readwrite');
      var store = tx.objectStore('collections');
      var req = store.delete(id);
      req.onsuccess = function () {
        loadCache(function () {
          if (callback) callback();
        });
      };
      req.onerror = function (e) {
        if (callback) callback(e.target.error);
      };
    });
  };

  /**
   * Check if an itemId is already collected (sync from cache).
   * @param {string} itemId
   * @returns {boolean}
   */
  Data.isCollected = function (itemId) {
    return _cache.collections.some(function (c) { return c.itemId === itemId; });
  };

  // ── Badges ───────────────────────────────────────────────────
  /**
   * Unlock a badge. No-op if already unlocked.
   * @param {string} badgeId
   * @param {string} name
   * @param {Function} [callback]
   */
  Data.addBadge = function (badgeId, name, callback) {
    enqueue(function () {
      if (Data.hasBadge(badgeId)) {
        if (callback) callback();
        return;
      }
      var tx = _db.transaction('badges', 'readwrite');
      var store = tx.objectStore('badges');
      var req = store.add({
        badgeId: badgeId,
        name: name,
        unlockedAt: Date.now(),
        icon: '🏅'
      });
      req.onsuccess = function () {
        loadCache(function () {
          if (callback) callback();
        });
      };
      req.onerror = function (e) {
        if (callback) callback(e.target.error);
      };
    });
  };

  /**
   * Get all unlocked badges (sync from cache).
   * @returns {Array}
   */
  Data.getBadges = function () {
    return _cache.badges.slice();
  };

  /**
   * Check if a badge is unlocked (sync from cache).
   * @param {string} badgeId
   * @returns {boolean}
   */
  Data.hasBadge = function (badgeId) {
    return _cache.badges.some(function (b) { return b.badgeId === badgeId; });
  };

  // ── localStorage: Settings ───────────────────────────────────
  /**
   * Get a user setting from localStorage.
   * @param {string} key
   * @param {*} defaultVal
   * @returns {*}
   */
  Data.getSetting = function (key, defaultVal) {
    try {
      var raw = localStorage.getItem('hshh_' + key);
      if (raw === null) return defaultVal;
      return JSON.parse(raw);
    } catch (e) {
      return defaultVal;
    }
  };

  /**
   * Set a user setting in localStorage.
   * @param {string} key
   * @param {*} val
   */
  Data.setSetting = function (key, val) {
    try {
      localStorage.setItem('hshh_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('[Data] localStorage write error:', e);
    }
  };

  // ── Study Interaction Tasks (研学互动任务) ─────────────────────
  /**
   * Get study task state for a product.
   * @param {string} productId
   * @returns {object|null}
   */
  Data.getStudyTasks = function (productId) {
    try {
      var raw = localStorage.getItem('hshh_study_' + productId);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  /**
   * Save study task state for a product.
   * @param {string} productId
   * @param {object} state
   */
  Data.setStudyTasks = function (productId, state) {
    try {
      localStorage.setItem('hshh_study_' + productId, JSON.stringify(state));
    } catch (e) {
      console.warn('[Data] localStorage write error:', e);
    }
  };

  /**
   * Toggle a task item checkbox.
   * @param {string} productId
   * @param {number} taskIdx - 0, 1, or 2
   * @param {number} itemIdx
   * @returns {boolean} new checked state
   */
  Data.toggleStudyTaskItem = function (productId, taskIdx, itemIdx) {
    var state = Data.getStudyTasks(productId) || {};
    var key = 't' + taskIdx + '_i' + itemIdx;
    state[key] = !state[key];
    Data.setStudyTasks(productId, state);
    return state[key];
  };

  /**
   * Get checked state of a task item.
   */
  Data.getStudyTaskItemChecked = function (productId, taskIdx, itemIdx) {
    var state = Data.getStudyTasks(productId);
    if (!state) return false;
    return !!state['t' + taskIdx + '_i' + itemIdx];
  };

  /**
   * Save input value for a task.
   * @param {string} productId
   * @param {number} taskIdx - 1 or 2 (0-indexed)
   * @param {string} value
   */
  Data.setStudyTaskInput = function (productId, taskIdx, value) {
    var state = Data.getStudyTasks(productId) || {};
    state['input_' + taskIdx] = value;
    Data.setStudyTasks(productId, state);
  };

  /**
   * Get saved input value for a task.
   */
  Data.getStudyTaskInput = function (productId, taskIdx) {
    var state = Data.getStudyTasks(productId);
    if (!state) return '';
    return state['input_' + taskIdx] || '';
  };

  // ── Score ────────────────────────────────────────────────────
  function getScore() {
    return Data.getSetting('score', 1280);
  }

  /**
   * Get current user score info (sync).
   * @returns {{ score: number, level: number, levelName: string, progress: number }}
   */
  Data.getUserScore = function () {
    var score = getScore();
    var info = calcLevel(score);
    return {
      score: score,
      level: info.level,
      levelName: info.levelName,
      progress: calcProgress(score)
    };
  };

  /**
   * Add points to user score.
   * @param {number} points
   * @returns {{ score: number, level: number, levelName: string, progress: number }}
   */
  Data.addScore = function (points) {
    var current = getScore();
    Data.setSetting('score', Math.max(0, current + points));
    return Data.getUserScore();
  };

  // ── Auto-init ────────────────────────────────────────────────
  if (typeof indexedDB !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { Data.openDB(); });
    } else {
      Data.openDB();
    }
  }

  // ── Expose ───────────────────────────────────────────────────
  window.Data = Data;
})();

/* ══════════════════════════════════════════════════════════════
   Product Data — 4 款非遗产品
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var P = {
    oufen: {
      id: 'oufen', name: '藕粉', tag: '藕粉·幼儿非遗', emoji: '🌸',
      bannerSubtitle: '带孩子探索非遗之美', bannerBtn: '探索非遗文化',
      bannerImg: 'assets/oufen/banner_thumb.jpg',
      discoverTitle: '发现',
      discover: [
        { id: 'history', img: 'assets/oufen/mmexport1780359855625.jpg', title: '藕粉的历史', desc: '从宋代流传至今的江南味道' },
        { id: 'grow', img: 'assets/oufen/mmexport1780359857215.jpg', title: '莲藕的生长', desc: '淤泥中孕育的洁白宝藏' },
        { id: 'craft', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=古法+制作', title: '古法制作技艺', desc: '十余道工序，手工传承的匠心' },
        { id: 'culture', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=江南+藕文化', title: '江南藕文化', desc: '藕粉里的水乡记忆与民俗风情' }
      ],
      master: { name: '李师傅', desc: '非遗技艺传承人·李宝大，用心守护每一份传统滋味', initial: '李', image: 'assets/qita/Snipaste_2026-06-03_14-06-33.png' },
      colors: { primary: '#F7E1D7', accent: '#8B7355', gold: '#D4B98C', light: '#FBF8F5', dark: '#5C4A3E' },
      culture: {
        history:   { icon: '📜', title: '历史价值', desc: '藕粉制作技艺可追溯至宋代，江南水乡的藕农们世代传承着这一古老手艺...' },
        craft:     { icon: '🔬', title: '工艺价值', desc: '从选藕、清洗、磨浆到过滤、沉淀、晾晒，十余道工序环环相扣...' },
        humanity:  { icon: '👨‍👩‍👧‍👦', title: '人文价值', desc: '藕粉不仅是一种食品，更承载着江南人家的饮食记忆与文化情感...' },
        spread:    { icon: '🌐', title: '传播价值', desc: '近年来，藕粉制作技艺被列入非物质文化遗产保护名录...' }
      },
      craftMaterials: [
        { icon: '🪷', name: '鲜莲藕', desc: '新鲜采挖的莲藕' },
        { icon: '⛰️', name: '石磨', desc: '传统石磨或磨浆机' },
        { icon: '🧣', name: '过滤布袋', desc: '细密过滤布袋' },
        { icon: '♨️', name: '蒸笼', desc: '竹制蒸笼' }
      ],
      craftTags: [
        { letter: '白', label: '色泽洁白' }, { letter: '细', label: '粉质细腻' },
        { letter: '糯', label: '口感软糯' }, { letter: '滑', label: '入口爽滑' },
        { letter: '纯', label: '纯粹无添加' }
      ],
      craftSteps: [
        { num: 1, icon: '🔍', title: '选藕', desc: '精选新鲜莲藕，藕身圆润饱满，淀粉含量高', img: 'assets/oufen/mmexport1780359848568.jpg' },
        { num: 2, icon: '⚪', title: '磨浆', desc: '石磨慢磨成浆，保留藕香与营养', img: 'assets/oufen/mmexport1780359849748.jpg' },
        { num: 3, icon: '🧴', title: '过滤', desc: '过滤布袋多层过滤，去除杂质，提取纯浆', img: 'assets/oufen/mmexport1780359851295.jpg' },
        { num: 4, icon: '🧺', title: '沉淀', desc: '纯浆静置沉淀，倒去上层清液，留下藕粉湿块', img: 'assets/oufen/mmexport1780359852803.jpg' },
        { num: 5, icon: '♨️', title: '蒸煮', desc: '湿藕粉入蒸笼蒸熟，切片晾干即成纯正藕粉', img: 'assets/oufen/mmexport1780359854152.jpg' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉小匠的一天', desc: '跟着呼呼学做藕粉' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=江南水乡的秘密', desc: '探索藕的生长奥秘' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=非遗小传承人', desc: '了解藕粉非遗文化' }
        ],
        audio: [
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉制作' },
          { img: 'assets/xianhuabing/reading_audio02.jpg', desc: '鲜花饼制作' },
          { img: 'assets/mahua/reading_audio03.jpg', desc: '麻花制作' }
        ],
        video: [
          { img: 'assets/1618634110353097372_thumb.jpg', desc: '藕粉制作' },
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉发展' },
          { img: 'assets/oufen/reading_video03.jpg', desc: '藕粉科普' }
        ],
        works: [
          { img: 'assets/qita/mmexport1780421389326.jpg', desc: '采莲藕' },
          { img: 'assets/qita/mmexport1780421387116.jpg', desc: '做藕粉' }
        ]
      },
      works: [
        { img: 'https://placehold.co/200x150/F7E1D7/8B7355?text=荷花图', title: '荷花图', author: '小明 6岁' },
        { img: 'https://placehold.co/200x150/F7E1D7/8B7355?text=藕花篮', title: '藕花篮', author: '小红 5岁' },
        { img: 'https://placehold.co/200x150/F7E1D7/8B7355?text=彩藕', title: '彩藕', author: '小华 7岁' }
      ],
      study: {
        name: '糯糯藕粉',
        emoji: '🥣',
        intro: '🥣 趣味藕粉非遗研学上线啦！走进传统工坊，解锁藕粉的前世今生与古法制作工艺，亲手揉粉、成型、蒸煮专属香甜藕粉甜品，聆听非遗睡前故事，勇敢上台展示手作成果收获掌声。节奏轻松有趣，专为3-6岁宝宝打造，亲子相伴欢乐满满，全程老师陪同守护，让孩子在动手玩乐中感受非遗文化的独特魅力，两天一晚体验地道传统美食智慧！',
        schedule: {
          day1: { title: '古法藕粉初体验', morning: '参观古法藕粉工坊，观摩磨浆工艺，认识制作原料与工具，了解藕粉的历史与传统工艺的神奇之处', afternoon: '手工课堂，在老师指导下学习揉粉、塑形、蒸煮，亲手制作专属藕粉甜品', evening: '非遗故事会，聆听传承人讲述藕粉趣味传说，伴着藕香享受温馨睡前故事，休整身心' },
          day2: { title: '成品品鉴 & 成果展示', morning: '品尝自己制作的藕粉甜品；开展趣味作品分享展示活动，自信上台分享，收获小伙伴与老师的掌声', afternoon: '合影留念，整理研学收获，带着手作美食与美好回忆愉快返程' }
        },
        checkpoints: [
          { name: '古法工坊', task: '观察磨浆过程与原料，画一画你看到的莲藕或制作工具' },
          { name: '手工制作区', task: '画出制作藕粉甜品的步骤（揉、塑、蒸）' },
          { name: '故事小屋', task: '画下睡前故事里你最喜欢的画面或角色' },
          { name: '展示舞台', task: '画出上台分享时自信的自己' }
        ],
        interactiveTasks: [
          { name: '非遗小侦探', items: ['石磨', '莲藕', '蒸笼', '模具'] },
          { name: '我的制作配方', items: [] },
          { name: '小小提问家', items: [] }
        ]
      }
    },
    mahua: {
      id: 'mahua', name: '麻花', tag: '麻花·幼儿非遗', emoji: '🥨',
      bannerSubtitle: '百年手艺，一捻成型', bannerBtn: '了解麻花文化',
      bannerImg: 'assets/mahua/banner_thumb.jpg',
      discoverTitle: '发现',
      discover: [
        { id: 'origin', img: 'assets/mahua/mmexport1780360293422.jpg', title: '麻花的由来', desc: '宋代起源的千年酥脆传奇' },
        { id: 'variety', img: 'assets/mahua/mmexport1780358735250.jpg', title: '麻花的种类', desc: '各地麻花的风味与特点' },
        { id: 'twist', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=拧麻花+技巧', title: '拧麻花技巧', desc: '一搓一拧间的功夫与学问' },
        { id: 'snack', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=传统+小食', title: '传统小食文化', desc: '街头巷尾的酥脆童年记忆' }
      ],
      master: { name: '吕师傅', desc: '非遗技艺传承人·吕自彬，传承百年手艺·发扬地方特色', initial: '吕', image: 'assets/qita/Snipaste_2026-06-03_14-05-44.png' },
      colors: { primary: '#D4A06A', accent: '#8B6914', gold: '#E8C87A', light: '#FDF6EC', dark: '#5C4020' },
      culture: {
        history:   { icon: '📜', title: '历史价值', desc: '麻花起源于宋代，历经千年演变，成为中国民间最具代表性的传统面点之一...' },
        craft:     { icon: '🔬', title: '工艺价值', desc: '从和面、醒发、搓条到拧花、油炸，每一道工序都考验着匠人的经验与手感...' },
        humanity:  { icon: '👨‍👩‍👧‍👦', title: '人文价值', desc: '麻花不仅是街头巷尾的美味，更承载着团圆、喜庆的民俗记忆与文化情感...' },
        spread:    { icon: '🌐', title: '传播价值', desc: '如今麻花制作技艺已列入非遗名录，成为展示中华饮食文化的重要窗口...' }
      },
      craftMaterials: [
        { icon: '🌾', name: '面粉', desc: '精选高筋面粉' },
        { icon: '🫒', name: '食用油', desc: '纯正菜籽油' },
        { icon: '🥢', name: '擀面杖', desc: '实木擀面杖' },
        { icon: '🥣', name: '面盆', desc: '揉面用面盆' }
      ],
      craftTags: [
        { letter: '酥', label: '酥脆可口' }, { letter: '脆', label: '口感酥脆' },
        { letter: '香', label: '香气四溢' }, { letter: '匀', label: '色泽均匀' },
        { letter: '巧', label: '造型精巧' }
      ],
      craftSteps: [
        { num: 1, icon: '🥣', title: '备料', desc: '准备面粉、鸡蛋、白糖等原料，按比例调配', img: 'assets/mahua/mmexport1780358733747.jpg' },
        { num: 2, icon: '✊', title: '揉面', desc: '将面粉加入鸡蛋、温水，揉成光滑面团', img: 'assets/mahua/mmexport1780358735250.jpg' },
        { num: 3, icon: '⏳', title: '醒面', desc: '面团盖上湿布，静置醒发三十分钟', img: 'assets/mahua/mmexport1780358737960.jpg' },
        { num: 4, icon: '✋', title: '扭花', desc: '将面团搓成长条，左右手反向拧成麻花状', img: 'assets/mahua/mmexport1780358739356.jpg' },
        { num: 5, icon: '🍳', title: '炸制', desc: '油温六成热，放入麻花炸至金黄酥脆捞出', img: 'assets/mahua/mmexport1780358740700.jpg' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=小麻花奇遇记', desc: '跟着小麻花去冒险' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=面点小师傅', desc: '学习做麻花的快乐' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=街头小吃的故事', desc: '了解麻花的历史' }
        ],
        audio: [
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉制作' },
          { img: 'assets/xianhuabing/reading_audio02.jpg', desc: '鲜花饼制作' },
          { img: 'assets/mahua/reading_audio03.jpg', desc: '麻花制作' }
        ],
        video: [
          { img: 'assets/1618634110353097372_thumb.jpg', desc: '藕粉制作' },
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉发展' },
          { img: 'assets/oufen/reading_video03.jpg', desc: '藕粉科普' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花创意画', desc: '采莲藕' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=迷你小麻花', desc: '做藕粉' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花包装设计', desc: '设计师：糖糖' }
        ]
      },
      works: [
        { img: 'https://placehold.co/200x150/D4A06A/FFFFFF?text=麻花辫', title: '麻花辫', author: '乐乐 6岁' },
        { img: 'https://placehold.co/200x150/D4A06A/FFFFFF?text=金灿灿', title: '金灿灿', author: '瑶瑶 5岁' },
        { img: 'https://placehold.co/200x150/D4A06A/FFFFFF?text=小麻花', title: '小麻花', author: '豆豆 7岁' }
      ],
      study: {
        name: '脆脆小麻花',
        emoji: '🥨',
        intro: '🥨 趣味麻花研学上线啦！走进传统作坊，解锁麻花千年制作工艺，亲手揉面、搓条、炸制专属香酥麻花，聆听民俗小故事，勇敢展示作品收获掌声。节奏轻松有趣，亲子相伴欢乐满满，全程老师陪同守护，让孩子在动手玩乐中感受传统小吃的魅力，两天一晚体验地道传统美食文化！',
        schedule: {
          day1: { title: '古法麻花初体验', morning: '参观传统麻花作坊，认识制作工具与原料，了解麻花的历史与民俗文化', afternoon: '手工课堂，跟着师傅学习揉面、醒面、搓条、扭花，亲手制作麻花生胚', evening: '民俗故事会，聆听麻花相关趣味传说，温馨休整' },
          day2: { title: '成品品鉴 & 成果展示', morning: '加工烤制/炸制麻花，品尝自己制作的美食；开展作品分享展示活动', afternoon: '合影留念，整理收获，愉快返程' }
        },
        checkpoints: [
          { name: '传统作坊', task: '观察原料与工具，画一画你看到的食材' },
          { name: '手工制作区', task: '画出制作麻花的步骤' },
          { name: '故事小屋', task: '画下故事里你最喜欢的画面' },
          { name: '展示舞台', task: '画出上台分享的自己' }
        ],
        interactiveTasks: [
          { name: '美食小侦探', items: ['擀面杖', '案板', '油锅', '面盆'] },
          { name: '我的制作配方', items: [] },
          { name: '小小提问家', items: [] }
        ]
      }
    },
    rosecake: {
      id: 'rosecake', name: '鲜花饼', tag: '鲜花饼·幼儿非遗', emoji: '🌹',
      bannerSubtitle: '花香入饼，酥甜相宜', bannerBtn: '品味鲜花饼文化',
      bannerImg: 'assets/xianhuabing/banner_thumb.jpg',
      discoverTitle: '发现',
      discover: [
        { id: 'legend', img: 'assets/xianhuabing/mmexport1780358787783.jpg', title: '鲜花饼的传说', desc: '一朵玫瑰花背后的浪漫故事' },
        { id: 'flowers', img: 'assets/xianhuabing/mmexport1780358742133.jpg', title: '可食用花卉', desc: '哪些花可以做成美味点心' },
        { id: 'bake', img: 'https://placehold.co/300x180/F0C4C4/C48A8A?text=花香+秘诀', title: '花香制作秘诀', desc: '锁住花香的古法烘焙技艺' },
        { id: 'season', img: 'https://placehold.co/300x180/F0C4C4/C48A8A?text=四季+花食', title: '四季花食文化', desc: '跟着节气吃花，品味自然馈赠' }
      ],
      master: { name: '李师傅', desc: '祖传四代的鲜花饼手艺，坚守传统配方与手工开酥工艺...', initial: '李' },
      colors: { primary: '#F0C4C4', accent: '#C48A8A', gold: '#E8B4B4', light: '#FEF0F0', dark: '#6B4040' },
      culture: {
        history:   { icon: '📜', title: '历史价值', desc: '鲜花饼源于云南，清代就成为皇家贡品，以食用玫瑰花入馅的独特制法流传至今...' },
        craft:     { icon: '🔬', title: '工艺价值', desc: '从玫瑰采摘、腌制到油皮油酥的制作、包馅烘烤，每一步都是技艺与耐心的结晶...' },
        humanity:  { icon: '👨‍👩‍👧‍👦', title: '人文价值', desc: '鲜花饼传递着云南各族人民对自然馈赠的感恩，也寄托着对美好生活的向往...' },
        spread:    { icon: '🌐', title: '传播价值', desc: '如今鲜花饼已成为云南非遗美食名片，让世界品尝到东方花食文化的独特魅力...' }
      },
      craftMaterials: [
        { icon: '🌹', name: '玫瑰馅料', desc: '新鲜玫瑰腌制馅料' },
        { icon: '🥮', name: '饼皮', desc: '油皮油酥面团' },
        { icon: '🖨️', name: '模具', desc: '印花木模具' },
        { icon: '🫓', name: '烤盘', desc: '耐高温烤盘' }
      ],
      craftTags: [
        { letter: '香', label: '花香四溢' }, { letter: '甜', label: '甜而不腻' },
        { letter: '酥', label: '外皮酥脆' }, { letter: '软', label: '口感绵软' },
        { letter: '鲜', label: '新鲜可口' }
      ],
      craftSteps: [
        { num: 1, icon: '🌹', title: '备馅', desc: '新鲜玫瑰花加入白糖腌制，揉入熟糯米粉制成玫瑰馅', img: 'assets/xianhuabing/mmexport1780358782010.jpg' },
        { num: 2, icon: '✋', title: '揉皮', desc: '分别制作油皮和油酥，猪油与面粉充分揉合', img: 'assets/xianhuabing/mmexport1780358783191.jpg' },
        { num: 3, icon: '🥟', title: '包制', desc: '酥皮包入玫瑰馅料，收口捏紧成球状', img: 'assets/xianhuabing/mmexport1780358784317.jpg' },
        { num: 4, icon: '🖨️', title: '压模', desc: '放入木模具中压扁成型，印出漂亮花纹', img: 'assets/xianhuabing/mmexport1780358785510.jpg' },
        { num: 5, icon: '🔥', title: '烘烤', desc: '烤箱预热后放入，烤至表面金黄酥脆即可', img: 'assets/xianhuabing/mmexport1780358786657.jpg' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花的旅行', desc: '小玫瑰去冒险' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=花园里的秘密', desc: '认识各种鲜花' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=小小面点师', desc: '学做鲜花饼' }
        ],
        audio: [
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉制作' },
          { img: 'assets/xianhuabing/reading_audio02.jpg', desc: '鲜花饼制作' },
          { img: 'assets/mahua/reading_audio03.jpg', desc: '麻花制作' }
        ],
        video: [
          { img: 'assets/1618634110353097372_thumb.jpg', desc: '藕粉制作' },
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉发展' },
          { img: 'assets/oufen/reading_video03.jpg', desc: '藕粉科普' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花创意画', desc: '采莲藕' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=彩泥鲜花饼', desc: '做藕粉' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=花园手抄报', desc: '设计师：欣欣' }
        ]
      },
      works: [
        { img: 'https://placehold.co/200x150/F0C4C4/8B6B6B?text=玫瑰花篮', title: '玫瑰花篮', author: '小美 6岁' },
        { img: 'https://placehold.co/200x150/F0C4C4/8B6B6B?text=花饼拼盘', title: '花饼拼盘', author: '乐乐 5岁' },
        { img: 'https://placehold.co/200x150/F0C4C4/8B6B6B?text=花园', title: '花园', author: '甜甜 7岁' }
      ],
      study: {
        name: '甜甜鲜花饼',
        emoji: '🌸',
        intro: '🌸 一口花香，趣味研学！探秘鲜花饼工坊，认识各色食用鲜花，学习传统包饼、压模、烘烤技艺，动手揉皮、包馅、压模，制作花香满满的鲜花饼。聆听花食文化故事，展示专属手作。两天一晚，在花香中感受传统点心文化，沉浸式体验舌尖上的花香传统！',
        schedule: {
          day1: { title: '花香工坊探秘', morning: '参观鲜花饼工坊，认识食用玫瑰等原料，了解鲜花饼的由来与地域文化', afternoon: '手工课堂，学习揉制饼皮、调配花馅、包制饼胚、印花造型', evening: '花食故事会，了解鲜花入食的传统习俗，休息调整' },
          day2: { title: '烘烤品鉴 & 成果展示', morning: '统一烘烤鲜花饼，品尝亲手制作的点心；开展作品分享、互动小游戏', afternoon: '集体合影，整理物品，结束研学返程' }
        },
        checkpoints: [
          { name: '原料工坊', task: '观察各类鲜花与食材，画一画漂亮的食用花' },
          { name: '手工制作区', task: '画出包鲜花饼的完整步骤' },
          { name: '故事小屋', task: '记录/绘画听到的花食小故事' },
          { name: '展示舞台', task: '贴上贴纸或画出展示作品的模样' }
        ],
        interactiveTasks: [
          { name: '美食小侦探', items: ['模具', '擀面杖', '托盘', '烤盘'] },
          { name: '我的制作配方', items: [] },
          { name: '小小提问家', items: [] }
        ]
      }
    },
    taigubing: {
      id: 'taigubing', name: '太谷饼', tag: '太谷饼·幼儿非遗', emoji: '🫓',
      bannerSubtitle: '枣香浓郁，甜而不腻', bannerBtn: '了解太谷饼文化',
      bannerImg: 'assets/taigubing/banner_thumb.jpg',
      discoverTitle: '发现',
      discover: [
        { id: 'story', img: 'assets/taigubing/mmexport1780358842884.jpg', title: '太谷饼的故事', desc: '山西百年名点的传奇往事' },
        { id: 'shanxi', img: 'assets/taigubing/mmexport1780360294785.jpg', title: '山西面食文化', desc: '一面百样的面食王国' },
        { id: 'ancient', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=古法+烘焙', title: '古法烘焙技艺', desc: '传统炉火烤制的时光味道' },
        { id: 'grain', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=五谷+文化', title: '五谷杂粮文化', desc: '黄土地上的五谷智慧与传承' }
      ],
      master: { name: '张师傅', desc: '太谷县老字号传承人，四十载匠心坚守，只为一口正宗太谷饼...', initial: '张' },
      colors: { primary: '#E8C87A', accent: '#A08040', gold: '#F0D898', light: '#FEF8E8', dark: '#5C4020' },
      culture: {
        history:   { icon: '📜', title: '历史价值', desc: '太谷饼起源于山西太谷县，已有两百余年历史，是晋商饮食文化的代表之一...' },
        craft:     { icon: '🔬', title: '工艺价值', desc: '以枣泥入馅、炉火烤制，独特的"三翻三烤"工艺造就了外酥里软的口感...' },
        humanity:  { icon: '👨‍👩‍👧‍👦', title: '人文价值', desc: '太谷饼承载着晋商走南闯北的乡愁记忆，是山西人逢年过节必备的传统糕点...' },
        spread:    { icon: '🌐', title: '传播价值', desc: '太谷饼制作技艺已列入省级非遗名录，成为山西美食文化走向全国的金字招牌...' }
      },
      craftMaterials: [
        { icon: '🌾', name: '麦粉', desc: '山西优质小麦粉' },
        { icon: '🧈', name: '酥油', desc: '传统熬制酥油' },
        { icon: '🪵', name: '木模具', desc: '实木成型模具' },
        { icon: '🔥', name: '烤炉', desc: '传统炭火烤炉' }
      ],
      craftTags: [
        { letter: '松', label: '口感松软' }, { letter: '软', label: '绵软可口' },
        { letter: '香', label: '枣香浓郁' }, { letter: '酥', label: '外酥里软' },
        { letter: '醇', label: '口味醇正' }
      ],
      craftSteps: [
        { num: 1, icon: '🥣', title: '和面', desc: '面粉加入糖稀、酥油、温水，和成柔软面团', img: 'assets/taigubing/mmexport1780358820213.jpg' },
        { num: 2, icon: '✋', title: '起酥', desc: '面团反复折叠擀制，形成层层酥层', img: 'assets/taigubing/mmexport1780358821426.jpg' },
        { num: 3, icon: '🥟', title: '包馅', desc: '酥皮包入枣泥馅，收口捏紧', img: 'assets/taigubing/mmexport1780358823408.jpg' },
        { num: 4, icon: '🫓', title: '压型', desc: '放入木模具压扁成型，表面沾满芝麻', img: 'assets/taigubing/mmexport1780358825197.jpg' },
        { num: 5, icon: '🔥', title: '烘烤', desc: '放入烤炉烘烤至表面金黄，三翻三烤出香味', img: 'assets/taigubing/mmexport1780358828100.jpg' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼的故事', desc: '了解太谷饼的来历' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=晋商小达人', desc: '认识晋商文化' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=山西面食王国', desc: '探索面食的奥秘' }
        ],
        audio: [
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉制作' },
          { img: 'assets/xianhuabing/reading_audio02.jpg', desc: '鲜花饼制作' },
          { img: 'assets/mahua/reading_audio03.jpg', desc: '麻花制作' }
        ],
        video: [
          { img: 'assets/1618634110353097372_thumb.jpg', desc: '藕粉制作' },
          { img: 'assets/oufen/reading_audio01.jpg', desc: '藕粉发展' },
          { img: 'assets/oufen/reading_video03.jpg', desc: '藕粉科普' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼创意画', desc: '采莲藕' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=泥塑太谷饼', desc: '做藕粉' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=山西美食地图', desc: '设计师：琪琪' }
        ]
      },
      works: [
        { img: 'https://placehold.co/200x150/E8C87A/6B5020?text=金色太谷', title: '金色太谷', author: '浩浩 6岁' },
        { img: 'https://placehold.co/200x150/E8C87A/6B5020?text=枣香满园', title: '枣香满园', author: '婷婷 5岁' },
        { img: 'https://placehold.co/200x150/E8C87A/6B5020?text=山西好味道', title: '山西好味道', author: '强强 7岁' }
      ],
      study: {
        name: '香香太谷饼',
        emoji: '🍞',
        intro: '🍞 百年美味太谷饼，趣味研学走起！探访老牌面点工坊，了解百年名点历史，学习和面、制酥、成型、烘烤等古法工序，亲手制作绵软香甜的太谷饼，聆听百年美食故事，自信展示作品。两天一晚，全程陪伴引导，感受百年面点匠心，近距离感受北方传统面食文化！',
        schedule: {
          day1: { title: '百年饼坊体验', morning: '参观太谷饼老作坊，认识原料与传统器具，讲解太谷饼的百年发展历史', afternoon: '手工课堂，学习和面、起酥、捏制饼型，完成太谷饼生胚制作', evening: '美食历史故事会，了解当地饮食民俗，休整休息' },
          day2: { title: '烘烤尝鲜 & 成果展示', morning: '烘烤成品，品尝亲手制作的太谷饼；开展作品展示、同伴互动分享', afternoon: '集体留念，整理行囊，圆满结束研学之旅' }
        },
        checkpoints: [
          { name: '百年饼坊', task: '观察传统器具与原料，画一画老作坊的样子' },
          { name: '手工制作区', task: '一步步画出制作太谷饼的过程' },
          { name: '故事小屋', task: '绘画记录印象最深的历史小故事' },
          { name: '展示舞台', task: '画出自己分享作品的样子' }
        ],
        interactiveTasks: [
          { name: '美食小侦探', items: ['酥油盆', '擀面杖', '木模具', '烤炉'] },
          { name: '我的制作配方', items: [] },
          { name: '小小提问家', items: [] }
        ]
      }
    }
  };

  // ── Product ID list ──────────────────────────────────────────
  var PRODUCT_IDS = ['oufen', 'mahua', 'rosecake', 'taigubing'];

  // ── Helpers ──────────────────────────────────────────────────
  function getProduct(id) {
    return P[id] || P.oufen;
  }

  function getAllProducts() {
    return PRODUCT_IDS.map(function (id) { return P[id]; });
  }

  // ── Shop Items (周边购买) ────────────────────────────────────
  var SHOP_ITEMS = [
    { id: 's1', name: '便签夹', price: 21.9, originPrice: 29.9, image: 'assets/shop_thumbs/mmexport1780421395257.jpg', desc: '精美文创便签夹，4个装，记录生活小确幸', sold: 520 },
    { id: 's2', name: '手机气囊支架', price: 26.9, originPrice: 35.9, image: 'assets/shop_thumbs/mmexport1780421401231.jpg', desc: '可爱非遗主题气囊支架，单个装，个性装饰', sold: 380 },
    { id: 's3', name: '明信片', price: 19.9, originPrice: 25.9, image: 'assets/shop_thumbs/mmexport1780421411578.jpg', desc: '非遗主题精美明信片，5张/套，可收藏可寄送', sold: 650 },
    { id: 's4', name: '扇子', price: 29.9, originPrice: 39.9, image: 'assets/shop_thumbs/mmexport1780421403306.jpg', desc: '非遗元素手工扇子礼盒装，包含扇子与精美礼品', sold: 280 },
    { id: 's5', name: '阅读灯', price: 84.9, originPrice: 99.9, image: 'assets/shop_thumbs/mmexport1780421405687.jpg', desc: '护眼阅读灯，非遗纹样设计，温馨伴读', sold: 160 },
    { id: 's6', name: '抱枕', price: 54.9, originPrice: 69.9, image: 'assets/shop_thumbs/mmexport1780421414632.jpg', desc: '枕套54.9元/个，枕芯64.9元/个（请联系客服备注），柔软亲肤', sold: 210 }
  ];

  window.SHOP_ITEMS = SHOP_ITEMS;

  // ── Expose ───────────────────────────────────────────────────
  window.PRODUCTS = P;
  window.PRODUCT_IDS = PRODUCT_IDS;
  window.getProduct = getProduct;
  window.getProductList = getAllProducts;
})();
