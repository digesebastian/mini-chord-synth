const ctxt = new AudioContext();


function playPiano(freq = 523.25, is_major=true) {
  // just a sound generated with chatgpt
  const now = ctxt.currentTime;

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
document.getElementById("key1").addEventListener("click", () => playPiano(523.25, true));
document.getElementById("key2").addEventListener("click", () => playPiano(587.33, false));

// simple plugged string
// I used Karplus-Strong algoirthm:
// known for making realistic plucked-string sounds
// (check the notes i sent it's in it or ytb video)
function playAcousticGuitar(freq = 440) {
  const now = ctxt.currentTime;

  const delay = ctxt.createDelay();
  const feedback = ctxt.createGain();
  //const filter = ctxt.createBiquadFilter();
  const lowpass = ctxt.createBiquadFilter();
  const highpass = ctxt.createBiquadFilter();
  const noise = ctxt.createBufferSource();


  // white noise 
  const buffer = ctxt.createBuffer(1, ctxt.sampleRate, ctxt.sampleRate);
  const data = buffer.getChannelData(0);
  const velocity = 1.2;
  for (let i = 0; i < data.length; i++) {
    //data[i] = (Math.random() * 2 - 1)*velocity;
    let sample =  (Math.random() * 2 - 1)*velocity;
    data[i] = Math.tanh(sample);
  }
  noise.buffer = buffer;

  // delay 
  delay.delayTime.value = 1 / freq * (1 + Math.random() * 0.001);

  // LP - damping
  //filter.type = "lowpass";
  lowpass.type ="lowpass";
  lowpass.frequency.value = 5000;
  //filter.frequency.value = 7000;
  //filter.Q.value = 0.5;

  highpass.type = "highpass";
  highpass.frequency.value = 80;


  feedback.gain.value = 0.8; //sustain

  noise.connect(delay);
  //delay.connect(filter);
  delay.connect(lowpass);
  lowpass.connect(highpass);
  highpass.connect(feedback);
  //filter.connect(feedback);
  feedback.connect(delay);
  //filter.connect(ctxt.destination);

  //Body resonance 
  const body = ctxt.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = 200; 
  body.Q.value = 1.5;   

  //filter.connect(body);
  highpass.connect(body);
  body.connect(ctxt.destination);

  noise.start(now);
  noise.stop(now + 0.01);
}

document.getElementById("gkey1").addEventListener("click", () => playAcousticGuitar(523.25));
document.getElementById("gkey2").addEventListener("click", () => playAcousticGuitar(587.33));
document.getElementById("gkey3").addEventListener("click", () => playAcousticGuitar(659.25));
document.getElementById("gkey4").addEventListener("click", () => playAcousticGuitar(698.46));
document.getElementById("gkey5").addEventListener("click", () => playAcousticGuitar(783.99));
document.getElementById("gkey6").addEventListener("click", () => playAcousticGuitar(880.00));
document.getElementById("gkey7").addEventListener("click", () => playAcousticGuitar(987.77));
document.getElementById("gkey8").addEventListener("click", () => playAcousticGuitar(1046.50));


// creating triad generator
function playAcousticGuitarChord(rootFreq = 440, is_major = true, strumTime = 0.03) {
  const now = ctxt.currentTime;

  const major_minor_semitones = is_major ? 4 : 3;
  const chordFrequencies = [
    rootFreq,
    rootFreq * 2 ** (major_minor_semitones / 12),
    rootFreq * 2 ** (7 / 12)
  ];


  chordFrequencies.forEach((freq,i) => {
    const delay = ctxt.createDelay();
    const feedback = ctxt.createGain();
    const lowpass = ctxt.createBiquadFilter();
    const highpass = ctxt.createBiquadFilter();
    const noise = ctxt.createBufferSource();

    // white noise
    const buffer = ctxt.createBuffer(1, ctxt.sampleRate, ctxt.sampleRate);
    const data = buffer.getChannelData(0);
    const velocity = 0.6 + Math.random() * 0.2;
    for (let j = 0; j < data.length; j++) {
      data[j] = Math.tanh((Math.random() * 2 - 1) * velocity); 
    }
    noise.buffer = buffer;

    // delay 
    delay.delayTime.value = 1 / freq * (1 + (Math.random() - 0.5) * 0.002);

    // frequency-dependent damping
    lowpass.type = "lowpass";
    lowpass.frequency.value = 5000;

    highpass.type = "highpass";
    highpass.frequency.value = 80;

    feedback.gain.value = 0.8; // sustain

    noise.connect(delay);
    delay.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(feedback);
    feedback.connect(delay);

    const body = ctxt.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = 200 + i * 50;
    body.Q.value = 1.5;

    highpass.connect(body);
    body.connect(ctxt.destination);

    const strumOffset = i * strumTime;
    noise.start(now + strumOffset);
    noise.stop(now + strumOffset + 0.08);
  });
}
document.getElementById("g2key1").addEventListener("click", () => playAcousticGuitarChord(523.25, false));