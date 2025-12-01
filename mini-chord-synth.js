import { scales, scaleNames } from "./scales.js";
import { JoyStick } from "./joystick.js"

// VARIABLES

const ctxt = new AudioContext();
let joy;

// MODEL
const C_frequency = 261.63

let scale_base_freq = C_frequency

let scale_type = 0;

// CONTROLLER

function modulate(baseFreq, semitones) {
  return baseFreq * (2 ** (semitones / 12))
}

function getChordFreqs(stepInScale) {
  const scale = scales.get(scale_type);

  const chord = scale[stepInScale];
  const chordRoot = modulate(scale_base_freq, chord[0])
  const chordThird = modulate(scale_base_freq, chord[1])
  const chordFifth = modulate(scale_base_freq, chord[2])

  return [chordRoot, chordThird, chordFifth]
}

function playPiano(stepInScale) {
  const now = ctxt.currentTime;
  const chordFreqs = getChordFreqs(stepInScale);

  const osc1 = ctxt.createOscillator();
  const osc2 = ctxt.createOscillator();
  const osc3 = ctxt.createOscillator();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc3.type = 'sine';

  osc1.frequency.value = chordFreqs[0];
  osc2.frequency.value = chordFreqs[1];
  osc3.frequency.value = chordFreqs[2];

  const gain = ctxt.createGain();
  const filter = ctxt.createBiquadFilter();

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

function changeScaleRoot(root) {
  scale_base_freq = modulate(C_frequency, root)
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(scaleType) {
  scale_type = parseInt(scaleType);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))


// VIEW

function addKeys() {
  const keys = document.getElementById("keys");
  for (let i = 0; i < 7; i++) {
    const k = document.createElement("button");
    k.classList.add("chord-key");
    k.addEventListener("click", () => playPiano(i))
    keys.appendChild(k);
  }
}

function addScaleRootDropdownOptions() {
  // scale names and number of semitones above C
  const scaleMap = new Map([
    ['C', 0],
    ['C#', 1],
    ['Db', 1],
    ['D', 2],
    ['D#', 3],
    ['Eb', 3],
    ['E', 4],
    ['F', 5],
    ['F#', 6],
    ['Gb', 6],
    ['G', 7],
    ['G#', 8],
    ['Ab', 8],
    ['A', 9],
    ['A#', 10],
    ['Bb', 10],
    ['B', 11]
  ]);

  const dropdown = document.getElementById("scale-root-select")
  scaleMap.forEach((v, k) => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = k;
    dropdown.appendChild(option)
  })
}

function addScaleTypeDropdownOptions() {
  const dropdown = document.getElementById("scale-type-select")
  
  for (let i = 0; i < scales.size; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = scaleNames.get(i);
    dropdown.appendChild(option)
  }
}

function addJoystick() {
  const joyParams = {"autoReturnToCenter": true}
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function(stickData) {
    joystickDirection.value = stickData.cardinalDirection;
  });
}

const joystickKeyMap = new Map([
  ['1', [50, 150]],
  ['2', [100, 150]],
  ['3', [150, 150]],
  ['4', [50, 100]],
  ['5', [100, 100]],
  ['6', [150, 100]],
  ['7', [50, 50]],
  ['8', [100, 50]],
  ['9', [150, 50]], 
])
function handleKeydown(event) {
  const joyStickPos = joystickKeyMap.get(event.key); 

  if (joyStickPos != undefined) {
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  }
}
document.addEventListener("keydown", e => handleKeydown(e))
function handleKeyup(event) {
  const joyStickPos = joystickKeyMap.get(event.key); 

  if (joyStickPos != undefined) {
    joy.setPosition(100, 100)
  }
}
document.addEventListener("keyup", e => handleKeyup(e))


addKeys();
addScaleRootDropdownOptions();
addScaleTypeDropdownOptions();
addJoystick();
