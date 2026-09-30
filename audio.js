/**
 * ============================================================================
 * MOTOR DE AUDIO PROCEDURAL RÍTMICO — «EL CENTINELA DEL RITMO»
 * Transcripción Maestra: «Get Down (You're the One for Me)» — Backstreet Boys
 * Tonalidad Original: Sol# menor (G# minor) | Tempo Oficial: 116 BPM
 * Diseño e Ingeniería Sónica: Hertz (Sonidista del Yermo / Clan SAPIENSIA)
 * 
 * ⚡ 100% Web Audio API Nativo | 0 KB de Descargas Externas
 * ⚡ Emulación Fiel: Talkbox/Lead Hook, Slap Bass G#m-E-F#, 909 Groove & SFX
 * ============================================================================
 */

class RhythmAudioSystem {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.bpm = 116; // Tempo oficial exacto de «Get Down»
    this.beatDuration = 60 / this.bpm; // ~0.5172 seg por Beat
    this.stepDuration = this.beatDuration / 4; // ~0.1293 seg por Semicorchea
    
    this.currentStep = 0;
    this.nextNoteTime = 0;
    this.timerID = null;
    this.lookaheadMs = 25;
    this.scheduleAheadSec = 0.12;

    // Master Bus & Sub-mezcladores
    this.masterGain = null;
    this.compressor = null;
    this.drumGain = null;
    this.bassGain = null;
    this.synthGain = null;
    this.leadGain = null;
    this.talkboxGain = null;
    this.sfxGain = null;

    this.isMuted = false;
    this.mode = 'TUTORIAL';
    this.isLeadEnabled = true;

    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // 1. Master Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12.0, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.22, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // 2. Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.90, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 3. Sub-buses
      this.drumGain = this.ctx.createGain();
      this.drumGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
      this.drumGain.connect(this.masterGain);

      this.bassGain = this.ctx.createGain();
      this.bassGain.gain.setValueAtTime(0.92, this.ctx.currentTime);
      this.bassGain.connect(this.masterGain);

      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.setValueAtTime(0.80, this.ctx.currentTime);
      this.synthGain.connect(this.masterGain);

      this.leadGain = this.ctx.createGain();
      this.leadGain.gain.setValueAtTime(0.90, this.ctx.currentTime);
      this.leadGain.connect(this.masterGain);

      this.talkboxGain = this.ctx.createGain();
      this.talkboxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.talkboxGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.90, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Búfer de ruido blanco reutilizable
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn('Web Audio no disponible en el navegador:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  startMusic() {
    this.ensureContext();
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stopMusic() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.90, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  scheduler() {
    if (!this.isPlaying || !this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextStep();
    }
    this.timerID = setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  nextStep() {
    this.nextNoteTime += this.stepDuration;
    // Bucle de 32 Compases (512 semicorcheas = ~66.2 segundos por ciclo completo a 116 BPM)
    this.currentStep = (this.currentStep + 1) % 512;
  }

  /**
   * Despachador de Notas en G# minor (Tonalidad Oficial)
   * 
   * Frecuencias de referencia en Sol# menor:
   * G#1=51.91, A#1=58.27, B1=61.74, C#2=69.30, D#2=77.78, E2=82.41, F#2=92.50
   * G#2=103.83, A#2=116.54, B2=123.47, C#3=138.59, D#3=155.56, E3=164.81, F#3=185.00
   * G#3=207.65, A#3=233.08, B3=246.94, C#4=277.18, D#4=311.13, E4=329.63, F#4=369.99
   * G#4=415.30, A#4=466.16, B4=493.88, C#5=554.37, D#5=622.25, E5=659.25, F#5=739.99
   */
  scheduleStep(step, time) {
    const bar = Math.floor(step / 16);       // 0 a 31
    const beat16 = step % 16;                // 0 a 15
    const isBuildUp = (bar === 15 || bar === 31);
    const isChorus = (bar >= 4 && bar <= 11) || (bar >= 20 && bar <= 27);
    const isVerse = (bar >= 0 && bar < 4) || (bar >= 12 && bar < 20);

    // -------------------------------------------------------------
    // 1. BATERÍA HIP-HOP / POP 90s (116 BPM PUNCH & GROOVE)
    // -------------------------------------------------------------
    // Kick Drum con pegada profunda
    if (beat16 === 0 || beat16 === 6 || beat16 === 8 || beat16 === 14) {
      this.play909Kick(time, beat16 === 0 ? 0.85 : 0.65);
    }

    // Snare / Rimshot en tiempos 2 y 4 (pasos 4 y 12)
    if (beat16 === 4 || beat16 === 12) {
      this.play909Snare(time, 0.70);
    }
    // Redoble en el compás de build-up
    if (isBuildUp && beat16 >= 8) {
      this.play909Snare(time, 0.45 + (beat16 - 8) * 0.07);
    }

    // Hi-Hats: Abierto en los contratiempos (pasos 2, 6, 10, 14) y cerrado continuo
    if (beat16 === 2 || beat16 === 6 || beat16 === 10 || beat16 === 14) {
      this.playOpenHiHat(time, 0.20);
    } else {
      this.playClosedHiHat(time, beat16 % 2 === 0 ? 0.08 : 0.04);
    }

    // Crash Cymbal al inicio de secciones
    if (step === 0 || step === 64 || step === 320) {
      this.playCrash(time, 0.45);
    }

    // -------------------------------------------------------------
    // 2. LÍNEA DE BAJO SLAP ORIGINAL («GET DOWN» BASSLINE EN G#m)
    // Progresión: G#m -> E -> F# -> D#7
    // -------------------------------------------------------------
    const Gs1 = 51.91, Gs2 = 103.83, Fs2 = 92.50, Ds2 = 77.78, E1 = 41.20, E2 = 82.41, Fs1 = 46.25, Ds1 = 38.89;
    const B1 = 61.74, Cs2 = 69.30, B2 = 123.47, Cs3 = 138.59, Ds3 = 155.56;

    const bassPatternGSm = [
      // Compás 1: G#m (Gs1 .. Gs1 . Gs2 . Fs2 . Ds2 ..)
      Gs1, 0, Gs1, Gs2,  0, Fs2, 0, Ds2,   0, Gs1, 0, B1,   Cs2, 0, Ds2, 0,
      // Compás 2: E -> F# (E1 .. E1 . E2 . Fs1 .. Fs1 . Fs2)
      E1, 0, E1, E2,     0, B1, 0, Cs2,    Fs1, 0, Fs1, Fs2, 0, Cs2, 0, Ds2,
      // Compás 3: G#m (Gs1 .. Gs1 . Gs2 . Fs2 . Ds2 ..)
      Gs1, 0, Gs1, Gs2,  0, Fs2, 0, Ds2,   0, Gs1, 0, B1,   Cs2, 0, Ds2, 0,
      // Compás 4: E -> D#7 (E1 .. E2 . Ds1 .. Ds2 . Fs2)
      E1, 0, E1, E2,     0, B1, 0, Cs2,    Ds1, 0, Ds1, Ds2, 0, Fs2, Ds2, 0
    ];

    const bassFreq = bassPatternGSm[step % bassPatternGSm.length];
    if (bassFreq > 0) {
      this.playSlapBass(bassFreq, time, 0.48);
    }

    // -------------------------------------------------------------
    // 3. SYNTH CHORDS / PIANO ELÉCTRICO 90s (G#m - E - B - F# / D#7)
    // -------------------------------------------------------------
    if (beat16 === 0 || beat16 === 6 || beat16 === 10) {
      const chordsGSm = [
        [207.65, 246.94, 311.13, 415.30], // G#m  (G#3, B3, D#4, G#4)
        [164.81, 207.65, 246.94, 329.63], // E    (E3, G#3, B3, E4)
        [246.94, 311.13, 369.99, 493.88], // B    (B3, D#4, F#4, B4)
        [185.00, 233.08, 277.18, 369.99]  // F#   (F#3, A#3, C#4, F#4)
      ];
      this.playEuroChords(chordsGSm[bar % 4], time, 0.22);
    }

    // -------------------------------------------------------------
    // 4. TALKBOX & LEAD HOOK AUTÉNTICO DE «GET DOWN»
    // -------------------------------------------------------------
    const Ds4 = 311.13, Fs4 = 369.99, Gs4 = 415.30, As4 = 466.16, B4 = 493.88, Cs4 = 277.18, E4 = 329.63;
    const Ds5 = 622.25, Cs5 = 554.37, B3 = 246.94, Gs3 = 207.65;

    // Riff Talkbox Instrumental de los Versos
    const talkboxRiff = [
      // Compás 1: G#3 -> B3 -> C#4 -> D#4 -> C#4 -> B3 -> G#3
      Gs3, 0, Gs3, 0,   B3, 0, Cs4, 0,   Ds4, 0, Cs4, 0,  B3, 0, Gs3, 0,
      // Compás 2: G#3 -> B3 -> C#4 -> D#4 -> F#4 -> D#4 -> C#4
      Gs3, 0, Gs3, 0,   B3, 0, Cs4, 0,   Ds4, 0, Fs4, 0,  Ds4, 0, Cs4, 0,
      // Compás 3
      Gs3, 0, Gs3, 0,   B3, 0, Cs4, 0,   Ds4, 0, Cs4, 0,  B3, 0, Gs3, 0,
      // Compás 4: Cierre en D#4
      Gs3, 0, B3, 0,    Cs4, 0, Ds4, 0,  Fs4, 0, Ds4, 0,  Cs4, 0, B3, 0
    ];

    // Melodía Vocal del Estribillo: «Get Down... You're the one for me»
    const chorusMelody = [
      // Compás 1: "Get down" (D#4 D#4) "Get down" (F#4 D#4) "and move it all a-round"
      Ds4, 0, Ds4, 0,   Fs4, 0, Ds4, 0,   0, 0, Ds4, 0,   Fs4, Gs4, Fs4, Ds4,
      // Compás 2: "...a-round" (C#4 -> D#4)
      Cs4, 0, Ds4, 0,   0, 0, 0, 0,       0, 0, 0, 0,     0, 0, 0, 0,
      // Compás 3: "Get down" (D#4 D#4) "Get down" (F#4 D#4) "and move it all a-round"
      Ds4, 0, Ds4, 0,   Fs4, 0, Ds4, 0,   0, 0, Ds4, 0,   Fs4, Gs4, As4, Gs4,
      // Compás 4: "...a-round" (F#4 -> D#4)
      Fs4, 0, Ds4, 0,   0, 0, 0, 0,       0, 0, 0, 0,     0, 0, 0, 0,

      // Compás 5: "You're the one for me..." (B4 B4 B4 A#4 G#4)
      B4, 0, B4, 0,     B4, 0, As4, 0,    Gs4, 0, 0, 0,   0, 0, 0, 0,
      // Compás 6: "You're my ec-sta-sy..." (B4 B4 B4 A#4 G#4)
      B4, 0, B4, 0,     B4, 0, As4, 0,    Gs4, 0, 0, 0,   0, 0, 0, 0,
      // Compás 7: "You're the on-ly one that I need..." (B4 B4 B4 A#4 G#4 F#4 G#4 D#4)
      B4, 0, B4, 0,     B4, 0, As4, 0,    Gs4, 0, Fs4, 0, Gs4, 0, Ds4, 0,
      // Compás 8: "Hey yeah... Get down!" (D#5 C#5 B4 G#4)
      Ds5, 0, 0, Cs5,   0, 0, B4, 0,      Gs4, 0, 0, 0,   0, 0, 0, 0
    ];

    if (this.isLeadEnabled) {
      if (isChorus) {
        // En el coro: La voz líder canta el estribillo de «Get Down»
        const note = chorusMelody[step % chorusMelody.length];
        if (note > 0) {
          this.playLeadSynth(note, time, 0.32);
        }
      } else {
        // En los versos: Suena el Talkbox característico
        const tNote = talkboxRiff[step % talkboxRiff.length];
        if (tNote > 0) {
          this.playTalkboxSynth(tNote, time, 0.26);
        }
      }
    }

    // -------------------------------------------------------------
    // 5. MODO BOSS DUEL: ARPEGIOS CUÁNTICOS EN G#m
    // -------------------------------------------------------------
    if (this.mode === 'BOSS_DUEL') {
      const arpNotes = [
        207.65, 246.94, 311.13, 415.30, 311.13, 246.94,
        164.81, 207.65, 246.94, 329.63, 246.94, 207.65,
        246.94, 311.13, 369.99, 493.88, 369.99, 311.13,
        185.00, 233.08, 277.18, 369.99, 277.18, 233.08
      ];
      this.playArp(arpNotes[step % arpNotes.length], time, 0.10);
    }
  }

  // ==========================================================================
  // INSTRUMENTOS VIRTUALES (WEB AUDIO API PURA A 0 KB)
  // ==========================================================================

  play909Kick(time, vol = 0.85) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.drumGain);

    osc.start(time);
    osc.stop(time + 0.20);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  play909Snare(time, vol = 0.70) {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, time);
    filter.Q.setValueAtTime(1.6, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.15);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.07);

    oscGain.gain.setValueAtTime(vol * 0.60, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.drumGain);

    osc.start(time);
    osc.stop(time + 0.09);
    osc.onended = () => { osc.disconnect(); oscGain.disconnect(); };
  }

  playOpenHiHat(time, vol = 0.20) {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.15);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playClosedHiHat(time, vol = 0.08) {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(9000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.045);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playCrash(time, vol = 0.45) {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.70);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.75);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playSlapBass(freq, time, vol = 0.48) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.8, time);
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.16);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.20);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassGain);

    osc.start(time);
    osc.stop(time + 0.22);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playEuroChords(freqs, time, vol = 0.22) {
    if (!this.ctx || this.isMuted) return;

    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, time);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f * 2.0, time);
      filter.Q.setValueAtTime(1.8, time);

      gain.gain.setValueAtTime(vol * 0.85, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.synthGain);

      osc.start(time);
      osc.stop(time + 0.24);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    });
  }

  /**
   * Voz Lead del Estribillo de «Get Down» (Onda Cuadrada Cálida)
   */
  playLeadSynth(freq, time, vol = 0.32) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.Q.setValueAtTime(2.2, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.018);
    gain.gain.setValueAtTime(vol * 0.85, time + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.leadGain);

    osc.start(time);
    osc.stop(time + 0.28);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  /**
   * Síntesis de Talkbox / Modulación Formante para el Riff de los Versos
   */
  playTalkboxSynth(freq, time, vol = 0.26) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Filtro formante que simula modulación vocal tipo "wah/talkbox"
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 3.5, time + 0.12);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.20);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.talkboxGain);

    osc.start(time);
    osc.stop(time + 0.22);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playArp(freq, time, vol = 0.10) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.synthGain);

    osc.start(time);
    osc.stop(time + 0.09);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ==========================================================================
  // EFECTOS DE SONIDO A LATENCIA CERO
  // ==========================================================================

  playPerfectHit() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    [1046.50, 1318.51, 1567.98].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.018);

      gain.gain.setValueAtTime(0.28, now + idx * 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.018 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.018);
      osc.stop(now + idx * 0.018 + 0.24);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playGoodHit() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(830.61, now); // G#5
    gain.gain.setValueAtTime(0.20, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playMissGlitch() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.18);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playBossLaser() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.26);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.30);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playCountdownBeat(beatNum) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freqs = [415.30, 523.25, 622.25, 830.61]; // G#4, C5, D#5, G#5
    const f = freqs[(beatNum - 1) % 4];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.10);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playVictoryFanfare() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const fanfareNotes = [
      { f: 493.88, d: 0.12 }, // B4
      { f: 493.88, d: 0.12 }, // B4
      { f: 493.88, d: 0.12 }, // B4
      { f: 466.16, d: 0.14 }, // A#4
      { f: 415.30, d: 0.32 }, // G#4
      { f: 622.25, d: 0.45 }  // D#5
    ];

    let offset = 0;
    fanfareNotes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + offset);

      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + offset);
      osc.stop(now + offset + n.d + 0.05);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };

      offset += n.d * 0.85;
    });
  }

  playBossExplosion() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Impacto grave
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.68);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };

    // Ruido blanco filtrado de explosión
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.7);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.5, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.78);
    }
  }

  playLaserChord() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [415.30, 622.25, 830.61].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + idx * 0.03 + 0.18);
      gain.gain.setValueAtTime(0.25, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 0.20);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.22);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  playSpecialOverdrive() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Arpegio Rápido de Sobrecarga Cuántica (G#4, B4, D#5, G#5, C#6)
    const arpeggio = [415.30, 493.88, 622.25, 830.61, 1108.73];
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.30, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.38);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });

    // 2. Sweep de Filtro Resonante Funk y Sobrecarga
    const filterOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const filterGain = this.ctx.createGain();

    filterOsc.type = 'sawtooth';
    filterOsc.frequency.setValueAtTime(103.83, now); // G#2
    filterOsc.frequency.linearRampToValueAtTime(207.65, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.8);
    filter.Q.setValueAtTime(8, now);

    filterGain.gain.setValueAtTime(0.40, now);
    filterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    filterOsc.connect(filter);
    filter.connect(filterGain);
    filterGain.connect(this.sfxGain);

    filterOsc.start(now);
    filterOsc.stop(now + 0.90);
    filterOsc.onended = () => { filterOsc.disconnect(); filter.disconnect(); filterGain.disconnect(); };

    // 3. Impacto de Sub-Bajo de Descarga
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.6);

    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + 0.70);
    subOsc.onended = () => { subOsc.disconnect(); subGain.disconnect(); };
  }
}

window.audioSystem = new RhythmAudioSystem();
