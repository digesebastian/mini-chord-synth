import { scales, scaleNames } from "./scales.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";

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

function play(stepInScale) {
  const chordFrequencies = getChordFreqs(stepInScale)
  playPiano(chordFrequencies);
}

function playPiano(frequencies) {
  const now = ctxt.currentTime;

  const oscs = [];
  frequencies.forEach(f => {
    const osc = ctxt.createOscillator();
    osc.type = 'sine'
    osc.frequency.value = f
    oscs.push(osc)
  })

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

  oscs.forEach(o => o.connect(gain))
  gain.connect(filter).connect(ctxt.destination);
  
  oscs.forEach(o => o.start(now))
  oscs.forEach(o => o.stop(now + 3))
}

function changeScaleRoot(root) {
  scale_base_freq = modulate(C_frequency, root)
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(scaleType) {
  scale_type = parseInt(scaleType);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))

function handleKeydown(e) {
  if (e.repeat) {
    // ignore keydown if it is fired from holding down a key
    return
  }
  if (isKeyForJoystick(e.key)) {
    const joyStickPos = handleJoystickKeydown(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  }
}
document.addEventListener("keydown", e => handleKeydown(e))

function handleKeyup(e) {
  if (isKeyForJoystick(e.key)) {
    const joyStickPos = handleJoystickKeyup(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  }
}
document.addEventListener("keyup", e => handleKeyup(e))


// VIEW

function addKeys() {
  const keys = document.getElementById("keys");
  for (let i = 0; i < 7; i++) {
    const k = document.createElement("button");
    k.classList.add("chord-key");
    k.addEventListener("click", () => play(i))
    keys.appendChild(k);
  }
}

const keyBindings = ["a", "s", "d", "f", "g", "h", "j"];

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  const index = keyBindings.indexOf(key);
  if (index !== -1) {
    event.preventDefault()
    const buttons = document.querySelectorAll(".chord-key");
    const btn = buttons[index];

    // pressed görünümü
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 150);

    // sesi çal
    btn.click();  
  }
});




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

const extensionMap = new Map([
  ['C', 'None'],
  ['N', 'TODO maj/min'],
  ['NE', 'TODO 7th'],
  ['E', 'TODO maj/min 7th'],
  ['SE', 'TODO maj/min 9th'],
  ['S', 'TODO sus4'],
  ['SW', 'TODO sus2'],
  ['W', 'TODO dim'],
  ['NW', 'TODO aug'],
])
function addJoystick() {
  const joyParams = {"autoReturnToCenter": true}
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function(stickData) {
    joystickDirection.value = extensionMap.get(stickData.cardinalDirection);
  });
}

addKeys();
addScaleRootDropdownOptions();
addScaleTypeDropdownOptions();
addJoystick();
