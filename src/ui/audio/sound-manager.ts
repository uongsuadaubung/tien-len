declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Web Audio API Synthesizer - Tạo hiệu ứng âm thanh chân thực không cần file ngoài
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Âm thanh đánh bài xuống chiếu "Chát"
  public playCardSlap() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Âm thanh Chặt Heo / Chặt Hàng "BÙM / RẦM"
  public playChop() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    // Tiếng nổ trầm
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);

    gain1.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.45);

    // Tiếng chuông vàng kim
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, this.ctx.currentTime + 0.05);
    osc2.frequency.setValueAtTime(1174.66, this.ctx.currentTime + 0.15);

    gain2.gain.setValueAtTime(0.5, this.ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(this.ctx.currentTime + 0.05);
    osc2.stop(this.ctx.currentTime + 0.55);
  }

  // Âm thanh Bỏ Lượt "Vút"
  public playPass() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // Âm thanh Chia bài vút nhẹ & đanh "Tách / Phựt"
  public playCardDeal(pitchVariance: number = 0) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    // Tiếng vút giấy nhanh (noise sweep)
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = 1800 + pitchVariance * 120;
    filter.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.04);

    // Tiếng gõ bàn đanh nhẹ
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280 + pitchVariance * 25, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.035);

    oscGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.start();
    osc.start();
    osc.stop(this.ctx.currentTime + 0.045);
  }

  // Âm thanh Xào bài / Riffle xốp bài mượt mà
  public playShuffle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const duration = 0.32;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.16);
    filter.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + duration);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start();
  }

  // Âm thanh Chiến Thắng / Tết Hoan Ca
  public playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  // Âm thanh Tìm Thấy Trận Đấu "Tưng tưng tưng TONG!"
  public playMatchFound() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  }

  // Âm thanh Thất Bại / Về Bét "Tò te tí te..."
  public playDefeat() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [329.63, 293.66, 261.63, 220.00]; // E4, D4, C4, A3 (âm điệu trầm buồn)
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = this.ctx!.currentTime + idx * 0.16;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

export const soundManager = new SoundManager();
