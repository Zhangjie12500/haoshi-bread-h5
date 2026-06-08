/**
 * ============================================================
 * HAOSHI Font Configuration — V4.0
 * 字体配置与降级策略
 * ============================================================
 * - 中文标题：Noto Serif SC (本地 woff2)
 * - UI 数字：Noto Sans SC / Inter (本地 woff2)
 * - 完整 fallback 字体栈
 * - V4.0: 移除所有 Google Fonts CDN 调用，全本地化
 */
(function(global) {
  'use strict';

  // ========== 字体配置 ==========
  const FontConfig = {
    chineseTitle: {
      family: '"Noto Serif SC", "Noto Sans SC", "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif',
      displayName: 'Noto Serif SC',
      weights: [400, 500],
      // 本地 woff2 已在 @font-face 中声明（Haoshi_V0.23.html inline CSS）
    },
    uiNumber: {
      family: '"Noto Sans SC", "Inter", "Roboto Condensed", "DIN Alternate", "Helvetica Neue", sans-serif',
      displayName: 'Noto Sans SC',
      weights: [400, 500],
    },
    decorative: {
      family: '"Cormorant Garamond", "Noto Serif SC", Georgia, serif',
      displayName: 'Cormorant Garamond',
      weights: [300, 400, 600, 700],
    },
    mono: {
      family: '"DM Mono", "Fira Code", "SF Mono", "Consolas", monospace',
      displayName: 'DM Mono',
      weights: [300, 400, 500],
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
   * 等待 document.fonts.ready（所有 @font-face 就绪）
   */
  function waitForFontsReady(timeout = 5000) {
    return new Promise((resolve) => {
      if (!document.fonts || !document.fonts.ready) {
        setTimeout(resolve, 1500);
        return;
      }
      const timer = setTimeout(resolve, timeout);
      document.fonts.ready.then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * 检查字体是否可用
   */
  function isFontAvailable(fontFamily) {
    if (!document.fonts || !document.fonts.check) {
      return true;
    }
    try {
      return document.fonts.check('12px "' + fontFamily + '"');
    } catch (e) {
      return false;
    }
  }

  // ========== 字体初始化 ==========

  /**
   * 初始化所有字体（纯本地，不请求外部 CDN）
   */
  async function initFonts() {
    console.log('[FontLoader] V4.0 initializing — local-only, no Google CDN');

    // 所有字体通过 @font-face 声明 + document.fonts.ready 加载
    // 无需手动 fetch，浏览器自动按 font-display:swap 策略处理
    await waitForFontsReady(3000);

    FontLoadState.chineseTitle = true;
    FontLoadState.uiNumber = true;
    FontLoadState.decorative = true;
    FontLoadState.mono = true;

    applyFontConfig();
    console.log('[FontLoader] Font initialization complete (local-only)');
    return FontLoadState;
  }

  /**
   * 应用字体配置到 CSS 变量
   */
  function applyFontConfig() {
    var root = document.documentElement;
    root.style.setProperty('--font-chinese-title', FontConfig.chineseTitle.family);
    root.style.setProperty('--font-ui-number', FontConfig.uiNumber.family);
    root.style.setProperty('--font-decorative', FontConfig.decorative.family);
    root.style.setProperty('--font-mono', FontConfig.mono.family);
  }

  /**
   * 获取字体加载状态
   */
  function getFontLoadState() {
    return {
      chineseTitle: FontLoadState.chineseTitle,
      uiNumber: FontLoadState.uiNumber,
      decorative: FontLoadState.decorative,
      mono: FontLoadState.mono
    };
  }

  // ========== 导出 ==========
  var FontLoader = {
    config: FontConfig,
    state: FontLoadState,
    init: initFonts,
    waitForFont: waitForFontsReady,
    isFontAvailable: isFontAvailable,
    getLoadState: getFontLoadState,

    preloadCritical: function() {
      // 所有字体通过 CSS @font-face 声明自动预加载
      // 无需额外操作
    }
  };

  global.FontLoader = FontLoader;
  global.FontConfig = FontConfig;

})(typeof window !== 'undefined' ? window : this);
