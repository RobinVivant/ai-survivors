import {state} from './state.js';

export function playSound(type, frequency = 440, duration = 0.1, volume = 1.0) {
  if (!state.audioContext) return;
  try {
    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    oscillator.connect(gainNode);

    const ct = state.audioContext.currentTime;
    const volScale = Math.max(0, Math.min(2, (volume ?? 1)));

    const BASE_GAIN = {
      shoot: 0.06, dash: 0.07, hit: 0.07, death: 0.09,
      damage: 0.09, upgrade: 0.075, coin: 0.05, heal: 0.055,
    };
    const base = (t) => BASE_GAIN[t] ?? 0.06;

    const sfxBus = state.audioNodes?.sfxGain || state.audioContext.destination;
    gainNode.connect(sfxBus);

    switch (type) {
      case 'shoot':
        oscillator.frequency.setValueAtTime(800, ct);
        oscillator.frequency.exponentialRampToValueAtTime(400, ct + 0.05);
        {
          const g0 = base('shoot') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.45), ct + 0.05);
        }
        oscillator.type = 'square';
        duration = 0.06;
        break;
      case 'dash':
        oscillator.frequency.setValueAtTime(300, ct);
        oscillator.frequency.exponentialRampToValueAtTime(600, ct + 0.1);
        {
          const g0 = base('dash') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.4), ct + 0.1);
        }
        oscillator.type = 'square';
        duration = 0.12;
        break;
      case 'hit':
        oscillator.frequency.setValueAtTime(200, ct);
        oscillator.frequency.exponentialRampToValueAtTime(100, ct + 0.1);
        {
          const g0 = base('hit') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.45), ct + 0.1);
        }
        oscillator.type = 'sawtooth';
        duration = 0.11;
        break;
      case 'death':
        oscillator.frequency.setValueAtTime(150, ct);
        oscillator.frequency.exponentialRampToValueAtTime(50, ct + 0.3);
        {
          const g0 = base('death') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.4), ct + 0.3);
        }
        oscillator.type = 'sawtooth';
        duration = 0.3;
        break;
      case 'damage':
        oscillator.frequency.setValueAtTime(100, ct);
        {
          const g0 = base('damage') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.2), ct + 0.2);
        }
        oscillator.type = 'triangle';
        duration = 0.18;
        break;
      case 'upgrade':
        oscillator.frequency.setValueAtTime(400, ct);
        oscillator.frequency.exponentialRampToValueAtTime(800, ct + 0.2);
        {
          const g0 = base('upgrade') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.2), ct + 0.2);
        }
        oscillator.type = 'sine';
        duration = 0.2;
        break;
      case 'coin':
        oscillator.frequency.setValueAtTime(1000, ct);
        oscillator.frequency.exponentialRampToValueAtTime(1600, ct + 0.06);
        {
          const g0 = base('coin') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.2), ct + 0.06);
        }
        oscillator.type = 'triangle';
        duration = 0.07;
        break;
      case 'heal':
        oscillator.frequency.setValueAtTime(500, ct);
        oscillator.frequency.exponentialRampToValueAtTime(900, ct + 0.12);
        {
          const g0 = base('heal') * volScale;
          gainNode.gain.setValueAtTime(g0, ct);
          gainNode.gain.exponentialRampToValueAtTime(Math.max(1e-4, g0 * 0.2), ct + 0.12);
        }
        oscillator.type = 'sine';
        duration = 0.12;
        break;
      default:
        oscillator.frequency.setValueAtTime(frequency, ct);
        gainNode.gain.setValueAtTime(0.1 * volScale, ct);
        oscillator.type = 'sine';
        break;
    }

    oscillator.start(ct);
    oscillator.stop(ct + duration);
    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch {
      }
    };
  } catch (e) {
    console.log('Sound playback failed:', e);
  }
}
