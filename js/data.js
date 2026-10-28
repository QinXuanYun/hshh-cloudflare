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
        { id: 'history', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉+的历史', title: '藕粉的历史', desc: '从宋代流传至今的江南味道' },
        { id: 'grow', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=莲藕+的生长', title: '莲藕的生长', desc: '淤泥中孕育的洁白宝藏' },
        { id: 'craft', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=古法+制作', title: '古法制作技艺', desc: '十余道工序，手工传承的匠心' },
        { id: 'culture', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=江南+藕文化', title: '江南藕文化', desc: '藕粉里的水乡记忆与民俗风情' }
      ],
      master: { name: '陈师傅', desc: '三十载匠心守护，只为那一碗纯正藕粉...', initial: '陈' },
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
        { num: 1, icon: '🔍', title: '选藕', desc: '精选新鲜莲藕，藕身圆润饱满，淀粉含量高', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=选藕' },
        { num: 2, icon: '⚪', title: '磨浆', desc: '石磨慢磨成浆，保留藕香与营养', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=磨浆' },
        { num: 3, icon: '🧴', title: '过滤', desc: '过滤布袋多层过滤，去除杂质，提取纯浆', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=过滤' },
        { num: 4, icon: '🧺', title: '沉淀', desc: '纯浆静置沉淀，倒去上层清液，留下藕粉湿块', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=沉淀' },
        { num: 5, icon: '♨️', title: '蒸煮', desc: '湿藕粉入蒸笼蒸熟，切片晾干即成纯正藕粉', img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=蒸煮' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉小匠的一天', desc: '跟着呼呼学做藕粉' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=江南水乡的秘密', desc: '探索藕的生长奥秘' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=非遗小传承人', desc: '了解藕粉非遗文化' }
        ],
        audio: [
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉的传说', desc: '民间故事' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=小藕的旅行', desc: '童话故事' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=江南采藕歌', desc: '童谣' }
        ],
        video: [
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉是怎么做出来的', desc: '纪录片' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕的生长周期', desc: '自然科普' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=非遗手艺人的一天', desc: '人物访谈' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉画作品展', desc: '小画家：乐乐' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=手工藕粉制作', desc: '小厨师：朵朵' },
          { img: 'https://placehold.co/300x180/F7E1D7/8B7355?text=藕粉包装设计', desc: '设计师：豆豆' }
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
        { id: 'origin', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花+的由来', title: '麻花的由来', desc: '宋代起源的千年酥脆传奇' },
        { id: 'variety', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花+的种类', title: '麻花的种类', desc: '各地麻花的风味与特点' },
        { id: 'twist', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=拧麻花+技巧', title: '拧麻花技巧', desc: '一搓一拧间的功夫与学问' },
        { id: 'snack', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=传统+小食', title: '传统小食文化', desc: '街头巷尾的酥脆童年记忆' }
      ],
      master: { name: '王师傅', desc: '三代传承麻花手艺，一双手搓出百年酥脆滋味...', initial: '王' },
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
        { num: 1, icon: '🥣', title: '备料', desc: '准备面粉、鸡蛋、白糖等原料，按比例调配', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=备料' },
        { num: 2, icon: '✊', title: '揉面', desc: '将面粉加入鸡蛋、温水，揉成光滑面团', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=揉面' },
        { num: 3, icon: '⏳', title: '醒面', desc: '面团盖上湿布，静置醒发三十分钟', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=醒面' },
        { num: 4, icon: '✋', title: '扭花', desc: '将面团搓成长条，左右手反向拧成麻花状', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=扭花' },
        { num: 5, icon: '🍳', title: '炸制', desc: '油温六成热，放入麻花炸至金黄酥脆捞出', img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=炸制' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=小麻花奇遇记', desc: '跟着小麻花去冒险' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=面点小师傅', desc: '学习做麻花的快乐' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=街头小吃的故事', desc: '了解麻花的历史' }
        ],
        audio: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花的传说', desc: '民间故事' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=搓麻花的小手', desc: '童谣' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=老街味道', desc: '音频故事' }
        ],
        video: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花是怎么炸出来的', desc: '美食纪录片' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=面粉的魔法', desc: '烹饪科普' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=非遗面点大师', desc: '人物访谈' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=麻花创意画', desc: '小画家：天天' },
          { img: 'https://placehold.co/300x180/D4A06A/FFFFFF?text=迷你小麻花', desc: '小厨师：果果' },
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
        { id: 'legend', img: 'https://placehold.co/300x180/F0C4C4/C48A8A?text=鲜花饼+传说', title: '鲜花饼的传说', desc: '一朵玫瑰花背后的浪漫故事' },
        { id: 'flowers', img: 'https://placehold.co/300x180/F0C4C4/C48A8A?text=可食用+花卉', title: '可食用花卉', desc: '哪些花可以做成美味点心' },
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
        { num: 1, icon: '🌹', title: '备馅', desc: '新鲜玫瑰花加入白糖腌制，揉入熟糯米粉制成玫瑰馅', img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=备馅' },
        { num: 2, icon: '✋', title: '揉皮', desc: '分别制作油皮和油酥，猪油与面粉充分揉合', img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=揉皮' },
        { num: 3, icon: '🥟', title: '包制', desc: '酥皮包入玫瑰馅料，收口捏紧成球状', img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=包制' },
        { num: 4, icon: '🖨️', title: '压模', desc: '放入木模具中压扁成型，印出漂亮花纹', img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=压模' },
        { num: 5, icon: '🔥', title: '烘烤', desc: '烤箱预热后放入，烤至表面金黄酥脆即可', img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=烘烤' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花的旅行', desc: '小玫瑰去冒险' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=花园里的秘密', desc: '认识各种鲜花' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=小小面点师', desc: '学做鲜花饼' }
        ],
        audio: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花仙子的故事', desc: '童话故事' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=花园童谣', desc: '童谣' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=彩云之南的味道', desc: '音频故事' }
        ],
        video: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=鲜花饼制作全过程', desc: '美食纪录片' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花的生长', desc: '自然科普' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=非遗糕点传承人', desc: '人物访谈' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=玫瑰花创意画', desc: '小画家：朵朵' },
          { img: 'https://placehold.co/300x180/F0C4C4/8B6B6B?text=彩泥鲜花饼', desc: '手工：萌萌' },
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
        { id: 'story', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼+故事', title: '太谷饼的故事', desc: '山西百年名点的传奇往事' },
        { id: 'shanxi', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=山西+面食', title: '山西面食文化', desc: '一面百样的面食王国' },
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
        { num: 1, icon: '🥣', title: '和面', desc: '面粉加入糖稀、酥油、温水，和成柔软面团', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=和面' },
        { num: 2, icon: '✋', title: '起酥', desc: '面团反复折叠擀制，形成层层酥层', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=起酥' },
        { num: 3, icon: '🥟', title: '包馅', desc: '酥皮包入枣泥馅，收口捏紧', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=包馅' },
        { num: 4, icon: '🫓', title: '压型', desc: '放入木模具压扁成型，表面沾满芝麻', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=压型' },
        { num: 5, icon: '🔥', title: '烘烤', desc: '放入烤炉烘烤至表面金黄，三翻三烤出香味', img: 'https://placehold.co/300x180/E8C87A/6B5020?text=烘烤' }
      ],
      reading: {
        books: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼的故事', desc: '了解太谷饼的来历' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=晋商小达人', desc: '认识晋商文化' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=山西面食王国', desc: '探索面食的奥秘' }
        ],
        audio: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼的传说', desc: '民间故事' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=卖饼小童谣', desc: '童谣' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=晋商万里行', desc: '历史故事' }
        ],
        video: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼古法制作', desc: '非遗纪录片' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=红枣的生长', desc: '自然科普' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=晋商老字号传奇', desc: '文化专题' }
        ],
        works: [
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=太谷饼创意画', desc: '小画家：阳阳' },
          { img: 'https://placehold.co/300x180/E8C87A/6B5020?text=泥塑太谷饼', desc: '手工：轩轩' },
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
  var SHOP_ITEMS = {
    oufen: [
      { id: 'diy', name: '藕粉DIY体验套装', price: 68, originPrice: 88, image: 'https://placehold.co/300x300/F7E1D7/8B7355?text=藕粉+DIY套装', desc: '包含莲藕模型、研磨工具、藕粉品尝装，让孩子亲手体验藕粉制作', sold: 326, link: 'https://example.com/shop/oufen-diy' },
      { id: 'book', name: '藕粉的故事绘本', price: 39, originPrice: 49, image: 'https://placehold.co/300x300/F7E1D7/8B7355?text=藕粉+绘本', desc: '精美的藕粉文化绘本，图文并茂讲述藕粉的前世今生', sold: 508, link: 'https://example.com/shop/oufen-book' },
      { id: 'gift', name: '非遗藕粉礼盒', price: 128, originPrice: 158, image: 'https://placehold.co/300x300/F7E1D7/8B7355?text=藕粉+礼盒', desc: '正宗西湖藕粉礼盒装，精美包装，送礼自用皆宜', sold: 189, link: 'https://example.com/shop/oufen-gift' }
    ],
    mahua: [
      { id: 'diy', name: '麻花手工制作套装', price: 58, originPrice: 78, image: 'https://placehold.co/300x300/D4A06A/FFFFFF?text=麻花+DIY套装', desc: '面团、模具、包装盒齐全，在家也能做酥脆麻花', sold: 245, link: 'https://example.com/shop/mahua-diy' },
      { id: 'book', name: '麻花文化绘本', price: 39, originPrice: 49, image: 'https://placehold.co/300x300/D4A06A/FFFFFF?text=麻花+绘本', desc: '了解麻花的千年历史，从街头小吃到非遗文化', sold: 412, link: 'https://example.com/shop/mahua-book' },
      { id: 'gift', name: '天津麻花礼盒', price: 88, originPrice: 108, image: 'https://placehold.co/300x300/D4A06A/FFFFFF?text=麻花+礼盒', desc: '传统麻花零食礼盒，酥脆可口，老少皆宜', sold: 567, link: 'https://example.com/shop/mahua-gift' }
    ],
    rosecake: [
      { id: 'diy', name: '鲜花饼烘焙套装', price: 72, originPrice: 92, image: 'https://placehold.co/300x300/F0C4C4/C48A8A?text=鲜花饼+烘焙', desc: '食用玫瑰花酱、酥皮模具、烘焙工具一应俱全', sold: 178, link: 'https://example.com/shop/rosecake-diy' },
      { id: 'book', name: '可食用花卉图鉴', price: 45, originPrice: 55, image: 'https://placehold.co/300x300/F0C4C4/C48A8A?text=花卉+图鉴', desc: '认识各种可食用花卉，了解花食文化', sold: 289, link: 'https://example.com/shop/rosecake-book' },
      { id: 'gift', name: '云南鲜花饼礼盒', price: 108, originPrice: 138, image: 'https://placehold.co/300x300/F0C4C4/C48A8A?text=鲜花饼+礼盒', desc: '正宗云南鲜花饼，酥脆花香，纯手工制作', sold: 423, link: 'https://example.com/shop/rosecake-gift' }
    ],
    taigubing: [
      { id: 'diy', name: '太谷饼烘焙工具包', price: 62, originPrice: 82, image: 'https://placehold.co/300x300/E8C87A/6B5020?text=太谷饼+工具包', desc: '传统烤炉模型、制作工具，体验山西古法烘焙', sold: 156, link: 'https://example.com/shop/taigubing-diy' },
      { id: 'book', name: '山西面食文化绘本', price: 39, originPrice: 49, image: 'https://placehold.co/300x300/E8C87A/6B5020?text=山西+面食绘本', desc: '一面百样，走进山西面食的丰富多彩的世界', sold: 334, link: 'https://example.com/shop/taigubing-book' },
      { id: 'gift', name: '太谷饼传统礼盒', price: 98, originPrice: 128, image: 'https://placehold.co/300x300/E8C87A/6B5020?text=太谷饼+礼盒', desc: '正宗太谷饼伴手礼，枣香浓郁，回味悠长', sold: 278, link: 'https://example.com/shop/taigubing-gift' }
    ]
  };

  window.SHOP_ITEMS = SHOP_ITEMS;

  // ── Expose ───────────────────────────────────────────────────
  window.PRODUCTS = P;
  window.PRODUCT_IDS = PRODUCT_IDS;
  window.getProduct = getProduct;
  window.getProductList = getAllProducts;
})();
