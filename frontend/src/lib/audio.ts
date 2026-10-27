// Clinical Audio Synthesizer using Web Audio API
// Generates pleasant, non-intrusive medical cues without external audio asset downloads.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playClinicalSound(type: 'start' | 'step' | 'complete' | 'alert') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'start':
        // Soft ascending notification
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case 'step':
        // Subtle confirmation blip for agent node completion
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.05); // A5
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'complete':
        // Harmonics chord chime for pipeline finalization
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2); // C6
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'alert':
        // Gentle clinical warning
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
    }
  } catch (err) {
    // Non-blocking catch to guarantee audio never interrupts app flow
  }
}
