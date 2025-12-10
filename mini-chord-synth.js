import { scales, scaleNames } from "./scales.js";
import { Chord } from "./chord.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";

// VARIABLES

const ctxt = new AudioContext();
let joy;

// MODEL

const baseFreq = 261.63 // C4

let scaleSemitones = 0;

let scale_type = 0;

let chord_transform = 'None';

// CONTROLLER

function modulate(semitones) {
  return baseFreq * (2 ** (semitones / 12))
}

function getChordFreqs(scaleDegree) {
  const scale = scales.get(scale_type);

  const chord = scale[scaleDegree];
  
  const transformedChord = Chord.transformChord(chord, chord_transform);
  
  const chordSemitones = transformedChord.getSemitones()
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // fit all notes in one octave

  const chordRoot = modulate(chordSemitones[0])
  const chordThird = modulate(chordSemitones[1])
  const chordFifth = modulate(chordSemitones[2])

  return [chordRoot, chordThird, chordFifth]
}

function play(scaleDegree) {
  const chordFrequencies = getChordFreqs(scaleDegree)
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
  scaleSemitones = parseInt(root);
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(scaleType) {
  scale_type = parseInt(scaleType);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))

const chordKeys = ["a", "s", "d", "f", "g", "h", "j"];
function handleChordKey(e) {
  const key = e.key.toLowerCase();

  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    e.preventDefault()
    const buttons = document.querySelectorAll(".chord-key");
    const btn = buttons[index];
    // pressed görünümü
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 150);

    // sesi çal
    btn.click();  
  }
}

function handleKeydown(e) {
  if (e.repeat) {
    // ignore keydown if it is fired from holding down a key
    return
  }
  if (isKeyForJoystick(e.key)) {
    const joyStickPos = handleJoystickKeydown(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  } else {
    handleChordKey(e)
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

const transformationMap = new Map([
  ['C', 'None'],
  ['N', 'maj/min'],
  ['NE', '7th'],
  ['E', 'maj/min 7th'],
  ['SE', 'maj/min 9th'],
  ['S', 'sus4'],
  ['SW', 'sus2'],
  ['W', 'dim'],
  ['NW', 'aug'],
])
function addJoystick() {
  const joyParams = {"autoReturnToCenter": false}
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function(stickData) {
    chord_transform = transformationMap.get(stickData.cardinalDirection);     
    joystickDirection.value = chord_transform;
  });
}

addKeys();
addScaleRootDropdownOptions();
addScaleTypeDropdownOptions();
addJoystick();
