/**
 * ============================================================
 * HAOSHI Spark Particle System
 * 程序化高光粒子系统
 * ============================================================
 * - Canvas 程序化粒子替代单张 spark-particle.png
 * - 暖金色径向渐变 (#FFD36B / #FFE8B3)
 * - screen/additive 混合模式
 * - 粒子数量：8~24 个
 * - 随机轻漂移 + 淡入淡出
 */

(function(global) {
  'use strict';

  /**
   * Spark Particle 粒子类
   */
  class SparkParticle {
    constructor(canvas) {
      this.canvas = canvas;
      this.reset();
    }

    reset() {
      // 初始位置（画布中心区域）
      this.x = this.canvas.width / 2 + (Math.random() - 0.5) * this.canvas.width * 0.6;
      this.y = this.canvas.height / 2 + (Math.random() - 0.5) * this.canvas.height * 0.6;

      // 速度（随机轻漂移）
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = -Math.random() * 0.6 - 0.2;  // 向上漂移

      // 生命周期
      this.life = 0;
      this.maxLife = 60 + Math.random() * 80;  // 60~140 帧

      // 尺寸
      this.baseSize = 2 + Math.random() * 4;  // 2~6px

      // 透明度
      this.opacity = 0;

      // 颜色（暖金色渐变）
      this.hue = 38 + Math.random() * 12;  // 38~50 (金色范围)
      this.saturation = 85 + Math.random() * 15;  // 85~100%
      this.lightness = 60 + Math.random() * 20;  // 60~80%

      // 闪烁
      this.flickerSpeed = 0.1 + Math.random() * 0.15;
      this.flickerPhase = Math.random() * Math.PI * 2;
    }

    update() {
      // 更新生命周期
      this.life++;

      // 淡入阶段（前 15% 生命周期）
      if (this.life < this.maxLife * 0.15) {
        this.opacity = this.life / (this.maxLife * 0.15);
      }
      // 淡出阶段（后 30% 生命周期）
      else if (this.life > this.maxLife * 0.7) {
        this.opacity = 1 - (this.life - this.maxLife * 0.7) / (this.maxLife * 0.3);
      }
      // 稳定阶段
      else {
        // 闪烁效果
        this.opacity = 0.7 + Math.sin(this.life * this.flickerSpeed + this.flickerPhase) * 0.3;
      }

      // 更新位置
      this.x += this.vx;
      this.y += this.vy;

      // 添加轻微随机扰动
      this.vx += (Math.random() - 0.5) * 0.05;
      this.vy += (Math.random() - 0.5) * 0.03;

      // 阻力
      this.vx *= 0.98;
      this.vy *= 0.98;

      // 重置（生命周期结束或超出边界）
      if (this.life >= this.maxLife ||
          this.x < -20 || this.x > this.canvas.width + 20 ||
          this.y < -20 || this.y > this.canvas.height + 20) {
        this.reset();
      }
    }

    draw(ctx) {
      if (this.opacity <= 0) return;

      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.baseSize * 2
      );

      const alpha = this.opacity;
      gradient.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha})`);
      gradient.addColorStop(0.4, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness - 10}%, ${alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(${this.hue}, ${this.saturation - 20}%, ${this.lightness - 30}%, 0)`);

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.baseSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  /**
   * Spark Particle System 主类
   */
  class SparkParticleSystem {
    constructor(options = {}) {
      this.options = {
        particleCount: options.particleCount || 16,  // 默认 16 个粒子
        colors: options.colors || {
          inner: '#FFE8B3',  // 内核亮色
          outer: '#FFD36B',  // 外围金色
          glow: 'rgba(255, 211, 107, 0.3)'  // 辉光
        },
        blendMode: options.blendMode || 'screen',  // screen 或 addtive
        intensity: options.intensity || 1.0,  // 强度 0~1
        ...options
      };

      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.isRunning = false;
      this.animationId = null;
      this.parent = null;

      // 绑定更新方法
      this.update = this.update.bind(this);
    }

    /**
     * 挂载到容器
     */
    mount(container) {
      if (this.canvas) {
        this.unmount();
      }

      this.parent = container;
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `;
      this.ctx = this.canvas.getContext('2d');

      // 设置画布尺寸
      this.resize();
      window.addEventListener('resize', () => this.resize());

      // 创建粒子
      for (let i = 0; i < this.options.particleCount; i++) {
        this.particles.push(new SparkParticle(this.canvas));
      }

      // 插入到容器
      container.style.position = 'relative';
      container.appendChild(this.canvas);

      return this;
    }

    /**
     * 卸载
     */
    unmount() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.isRunning = false;

      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
      this.ctx = null;
      this.particles = [];

      window.removeEventListener('resize', () => this.resize());
    }

    /**
     * 调整画布尺寸
     */
    resize() {
      if (!this.canvas || !this.parent) return;
      const rect = this.parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(dpr, dpr);
    }

    /**
     * 启动动画
     */
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.update();
    }

    /**
     * 停止动画
     */
    stop() {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    /**
     * 设置强度
     */
    setIntensity(value) {
      this.options.intensity = Math.max(0, Math.min(1, value));
    }

    /**
     * 更新动画帧
     */
    update() {
      if (!this.isRunning || !this.ctx) return;

      const ctx = this.ctx;
      const w = this.canvas.width / (window.devicePixelRatio || 1);
      const h = this.canvas.height / (window.devicePixelRatio || 1);

      // 清除画布（带透明度，实现拖尾效果）
      ctx.clearRect(0, 0, w, h);

      // 设置混合模式
      ctx.globalCompositeOperation = this.options.blendMode;

      // 更新并绘制粒子
      this.particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
      });

      // 绘制中心辉光
      this.drawCenterGlow(ctx, w, h);

      // 重置混合模式
      ctx.globalCompositeOperation = 'source-over';

      // 继续动画循环
      this.animationId = requestAnimationFrame(this.update);
    }

    /**
     * 绘制中心辉光
     */
    drawCenterGlow(ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const glowRadius = Math.min(w, h) * 0.3 * this.options.intensity;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      gradient.addColorStop(0, `rgba(255, 232, 179, ${0.15 * this.options.intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 211, 107, ${0.08 * this.options.intensity})`);
      gradient.addColorStop(1, 'rgba(255, 211, 107, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    /**
     * 触发一次粒子爆发
     */
    burst(count = 8) {
      for (let i = 0; i < count && i < this.particles.length; i++) {
        this.particles[i].reset();
        this.particles[i].life = 0;
        this.particles[i].maxLife = 30 + Math.random() * 20;
        this.particles[i].opacity = 1;
      }
    }

    /**
     * 获取状态（供调试用）
     */
    getState() {
      return {
        isRunning: this.isRunning,
        particleCount: this.particles.length,
        intensity: this.options.intensity
      };
    }
  }

  // ========== CSS 降级方案 ==========

  /**
   * CSS 高光粒子降级方案
   * 当 Canvas 不可用时的纯 CSS 实现
   */
  const CSSSparkFallback = {
    /**
     * 创建 CSS 粒子容器
     */
    create(container) {
      const particleContainer = document.createElement('div');
      particleContainer.className = 'spark-particle-fallback';
      particleContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        overflow: hidden;
      `;

      // 创建多个粒子点
      for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        const size = 4 + Math.random() * 8;
        const startX = Math.random() * 100;
        const startY = 50 + Math.random() * 50;
        const duration = 2 + Math.random() * 2;
        const delay = Math.random() * 2;

        particle.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: radial-gradient(circle, #FFE8B3 0%, #FFD36B 50%, transparent 100%);
          box-shadow: 0 0 ${size * 2}px rgba(255, 211, 107, 0.6),
                      0 0 ${size * 4}px rgba(255, 211, 107, 0.3);
          left: ${startX}%;
          top: ${startY}%;
          animation: sparkFloat ${duration}s ease-in-out ${delay}s infinite;
          opacity: 0;
        `;
        particleContainer.appendChild(particle);
      }

      // 添加动画样式（如果还没有）
      if (!document.getElementById('spark-fallback-styles')) {
        const style = document.createElement('style');
        style.id = 'spark-fallback-styles';
        style.textContent = `
          @keyframes sparkFloat {
            0% {
              opacity: 0;
              transform: translateY(0) scale(0.5);
            }
            20% {
              opacity: 0.8;
            }
            100% {
              opacity: 0;
              transform: translateY(-80px) translateX(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 30}px) scale(0.2);
            }
          }
        `;
        document.head.appendChild(style);
      }

      container.style.position = 'relative';
      container.appendChild(particleContainer);

      return particleContainer;
    },

    /**
     * 移除 CSS 粒子容器
     */
    remove(container) {
      const existing = container.querySelector('.spark-particle-fallback');
      if (existing) {
        container.removeChild(existing);
      }
    }
  };

  // ========== 导出 ==========

  const SparkParticles = {
    /**
     * 创建粒子系统实例
     */
    create(options) {
      return new SparkParticleSystem(options);
    },

    /**
     * 创建并自动挂载
     */
    mountTo(container, options) {
      const system = new SparkParticleSystem(options);
      system.mount(container);
      return system;
    },

    /**
     * CSS 降级方案
     */
    createFallback(container) {
      return CSSSparkFallback.create(container);
    },

    /**
     * 移除降级方案
     */
    removeFallback(container) {
      CSSSparkFallback.remove(container);
    },

    /**
     * 检测是否支持 Canvas
     */
    isCanvasSupported() {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      } catch (e) {
        return false;
      }
    },

    /**
     * 检测设备性能，决定使用哪个方案
     */
    shouldUseFallback() {
      // 低端设备使用 CSS 降级
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        return true;
      }
      // 移动设备使用 CSS 降级（省电）
      if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
        return true;
      }
      return false;
    }
  };

  // 导出到全局
  global.SparkParticles = SparkParticles;
  global.SparkParticleSystem = SparkParticleSystem;

})(typeof window !== 'undefined' ? window : this);
