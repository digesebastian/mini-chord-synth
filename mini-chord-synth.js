function playSound(freq = 440, velocity = 0.8) {
  // just a sound generated with chatgpt
  const now = ctxt.currentTime;

  const osc1 = ctxt.createOscillator();
  const osc2 = ctxt.createOscillator();
  const osc3 = ctxt.createOscillator();
  const gain = ctxt.createGain();
  const filter = ctxt.createBiquadFilter();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc2.detune.value = 3;      // slight detune for richness

  osc1.frequency.value = freq;
  osc2.frequency.value = freq * (2**(4/12));
  osc3.frequency.value = freq * (2**(8/12));

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(6000, now);
  filter.Q.value = 0.7;

  const attack = 0.002;
  const decay = 0.25;
  const sustain = 0.2;
  const release = 0.4;

  const g = gain.gain;
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
