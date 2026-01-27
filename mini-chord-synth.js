import { scales, scaleNames } from "./scales.js";
import { Chord } from "./chord.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";
import { Guitar } from "./guitar.js";
import { setupWorklet } from "./guitar.js";
import * as Tone from "tone";

// MODEL

// CONSTANTS

const NODE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const TRANSFORMATION_MAP = new Map([
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

const INSTRUMENTS = ['Sines', 'Sawtooth', 'Guitar'];

const GUITAR_SCALE_CHORDS = Object.keys(Guitar.chordsFretMap); // ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'].


// VARIABLES

let joy;

let guitar;

let sineSynth;

let sawSynth;

let scaleSemitones = 0;

let scaleType = 0;

let chordTransform = 'None';

let currentInstrument = 'Sines';

let isInitialized = false;

let currentlyPlayingChord = null;

let currentlyPlayingStepInScale = null;

const ctxt = new AudioContext();

// CONTROLLER

function initializeAudioContext() {
  const gain = new Tone.Gain(0.8).toDestination()
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 3,
    attack: 0.1,
    release: 0.5
  }).connect(gain)
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

function getNodeName(semitones) {
  return NODE_NAMES[semitones] + '4'
}

function getChord(scaleDegree) {
  const scale = scales.get(scaleType);
  const baseChord = scale[scaleDegree];

  const transformedChord = Chord.transformChord(baseChord, chordTransform);

  const chordSemitones = transformedChord.getSemitones()
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // fit all notes in one octave

  const chordRoot = getNodeName(chordSemitones[0])
  const chordThird = getNodeName(chordSemitones[1])
  const chordFifth = getNodeName(chordSemitones[2])

  const outputChord = [chordRoot, chordThird, chordFifth]

  if (transformedChord.seventh) {
    outputChord.push(getNodeName(chordSemitones[3]))
  }

  if (transformedChord.ninth) {
    outputChord.push(getNodeName(chordSemitones[4]))
  }
  
  return outputChord
}

async function play(scaleDegree) {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true;
  }
  currentlyPlayingStepInScale = scaleDegree;

  if (currentInstrument === 'Sines') {
    playSynth(getChord(scaleDegree), sineSynth);
  } else if (currentInstrument === 'Sawtooth') {
    playSynth(getChord(scaleDegree), sawSynth);
  } else if (currentInstrument === 'Guitar') {
    const chordName = GUITAR_SCALE_CHORDS[scaleDegree];
    if (chordName) {
      guitar.strumChord(chordName);
    }
  }
}

function releaseChordKey(scaleDegree) {
  if (scaleDegree !== currentlyPlayingStepInScale) {
    return; // only release if the currently playing key is released
  }

  if (currentInstrument === 'Sines') {
    sineSynth.triggerRelease(currentlyPlayingChord);
  } else if (currentInstrument === 'Sawtooth') {
    sawSynth.triggerRelease(currentlyPlayingChord);
  }
  currentlyPlayingChord = null;
  currentlyPlayingStepInScale = null;
}

function playSynth(nodes, synth) {
  if (chordIsPlaying()) {
    synth.triggerRelease(currentlyPlayingChord); // releases currently playing chord
  }
  const bass = nodes[0].replace(/4/g, '3');
  const withBass = [bass].concat(nodes)
  currentlyPlayingChord = withBass;
  synth.triggerAttack(withBass);
}

function changeScaleRoot(root) {
  scaleSemitones = parseInt(root);
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(newScale) {
  scaleType = parseInt(newScale);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))

function changeInstrument(instrument) {
  currentInstrument = instrument;
}
document.getElementById("instrument-select").addEventListener("change", (e) => changeInstrument(e.target.value))

const chordKeys = ["a", "s", "d", "f", "g", "h", "j"];
async function handleChordKeyDown(e) {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true;
  }
  const key = e.key.toLowerCase();

  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    e.preventDefault()
    const buttons = document.querySelectorAll(".chord-key");
    buttons.forEach(btn => btn.classList.remove("pressed"));
    buttons[index].classList.add("pressed");

    play(index);
  }
}

function handleChordKeyUp(e) {
  const key = e.key.toLowerCase();
  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    const buttons = document.querySelectorAll(".chord-key");
    buttons[index].classList.remove("pressed");

    releaseChordKey(index);
  }
}

async function handleKeydown(e) {
  e.preventDefault(); // prevent page scrolling
    if (e.repeat) {
      return // ignore keydown if it is fired from holding down a key
    }
  if (isKeyForJoystick(e.key)) {
    const joyStickPos = handleJoystickKeydown(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
    if (chordIsPlaying()) {
      // update currently playing chord
      play(currentlyPlayingStepInScale);
    }
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

function addKeys() {
  const keys = document.getElementById("keys");
  for (let i = 0; i < 7; i++) {
    const k = document.createElement("button");
    k.classList.add("chord-key");
    k.addEventListener("mousedown", async () => await play(i))
    k.addEventListener("mouseup", () => releaseChordKey(i))
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
  const joyParams = { "autoReturnToCenter": false }
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function (stickData) {
    chordTransform = TRANSFORMATION_MAP.get(stickData.cardinalDirection);
    joystickDirection.value = chordTransform;
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

  addKeys();
  addScaleRootDropdownOptions();
  addScaleTypeDropdownOptions();
  addInstrumentDropdownOptions();
  addJoystick();


  await setupWorklet(ctxt);

  guitar = new Guitar(ctxt);
  guitar.initializeStrings();
}

initializeApp();