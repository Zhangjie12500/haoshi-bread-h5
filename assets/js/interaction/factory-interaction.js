/**
 * ============================================================
 * HAOSHI Factory Interaction System
 * Factory 交互层：提示系统 + 火候三段迟滞 + 文案动画
 * ============================================================
 */

(function(global) {
  'use strict';

  // ========== 配置 ==========
  const CONFIG = {
    // 火候三段阈值（带迟滞）
    thresholds: {
      // 松软段
      soft: {
        enter: 0,      // 进入阈值
        exit: 0.38     // 退出阈值（迟滞）
      },
      // 金黄段
      golden: {
        enter: 0.45,   // 进入阈值
        exit: 0.40     // 退出阈值（迟滞）
      },
      // 焦香段
      crispy: {
        enter: 0.83,   // 进入阈值
        exit: 0.78     // 退出阈值（迟滞）
      }
    },

    // 文案切换动画时长
    animation: {
      fadeOutMin: 220,
      fadeOutMax: 320,
      fadeInMin: 280,
      fadeInMax: 380,
      scaleFrom: 1.00,
      scalePeak: 1.04,
      scaleTo: 1.00
    },

    // 提示系统
    hints: {
      // 初次引导延迟
      guideDelay: 400,
      // 24h 本地存储 key
      guideSuppressKey: 'haoshi_factory_guide_dismissed',
      // 提示保留时长
      guideAutoHideDelay: 5000
    },

    // 状态内提示
    stateHints: {
      rising: '火候上升中…',
      goldenWindow: '已进入金黄窗口',
      crispyWindow: '即将焦香',
      tooFast: '节奏偏快',
      tooSlow: '节奏偏慢'
    },

    // 分段联动强度
    feedbackIntensity: {
      soft: {
        ovenGlow: 0.1,
        steam: 0.2,
        highlight: 0.1
      },
      golden: {
        ovenGlow: 0.5,
        steam: 0.5,
        highlight: 0.9
      },
      crispy: {
        ovenGlow: 0.9,
        steam: 0.7,
        highlight: 0.6
      }
    }
  };

  // ========== 增强视觉配置（任务D1） ==========
  const VISUAL_CONFIG = {
    // 蒸汽/辉光可见度上限（略微提高但不过曝）
    steamMax: 0.85,           // 原: 0.8 (0.3 + 0.5 * 1)
    ovenGlowMax: 1.0,         // 原: 1.02 (0.12 + 0.9 * 1)
    
    // 阶段切换视觉增强
    boost: {
      duration: 280,          // boost 持续时长 (ms)
      multiplier: 1.35,       // 增强倍数
      decayRate: 0.12         // 每帧衰减率
    },
    
    // golden 阶段增强（高光/蒸汽略加强）
    goldenEnhance: {
      steamBoost: 1.2,         // golden 阶段蒸汽乘数
      highlightBoost: 1.15     // golden 阶段高光乘数
    },
    
    // 文案显示阈值（任务A）
    labelFadeThreshold: 0.08   // 火候低于此值时隐藏文案
  };

  // ========== 状态 ==========
  const State = {
    currentStage: 'soft',        // 当前阶段
    previousStage: 'soft',       // 上一阶段
    holdProgress: 0,             // 当前火候值
    lastStageChange: 0,          // 上次阶段切换时间
    hasInteracted: false,        // 是否已交互（任务A）
    isLabelVisible: false,        // 文案是否可见（任务A）
    guideShown: false,           // 引导提示是否已显示
    isRising: false,             // 是否正在上升
    speedDeviation: 0,          // 速度偏差
    // 阶段切换视觉增强（任务D1）
    boostIntensity: 0,           // 当前 boost 强度 0~1
    boostTimeout: null           // boost 定时器
  };

  // ========== DOM 引用 ==========
  let elements = {};

  // ========== 提示系统 ==========

  /**
   * 创建初次引导提示
   */
  function createGuideHint() {
    // 检查是否已抑制
    if (isGuideSuppressed()) {
      console.log('[FactoryHints] Guide suppressed (24h)');
      return null;
    }

    const hint = document.createElement('div');
    hint.id = 'factory-guide-hint';
    hint.innerHTML = `
      <div class="guide-hint-content">
        <div class="guide-hint-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="guide-hint-text">
          <div class="guide-hint-title">长按控制火候</div>
          <div class="guide-hint-sub">松开后火候会逐渐下降</div>
        </div>
        <button class="guide-hint-close" aria-label="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    hint.style.cssText = `
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 100;
      background: rgba(250, 246, 238, 0.95);
      backdrop-filter: blur(12px);
      border: 0.5px solid rgba(28, 18, 8, 0.1);
      border-radius: 12px;
      padding: 12px 16px;
      font-family: var(--mono, 'DM Mono', monospace);
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(28, 18, 8, 0.12);
    `;

    // 关闭按钮事件
    const closeBtn = hint.querySelector('.guide-hint-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: rgba(28, 18, 8, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissGuideHint(true);
    });

    return hint;
  }

  /**
   * 显示初次引导提示
   */
  function showGuideHint() {
    if (State.guideShown || isGuideSuppressed()) return;

    const container = document.getElementById('factory-canvas-wrap');
    if (!container) return;

    let hint = document.getElementById('factory-guide-hint');
    if (!hint) {
      hint = createGuideHint();
      if (!hint) return;
      container.appendChild(hint);
    }

    // 延迟显示
    setTimeout(() => {
      hint.style.opacity = '1';
      hint.style.transform = 'translateY(0)';
      hint.style.pointerEvents = 'auto';
      State.guideShown = true;

      // 自动隐藏
      setTimeout(() => {
        dismissGuideHint(false);
      }, CONFIG.hints.guideAutoHideDelay);
    }, CONFIG.hints.guideDelay);
  }

  /**
   * 关闭初次引导提示
   */
  function dismissGuideHint(byUser) {
    const hint = document.getElementById('factory-guide-hint');
    if (!hint) return;

    hint.style.opacity = '0';
    hint.style.transform = 'translateY(-10px)';
    hint.style.pointerEvents = 'none';

    if (byUser) {
      // 用户主动关闭，24h 抑制
      suppressGuide();
    }

    setTimeout(() => {
      if (hint.parentNode) {
        hint.parentNode.removeChild(hint);
      }
    }, 300);
  }

  /**
   * 检查引导提示是否被抑制
   */
  function isGuideSuppressed() {
    try {
      const dismissed = localStorage.getItem(CONFIG.hints.guideSuppressKey);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        const hours24 = 24 * 60 * 60 * 1000;
        return now - dismissedTime < hours24;
      }
    } catch (e) {
      console.warn('[FactoryHints] Cannot access localStorage:', e);
    }
    return false;
  }

  /**
   * 抑制引导提示 24h
   */
  function suppressGuide() {
    try {
      localStorage.setItem(CONFIG.hints.guideSuppressKey, Date.now().toString());
    } catch (e) {
      console.warn('[FactoryHints] Cannot save to localStorage:', e);
    }
  }

  /**
   * 创建常驻轻提示
   */
  function createLightHint() {
    const hint = document.createElement('div');
    hint.id = 'factory-light-hint';
    hint.innerHTML = `
      <div class="light-hint-content">
        <span class="light-hint-icon">↕</span>
        <span class="light-hint-text">长按控火候</span>
      </div>
    `;

    hint.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      z-index: 50;
      background: rgba(28, 18, 8, 0.6);
      backdrop-filter: blur(8px);
      border-radius: 100px;
      padding: 6px 12px;
      font-family: var(--mono, 'DM Mono', monospace);
      font-size: 0.55rem;
      letter-spacing: 0.1em;
      color: rgba(250, 246, 238, 0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;

    return hint;
  }

  /**
   * 显示/隐藏常驻轻提示
   */
  function updateLightHint(visible) {
    let hint = document.getElementById('factory-light-hint');
    if (!hint) {
      const container = document.getElementById('factory-canvas-wrap');
      if (!container) return;
      hint = createLightHint();
      container.appendChild(hint);
    }

    hint.style.opacity = visible ? '1' : '0';
  }

  /**
   * 创建状态内提示
   */
  function createStateHint() {
    const hint = document.createElement('div');
    hint.id = 'factory-state-hint';
    hint.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 60;
      font-family: var(--serif, 'Cormorant Garamond', serif);
      font-size: 1.4rem;
      font-weight: 300;
      color: var(--gold, #E8A93A);
      text-shadow: 0 2px 20px rgba(192, 123, 26, 0.5);
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
      white-space: nowrap;
    `;

    return hint;
  }

  /**
   * 显示状态内提示
   */
  function showStateHint(message, duration = 1500) {
    let hint = document.getElementById('factory-state-hint');
    if (!hint) {
      const container = document.getElementById('factory-canvas-wrap');
      if (!container) return;
      hint = createStateHint();
      container.appendChild(hint);
    }

    hint.textContent = message;
    hint.style.opacity = '1';

    setTimeout(() => {
      hint.style.opacity = '0';
    }, duration);
  }

  // ========== 火候三段迟滞判断 ==========

  /**
   * 判断当前阶段（带迟滞）
   */
  function getStageWithHysteresis(progress) {
    const { soft, golden, crispy } = CONFIG.thresholds;

    // 根据上一阶段决定进入新阶段的条件
    if (State.currentStage === 'soft' || State.currentStage === 'golden') {
      // 从松软/金黄进入焦香需要达到 crispy.enter
      if (progress >= crispy.enter) {
        return 'crispy';
      }
      // 退回松软需要低于 soft.exit
      if (progress < soft.exit) {
        return 'soft';
      }
      // 在 golden 区间
      return 'golden';
    } else {
      // 从焦香退回金黄需要低于 crispy.exit
      if (progress < crispy.exit) {
        return 'golden';
      }
      // 保持在焦香
      return 'crispy';
    }
  }

  /**
   * 检查是否发生阶段切换
   */
  function checkStageTransition(progress) {
    const newStage = getStageWithHysteresis(progress);

    if (newStage !== State.currentStage) {
      // 阶段切换
      State.previousStage = State.currentStage;
      State.currentStage = newStage;
      State.lastStageChange = Date.now();

      // 任务A: 首次显示/切换文案
      showStageLabel(newStage);

      // 任务D1: 触发视觉增强
      triggerStageBoost();

      // 触发回调
      if (onStageChange) {
        onStageChange(newStage, State.previousStage);
      }

      console.log(`[FactoryStage] ${State.previousStage} → ${newStage} (progress: ${progress.toFixed(2)})`);
    }

    return State.currentStage;
  }

  /**
   * 显示阶段文案（任务A）
   */
  function showStageLabel(stage) {
    if (!State.hasInteracted) return;

    const container = document.getElementById('factory-stage-labels');
    if (!container) return;

    // 只有首次显示时才触发动画切换
    if (!State.isLabelVisible) {
      setStageLabelImmediate(stage);
      State.isLabelVisible = true;
    } else {
      // 已有文案，切换动画
      switchStageLabel(stage);
    }
  }

  /**
   * 隐藏阶段文案（任务A: 火候回落时淡出）
   */
  function hideStageLabel() {
    if (!State.isLabelVisible) return;

    const container = document.getElementById('factory-stage-labels');
    if (!container) return;

    const labels = container.querySelectorAll('.stage-label');
    labels.forEach(label => {
      label.style.transition = 'opacity 0.4s ease';
      label.style.opacity = '0';
    });

    State.isLabelVisible = false;

    // 清理动画样式
    setTimeout(() => {
      labels.forEach(label => {
        label.style.transition = 'none';
      });
    }, 400);
  }

  // ========== 三段文案切换动画 ==========

  let stageLabelElements = {
    current: null,
    next: null
  };

  /**
   * 创建双层文案容器
   */
  function createStageLabelContainer() {
    const container = document.createElement('div');
    container.id = 'factory-stage-labels';
    container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 70;
      pointer-events: none;
    `;

    container.innerHTML = `
      <div class="stage-label current" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--serif, 'Cormorant Garamond', serif);
        font-size: 2.8rem;
        font-weight: 300;
        color: var(--gold, #E8A93A);
        text-shadow: 0 2px 30px rgba(192, 123, 26, 0.6);
        letter-spacing: 0.15em;
        line-height: 1.2;
        opacity: 0;
      "></div>
      <div class="stage-label next" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--serif, 'Cormorant Garamond', serif);
        font-size: 2.8rem;
        font-weight: 300;
        color: var(--gold, #E8A93A);
        text-shadow: 0 2px 30px rgba(192, 123, 26, 0.6);
        letter-spacing: 0.15em;
        line-height: 1.2;
        opacity: 0;
      "></div>
    `;

    return container;
  }

  /**
   * 切换文案（双层交叉淡入淡出）
   */
  function switchStageLabel(newStage) {
    const container = document.getElementById('factory-stage-labels');
    if (!container) return;

    const labels = container.querySelectorAll('.stage-label');
    const currentLabel = labels[0];
    const nextLabel = labels[1];

    // 获取动画配置
    const anim = CONFIG.animation;

    // 随机选择时长
    const fadeOutDuration = anim.fadeOutMin + Math.random() * (anim.fadeOutMax - anim.fadeOutMin);
    const fadeInDuration = anim.fadeInMin + Math.random() * (anim.fadeInMax - anim.fadeInMin);

    // 设置新文案
    nextLabel.textContent = getStageLabel(newStage);
    nextLabel.style.opacity = '0';
    nextLabel.style.transform = `translate(-50%, -50%) scale(${anim.scaleFrom})`;

    // 开始交叉淡入淡出
    // 1. 淡出当前
    currentLabel.style.transition = `opacity ${fadeOutDuration}ms ease, transform ${fadeOutDuration}ms ease`;
    currentLabel.style.opacity = '0';
    currentLabel.style.transform = `translate(-50%, -50%) scale(${anim.scalePeak})`;

    // 2. 延迟后淡入新文案
    setTimeout(() => {
      nextLabel.style.transition = `opacity ${fadeInDuration}ms ease, transform ${fadeInDuration}ms ease`;
      nextLabel.style.opacity = '1';
      nextLabel.style.transform = `translate(-50%, -50%) scale(${anim.scalePeak})`;

      // 3. 微缩放回归
      setTimeout(() => {
        nextLabel.style.transform = `translate(-50%, -50%) scale(${anim.scaleTo})`;
      }, fadeInDuration);

      // 4. 交换层
      setTimeout(() => {
        currentLabel.textContent = nextLabel.textContent;
        currentLabel.style.opacity = '1';
        currentLabel.style.transform = `translate(-50%, -50%) scale(${anim.scaleTo})`;
        currentLabel.style.transition = 'none';
        nextLabel.style.opacity = '0';
        nextLabel.style.transform = `translate(-50%, -50%) scale(${anim.scaleFrom})`;
      }, fadeInDuration + 100);
    }, fadeOutDuration / 2);
  }

  /**
   * 获取阶段文案
   */
  function getStageLabel(stage) {
    const labels = {
      soft: '松软',
      golden: '金黄',
      crispy: '焦香'
    };
    return labels[stage] || '';
  }

  /**
   * 隐藏文案（无动画，用于初始化和低火候隐藏）
   */
  function hideStageLabelImmediate() {
    const container = document.getElementById('factory-stage-labels');
    if (!container) return;

    const labels = container.querySelectorAll('.stage-label');
    labels.forEach(label => {
      label.style.opacity = '0';
    });
    State.isLabelVisible = false;
  }

  /**
   * 直接更新文案（无动画，用于初始化）
   */
  function setStageLabelImmediate(stage) {
    const container = document.getElementById('factory-stage-labels');
    if (!container) return;

    const currentLabel = container.querySelector('.stage-label.current');
    if (currentLabel) {
      currentLabel.textContent = getStageLabel(stage);
      currentLabel.style.opacity = '1';
      currentLabel.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  }

  // ========== 分段联动反馈 ==========

  /**
   * 获取分段反馈强度
   */
  function getFeedbackIntensity(stage) {
    return CONFIG.feedbackIntensity[stage] || CONFIG.feedbackIntensity.soft;
  }

  /**
   * 更新视觉反馈（任务D1: 增强版）
   */
  function updateVisualFeedback(stage, progress) {
    const intensity = getFeedbackIntensity(stage);
    const vc = VISUAL_CONFIG;

    // 基础强度
    let ovenGlow = intensity.ovenGlow;
    let steam = intensity.steam;
    let highlight = intensity.highlight;

    // 任务D1: golden 阶段增强
    if (stage === 'golden') {
      steam *= vc.goldenEnhance.steamBoost;
      highlight *= vc.goldenEnhance.highlightBoost;
    }

    // 任务D1: 应用 boost 效果
    if (State.boostIntensity > 0) {
      const boostFactor = 1 + State.boostIntensity * (vc.boost.multiplier - 1);
      ovenGlow *= boostFactor;
      steam *= boostFactor;
      highlight *= boostFactor;
    }

    // 触发回调更新外部视觉
    if (onFeedbackUpdate) {
      onFeedbackUpdate({
        stage,
        progress,
        ovenGlow: Math.min(ovenGlow, vc.ovenGlowMax),
        steam: Math.min(steam, vc.steamMax),
        highlight: Math.min(highlight, 1.0),
        // 基于进度的插值
        ovenGlowScaled: Math.min(intensity.ovenGlow * (0.5 + progress * 0.5), vc.ovenGlowMax),
        steamScaled: Math.min(intensity.steam * (0.3 + progress * 0.7), vc.steamMax),
        // 任务D1: 传递 boost 强度供外部使用
        boostIntensity: State.boostIntensity
      });
    }
  }

  /**
   * 触发阶段切换视觉增强（任务D1）
   */
  function triggerStageBoost() {
    const vc = VISUAL_CONFIG;
    
    // 清除之前的 boost
    if (State.boostTimeout) {
      clearTimeout(State.boostTimeout);
    }

    // 设置 boost
    State.boostIntensity = 1;

    // 渐进衰减
    function decayBoost() {
      State.boostIntensity -= vc.boost.decayRate;
      if (State.boostIntensity <= 0) {
        State.boostIntensity = 0;
      } else {
        State.boostTimeout = requestAnimationFrame(decayBoost);
      }
    }
    
    State.boostTimeout = requestAnimationFrame(decayBoost);
  }

  /**
   * 播放阶段切换提示音
   */
  function playStageChangeSound(newStage) {
    if (newStage === 'golden') {
      // 进入金黄段，播放命中音效
      if (global.AudioManager && typeof AudioManager.playGolden === 'function') {
        AudioManager.playGolden();
      }
    }
  }

  // ========== 回调 ==========
  let onStageChange = null;
  let onFeedbackUpdate = null;

  // ========== 公开 API ==========

  const FactoryInteraction = {
    /**
     * 初始化
     */
    init(options = {}) {
      console.log('[FactoryInteraction] Initializing...');

      elements.container = document.getElementById('factory-canvas-wrap');

      // 创建双层文案容器
      if (elements.container) {
        const labelContainer = createStageLabelContainer();
        elements.container.appendChild(labelContainer);

        // 任务A: 初始不显示文案，等待用户首次交互
        hideStageLabelImmediate();

        // 延迟显示引导提示
        setTimeout(() => {
          showGuideHint();
          updateLightHint(true);
        }, 500);
      }

      // 设置回调
      if (options.onStageChange) {
        onStageChange = options.onStageChange;
      }
      if (options.onFeedbackUpdate) {
        onFeedbackUpdate = options.onFeedbackUpdate;
      }

      console.log('[FactoryInteraction] Initialized');
    },

    /**
     * 处理火候更新
     */
    update(progress) {
      State.holdProgress = progress;

      // 检测是否正在上升
      State.isRising = progress > State.lastProgress;

      // 检查阶段切换
      checkStageTransition(progress);

      // 更新视觉反馈
      updateVisualFeedback(State.currentStage, progress);

      // 任务A: 火候回落到低阈值时隐藏文案
      if (progress < VISUAL_CONFIG.labelFadeThreshold) {
        hideStageLabel();
      }

      // 状态内提示
      if (State.isRising && progress > 0.3 && progress < 0.45) {
        // 正在上升但还未进入金黄
      }

      State.lastProgress = progress;
    },

    /**
     * 处理首次交互（任务A）
     */
    handleFirstInteraction() {
      if (!State.hasInteracted) {
        State.hasInteracted = true;

        // 关闭引导提示
        dismissGuideHint(false);

        // 播放点击音效
        if (global.AudioManager && typeof AudioManager.playClick === 'function') {
          AudioManager.playClick();
        }

        // 任务A: 首次交互后显示当前阶段的文案
        if (State.holdProgress > 0) {
          showStageLabel(State.currentStage);
        }
      }
    },

    /**
     * 获取当前阶段
     */
    getCurrentStage() {
      return State.currentStage;
    },

    /**
     * 获取当前进度
     */
    getProgress() {
      return State.holdProgress;
    },

    /**
     * 获取 Boost 强度（任务D1: 供外部使用）
     */
    getBoostIntensity() {
      return State.boostIntensity;
    },

    /**
     * 获取配置
     */
    getConfig() {
      return { ...CONFIG, visual: VISUAL_CONFIG };
    },

    /**
     * 显示状态提示
     */
    showStateHint,

    /**
     * 销毁
     */
    destroy() {
      ['factory-guide-hint', 'factory-light-hint', 'factory-state-hint', 'factory-stage-labels'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }
  };

  // 导出
  global.FactoryInteraction = FactoryInteraction;

})(typeof window !== 'undefined' ? window : this);
