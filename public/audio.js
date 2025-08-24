import {state} from './state.js';

//Unused parameter volume  ai!
export function playSound(type, frequency = 440, duration = 0.1, volume = 0.1) {
  if (!state.audioContext) return;
  try {
    const oscillator = state.audioContext.createOscillator();
    const gainNode = state.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(state.audioContext.destination);

    switch (type) {
      case 'shoot':
        oscillator.frequency.setValueAtTime(800, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, state.audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.05, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.05);
        oscillator.type = 'square';
        duration = 0.05;
        break;
      case 'dash':
        oscillator.frequency.setValueAtTime(300, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, state.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.1);
        oscillator.type = 'square';
        duration = 0.1;
        break;
      case 'hit':
        oscillator.frequency.setValueAtTime(200, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, state.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.1);
        oscillator.type = 'sawtooth';
        duration = 0.1;
        break;
      case 'death':
        oscillator.frequency.setValueAtTime(150, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, state.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.3);
        oscillator.type = 'sawtooth';
        duration = 0.3;
        break;
      case 'damage':
        oscillator.frequency.setValueAtTime(100, state.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.2);
        oscillator.type = 'triangle';
        duration = 0.2;
        break;
      case 'upgrade':
        oscillator.frequency.setValueAtTime(400, state.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, state.audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.2);
        oscillator.type = 'sine';
        duration = 0.2;
        break;
    }

    oscillator.start(state.audioContext.currentTime);
    oscillator.stop(state.audioContext.currentTime + duration);
  } catch (e) {
    console.log('Sound playback failed:', e);
  }
}
