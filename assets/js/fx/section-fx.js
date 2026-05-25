/**
 * ============================================================
 * HAOSHI Section FX Controller
 * 全局与分区交互反馈统一管理层
 * ============================================================
 * - 统一 mouseState 管理
 * - effect 生命周期控制（globalFX / storyFX / ctaFX）
 * - IntersectionObserver 控制离屏暂停
 * - 使用 FXConfig 统一降级策略
 */

(function(global) {
  'use strict';

  // ========== 引用 FXConfig ==========
  var FXConfig = global.FXConfig;

  // ========== 全局状态 ==========
  var mouseState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    smoothX: 0,
    smoothY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    isActive: false
  };

  // ========== 本地配置（从 FXConfig 读取） ==========
  var CONFIG = {
    smoothFactor: 0.12,
    speedThreshold: 0.5,
    updateInterval: 16
  };

  // ========== Effect 注册表 ==========
  var effects = {
    globalFX: { active: false, handlers: [], element: null },
    storyFX: { active: false, handlers: [], visible: false, element: null },
    ctaFX: { active: false, handlers: [], visible: false, element: null }
  };

  // ========== 工具函数 ==========
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function log(msg) {
    // 使用 FXConfig 的调试开关或本地调试
    var debugEnabled = FXConfig && FXConfig.debug && FXConfig.debug.overrides;
    var storyOverride = debugEnabled ? FXConfig.debug.overrides.story : null;
    var ctaOverride = debugEnabled ? FXConfig.debug.overrides.cta : null;
    var globalOverride = debugEnabled ? FXConfig.debug.overrides.global : null;
    
    // 如果有任何调试覆盖开启，显示日志
    if (storyOverride !== null || ctaOverride !== null || globalOverride !== null) {
      console.log('[SectionFX] ' + msg);
    }
  }

  // ========== 鼠标状态更新 ==========
  function updateMouseState() {
    mouseState.smoothX = lerp(mouseState.smoothX, mouseState.x, CONFIG.smoothFactor);
    mouseState.smoothY = lerp(mouseState.smoothY, mouseState.y, CONFIG.smoothFactor);
    
    var now = performance.now();
    var dt = now - mouseState.lastTime;
    if (dt > 0) {
      var dx = mouseState.x - mouseState.lastX;
      var dy = mouseState.y - mouseState.lastY;
      mouseState.speed = Math.sqrt(dx * dx + dy * dy) / dt * 1000;
      mouseState.vx = dx / dt * 1000;
      mouseState.vy = dy / dt * 1000;
    }
    mouseState.lastX = mouseState.x;
    mouseState.lastY = mouseState.y;
    mouseState.lastTime = now;
    
    return mouseState;
  }

  // ========== Effect 生命周期 ==========
  function registerEffect(scope, handler) {
    if (effects[scope]) {
      effects[scope].handlers.push(handler);
      log(scope + ': handler registered (total: ' + effects[scope].handlers.length + ')');
    }
  }

  function activateEffect(scope) {
    if (!effects[scope]) return;
    
    // 检查 FXConfig 是否启用
    if (FXConfig && !FXConfig.isEnabled(scope === 'globalFX' ? 'global' : scope.replace('FX', ''))) {
      log(scope + ': disabled by FXConfig');
      return;
    }
    
    if (effects[scope].active) return;
    
    effects[scope].active = true;
    log(scope + ': activated');
    
    effects[scope].handlers.forEach(function(handler) {
      if (handler.onActivate) handler.onActivate(mouseState);
    });
  }

  function deactivateEffect(scope) {
    if (!effects[scope]) return;
    if (!effects[scope].active) return;
    
    effects[scope].active = false;
    log(scope + ': deactivated');
    
    effects[scope].handlers.forEach(function(handler) {
      if (handler.onDeactivate) handler.onDeactivate();
    });
  }

  function updateEffect(scope, state) {
    if (!effects[scope] || !effects[scope].active) return;
    
    effects[scope].handlers.forEach(function(handler) {
      if (handler.onUpdate) handler.onUpdate(state);
    });
  }

  function setEffectVisible(scope, visible) {
    if (!effects[scope]) return;
    
    var wasVisible = effects[scope].visible;
    effects[scope].visible = visible;
    
    if (visible && !wasVisible) {
      activateEffect(scope);
      log(scope + ': entered viewport');
    } else if (!visible && wasVisible) {
      deactivateEffect(scope);
      log(scope + ': left viewport');
    }
  }

  // ========== 全局鼠标跟踪 ==========
  var rafId = null;
  var isInitialized = false;

  function startGlobalTracking() {
    if (isInitialized) return;
    isInitialized = true;
    
    log('Global tracking started');
    
    function tick() {
      updateMouseState();
      
      Object.keys(effects).forEach(function(scope) {
        updateEffect(scope, { 
          x: mouseState.x, 
          y: mouseState.y, 
          smoothX: mouseState.smoothX, 
          smoothY: mouseState.smoothY, 
          speed: mouseState.speed 
        });
      });
      
      rafId = requestAnimationFrame(tick);
    }
    
    rafId = requestAnimationFrame(tick);
  }

  function stopGlobalTracking() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isInitialized = false;
    log('Global tracking stopped');
  }

  // ========== 初始化 ==========
  function init() {
    // 检查降级状态
    var isReduced = FXConfig && FXConfig.perf && FXConfig.perf.prefersReduced;
    
    log('Init: reducedMotion=' + isReduced);
    
    if (isReduced) {
      log('Motion reduced: FX disabled (except global light)');
    }

    // 全局鼠标移动入口（唯一）
    document.addEventListener('mousemove', function(e) {
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.isActive = true;
    }, { passive: true });

    document.addEventListener('mouseleave', function() {
      mouseState.isActive = false;
    });

    startGlobalTracking();
    
    // 只在未完全禁用时激活 globalFX
    if (!isReduced) {
      activateEffect('globalFX');
    } else {
      // reduced-motion 下仍然激活 globalFX，但 handler 会使用轻量模式
      effects.globalFX.active = true;
      effects.globalFX.handlers.forEach(function(handler) {
        if (handler.onActivate) handler.onActivate(mouseState);
      });
    }
    
    setupIntersectionObserver();
    
    log('Section FX Controller initialized');
  }

  // ========== IntersectionObserver ==========
  function setupIntersectionObserver() {
    var sections = {
      storyFX: '#story-section',
      ctaFX: '#cta'
    };

    Object.keys(sections).forEach(function(scope) {
      var selector = sections[scope];
      var el = document.querySelector(selector);
      if (!el) {
        log(scope + ': element not found (' + selector + ')');
        return;
      }

      effects[scope].element = el;

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          setEffectVisible(scope, entry.isIntersecting);
        });
      }, { 
        threshold: 0.1,
        rootMargin: '0px'
      });

      observer.observe(el);
      log(scope + ': IntersectionObserver attached to ' + selector);
    });
  }

  // ========== 导出 API ==========
  var SectionFX = {
    init: init,
    getMouseState: function() { 
      return { 
        x: mouseState.x, 
        y: mouseState.y, 
        smoothX: mouseState.smoothX, 
        smoothY: mouseState.smoothY, 
        speed: mouseState.speed, 
        isActive: mouseState.isActive 
      }; 
    },
    register: registerEffect,
    activate: activateEffect,
    deactivate: deactivateEffect,
    setConfig: function(key, value) {
      if (CONFIG.hasOwnProperty(key)) {
        CONFIG[key] = value;
      }
    },
    getEffects: function() {
      return {
        globalFX: { 
          active: effects.globalFX.active, 
          handlerCount: effects.globalFX.handlers.length,
          enabled: FXConfig ? FXConfig.isEnabled('global') : true
        },
        storyFX: { 
          active: effects.storyFX.active, 
          visible: effects.storyFX.visible, 
          handlerCount: effects.storyFX.handlers.length,
          enabled: FXConfig ? FXConfig.isEnabled('story') : true
        },
        ctaFX: { 
          active: effects.ctaFX.active, 
          visible: effects.ctaFX.visible, 
          handlerCount: effects.ctaFX.handlers.length,
          enabled: FXConfig ? FXConfig.isEnabled('cta') : true
        }
      };
    },
    getConfig: function() {
      return FXConfig ? FXConfig.getStatus() : null;
    },
    destroy: function() {
      stopGlobalTracking();
      Object.keys(effects).forEach(function(scope) {
        effects[scope].handlers = [];
        effects[scope].active = false;
      });
      log('Section FX Controller destroyed');
    }
  };

  global.SectionFX = SectionFX;

})(typeof window !== 'undefined' ? window : this);
