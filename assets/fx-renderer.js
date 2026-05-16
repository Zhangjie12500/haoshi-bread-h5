/**
 * ============================================================
 * HAOSHI Cursor FX Renderer
 * 统一粒子渲染层（Story / Products / Footer）
 * ============================================================
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;
  var CursorFX = global.CursorFX;

  // ========== Canvas 渲染器 ==========
  var renderers = {};

  function createRenderer(id, zIndex) {
    var canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.style.cssText = [
      'position: fixed',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'pointer-events: none',
      'z-index: ' + zIndex
    ].join(';');
    document.body.appendChild(canvas);

    return {
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      particles: [],
      active: false,
      visible: false
    };
  }

  function resizeRenderer(renderer) {
    renderer.canvas.width = window.innerWidth;
    renderer.canvas.height = window.innerHeight;
  }

  // ========== Story 粒子渲染 ==========
  function renderStoryParticles() {
    if (!renderers.story) {
      renderers.story = createRenderer('story-fx-canvas', 2);
      renderers.story.particles = global.__StoryParticles;
    }

    var r = renderers.story;
    var config = FXConfig.story.sparkParticle;

    r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);

    if (!r.active || !r.particles) return;

    var particles = r.particles.get();
    
    particles.forEach(function(p) {
      var lifeRatio = p.life / p.maxLife;
      var alpha = p.opacity * lifeRatio;

      if (alpha < 0.02) return;

      var gradient = r.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      gradient.addColorStop(0, 'rgba(192,123,26,' + alpha + ')');
      gradient.addColorStop(0.5, 'rgba(232,169,58,' + (alpha * 0.6) + ')');
      gradient.addColorStop(1, 'rgba(192,123,26,0)');

      r.ctx.fillStyle = gradient;
      r.ctx.beginPath();
      r.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      r.ctx.fill();
    });
  }

  // ========== Products 粒子渲染 ==========
  function renderProductsParticles() {
    if (!renderers.products) {
      renderers.products = createRenderer('products-fx-canvas', 2);
      renderers.products.particles = global.__ProductsParticles;
    }

    var r = renderers.products;
    var config = FXConfig.products.sparkParticle;

    r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);

    if (!r.active || !r.particles) return;

    var particles = r.particles.get();

    particles.forEach(function(p) {
      var lifeRatio = p.life / p.maxLife;
      var alpha = p.opacity * lifeRatio;

      if (alpha < 0.02) return;

      var gradient = r.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
      gradient.addColorStop(0, 'rgba(232,169,58,' + alpha + ')');
      gradient.addColorStop(0.5, 'rgba(200,134,26,' + (alpha * 0.7) + ')');
      gradient.addColorStop(1, 'rgba(192,123,26,0)');

      r.ctx.fillStyle = gradient;
      r.ctx.beginPath();
      r.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      r.ctx.fill();
    });
  }

  // ========== Footer 拖尾渲染 ==========
  function renderFooterTrails() {
    if (!renderers.footer) {
      renderers.footer = createRenderer('footer-fx-canvas', 1);
      renderers.footer.particles = global.__FooterTrails;
    }

    var r = renderers.footer;

    r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);

    if (!r.active || !r.particles) return;

    var trails = r.particles.get();
    var config = FXConfig.footer.trail;

    trails.forEach(function(t) {
      var lifeRatio = t.life / t.maxLife;
      var alpha = t.opacity * lifeRatio;

      if (alpha < 0.02) return;

      var gradient = r.ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.radius * 1.5);
      gradient.addColorStop(0, 'rgba(232,169,58,' + alpha + ')');
      gradient.addColorStop(0.6, 'rgba(200,134,26,' + (alpha * 0.4) + ')');
      gradient.addColorStop(1, 'rgba(192,123,26,0)');

      r.ctx.fillStyle = gradient;
      r.ctx.beginPath();
      r.ctx.arc(t.x, t.y, t.radius * 1.5, 0, Math.PI * 2);
      r.ctx.fill();
    });
  }

  // ========== 主渲染循环 ==========
  var rafId = null;
  var isRunning = false;

  function startRenderer() {
    if (isRunning) return;
    isRunning = true;

    function tick() {
      if (!isRunning) return;

      renderStoryParticles();
      renderProductsParticles();
      renderFooterTrails();

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    console.log('[FX Renderer] Started');
  }

  function stopRenderer() {
    isRunning = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    console.log('[FX Renderer] Stopped');
  }

  // ========== 初始化 ==========
  function init() {
    if (!CursorFX) return;

    // 注册渲染层激活
    ['story', 'products', 'footer'].forEach(function(section) {
      CursorFX.register(section, {
        onActivate: function() {
          renderers[section].active = true;
          console.log('[FX Renderer] ' + section + ' layer activated');
        },
        onDeactivate: function() {
          renderers[section].active = false;
          // 清空 canvas
          renderers[section].ctx.clearRect(0, 0, 
            renderers[section].canvas.width, 
            renderers[section].canvas.height);
        }
      });
    });

    // 窗口大小变化
    window.addEventListener('resize', function() {
      Object.values(renderers).forEach(resizeRenderer);
    });

    // 启动渲染
    startRenderer();

    console.log('[FX Renderer] Initialized');
  }

  // ========== 导出 ==========
  global.FXRenderer = {
    init: init,
    start: startRenderer,
    stop: stopRenderer
  };

})(typeof window !== 'undefined' ? window : this);
