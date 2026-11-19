/**
 * AmarDokan Real-Time Event & Notification Service
 * Utilizes BroadcastChannel API for 0ms cross-tab event propagation
 * with localStorage event fallback and Web Audio synthesized sound alerts.
 */

const TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9);
const CHANNEL_NAME = 'amardokan_realtime_bus';
const STORAGE_KEY = 'amardokan_sync_event';

class RealtimeService {
  constructor() {
    this.channel = null;
    this.listeners = new Set();
    this.audioCtx = null;

    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            if (event.data && event.data.sourceTabId !== TAB_ID) {
              this.notifyListeners(event.data);
            }
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel initialization failed, falling back to storage events:', e);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.sourceTabId !== TAB_ID) {
              this.notifyListeners(data);
            }
          } catch {
            // ignore
          }
        }
      });
    }
  }

  broadcast(typeOrObj, payload) {
    let msgType = typeOrObj;
    let msgPayload = payload;
    if (typeof typeOrObj === 'object' && typeOrObj !== null) {
      msgType = typeOrObj.type;
      msgPayload = typeOrObj.payload;
    }

    const message = {
      type: msgType,
      payload: msgPayload,
      timestamp: Date.now(),
      sourceTabId: TAB_ID,
    };

    this.notifyListeners(message);

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel postMessage failed:', err);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    } catch {
      // ignore
    }
  }

  notify(type, payload) {
    this.broadcast(type, payload);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(message) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }

  playChime(type = 'order') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'order') {
        // High-pitched cheerful double ding (E6 -> G#6)
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1318.51, now); // E6
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1661.22, now + 0.12); // G#6
        gain2.gain.setValueAtTime(0.28, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.6);
      } else {
        // Soft status chime
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio playback might be restricted by browser policy
    }
  }
}

export const realtimeService = new RealtimeService();
