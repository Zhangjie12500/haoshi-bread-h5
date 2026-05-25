/**
 * ============================================================
 * HAOSHI Footer Section Cursor FX
 * Footer 深色页光标修复 + 暖金余晖拖尾
 * ============================================================
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;
  var CursorFX = global.CursorFX;

  // ========== Footer Effect ==========
  (function() {
    if (!CursorFX || !FXConfig) return;

    var config = FXConfig.footer;
    var footer = document.querySelector('footer');

    if (!footer) {
      console.log('[Footer FX] Element not found');
      return;
    }

    // ========== 拖尾粒子系统 ==========
    var trails = [];
    var lastTrailTime = 0;

    function createTrail(x, y) {
      return {
        x: x,
        y: y,
        radius: FXConfig.randomRange(config.trail.radius.min, config.trail.radius.max),
        opacity: FXConfig.randomRange(config.trail.opacity.min, config.trail.opacity.max),
        life: config.trail.fadeDuration,
        maxLife: config.trail.fadeDuration,
        created: performance.now()
      };
    }

    function updateTrails(state) {
      if (!config.trail.enabled) return;

      var now = performance.now();
      var interval = config.trail.interval || 100;

      // 生成新拖尾
      if (state.speed > 0.5 && now - lastTrailTime > interval) {
        var rel = FXConfig.getRelativePos(state, footer);
        if (rel.inSection) {
          trails.push(createTrail(state.x, state.y));
          lastTrailTime = now;
        }
      }

      // 更新拖尾
      trails = trails.filter(function(t) {
        t.life -= 16;
        return t.life > 0;
      });
    }

    // ========== 深色背景光晕 ==========
    var footerGlow = null;

    function initFooterGlow() {
      if (!config.glow.enabled) return;
      
      footerGlow = document.createElement('div');
      footerGlow.id = 'footer-mouse-glow';
      footerGlow.style.cssText = [
        'position: fixed',
        'inset: 0',
        'pointer-events: none',
        'z-index: 1',
        'opacity: 0',
        'transition: opacity 0.5s ease',
        'background: radial-gradient(' + config.glow.radius + 'px circle at var(--glow-x, 50%) var(--glow-y, 50%), ' +
          'rgba(' + config.glow.color + ',' + config.glow.opacity + ') 0%, transparent 70%)'
      ].join(';');
      document.body.appendChild(footerGlow);
    }

    var smoothX = 0, smoothY = 0;

    function updateFooterGlow(state) {
      if (!config.glow.enabled || !footerGlow) return;

      var rel = FXConfig.getRelativePos(state, footer);
      if (rel.inSection) {
        // 平滑跟随
        var lag = config.trail.smoothing || 0.1;
        smoothX += (state.x - smoothX) * lag;
        smoothY += (state.y - smoothY) * lag;

        footerGlow.style.setProperty('--glow-x', smoothX + 'px');
        footerGlow.style.setProperty('--glow-y', smoothY + 'px');
        footerGlow.style.opacity = '1';
      } else {
        footerGlow.style.opacity = '0';
      }
    }

    // ========== 注册效果 ==========
    CursorFX.register('footer', {
      onActivate: function() {
        console.log('[Footer FX] Activated');
        // 切换光标为深色主题（浅金/奶油白）
        CursorFX.setCursorTheme('footer');
        // 禁用 footer 链接的圆圈放大
        var footerLinks = footer.querySelectorAll('a');
        footerLinks.forEach(function(link) {
          link._removeLargeCursor = function(e) {
            var cursor = document.getElementById('cursor');
            if (cursor) cursor.classList.remove('large');
          };
          link.addEventListener('mouseenter', link._removeLargeCursor);
        });
        trails = [];
        smoothX = 0;
        smoothY = 0;
      },
      onDeactivate: function() {
        console.log('[Footer FX] Deactivated');
        // 恢复默认光标
        CursorFX.setCursorTheme('default');
        // 恢复 footer 链接的圆圈放大
        var footerLinks = footer.querySelectorAll('a');
        footerLinks.forEach(function(link) {
          if (link._removeLargeCursor) {
            link.removeEventListener('mouseenter', link._removeLargeCursor);
          }
        });
        trails = [];
        if (footerGlow) {
          footerGlow.style.opacity = '0';
        }
      },
      onUpdate: function(state) {
        if (!config.enabled) return;

        updateTrails(state);
        updateFooterGlow(state);
      }
    });

    // ========== 暴露拖尾供渲染层使用 ==========
    global.__FooterTrails = {
      get: function() { return trails; }
    };

    // 初始化
    initFooterGlow();

  })();

})(typeof window !== 'undefined' ? window : this);
