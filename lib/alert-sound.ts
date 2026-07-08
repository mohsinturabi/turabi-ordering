// A short two-tone chime, synthesized rather than loaded from a file so
// there's nothing extra to host or fetch. Browsers block audio until a
// user gesture has occurred on the page — hence `unlock()`, called from a
// button tap, which the dashboard shows until the first interaction happens.

let audioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playNewOrderChime(): void {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  [880, 1175].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}
