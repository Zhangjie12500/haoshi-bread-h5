/**
 * ============================================================
 * HAOSHI Font Configuration
 * 字体配置与降级策略
 * ============================================================
 * - 中文状态词（主标题）：Noto Serif SC
 * - UI 数字：Inter
 * - 完整 fallback 字体栈
 */

(function(global) {
  'use strict';

  // ========== 字体配置 ==========
  const FontConfig = {
    // ========== 中文标题字体 ==========
    chineseTitle: {
      family: '"Noto Serif SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "SimHei", serif',
      displayName: 'Noto Serif SC',
      weights: [300, 400, 600, 700],
      // Google Fonts URL（用于预加载）
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap',
      // V3.51: 使用已存在的本地字体（子集字体制备后替换）
      subsetPath: 'assets/fonts/noto-serif-sc-chinese-simplified-500-normal.woff2',
      // 字符子集（用于生成子集字体）
      subsetChars: '松软金黄焦香上下滑动点击工位长按移动操作提示火候上升已进入窗口偏快偏慢关闭'
    },

    // ========== UI 数字字体 ==========
    uiNumber: {
      family: '"Inter", "Roboto Condensed", "DIN Alternate", "Helvetica Neue", sans-serif',
      displayName: 'Inter',
      weights: [300, 400, 500],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap',
      subsetPath: 'assets/fonts/noto-sans-sc-chinese-simplified-500-normal.woff2',
      // 数字字符集
      subsetChars: '0123456789.-:%'
    },

    // ========== 装饰字体 ==========
    decorative: {
      family: '"Cormorant Garamond", "Noto Serif SC", Georgia, serif',
      displayName: 'Cormorant Garamond',
      weights: [300, 400, 600, 700],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,600&display=swap'
    },

    // ========== 等宽字体 ==========
    mono: {
      family: '"DM Mono", "Fira Code", "SF Mono", "Consolas", monospace',
      displayName: 'DM Mono',
      weights: [300, 400, 500],
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap'
    }
  };

  // ========== 字体加载状态 ==========
  const FontLoadState = {
    chineseTitle: false,
    uiNumber: false,
    decorative: false,
    mono: false
  };

  // ========== 字体加载器 ==========

  /**
   * 加载 Google Fonts
   */
  function loadGoogleFont(fontConfig) {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      const existing = document.querySelector(`link[href*="${fontConfig.displayName.replace(/\s/g, '+')}"]`);
      if (existing) {
        resolve(fontConfig.displayName);
        return;
      }

      // 创建 link 标签
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontConfig.googleFontsUrl;

      link.onload = () => {
        console.log(`[FontLoader] ✓ Loaded: ${fontConfig.displayName}`);
        resolve(fontConfig.displayName);
      };

      link.onerror = () => {
        console.warn(`[FontLoader] ✗ Failed to load: ${fontConfig.displayName}`);
        resolve(fontConfig.displayName);  // 仍然 resolve，使用 fallback
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 尝试加载本地子集字体
   */
  function loadSubsetFont(fontConfig) {
    return new Promise((resolve) => {
      if (!fontConfig.subsetPath) {
        resolve(false);
        return;
      }

      const fontFace = new FontFace(
        fontConfig.displayName + ' Subset',
        `url(${fontConfig.subsetPath})`,
        { unicodeRange: 'U+4E00-9FFF' }  // CJK 统一表意文字
      );

      fontFace.load()
        .then(loadedFace => {
          document.fonts.add(loadedFace);
          console.log(`[FontLoader] ✓ Loaded subset: ${fontConfig.displayName} Subset`);
          resolve(true);
        })
        .catch(() => {
          console.warn(`[FontLoader] ✗ Subset not found: ${fontConfig.subsetPath}`);
          resolve(false);
        });
    });
  }

  /**
   * 等待字体加载
   */
  function waitForFont(fontFamily, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (document.fonts && document.fonts.check) {
        // 使用 FontFace API
        const checkFont = () => {
          if (document.fonts.check(`12px "${fontFamily}"`)) {
            resolve(true);
          }
        };

        document.fonts.ready.then(checkFont);

        setTimeout(() => {
          resolve(false);  // 超时也继续，不阻塞
        }, timeout);
      } else {
        // 降级：等待一段时间
        setTimeout(resolve, 1000);
      }
    });
  }

  // ========== 字体初始化 ==========

  /**
   * 初始化所有字体
   */
  async function initFonts() {
    console.log('[FontLoader] Initializing fonts...');

    // 1. 加载装饰字体（Cormorant Garamond）
    await loadGoogleFont(FontConfig.decorative);
    FontLoadState.decorative = true;

    // 2. 加载等宽字体（DM Mono）
    await loadGoogleFont(FontConfig.mono);
    FontLoadState.mono = true;

    // 3. 尝试加载中文标题字体
    await loadGoogleFont(FontConfig.chineseTitle);
    await loadSubsetFont(FontConfig.chineseTitle);
    FontLoadState.chineseTitle = true;

    // 4. 尝试加载 UI 数字字体
    await loadGoogleFont(FontConfig.uiNumber);
    await loadSubsetFont(FontConfig.uiNumber);
    FontLoadState.uiNumber = true;

    // 应用字体配置到 CSS
    applyFontConfig();

    console.log('[FontLoader] Font initialization complete');
    return FontLoadState;
  }

  /**
   * 应用字体配置到 CSS 变量
   */
  function applyFontConfig() {
    const root = document.documentElement;

    root.style.setProperty('--font-chinese-title', FontConfig.chineseTitle.family);
    root.style.setProperty('--font-ui-number', FontConfig.uiNumber.family);
    root.style.setProperty('--font-decorative', FontConfig.decorative.family);
    root.style.setProperty('--font-mono', FontConfig.mono.family);
  }

  /**
   * 检查字体是否可用
   */
  function isFontAvailable(fontFamily) {
    if (!document.fonts || !document.fonts.check) {
      return true;  // 降级处理
    }

    try {
      return document.fonts.check(`12px "${fontFamily}"`);
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取字体加载状态
   */
  function getFontLoadState() {
    return { ...FontLoadState };
  }

  // ========== 导出 ==========
  const FontLoader = {
    config: FontConfig,
    state: FontLoadState,
    init: initFonts,
    loadGoogleFont,
    loadSubsetFont,
    waitForFont,
    isFontAvailable,
    getLoadState: getFontLoadState,

    /**
     * 预加载关键字体
     */
    preloadCritical() {
      const criticalFonts = [
        FontConfig.decorative,
        FontConfig.mono
      ];

      criticalFonts.forEach(font => {
        loadGoogleFont(font);
      });
    }
  };

  global.FontLoader = FontLoader;
  global.FontConfig = FontConfig;

})(typeof window !== 'undefined' ? window : this);
