/**
 * ============================================================
 * HAOSHI Products Section Cursor FX
 * 产品米白页路径细尘 + 卡片邻域响应
 * ============================================================
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;
  var CursorFX = global.CursorFX;

  // ========== Products Effect ==========
  (function() {
    if (!CursorFX || !FXConfig) return;

    var config = FXConfig.products;
    var productsSection = document.getElementById('products');
    var prodCards = document.querySelectorAll('.prod-card');

    if (!productsSection) {
      console.log('[Products FX] Section not found');
      return;
    }

    // ========== 粒子系统 ==========
    var particles = [];
    var sparkConfig = config.sparkParticle;

    function createSpark(x, y) {
      return {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.4,
        radius: FXConfig.randomRange(sparkConfig.radius.min, sparkConfig.radius.max),
        opacity: FXConfig.randomRange(sparkConfig.opacity.min, sparkConfig.opacity.max),
        life: sparkConfig.lifetime,
        maxLife: sparkConfig.lifetime,
        created: performance.now()
      };
    }

    function updateParticles(state) {
      if (!sparkConfig.enabled) return;

      // 生成新粒子
      if (state.speed > 0.3 && Math.random() < sparkConfig.spawnRate) {
        var rel = FXConfig.getRelativePos(state, productsSection);
        if (rel.inSection && particles.length < sparkConfig.count) {
          particles.push(createSpark(
            rel.x + (Math.random() - 0.5) * 30,
            rel.y + (Math.random() - 0.5) * 30
          ));
        }
      }

      // 更新粒子
      particles = particles.filter(function(p) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 16;
        return p.life > 0;
      });
    }

    // ========== 卡片邻域响应 ==========
    var cardGlows = [];

    // 初始化卡片光晕
    prodCards.forEach(function(card) {
      var glow = document.createElement('div');
      glow.className = 'prod-card-glow';
      glow.style.cssText = [
        'position: absolute',
        'inset: -2px',
        'border-radius: inherit',
        'pointer-events: none',
        'opacity: 0',
        'transition: opacity 0.3s ease',
        'background: radial-gradient(ellipse at center, rgba(232,169,58,0.15) 0%, transparent 70%)'
      ].join(';');
      card.style.position = 'relative';
      card.style.overflow = 'visible';
      card.appendChild(glow);
      cardGlows.push({ card: card, glow: glow, intensity: 0 });
    });

    function updateCardGlows(state) {
      if (!config.cardBoost.enabled) return;

      cardGlows.forEach(function(item) {
        var rect = item.card.getBoundingClientRect();
        var cardCenterX = rect.left + rect.width / 2;
        var cardCenterY = rect.top + rect.height / 2;

        // 计算鼠标到卡片中心的距离
        var dist = Math.sqrt(
          Math.pow(state.x - cardCenterX, 2) +
          Math.pow(state.y - cardCenterY, 2)
        );

        // 计算目标强度
        var targetIntensity = 0;
        if (dist < config.cardBoost.radius) {
          targetIntensity = (1 - dist / config.cardBoost.radius) * config.cardBoost.glowIntensity;
        }

        // 平滑过渡
        item.intensity += (targetIntensity - item.intensity) * config.cardBoost.smoothing;
        item.glow.style.opacity = item.intensity;
      });
    }

    // ========== 注册效果 ==========
    CursorFX.register('products', {
      onActivate: function() {
        console.log('[Products FX] Activated');
        particles = [];
      },
      onDeactivate: function() {
        console.log('[Products FX] Deactivated');
        particles = [];
        // 关闭所有卡片光晕
        cardGlows.forEach(function(item) {
          item.intensity = 0;
          item.glow.style.opacity = 0;
        });
      },
      onUpdate: function(state) {
        if (!config.enabled) return;

        updateParticles(state);
        updateCardGlows(state);
      }
    });

    // ========== 暴露粒子供渲染层使用 ==========
    global.__ProductsParticles = {
      get: function() { return particles; }
    };

  })();

})(typeof window !== 'undefined' ? window : this);
