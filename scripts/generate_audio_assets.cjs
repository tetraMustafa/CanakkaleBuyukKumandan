// Node.js script to pre-render and export clean WAV audio assets
// for Çanakkale 1915: Büyük Kumandan
const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, numChannels, samples) {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample to [-1, 1]
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

function saveAudio(relPath, sampleRate, numChannels, samples) {
  const wavBuf = createWavBuffer(sampleRate, numChannels, samples);
  
  const publicPath = path.join(__dirname, '..', 'public', 'audio', relPath);
  const srcPath = path.join(__dirname, '..', 'src', 'audio', 'assets', relPath);

  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.mkdirSync(path.dirname(srcPath), { recursive: true });

  fs.writeFileSync(publicPath, wavBuf);
  fs.writeFileSync(srcPath, wavBuf);
  console.log(`Saved: ${relPath} (${(wavBuf.length / 1024).toFixed(1)} KB)`);
}

// Generate Main Menu Theme: 60-second flowing, serene, evocative Ottoman historical ambient theme
function generateMainTheme() {
  const sampleRate = 32000;
  const duration = 64; // 64 seconds loop
  const totalSamples = sampleRate * duration;
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Historical Ottoman Nihavend / Hicaz modal scale frequencies (A minor / D minor foundation)
  // Roots: D2 (73.4), A2 (110.0), D3 (146.8), F3 (174.6), G3 (196.0), A3 (220.0), Bb3 (233.08), C#4 (277.18), D4 (293.66), E4 (329.6), F4 (349.2), G4 (392.0), A4 (440.0)
  const chordRoots = [73.42, 82.41, 98.0, 110.0]; // D, E, G, A
  const melodyNotes = [
    293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 554.37, 587.33,
    440.00, 392.00, 349.23, 293.66, 277.18, 293.66
  ];

  // 1. Warm ambient bowed bass drone & acoustic cello
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const bar = Math.floor(t / 8) % 8; // 8-bar cycle
    const rootFreq = bar < 4 ? 73.42 : (bar < 6 ? 98.0 : 110.0);

    // Warm cello fundamental + subtle 5th and octave
    const bass = (Math.sin(2 * Math.PI * rootFreq * t) * 0.22 +
                  Math.sin(2 * Math.PI * (rootFreq * 1.5) * t) * 0.12 +
                  Math.sin(2 * Math.PI * (rootFreq * 2) * t) * 0.08) *
                  (0.85 + 0.15 * Math.sin(t * 0.8));

    // Slow ambient wind breath / sea breeze
    const breeze = (Math.sin(t * 0.4) * 0.5 + 0.5) * (Math.random() - 0.5) * 0.04;

    left[i] += bass * 0.9 + breeze;
    right[i] += bass * 0.9 - breeze;
  }

  // 2. Plucked Oud / Kanun arpeggios (rippling like Dardanelles straits waters)
  const arpStep = 0.5; // Every half-second a gentle plucked string
  for (let step = 0; step < duration / arpStep; step++) {
    const startT = step * arpStep;
    const startSample = Math.floor(startT * sampleRate);
    const bar = Math.floor(startT / 8) % 8;
    const scaleBase = bar < 4 ? [146.83, 220.0, 293.66, 349.23, 440.0] : [196.0, 246.94, 293.66, 392.0, 440.0];
    const noteFreq = scaleBase[step % scaleBase.length];
    const decay = 1.4; // 1.4s pluck decay
    const numDecaySamples = Math.floor(decay * sampleRate);
    const pan = 0.35 * Math.sin(step * 0.9);

    for (let j = 0; j < numDecaySamples && (startSample + j) < totalSamples; j++) {
      const idx = startSample + j;
      const tj = j / sampleRate;
      const env = Math.exp(-tj * 3.8);
      // Karplus-strong-like plucked chime with harmonic overtones
      const pluck = (Math.sin(2 * Math.PI * noteFreq * tj) +
                     Math.sin(2 * Math.PI * (noteFreq * 2.01) * tj) * 0.5 +
                     Math.sin(2 * Math.PI * (noteFreq * 3.02) * tj) * 0.25) * env * 0.11;

      left[idx] += pluck * (0.5 - pan);
      right[idx] += pluck * (0.5 + pan);
    }
  }

  // 3. Breathy Ottoman Ney / Flute lead melody (serene, contemplative, heroic)
  // Phrased in 4-second lyrical passages with natural vibrato
  for (let phrase = 0; phrase < 16; phrase++) {
    const phraseStartT = phrase * 4 + 0.8;
    const note = melodyNotes[phrase % melodyNotes.length];
    const noteDur = 3.0; // 3 seconds held note with gentle vibrato and breath
    const startIdx = Math.floor(phraseStartT * sampleRate);
    const len = Math.floor(noteDur * sampleRate);

    for (let k = 0; k < len && (startIdx + k) < totalSamples; k++) {
      const idx = startIdx + k;
      const tk = k / sampleRate;
      // Attack and release envelope
      let env = 1.0;
      if (tk < 0.4) env = tk / 0.4;
      else if (tk > noteDur - 0.6) env = (noteDur - tk) / 0.6;

      // Expressive vibrato (5 Hz, starts after 0.5s)
      const vib = tk > 0.5 ? Math.sin(2 * Math.PI * 5.2 * (tk - 0.5)) * 0.015 : 0;
      const curFreq = note * (1 + vib);

      // Flute timbre: pure sine + gentle odd harmonics + breath noise
      const breath = (Math.random() - 0.5) * 0.035;
      const flute = (Math.sin(2 * Math.PI * curFreq * tk) * 0.7 +
                     Math.sin(2 * Math.PI * (curFreq * 2) * tk) * 0.22 +
                     Math.sin(2 * Math.PI * (curFreq * 3) * tk) * 0.1 + breath) * env * 0.18;

      left[idx] += flute * 0.52;
      right[idx] += flute * 0.48;
    }
  }

  // 4. Soft heartbeat military frame drum / bendir cadence (tempo 60 bpm, every 2s)
  for (let beat = 0; beat < duration; beat += 2.0) {
    const startIdx = Math.floor(beat * sampleRate);
    const drumLen = Math.floor(0.7 * sampleRate);
    for (let d = 0; d < drumLen && (startIdx + d) < totalSamples; d++) {
      const idx = startIdx + d;
      const td = d / sampleRate;
      const env = Math.exp(-td * 6.5);
      const drum = Math.sin(2 * Math.PI * (54 - td * 22) * td) * env * 0.14;
      left[idx] += drum;
      right[idx] += drum;
    }
  }

  // Interleave stereo into unified buffer
  const stereoSamples = new Float32Array(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    // Soft master compression limiter
    stereoSamples[i * 2] = Math.max(-0.95, Math.min(0.95, left[i]));
    stereoSamples[i * 2 + 1] = Math.max(-0.95, Math.min(0.95, right[i]));
  }

  saveAudio('music/main_theme.wav', sampleRate, 2, stereoSamples);
}

// Generate other music and sound effects
function generateAllSfx() {
  const sr = 22050; // Standard 22kHz mono for fast, crisp web sfx

  // 1. Coin Pickup
  {
    const dur = 0.22;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 18);
      s[i] = (Math.sin(2 * Math.PI * 1480 * t) * 0.7 + Math.sin(2 * Math.PI * 2960 * t) * 0.3) * env * 0.6;
    }
    saveAudio('sfx/coin_pickup.wav', sr, 1, s);
  }

  // 2. Coin Drop
  {
    const dur = 0.25;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 22);
      s[i] = Math.sin(2 * Math.PI * (1100 - t * 600) * t) * env * 0.55;
    }
    saveAudio('sfx/coin_drop.wav', sr, 1, s);
  }

  // 3. Coin Pay
  {
    const dur = 0.28;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 16);
      s[i] = (Math.sin(2 * Math.PI * 880 * t) * 0.5 + Math.sin(2 * Math.PI * 1760 * t) * 0.5) * env * 0.6;
    }
    saveAudio('sfx/coin_pay.wav', sr, 1, s);
  }

  // 4. Gunshot Rifle (7.65mm Mauser)
  {
    const dur = 0.55;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const popEnv = Math.exp(-t * 45);
      const crack = (Math.random() - 0.5) * 2 * popEnv;
      const boom = Math.sin(2 * Math.PI * (180 - t * 140) * t) * Math.exp(-t * 12) * 0.8;
      const reverb = (Math.random() - 0.5) * Math.exp(-t * 5) * 0.3;
      s[i] = (crack * 0.8 + boom + reverb) * 0.7;
    }
    saveAudio('sfx/gunshot_rifle.wav', sr, 1, s);
  }

  // 5. Gunshot Machine Gun (Maxim MG08)
  {
    const dur = 0.35;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const crack = (Math.random() - 0.5) * 2 * Math.exp(-t * 60);
      const lowPunch = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 25) * 0.7;
      s[i] = (crack * 0.85 + lowPunch) * 0.75;
    }
    saveAudio('sfx/gunshot_mg.wav', sr, 1, s);
  }

  // 6. Artillery Fire (75mm Krupp Field Battery)
  {
    const dur = 1.2;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const blast = (Math.random() - 0.5) * Math.exp(-t * 20) * 1.2;
      const subRumble = Math.sin(2 * Math.PI * (90 - t * 45) * t) * Math.exp(-t * 4) * 0.9;
      s[i] = Math.max(-1, Math.min(1, (blast + subRumble) * 0.8));
    }
    saveAudio('sfx/artillery_fire.wav', sr, 1, s);
  }

  // 7. Explosion
  {
    const dur = 1.1;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const boom = (Math.random() - 0.5) * Math.exp(-t * 6);
      const low = Math.sin(2 * Math.PI * (80 - t * 40) * t) * Math.exp(-t * 5);
      s[i] = Math.max(-1, Math.min(1, (boom * 0.7 + low * 0.6) * 0.85));
    }
    saveAudio('sfx/explosion.wav', sr, 1, s);
  }

  // 8. Whistle (Commander Assault Whistle / Taarruz Düdüğü)
  {
    const dur = 0.7;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = t < 0.1 ? t / 0.1 : (t > 0.5 ? (0.7 - t) / 0.2 : 1.0);
      const warble = Math.sin(2 * Math.PI * 18 * t) * 60;
      const f1 = 2650 + warble;
      const f2 = 2950 + warble;
      s[i] = (Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * t) * 0.5) * env * 0.55;
    }
    saveAudio('sfx/whistle.wav', sr, 1, s);
  }

  // 9. Bugle Charge (Borazan Hücum Marşı)
  {
    const dur = 1.4;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    const bugleNotes = [392.0, 523.25, 659.25, 783.99]; // G, C, E, G
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.min(3, Math.floor(t / 0.32));
      const f = bugleNotes[noteIdx];
      const nt = t - noteIdx * 0.32;
      const env = nt < 0.05 ? nt / 0.05 : (nt > 0.28 ? (0.32 - nt) / 0.04 : 1.0);
      s[i] = (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * (f * 2) * t) * 0.4) * env * 0.45;
    }
    saveAudio('sfx/bugle_charge.wav', sr, 1, s);
  }

  // 10. Assault Shout (Mehmetçik Allah Allah Nidası)
  {
    const dur = 0.85;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.sin((t / 0.85) * Math.PI);
      const shout = (Math.sin(2 * Math.PI * 165 * t) * 0.4 +
                     Math.sin(2 * Math.PI * 330 * t) * 0.3 +
                     (Math.random() - 0.5) * 0.3) * env * 0.55;
      s[i] = shout;
    }
    saveAudio('sfx/assault_shout.wav', sr, 1, s);
  }

  // 11. Hammer Wood
  {
    const dur = 0.25;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 26);
      s[i] = (Math.sin(2 * Math.PI * 380 * t) + (Math.random() - 0.5) * 0.8) * env * 0.5;
    }
    saveAudio('sfx/hammer_wood.wav', sr, 1, s);
  }

  // 12. Dig (Trench digging)
  {
    const dur = 0.35;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 15);
      s[i] = ((Math.random() - 0.5) * 0.7 + Math.sin(2 * Math.PI * 120 * t) * 0.3) * env * 0.5;
    }
    saveAudio('sfx/dig.wav', sr, 1, s);
  }

  // 13. Tree Fall
  {
    const dur = 1.0;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const crack = t < 0.3 ? (Math.random() - 0.5) * Math.exp(-t * 8) : 0;
      const thud = t >= 0.3 ? Math.sin(2 * Math.PI * 70 * (t - 0.3)) * Math.exp(-(t - 0.3) * 6) * 0.7 : 0;
      s[i] = (crack * 0.6 + thud) * 0.65;
    }
    saveAudio('sfx/tree_fall.wav', sr, 1, s);
  }

  // 14. Radio Chatter (WWI Morse Code & Wireless Intercept)
  {
    const dur = 1.8;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Morse code beeping sequence (dit-dah-dit)
      const toneT = t % 0.45;
      const isBeep = (toneT > 0.04 && toneT < 0.12) || (toneT > 0.18 && toneT < 0.34);
      const morse = isBeep ? Math.sin(2 * Math.PI * 840 * t) * 0.45 : 0;
      const staticNoise = (Math.random() - 0.5) * 0.12;
      s[i] = (morse + staticNoise) * 0.6;
    }
    saveAudio('sfx/radio_chatter.wav', sr, 1, s);
  }

  // 15. Radio Decode (Successful decryption chime)
  {
    const dur = 0.9;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, High C
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.min(3, Math.floor(t / 0.18));
      const f = notes[noteIdx];
      const nt = t - noteIdx * 0.18;
      const env = Math.exp(-nt * 8);
      s[i] = (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * (f * 2) * t) * 0.3) * env * 0.55;
    }
    saveAudio('sfx/radio_decode.wav', sr, 1, s);
  }

  // 16. Armor Equip
  {
    const dur = 0.45;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 14);
      s[i] = (Math.sin(2 * Math.PI * 440 * t) * 0.4 + (Math.random() - 0.5) * 0.6) * env * 0.55;
    }
    saveAudio('sfx/armor_equip.wav', sr, 1, s);
  }

  // 17. Bayonet Clash
  {
    const dur = 0.4;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 22);
      s[i] = (Math.sin(2 * Math.PI * 2200 * t) * 0.5 + (Math.random() - 0.5) * 0.5) * env * 0.6;
    }
    saveAudio('sfx/bayonet_clash.wav', sr, 1, s);
  }

  // 18. Reload (Mauser bolt cycle)
  {
    const dur = 0.5;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const click1 = t < 0.15 ? (Math.random() - 0.5) * Math.exp(-t * 30) : 0;
      const click2 = t >= 0.25 ? (Math.random() - 0.5) * Math.exp(-(t - 0.25) * 30) : 0;
      s[i] = (click1 + click2) * 0.6;
    }
    saveAudio('sfx/reload.wav', sr, 1, s);
  }

  // 19. Gallop
  {
    const dur = 0.35;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 20);
      s[i] = Math.sin(2 * Math.PI * 130 * t) * env * 0.5;
    }
    saveAudio('sfx/gallop.wav', sr, 1, s);
  }

  // 20. Heal
  {
    const dur = 0.6;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.sin((t / 0.6) * Math.PI);
      s[i] = Math.sin(2 * Math.PI * (520 + t * 400) * t) * env * 0.45;
    }
    saveAudio('sfx/heal.wav', sr, 1, s);
  }

  // 21. Commander Hurt
  {
    const dur = 0.4;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 12);
      s[i] = (Math.sin(2 * Math.PI * 110 * t) + (Math.random() - 0.5) * 0.6) * env * 0.6;
    }
    saveAudio('sfx/commander_hurt.wav', sr, 1, s);
  }

  // 22. Victory Fanfare
  {
    const dur = 3.5;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    const notes = [293.66, 392.0, 440.0, 587.33, 783.99]; // D, G, A, D, G
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.min(notes.length - 1, Math.floor(t / 0.65));
      const f = notes[noteIdx];
      const nt = t - noteIdx * 0.65;
      const env = nt < 0.1 ? nt / 0.1 : Math.exp(-nt * 2.2);
      s[i] = (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * (f * 1.5) * t) * 0.3) * env * 0.5;
    }
    saveAudio('music/victory_fanfare.wav', sr, 1, s);
  }

  // 23. Defeat Lament
  {
    const dur = 3.0;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    const notes = [440.0, 392.0, 349.23, 293.66];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const noteIdx = Math.min(notes.length - 1, Math.floor(t / 0.75));
      const f = notes[noteIdx];
      const nt = t - noteIdx * 0.75;
      const env = Math.sin((nt / 0.75) * Math.PI);
      s[i] = Math.sin(2 * Math.PI * f * t) * env * 0.4;
    }
    saveAudio('music/defeat_lament.wav', sr, 1, s);
  }

  // 24. Construction Finish
  {
    const dur = 0.6;
    const len = Math.floor(sr * dur);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 6);
      s[i] = (Math.sin(2 * Math.PI * 659.25 * t) * 0.5 + Math.sin(2 * Math.PI * 1318.5 * t) * 0.5) * env * 0.5;
    }
    saveAudio('sfx/construction_finish.wav', sr, 1, s);
  }
}

console.log('Generating audio assets...');
generateMainTheme();
generateAllSfx();
console.log('All audio assets generated successfully!');
