// Critter Colony - Procedural Sound Effects
// All sounds generated via Web Audio API - no external files needed

class GameSounds {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
        this.muted = false;
        this.volume = 0.5;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            // Preload audio files
            this._preloadAudioFiles();
        } catch (e) {
            console.warn('GameSounds: Web Audio API not available', e);
        }
    }

    _preloadAudioFiles() {
        this._audioBuffers = {};
        this._loadAudioFile('buildingHit', 'audio/Recording.m4a');
    }

    _loadAudioFile(name, url) {
        fetch(url)
            .then(res => res.arrayBuffer())
            .then(buf => this.ctx.decodeAudioData(buf))
            .then(decoded => {
                this._audioBuffers[name] = decoded;
                console.log(`[Sound] Loaded: ${name}`);
            })
            .catch(e => console.warn(`[Sound] Failed to load ${name}:`, e));
    }

    _playBuffer(name, volume = 0.5) {
        if (!this._ensureContext()) return;
        if (!this._audioBuffers || !this._audioBuffers[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this._audioBuffers[name];
        const gain = this._createGain(volume);
        source.connect(gain);
        source.start(0);
    }

    _ensureContext() {
        if (!this.initialized) this.init();
        if (!this.ctx) return false;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
        return this.muted;
    }

    // --- Utility helpers ---

    _createGain(volume = 1) {
        const g = this.ctx.createGain();
        g.gain.value = volume;
        g.connect(this.masterGain);
        return g;
    }

    _createOsc(type, freq, gainNode) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gainNode);
        return osc;
    }

    _createNoise(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    _createFilter(type, freq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = freq;
        return filter;
    }

    // --- Sound effects ---

    /** Short laser/zap pew sound */
    shoot() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;
        const dur = 0.12;

        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        const osc = this._createOsc('square', 880, gain);
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + dur);
        osc.start(t);
        osc.stop(t + dur);

        // Add a short noise burst for texture
        const noiseGain = this._createGain(0);
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        const filter = this._createFilter('bandpass', 3000);
        filter.Q.value = 2;
        filter.connect(noiseGain);

        const noise = this._createNoise(0.05);
        noise.connect(filter);
        noise.start(t);
        noise.stop(t + 0.05);
    }

    /** Impact thump when projectile hits a critter */
    hit() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;
        const dur = 0.15;

        // Low thud
        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        const osc = this._createOsc('sine', 200, gain);
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + dur);
        osc.start(t);
        osc.stop(t + dur);

        // Noise click
        const noiseGain = this._createGain(0);
        noiseGain.gain.setValueAtTime(0.35, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        const filter = this._createFilter('highpass', 1500);
        filter.connect(noiseGain);

        const noise = this._createNoise(0.06);
        noise.connect(filter);
        noise.start(t);
        noise.stop(t + 0.06);
    }

    /** Happy 3-note jingle for capturing a critter */
    capture() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        const noteLen = 0.12;
        const gap = 0.1;

        notes.forEach((freq, i) => {
            const start = t + i * (noteLen + gap);

            // Main tone
            const gain = this._createGain(0);
            gain.gain.setValueAtTime(0.4, start);
            gain.gain.setValueAtTime(0.4, start + noteLen * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, start + noteLen);

            const osc = this._createOsc('triangle', freq, gain);
            osc.start(start);
            osc.stop(start + noteLen);

            // Sparkle overtone
            const gain2 = this._createGain(0);
            gain2.gain.setValueAtTime(0.15, start);
            gain2.gain.exponentialRampToValueAtTime(0.001, start + noteLen * 0.8);

            const osc2 = this._createOsc('sine', freq * 2, gain2);
            osc2.start(start);
            osc2.stop(start + noteLen);
        });

        // Final shimmer chord
        const chordStart = t + notes.length * (noteLen + gap);
        const chordDur = 0.35;
        [783.99, 1046.5, 1318.5].forEach((freq) => {
            const g = this._createGain(0);
            g.gain.setValueAtTime(0.2, chordStart);
            g.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDur);

            const o = this._createOsc('sine', freq, g);
            o.start(chordStart);
            o.stop(chordStart + chordDur);
        });
    }

    /** Construction thud with settling noise */
    build() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // Heavy thud
        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        const osc = this._createOsc('sine', 120, gain);
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);

        // Wood-like knock (bandpassed noise)
        const noiseGain = this._createGain(0);
        noiseGain.gain.setValueAtTime(0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        const filter = this._createFilter('bandpass', 800);
        filter.Q.value = 5;
        filter.connect(noiseGain);

        const noise = this._createNoise(0.08);
        noise.connect(filter);
        noise.start(t);
        noise.stop(t + 0.08);

        // Secondary settling click
        const gain2 = this._createGain(0);
        gain2.gain.setValueAtTime(0.0001, t + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.25, t + 0.1 + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        const filter2 = this._createFilter('bandpass', 1200);
        filter2.Q.value = 3;
        filter2.connect(gain2);

        const noise2 = this._createNoise(0.15);
        noise2.connect(filter2);
        noise2.start(t + 0.1);
        noise2.stop(t + 0.25);
    }

    /** Ascending chime/ding for leveling up */
    levelup() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // Quick ascending arpeggio: C5 E5 G5 C6
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const noteLen = 0.1;
        const gap = 0.06;

        notes.forEach((freq, i) => {
            const start = t + i * (noteLen + gap);

            const gain = this._createGain(0);
            gain.gain.setValueAtTime(0.35, start);
            gain.gain.setValueAtTime(0.35, start + noteLen * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, start + noteLen);

            const osc = this._createOsc('sine', freq, gain);
            osc.start(start);
            osc.stop(start + noteLen);
        });

        // Final bright ring
        const ringStart = t + notes.length * (noteLen + gap);
        const ringDur = 0.5;

        const ringGain = this._createGain(0);
        ringGain.gain.setValueAtTime(0.3, ringStart);
        ringGain.gain.exponentialRampToValueAtTime(0.001, ringStart + ringDur);

        const ringOsc = this._createOsc('sine', 1046.5, ringGain);
        ringOsc.start(ringStart);
        ringOsc.stop(ringStart + ringDur);

        // Harmonic shimmer
        const shimGain = this._createGain(0);
        shimGain.gain.setValueAtTime(0.12, ringStart);
        shimGain.gain.exponentialRampToValueAtTime(0.001, ringStart + ringDur * 0.8);

        const shimOsc = this._createOsc('triangle', 2093, shimGain);
        shimOsc.start(ringStart);
        shimOsc.stop(ringStart + ringDur);
    }

    /** Building hit by enemy — plays recorded audio */
    buildingHit() {
        this._playBuffer('buildingHit', 0.6);
    }

    /** Crash and crumble for building destruction */
    destroy() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;
        const dur = 0.4;

        // Initial crash - loud noise burst
        const crashGain = this._createGain(0);
        crashGain.gain.setValueAtTime(0.6, t);
        crashGain.gain.exponentialRampToValueAtTime(0.15, t + 0.08);
        crashGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        const crashFilter = this._createFilter('lowpass', 3000);
        crashFilter.frequency.setValueAtTime(3000, t);
        crashFilter.frequency.exponentialRampToValueAtTime(300, t + dur);
        crashFilter.connect(crashGain);

        const noise = this._createNoise(dur);
        noise.connect(crashFilter);
        noise.start(t);
        noise.stop(t + dur);

        // Sub-bass rumble
        const bassGain = this._createGain(0);
        bassGain.gain.setValueAtTime(0.5, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        const bassOsc = this._createOsc('sine', 80, bassGain);
        bassOsc.frequency.setValueAtTime(80, t);
        bassOsc.frequency.exponentialRampToValueAtTime(25, t + 0.3);
        bassOsc.start(t);
        bassOsc.stop(t + 0.3);

        // Debris rattle (delayed short bursts)
        for (let i = 0; i < 3; i++) {
            const dStart = t + 0.15 + i * 0.07;
            const dDur = 0.04;

            const dGain = this._createGain(0);
            dGain.gain.setValueAtTime(0.2 - i * 0.05, dStart);
            dGain.gain.exponentialRampToValueAtTime(0.001, dStart + dDur);

            const dFilter = this._createFilter('bandpass', 1500 + i * 500);
            dFilter.Q.value = 4;
            dFilter.connect(dGain);

            const dNoise = this._createNoise(dDur);
            dNoise.connect(dFilter);
            dNoise.start(dStart);
            dNoise.stop(dStart + dDur);
        }
    }

    /** Sacrifice squeal — distressing animal cry */
    sacrifice() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // High-pitched squeal descending
        for (let i = 0; i < 3; i++) {
            const start = t + i * 0.15;
            const g = this._createGain(0);
            g.gain.setValueAtTime(0.5 - i * 0.12, start);
            g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

            const osc = this._createOsc('sawtooth', 1200 - i * 200, g);
            osc.frequency.setValueAtTime(1200 - i * 200, start);
            osc.frequency.exponentialRampToValueAtTime(400 - i * 100, start + 0.2);
            osc.start(start);
            osc.stop(start + 0.2);
        }

        // Low thud at end
        const thudG = this._createGain(0);
        thudG.gain.setValueAtTime(0.4, t + 0.4);
        thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        const thud = this._createOsc('sine', 60, thudG);
        thud.start(t + 0.4);
        thud.stop(t + 0.7);

        // Wet splatter noise
        const splat = this._createGain(0);
        splat.gain.setValueAtTime(0.3, t + 0.45);
        splat.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        const splatF = this._createFilter('lowpass', 800);
        splatF.connect(splat);
        const splatN = this._createNoise(0.15);
        splatN.connect(splatF);
        splatN.start(t + 0.45);
        splatN.stop(t + 0.6);
    }

    /** Horde alert — war horn */
    alert() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // Deep war horn
        const g1 = this._createGain(0);
        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(0.5, t + 0.3);
        g1.gain.setValueAtTime(0.5, t + 1.0);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

        const horn = this._createOsc('sawtooth', 120, g1);
        horn.frequency.setValueAtTime(120, t);
        horn.frequency.linearRampToValueAtTime(160, t + 0.5);
        horn.frequency.setValueAtTime(160, t + 1.0);
        horn.frequency.linearRampToValueAtTime(100, t + 1.5);
        horn.start(t);
        horn.stop(t + 1.5);

        // Second horn slightly delayed + higher
        const g2 = this._createGain(0);
        g2.gain.setValueAtTime(0, t + 0.2);
        g2.gain.linearRampToValueAtTime(0.3, t + 0.5);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

        const horn2 = this._createOsc('sawtooth', 180, g2);
        horn2.frequency.setValueAtTime(180, t + 0.2);
        horn2.frequency.linearRampToValueAtTime(220, t + 0.7);
        horn2.start(t + 0.2);
        horn2.stop(t + 1.3);
    }

    /** Soft footstep sound */
    /** Slash wind swoosh sound */
    slash() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // Quick high-pitched whoosh (filtered noise sweep)
        const g = this._createGain(0);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        const f = this._createFilter('bandpass', 4000);
        f.Q.value = 2;
        f.frequency.setValueAtTime(6000, t);
        f.frequency.exponentialRampToValueAtTime(1000, t + 0.15);
        f.connect(g);

        const n = this._createNoise(0.15);
        n.connect(f);
        n.start(t);
        n.stop(t + 0.15);

        // Subtle tonal swoosh
        const g2 = this._createGain(0);
        g2.gain.setValueAtTime(0.15, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        const osc = this._createOsc('sine', 800, g2);
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    walk() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        // Soft filtered noise tap
        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        const filter = this._createFilter('bandpass', 600);
        filter.Q.value = 2;
        filter.connect(gain);

        const noise = this._createNoise(0.08);
        noise.connect(filter);
        noise.start(t);
        noise.stop(t + 0.08);

        // Subtle low thump
        const thumpGain = this._createGain(0);
        thumpGain.gain.setValueAtTime(0.12, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        const thumpOsc = this._createOsc('sine', 100, thumpGain);
        thumpOsc.frequency.exponentialRampToValueAtTime(50, t + 0.06);
        thumpOsc.start(t);
        thumpOsc.stop(t + 0.06);
    }

    /** UI click sound - bonus utility */
    click() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        const osc = this._createOsc('square', 1000, gain);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.04);
    }

    /** Coin/pickup collect sound - bonus utility */
    collect() {
        if (!this._ensureContext()) return;
        const t = this.ctx.currentTime;

        const gain = this._createGain(0);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        const osc = this._createOsc('sine', 700, gain);
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.15);
    }
}

// Singleton instance
const gameSounds = new GameSounds();
