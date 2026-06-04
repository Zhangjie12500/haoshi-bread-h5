/**
 * ============================================================
 * HAOSHI Sound Toggle UI
 * 声音开关 UI 组件
 * ============================================================
 */

(function(global) {
  'use strict';

  /**
   * 创建声音开关按钮
   */
  function createSoundToggle(options = {}) {
    const config = {
      position: options.position || 'fixed',  // fixed | absolute
      bottom: options.bottom || '2rem',  // 改为 bottom 避免与顶部按钮重叠
      right: options.right || '2rem',
      top: 'auto',  // 清除 top
      zIndex: options.zIndex || 200,
      tooltip: options.tooltip !== false,
      tooltipText: options.tooltipText || '点击开启声音',
      onToggle: options.onToggle || null
    };

    // 创建按钮容器
    const container = document.createElement('div');
    container.id = 'sound-toggle';
    container.style.cssText = `
      position: ${config.position};
      bottom: ${config.bottom};
      right: ${config.right};
      z-index: ${config.zIndex};
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 50%;
      background: rgba(250, 246, 238, 0.9);
      backdrop-filter: blur(8px);
      border: 0.5px solid rgba(28, 18, 8, 0.1);
      transition: all 0.25s ease;
    `;

    // 创建 SVG 图标
    const icon = document.createElement('div');
    icon.innerHTML = `
      <svg id="sound-icon-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--rust, #7A3A0A);">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      <svg id="sound-icon-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--rust, #7A3A0A); display: none;">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>
    `;
    container.appendChild(icon);

    // 创建 Tooltip
    if (config.tooltip) {
      const tooltip = document.createElement('div');
      tooltip.id = 'sound-tooltip';
      tooltip.textContent = config.tooltipText;
      tooltip.style.cssText = `
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 12px;
        background: var(--ink, #1C1208);
        color: var(--cream, #FAF6EE);
        font-family: var(--mono, 'DM Mono', monospace);
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        white-space: nowrap;
        border-radius: 6px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      `;
      container.appendChild(tooltip);

      container.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
      });
      container.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    }

    // 点击波纹效果
    container.addEventListener('click', function(e) {
      // 创建波纹
      const ripple = document.createElement('span');
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(192, 123, 26, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: soundToggleRipple 0.4s ease-out forwards;
        pointer-events: none;
      `;
      container.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 400);

      // 回调
      if (config.onToggle) {
        config.onToggle();
      }
      // V3.92: 音效反馈
      if (global.AudioManager) {
        AudioManager.playSFX('switch');
      }
    });

    // Hover 效果
    container.addEventListener('mouseenter', () => {
      container.style.background = 'rgba(250, 246, 238, 1)';
      container.style.transform = 'scale(1.05)';
      container.style.boxShadow = '0 4px 12px rgba(28, 18, 8, 0.15)';
    });
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
      container.style.boxShadow = 'none';
    });

    // 添加波纹动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes soundToggleRipple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    if (!document.getElementById('sound-toggle-styles')) {
      style.id = 'sound-toggle-styles';
      document.head.appendChild(style);
    }

    return container;
  }

  /**
   * 更新声音开关状态
   */
  function updateSoundToggleState(isMuted) {
    const iconOn = document.getElementById('sound-icon-on');
    const iconOff = document.getElementById('sound-icon-off');
    const tooltip = document.getElementById('sound-tooltip');

    if (iconOn && iconOff) {
      iconOn.style.display = isMuted ? 'none' : 'block';
      iconOff.style.display = isMuted ? 'block' : 'none';
    }

    if (tooltip) {
      tooltip.textContent = isMuted ? '点击开启声音' : '点击关闭声音';
    }
  }

  /**
   * 将声音开关添加到页面
   * V3.80: 优先复用 HTML 中已存在的 nav#sound-toggle，避免重复创建
   */
  function mount(container) {
    // V3.80: 检查 nav 内是否已有 #sound-toggle 按钮
    const existingNavToggle = document.getElementById('sound-toggle');
    if (existingNavToggle) {
      // 复用现有的 nav 按钮：只需绑定点击事件
      existingNavToggle.addEventListener('click', () => {
        if (global.AudioManager) {
          AudioManager.toggle().then(state => {
            updateSoundToggleState(state.userMuted);
          });
        }
      });
      existingNavToggle.addEventListener('touchstart', () => {
        existingNavToggle.style.transform = 'scale(0.92)';
      }, { passive: true });
      existingNavToggle.addEventListener('touchend', () => {
        setTimeout(() => { existingNavToggle.style.transform = ''; }, 150);
      }, { passive: true });
      existingNavToggle.addEventListener('mouseleave', () => {
        existingNavToggle.style.transform = '';
      });
      // 初始化状态
      if (global.AudioManager) {
        const state = AudioManager.getState();
        updateSoundToggleState(state.userMuted);
      }
      console.log('[SoundToggle] V3.80: reusing existing nav button');
      return existingNavToggle;
    }

    // 没有现成的，就创建 fixed 按钮
    const toggle = createSoundToggle({
      onToggle: () => {
        if (global.AudioManager) {
          AudioManager.toggle().then(state => {
            updateSoundToggleState(state.userMuted);
          });
        }
      }
    });
    (container || document.body).appendChild(toggle);
    if (global.AudioManager) {
      const state = AudioManager.getState();
      updateSoundToggleState(state.userMuted);
    }
    console.log('[SoundToggle] V3.80: created new fixed button');
    return toggle;
  }

  // ========== 导出 ==========
  const SoundToggle = {
    create: createSoundToggle,
    mount,
    updateState: updateSoundToggleState
  };

  global.SoundToggle = SoundToggle;

})(typeof window !== 'undefined' ? window : this);
