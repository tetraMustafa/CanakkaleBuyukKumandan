/**
 * Çanakkale 1915 - Dynamic Web Audio Synthesizer & Sound Engine
 * Zero-latency procedural audio for historical immersion
 */

/**
 * Çanakkale 1915 - Dynamic Web Audio Synthesizer & Sound Engine
 * Kingdom Classic / Two Crowns inspired procedural ambient music, atmospheric soundscapes & crisp SFX
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentMusicType: 'day' | 'night' | 'victory' | 'defeat' | 'none' = 'none';
  private musicInterval: number | null = null;
  private ambienceInterval: number | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();

      this.musicGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(0.48, this.ctx.currentTime);
      this.ambienceGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.ambienceGain.connect(this.ctx.destination);

      this.startAmbientSeaBreeze();
    } catch {
      console.warn('AudioContext not supported in this browser');
    }
  }

  public resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) return;
    if (this.musicGain) this.musicGain.gain.setValueAtTime(muted ? 0 : 0.32, this.ctx.currentTime);
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.48, this.ctx.currentTime);
    if (this.ambienceGain) this.ambienceGain.gain.setValueAtTime(muted ? 0 : 0.2, this.ctx.currentTime);
  }

  public getIsMuted() {
    return this.isMuted;
  }

  // --- Dynamic Procedural Music Generator (Kingdom Style) ---

  public playMusic(type: 'day' | 'night' | 'victory' | 'defeat') {
    if (this.currentMusicType === type) return;
    this.currentMusicType = type;
    this.stopMusic();

    if (this.isMuted || !this.ctx) return;
    this.resume();

    if (type === 'day') {
      this.startKingdomDaytimeAmbiance();
    } else if (type === 'night') {
      this.startKingdomNightTension();
    } else if (type === 'victory') {
      this.playVictoryFanfare();
    } else if (type === 'defeat') {
      this.playDefeatLament();
    }
  }

  public stopMusic() {
    if (this.musicInterval) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // Kingdom-inspired Daytime: Gentle, melancholic piano arpeggios + warm flute + soft sub pads
  private startKingdomDaytimeAmbiance() {
    // Ethereal Anatolian Pentatonic / Minor scale chords (D minor / A minor progression)
    // D3, F3, A3, C4, D4, E4, F4, G4, A4, C5, D5
    const chordProgressions = [
      { root: 146.83, arpeggio: [293.66, 349.23, 440.00, 523.25, 587.33, 698.46] }, // Dm7/9
      { root: 116.54, arpeggio: [233.08, 293.66, 349.23, 440.00, 466.16, 587.33] }, // Bb Maj7
      { root: 130.81, arpeggio: [261.63, 329.63, 392.00, 493.88, 523.25, 659.25] }, // C Maj
      { root: 110.00, arpeggio: [220.00, 261.63, 329.63, 392.00, 440.00, 523.25] }, // Am7
    ];

    let chordIdx = 0;
    let stepIdx = 0;

    const playStep = () => {
      if (!this.ctx || this.isMuted || this.currentMusicType !== 'day') return;
      const currentProg = chordProgressions[chordIdx % chordProgressions.length];
      const t = this.ctx.currentTime;

      // Deep Warm Bass Pad on chord change
      if (stepIdx % 8 === 0) {
        this.playSoftPad(currentProg.root, 4.2);
        chordIdx++;
      }

      // Delicate Kingdom Piano / Celesta Pluck
      const arpNote = currentProg.arpeggio[stepIdx % currentProg.arpeggio.length];
      if (stepIdx % 2 === 0 || Math.random() < 0.6) {
        this.playPianoNote(arpNote, 0.14, 1.8);
      }

      // Gentle Flute / Ney accent
      if (stepIdx % 16 === 4) {
        this.playNeyLead(currentProg.arpeggio[3], 2.4);
      }

      stepIdx++;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, 580);
  }

  // Soft synth pad for atmospheric depth
  private playSoftPad(freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(580, t + duration * 0.4);
    filter.frequency.linearRampToValueAtTime(280, t + duration);

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 1.002, t); // subtle chorusing

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + duration + 0.1);
    osc2.stop(t + duration + 0.1);
  }

  // Kingdom-style crystalline piano note
  private playPianoNote(freq: number, vol: number, dur: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    oscHarmonic.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscHarmonic.frequency.setValueAtTime(freq * 2, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    oscHarmonic.start(t);
    osc.stop(t + dur + 0.05);
    oscHarmonic.stop(t + dur + 0.05);
  }

  // Melancholic Ney / Woodwind Lead
  private playNeyLead(freq: number, dur: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(3.0, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    // gentle vibrato
    osc.frequency.linearRampToValueAtTime(freq * 1.01, t + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(freq, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + dur + 0.1);
  }

  // Kingdom-inspired Nighttime Tension: Low rhythmic pulse, dark strings, eerie suspense
  private startKingdomNightTension() {
    let beat = 0;
    const bassline = [82.41, 82.41, 73.42, 65.41]; // E2, E2, D2, C2

    const playStep = () => {
      if (!this.ctx || this.isMuted || this.currentMusicType !== 'night') return;
      const t = this.ctx.currentTime;

      // Dark pulsing heartbeat bass drum
      if (beat % 2 === 0) {
        this.playWarDrum(beat % 4 === 0 ? 65 : 85);
      }

      // Suspenseful metallic tick / percussion
      if (beat % 2 === 1) {
        this.playMarchSnare();
      }

      // Low ominous cello drone
      if (beat % 8 === 0) {
        const root = bassline[(beat / 8) % bassline.length];
        this.playDarkBrass(root, 2.2);
      }

      beat++;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, 320);
  }

  private playWarDrum(baseFreq: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private playMarchSnare() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.018));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
  }

  private playDarkBrass(freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(800, t + 0.4);
    filter.frequency.linearRampToValueAtTime(300, t + duration);

    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 1.5, t); // Perfect fifth

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
  }

  public playVictoryFanfare() {
    if (!this.ctx || !this.musicGain) return;
    const notes = [440, 554.37, 659.25, 880]; // A Major Triad
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.musicGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 1.3);
      }, idx * 180);
    });
  }

  public playDefeatLament() {
    if (!this.ctx || !this.musicGain) return;
    const notes = [440, 415.3, 392.0, 369.99, 329.63];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.musicGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 1.5);
      }, idx * 300);
    });
  }

  // --- Atmospheric Ambient Sea & Wind ---
  private startAmbientSeaBreeze() {
    // Gentle pink noise filtered for Gallipoli shore breeze
    if (!this.ctx || !this.ambienceGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.ambienceGain);
      noise.start();
    } catch {
      // ignore
    }
  }

  // --- Sound Effects (SFX) ---

  // Crisp Kingdom-style Coin Pickup / Collect
  public playCoin() {
    this.playCoinCollect();
  }

  public playCoinCollect() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(1046.50, t); // C6
    osc.frequency.setValueAtTime(1567.98, t + 0.05); // G6
    osc2.frequency.setValueAtTime(2093.00, t + 0.05); // C7 harmonic

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.4);
    osc2.stop(t + 0.4);
  }

  // Coin Dropping / Scattering on ground (hit or drop)
  public playCoinDrop() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760 + (Math.random() - 0.5) * 200, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Pay coin into building slot
  public playCoinPay() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.setValueAtTime(880.00, t + 0.04); // A5

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Commander Hit / Hurt Sound
  public playCommanderHurt() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Horse whinny / grunt + hit impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);

    // Also trigger coin scatter sound
    this.playCoinDrop();
  }

  public playWhistle() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.linearRampToValueAtTime(2800, t + 0.08);
    osc.frequency.linearRampToValueAtTime(2400, t + 0.4);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  public playGunshot(isMachineGun = false) {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * (isMachineGun ? 0.08 : 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (isMachineGun ? 0.015 : 0.04)));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isMachineGun ? 2800 : 1800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isMachineGun ? 0.22 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isMachineGun ? 0.08 : 0.25));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playExplosion(isLarge = false) {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const duration = isLarge ? 1.2 : 0.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (isLarge ? 0.25 : 0.12)));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 400 : 700, t);
    filter.frequency.linearRampToValueAtTime(100, t + duration);

    // Deep sub oscillator boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isLarge ? 90 : 140, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + duration);
    subGain.gain.setValueAtTime(isLarge ? 0.6 : 0.35, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.7 : 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
  }

  public playDigOrChop(type: 'wood' | 'pickaxe' | 'dig' | 'hammer') {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Pitch jitter for natural human variety (+/- 5%)
    const pitchJitter = 0.95 + Math.random() * 0.1;

    if (type === 'hammer') {
      this.playHammer('wood');
      return;
    }

    if (type === 'wood') {
      // Crisp timber axe strike: sharp wood crack + body thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(75 * pitchJitter, t + 0.14);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.18);

      // Wood splinter noise transient
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 * pitchJitter, t);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t);
    } else if (type === 'pickaxe') {
      // Ringing pickaxe on Gallipoli limestone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(840 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(280 * pitchJitter, t + 0.12);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    } else {
      // Earth shovel excavation: textured scraping loam + thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(55 * pitchJitter, t + 0.18);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  }

  // Authentic tactile hammer striking wood, stone, or iron
  public playHammer(material: 'wood' | 'stone' | 'metal' = 'wood') {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const pitchJitter = 0.94 + Math.random() * 0.12;

    // 1. Sharp mechanical impact click transient
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((material === 'stone' ? 2400 : material === 'metal' ? 3200 : 1600) * pitchJitter, t);
    filter.Q.setValueAtTime(4.0, t);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.35, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);

    // 2. Resonant material body tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (material === 'stone') {
      // Mason's chisel striking stone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(320 * pitchJitter, t + 0.15);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    } else if (material === 'metal') {
      // Iron rivet / Anvil ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(540 * pitchJitter, t + 0.2);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    } else {
      // Heavy wooden mallet driving timber stake into trench
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(310 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(110 * pitchJitter, t + 0.14);
      gain.gain.setValueAtTime(0.42, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Historical Field Artillery Thundering Blast (75mm Sahra Topu Atışı)
  public playFieldArtilleryFire() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 0.45);
    subGain.gain.setValueAtTime(0.75, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.55);

    // Cordite blast explosion roar
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.7);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.65, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(t);
  }

  // Construction completion fanfar / chime
  public playConstructionFinish() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chords.forEach((f, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.45);
      }, idx * 75);
    });
  }

  // Chest Open Golden Shower SFX
  public playChestOpen() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Wood creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.15);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);

    // Coin chime burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playCoin();
      }, 100 + i * 60);
    }
  }

  // Tree Falling Timber Thud
  public playTreeFall() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playGallop() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playHorseWhinny() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.linearRampToValueAtTime(820, t + 0.1);
    osc.frequency.linearRampToValueAtTime(420, t + 0.35);
    osc.frequency.linearRampToValueAtTime(320, t + 0.5);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  public playBayonetClash() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.18);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playReload() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Bolt action click & slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);

    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(900, t2);
      osc2.frequency.exponentialRampToValueAtTime(240, t2 + 0.06);

      gain2.gain.setValueAtTime(0.3, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.08);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.1);
    }, 90);
  }

  public playBugleCharge() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    // Ottoman Hücum Borusu notes: G4, C5, E5, G5
    const freqs = [392.00, 523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
      }, idx * 120);
    });
  }

  public playAssaultShout() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.resume();
    
    // Bugle fanfare charge
    this.playBugleCharge();

    // Rhythmic Marching Infantry Footsteps & Snare Drum Rolls
    for (let step = 0; step < 8; step++) {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime;

        // Snare drum snap
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        whiteNoise.start(t);

        // Heavy Boot thud
        const osc = this.ctx.createOscillator();
        const bootGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);
        bootGain.gain.setValueAtTime(0.3, t);
        bootGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(bootGain);
        bootGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
      }, step * 160);
    }
  }

  public updateWeatherAmbience(weather: 'clear' | 'rain' | 'fog' | 'storm' | 'snow', intensity: number) {
    if (!this.ctx || !this.ambienceGain) return;
    if (weather === 'rain' || weather === 'storm') {
      this.ambienceGain.gain.setValueAtTime(Math.min(0.3, 0.15 + intensity * 0.15), this.ctx.currentTime);
    }
  }
}

export const soundEngine = new SoundEngine();
