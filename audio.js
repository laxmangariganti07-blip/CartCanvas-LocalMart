/**
 * CartCanvas: LocalMart Linkup - Web Audio API Chime Synthesizer
 * Provides robust, offline, zero-dependency audio notifications for merchants and customers.
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.init();
    }

    init() {
        // AudioContext is initialized on first user interaction to comply with browser autoplay policies
        const unlock = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Loud distinct multi-tone chime for incoming merchant orders
     */
    playOrderChime() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Notes: G4 (392.00), C5 (523.25), E5 (659.25), G5 (783.99)
        const notes = [
            { freq: 392.00, start: 0.00, dur: 0.25 },
            { freq: 523.25, start: 0.12, dur: 0.28 },
            { freq: 659.25, start: 0.24, dur: 0.32 },
            { freq: 783.99, start: 0.36, dur: 0.70 }
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            gain.gain.setValueAtTime(0.001, now + n.start);
            gain.gain.exponentialRampToValueAtTime(0.45, now + n.start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });
    }

    /**
     * Crisp positive chime for order milestones / status updates
     */
    playStatusChime() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [
            { freq: 587.33, start: 0.0, dur: 0.2 }, // D5
            { freq: 880.00, start: 0.12, dur: 0.4 }  // A5
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            gain.gain.setValueAtTime(0.001, now + n.start);
            gain.gain.exponentialRampToValueAtTime(0.3, now + n.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });
    }

    /**
     * Soft click / cart add sound
     */
    playClick() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
}

window.soundFx = new SoundEffects();
