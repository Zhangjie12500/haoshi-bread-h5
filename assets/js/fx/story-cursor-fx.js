/**
 * ============================================================
 * HAOSHI Story Section Cursor FX
 * Story 米白页轻量路径细尘 + 网格响应 + 竖线高光
 * ============================================================
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;
  var CursorFX = global.CursorFX;

  // ========== Story Effect ==========
  (function() {
    if (!CursorFX || !FXConfig) return;

    var config = FXConfig.story;
    var storySection = document.getElementById('story-section');
    var storyFxLayer = document.getElementById('story-fx-layer');
    var storyLeft = document.querySelector('.story-left.story-fx-wrap');
    var storyRight = document.querySelector('.story-right.story-fx-wrap');
    var quoteLine = document.querySelector('.story-quote-fx');

    if (!storySection) {
      console.log('[Story FX] Section not found');
      return;
    }

    // ========== 粒子系统 ==========
    var particles = [];
    var sparkConfig = config.sparkParticle;

    function createSpark(x, y) {
      return {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.3,
        radius: FXConfig.randomRange(sparkConfig.radius.min, sparkConfig.radius.max),
        opacity: FXConfig.randomRange(sparkConfig.opacity.min, sparkConfig.opacity.max),
        life: sparkConfig.lifetime,
        maxLife: sparkConfig.lifetime,
        created: performance.now()
      };
    }

    function updateParticles(state) {
      // 生成新粒子
      if (state.speed > 0.5 && Math.random() < sparkConfig.spawnRate) {
        var rel = FXConfig.getRelativePos(state, storySection);
        if (rel.inSection && particles.length < sparkConfig.count) {
          particles.push(createSpark(
            rel.x + (Math.random() - 0.5) * 20,
            rel.y + (Math.random() - 0.5) * 20
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

    // ========== 视差状态 ==========
    var parallax = { x: 0, y: 0 };
    var targetParallax = { x: 0, y: 0 };

    function updateParallax(state) {
      var rel = FXConfig.getRelativePos(state, storySection);
      if (rel.inSection) {
        var centerX = storySection.offsetWidth / 2;
        var centerY = storySection.offsetHeight / 2;
        targetParallax.x = ((rel.x - centerX) / centerX) * config.parallax.strength;
        targetParallax.y = ((rel.y - centerY) / centerY) * config.parallax.strength;
      } else {
        targetParallax.x *= 0.95;
        targetParallax.y *= 0.95;
      }

      parallax.x += (targetParallax.x - parallax.x) * config.parallax.smoothing;
      parallax.y += (targetParallax.y - parallax.y) * config.parallax.smoothing;
    }

    // ========== 竖线高光状态 ==========
    var lineGlowIntensity = 0.3;

    function updateLineGlow(state) {
      if (!quoteLine || !config.lineGlow.enabled) return;

      var rel = FXConfig.getRelativePos(state, storySection);
      if (rel.inSection && storyRight) {
        var quoteRect = storyRight.getBoundingClientRect();
        var dist = Math.sqrt(
          Math.pow(state.x - quoteRect.left, 2) +
          Math.pow(state.y - quoteRect.top - quoteRect.height / 2, 2)
        );
        var targetGlow = Math.max(0.2, 1 - dist / config.lineGlow.influenceRadius) * config.lineGlow.intensity;
        lineGlowIntensity += (targetGlow - lineGlowIntensity) * config.lineGlow.smoothing;
      } else {
        lineGlowIntensity += (0.2 - lineGlowIntensity) * 0.1;
      }

      quoteLine.style.opacity = lineGlowIntensity;
    }

    // ========== 网格微位移 ==========
    function updateGrid() {
      if (!storyFxLayer || !config.grid.enabled) return;

      var shiftX = -parallax.x * config.grid.shiftAmount;
      var shiftY = -parallax.y * config.grid.shiftAmount;

      storyFxLayer.style.transform = 'translate(' + shiftX + 'px, ' + shiftY + 'px)';
      storyFxLayer.style.opacity = config.grid.opacity;
    }

    // ========== 注册效果 ==========
    CursorFX.register('story', {
      onActivate: function() {
        console.log('[Story FX] Activated');
        particles = [];
        if (storyFxLayer) storyFxLayer.style.opacity = config.grid.opacity;
        if (storyLeft) storyLeft.style.opacity = '1';
        if (storyRight) storyRight.style.opacity = '1';
      },
      onDeactivate: function() {
        console.log('[Story FX] Deactivated');
        if (storyFxLayer) {
          storyFxLayer.style.opacity = '0';
          storyFxLayer.style.transform = '';
        }
        targetParallax = { x: 0, y: 0 };
      },
      onUpdate: function(state) {
        if (!config.enabled) return;

        updateParticles(state);
        updateParallax(state);
        updateLineGlow(state);
        updateGrid();

        // 左右区域轻微视差
        if (storyLeft) {
          storyLeft.style.transform = 'translateY(' + (parallax.y * 0.3) + 'px)';
        }
        if (storyRight) {
          storyRight.style.transform = 'translateY(' + (-parallax.y * 0.3) + 'px)';
        }
      }
    });

    // ========== 暴露粒子供渲染层使用 ==========
    global.__StoryParticles = {
      get: function() { return particles; }
    };

  })();

})(typeof window !== 'undefined' ? window : this);
