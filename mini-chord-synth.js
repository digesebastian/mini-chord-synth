const ctxt = new AudioContext();

// At the moment hardcode to the C key
const scaleBaseFreq = 523.25

const majorScale = [0, 2, 4, 5, 7, 9, 11]

const chordsInMajorScale = [
  [4, 7],
  [3, 7],
  [3, 7],
  [4, 7],
  [4, 7],
  [3, 7],
  [3, 6]
]

function playPiano(stepInScale) {
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
  const third_note_in_chord = chordsInMajorScale[stepInScale][0]
  const fifth_note_in_chord = chordsInMajorScale[stepInScale][1]
  osc2.frequency.value = freq * (2**(third_note_in_chord/12));
  osc3.frequency.value = freq * (2**(fifth_note_in_chord/12));

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

function addKeys() {
  const keys = document.getElementById("keys");
  for (let i = 0; i < 7; i++) {
    const k = document.createElement("button");
    k.classList.add("chord-key");
    k.addEventListener("click", () => playPiano(i))
    keys.appendChild(k);
  }
}

addKeys();
