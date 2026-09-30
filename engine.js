/**
 * ============================================================================
 * MOTOR PRINCIPAL DEL JUEGO — «EL CENTINELA DEL RITMO» (HIGHWAY GUITAR HERO STREAM)
 * Universo Proiectio — Libro 1: CLOTO (Capítulo 22)
 * Arquitectura de Software: Nexo (Ingeniero Principal / Clan SAPIENSIA)
 * 
 * 🎸 Highway Rítmico de Flechas Flotantes en Tiempo Real (Guitar Hero / DDR Style)
 * 🕺 Coreografía Completa (10 Poses de Orion + 4 Reacciones de Mite + Boss 96x96)
 * 🏛️ Escenografía Dinámica: Ecualizador 32 Bandas + Suelo de Pulso + Reflectores
 * 🎵 Sincronización Zero-Drift a 116 BPM en Sol# Menor con Web Audio API (0 KB)
 * 📜 Sistema Narrativo Transmedia en Tiempo Real (Diálogos de Mite y Orion)
 * ============================================================================
 */

const V_WIDTH = 384;
const V_HEIGHT = 216;
const BPM = 116; // Tempo oficial de Get Down (Backstreet Boys)
const BEAT_DUR = 60 / BPM; // ~0.5172 seg
const BAR_DUR = BEAT_DUR * 4; // ~2.0689 seg

// Fases del Juego
const GAME_PHASES = {
  TITLE: 'TITLE',
  COUNTDOWN_TUTORIAL: 'COUNTDOWN_TUTORIAL',
  PHASE_1_TUTORIAL: 'PHASE_1_TUTORIAL',
  PHASE_1_FAILED: 'PHASE_1_FAILED',
  PHASE_1_RECORDING_REPLAY: 'PHASE_1_RECORDING_REPLAY',
  COUNTDOWN_BOSS: 'COUNTDOWN_BOSS',
  PHASE_2_DUEL: 'PHASE_2_DUEL',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER'
};

// Mapeo de Poses Extendidas de Orion (orion_spritesheet_extended.png - 48x48 px)
const ORION_EXT_FRAMES = {
  MOONWALK: 0,
  HIP_HOP_BOUNCE: 1,
  RUNNING_MAN: 2,
  ROBOT_POPPING: 3,
  SPIN_360: 4,
  FLAIR_POWER: 5,
  HEADSPIN_BURST: 6,
  AIR_GUITAR_RIFLE: 7,
  SLIP_BANANA: 8,
  DIZZY_SPIN: 9
};

// Mapeo de Reacciones Extendidas de Mite (mite_spritesheet_extended.png - 48x48 px)
const MITE_EXT_FRAMES = {
  COMBO_CHEER: 0,
  FACEPALM: 1,
  SUNGLASSES_GROOVE: 2,
  HOLOGRAM_RECORD: 3
};

// Mapeo de Sprites del Centinela Boss (centinela_spritesheet_boss.png - 96x96 px)
const BOSS_FRAMES = {
  IDLE_PULSE: 0,
  LASER_HORIZONTAL: 1,
  SPIRAL_BURST: 2,
  HURT_GLITCH: 3
};

// Definición de Carriles de Flechas (Guitar Hero Highway - 4 Carriles Centrados)
const HIGHWAY_LANES = [
  { id: 'LEFT',  name: 'Izquierda', symbol: '◀', color: '#00E5FF', x: 114 },
  { id: 'DOWN',  name: 'Abajo',     symbol: '▼', color: '#FFE066', x: 156 },
  { id: 'UP',    name: 'Arriba',    symbol: '▲', color: '#00FFAA', x: 198 },
  { id: 'RIGHT', name: 'Derecha',   symbol: '▶', color: '#FF0055', x: 240 }
];

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.phase = GAME_PHASES.TITLE;
    this.audio = window.audioSystem;

    // Carga de Spritesheets y Escenografía de Pix
    this.assets = {
      orionExt: new Image(),
      orionBase: new Image(),
      miteExt: new Image(),
      miteBase: new Image(),
      boss: new Image(),
      bgEqualizer: new Image(),
      floorPulse: new Image(),
      spotlights: new Image(),
      loaded: false
    };
    this._loadAssets();

    // Métricas del juego y barra de Flow (Sobrecarga Especial)
    this.flowMeter = 20; // 0 a 100 (al llegar a 100 habilita el Movimiento Especial)
    this.specialEffectTimer = 0; // Duración de la alteración cromática y descarga de poder
    this.specialShockwaves = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.orionHP = 100;
    this.bossHP = 100;

    // Highway de Flechas (Guitar Hero Stream)
    this.notesStream = [];
    this.receptorY = 175; // Línea receptora de impacto
    this.scrollSpeed = 90; // Velocidad de caída suave y legible en px/seg
    this.sectionName = 'INTRO';
    this.barCount = 0;
    this.totalBarsInPhase = 16;

    // FSM de Animaciones de Orion
    this.orionPose = ORION_EXT_FRAMES.MOONWALK;
    this.orionStumble = false;
    this.orionPoseTimer = 0;
    this.orionTrails = [];

    this.mitePose = MITE_EXT_FRAMES.HOLOGRAM_RECORD;
    this.bossPose = BOSS_FRAMES.IDLE_PULSE;

    // Popups, partículas y diálogos con interlocutor
    this.popups = [];
    this.particles = [];
    this.dialogueSpeaker = 'MITE';
    this.dialogueText = '';
    this.dialogueTimer = 0;
    this.storyFlags = {};

    // Screen shake por trauma
    this.trauma = 0;

    // Cuenta Regresiva (3, 2, 1, ¡FLOW!)
    this.countdownTimer = 0;
    this.lastCountdownBeat = 0;
    this.targetAfterCountdown = null;

    // Tiempos y Coreografía Cinemática de Victoria
    this.lastTime = performance.now();
    this.songStartTime = 0;
    this.victoryTimer = 0;
    this.bossDestroyed = false;
    this.bossExplosionBursts = [];
    this.shockwaves = [];
    this.plasmaNotes = [];
    this.confetti = [];
    this.orionX = 110;
    this.orionY = 135;

    // Receptores interactivos del Highway (4 flechas simétricas)
    this.virtualButtons = [
      { id: 'LEFT',  x: 114, y: 158, w: 32, h: 32, label: '◀', active: false },
      { id: 'DOWN',  x: 156, y: 158, w: 32, h: 32, label: '▼', active: false },
      { id: 'UP',    x: 198, y: 158, w: 32, h: 32, label: '▲', active: false },
      { id: 'RIGHT', x: 240, y: 158, w: 32, h: 32, label: '▶', active: false }
    ];

    this._bindEvents();
    requestAnimationFrame((t) => this.loop(t));
  }

  _loadAssets() {
    let count = 0;
    const total = 8;
    const onLoad = () => {
      count++;
      if (count >= total) this.assets.loaded = true;
    };

    this.assets.orionExt.src = 'assets/orion_spritesheet_extended.png';
    this.assets.orionExt.onload = onLoad;

    this.assets.orionBase.src = 'assets/orion_spritesheet_dance.png';
    this.assets.orionBase.onload = onLoad;

    this.assets.miteExt.src = 'assets/mite_spritesheet_extended.png';
    this.assets.miteExt.onload = onLoad;

    this.assets.miteBase.src = 'assets/mite_spritesheet_dance.png';
    this.assets.miteBase.onload = onLoad;

    this.assets.boss.src = 'assets/centinela_spritesheet_boss.png';
    this.assets.boss.onload = onLoad;

    this.assets.bgEqualizer.src = 'assets/stage_equalizer_bg.png';
    this.assets.bgEqualizer.onload = onLoad;

    this.assets.floorPulse.src = 'assets/stage_tile_floor_pulse.png';
    this.assets.floorPulse.onload = onLoad;

    this.assets.spotlights.src = 'assets/stage_spotlight_lasers.png';
    this.assets.spotlights.onload = onLoad;
  }

  _bindEvents() {
    // Sincronizar estado activo en botones DOM del Pad Táctil
    const setDomBtnActive = (action, isActive) => {
      const btn = document.querySelector(`.touch-btn[data-key="${action}"]`);
      if (btn) {
        if (isActive) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    };

    // Teclado físico
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      if (this.phase === GAME_PHASES.TITLE || this.phase === GAME_PHASES.PHASE_1_FAILED) {
        this.startPhase1Tutorial();
        return;
      }
      if (this.phase === GAME_PHASES.PHASE_1_RECORDING_REPLAY) {
        this.startPhase2Boss();
        return;
      }
      if (this.phase === GAME_PHASES.VICTORY) {
        if (this.victoryTimer >= 5.0) {
          window.dispatchEvent(new CustomEvent('game-victory'));
        }
        return;
      }
      if (this.phase === GAME_PHASES.GAME_OVER) {
        this.phase = GAME_PHASES.TITLE;
        return;
      }

      let action = null;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') action = 'LEFT';
      if (e.code === 'ArrowDown'  || e.code === 'KeyS') action = 'DOWN';
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') action = 'UP';
      if (e.code === 'ArrowRight' || e.code === 'KeyD') action = 'RIGHT';
      if (e.code === 'Space'      || e.code === 'Enter' || e.code === 'KeyE') action = 'SPECIAL';

      if (action) {
        this.handleAction(action);
        const b = this.virtualButtons.find(btn => btn.id === action);
        if (b) b.active = true;
        setDomBtnActive(action, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      let action = null;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') action = 'LEFT';
      if (e.code === 'ArrowDown'  || e.code === 'KeyS') action = 'DOWN';
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') action = 'UP';
      if (e.code === 'ArrowRight' || e.code === 'KeyD') action = 'RIGHT';
      if (e.code === 'Space'      || e.code === 'Enter' || e.code === 'KeyE') action = 'SPECIAL';

      if (action) {
        const b = this.virtualButtons.find(btn => btn.id === action);
        if (b) b.active = false;
        setDomBtnActive(action, false);
      }
    });

    // Enlace de Botones Táctiles del Pad Móvil (Touch / Pointer con Cero Latencia)
    document.querySelectorAll('.touch-btn').forEach(btn => {
      const key = btn.getAttribute('data-key');
      
      const triggerAction = (e) => {
        if (e.cancelable) e.preventDefault();
        this.audio.ensureContext();
        btn.classList.add('active');

        if (this.phase === GAME_PHASES.TITLE || this.phase === GAME_PHASES.PHASE_1_FAILED) {
          this.startPhase1Tutorial();
          return;
        }
        if (this.phase === GAME_PHASES.PHASE_1_RECORDING_REPLAY) {
          this.startPhase2Boss();
          return;
        }
        if (this.phase === GAME_PHASES.VICTORY) {
          if (this.victoryTimer >= 5.0) {
            window.dispatchEvent(new CustomEvent('game-victory'));
          }
          return;
        }
        if (this.phase === GAME_PHASES.GAME_OVER) {
          this.phase = GAME_PHASES.TITLE;
          return;
        }

        if (key) {
          this.handleAction(key);
          const b = this.virtualButtons.find(vb => vb.id === key);
          if (b) b.active = true;
        }
      };

      const releaseAction = (e) => {
        if (e.cancelable) e.preventDefault();
        btn.classList.remove('active');
        if (key) {
          const b = this.virtualButtons.find(vb => vb.id === key);
          if (b) b.active = false;
        }
      };

      btn.addEventListener('pointerdown', triggerAction, { passive: false });
      btn.addEventListener('pointerup', releaseAction, { passive: false });
      btn.addEventListener('pointercancel', releaseAction, { passive: false });
      btn.addEventListener('pointerleave', releaseAction, { passive: false });
    });

    // Toques en el propio Canvas (Fallback complementario)
    const handleTouch = (e, isDown) => {
      if (e.cancelable) e.preventDefault();
      if (this.phase === GAME_PHASES.TITLE || this.phase === GAME_PHASES.PHASE_1_FAILED) {
        this.startPhase1Tutorial();
        return;
      }
      if (this.phase === GAME_PHASES.PHASE_1_RECORDING_REPLAY) {
        this.startPhase2Boss();
        return;
      }
      if (this.phase === GAME_PHASES.VICTORY) {
        if (this.victoryTimer >= 5.0) {
          window.dispatchEvent(new CustomEvent('game-victory'));
        }
        return;
      }
      if (this.phase === GAME_PHASES.GAME_OVER) {
        this.phase = GAME_PHASES.TITLE;
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const scaleX = V_WIDTH / rect.width;
      const scaleY = V_HEIGHT / rect.height;

      for (let t of e.changedTouches) {
        const touchX = (t.clientX - rect.left) * scaleX;
        const touchY = (t.clientY - rect.top) * scaleY;

        for (let btn of this.virtualButtons) {
          if (touchX >= btn.x && touchX <= btn.x + btn.w &&
              touchY >= btn.y && touchY <= btn.y + btn.h) {
            btn.active = isDown;
            setDomBtnActive(btn.id, isDown);
            if (isDown) this.handleAction(btn.id);
          }
        }
      }
    };

    this.canvas.addEventListener('touchstart', (e) => handleTouch(e, true), { passive: false });
    this.canvas.addEventListener('touchend', (e) => handleTouch(e, false), { passive: false });
  }

  // Inicio de Cuenta Regresiva 3, 2, 1, ¡FLOW!
  startCountdown(targetPhase) {
    this.targetAfterCountdown = targetPhase;
    this.phase = (targetPhase === GAME_PHASES.PHASE_1_TUTORIAL) ? GAME_PHASES.COUNTDOWN_TUTORIAL : GAME_PHASES.COUNTDOWN_BOSS;
    this.countdownTimer = 2.4; // 2.4s: 2.4->1.8 (3), 1.8->1.2 (2), 1.2->0.6 (1), 0.6->0.0 (¡FLOW!)
    this.lastCountdownBeat = 4;
    this.audio.ensureContext();
    this.audio.stopMusic();

    const modal = document.getElementById('hud-phase-modal');
    if (modal) modal.style.display = 'none';
    const vicCard = document.getElementById('hud-victory-card');
    if (vicCard) vicCard.style.display = 'none';
    const popupCont = document.getElementById('hud-popup-container');
    if (popupCont) popupCont.innerHTML = '';
    
    const countdownOverlay = document.getElementById('hud-countdown-overlay');
    if (countdownOverlay) countdownOverlay.style.display = 'flex';

    this.updateCountdownDisplay('3', '¡PREPÁRATE!');
    if (this.audio.playCountdownBeat) this.audio.playCountdownBeat(1);
  }

  updateCountdownDisplay(text, subtitle) {
    const numEl = document.getElementById('countdown-number');
    const subEl = document.getElementById('countdown-sub');
    if (numEl) {
      numEl.textContent = text;
      const box = numEl.closest('.countdown-box');
      if (box) {
        box.style.animation = 'none';
        void box.offsetWidth;
        box.style.animation = 'countdown-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }
    }
    if (subEl && subtitle) subEl.textContent = subtitle;
  }

  startPhase1Tutorial() {
    this.startCountdown(GAME_PHASES.PHASE_1_TUTORIAL);
  }

  startPhase2Boss() {
    this.startCountdown(GAME_PHASES.PHASE_2_DUEL);
  }

  actuallyStartTutorial() {
    try {
      this.phase = GAME_PHASES.PHASE_1_TUTORIAL;
      this.audio.mode = 'TUTORIAL';
      this.audio.stopMusic();
      this.audio.startMusic();
      this.songStartTime = (this.audio.ctx && this.audio.ctx.currentTime > 0) ? (this.audio.ctx.currentTime + 0.05) : (performance.now() / 1000);
      this.gameSongTime = 0;
      this.barCount = 0;
      this.totalBarsInPhase = 16;
      this.orionHP = 100;
      this.bossHP = 100;
      this.flowMeter = 20;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.storyFlags = {};
      this.victoryTimer = 0;
      this.bossDestroyed = false;
      this.generateTutorialNotesStream(16);
      this.mitePose = MITE_EXT_FRAMES.HOLOGRAM_RECORD;
      this.setDialogue('MITE', '¡Cámara "● REC" activada! ¡Muévete al compás de las flechas!', 3.0);
    } catch (err) {
      console.error('Error al iniciar tutorial:', err);
    } finally {
      const countdownOverlay = document.getElementById('hud-countdown-overlay');
      if (countdownOverlay) countdownOverlay.style.display = 'none';
    }
  }

  actuallyStartBoss() {
    try {
      this.phase = GAME_PHASES.PHASE_2_DUEL;
      this.audio.mode = 'BOSS_DUEL';
      this.audio.stopMusic();
      this.audio.startMusic();
      this.songStartTime = (this.audio.ctx && this.audio.ctx.currentTime > 0) ? (this.audio.ctx.currentTime + 0.05) : (performance.now() / 1000);
      this.gameSongTime = 0;
      this.bossHP = 100;
      this.orionHP = 100;
      this.barCount = 0;
      this.totalBarsInPhase = 32;
      this.combo = 0;
      this.storyFlags = {};
      this.victoryTimer = 0;
      this.bossDestroyed = false;
      this.generateBossNotesStream(32);
      this.mitePose = MITE_EXT_FRAMES.COMBO_CHEER;
      this.setDialogue('CENTINELA', 'ANOMALÍA DETECTADA. BARRIDO LÁSER EN CURSO.', 3.0);
    } catch (err) {
      console.error('Error al iniciar boss duel:', err);
    } finally {
      const countdownOverlay = document.getElementById('hud-countdown-overlay');
      if (countdownOverlay) countdownOverlay.style.display = 'none';
    }
  }

  // Generar notas para el Tutorial Progresivo (16 Compases con Lead-in suave - 4 Flechas)
  generateTutorialNotesStream(numBars) {
    this.notesStream = [];
    const arrowKeys = ['LEFT', 'DOWN', 'UP', 'RIGHT'];

    for (let bar = 0; bar < numBars; bar++) {
      const barStartTime = bar * BAR_DUR;

      if (bar === 0) {
        // Compás 0: Lead-in de orientación (flechas en tiempos 2 y 3 para que bajen desde arriba)
        this.notesStream.push({ lane: 'LEFT', targetTime: barStartTime + (2 * BEAT_DUR), hit: false, missed: false });
        this.notesStream.push({ lane: 'DOWN', targetTime: barStartTime + (3 * BEAT_DUR), hit: false, missed: false });
      } else if (bar < 4) {
        // Compases 1-3: Introducción básica (1 flecha en tiempos 0 y 2)
        const laneA = arrowKeys[bar % 4];
        const laneB = arrowKeys[(bar + 2) % 4];
        this.notesStream.push({ lane: laneA, targetTime: barStartTime + (0 * BEAT_DUR), hit: false, missed: false });
        this.notesStream.push({ lane: laneB, targetTime: barStartTime + (2 * BEAT_DUR), hit: false, missed: false });
      } else if (bar < 8) {
        // Compases 4-7: Ritmo dinámico de 3 flechas sincopadas
        const laneA = arrowKeys[Math.floor(Math.random() * 4)];
        const laneB = arrowKeys[Math.floor(Math.random() * 4)];
        const laneC = arrowKeys[Math.floor(Math.random() * 4)];
        this.notesStream.push({ lane: laneA, targetTime: barStartTime + (0 * BEAT_DUR), hit: false, missed: false });
        this.notesStream.push({ lane: laneB, targetTime: barStartTime + (1 * BEAT_DUR), hit: false, missed: false });
        this.notesStream.push({ lane: laneC, targetTime: barStartTime + (2 * BEAT_DUR), hit: false, missed: false });
      } else {
        // Compases 8-15: Grabación completa de Mite (3 a 4 notas de coreografía completa)
        for (let beat = 0; beat < 4; beat++) {
          if (beat === 3 && Math.random() < 0.3) continue; // Variación rítmica sutil
          const laneId = arrowKeys[Math.floor(Math.random() * 4)];
          this.notesStream.push({ lane: laneId, targetTime: barStartTime + (beat * BEAT_DUR), hit: false, missed: false });
        }
      }
    }
  }

  // Generar notas para la Batalla de 32 Compases contra el Centinela (4 Flechas)
  generateBossNotesStream(numBars) {
    this.notesStream = [];
    const arrowKeys = ['LEFT', 'DOWN', 'UP', 'RIGHT'];

    for (let bar = 0; bar < numBars; bar++) {
      const barStartTime = bar * BAR_DUR;
      const isChorus = (bar >= 4 && bar <= 11) || (bar >= 20 && bar <= 27);

      if (isChorus) {
        // Coro: Cadencia enérgica de 4 notas por compás
        for (let beat = 0; beat < 4; beat++) {
          const laneId = arrowKeys[Math.floor(Math.random() * 4)];
          this.notesStream.push({ lane: laneId, targetTime: barStartTime + (beat * BEAT_DUR), hit: false, missed: false });
        }
      } else {
        // Versos y solos: 3 notas con síncopa funk
        for (let beat = 0; beat < 4; beat++) {
          if (beat === 1 && bar % 2 === 0) continue;
          const laneId = arrowKeys[Math.floor(Math.random() * 4)];
          this.notesStream.push({ lane: laneId, targetTime: barStartTime + (beat * BEAT_DUR), hit: false, missed: false });
        }
      }
    }
  }

  setDialogue(speaker, text, duration = 4.2) {
    this.dialogueSpeaker = speaker;
    this.dialogueText = text;
    this.dialogueTimer = duration;
  }

  // Eventos Narrativos de Medio de Misión (Diálogos del Capítulo 22)
  updateNarrativeEvents(currentBar) {
    if (this.phase === GAME_PHASES.PHASE_1_TUTORIAL) {
      if (currentBar === 1 && !this.storyFlags['tut_1']) {
        this.storyFlags['tut_1'] = true;
        this.setDialogue('MITE', '¡Cámara "● REC" activada! ¡Muévete al compás de las flechas!');
      } else if (currentBar === 4 && !this.storyFlags['tut_4']) {
        this.storyFlags['tut_4'] = true;
        this.setDialogue('ORION', '¿En serio tengo que bailar así? ¡Siento que las cámaras se burlan!');
      } else if (currentBar === 7 && !this.storyFlags['tut_7']) {
        this.storyFlags['tut_7'] = true;
        this.setDialogue('MITE', '¡No se burlan, Orion! ¡Están asombrados por el Flow de 1996!');
      } else if (currentBar === 11 && !this.storyFlags['tut_11']) {
        this.storyFlags['tut_11'] = true;
        this.setDialogue('ORION', '¡Si este video llega a la resistencia, juro que borro mi memoria!');
      } else if (currentBar === 14 && !this.storyFlags['tut_14']) {
        this.storyFlags['tut_14'] = true;
        this.setDialogue('MITE', '¡Demasiado tarde, Bytestreet Boy! ¡El Cortafuegos está al 80%!');
      }
    } else if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
      if (currentBar === 1 && !this.storyFlags['boss_1']) {
        this.storyFlags['boss_1'] = true;
        this.setDialogue('CENTINELA', 'ANOMALÍA ORGÁNICA DETECTADA. PATRÓN DE BAILE NO CATALOGADO.');
      } else if (currentBar === 5 && !this.storyFlags['boss_5']) {
        this.storyFlags['boss_5'] = true;
        this.setDialogue('ORION', '¡Sus láseres intentan predecirme, pero no pueden leer mi ritmo!');
      } else if (currentBar === 10 && !this.storyFlags['boss_10']) {
        this.storyFlags['boss_10'] = true;
        this.setDialogue('MITE', '¡Ding-Pum! ¡El bajo slap le está sobrecalentando los disipadores!');
      } else if (currentBar === 16 && !this.storyFlags['boss_16']) {
        this.storyFlags['boss_16'] = true;
        this.setDialogue('CENTINELA', 'ALERTA: DISPERSIÓN DE FRECUENCIA AL 60%. INICIANDO PURGA.');
      } else if (currentBar === 22 && !this.storyFlags['boss_22']) {
        this.storyFlags['boss_22'] = true;
        this.setDialogue('ORION', '¡Mite, enfoca bien! ¡Vamos a rematar esto con la sobrecarga!');
      } else if (currentBar === 27 && !this.storyFlags['boss_27']) {
        this.storyFlags['boss_27'] = true;
        this.setDialogue('MITE', '¡Las pantallas del Coliseo transmiten tu baile a toda la red!');
      }
    }
  }

  // Activación de Movimiento Especial / Sobrecarga de Flow al 100%
  triggerSpecialOverdrive() {
    if (this.flowMeter < 100) {
      this.spawnPopup(`⚡ FLOW AL ${Math.floor(this.flowMeter)}% (NECESITAS 100%)`, '#FFE066', '#00E5FF');
      return;
    }

    // 1. Consumir la barra de Flow para reiniciar el ciclo de carga
    this.flowMeter = 0;
    this.specialEffectTimer = 2.4; // 2.4s de alteración cromática y descarga estroboscópica
    this.trauma = 0.45;

    // 2. Audio procedural de sobrecarga funk cuántica
    if (this.audio.playSpecialOverdrive) {
      this.audio.playSpecialOverdrive();
    }

    // 3. Pose emblemática de Orion y reacción de Mite
    this.orionPose = ORION_EXT_FRAMES.AIR_GUITAR_RIFLE;
    this.orionPoseTimer = 2.4;
    this.orionStumble = false;
    this.mitePose = MITE_EXT_FRAMES.SUNGLASSES_GROOVE;

    // 4. Ondas de choque psicodélicas y partículas expansivas
    this.emitSpecialOverdriveBursts(110, 135);

    // 5. Daño masivo al Boss o bonificación crítica en Tutorial
    if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
      this.bossHP = Math.max(0, this.bossHP - 25);
      this.bossPose = BOSS_FRAMES.HURT_GLITCH;
      this.emitParticles(275, 110, '#FFE066', 30);
      this.emitParticles(275, 110, '#00E5FF', 30);
      this.emitParticles(275, 110, '#FF0055', 30);
      this.setDialogue('MITE', '¡SOBRECARGA SÓNICA! ¡Centinela impactado por 25% de daño!', 4.0);
    } else {
      this.score += 2500;
      this.combo += 10;
      this.setDialogue('MITE', '¡DESCARGA DE FLOW TOTAL! ¡El Cortafuegos está al límite!', 4.0);
    }

    this.spawnPopup("⚡ ¡DESCARGA SÓNICA! ¡FLOW OVERDRIVE! ⚡", "#FFE066", "#FF0055");
  }

  emitSpecialOverdriveBursts(x, y) {
    // Ondas expansivas concéntricas de colores
    const colors = ['#00E5FF', '#FFE066', '#FF0055', '#00FFAA', '#FFFFFF'];
    colors.forEach((c, idx) => {
      this.specialShockwaves.push({
        x: x,
        y: y,
        radius: 10 + idx * 8,
        vr: 180 + idx * 40,
        alpha: 1.0,
        color: c
      });
    });

    // Ráfaga de partículas multicolor
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 120 + 30;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.2,
        maxLife: 1.2
      });
    }
  }

  handleAction(action) {
    if (action === 'SPECIAL') {
      this.triggerSpecialOverdrive();
      return;
    }

    const songTime = this.gameSongTime || 0;
    
    // Ventana de juicio generosa (±220 ms) en las 4 flechas
    const candidate = this.notesStream.find(n => 
      n.lane === action && 
      !n.hit && !n.missed && 
      Math.abs(songTime - n.targetTime) <= 0.220
    );

    if (candidate) {
      const diffMs = Math.abs(songTime - candidate.targetTime) * 1000;
      candidate.hit = true;

      // 1. ACTIVACIÓN INMEDIATA DEL PASO DE BAILE SEGÚN LA FLECHA PULSADA
      if (action === 'LEFT') {
        this.orionPose = (Math.random() < 0.5) ? ORION_EXT_FRAMES.MOONWALK : ORION_EXT_FRAMES.RUNNING_MAN;
      } else if (action === 'DOWN') {
        this.orionPose = ORION_EXT_FRAMES.FLAIR_POWER;
      } else if (action === 'UP') {
        this.orionPose = (Math.random() < 0.5) ? ORION_EXT_FRAMES.ROBOT_POPPING : ORION_EXT_FRAMES.HEADSPIN_BURST;
      } else if (action === 'RIGHT') {
        this.orionPose = (Math.random() < 0.5) ? ORION_EXT_FRAMES.SPIN_360 : ORION_EXT_FRAMES.HIP_HOP_BOUNCE;
      }

      this.orionPoseTimer = BEAT_DUR * 1.6;
      this.orionStumble = false;

      // Partículas y estela holográfica de baile
      const laneObj = HIGHWAY_LANES.find(l => l.id === action);
      const color = laneObj ? laneObj.color : '#00E5FF';
      this.emitParticles(110, 145, color, 12);
      this.orionTrails.unshift({ x: 110, y: 135, frame: this.orionPose, alpha: 0.85 });

      // 2. EVALUAR PRECISIÓN, CARGA DE FLOW Y SCORE
      if (diffMs <= 75) {
        // EXCELENTE / PERFECT
        this.audio.playPerfectHit();
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 1000 * (this.combo > 5 ? 2 : 1);
        this.flowMeter = Math.min(100, this.flowMeter + 10);
        this.trauma += 0.08;
        this.spawnPopup("¡DING-PUM! ¡FLOW CARÍSIMO!", "#FFE066", "#00E5FF");
        this.mitePose = (this.combo >= 4) ? MITE_EXT_FRAMES.SUNGLASSES_GROOVE : MITE_EXT_FRAMES.COMBO_CHEER;

        if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
          this.bossHP = Math.max(0, this.bossHP - 3.5);
          this.bossPose = BOSS_FRAMES.HURT_GLITCH;
          this.emitParticles(275, 110, '#00E5FF', 14);
        }
      } else if (diffMs <= 155) {
        // BIEN / GREAT
        this.audio.playGoodHit();
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 600;
        this.flowMeter = Math.min(100, this.flowMeter + 6);
        this.trauma += 0.04;
        this.spawnPopup("¡BUEN RITMO!", "#00FFAA", "#008855");
        this.mitePose = MITE_EXT_FRAMES.COMBO_CHEER;

        if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
          this.bossHP = Math.max(0, this.bossHP - 2.0);
          this.emitParticles(275, 110, '#00FFAA', 8);
        }
      } else {
        // OK / GOOD
        this.audio.playGoodHit();
        this.score += 300;
        this.flowMeter = Math.min(100, this.flowMeter + 3);
        this.spawnPopup("¡A TIEMPO!", "#00E5FF", "#004488");

        if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
          this.bossHP = Math.max(0, this.bossHP - 1.0);
        }
      }

      // Notificación especial al llenar la barra al 100%
      if (this.flowMeter >= 100 && !this.storyFlags['flow_100_notified']) {
        this.storyFlags['flow_100_notified'] = true;
        this.spawnPopup("⚡ ¡FLOW AL 100%! ¡DESATA EL MOVIMIENTO ESPECIAL! ⚡", "#FFE066", "#FF0055");
      }
    }
  }

  // Popups Flotantes en Alta Definición Vectorial
  spawnPopup(text, color, glow) {
    const container = document.getElementById('hud-popup-container');
    if (!container) return;

    const badge = document.createElement('div');
    badge.className = 'hud-popup-badge';
    badge.textContent = text;
    badge.style.color = color;
    badge.style.border = `1.5px solid ${color}`;
    badge.style.background = 'rgba(6, 12, 24, 0.92)';
    badge.style.boxShadow = `0 0 12px ${color}`;
    badge.style.marginBottom = '6px';
    container.appendChild(badge);

    setTimeout(() => {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    }, 850);
  }

  emitParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        size: Math.random() * 3 + 1,
        color: color,
        life: 0.6,
        maxLife: 0.6
      });
    }
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Control de Cuenta Regresiva (3, 2, 1, ¡FLOW!)
    if (this.phase === GAME_PHASES.COUNTDOWN_TUTORIAL || this.phase === GAME_PHASES.COUNTDOWN_BOSS) {
      this.countdownTimer -= dt;
      if (this.countdownTimer > 1.8) {
        if (this.lastCountdownBeat > 3) {
          this.lastCountdownBeat = 3;
          this.updateCountdownDisplay('3', '¡PREPÁRATE!');
          if (this.audio.playCountdownBeat) this.audio.playCountdownBeat(1);
        }
      } else if (this.countdownTimer > 1.2) {
        if (this.lastCountdownBeat > 2) {
          this.lastCountdownBeat = 2;
          this.updateCountdownDisplay('2', '¡AL RITMO!');
          if (this.audio.playCountdownBeat) this.audio.playCountdownBeat(2);
        }
      } else if (this.countdownTimer > 0.6) {
        if (this.lastCountdownBeat > 1) {
          this.lastCountdownBeat = 1;
          this.updateCountdownDisplay('1', '¡ATENTO!');
          if (this.audio.playCountdownBeat) this.audio.playCountdownBeat(3);
        }
      } else if (this.countdownTimer > 0.0) {
        if (this.lastCountdownBeat > 0) {
          this.lastCountdownBeat = 0;
          this.updateCountdownDisplay('¡FLOW!', '¡A BAILAR!');
          if (this.audio.playCountdownBeat) this.audio.playCountdownBeat(4);
        }
      } else {
        // Fin de cuenta regresiva -> Lanzar juego
        const target = this.targetAfterCountdown;
        if (target === GAME_PHASES.PHASE_1_TUTORIAL) {
          this.actuallyStartTutorial();
        } else {
          this.actuallyStartBoss();
        }
      }

      this.render(0, 0);
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    // Calcular songTime robusto (sincronizado a Web Audio con fallback a reloj de juego)
    this.gameSongTime = (this.gameSongTime || 0) + dt;
    let songTime = this.gameSongTime;
    if (this.audio.ctx && this.audio.ctx.state === 'running' && this.audio.ctx.currentTime > this.songStartTime) {
      songTime = this.audio.ctx.currentTime - this.songStartTime;
      this.gameSongTime = songTime;
    }
    const beatPhase = (songTime / BEAT_DUR) % 1;

    // Actualizaciones de tiempo y Sobrecarga Especial
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 2.0);
    if (this.dialogueTimer > 0) this.dialogueTimer -= dt;
    if (this.specialEffectTimer > 0) this.specialEffectTimer -= dt;

    // Actualizar ondas de choque psicodélicas del movimiento especial
    for (let sw of this.specialShockwaves) {
      sw.radius += sw.vr * dt;
      sw.alpha -= dt * 0.9;
    }
    this.specialShockwaves = this.specialShockwaves.filter(sw => sw.alpha > 0);

    if (this.orionPoseTimer > 0) {
      this.orionPoseTimer -= dt;
      if (this.orionPoseTimer <= 0 && this.phase !== GAME_PHASES.VICTORY) {
        this.orionStumble = false;
        if (this.phase === GAME_PHASES.PHASE_1_TUTORIAL) {
          this.mitePose = MITE_EXT_FRAMES.HOLOGRAM_RECORD;
        } else {
          this.mitePose = MITE_EXT_FRAMES.COMBO_CHEER;
          this.bossPose = BOSS_FRAMES.IDLE_PULSE;
        }
      }
    }

    // Comprobar notas perdidas en el Highway (margen de 240 ms)
    for (let note of this.notesStream) {
      if (!note.hit && !note.missed) {
        if (songTime - note.targetTime > 0.240) {
          note.missed = true;
          this.handleMiss();
        }
      }
    }

    // Estelas Holográficas en acrobacias y sobrecarga
    if (this.orionPose === ORION_EXT_FRAMES.FLAIR_POWER || 
        this.orionPose === ORION_EXT_FRAMES.HEADSPIN_BURST || 
        this.orionPose === ORION_EXT_FRAMES.AIR_GUITAR_RIFLE ||
        this.specialEffectTimer > 0) {
      this.orionTrails.unshift({ x: this.orionX || 110, y: this.orionY || 135, frame: this.orionPose, alpha: 0.85 });
      if (this.orionTrails.length > 6) this.orionTrails.pop();
    }
    for (let tr of this.orionTrails) tr.alpha -= dt * 3.0;
    this.orionTrails = this.orionTrails.filter(tr => tr.alpha > 0);

    // Actualizar Partículas
    for (let pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter(pt => pt.life > 0);

    // Control de avance de compases y eventos narrativos
    this.barCount = Math.floor(songTime / BAR_DUR);
    this.updateNarrativeEvents(this.barCount);

    // Verificar transiciones de fase
    if (this.phase === GAME_PHASES.PHASE_1_TUTORIAL && this.barCount >= this.totalBarsInPhase) {
      if (this.flowMeter >= 35 || this.score >= 2500) {
        // Tutorial completado exitosamente
        this.phase = GAME_PHASES.PHASE_1_RECORDING_REPLAY;
        this.mitePose = MITE_EXT_FRAMES.SUNGLASSES_GROOVE;
        this.setDialogue('MITE', '¡Ding-Pum! ¡Secuencia grabada! El cortafuegos ha colapsado.');
      } else {
        // Tutorial fallido por falta de sincronización
        this.phase = GAME_PHASES.PHASE_1_FAILED;
        this.mitePose = MITE_EXT_FRAMES.FACEPALM;
        this.setDialogue('MITE', '¡Sincronización insuficiente! Necesitas más flow para abrir el cortafuegos.');
      }
    }

    if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
      if (this.bossHP <= 0 || this.barCount >= this.totalBarsInPhase) {
        this.triggerVictorySequence();
      } else if (this.orionHP <= 0) {
        this.phase = GAME_PHASES.GAME_OVER;
        this.setDialogue('CENTINELA', 'ORION DERRIBADO. EL ALGORITMO PREDICHO ANIQUILÓ LA RESISTENCIA.');
      }
    }

    // Actualizar coreografía automática de victoria si estamos en fase VICTORY
    if (this.phase === GAME_PHASES.VICTORY) {
      this.updateVictorySequence(dt, songTime);
    }

    // Actualizar HUD Vectorial DOM en Alta Definición
    this.updateDOMHUD(songTime);

    this.render(beatPhase, songTime);
    requestAnimationFrame((t) => this.loop(t));
  }

  // Actualización de la Capa de HUD Vectorial en Alta Definición
  updateDOMHUD(songTime) {
    const flowFill = document.getElementById('hud-flow-fill');
    const flowVal = document.getElementById('hud-flow-val');
    const scoreVal = document.getElementById('hud-score-val');
    const comboVal = document.getElementById('hud-combo-val');
    const barVal = document.getElementById('hud-bar-val');
    const bossBox = document.getElementById('hud-boss-box');
    const bossFill = document.getElementById('hud-boss-fill');
    const bossVal = document.getElementById('hud-boss-val');
    const speakerBadge = document.getElementById('hud-speaker-badge');
    const dialogueContent = document.getElementById('hud-dialogue-content');
    const victoryCard = document.getElementById('hud-victory-card');
    const topBar = document.getElementById('hud-top-bar');
    const phaseModal = document.getElementById('hud-phase-modal');
    const modalTitle = document.getElementById('hud-modal-title');
    const modalDesc = document.getElementById('hud-modal-desc');
    const modalBtn = document.getElementById('hud-modal-btn');

    const flowPercent = Math.min(100, Math.floor(this.flowMeter));
    if (flowFill) {
      flowFill.style.width = `${flowPercent}%`;
      if (flowPercent >= 100) flowFill.classList.add('full-flow');
      else flowFill.classList.remove('full-flow');
    }
    if (flowVal) flowVal.textContent = `${flowPercent}%`;
    if (scoreVal) scoreVal.textContent = `SCORE: ${this.score}`;
    if (comboVal) comboVal.textContent = `COMBO: x${this.combo}`;
    if (barVal) barVal.textContent = `COMPÁS: ${this.barCount}/${this.totalBarsInPhase}`;

    // Sincronización del Botón de Movimiento Especial del Pad Táctil
    const specialBtn = document.getElementById('btn-special-move');
    const specialTitle = document.getElementById('special-btn-title');
    const specialSub = document.getElementById('special-btn-sub');
    const specialProgress = document.getElementById('special-btn-progress');

    if (specialBtn && specialTitle && specialSub) {
      if (flowPercent >= 100) {
        specialBtn.classList.add('ready');
        specialTitle.textContent = '⚡ ¡DESCARGA SÓNICA! [LISTO]';
        specialSub.textContent = 'TOCA O [ESPACIO] PARA ACTIVAR SOBRECARGA';
      } else {
        specialBtn.classList.remove('ready');
        specialTitle.textContent = `DESCARGA SÓNICA • [ ${flowPercent}% ]`;
        specialSub.textContent = 'LLENA LA BARRA DE FLOW PARA DESATAR';
      }
    }
    if (specialProgress) {
      specialProgress.style.width = `${flowPercent}%`;
    }

    // Boss Bar
    if (bossBox) {
      if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
        bossBox.style.display = 'flex';
        if (bossFill) bossFill.style.width = `${Math.max(0, Math.floor(this.bossHP))}%`;
        if (bossVal) bossVal.textContent = `${Math.max(0, Math.floor(this.bossHP))}%`;
      } else {
        bossBox.style.display = 'none';
      }
    }

    // Diálogos Narrativos Dinámicos (Monitor Exterior de Transmisión)
    const speakerBadge = document.getElementById('hud-speaker-badge');
    const dialogueContent = document.getElementById('hud-dialogue-content');
    if (speakerBadge && dialogueContent) {
      if (this.dialogueTimer > 0) {
        speakerBadge.textContent = `${this.dialogueSpeaker} // TRANSMISIÓN`;
        speakerBadge.className = this.dialogueSpeaker === 'ORION' ? 'speaker-orion' : (this.dialogueSpeaker === 'MITE' ? 'speaker-mite' : 'speaker-centinela');
        dialogueContent.textContent = this.dialogueText;
      } else {
        speakerBadge.textContent = 'MITE // FRECUENCIA';
        speakerBadge.className = 'speaker-mite';
        dialogueContent.textContent = 'Sincronización activa a 116 BPM. ¡Pisa las flechas en el receptor!';
      }
    }

    // Modal de Fase (Replay / Tutorial Fallido / Game Over)
    if (phaseModal && modalTitle && modalDesc && modalBtn) {
      if (this.phase === GAME_PHASES.PHASE_1_RECORDING_REPLAY) {
        phaseModal.style.display = 'block';
        modalTitle.textContent = '« EL BYTESTREET BOY DE LA RESISTENCIA »';
        modalTitle.style.color = 'var(--neon-pink)';
        modalDesc.innerHTML = 'Mite ha grabado tu secuencia de baile a 116 BPM y la transmite al Coliseo.<br>El <strong>Cortafuegos Cinético</strong> ha sido desbloqueado.';
        modalBtn.textContent = '[ ENFRENTAR AL CENTINELA ]';
        modalBtn.onclick = () => { phaseModal.style.display = 'none'; this.startPhase2Boss(); };
      } else if (this.phase === GAME_PHASES.PHASE_1_FAILED) {
        phaseModal.style.display = 'block';
        modalTitle.textContent = 'ENTRENAMIENTO INCOMPLETO';
        modalTitle.style.color = 'var(--neon-pink)';
        modalDesc.innerHTML = `Flow final: <strong>${Math.floor(this.flowMeter)}%</strong> (Mínimo: 35%).<br>Mite no pudo sincronizar tus pasos. Necesitas más ritmo para abrir el Cortafuegos.`;
        modalBtn.textContent = '[ REPETIR TUTORIAL ]';
        modalBtn.onclick = () => { phaseModal.style.display = 'none'; this.startPhase1Tutorial(); };
      } else if (this.phase === GAME_PHASES.GAME_OVER) {
        phaseModal.style.display = 'block';
        modalTitle.textContent = 'ANOMALÍA RECALIBRADA — GAME OVER';
        modalTitle.style.color = '#ef4444';
        modalDesc.innerHTML = 'El ritmo no fue suficiente para evadir la dispersión de frecuencia del Centinela.';
        modalBtn.textContent = '[ REINTENTAR MISIÓN ]';
        modalBtn.onclick = () => { phaseModal.style.display = 'none'; this.startPhase2Boss(); };
      } else {
        phaseModal.style.display = 'none';
      }
    }

    // Tarjeta de Victoria en Alta Resolución
    if (victoryCard && topBar) {
      if (this.phase === GAME_PHASES.VICTORY) {
        topBar.style.display = 'none';
        if (this.victoryTimer >= 4.0) {
          victoryCard.style.display = 'block';
          const vicScore = document.getElementById('vic-score-val');
          const vicCombo = document.getElementById('vic-combo-val');
          const vicRank = document.getElementById('vic-rank-val');
          const vicBtn = document.getElementById('vic-btn-continue');

          if (vicScore) vicScore.textContent = `SCORE: ${this.score} PTS`;
          if (vicCombo) vicCombo.textContent = `MAX COMBO: x${this.maxCombo}`;
          if (vicRank) {
            const isRankS = this.score >= 12000;
            const isRankA = this.score >= 8000;
            vicRank.textContent = isRankS ? "RANGO S: ¡FLOW CARÍSIMO!" : (isRankA ? "RANGO A: ¡BUEN RITMO!" : "RANGO B: CALIBRADO");
            vicRank.className = isRankS ? "rank-s" : (isRankA ? "highlight-cyan" : "highlight-gold");
          }
          if (vicBtn) {
            vicBtn.onclick = () => {
              window.dispatchEvent(new CustomEvent('game-victory'));
            };
          }
        }
      } else {
        topBar.style.display = 'flex';
        victoryCard.style.display = 'none';
      }
    }
  }

  triggerVictorySequence() {
    this.phase = GAME_PHASES.VICTORY;
    this.notesStream = []; // Detener y despejar inmediatamente las flechas del Highway
    this.victoryTimer = 0;
    this.bossHP = 0;
    this.bossDestroyed = false;
    this.bossExplosionBursts = [];
    this.shockwaves = [];
    this.plasmaNotes = [];
    this.confetti = [];
    this.orionX = 110;
    this.orionY = 136;
    this.storyFlags['vic_1'] = false;
    this.storyFlags['vic_2'] = false;
    this.storyFlags['vic_3'] = false;
    this.storyFlags['vic_4'] = false;

    // Generar confeti festivo inicial
    for (let i = 0; i < 45; i++) {
      this.confetti.push({
        x: Math.random() * V_WIDTH,
        y: Math.random() * -V_HEIGHT,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * 35 + 25,
        size: Math.random() * 3 + 1.5,
        color: ['#00E5FF', '#FFE066', '#FF0055', '#00FFAA', '#FFFFFF'][Math.floor(Math.random() * 5)],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 4
      });
    }

    this.audio.playVictoryFanfare();
    this.setDialogue('MITE', '¡CENTINELA EN JAQUE! ¡MIRA EL BREAKDANCE DE ORION!', 4.0);
  }

  // Coreografía Automática de Victoria: 5 Actos de Baile + Destrucción del Centinela
  updateVictorySequence(dt, songTime) {
    this.victoryTimer += dt;
    const t = this.victoryTimer;

    // 1. Actualizar lluvia de confeti
    for (let c of this.confetti) {
      c.x += c.vx * dt + Math.sin(t * 3 + c.rot) * 0.35;
      c.y += c.vy * dt;
      c.rot += c.vRot * dt;
      if (c.y > V_HEIGHT + 10) {
        c.y = -10;
        c.x = Math.random() * V_WIDTH;
      }
    }

    // 2. Actualizar ondas de choque sónicas horizontales
    for (let sw of this.shockwaves) {
      sw.x += sw.vx * dt;
      sw.radius += sw.vr * dt;
      sw.alpha -= dt * 1.4;
    }
    this.shockwaves = this.shockwaves.filter(sw => sw.alpha > 0);

    // 3. Actualizar notas de plasma musical
    for (let pn of this.plasmaNotes) {
      pn.x += pn.vx * dt;
      pn.y += pn.vy * dt;
      pn.life -= dt;
    }
    this.plasmaNotes = this.plasmaNotes.filter(pn => pn.life > 0);

    // 4. Actualizar fragmentos de explosión de luz sólida del Centinela
    for (let ep of this.bossExplosionBursts) {
      ep.x += ep.vx * dt;
      ep.y += ep.vy * dt;
      ep.rot += ep.vRot * dt;
      ep.alpha -= dt * 0.75;
    }
    this.bossExplosionBursts = this.bossExplosionBursts.filter(ep => ep.alpha > 0);

    // =========================================================================
    // SECUENCIA COREOGRÁFICA PASO A PASO (SINCRONIZADA A 116 BPM)
    // =========================================================================

    // ACTO 1: Deslizamiento Moonwalk & Running Man hacia el centro (0.0s - 3.2s)
    if (t < 3.2) {
      const progress = Math.min(1.0, t / 3.0);
      this.orionX = 110 + progress * 70; // Desplazamiento continuo de 110 a 180
      this.orionY = 136;

      const beatCycle = Math.floor(t / BEAT_DUR) % 2;
      this.orionPose = (beatCycle === 0) ? ORION_EXT_FRAMES.MOONWALK : ORION_EXT_FRAMES.RUNNING_MAN;

      if (Math.random() < 0.35) {
        this.orionTrails.unshift({ x: this.orionX, y: this.orionY, frame: this.orionPose, alpha: 0.85 });
      }

      this.mitePose = MITE_EXT_FRAMES.HOLOGRAM_RECORD;
      this.bossPose = BOSS_FRAMES.HURT_GLITCH;

      if (t >= 1.0 && !this.storyFlags['vic_1']) {
        this.storyFlags['vic_1'] = true;
        this.setDialogue('ORION', '¡Observa bien, Centinela! ¡Así se bailaba en 1996!');
      }
    }
    // ACTO 2: Robot Popping & Spin 360 en el centro del escenario (3.2s - 6.4s)
    else if (t < 6.4) {
      this.orionX = 180;
      this.orionY = 136;
      const subT = t - 3.2;

      if (subT < 1.6) {
        this.orionPose = ORION_EXT_FRAMES.ROBOT_POPPING;
        if (Math.random() < 0.25) {
          this.emitParticles(this.orionX, this.orionY, '#00E5FF', 5);
        }
      } else {
        this.orionPose = ORION_EXT_FRAMES.SPIN_360;
        if (Math.random() < 0.45) {
          this.emitParticles(this.orionX, this.orionY, '#FFE066', 8);
          this.orionTrails.unshift({ x: this.orionX, y: this.orionY, frame: this.orionPose, alpha: 0.9 });
        }
      }

      this.mitePose = MITE_EXT_FRAMES.COMBO_CHEER;
      this.bossPose = BOSS_FRAMES.HURT_GLITCH;

      if (t >= 3.8 && !this.storyFlags['vic_2']) {
        this.storyFlags['vic_2'] = true;
        this.setDialogue('MITE', '¡Ding-Pum! ¡El Coliseo ruge! ¡La síncopa le funde los sensores!');
      }
    }
    // ACTO 3: Breakdance Power Move — Flair Power en el suelo (6.4s - 9.6s)
    else if (t < 9.6) {
      this.orionX = 180;
      this.orionY = 148; // A ras de suelo para los molinos acrobáticos
      this.orionPose = ORION_EXT_FRAMES.FLAIR_POWER;

      // Ondas de choque sónicas horizontales que impactan al Centinela
      if (Math.random() < 0.2) {
        this.shockwaves.push({
          x: this.orionX + 10,
          y: 155,
          vx: 220,
          radius: 12,
          vr: 30,
          alpha: 1.0,
          color: '#00E5FF'
        });
        this.orionTrails.unshift({ x: this.orionX, y: this.orionY, frame: this.orionPose, alpha: 0.9 });
      }

      this.mitePose = MITE_EXT_FRAMES.COMBO_CHEER;
      this.bossPose = BOSS_FRAMES.HURT_GLITCH;

      if (Math.random() < 0.3) {
        this.emitParticles(290, 115, '#FF0055', 10);
        this.trauma = Math.max(this.trauma, 0.08);
      }

      if (t >= 7.0 && !this.storyFlags['vic_3']) {
        this.storyFlags['vic_3'] = true;
        this.setDialogue('ORION', '¡A ver si tus algoritmos pueden procesar un Windmill en el suelo!');
      }
    }
    // ACTO 4: Headspin Burst vertical & Sobrecarga de Energía (9.6s - 12.8s)
    else if (t < 12.8) {
      this.orionX = 180;
      this.orionY = 146;
      this.orionPose = ORION_EXT_FRAMES.HEADSPIN_BURST;

      if (Math.random() < 0.4) {
        this.orionTrails.unshift({ x: this.orionX, y: this.orionY, frame: this.orionPose, alpha: 0.95 });
        this.emitParticles(this.orionX, this.orionY, '#00FFAA', 6);
      }

      this.mitePose = MITE_EXT_FRAMES.SUNGLASSES_GROOVE;
      this.bossPose = BOSS_FRAMES.HURT_GLITCH;

      if (Math.random() < 0.35) {
        this.emitParticles(290 + (Math.random() - 0.5) * 35, 115 + (Math.random() - 0.5) * 35, '#FFE066', 12);
      }

      if (t >= 10.0 && !this.storyFlags['vic_4']) {
        this.storyFlags['vic_4'] = true;
        this.setDialogue('MITE', '¡Disipadores del Centinela al 100%! ¡Está a punto de colapsar!');
      }
    }
    // ACTO 5: Solo de Rifle Air Guitar & Gran Destrucción del Centinela (12.8s - 16.0s)
    else if (t < 16.0) {
      this.orionX = 180;
      this.orionY = 136;
      this.orionPose = ORION_EXT_FRAMES.AIR_GUITAR_RIFLE;

      // Disparar notas de plasma musical al núcleo del Boss
      if (Math.random() < 0.3) {
        this.plasmaNotes.push({
          x: this.orionX + 18,
          y: this.orionY - 4,
          vx: 260,
          vy: (Math.random() - 0.5) * 50,
          color: Math.random() < 0.5 ? '#00E5FF' : '#FF0055',
          life: 0.55
        });
      }

      // EXPLOSIÓN Y DESTRUCCIÓN TOTAL DEL CENTINELA (a los 13.5s)
      if (t >= 13.5 && !this.bossDestroyed) {
        this.bossDestroyed = true;
        if (this.audio.playBossExplosion) {
          this.audio.playBossExplosion();
        }
        this.trauma = 0.50;

        // Generar 80 fragmentos poligonales de luz sólida disparados en abanico
        for (let i = 0; i < 80; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = Math.random() * 140 + 40;
          this.bossExplosionBursts.push({
            x: 290,
            y: 115,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 10,
            size: Math.random() * 6 + 2,
            color: ['#A855F7', '#00E5FF', '#FF0055', '#FFFFFF', '#FFE066'][Math.floor(Math.random() * 5)],
            alpha: 1.0
          });
        }

        this.setDialogue('ORION', '¡CENTINELA DESTRUIDO! ¡Frecuencia y nodo secuestrados!', 6.0);
      }

      this.mitePose = MITE_EXT_FRAMES.SUNGLASSES_GROOVE;
    }
    // ACTO 6: Celebración y Pose de Triunfo (16.0s+)
    else {
      this.orionX = 180;
      this.orionY = 136;
      this.orionPose = (Math.floor(songTime / BEAT_DUR) % 2 === 0) ? ORION_EXT_FRAMES.AIR_GUITAR_RIFLE : ORION_EXT_FRAMES.HIP_HOP_BOUNCE;
      this.mitePose = MITE_EXT_FRAMES.SUNGLASSES_GROOVE;
    }
  }

  handleMiss() {
    this.audio.playMissGlitch();
    this.orionStumble = true;
    this.orionPose = (this.combo >= 4) ? ORION_EXT_FRAMES.DIZZY_SPIN : ORION_EXT_FRAMES.SLIP_BANANA;
    this.orionPoseTimer = BEAT_DUR * 2.5;
    this.combo = 0;
    this.flowMeter = Math.max(0, this.flowMeter - 5);
    this.trauma += 0.25;
    this.mitePose = MITE_EXT_FRAMES.FACEPALM;
    this.spawnPopup("¡DEMASIADO LENTO!", "#FF3366", "#880022");

    if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
      this.orionHP = Math.max(0, this.orionHP - 6);
      this.audio.playBossLaser();
      this.bossPose = BOSS_FRAMES.LASER_HORIZONTAL;
    }
  }

  render(beatPhase, songTime) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    // Screen Shake por Trauma
    if (this.trauma > 0.01) {
      const s = this.trauma * this.trauma * 8;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // 1. ESCENOGRAFÍA DINÁMICA DE PIX
    this.drawStage(ctx, beatPhase, songTime);

    // 2. HIGHWAY GUITAR HERO STREAM (Oculto 100% durante victoria para ver todo el escenario y baile)
    this.drawHighwayStream(ctx, songTime, beatPhase);

    // 3. ONDAS DE CHOQUE SÓNICAS (Durante victoria)
    for (let sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. NOTAS DE PLASMA MUSICAL (Durante victoria)
    for (let pn of this.plasmaNotes) {
      ctx.save();
      ctx.fillStyle = pn.color;
      ctx.shadowColor = pn.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pn.x, pn.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. ONDAS DE CHOQUE DE SOBRECARGA ESPECIAL (ALTERACIÓN CROMÁTICA)
    for (let sw of this.specialShockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. DISTORSIÓN Y PULSO CROMÁTICO EN SOBRECARGA SÓNICA
    if (this.specialEffectTimer > 0) {
      const colorHue = Math.floor(songTime * 540) % 360;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `hsla(${colorHue}, 100%, 65%, 0.22)`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Líneas estroboscópicas de síncopa cuántica
      ctx.strokeStyle = `hsla(${colorHue + 180}, 100%, 75%, 0.35)`;
      ctx.lineWidth = 1.5;
      for (let y = 0; y < V_HEIGHT; y += 14) {
        const shift = Math.sin(songTime * 25 + y * 0.1) * 6;
        ctx.beginPath();
        ctx.moveTo(0, y + shift);
        ctx.lineTo(V_WIDTH, y + shift);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. ESTELAS HOLOGRÁFICAS DE ORION
    for (let tr of this.orionTrails) {
      ctx.save();
      ctx.globalAlpha = tr.alpha * 0.45;
      if (this.assets.loaded) {
        ctx.drawImage(this.assets.orionExt, tr.frame * 48, 0, 48, 48, tr.x - 24, tr.y - 24, 48, 48);
      }
      ctx.restore();
    }

    // 8. RENDER DE PERSONAJES
    if (this.phase === GAME_PHASES.VICTORY) {
      // Orion en el centro de la pista con la coreografía activa
      this.drawOrionSprite(ctx, this.orionX, this.orionY, beatPhase, songTime);

      // Mite orbitando alegremente en forma de ocho alrededor de Orion
      const t = this.victoryTimer;
      const miteX = this.orionX + Math.sin(t * 3.5) * 55;
      const miteY = 65 + Math.cos(t * 2.5) * 16;
      this.drawMiteSprite(ctx, miteX, miteY, beatPhase);

      // Boss: Si no está destruido se dibuja en glitch, si ya explotó se renderizan los fragmentos
      if (!this.bossDestroyed) {
        this.drawBossSprite(ctx, 290, 115, beatPhase);
      } else {
        // Fragmentos de luz sólida y polígonos del Centinela destruido
        for (let ep of this.bossExplosionBursts) {
          ctx.save();
          ctx.globalAlpha = ep.alpha;
          ctx.translate(ep.x, ep.y);
          ctx.rotate(ep.rot);
          ctx.fillStyle = ep.color;
          ctx.fillRect(-ep.size / 2, -ep.size / 2, ep.size, ep.size);
          ctx.restore();
        }
      }

      // Lluvia de confeti de victoria
      for (let c of this.confetti) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.5);
        ctx.restore();
      }
    } else {
      this.drawOrionSprite(ctx, 110, 135, beatPhase, songTime);
      this.drawMiteSprite(ctx, 55, 75 + Math.sin(songTime * 4) * 6, beatPhase);
      if (this.phase === GAME_PHASES.PHASE_2_DUEL) {
        this.drawBossSprite(ctx, 275, 115, beatPhase);
      }
    }

    // 9. EFECTOS Y PARTÍCULAS GENERALES
    for (let pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }

    ctx.restore();
  }

  // Render del Highway Guitar Hero Stream (4 Flechas Simétricas Centradas)
  drawHighwayStream(ctx, songTime, beatPhase) {
    if (this.phase === GAME_PHASES.TITLE || 
        this.phase === GAME_PHASES.PHASE_1_RECORDING_REPLAY || 
        this.phase === GAME_PHASES.PHASE_1_FAILED ||
        this.phase === GAME_PHASES.VICTORY) {
      return; // Cero flechas durante la victoria para despejar todo el escenario de baile
    }

    ctx.save();

    // Fondo del Highway translúcido perfectamente centrado
    ctx.fillStyle = 'rgba(6, 10, 20, 0.82)';
    ctx.fillRect(104, 30, 176, 174);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(104, 30, 176, 174);

    // Carriles verticales de guía y receptores de las 4 flechas
    for (let lane of HIGHWAY_LANES) {
      const btn = this.virtualButtons.find(b => b.id === lane.id);
      const isActive = btn && btn.active;

      // Línea de carril
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lane.x + 16, 30);
      ctx.lineTo(lane.x + 16, 204);
      ctx.stroke();

      // Receptor de impacto interactivo
      const pulse = Math.sin(beatPhase * Math.PI * 2) * 1.5;
      ctx.fillStyle = isActive ? lane.color : 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isActive ? '#FFFFFF' : lane.color;
      ctx.lineWidth = isActive ? 2 : 1.2;

      ctx.fillRect(lane.x, this.receptorY - 14, 32, 28);
      ctx.strokeRect(lane.x, this.receptorY - 14, 32, 28);

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = isActive ? '#000000' : lane.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.symbol, lane.x + 16, this.receptorY + pulse);
      ctx.textBaseline = 'alphabetic';
    }

    // Dibujar las Notas Flotantes que caen en tiempo real
    for (let note of this.notesStream) {
      if (note.hit) continue;

      // Calcular posición Y en función del tiempo de la canción y velocidad suave
      const timeDiff = note.targetTime - songTime;
      const noteY = this.receptorY - (timeDiff * this.scrollSpeed);

      // Dibujar dentro del rango visible del Highway
      if (noteY >= 25 && noteY <= 204) {
        const lane = HIGHWAY_LANES.find(l => l.id === note.lane);
        if (lane) {
          ctx.fillStyle = note.missed ? '#475569' : lane.color;
          ctx.strokeStyle = note.missed ? '#334155' : '#FFFFFF';
          ctx.lineWidth = 1;
          if (!note.missed) {
            ctx.shadowColor = lane.color;
            ctx.shadowBlur = 6;
          }
          ctx.fillRect(lane.x, noteY - 12, 32, 24);
          ctx.strokeRect(lane.x, noteY - 12, 32, 24);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = note.missed ? '#94A3B8' : '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lane.symbol, lane.x + 16, noteY);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    ctx.restore();
  }

  drawStage(ctx, beatPhase, songTime) {
    if (this.phase === GAME_PHASES.PHASE_2_DUEL || this.phase === GAME_PHASES.VICTORY) {
      // Cámara Blanca / Escenario de Luz Sólida
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Ecualizador de fondo gigante de Pix
      if (this.assets.loaded) {
        ctx.globalAlpha = (this.phase === GAME_PHASES.VICTORY) ? 0.75 : 0.55;
        ctx.drawImage(this.assets.bgEqualizer, 0, 10, V_WIDTH, 100);
        ctx.globalAlpha = 1.0;

        // Suelo de pulso
        ctx.drawImage(this.assets.floorPulse, 0, 145, V_WIDTH, 60);

        // Reflectores de concierto (Spotlights) centrados en Orion
        const targetX = (this.phase === GAME_PHASES.VICTORY) ? this.orionX : 110;
        const spotX = targetX + Math.sin(songTime * 2.5) * 35;
        ctx.globalAlpha = 0.45 + Math.sin(beatPhase * Math.PI * 2) * 0.2;
        ctx.drawImage(this.assets.spotlights, spotX - 64, 15, 128, 128);

        if (this.phase === GAME_PHASES.VICTORY) {
          // Segundo reflector de apoyo para mayor espectacularidad
          ctx.drawImage(this.assets.spotlights, (V_WIDTH - spotX) - 64, 15, 128, 128);
        }
        ctx.globalAlpha = 1.0;
      }

      // Círculos concéntricos de datos y energía
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.5;
      const originX = (this.phase === GAME_PHASES.VICTORY) ? this.orionX : 275;
      const originY = (this.phase === GAME_PHASES.VICTORY) ? 135 : 115;
      for (let r = 30; r < 220; r += 36) {
        ctx.beginPath();
        ctx.arc(originX, originY, r + Math.sin(beatPhase * Math.PI * 2) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Pasillo Cyberpunk Oscuro del Cortafuegos
      ctx.fillStyle = '#080C19';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      if (this.assets.loaded) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(this.assets.bgEqualizer, 0, 10, V_WIDTH, 100);
        ctx.globalAlpha = 1.0;
      }

      // Líneas de perspectiva del suelo
      ctx.strokeStyle = '#1E294B';
      ctx.lineWidth = 1;
      for (let x = 0; x < V_WIDTH; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 140);
        ctx.lineTo(x - 40, 216);
        ctx.stroke();
      }
    }
  }

  // Render Dinámico de Orion con Groove Activo y Animación a 116 BPM
  drawOrionSprite(ctx, x, y, beatPhase, songTime) {
    ctx.save();
    ctx.translate(x, y);

    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    let currentPose = this.orionPose;

    if (this.orionStumble && this.phase !== GAME_PHASES.VICTORY) {
      ctx.rotate(0.35);
      ctx.translate((Math.random() - 0.5) * 4, 0);
    } else {
      // Rebote continuo de baile al compás de 116 BPM
      const bounce = Math.abs(Math.sin(beatPhase * Math.PI)) * 4.5;
      ctx.translate(0, -bounce);

      // Si no está ejecutando un paso forzado de pulsación ni en victoria, alternar pose de groove activo continuo
      if (this.orionPoseTimer <= 0 && this.phase !== GAME_PHASES.VICTORY) {
        const beatIndex = Math.floor(songTime / BEAT_DUR) % 4;
        if (beatIndex === 0) currentPose = ORION_EXT_FRAMES.HIP_HOP_BOUNCE;
        else if (beatIndex === 1) currentPose = ORION_EXT_FRAMES.RUNNING_MAN;
        else if (beatIndex === 2) currentPose = ORION_EXT_FRAMES.MOONWALK;
        else currentPose = ORION_EXT_FRAMES.ROBOT_POPPING;
      }
    }

    if (this.assets.loaded) {
      ctx.drawImage(this.assets.orionExt, currentPose * 48, 0, 48, 48, -24, -24, 48, 48);
    } else {
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(-10, -20, 20, 40);
    }

    ctx.restore();
  }

  drawMiteSprite(ctx, x, y, beatPhase) {
    ctx.save();
    ctx.translate(x, y);

    if (this.assets.loaded) {
      ctx.drawImage(this.assets.miteExt, this.mitePose * 48, 0, 48, 48, -24, -24, 48, 48);
    } else {
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawBossSprite(ctx, x, y, beatPhase) {
    ctx.save();
    ctx.translate(x, y);

    if (this.assets.loaded) {
      ctx.drawImage(this.assets.boss, this.bossPose * 96, 0, 96, 96, -48, -48, 96, 96);
    } else {
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(-30, -45, 60, 90);
    }

    if (this.bossPose === BOSS_FRAMES.LASER_HORIZONTAL && this.orionStumble) {
      ctx.strokeStyle = '#FF0055';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(-190, 20);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

window.addEventListener('load', () => {
  window.gameEngine = new GameEngine();
});
