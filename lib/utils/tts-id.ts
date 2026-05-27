export function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function speakText(text: string, voiceName: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  if (voiceName) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === voiceName);
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
}
