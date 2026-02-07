import { scales, scaleNames, scaleMap } from "./scales.js";
import { Chord } from "./chord.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";
import { Guitar } from "./guitar.js";
import { setupWorklet } from "./guitar.js";
import { renderMiniPiano, setMiniPianoActive, clearMiniPiano } from "./minipiano.js";
import { startWaveVisualizer } from "./wave-visualizer.js";

import * as Tone from 'https://esm.sh/tone';

// MODEL

// CONSTANTS

const NODE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const TRANSFORMATION_MAP = new Map([
  ['C', 'base'],
  ['N', 'maj/min'],
  ['NE', '7th'],
  ['E', 'maj/min 7th'],
  ['SE', 'maj/min 9th'],
  ['S', 'sus4'],
  ['SW', 'sus2'],
  ['W', 'dim'],
  ['NW', 'aug'],
])

const INSTRUMENTS = ['Sines', 'Sawtooth', 'Guitar'];

// VARIABLES

let joy;

let guitar;

let sineSynth;

let sawSynth;

let scaleSemitones = 0;

let scaleRootSymbol = 'C';

let scaleType = 0;

let scaleChordNames = new Array(7).fill(null);

let chordTransform = 'base';

let currentInstrument = 'Sines';

let isInitialized = false;

let currentlyPlayingChord = null;

let currentlyPlayingStepInScale = null;

const activeChordKeys = new Set();

const ctxt = new AudioContext();

let waveAnalyser;
let waveRafId = null;

// CONTROLLER

function initializeAudioContext() {
  const gain = new Tone.Gain(0.4).toDestination()
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 3,
    attack: 0.1,
    release: 0.5
  }).connect(gain)

  waveAnalyser = new Tone.Analyser("waveform", 1024);

  // compressor -> gain -> destination
  compressor.connect(gain);

  // send the signal to analyser
  compressor.connect(waveAnalyser);

  sineSynth = new Tone.PolySynth(Tone.Synth, {
    envelope: {
      attack: 0.2,
      decay: 0.2,
      sustain: 0.5,
      release: 0.5
    }
  }).connect(compressor);
  sawSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "sawtooth"
    },
    envelope: {
      attack: 0.2,
      decay: 0.2,
      sustain: 0.5,
      release: 0.5
    }
  }).connect(compressor);
}

function updateScaleChordNames() {
  const scale = scales.get(scaleType);
  const scaleToneNames = getScaleToneNames(scale, scaleRootSymbol, scaleSemitones);

  for (let i = 0; i < 7; i++) {
    const triad = Chord.getTriad(scale, i)
    const chordQuality = Chord.getChordName(triad);
    const shortForm = toShortFormChordQuality(chordQuality);

    scaleChordNames[i] = scaleToneNames[i] + shortForm
  }
  updateKeyChordNames();
}

function getScaleToneNames(scale, scaleRootSymbol, scaleSemitones) {
  const cScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const cScaleSemitones = [0, 2, 4, 5, 7, 9, 11];

  const rootSymbolNatural = scaleRootSymbol[0];

  const currentScaleSemitones = scale
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // move notes to same octave

  const indexInCScale = cScale.indexOf(rootSymbolNatural);
  const cScaleRotated = rotateFromIndex(cScale, indexInCScale)
  const cScaleSemitonesRotated = rotateFromIndex(cScaleSemitones, indexInCScale)

  let scaleToneNames = [];
  for (let i = 0; i < 7; i++) {
    let sign = '';

    // modular arithmetic
    const a = currentScaleSemitones[i];
    const b = cScaleSemitonesRotated[i];
    const P = 12;
    const differenceToCScale = ((((a - b) + (P / 2)) % P) + P) % P - (P / 2)
    
    switch (differenceToCScale) {
      case 2:
        sign = '##';
        break;
      case 1:
        sign = '#';
        break;
      case -1:
        sign = 'b';
        break;
      case -2:
        sign = 'bb'
        break;
    }
    scaleToneNames.push(cScaleRotated[i] + sign);
  }

  return scaleToneNames;
}

const rotateFromIndex = (arr, index) => {
  const start = index % arr.length;
  return [...arr.slice(start), ...arr.slice(0, start)];
};

function toShortFormChordQuality(chordQuality) {
  switch (chordQuality) {
    case 'maj':
      return '';
    case 'min':
      return 'm';
    default:
      return chordQuality;
  }
}

function getNodeName(semitones) {
  return NODE_NAMES[semitones] + '4'
}

async function play(scaleDegree) {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true;
  }
  currentlyPlayingStepInScale = scaleDegree;

  const scale = scales.get(scaleType)

  const chord = Chord.createChord(scale, scaleDegree, chordTransform);
  
  const chordSemitones = chord.getSemitones()
    .filter(s => s !== undefined)
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // fit all notes in one octave

  if (currentInstrument === 'Sines') {
    playSynth(chordSemitones, sineSynth);
  } else if (currentInstrument === 'Sawtooth') {
    playSynth(chordSemitones, sawSynth);
  } else if (currentInstrument === 'Guitar') {
    guitar.updateChord(chordSemitones);
    guitar.updateScale(
      scale.map(s => (s + scaleSemitones) % 12)
    );
  }
}

function releaseChordKey(scaleDegree) {
  // only release if the currently playing key is released
  if (scaleDegree !== currentlyPlayingStepInScale) {
    return;
  }

  if (currentInstrument === 'Sines') {
    sineSynth.triggerRelease(currentlyPlayingChord);
  } else if (currentInstrument === 'Sawtooth') {
    sawSynth.triggerRelease(currentlyPlayingChord);
  } if (currentInstrument === 'Guitar' && guitar) {
    guitar.stop();
  }
  currentlyPlayingChord = null;
  currentlyPlayingStepInScale = null;
  clearMiniPiano();
}

function playSynth(semitones, synth) {
  const nodes = semitones.map(s => getNodeName(s))
  
  const root = nodes[0];

  if (nodes.length > 4) {
    // remove root to avoid cluttered chords
    nodes.shift();
  }

  const bass = root.replace(/4/g, '3');
  const chord = [bass].concat(nodes)

  let nodesToPlay = chord;
  if (chordIsPlaying()) {
    nodesToPlay = nodesToPlay.filter(n => !currentlyPlayingChord.includes(n));
    const nodesToRelease = currentlyPlayingChord.filter(n => !chord.includes(n));
    synth.triggerRelease(nodesToRelease);
  }

  currentlyPlayingChord = chord;
  setMiniPianoActive(currentlyPlayingChord);
  synth.triggerAttack(nodesToPlay);
}

function changeScaleRoot(rootSymbol) {
  scaleRootSymbol = rootSymbol;
  scaleSemitones = scaleMap.get(rootSymbol);
  updateScaleChordNames();
  document.getElementById("scale-root-select-label").textContent = "Root: " + rootSymbol;
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(newScale) {
  scaleType = parseInt(newScale);
  updateScaleChordNames();
  document.getElementById("scale-type-select-label").textContent = "Scale: " + scaleNames.get(scaleType);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))

function changeInstrument(instrument) {
  currentInstrument = instrument;
  document.getElementById("instrument-select-label").textContent = "Instrument: " + instrument;
}
document.getElementById("instrument-select").addEventListener("change", (e) => changeInstrument(e.target.value))

const chordKeys = ["a", "w", "s", "d", "r", "f", "g"];
async function handleChordKeyDown(e) {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true;
  }
  const key = e.key.toLowerCase();

  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    e.preventDefault()
    showKeyPressed(index)
    play(index);
  }
}

function handleChordKeyUp(e) {
  const key = e.key.toLowerCase();
  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    showKeyReleased(index)

    releaseChordKey(index);
  }
}

async function handleKeydown(e) {
  if (e.repeat) {
    // ignore keydown if it is fired from holding down a key
    e.preventDefault();
    return
  }
  if (isKeyForJoystick(e.key)) {
    e.preventDefault(); // prevent page scrolling
    const joyStickPos = handleJoystickKeydown(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  } else {
    handleChordKeyDown(e)
  }
}
document.addEventListener("keydown", async (e) => await handleKeydown(e))

function handleKeyup(e) {
  if (isKeyForJoystick(e.key)) {
    e.preventDefault();
    const joyStickPos = handleJoystickKeyup(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
    if (chordIsPlaying()) {
      // update currently playing chord
      play(currentlyPlayingStepInScale);
    }
  } else {
    handleChordKeyUp(e)
  }
}
document.addEventListener("keyup", e => handleKeyup(e))

function chordIsPlaying() {
  return currentlyPlayingChord !== null;
}

// VIEW

function showKeyPressed(index) {
  const buttons = document.querySelectorAll(".chord-key");
  buttons.forEach(btn => btn.classList.remove("pressed"));
  buttons[index].classList.add("pressed");
}

function showKeyReleased(index) {
  const buttons = document.querySelectorAll(".chord-key");
  buttons[index].classList.remove("pressed");
}

function updateKeyChordNames() {
  const keys = document.querySelectorAll(".chord-key");
  for (let i = 0; i < 7; i++) {
    keys[i].textContent = scaleChordNames[i];
  }
}

function addKeys() {
  const keys = document.getElementById("keys");
  for (let i = 0; i < 7; i++) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("chord-key-wrapper");
    wrapper.style.setProperty('--x', positions[i].x + "%");
    wrapper.style.setProperty('--y', positions[i].y + "%");
    
    const k = document.createElement("button");
    k.classList.add("chord-key");
    k.addEventListener("mousedown", async () => {
      showKeyPressed(i)
      await play(i)
    })
    k.addEventListener("mouseup", () => {
      showKeyReleased(i)
      releaseChordKey(i)
    })
    wrapper.appendChild(k);

    keys.appendChild(wrapper);
  }
}
const positions = [
  { x: 14, y: 50 },
  { x: 32, y: 27 },
  { x: 32, y: 73 },
  { x: 50, y: 50 },
  { x: 68, y: 27 },
  { x: 68, y: 73 },
  { x: 86, y: 50 }
];

function addScaleRootDropdownOptions() {
  const dropdown = document.getElementById("scale-root-select")
  scaleMap.forEach((_v, k) => {
    const option = document.createElement("option");
    option.value = k;
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

function addInstrumentDropdownOptions() {
  const dropdown = document.getElementById("instrument-select")
  for (let i = 0; i < INSTRUMENTS.length; i++) {
    const option = document.createElement("option");
    option.value = INSTRUMENTS[i];
    option.textContent = INSTRUMENTS[i];
    dropdown.appendChild(option)
  }
}

function addJoystick() {
  const joyParams = { 
    "internalFillColor": "#3b4cb3",
    "internalStrokeColor": "#292563",
    "externalStrokeColor": "#2a2a33",
    "autoReturnToCenter": true,
  }
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function (stickData) {
    chordTransform = TRANSFORMATION_MAP.get(stickData.cardinalDirection);
    if (joystickDirection.value !== chordTransform) {
      joystickDirection.value = chordTransform;
      if (chordIsPlaying()) {
      // update currently playing chord
      play(currentlyPlayingStepInScale);
    }
    }
  });
}


async function initializeApp() {
  document.addEventListener("click", async () => {
    if (ctxt.state === "suspended") {
      await ctxt.resume();
      console.log("AudioContext resumed");
    }
  }, { once: true });
  initializeAudioContext()

  const canvas = document.getElementById("waveviz");
  startWaveVisualizer(canvas, waveAnalyser);

  addKeys();
  updateScaleChordNames();  
  renderMiniPiano(6,  1);   //6,1 since all chords are in 4th octave, so the base is on 3rd octave
  addScaleRootDropdownOptions();
  addScaleRootDropdownOptions();
  addScaleTypeDropdownOptions();
  addInstrumentDropdownOptions();
  addJoystick();


  try {
    console.log("Starting AudioWorklet setup.");
    await setupWorklet(ctxt);
    console.log("AudioWorklet successfully loaded.");

  guitar = new Guitar(ctxt);
    await guitar.initializeStrings();
    console.log("Guitar strings initialized");
  } catch (err) {
    console.error("error initializing strings:", err);
  }
}

initializeApp();
