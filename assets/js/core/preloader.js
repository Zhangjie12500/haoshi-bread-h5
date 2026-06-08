/**
 * ============================================================
 * HAOSHI Asset Preloader
 * 资源预加载模块
 * ============================================================
 * - 优先级加载：critical > interactive > secondary
 * - 降级策略：资源缺失时自动使用替代方案
 * - Ready Flags：暴露预加载状态
 */

(function(global) {
  'use strict';

  // ========== 配置 ==========
  const CONFIG = {
    // 预加载并发数（降低：移动端/慢网络下减少并发，避免单个大文件阻塞）
    concurrency: 2,
    // 预加载超时 (ms) - V0.22: 延长至 30s，确保移动端大 WebP 图片有足够加载时间
    timeout: 30000,
    // 重试次数（增加：增强弱网环境下的加载成功率）
    retries: 3,
    // 重试延迟 (ms)
    retryDelay: 500
  };

  // ========== Ready Flags ==========
  const ReadyFlags = {
    // Landing 准备就绪
    landingReady: false,
    // Factory 核心就绪
    factoryCoreReady: false,
    // 音频系统就绪
    audioReady: false,
    // 所有资源加载完成
    allAssetsReady: false
  };

  // ========== 加载状态 ==========
  const LoadState = {
    // 加载中的资源
    loading: new Set(),
    // 加载完成的资源
    loaded: new Map(),
    // 加载失败的资源
    failed: new Set(),
    // 降级使用的资源
    fallback: new Map()
  };

  // ========== 预加载进度跟踪 ==========
  const ProgressState = {
    total: 0,
    loaded: 0,
    onProgress: null,
    onFactoryReady: null
  };

  /**
   * 更新进度
   */
  function updateProgress(delta = 1) {
    ProgressState.loaded += delta;
    const percent = ProgressState.total > 0 
      ? Math.round((ProgressState.loaded / ProgressState.total) * 100) 
      : 0;
    if (ProgressState.onProgress) {
      ProgressState.onProgress(percent);
    }
    // 通知 Factory 进度
    if (ProgressState.onFactoryReady) {
      ProgressState.onFactoryReady(percent);
    }
  }

  /**
   * 设置进度回调
   */
  function setProgressCallback(callback) {
    ProgressState.onProgress = callback;
  }

  /**
   * 设置 Factory 就绪回调
   */
  function setFactoryReadyCallback(callback) {
    ProgressState.onFactoryReady = callback;
  }

  // ========== 预加载器核心 ==========

  /**
   * 异步加载单个资源
   * @param {string} src - 资源路径
   * @param {string} type - 资源类型: 'image' | 'audio' | 'video' | 'font'
   * @param {object} options - 配置选项
   */
  function loadAsset(src, type, options = {}) {
    return new Promise((resolve, reject) => {
      if (!src) {
        resolve({ src: null, type, status: 'skipped', reason: 'no-source' });
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout loading: ${src}`));
      }, CONFIG.timeout);

      let element = null;

      try {
        switch (type) {
          case 'image':
            element = new Image();
            break;
          case 'audio':
            element = new Audio();
            element.preload = 'metadata';
            break;
          case 'video':
            element = document.createElement('video');
            element.preload = 'metadata';
            break;
          default:
            element = new Image();
        }

        element.onload = () => {
          clearTimeout(timeoutId);
          resolve({ src, type, element, status: 'loaded', width: element.width, height: element.height });
        };

        element.onerror = (e) => {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to load: ${src}`));
        };

        element.src = src;
      } catch (e) {
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  /**
   * 带重试的加载
   */
  async function loadWithRetry(src, type, options = {}) {
    let lastError = null;
    for (let i = 0; i <= CONFIG.retries; i++) {
      try {
        return await loadAsset(src, type, options);
      } catch (e) {
        lastError = e;
        if (i < CONFIG.retries) {
          await sleep(CONFIG.retryDelay * (i + 1));
        }
      }
    }
    throw lastError;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 并发限制加载器
   */
  class LimitedLoader {
    constructor(concurrency) {
      this.concurrency = concurrency;
      this.queue = [];
      this.running = 0;
    }

    add(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
        this.process();
      });
    }

    async process() {
      while (this.running < this.concurrency && this.queue.length > 0) {
        const { task, resolve, reject } = this.queue.shift();
        this.running++;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--;
            this.process();
          });
      }
    }
  }

  const loader = new LimitedLoader(CONFIG.concurrency);

  // ========== 分优先级加载 ==========

  /**
   * 加载 critical 资源（首屏必需）
   */
  async function loadCriticalAssets() {
    console.log('[Preloader] Loading critical assets...');

    const tasks = [
      // UI 图标
      () => loadWithRetry('assets/ui/icon-sound-on.svg', 'image'),
      () => loadWithRetry('assets/ui/speaker-cross-svgrepo-com.svg', 'image'),
      // Hero 图片（V3.51: 静态图不存在，依赖视频帧；移除避免 404）
      // () => loadWithRetry('assets/hero/hs_hero_toast_closeup_still_ai_v01.jpg', 'image'),
      // Journey 图片
      () => loadWithRetry('assets/journey/stage-1-dough.webp', 'image'),
      () => loadWithRetry('assets/journey/stage-2-rising.webp', 'image'),
      () => loadWithRetry('assets/journey/stage-3-baking.webp', 'image'),
      () => loadWithRetry('assets/journey/stage-4-done.webp', 'image'),
      // Ingredient 图片
      () => loadWithRetry('assets/ingredient/wheat.webp', 'image'),
      () => loadWithRetry('assets/ingredient/milk.webp', 'image'),
      () => loadWithRetry('assets/ingredient/egg.webp', 'image'),
      () => loadWithRetry('assets/ingredient/yeast.webp', 'image'),
      // Product 图片
      () => loadWithRetry('assets/product/toast.webp', 'image'),
      () => loadWithRetry('assets/product/softbun.webp', 'image'),
      () => loadWithRetry('assets/product/lacto.webp', 'image'),
      () => loadWithRetry('assets/product/wholewheat.webp', 'image'),
      () => loadWithRetry('assets/product/sandwich.webp', 'image'),
      () => loadWithRetry('assets/product/quinoa.webp', 'image')
    ];

    // 设置总进度数
    ProgressState.total = tasks.length;

    const results = await Promise.allSettled(tasks.map(t => loader.add(t)));

    // 处理结果
    results.forEach((result, i) => {
      updateProgress(1);
      if (result.status === 'fulfilled' && result.value.status === 'loaded') {
        LoadState.loaded.set(result.value.src, result.value.element);
        console.log(`[Preloader] ✓ Loaded: ${result.value.src}`);
      } else {
        const src = tasks[i].toString().match(/'([^']+)'/)?.[1] || 'unknown';
        LoadState.failed.add(src);
        console.warn(`[Preloader] ✗ Failed: ${src}`);
      }
    });

    ReadyFlags.landingReady = true;
    console.log('[Preloader] Landing assets ready!');
  }

  /**
   * 加载 interactive 资源（交互必需）
   */
  async function loadInteractiveAssets() {
    console.log('[Preloader] Loading interactive assets...');

    // 构建蒸汽序列帧任务（优化：从 30 帧减少到 12 帧以提升加载速度）
    const steamFrameTasks = [];
    for (let i = 1; i <= 12; i++) {
      const frameNum = String(i).padStart(3, '0');
      steamFrameTasks.push(() => loadWithRetry(`assets/fx/steam-loop/ezgif-frame-${frameNum}.png`, 'image'));
    }

    // 构建炉光遮罩帧任务（优化：从 16 帧减少到 8 帧）
    const glowMaskTasks = [];
    for (let i = 1; i <= 8; i++) {
      const frameNum = String(i).padStart(3, '0');
      glowMaskTasks.push(() => loadWithRetry(`assets/fx/glow-mask/ezgif-frame-${frameNum}.png`, 'image'));
    }

    const tasks = [
      // UI 图标
      () => loadWithRetry('assets/ui/icon-gesture-hold.svg', 'image'),
      () => loadWithRetry('assets/ui/icon-gesture-swipe.svg', 'image'),
      // 音频 SFX（V3.91: 更新为新音效文件路径）
      () => loadWithRetry('assets/audio/sfx/haoshi-wood-tap-soft.mp3', 'audio'),
      () => loadWithRetry('assets/audio/sfx/haoshi-ceramic-ting-clean.mp3', 'audio'),
      () => loadWithRetry('assets/audio/sfx/haoshi-golden-chime-warm.mp3', 'audio'),
      () => loadWithRetry('assets/audio/sfx/haoshi-oven-hum-deep.mp3', 'audio')
    ].concat(steamFrameTasks, glowMaskTasks);

    // 更新总进度数
    ProgressState.total += tasks.length;

    const results = await Promise.allSettled(tasks.map(t => loader.add(t)));

    let loadedCount = 0;
    let failedCount = 0;
    results.forEach((result, i) => {
      updateProgress(1);
      if (result.status === 'fulfilled' && result.value.status === 'loaded') {
        LoadState.loaded.set(result.value.src, result.value.element);
        loadedCount++;
      } else {
        const src = tasks[i].toString().match(/'([^']+)'/)?.[1] || 'unknown';
        LoadState.failed.add(src);
        failedCount++;
      }
    });

    console.log(`[Preloader] Interactive: ${loadedCount} loaded, ${failedCount} failed`);
    ReadyFlags.factoryCoreReady = true;
    console.log('[Preloader] Factory core assets ready!');
  }

  /**
   * 加载 secondary 资源（次要，可异步）
   */
  async function loadSecondaryAssets() {
    console.log('[Preloader] Loading secondary assets (async)...');

    const tasks = [
      // BGM（V3.92: 更新为新品牌 BGM，路径移动到 bgm/）
      () => loadWithRetry('assets/audio/bgm/haoshi-bgm-morning.mp3', 'audio'),
      // Story 图片
      () => loadWithRetry('assets/story/factory-1995.jpg', 'image'),
      // Social QR
      () => loadWithRetry('assets/social/qr.webp', 'image')
    ];

    // 更新总进度数
    ProgressState.total += tasks.length;

    const results = await Promise.allSettled(tasks.map(t => loader.add(t)));

    results.forEach((result, i) => {
      updateProgress(1);
      if (result.status === 'fulfilled' && result.value.status === 'loaded') {
        LoadState.loaded.set(result.value.src, result.value.element);
      } else {
        const src = tasks[i].toString().match(/'([^']+)'/)?.[1] || 'unknown';
        LoadState.failed.add(src);
        console.warn(`[Preloader] Secondary asset failed: ${src}`);
      }
    });

    ReadyFlags.audioReady = true;
    ReadyFlags.allAssetsReady = true;
    console.log('[Preloader] All assets loaded!');
  }

  // ========== 降级策略 ==========

  /**
   * 获取资源（不存在时返回降级方案）
   */
  function getAsset(src) {
    if (LoadState.loaded.has(src)) {
      return LoadState.loaded.get(src);
    }
    if (LoadState.fallback.has(src)) {
      return LoadState.fallback.get(src);
    }
    return null;
  }

  /**
   * 检查资源是否加载成功
   */
  function isAssetLoaded(src) {
    return LoadState.loaded.has(src);
  }

  /**
   * 检查资源是否加载失败
   */
  function isAssetFailed(src) {
    return LoadState.failed.has(src);
  }

  // ========== 公共 API ==========

  const Preloader = {
    /**
     * 启动预加载流程
     */
    async start() {
      console.log('[Preloader] Starting asset preloading...');

      // 按优先级顺序加载
      await loadCriticalAssets();      // 阻塞：首屏必需
      await loadInteractiveAssets();   // 阻塞：交互必需
      loadSecondaryAssets();           // 非阻塞：次要资源

      return ReadyFlags;
    },

    /**
     * 获取 Ready Flags 状态
     */
    getReadyFlags() {
      return { ...ReadyFlags };
    },

    /**
     * 检查指定 Flag 是否就绪
     */
    isReady(flag) {
      return ReadyFlags[flag] === true;
    },

    /**
     * 设置 Factory 就绪回调
     */
    setFactoryReadyCallback(callback) {
      ProgressState.onFactoryReady = callback;
    },

    /**
     * 获取当前进度百分比
     */
    getProgress() {
      return ProgressState.total > 0
        ? Math.round((ProgressState.loaded / ProgressState.total) * 100)
        : 0;
    },

    /**
     * 获取加载状态
     */
    getLoadState() {
      return {
        loaded: Array.from(LoadState.loaded.keys()),
        failed: Array.from(LoadState.failed),
        loading: Array.from(LoadState.loading)
      };
    },
    getAsset,

    /**
     * 检查资源是否加载成功
     */
    isAssetLoaded,

    /**
     * 检查资源是否加载失败
     */
    isAssetFailed,

    /**
     * 等待指定 Flag 就绪
     */
    waitFor(flag, timeout = 30000) {
      return new Promise((resolve, reject) => {
        if (ReadyFlags[flag]) {
          resolve(true);
          return;
        }

        const interval = setInterval(() => {
          if (ReadyFlags[flag]) {
            clearInterval(interval);
            resolve(true);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for ${flag}`));
        }, timeout);
      });
    },

    /**
     * 重新加载失败的资源
     */
    async retryFailed() {
      const failedSrcs = Array.from(LoadState.failed);
      LoadState.failed.clear();

      for (const src of failedSrcs) {
        try {
          const result = await loadAsset(src, 'image');
          LoadState.loaded.set(src, result.element);
          console.log(`[Preloader] Retry success: ${src}`);
        } catch (e) {
          LoadState.failed.add(src);
          console.warn(`[Preloader] Retry failed: ${src}`);
        }
      }
    }
  };

  // ========== 导出 ==========
  global.Preloader = Preloader;
  global.ReadyFlags = ReadyFlags;

})(typeof window !== 'undefined' ? window : this);
