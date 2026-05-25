/**
 * ============================================================
 * HAOSHI CTA Cursor FX
 * CTA 区域热场液化效果
 * ============================================================
 */

(function(global) {
  'use strict';

  var FXConfig = global.FXConfig;
  var CursorFX = global.CursorFX;

  (function() {
    if (!CursorFX || !FXConfig) return;

    var canvas = document.getElementById('cta-heat-canvas');
    var ctaSection = document.getElementById('cta');
    var ctaButtons = document.querySelectorAll('.btn-cta');

    if (!canvas || !ctaSection) {
      console.log('[CTA FX] Elements not found');
      return;
    }

    var ctx = canvas.getContext('2d');
    var config = FXConfig.cta;

    var state = {
      mouseX: 0,
      mouseY: 0,
      smoothX: 0,
      smoothY: 0,
      isInSection: false,
      isButtonHovered: false,
      targetIntensity: config.baseIntensity,
      currentIntensity: 0,
      particles: [],
      isRunning: false,
      rafId: null,
      lastTime: 0
    };

    function resize() {
      var rect = ctaSection.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    function initParticles() {
      state.particles = [];
      for (var i = 0; i < config.particleCount; i++) {
        state.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2 + Math.random() * 4,
          speedX: (Math.random() - 0.5) * config.particleSpeed,
          speedY: (Math.random() - 0.5) * config.particleSpeed * 0.5 - 0.3,
          opacity: 0.1 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function noise(x, y, t) {
      var n1 = Math.sin(x * 0.01 + t * 0.001) * Math.cos(y * 0.01 + t * 0.0015);
      var n2 = Math.sin((x + y) * 0.007 + t * 0.002) * 0.5;
      var n3 = Math.sin(x * 0.02 - t * 0.001) * Math.sin(y * 0.015 + t * 0.001) * 0.3;
      return n1 + n2 + n3;
    }

    function updateHeat() {
      state.smoothX += (state.mouseX - state.smoothX) * config.followLag;
      state.smoothY += (state.mouseY - state.smoothY) * config.followLag;
      
      state.targetIntensity = state.isButtonHovered 
        ? config.baseIntensity + config.buttonBoost 
        : config.baseIntensity;
      
      state.currentIntensity += (state.targetIntensity - state.currentIntensity) * 0.1;
      
      state.particles.forEach(function(p) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.phase += 0.02;
        
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
    }

    function draw(timestamp) {
      state.lastTime = timestamp;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!state.isInSection) {
        if (state.currentIntensity > 0.01) {
          state.currentIntensity *= 0.95;
        } else {
          return false;
        }
      }
      
      updateHeat();
      
      var time = timestamp * 0.001;
      var intensity = state.currentIntensity;
      
      for (var layer = 3; layer >= 1; layer--) {
        var layerRadius = config.baseRadius * layer * 0.7;
        var layerIntensity = intensity * (0.3 + layer * 0.25);
        
        var gradient = ctx.createRadialGradient(
          state.smoothX, state.smoothY, 0,
          state.smoothX, state.smoothY, layerRadius
        );
        
        gradient.addColorStop(0, 'rgba(' + config.color2 + ',' + (layerIntensity * 0.8) + ')');
        gradient.addColorStop(0.4, 'rgba(' + config.color1 + ',' + (layerIntensity * 0.5) + ')');
        gradient.addColorStop(0.7, 'rgba(' + config.color1 + ',' + (layerIntensity * 0.2) + ')');
        gradient.addColorStop(1, 'rgba(' + config.color1 + ',0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        var segments = 60;
        for (var i = 0; i <= segments; i++) {
          var angle = (i / segments) * Math.PI * 2;
          var noiseVal = noise(
            Math.cos(angle) * 100 + state.smoothX,
            Math.sin(angle) * 100 + state.smoothY,
            time
          );
          var r = layerRadius + noiseVal * config.noiseStrength * (layer * 0.5);
          var x = state.smoothX + Math.cos(angle) * r;
          var y = state.smoothY + Math.sin(angle) * r;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.fill();
      }
      
      state.particles.forEach(function(p) {
        var distToMouse = Math.sqrt(
          Math.pow(p.x - state.smoothX, 2) + 
          Math.pow(p.y - state.smoothY, 2)
        );
        
        var brightness = Math.max(0.1, 1 - distToMouse / config.baseRadius);
        var particleOpacity = p.opacity * brightness * intensity * 2;
        
        if (particleOpacity > 0.02) {
          var particleGradient = ctx.createRadialGradient(
            p.x, p.y, 0,
            p.x, p.y, p.size * 3
          );
          
          var alpha = Math.min(particleOpacity, 0.6);
          particleGradient.addColorStop(0, 'rgba(' + config.color2 + ',' + alpha + ')');
          particleGradient.addColorStop(0.5, 'rgba(' + config.color1 + ',' + (alpha * 0.5) + ')');
          particleGradient.addColorStop(1, 'rgba(' + config.color1 + ',0)');
          
          ctx.fillStyle = particleGradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      return true;
    }

    function animate(timestamp) {
      if (!state.isRunning) return;
      
      var shouldContinue = draw(timestamp);
      if (shouldContinue) {
        state.rafId = requestAnimationFrame(animate);
      } else {
        state.isRunning = false;
      }
    }

    function startAnimation() {
      if (state.isRunning) return;
      state.isRunning = true;
      state.lastTime = performance.now();
      state.rafId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
      state.isRunning = false;
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    }

    // 按钮 hover 增强
    ctaButtons.forEach(function(btn) {
      btn.addEventListener('mouseenter', function() {
        state.isButtonHovered = true;
      });
      btn.addEventListener('mouseleave', function() {
        state.isButtonHovered = false;
      });
    });

    // 窗口尺寸变化
    window.addEventListener('resize', function() {
      resize();
      initParticles();
    });

    resize();
    initParticles();

    // 注册到 CursorFX
    CursorFX.register('cta', {
      onActivate: function() {
        console.log('[CTA FX] Activated');
        canvas.classList.add('active');
        startAnimation();
      },
      onDeactivate: function() {
        console.log('[CTA FX] Deactivated');
        canvas.classList.remove('active');
      },
      onUpdate: function(mouseState) {
        var rect = ctaSection.getBoundingClientRect();
        var relX = mouseState.x - rect.left;
        var relY = mouseState.y - rect.top;
        var inSection = mouseState.x >= rect.left && mouseState.x <= rect.right && 
                        mouseState.y >= rect.top && mouseState.y <= rect.bottom;
        
        if (inSection) {
          state.mouseX = relX;
          state.mouseY = relY;
          state.isInSection = true;
        }
      }
    });

  })();

})(typeof window !== 'undefined' ? window : this);
