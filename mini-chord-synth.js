const ctxt = new AudioContext();

// At the moment hardcode to the C key
const scaleBaseFreq = 523.25

const majorScale = [0, 2, 4, 5, 7, 9, 11]

function playPiano(stepInScale, is_major=true) {
  // just a sound generated with chatgpt
  const now = ctxt.currentTime;
  const number_of_half_steps_above_tonic = majorScale[stepInScale];
  const freq = scaleBaseFreq * (2**(number_of_half_steps_above_tonic/12))

  const osc1 = ctxt.createOscillator();
  const osc2 = ctxt.createOscillator();
  const osc3 = ctxt.createOscillator();
  const gain = ctxt.createGain();
  const filter = ctxt.createBiquadFilter();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc3.type = 'sine';

  osc1.frequency.value = freq;
  let major_minor;
  if (is_major) {
    major_minor = 4
  } else {
    major_minor = 3
  }
  osc2.frequency.value = freq * (2**(major_minor/12));
  osc3.frequency.value = freq * (2**(7/12));

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(6000, now);
  filter.Q.value = 0.7;

  const attack = 0.002;
  const decay = 0.25;
  const sustain = 0.2;
  const release = 0.4;

  const g = gain.gain;
  const velocity = 0.8;
  g.setValueAtTime(0, now);
  g.linearRampToValueAtTime(velocity, now + attack);
  g.linearRampToValueAtTime(velocity * sustain, now + attack + decay);
  g.setTargetAtTime(0.0001, now + attack + decay + 0.8, release);

  osc1.connect(gain);
  osc2.connect(gain);  
  osc3.connect(gain);  
  gain.connect(filter).connect(ctxt.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + 3);
  osc2.stop(now + 3);
  osc3.stop(now + 3);
}
document.getElementById("key1").addEventListener("click", () => playPiano(0, true));
document.getElementById("key2").addEventListener("click", () => playPiano(1, false));
document.getElementById("key3").addEventListener("click", () => playPiano(2, false));
document.getElementById("key4").addEventListener("click", () => playPiano(3, true));
