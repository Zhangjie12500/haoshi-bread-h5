/**
 * ============================================================
 * HAOSHI Assets Manifest
 * 资源清单与类型声明
 * ============================================================
 * 用于预加载器识别所有资产路径与优先级
 */

const ASSETS_MANIFEST = {
  // ========== 版本控制 ==========
  version: '1.0.0',
  lastUpdated: '2026-05-14',

  // ========== 资源分类 ==========
  categories: {
    // 最高优先级：首屏必需
    critical: {
      label: 'Critical (首屏必需)',
      priority: 'critical',
      description: '页面加载时必须就绪的资源，否则阻塞首屏渲染'
    },
    // 次优先级：交互必需
    interactive: {
      label: 'Interactive (交互必需)',
      priority: 'high',
      description: '用户首次交互前需要加载的资源'
    },
    // 延后：次要资源
    secondary: {
      label: 'Secondary (次要)',
      priority: 'low',
      description: '可异步加载，不影响核心体验'
    }
  },

  // ========== 音频资源 ==========
  audio: {
    // BGM
    bgm: {
      path: 'assets/audio/bgm-diamonds-ra-costelloe.mp3',
      type: 'audio/mpeg',
      category: 'secondary',
      required: false,  // 暂缺，等待授权
      fallback: null
    },
    // SFX - 点击
    sfxClick: {
      path: 'assets/audio/sfx-click-soft.mp3',
      type: 'audio/mpeg',
      category: 'interactive',
      required: true
    },
    // SFX - 切换
    sfxSwitch: {
      path: 'assets/audio/sfx-mode-switch.mp3',
      type: 'audio/mpeg',
      category: 'interactive',
      required: true
    },
    // SFX - 金黄命中
    sfxGolden: {
      path: 'assets/audio/sfx-golden-hit.mp3',
      type: 'audio/mpeg',
      category: 'interactive',
      required: true
    },
    // SFX - 火候上升
    sfxHoldRise: {
      path: 'assets/audio/sfx-hold-rise.mp3',
      type: 'audio/mpeg',
      category: 'interactive',
      required: true
    }
  },

  // ========== 特效资源 (FX) ==========
  fx: {
    // 高光粒子 - 程序化替代，无单文件
    sparkParticle: {
      path: null,  // 使用 Canvas 程序化生成
      type: 'canvas-procedural',
      category: 'critical',
      required: false,
      fallback: 'procedural',
      description: '暖金色径向渐变粒子，Canvas 渲染'
    },
    // 炉光遮罩 PNG 序列帧
    glowMask: {
      frames: 16,
      basePath: 'assets/fx/glow-mask/ezgif-frame-{n}.png',
      type: 'image/png',
      category: 'critical',
      required: true,
      format: (n) => `assets/fx/glow-mask/ezgif-frame-${String(n).padStart(3, '0')}.png`
    },
    // 蒸汽序列帧
    steamLoop: {
      frames: 150,
      basePath: 'assets/fx/steam-loop/ezgif-frame-{n}.png',
      type: 'image/png',
      category: 'interactive',
      required: false,
      format: (n) => `assets/fx/steam-loop/ezgif-frame-${String(n).padStart(3, '0')}.png`
    }
  },

  // ========== 字体资源 ==========
  fonts: {
    // 中文标题字体（主字体）
    chineseTitle: {
      family: 'Noto Serif SC',
      fallbacks: ['Noto Serif SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'serif'],
      weights: [300, 400, 600, 700],
      subset: 'assets/fonts/ui-cn-title-subset.woff2',
      category: 'critical',
      required: false,
      googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap'
    },
    // UI 数字字体
    uiNumber: {
      family: 'Inter',
      fallbacks: ['Inter', 'Roboto Condensed', 'DIN Alternate', 'sans-serif'],
      weights: [300, 400, 500],
      subset: 'assets/fonts/ui-num-subset.woff2',
      category: 'critical',
      required: false,
      googleFonts: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap'
    }
  },

  // ========== UI 图标 ==========
  ui: {
    soundOn: {
      path: 'assets/ui/icon-sound-on.svg',
      type: 'image/svg+xml',
      category: 'critical',
      required: true
    },
    soundOff: {
      path: 'assets/ui/speaker-cross-svgrepo-com.svg',
      type: 'image/svg+xml',
      category: 'critical',
      required: true
    },
    gestureHold: {
      path: 'assets/ui/icon-gesture-hold.svg',
      type: 'image/svg+xml',
      category: 'interactive',
      required: true
    },
    gestureSwipe: {
      path: 'assets/ui/icon-gesture-swipe.svg',
      type: 'image/svg+xml',
      category: 'interactive',
      required: true
    }
  },

  // ========== 视频资源 ==========
  video: {
    heroVideo: {
      path: 'assets/hero/hs_hero_toast_steam_loop_ai_v01.mp4',
      type: 'video/mp4',
      category: 'critical',
      required: false  // 有备选图片
    },
    factoryLine: {
      path: 'assets/factory/factory-line.mp4',
      type: 'video/mp4',
      category: 'secondary',
      required: false
    }
  },

  // ========== 图片资源 ==========
  images: {
    // Hero
    heroStill: {
      path: 'assets/hero/hs_hero_toast_closeup_still_ai_v01.jpg',
      type: 'image/jpeg',
      category: 'critical',
      required: true
    },
    // Journey 阶段图
    journey: [
      { path: 'assets/journey/stage-1-dough.jpg', stage: 1 },
      { path: 'assets/journey/stage-2-rising.jpg', stage: 2 },
      { path: 'assets/journey/stage-3-baking.jpg', stage: 3 },
      { path: 'assets/journey/stage-4-done.jpg', stage: 4 }
    ],
    // Ingredients
    ingredients: [
      { path: 'assets/ingredient/wheat.jpg', name: '小麦粉' },
      { path: 'assets/ingredient/milk.png', name: '牛奶' },
      { path: 'assets/ingredient/egg.jpg', name: '鸡蛋' },
      { path: 'assets/ingredient/yeast.jpg', name: '酵母' }
    ],
    // Products
    products: [
      { path: 'assets/product/toast.png', name: '经典白吐司' },
      { path: 'assets/product/softbun.png', name: '小软面包' },
      { path: 'assets/product/lacto.png', name: '乳酸菌面包' },
      { path: 'assets/product/wholewheat.png', name: '全麦吐司' },
      { path: 'assets/product/sandwich.png', name: '三明治系列' },
      { path: 'assets/product/quinoa.png', name: '藜麦升级款' }
    ],
    // Story
    story: {
      factory1995: {
        path: 'assets/story/factory-1995.jpg',
        type: 'image/jpeg',
        category: 'secondary',
        required: false
      }
    },
    // Social
    social: {
      qr: {
        path: 'assets/social/qr.png',
        type: 'image/png',
        category: 'secondary',
        required: false
      }
    }
  }
};

// ========== 辅助函数 ==========

/**
 * 获取指定分类的所有资源路径
 * @param {string} category - 'critical' | 'interactive' | 'secondary'
 * @returns {string[]} 资源路径数组
 */
function getAssetsByCategory(category) {
  const paths = [];

  // 音频
  Object.values(ASSETS_MANIFEST.audio).forEach(asset => {
    if (asset.category === category && asset.path && asset.required) {
      paths.push(asset.path);
    }
  });

  // UI
  Object.values(ASSETS_MANIFEST.ui).forEach(asset => {
    if (asset.category === category && asset.path) {
      paths.push(asset.path);
    }
  });

  // 图片
  if (ASSETS_MANIFEST.images.heroStill.category === category) {
    paths.push(ASSETS_MANIFEST.images.heroStill.path);
  }
  ASSETS_MANIFEST.images.journey.forEach(img => {
    paths.push(img.path);
  });
  ASSETS_MANIFEST.images.ingredients.forEach(img => {
    paths.push(img.path);
  });
  ASSETS_MANIFEST.images.products.forEach(img => {
    paths.push(img.path);
  });

  // 字体子集
  if (ASSETS_MANIFEST.fonts.chineseTitle.category === category && ASSETS_MANIFEST.fonts.chineseTitle.subset) {
    paths.push(ASSETS_MANIFEST.fonts.chineseTitle.subset);
  }
  if (ASSETS_MANIFEST.fonts.uiNumber.category === category && ASSETS_MANIFEST.fonts.uiNumber.subset) {
    paths.push(ASSETS_MANIFEST.fonts.uiNumber.subset);
  }

  return paths;
}

/**
 * 检查资源是否存在（同步检查，仅检查有明确路径的资源）
 * @param {string} path - 资源路径
 * @returns {boolean}
 */
function assetExists(path) {
  if (!path) return false;
  // 在浏览器环境中使用 Image 对象检测
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });
}

// 导出（支持 ES Module 和全局）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ASSETS_MANIFEST, getAssetsByCategory, assetExists };
}
