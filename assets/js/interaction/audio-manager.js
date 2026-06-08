/**
 * ============================================================
 * HAOSHI Audio Manager — V4.0
 * ============================================================
 * 规格（V2.0 音效清单）：
 * - BGM: haoshi-bgm-morning.mp3 (128kbps) / morning-low.mp3 (48kbps mono)
 * - SFX: 12 声音原子 + 2 Loader 专用音效（V3.90 完整映射）
 * - 感知时长策略：所有 SFX 统一感知上限 150ms（超长音效 150ms 后淡出截断）
 * - 首触启音：用户首次交互后自动播放 BGM（需非静音偏好）
 * - localStorage 持久化静音偏好
 * - 懒加载 SFX：首访交互后加载，不影响 FCP
 * - V4.0: 网络感知 BGM 选源（弱网自动降级到 48kbps mono）
 * ============================================================
 */

(function(global) {
  'use strict';

  // ========== 音频状态机 ==========
  const AudioState = {
    muted: true,           // 当前静音状态（系统或用户触发）
    armed: false,         // 已解除静音，等待播放
    active: false,        // 正在播放
    userMuted: false,     // 用户手动静音（影响 localStorage）
    autoPlayAttempted: false,
    autoPlaySuccess: false
  };

  // ========== 网络感知 BGM 选源 ==========
  function selectBGMSrc() {
    var isSlow = false;
    // Network Information API
    if (navigator.connection) {
      var type = navigator.connection.effectiveType;
      var rtt = navigator.connection.rtt;
      // effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
      // 2g/3g 或 RTT > 300ms 使用低码率
      if (type === 'slow-2g' || type === '2g' || type === '3g') isSlow = true;
      if (rtt && rtt > 300) isSlow = true;
    }
    // 微信浏览器额外判断：微信环境通常网络更差
    if (/MicroMessenger/.test(navigator.userAgent)) isSlow = true;

    if (isSlow) {
      console.log('[Audio] V4.0: Slow network detected, using low-bitrate BGM (48kbps mono)');
      return 'assets/audio/bgm/haoshi-bgm-morning-low.mp3';
    }
    return 'assets/audio/bgm/haoshi-bgm-morning.mp3';
  }

  // ========== 音频配置 ==========
  const AudioConfig = {
    bgm: {
      src: selectBGMSrc(),                  // V4.0: 网络感知选源
      srcHigh: 'assets/audio/bgm/haoshi-bgm-morning.mp3',     // 128kbps stereo
      srcLow:  'assets/audio/bgm/haoshi-bgm-morning-low.mp3',  // 48kbps mono
      volume: 0.12,                         // 用户确认默认音量
      fadeInDuration: 1000,
      fadeOutDuration: 300,
      loop: true
    },
    // SFX 感知时长策略
    sfx: {
      // 感知上限：超过此值立即淡出截断（单位 ms）
      maxPerceivedDuration: 150,
      fadeOutDuration: 80,   // 淡出截断用时
      // 如果文件 < 感知上限，正常播放；否则 150ms 后 fade-out
    },
    storageKey: 'haoshi_audio_preference',
    activateDelay: 80
  };

  // ========== SFX 池（V3.90 完整映射 — 12 声音原子 + 2 Loader 专用音效） ==========
  // 规格来源：豪士面包音效清单 V2.0
  const SFX_MAP = {
    // 核心声音原子（P1-3 优先实现）
    click:    { src: 'assets/audio/sfx/wood-tap-soft.mp3',               volume: 0.25, category: 'ui-light'   },  // S1 木槌轻敲
    switch:   { src: 'assets/audio/sfx/haoshi-ceramic-ting-clean.mp3',   volume: 0.22, category: 'ui-medium' },  // S2 陶瓷轻触
    nav:      { src: 'assets/audio/sfx/haoshi-paper-slide-grain.mp3',    volume: 0.15, category: 'ui-light'   },  // S3 和纸滑过
    step:     { src: 'assets/audio/sfx/haoshi-bamboo-knock-hollow.mp3', volume: 0.16, category: 'ui-light'   },  // S4 竹节互敲
    open:     { src: 'assets/audio/sfx/haoshi-steam-rise-airy.mp3',      volume: 0.22, category: 'ui-medium' },  // S5 蒸汽升起
    hover:    { src: 'assets/audio/sfx/haoshi-dough-press-pillow.mp3',   volume: 0.20, category: 'ambient'    },  // S6 面团按压
    golden:   { src: 'assets/audio/sfx/haoshi-golden-chime-warm.mp3',    volume: 0.32, category: 'highlight'  },  // S7 金编钟
    done:     { src: 'assets/audio/sfx/haoshi-tea-pour-delicate.mp3',    volume: 0.30, category: 'success'    },  // S8 斟茶入杯
    holdRise: { src: 'assets/audio/sfx/haoshi-oven-hum-deep.mp3',        volume: 0.28, category: 'ui-medium' },  // S9 石窑嗡鸣
    peak:     { src: 'assets/audio/sfx/haoshi-crust-crack-crisp.mp3',    volume: 0.30, category: 'highlight'  },  // S10 面包脆裂
    dismiss:  { src: 'assets/audio/sfx/haoshi-flour-dust-soft.mp3',      volume: 0.12, category: 'ui-light'   },  // S11 面粉轻散
    error:    { src: 'assets/audio/sfx/haoshi-metal-strike-muted.mp3',   volume: 0.20, category: 'ui-medium' },  // S12 金属止音
    // Loader 线框动画专用
    wireDraw:     { src: 'assets/audio/sfx/haoshi-wire-tension-gold.mp3',       volume: 0.16, category: 'ui-light'   },  // SX 金线绷紧
    wireDissolve: { src: 'assets/audio/sfx/haoshi-wire-dissolve-shimmer.mp3',   volume: 0.14, category: 'ui-light'   },  // SX2 金线消解
  };

  // ========== 音频实例 ==========
  let bgmAudio = null;
  let sfxAudios = {};
  let sfxLoaded = false;
  // 正在 fade-out 的 sfx timer refs（防止重复）
  let fadeTimers = {};

  // 懒加载 SFX：首访交互后加载，不影响 FCP
  function lazyLoadSFX() {
    if (sfxLoaded) return;
    sfxLoaded = true;
    Object.entries(SFX_MAP).forEach(([key, cfg]) => {
      const a = new Audio();
      a.src = cfg.src;
      a.preload = 'auto';
      a.volume = cfg.volume;
      sfxAudios[key] = a;
    });
    console.log('[Audio] SFX lazy-loaded:', Object.keys(SFX_MAP).join(', '));
    document.removeEventListener('click', lazyLoadSFX);
    document.removeEventListener('touchstart', lazyLoadSFX);
  }

  // 首触时触发懒加载（SFX 预加载，不触发 BGM）
  document.addEventListener('click', lazyLoadSFX, { once: true, passive: true });
  document.addEventListener('touchstart', lazyLoadSFX, { once: true, passive: true });

  // ========== 工具函数 ==========
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function loadUserPreference() {
    try {
      const pref = localStorage.getItem(AudioConfig.storageKey);
      if (pref !== null) {
        AudioState.userMuted = pref === 'muted';
        AudioState.muted = AudioState.userMuted;
        return pref !== 'muted';
      }
    } catch (e) {
      console.warn('[Audio] localStorage unavailable:', e);
    }
    return false; // 默认静音偏好
  }

  function saveUserPreference(isMuted) {
    try {
      localStorage.setItem(AudioConfig.storageKey, isMuted ? 'muted' : 'unmuted');
    } catch (e) {
      console.warn('[Audio] Cannot save preference:', e);
    }
  }

  function createAudio(src, options = {}) {
    const audio = new Audio();
    audio.src = src;
    audio.preload = 'metadata';
    audio.loop = options.loop || false;
    audio.volume = 0;
    if (options.muted !== undefined) audio.muted = options.muted;
    return audio;
  }

  async function fadeIn(audio, targetVolume, duration) {
    const start = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const stepVol = (targetVolume - start) / steps;
    for (let i = 1; i <= steps; i++) {
      audio.volume = Math.max(0, Math.min(1, start + stepVol * i));
      await sleep(stepDuration);
    }
    audio.volume = targetVolume;
  }

  async function fadeOut(audio, duration) {
    const start = audio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const stepVol = start / steps;
    for (let i = 1; i <= steps; i++) {
      audio.volume = Math.max(0, start - stepVol * i);
      await sleep(stepDuration);
    }
    audio.volume = 0;
  }

  // ========== SFX 感知时长管理 ==========
  // 方案1（确认采用）：统一感知上限 150ms，超长音效 150ms 后 fade-out 截断
  function _playSFX(name) {
    const cfg = SFX_MAP[name];
    if (!cfg) {
      console.warn('[Audio] Unknown SFX:', name);
      return;
    }
    // 用户静音时不播放 SFX（与 BGM 静音保持一致）
    if (AudioState.userMuted) return;

    const sfx = sfxAudios[name];
    if (!sfx) return;

    // 如果音效已存在同一实例，先停止并清除旧 timer
    if (fadeTimers[name]) {
      clearTimeout(fadeTimers[name]);
      clearInterval(fadeTimers[name]);
      delete fadeTimers[name];
    }
    sfx.volume = cfg.volume;
    sfx.currentTime = 0;
    try {
      sfx.play().catch(() => {});
    } catch (e) {}

    // 感知时长截断：150ms 后淡出（对短音效无影响）
    const duration = sfx.duration || 0;
    if (duration > 0 && duration * 1000 > AudioConfig.sfx.maxPerceivedDuration) {
      fadeTimers[name] = setTimeout(() => {
        // 感知时长已到，开始 fade-out
        const vol = sfx.volume;
        let step = 0;
        const steps = 5;
        const fadeStep = AudioConfig.sfx.fadeOutDuration / steps;
        const volStep = vol / steps;
        const iv = setInterval(() => {
          step++;
          sfx.volume = Math.max(0, vol - volStep * step);
          if (step >= steps) {
            clearInterval(iv);
            try { sfx.pause(); } catch (e) {}
            sfx.volume = cfg.volume; // 恢复原始音量供下次使用
            delete fadeTimers[name];
          }
        }, fadeStep);
      }, AudioConfig.sfx.maxPerceivedDuration);
    }
  }

  // ========== AudioManager ==========
  let isInitialized = false;

  const AudioManager = {

    async init() {
      if (isInitialized) return;
      console.log('[Audio] V3.80 initializing — BGM:', AudioConfig.bgm.src);
      loadUserPreference();
      bgmAudio = createAudio(AudioConfig.bgm.src, {
        loop: AudioConfig.bgm.loop,
        muted: AudioState.muted
      });
      // 绑定 video play 防御：确保 BGM 不会因 video 意外播放
      bgmAudio.addEventListener('play', () => {
        if (AudioState.muted && !AudioState.userMuted === false) {
          // 用户非静音但系统被静音，说明可能是被其他音频抢走了
        }
      });
      isInitialized = true;
      console.log('[Audio] V3.80 initialized. User muted:', AudioState.userMuted);
      return this.getState();
    },

    async tryAutoPlayOnLoad() {
      if (!isInitialized) return { success: false, reason: 'not_initialized' };
      // 如果用户已静音，不尝试自动播放（首触启音才是正道）
      if (AudioState.userMuted) return { success: false, reason: 'user_muted' };
      if (AudioState.autoPlayAttempted || AudioState.armed || AudioState.active) {
        return { success: AudioState.autoPlaySuccess, reason: 'already_attempted' };
      }
      console.log('[Audio] Attempting auto-play...');
      AudioState.autoPlayAttempted = true;
      try {
        bgmAudio.muted = false;
        AudioState.muted = false;
        await bgmAudio.play();
        await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
        AudioState.armed = true;
        AudioState.active = true;
        AudioState.autoPlaySuccess = true;
        console.log('[Audio] Auto-play success!');
        return { success: true };
      } catch (e) {
        console.log('[Audio] Auto-play blocked (browser policy) — waiting for first touch');
        AudioState.autoPlaySuccess = false;
        return { success: false, reason: 'blocked_by_browser' };
      }
    },

    async handleFirstInteraction() {
      // 如果 auto-play 已成功，无需处理
      if (AudioState.autoPlaySuccess) return;
      // 如果已 armed（auto-play 失败后已解锁），也无需处理
      if (AudioState.armed) return;
      if (!isInitialized || !bgmAudio) return;

      console.log('[Audio] First interaction — arming audio...');
      AudioState.armed = true;
      if (AudioState.userMuted) {
        console.log('[Audio] User muted — BGM will not play until toggle');
        return;
      }
      await sleep(AudioConfig.activateDelay);
      bgmAudio.muted = false;
      AudioState.muted = false;
      try {
        await bgmAudio.play();
        await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration);
        AudioState.active = true;
        console.log('[Audio] BGM playing (first touch)');
      } catch (e) {
        console.warn('[Audio] BGM play failed:', e);
      }
    },

    needsInteractionListener() {
      return !AudioState.autoPlayAttempted || !AudioState.autoPlaySuccess;
    },

    async toggle() {
      if (!isInitialized) await this.init();
      AudioState.userMuted = !AudioState.userMuted;
      saveUserPreference(AudioState.userMuted);
      console.log('[Audio] Toggle:', AudioState.userMuted ? 'MUTED' : 'UNMUTED');

      if (AudioState.userMuted) {
        AudioState.muted = true;
        if (AudioState.active) await fadeOut(bgmAudio, AudioConfig.bgm.fadeOutDuration);
        bgmAudio.muted = true;
      } else {
        bgmAudio.muted = false;
        AudioState.muted = false;
        if (AudioState.armed && AudioState.active) {
          await fadeIn(bgmAudio, AudioConfig.bgm.volume, 400);
        } else if (AudioState.armed) {
          try { await bgmAudio.play(); await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration); AudioState.active = true; } catch (e) {}
        } else {
          AudioState.armed = true;
          try { await bgmAudio.play(); await fadeIn(bgmAudio, AudioConfig.bgm.volume, AudioConfig.bgm.fadeInDuration); AudioState.active = true; } catch (e) {}
        }
      }
      return this.getState();
    },

    // SFX 播放入口（V3.90: 支持全部 15 种音效）
    playSFX(name)         { _playSFX(name); },
    playClick()           { _playSFX('click'); },
    playOpen()            { _playSFX('open'); },
    playSwitch()          { _playSFX('switch'); },
    playNav()             { _playSFX('nav'); },
    playGolden()          { _playSFX('golden'); },   // 阶段到达，正常播放不截断
    playHoldRise()        { _playSFX('holdRise'); },
    playDone()            { _playSFX('done'); },
    // V3.90 新增
    playStep()            { _playSFX('step'); },       // S4 竹节互敲
    playHover()           { _playSFX('hover'); },      // S6 面团按压
    playPeak()            { _playSFX('peak'); },       // S10 面包脆裂
    playDismiss()         { _playSFX('dismiss'); },    // S11 面粉轻散
    playError()           { _playSFX('error'); },      // S12 金属止音
    playWireDraw()        { _playSFX('wireDraw'); },   // SX 金线绷紧
    playWireDissolve()    { _playSFX('wireDissolve'); }, // SX2 金线消解

    setBGMVolume(vol) {
      if (bgmAudio) bgmAudio.volume = Math.max(0, Math.min(1, vol));
    },

    getState() {
      return {
        ...AudioState,
        isPlaying: AudioState.active && !AudioState.muted,
        volume: bgmAudio ? bgmAudio.volume : 0
      };
    },

    // V3.90: 返回 SFX Audio 元素引用，供调用方独立调节 playbackRate/volume
    getSource(name) {
      return sfxAudios[name] || null;
    },
    // V3.91: 返回所有 SFX 元素引用（调试用）
    getAllSources() {
      return sfxAudios;
    },

    isReady()           { return isInitialized; },
    isAutoPlaySuccess() { return AudioState.autoPlaySuccess; },
    isPlaying()         { return AudioState.active && !AudioState.muted; },
    getBGMElement()     { return bgmAudio; },

    pauseBGM() {
      if (bgmAudio && AudioState.active) bgmAudio.pause();
    },

    resumeBGM() {
      if (bgmAudio && AudioState.armed && !AudioState.userMuted) {
        bgmAudio.play().catch(() => {});
      }
    }
  };

  global.AudioManager = AudioManager;

})(typeof window !== 'undefined' ? window : this);
