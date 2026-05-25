/**
 * ============================================================
 * HAOSHI Audio Manager
 * 音频管理模块
 * ============================================================
 * - BGM 策略：muted → armed → active
 * - 首次交互后解除静音并淡入
 * - 用户偏好 localStorage 持久化
 * - SFX 音效管理
 */

(function(global) {
  'use strict';

  // ========== 音频状态机 ==========
  const AudioState = {
    // 初始静音状态
    muted: true,
    // 首次交互后待激活
    armed: false,
    // 活跃状态
    active: false,
    // 用户手动静音
    userMuted: false,
    // 是否已尝试自动播放（方案2新增）
    autoPlayAttempted: false,
    // 自动播放是否成功
    autoPlaySuccess: false
  };

  // ========== 音频配置 ==========
  const AudioConfig = {
    // BGM 配置
    bgm: {
      src: 'assets/audio/bgm-diamonds-ra-costelloe.mp3',
      volume: 0.12,        // 默认音量 12%（8%~14% 范围）
      fadeInDuration: 1000, // 淡入时长 1000ms（800~1200ms 范围）
      loop: true
    },
    // SFX 配置
    sfx: {
      click: {
        src: 'assets/audio/sfx-click-soft.mp3',
        volume: 0.3
      },
      switch: {
        src: 'assets/audio/sfx-mode-switch.mp3',
        volume: 0.25
      },
      golden: {
        src: 'assets/audio/sfx-golden-hit.mp3',
        volume: 0.35
      },
      holdRise: {
        src: 'assets/audio/sfx-hold-rise.mp3',
        volume: 0.3
      }
    },
    // localStorage key
    storageKey: 'haoshi_audio_preference',
    // 用户交互后激活延迟 (ms)
    activateDelay: 100
  };

  // ========== 音频实例 ==========
  let bgmAudio = null;
  let sfxAudios = {};
  let isInitialized = false;

  // ========== 工具函数 ==========

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 从 localStorage 读取用户偏好
   */
  function loadUserPreference() {
    try {
      const pref = localStorage.getItem(AudioConfig.storageKey);
      if (pref !== null) {
        AudioState.userMuted = pref === 'muted';
        AudioState.muted = AudioState.userMuted;
        return pref !== 'muted';
      }
    } catch (e) {
      console.warn('[Audio] Cannot access localStorage:', e);
    }
    return false;
  }

  /**
   * 保存用户偏好到 localStorage
   */
  function saveUserPreference(isMuted) {
    try {
      localStorage.setItem(AudioConfig.storageKey, isMuted ? 'muted' : 'unmuted');
    } catch (e) {
      console.warn('[Audio] Cannot save to localStorage:', e);
    }
  }

  /**
   * 创建音频元素
   */
  function createAudio(src, options = {}) {
    const audio = new Audio();
    audio.src = src;
    audio.preload = 'metadata';
    audio.loop = options.loop || false;
    audio.volume = 0;

    if (options.muted !== undefined) {
      audio.muted = options.muted;
    }

    return audio;
  }

  /**
   * 淡入音量
   */
  async function fadeIn(audio, targetVolume, duration) {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = (targetVolume - startVolume) / steps;

    for (let i = 1; i <= steps; i++) {
      audio.volume = startVolume + volumeStep * i;
      await sleep(stepDuration);
    }

    audio.volume = targetVolume;
  }

  /**
   * 淡出音量
   */
  async function fadeOut(audio, duration) {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;

    for (let i = 1; i <= steps; i++) {
      audio.volume = startVolume - volumeStep * i;
      await sleep(stepDuration);
    }

    audio.volume = 0;
  }

  // ========== 音频管理器 ==========

  const AudioManager = {
    /**
     * 初始化音频系统
     */
    async init() {
      if (isInitialized) return;

      console.log('[Audio] Initializing audio system...');

      // 读取用户偏好
      loadUserPreference();

      // 创建 BGM 实例
      bgmAudio = createAudio(AudioConfig.bgm.src, {
        loop: AudioConfig.bgm.loop,
        muted: AudioState.muted
      });

      // 创建 SFX 实例
      Object.keys(AudioConfig.sfx).forEach(key => {
        const sfxConfig = AudioConfig.sfx[key];
        sfxAudios[key] = createAudio(sfxConfig.src, { muted: false });
        sfxAudios[key].volume = sfxConfig.volume;
      });

      isInitialized = true;
      console.log('[Audio] Audio system initialized');

      return this.getState();
    },

    /**
     * 尝试自动播放 BGM（方案2：自动播放尝试 + 失败回退）
     * @returns {Promise<{success: boolean, reason?: string}>}
     */
    async tryAutoPlayOnLoad() {
      if (!isInitialized) {
        console.warn('[Audio] Audio system not initialized, cannot auto-play');
        return { success: false, reason: 'not_initialized' };
      }

      // 检查用户静音偏好
      if (AudioState.userMuted) {
        console.log('[Audio] User prefers muted, skipping auto-play');
        return { success: false, reason: 'user_muted' };
      }

      // 防止重复尝试
      if (AudioState.autoPlayAttempted) {
        console.log('[Audio] Auto-play already attempted');
        return { success: AudioState.autoPlaySuccess, reason: 'already_attempted' };
      }

      // 防止重复激活
      if (AudioState.armed || AudioState.active) {
        console.log('[Audio] Audio already armed or active');
        return { success: AudioState.active, reason: 'already_active' };
      }

      console.log('[Audio] Attempting auto-play BGM...');
      AudioState.autoPlayAttempted = true;

      try {
        // 解除静音
        bgmAudio.muted = false;
        AudioState.muted = false;

        // 尝试播放
        await bgmAudio.play();
        
        // 淡入
        await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
        
        AudioState.armed = true;
        AudioState.active = true;
        AudioState.autoPlaySuccess = true;
        console.log('[Audio] Auto-play successful!');
        return { success: true };
      } catch (e) {
        // 自动播放被浏览器拦截，静默回退
        console.log('[Audio] Auto-play blocked by browser policy, falling back to user interaction');
        AudioState.armed = false;
        AudioState.active = false;
        // 恢复静音状态，等待用户交互
        bgmAudio.muted = true;
        AudioState.muted = true;
        AudioState.autoPlaySuccess = false;
        return { success: false, reason: 'blocked_by_browser' };
      }
    },

    /**
     * 处理用户首次交互（回退方案）
     * 当自动播放失败后，通过用户交互激活
     */
    async handleFirstInteraction() {
      if (AudioState.autoPlaySuccess) {
        console.log('[Audio] Auto-play already succeeded, skipping interaction handling');
        return;
      }

      if (AudioState.armed) return;

      // V3.52 fix: init 未完成时不操作，避免 bgmAudio 为 null
      if (!isInitialized || !bgmAudio) {
        console.warn('[Audio] handleFirstInteraction called before init, skipping');
        return;
      }

      console.log('[Audio] First interaction detected, arming audio...');
      AudioState.armed = true;

      if (AudioState.userMuted) {
        console.log('[Audio] User prefers muted, skipping BGM');
        return;
      }

      await sleep(AudioConfig.activateDelay);

      bgmAudio.muted = false;
      AudioState.muted = false;

      try {
        await bgmAudio.play();
        await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
        AudioState.active = true;
        console.log('[Audio] BGM activated and playing');
      } catch (e) {
        console.warn('[Audio] Cannot play BGM:', e);
      }
    },

    /**
     * 检查是否需要挂载首次交互监听器
     * 当自动播放失败时返回 true
     */
    needsInteractionListener() {
      return !AudioState.autoPlayAttempted || !AudioState.autoPlaySuccess;
    },

    /**
     * 切换声音开关
     */
    async toggle() {
      if (!isInitialized) {
        await this.init();
      }

      AudioState.userMuted = !AudioState.userMuted;
      saveUserPreference(AudioState.userMuted);

      if (AudioState.userMuted) {
        // 静音：使用 muted 属性而非 pause()，保持播放位置
        AudioState.muted = true;
        if (AudioState.active) {
          await fadeOut(bgmAudio, 300);
        }
        bgmAudio.muted = true;
        // 不调用 pause()，保持 currentTime 不变
        console.log('[Audio] Muted by user (position preserved)');
      } else {
        // 取消静音：直接恢复
        bgmAudio.muted = false;
        AudioState.muted = false;

        // 防止重复激活（幂等）
        if (AudioState.armed && AudioState.active) {
          // 已经在播放，只做音量恢复
          await fadeIn(bgmAudio, AudioConfig.bgm.volume, 500);
          console.log('[Audio] Unmuted by user (continuing from current position)');
        } else if (AudioState.armed) {
          // armed 但未播放，尝试恢复
          try {
            await bgmAudio.play();
            await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
            AudioState.active = true;
            console.log('[Audio] Unmuted and resumed playback');
          } catch (e) {
            console.warn('[Audio] Cannot play BGM after unmute:', e);
          }
        } else {
          // 未 armed（正常应该是自动播放成功的），尝试播放
          try {
            await bgmAudio.play();
            await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
            AudioState.armed = true;
            AudioState.active = true;
            console.log('[Audio] Unmuted and started playback');
          } catch (e) {
            console.warn('[Audio] Cannot play BGM after unmute:', e);
          }
        }
      }

      return this.getState();
    },

    /**
     * 播放 SFX 音效
     */
    playSFX(name) {
      if (!isInitialized || !sfxAudios[name]) {
        console.warn(`[Audio] SFX "${name}" not found`);
        return;
      }

      // 如果完全静音，不播放
      if (AudioState.userMuted && AudioState.muted) {
        return;
      }

      const sfx = sfxAudios[name];
      sfx.currentTime = 0;

      try {
        sfx.play();
      } catch (e) {
        console.warn(`[Audio] Cannot play SFX "${name}":`, e);
      }
    },

    /**
     * 播放点击音效
     */
    playClick() {
      this.playSFX('click');
    },

    /**
     * 播放切换音效
     */
    playSwitch() {
      this.playSFX('switch');
    },

    /**
     * 播放金黄命中音效
     */
    playGolden() {
      this.playSFX('golden');
    },

    /**
     * 播放火候上升音效
     */
    playHoldRise() {
      this.playSFX('holdRise');
    },

    /**
     * 设置 BGM 音量
     */
    setBGMVolume(volume) {
      if (bgmAudio) {
        bgmAudio.volume = Math.max(0, Math.min(1, volume));
      }
    },

    /**
     * 获取当前状态
     */
    getState() {
      return {
        ...AudioState,
        isPlaying: AudioState.active && !AudioState.muted,
        volume: bgmAudio ? bgmAudio.volume : 0
      };
    },

    /**
     * 检查是否就绪
     */
    isReady() {
      return isInitialized;
    },

    /**
     * 检查是否自动播放成功
     */
    isAutoPlaySuccess() {
      return AudioState.autoPlaySuccess;
    },

    /**
     * 检查 BGM 是否正在播放
     */
    isPlaying() {
      return AudioState.active && !AudioState.muted;
    },

    /**
     * 获取 BGM 元素（用于 UI 绑定）
     */
    getBGMElement() {
      return bgmAudio;
    },

    /**
     * 暂停 BGM
     */
    pauseBGM() {
      if (bgmAudio && AudioState.active) {
        bgmAudio.pause();
      }
    },

    /**
     * 恢复 BGM
     */
    resumeBGM() {
      if (bgmAudio && AudioState.armed && !AudioState.userMuted) {
        bgmAudio.play().catch(() => {});
      }
    }
  };

  // ========== 导出 ==========
  global.AudioManager = AudioManager;
  global.AudioState = AudioState;

})(typeof window !== 'undefined' ? window : this);
