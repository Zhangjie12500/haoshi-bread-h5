/**
 * ============================================================
 * HAOSHI Section-aware Cursor FX v3
 * 统一鼠标状态源 + 分区效果管理 + 自适应热场尾迹
 * ============================================================
 * - 单一 pointermove 监听
 * - Section-aware 效果切换
 * - 分区热场平滑过渡
 * - IntersectionObserver 控制离屏暂停
 * - 性能保护：粒子数量上限 + 节流
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;

  // ========== 统一鼠标状态 ==========
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
    isActive: false,
    currentSection: null
  };

  // ========== Effect 注册表 ==========
  var effects = {
    // global 需要通过 register 后再 activate，所以初始为 false
    global: { active: false, handlers: [], _mouseLight: null, _mouseTrail: null, _lastTrailTime: 0 },
    story: { active: false, handlers: [], visible: false, element: null },
    products: { active: false, handlers: [], visible: false, element: null },
    footer: { active: false, handlers: [], visible: false, element: null },
    cta: { active: false, handlers: [], visible: false, element: null }
  };

  // ========== 配置 ==========
  var CONFIG = {
    smoothFactor: FXConfig ? FXConfig.globalFX.followLag : 0.12,
    debug: FXConfig && FXConfig.debug && FXConfig.debug.enabled
  };

  // ========== 性能保护状态 ==========
  var perfGuard = {
    maxParticles: FXConfig ? FXConfig.perf.maxTrailParticles : 50,
    spawnThrottle: FXConfig ? FXConfig.perf.trailSpawnThrottle : 50,
    lastSpawnTime: 0,
    currentParticleCount: 0
  };

  // ========== 工具函数 ==========
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function log(msg) {
    if (CONFIG.debug) {
      console.log('[CursorFX] ' + msg);
    }
  }

  // ========== 鼠标状态更新 ==========
  function updateMouseState() {
    var lag = FXConfig ? FXConfig.globalFX.followLag : CONFIG.smoothFactor;
    mouseState.smoothX = lerp(mouseState.smoothX, mouseState.x, lag);
    mouseState.smoothY = lerp(mouseState.smoothY, mouseState.y, lag);
    
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

  // ========== Effect 管理 ==========
  function register(scope, handler) {
    if (effects[scope]) {
      effects[scope].handlers.push(handler);
      log(scope + ': handler registered (' + effects[scope].handlers.length + ' total)');
    }
  }

  function activate(scope) {
    if (!effects[scope]) {
      log('activate: scope not found - ' + scope);
      return;
    }
    if (effects[scope].active) {
      log('activate: ' + scope + ' already active, skipping');
      return;
    }
    
    // 检查 FXConfig 启用状态
    if (FXConfig && !FXConfig.isEnabled(scope)) {
      log(scope + ': disabled by FXConfig');
      return;
    }
    
    effects[scope].active = true;
    log(scope + ': activated');
    
    effects[scope].handlers.forEach(function(h) {
      if (h.onActivate) h.onActivate(mouseState);
    });
  }

  function deactivate(scope) {
    if (!effects[scope] || !effects[scope].active) return;
    
    effects[scope].active = false;
    log(scope + ': deactivated');
    
    effects[scope].handlers.forEach(function(h) {
      if (h.onDeactivate) h.onDeactivate();
    });
  }

  function update(scope, state) {
    if (!effects[scope] || !effects[scope].active) {
      // 只在鼠标移动时打印一次（避免刷屏）
      return;
    }
    
    effects[scope].handlers.forEach(function(h) {
      if (h.onUpdate) h.onUpdate(state);
    });
  }

  function setVisible(scope, visible) {
    if (!effects[scope]) return;
    
    var wasVisible = effects[scope].visible;
    effects[scope].visible = visible;
    
    log('setVisible: ' + scope + ' visible=' + visible + ' (was=' + wasVisible + ')');
    
    if (visible && !wasVisible) {
      activate(scope);
      log(scope + ': entered viewport');
    } else if (!visible && wasVisible) {
      deactivate(scope);
      log(scope + ': left viewport');
    }
  }

  // ========== 分区热场切换 ==========
  function setCurrentSection(scope) {
    if (mouseState.currentSection === scope) return;
    
    mouseState.currentSection = scope;
    
    // 调用 FXConfig 更新目标 palette
    if (FXConfig && FXConfig.setTargetSection) {
      FXConfig.setTargetSection(scope);
      log('Section changed to: ' + scope);
    }
  }

  // ========== 主循环 ==========
  var rafId = null;
  var isInitialized = false;
  var lastFrameTime = 0;
  var targetFrameTime = 1000 / (FXConfig ? FXConfig.perf.targetFPS : 30);

  function startLoop() {
    if (isInitialized) return;
    isInitialized = true;
    
    log('Cursor FX loop started');
    
    function tick(timestamp) {
      // FPS 控制
      var elapsed = timestamp - lastFrameTime;
      if (elapsed < targetFrameTime) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastFrameTime = timestamp - (elapsed % targetFrameTime);
      
      // 更新鼠标状态
      updateMouseState();
      
      // 更新分区热场插值
      if (FXConfig && FXConfig.updateInterpolation) {
        FXConfig.updateInterpolation();
      }
      
      // 更新所有激活的效果
      Object.keys(effects).forEach(function(scope) {
        update(scope, {
          x: mouseState.x,
          y: mouseState.y,
          smoothX: mouseState.smoothX,
          smoothY: mouseState.smoothY,
          speed: mouseState.speed,
          vx: mouseState.vx,
          vy: mouseState.vy,
          currentSection: mouseState.currentSection
        });
      });
      
      rafId = requestAnimationFrame(tick);
    }
    
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isInitialized = false;
    log('Cursor FX loop stopped');
  }

  // ========== Cursor 主题管理 ==========
  var cursorEl = null;
  var currentCursorTheme = 'default';

  function setCursorTheme(theme) {
    if (!cursorEl) cursorEl = document.getElementById('cursor');
    if (!cursorEl) return;
    if (currentCursorTheme === theme) return;
    
    currentCursorTheme = theme;
    
    if (theme === 'dark') {
      cursorEl.style.background = '#E8A93A';
      cursorEl.style.mixBlendMode = 'normal';
    } else if (theme === 'footer') {
      cursorEl.style.background = '#FAF6EE';
      cursorEl.style.mixBlendMode = 'normal';
    } else {
      cursorEl.style.background = '';
      cursorEl.style.mixBlendMode = '';
    }
  }

  // ========== 初始化 ==========
  function init() {
    if (isInitialized) return;
    
    var isReduced = FXConfig && FXConfig.perf && FXConfig.perf.prefersReduced;
    var isMobile = FXConfig && FXConfig.perf && FXConfig.perf.isMobile;
    
    // 更新目标帧率
    if (FXConfig) {
      targetFrameTime = 1000 / FXConfig.perf.targetFPS;
      // 更新性能保护参数
      if (FXConfig.perf.maxTrailParticles) perfGuard.maxParticles = FXConfig.perf.maxTrailParticles;
      if (FXConfig.perf.trailSpawnThrottle) perfGuard.spawnThrottle = FXConfig.perf.trailSpawnThrottle;
    }
    
    // 获取 DOM 引用
    effects.global._mouseLight = document.getElementById('mouse-light');
    effects.global._mouseTrail = document.getElementById('mouse-trail');
    
    // 单一鼠标监听器
    document.addEventListener('pointermove', function(e) {
      mouseState.x = e.clientX;
      mouseState.y = e.clientY;
      mouseState.isActive = true;
    }, { passive: true });

    document.addEventListener('pointerleave', function() {
      mouseState.isActive = false;
    });
    
    // 触屏处理
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 0) {
        mouseState.x = e.touches[0].clientX;
        mouseState.y = e.touches[0].clientY;
        mouseState.isActive = true;
      }
    }, { passive: true });

    // 初始化 IntersectionObserver
    setupObservers();
    
    // 注册 global 效果处理器（mouse-light + mouse-trail）
    register('global', {
      onActivate: function() {
        var trail = effects.global._mouseTrail;
        if (trail) {
          trail.style.opacity = (!isMobile && !isReduced) ? '1' : '0';
        }
      },
      onDeactivate: function() {
        var trail = effects.global._mouseTrail;
        if (trail) {
          trail.style.opacity = '0';
        }
      },
      onUpdate: function(state) {
        var light = effects.global._mouseLight;
        var trail = effects.global._mouseTrail;
        
        // 获取当前热场配置（插值后）
        var palette = FXConfig && FXConfig.getInterpolatedPalette ? 
          FXConfig.getInterpolatedPalette() : null;
        
        // 如果在过渡中，使用插值配置；否则使用当前配置
        var lightRadius, lightOpacity, lightColor;
        var trailColor, trailOpacity, trailInterval, trailFadeDuration, trailRadius;
        var followLag;
        
        if (palette) {
          lightRadius = palette.lightRadius;
          lightOpacity = palette.lightOpacity;
          lightColor = palette.lightColor;
          trailColor = palette.trailColor;
          trailOpacity = palette.trailOpacity;
          trailInterval = palette.trailInterval;
          trailFadeDuration = palette.trailFadeDuration;
          trailRadius = palette.trailRadius;
          followLag = palette.followLag;
        } else {
          // 降级到全局配置
          var config = FXConfig ? FXConfig.globalFX : null;
          lightRadius = config ? config.lightRadius : 500;
          lightOpacity = config ? config.lightOpacity : 0.08;
          lightColor = '192,123,26';
          trailColor = '192,123,26';
          trailOpacity = { min: 0.10, max: 0.18 };
          trailInterval = config ? config.trailInterval : 90;
          trailFadeDuration = config ? config.trailFadeDuration : 800;
          trailRadius = { min: 12, max: 22 };
          followLag = config ? config.followLag : 0.12;
        }
        
        // mouse-light 跟随
        if (light) {
          light.style.background =
            'radial-gradient(' + lightRadius + 'px circle at ' + state.smoothX + 'px ' + state.smoothY + 'px,' +
            'rgba(' + lightColor + ',' + lightOpacity + ') 0%, transparent 70%)';
        }
        
        // 更新跟随延迟
        mouseState.smoothX = lerp(mouseState.smoothX, state.x, followLag);
        mouseState.smoothY = lerp(mouseState.smoothY, state.y, followLag);
        
        // mouse-trail 尾迹粒子（桌面端）
        if (trail && !isMobile && !isReduced) {
          var now = Date.now();
          
          // 性能保护：检查节流和粒子数量
          if (now - perfGuard.lastSpawnTime > perfGuard.spawnThrottle && 
              perfGuard.currentParticleCount < perfGuard.maxParticles) {
            
            // 随机透明度
            var opacity = trailOpacity.min + Math.random() * (trailOpacity.max - trailOpacity.min);
            // 随机大小
            var size = trailRadius.min + Math.random() * (trailRadius.max - trailRadius.min);
            
            var particle = document.createElement('div');
            particle.className = 'trail-particle';
            particle.style.left = (state.x - size/2) + 'px';
            particle.style.top = (state.y - size/2) + 'px';
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.background = 'rgba(' + trailColor + ',' + opacity + ')';
            particle.style.borderRadius = '50%';
            trail.appendChild(particle);
            perfGuard.currentParticleCount++;
            perfGuard.lastSpawnTime = now;
            
            setTimeout(function() {
              if (particle.parentNode) {
                particle.remove();
                perfGuard.currentParticleCount--;
              }
            }, trailFadeDuration);
          }
        }
      }
    });
    
    // 启动主循环
    startLoop();
    
    // 激活全局效果
    if (!isReduced) {
      activate('global');
    }
    
    log('Section-aware Cursor FX v3 initialized');
  }

  // ========== IntersectionObserver ==========
  var observers = [];

  function setupObservers() {
    var sections = {
      hero: '#hero',
      story: '#story-section',
      products: '#products',
      factory: '#factory-section',
      footer: 'footer',
      cta: '#cta'
    };

    Object.keys(sections).forEach(function(scope) {
      var selector = sections[scope];
      var el = document.querySelector(selector);
      if (!el) {
        log(scope + ': element not found (' + selector + ')');
        return;
      }

      effects[scope] = effects[scope] || { active: false, handlers: [], visible: false, element: null };
      effects[scope].element = el;

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          // 更新当前 section
          if (entry.isIntersecting) {
            setCurrentSection(scope);
          }
          
          setVisible(scope, entry.isIntersecting);
          
          // Footer 深色背景切换光标主题
          if (scope === 'footer') {
            if (entry.isIntersecting) {
              setCursorTheme('dark');
            } else {
              setCursorTheme('default');
            }
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px'
      });

      observer.observe(el);
      observers.push(observer);
      log(scope + ': Observer attached to ' + selector);
    });
  }

  // ========== 导出 API ==========
  var CursorFX = {
    init: init,
    
    // 获取当前鼠标状态
    getState: function() {
      return {
        x: mouseState.x,
        y: mouseState.y,
        smoothX: mouseState.smoothX,
        smoothY: mouseState.smoothY,
        speed: mouseState.speed,
        isActive: mouseState.isActive,
        currentSection: mouseState.currentSection
      };
    },
    
    // 注册效果处理器
    register: register,
    
    // 获取效果状态
    getEffects: function() {
      var result = {};
      Object.keys(effects).forEach(function(scope) {
        result[scope] = {
          active: effects[scope].active,
          visible: effects[scope].visible,
          handlerCount: effects[scope].handlers.length,
          enabled: FXConfig ? FXConfig.isEnabled(scope) : true
        };
      });
      return result;
    },
    
    // 获取当前热场配置
    getCurrentPalette: function() {
      return FXConfig && FXConfig.getInterpolatedPalette ? FXConfig.getInterpolatedPalette() : null;
    },
    
    // 手动切换 section（用于调试）
    setSection: function(sectionId) {
      setCurrentSection(sectionId);
    },
    
    // 光标主题切换
    setCursorTheme: setCursorTheme,
    
    // 销毁
    destroy: function() {
      stopLoop();
      observers.forEach(function(o) { o.disconnect(); });
      observers = [];
      Object.keys(effects).forEach(function(scope) {
        effects[scope].handlers = [];
        effects[scope].active = false;
      });
      log('Cursor FX destroyed');
    }
  };

  global.CursorFX = CursorFX;

})(typeof window !== 'undefined' ? window : this);
