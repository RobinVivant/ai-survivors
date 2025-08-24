import {state} from './state.js';

export function playSound(type, frequency = 440, duration = 0.1, volume = 0.1) {
  if (!state.audioContext) return;
  try {
    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);

    const ct = state.audioContext.currentTime;
    const volScale = Math.min(2, Math.max(0, volume ?? 0.1) / 0.1);

    switch (type) {
      case 'shoot':
        oscillator.frequency.setValueAtTime(800, ct);
        oscillator.frequency.exponentialRampToValueAtTime(400, ct + 0.05);
        gainNode.gain.setValueAtTime(0.05 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.05);
        oscillator.type = 'square';
        duration = 0.05;
        break;
      case 'dash':
        oscillator.frequency.setValueAtTime(300, ct);
        oscillator.frequency.exponentialRampToValueAtTime(600, ct + 0.1);
        gainNode.gain.setValueAtTime(0.08 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.1);
        oscillator.type = 'square';
        duration = 0.1;
        break;
      case 'hit':
        oscillator.frequency.setValueAtTime(200, ct);
        oscillator.frequency.exponentialRampToValueAtTime(100, ct + 0.1);
        gainNode.gain.setValueAtTime(0.1 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.1);
        oscillator.type = 'sawtooth';
        duration = 0.1;
        break;
      case 'death':
        oscillator.frequency.setValueAtTime(150, ct);
        oscillator.frequency.exponentialRampToValueAtTime(50, ct + 0.3);
        gainNode.gain.setValueAtTime(0.15 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.3);
        oscillator.type = 'sawtooth';
        duration = 0.3;
        break;
      case 'damage':
        oscillator.frequency.setValueAtTime(100, ct);
        gainNode.gain.setValueAtTime(0.2 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.2);
        oscillator.type = 'triangle';
        duration = 0.2;
        break;
      case 'upgrade':
        oscillator.frequency.setValueAtTime(400, ct);
        oscillator.frequency.exponentialRampToValueAtTime(800, ct + 0.2);
        gainNode.gain.setValueAtTime(0.1 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.2);
        oscillator.type = 'sine';
        duration = 0.2;
        break;
      case 'coin':
        oscillator.frequency.setValueAtTime(1000, ct);
        oscillator.frequency.exponentialRampToValueAtTime(1600, ct + 0.06);
        gainNode.gain.setValueAtTime(0.06 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.06);
        oscillator.type = 'triangle';
        duration = 0.06;
        break;
      case 'heal':
        oscillator.frequency.setValueAtTime(500, ct);
        oscillator.frequency.exponentialRampToValueAtTime(900, ct + 0.12);
        gainNode.gain.setValueAtTime(0.06 * volScale, ct);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * volScale, ct + 0.12);
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
