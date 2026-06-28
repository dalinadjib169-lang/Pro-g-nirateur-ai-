export class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTabClick() {
    try {
      this.init();
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx!.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx!.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.1);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }

  playGenerateStart() {
    try {
      this.init();
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, this.ctx!.currentTime);
      osc.frequency.linearRampToValueAtTime(600, this.ctx!.currentTime + 0.3);
      gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx!.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start();
      osc.stop(this.ctx!.currentTime + 0.3);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }

  playGenerateComplete() {
    try {
      this.init();
      const now = this.ctx!.currentTime;
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playNote(523.25, now, 1);       // C5
      playNote(659.25, now + 0.1, 1); // E5
      playNote(783.99, now + 0.2, 1); // G5
      playNote(1046.50, now + 0.3, 1.5); // C6
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }
}

export const soundManager = new SoundManager();
