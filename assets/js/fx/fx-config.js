/**
 * ============================================================
 * HAOSHI FX Config - 统一参数配置 v3
 * 所有特效参数集中管理，支持运行时调优
 * 新增：分区自适应鼠标热场尾迹（sectionPalettes）
 * ============================================================
 */

(function(global) {
  'use strict';

  // ========== 性能检测 ==========
  var perf = {
    isMobile: window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent),
    isTouch: 'ontouchstart' in window,
    isLowPerf: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
    prefersReduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    // 性能相关配置
    targetFPS: 30,
    spawnInterval: 90,
    reducedMotionDisable: true,
    mobileDisable: true,
    // 性能保护：粒子数量上限
    maxTrailParticles: 80,
    trailSpawnThrottle: 20  // 最小生成间隔 (ms)，更快的生成频率
  };

  // ========== 全局 Cursor 配置 ==========
  var cursor = {
    defaultColor: '#C07B1A',      // 默认金色
    darkThemeColor: '#E8A93A',    // 深色背景用亮金色
    size: 10,
    largeSize: 44,
    transitionDuration: 180
  };

  // ========== Global FX 配置 ==========
  var globalFX = {
    enabled: true,
    lightRadius: 500,
    lightOpacity: 0.08,
    trailEnabled: true,
    trailInterval: 90,
    trailFadeDuration: 800,
    followLag: 0.12
  };

  // ========== 分区热场参数映射（v3 新增）==========
  // 颜色体系：统一使用面包暖金色系
  // - hero / journey：奶油暖白 + 浅金（柔和、半径更大）
  // - ingredients / products：麦麸金 + 焙烤棕（尾迹略清晰）
  // - factory / footer：深背景下亮金高光（对比更强）
  // - cta：偏聚焦高亮
  var sectionPalettes = {
    // hero / journey：奶油暖白 + 浅金，柔和、半径更大
    hero: {
      id: 'hero',
      lightColor: '250,246,238',      // 奶油暖白色
      lightColorAccent: '220,185,120', // 浅金色
      lightOpacity: 0.06,              // 较低 opacity，柔和
      lightRadius: 600,                // 较大半径
      trailColor: '220,185,120',       // 浅金色
      trailOpacity: { min: 0.08, max: 0.15 },
      trailRadius: { min: 14, max: 26 },
      trailInterval: 100,              // 较慢频率
      trailFadeDuration: 1000,         // 较长淡出
      trailEnabled: true,
      followLag: 0.10                  // 平滑跟随
    },

    // ingredients / products：麦麸金 + 焙烤棕，尾迹略清晰
    ingredients: {
      id: 'ingredients',
      lightColor: '192,148,80',        // 麦麸金
      lightColorAccent: '160,110,60',  // 焙烤棕
      lightOpacity: 0.09,
      lightRadius: 520,
      trailColor: '175,125,70',
      trailOpacity: { min: 0.12, max: 0.22 },
      trailRadius: { min: 12, max: 24 },
      trailInterval: 80,
      trailFadeDuration: 750,
      trailEnabled: true,
      followLag: 0.12
    },
    products: {
      id: 'products',
      lightColor: '192,148,80',        // 麦麸金
      lightColorAccent: '160,110,60',  // 焙烤棕
      lightOpacity: 0.09,
      lightRadius: 520,
      trailColor: '175,125,70',
      trailOpacity: { min: 0.12, max: 0.22 },
      trailRadius: { min: 12, max: 24 },
      trailInterval: 80,
      trailFadeDuration: 750,
      trailEnabled: true,
      followLag: 0.12
    },

    // factory：深背景下亮金高光，对比更强但频率受控
    factory: {
      id: 'factory',
      lightColor: '232,169,58',         // 亮金色
      lightColorAccent: '255,200,100',  // 高光金
      lightOpacity: 0.12,               // 较高 opacity，提升可见度
      lightRadius: 480,
      trailColor: '232,169,58',
      trailOpacity: { min: 0.15, max: 0.28 },
      trailRadius: { min: 10, max: 22 },
      trailInterval: 120,               // 较慢频率，受控
      trailFadeDuration: 600,
      trailEnabled: true,
      followLag: 0.14
    },

    // footer：深背景亮金高光
    footer: {
      id: 'footer',
      lightColor: '232,169,58',         // 亮金色
      lightColorAccent: '255,200,100',  // 高光金
      lightOpacity: 0.11,
      lightRadius: 450,
      trailColor: '232,169,58',
      trailOpacity: { min: 0.14, max: 0.26 },
      trailRadius: { min: 10, max: 20 },
      trailInterval: 110,
      trailFadeDuration: 650,
      trailEnabled: true,
      followLag: 0.13
    },

    // cta：偏聚焦高亮，交互时略增强
    cta: {
      id: 'cta',
      lightColor: '192,123,26',         // 金褐色
      lightColorAccent: '232,169,58',   // 亮金
      lightOpacity: 0.10,
      lightRadius: 350,                 // 较小半径，聚焦
      trailColor: '192,123,26',
      trailOpacity: { min: 0.10, max: 0.20 },
      trailRadius: { min: 8, max: 18 },
      trailInterval: 90,
      trailFadeDuration: 700,
      trailEnabled: true,
      followLag: 0.08                   // 快速跟随
    },

    // 默认/降级配置
    default: {
      id: 'default',
      lightColor: '192,123,26',
      lightColorAccent: '232,169,58',
      lightOpacity: 0.08,
      lightRadius: 500,
      trailColor: '192,123,26',
      trailOpacity: { min: 0.12, max: 0.22 },
      trailRadius: { min: 10, max: 20 },
      trailInterval: 30,              // 快速生成，更连贯
      trailFadeDuration: 600,
      trailEnabled: true,
      followLag: 0.15
    }
  };

  // ========== Story 米白页 FX 配置 ==========
  var story = {
    enabled: true,
    // 路径细尘配置
    sparkParticle: {
      enabled: true,
      opacity: { min: 0.18, max: 0.30 },     // 透明度范围
      radius: { min: 1, max: 2.2 },          // 粒子半径范围
      count: 25,                             // 同时存在的粒子数
      lifetime: 1200,                        // 粒子寿命 ms
      spawnRate: 0.15                        // 每帧生成概率
    },
    // 轻网格响应
    grid: {
      enabled: true,
      opacity: 0.6,
      shiftAmount: 2,                        // 位移幅度 px
      smoothing: 0.08
    },
    // 竖线高光
    lineGlow: {
      enabled: true,
      intensity: 0.5,
      influenceRadius: 300,
      smoothing: 0.1
    },
    // 视差
    parallax: {
      strength: 3,
      smoothing: 0.1
    }
  };

  // ========== 产品米白页 FX 配置 ==========
  var products = {
    enabled: true,
    // 路径细尘配置（比 Story 略强）
    sparkParticle: {
      enabled: true,
      opacity: { min: 0.22, max: 0.36 },
      radius: { min: 1.2, max: 2.8 },
      count: 35,
      lifetime: 1000,
      spawnRate: 0.2
    },
    // 卡片邻域响应
    cardBoost: {
      enabled: true,
      radius: 120,                          // 影响半径
      glowIntensity: 0.15,                  // 光晕强度
      smoothing: 0.08
    },
    // 通用跟随配置
    followLag: 0.1
  };

  // ========== Footer 深色页 FX 配置 ==========
  var footer = {
    enabled: true,
    // 深色背景光标适配
    cursor: {
      useDarkTheme: true,
      transitionDelay: 200
    },
    // 暖金拖尾（余晖效果）
    trail: {
      enabled: true,
      opacity: { min: 0.12, max: 0.22 },
      radius: { min: 18, max: 34 },
      interval: 100,
      fadeDuration: 600,
      smoothing: 0.1
    },
    // 深色背景光晕
    glow: {
      enabled: true,
      radius: 400,
      opacity: 0.06,
      color: '232,169,58'                  // 亮金色，更醒目
    }
  };

  // ========== CTA FX 配置 ==========
  var cta = {
    enabled: true,
    baseRadius: 180,
    baseIntensity: 0.12,
    buttonBoost: 0.15,
    followLag: 0.08,
    decaySpeed: 0.03,
    noiseScale: 0.003,
    noiseStrength: 25,
    color1: '192,123,26',
    color2: '232,169,58',
    particleCount: 40,
    particleSpeed: 0.6
  };

  // ========== 统一降级策略 ==========
  function applyDegradation() {
    var rules = [];

    // 1. prefers-reduced-motion => 关闭动态
    if (perf.prefersReduced && perf.reducedMotionDisable) {
      story.enabled = false;
      products.enabled = false;
      cta.enabled = false;
      footer.trail.enabled = false;
      // 保留 footer 光标主题切换
      globalFX.enabled = true;
      globalFX.trailEnabled = false;
      rules.push('reduced-motion: 动态效果已关闭');
    }

    // 2. 移动端 => 关闭粒子效果，保留轻响应
    if (perf.isMobile && perf.mobileDisable) {
      story.sparkParticle.count = Math.floor(story.sparkParticle.count * 0.2);
      products.sparkParticle.count = Math.floor(products.sparkParticle.count * 0.2);
      products.cardBoost.enabled = false;
      footer.trail.enabled = false;
      footer.glow.enabled = false;
      globalFX.trailEnabled = false;
      rules.push('mobile: 粒子减少，尾迹关闭');
    }

    // 3. 低硬件并发 => 降帧或简化效果
    if (perf.isLowPerf) {
      story.sparkParticle.count = Math.floor(story.sparkParticle.count * 0.5);
      products.sparkParticle.count = Math.floor(products.sparkParticle.count * 0.5);
      cta.baseIntensity *= 0.6;
      cta.particleCount = Math.floor(cta.particleCount * 0.5);
      globalFX.lightOpacity *= 0.7;
      perf.targetFPS = 20;
      rules.push('low-perf: 效果强度降低，帧率下降');
    }

    return rules;
  }

  // ========== 调试开关 ==========
  var debug = {
    enabled: false,
    overrides: {
      story: null,
      products: null,
      footer: null,
      cta: null,
      global: null
    }
  };

  // 初始化调试状态
  if (global.__FX_DEBUG__) {
    debug.enabled = true;
    if (global.__FX_DEBUG__.story !== undefined) debug.overrides.story = global.__FX_DEBUG__.story;
    if (global.__FX_DEBUG__.products !== undefined) debug.overrides.products = global.__FX_DEBUG__.products;
    if (global.__FX_DEBUG__.footer !== undefined) debug.overrides.footer = global.__FX_DEBUG__.footer;
    if (global.__FX_DEBUG__.cta !== undefined) debug.overrides.cta = global.__FX_DEBUG__.cta;
    if (global.__FX_DEBUG__.global !== undefined) debug.overrides.global = global.__FX_DEBUG__.global;
  }

  // 运行时调试方法
  function setDebug(enabled) {
    debug.enabled = enabled;
    console.log('[FX Config] Debug mode: ' + enabled);
  }

  function toggleEffect(name, enabled) {
    if (debug.overrides.hasOwnProperty(name)) {
      debug.overrides[name] = enabled;
      console.log('[FX Config] ' + name + ' override: ' + enabled);
    }
  }

  function getStatus() {
    return {
      perf: perf,
      cursor: cursor,
      story: story,
      products: products,
      footer: footer,
      cta: cta,
      globalFX: globalFX,
      debug: debug,
      activeEffects: getActiveEffects()
    };
  }

  function getActiveEffects() {
    var active = [];
    if (isEffectEnabled('story')) active.push('story');
    if (isEffectEnabled('products')) active.push('products');
    if (isEffectEnabled('footer')) active.push('footer');
    if (isEffectEnabled('cta')) active.push('cta');
    if (isEffectEnabled('global')) active.push('global');
    return active;
  }

  function isEffectEnabled(name) {
    // 调试覆盖优先
    if (debug.overrides[name] !== null) {
      return debug.overrides[name];
    }
    switch (name) {
      case 'story': return story.enabled && !perf.prefersReduced;
      case 'products': return products.enabled && !perf.prefersReduced;
      case 'footer': return footer.enabled;
      case 'cta': return cta.enabled && !perf.prefersReduced;
      case 'global': return globalFX.enabled;
      default: return false;
    }
  }

  // ========== 分区热场状态（v3 新增）==========
  var sectionFXState = {
    currentSection: null,
    currentPalette: null,
    targetPalette: null,
    interpolationFactor: 0,
    interpolationSpeed: 0.04  // 插值速度，越小越平滑
  };

  // ========== 导出 API ==========
  var FXConfig = {
    // 配置对象
    perf: perf,
    cursor: cursor,
    story: story,
    products: products,
    footer: footer,
    cta: cta,
    globalFX: globalFX,
    sectionPalettes: sectionPalettes,  // v3 新增
    
    // 分区热场状态
    sectionFXState: sectionFXState,
    
    // 获取当前 section 的热场配置
    getCurrentPalette: function() {
      return sectionFXState.targetPalette || sectionPalettes.default;
    },
    
    // 获取源热场配置（用于插值）
    getSourcePalette: function() {
      return sectionFXState.currentPalette || sectionPalettes.default;
    },
    
    // 设置目标 section（触发平滑过渡）
    setTargetSection: function(sectionId) {
      var newPalette = sectionPalettes[sectionId] || sectionPalettes.default;
      
      // 如果目标相同，不处理
      if (sectionFXState.targetPalette && sectionFXState.targetPalette.id === sectionId) {
        return;
      }
      
      // 保存当前配置作为插值起点
      if (sectionFXState.targetPalette) {
        sectionFXState.currentPalette = { ...sectionFXState.targetPalette };
      } else {
        sectionFXState.currentPalette = { ...sectionPalettes.default };
      }
      
      sectionFXState.targetPalette = newPalette;
      sectionFXState.interpolationFactor = 0;
      sectionFXState.currentSection = sectionId;
      
      console.log('[FX Config] Section palette transition: ' + 
        (sectionFXState.currentPalette ? sectionFXState.currentPalette.id : 'default') + 
        ' → ' + newPalette.id);
    },
    
    // 更新插值（每帧调用）
    updateInterpolation: function() {
      if (sectionFXState.interpolationFactor < 1 && sectionFXState.targetPalette) {
        sectionFXState.interpolationFactor = Math.min(1, sectionFXState.interpolationFactor + sectionFXState.interpolationSpeed);
        return true;  // 仍在过渡中
      }
      // 过渡完成，使用目标配置
      sectionFXState.currentPalette = { ...sectionFXState.targetPalette };
      return false;  // 过渡完成
    },
    
    // 获取插值后的热场参数
    getInterpolatedPalette: function() {
      // 确保有有效的配置
      var src = sectionFXState.currentPalette;
      var tgt = sectionFXState.targetPalette;
      
      // 如果缺少配置，回退到 default
      if (!src || !src.lightColor) {
        src = sectionPalettes.default;
      }
      if (!tgt || !tgt.lightColor) {
        tgt = sectionPalettes.default;
      }
      
      var t = sectionFXState.interpolationFactor;
      
      // 解析颜色值
      function parseColor(c) {
        if (!c || typeof c !== 'string') return [192, 123, 26];
        var parts = c.split(',');
        if (parts.length !== 3) return [192, 123, 26];
        return [
          parseInt(parts[0].trim(), 10) || 192,
          parseInt(parts[1].trim(), 10) || 123,
          parseInt(parts[2].trim(), 10) || 26
        ];
      }
      
      // 线性插值
      function lerpVal(a, b, t) {
        return a + (b - a) * t;
      }
      
      var srcRGB = parseColor(src.lightColor);
      var tgtRGB = parseColor(tgt.lightColor);
      
      return {
        id: tgt.id || 'default',
        lightColor: lerpVal(srcRGB[0], tgtRGB[0], t) + ',' +
                    lerpVal(srcRGB[1], tgtRGB[1], t) + ',' +
                    lerpVal(srcRGB[2], tgtRGB[2], t),
        lightOpacity: lerpVal(src.lightOpacity || 0.08, tgt.lightOpacity || 0.08, t),
        lightRadius: lerpVal(src.lightRadius || 500, tgt.lightRadius || 500, t),
        trailColor: tgt.trailColor || '192,123,26',
        trailOpacity: {
          min: lerpVal(
            (src.trailOpacity && src.trailOpacity.min) || 0.1, 
            (tgt.trailOpacity && tgt.trailOpacity.min) || 0.1, 
            t
          ),
          max: lerpVal(
            (src.trailOpacity && src.trailOpacity.max) || 0.18, 
            (tgt.trailOpacity && tgt.trailOpacity.max) || 0.18, 
            t
          )
        },
        trailRadius: {
          min: lerpVal(
            (src.trailRadius && src.trailRadius.min) || 12, 
            (tgt.trailRadius && tgt.trailRadius.min) || 12, 
            t
          ),
          max: lerpVal(
            (src.trailRadius && src.trailRadius.max) || 22, 
            (tgt.trailRadius && tgt.trailRadius.max) || 22, 
            t
          )
        },
        trailInterval: lerpVal(src.trailInterval || 90, tgt.trailInterval || 90, t),
        trailFadeDuration: lerpVal(src.trailFadeDuration || 800, tgt.trailFadeDuration || 800, t),
        trailEnabled: tgt.trailEnabled !== false,
        followLag: lerpVal(src.followLag || 0.12, tgt.followLag || 0.12, t),
        // 是否在过渡中
        isTransitioning: sectionFXState.interpolationFactor < 1
      };
    },
    
    // 初始化（调用以应用降级策略）
    init: function() {
      var rules = applyDegradation();
      console.log('[FX Config] v2 Initialized with ' + rules.length + ' degradation rules');
      if (rules.length > 0) {
        rules.forEach(function(r) { console.log('  - ' + r); });
      }
      return this;
    },
    
    // 检查效果是否启用
    isEnabled: isEffectEnabled,
    
    // 运行时调试
    debug: {
      setEnabled: setDebug,
      toggle: toggleEffect,
      getStatus: getStatus,
      overrides: debug.overrides
    },
    
    // 工具方法
    lerp: function(a, b, t) {
      return a + (b - a) * t;
    },
    
    randomRange: function(min, max) {
      return min + Math.random() * (max - min);
    },
    
    // 获取鼠标在区域内的相对坐标
    getRelativePos: function(state, element) {
      if (!element) return { x: 0, y: 0, inSection: false };
      var rect = element.getBoundingClientRect();
      return {
        x: state.x - rect.left,
        y: state.y - rect.top,
        inSection: state.x >= rect.left && state.x <= rect.right &&
                   state.y >= rect.top && state.y <= rect.bottom
      };
    }
  };

  global.FXConfig = FXConfig;

})(typeof window !== 'undefined' ? window : this);
