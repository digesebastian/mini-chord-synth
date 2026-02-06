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

const activeChordKeys = new Set();

const ctxt = new AudioContext();

// CONTROLLER

function initializeAudioContext() {
  const gain = new Tone.Gain(0.4).toDestination()
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

  const chord = Chord.createChord(scale, scaleDegree, chordTransform);

  const chordSemitones = chord.getSemitones()
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // fit all notes in one octave

  const chordRoot = getNodeName(chordSemitones[0])
  const chordThird = getNodeName(chordSemitones[1])
  const chordFifth = getNodeName(chordSemitones[2])

  const outputChord = [chordRoot, chordThird, chordFifth]

  if (chord.seventh !== undefined) {
    outputChord.push(getNodeName(chordSemitones[3]))
  }

  if (chord.ninth !== undefined) {
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

  const chordNotes = getChord(scaleDegree);

  if (currentInstrument === 'Sines') {
    playSynth(chordNotes, sineSynth);
  } else if (currentInstrument === 'Sawtooth') {
    playSynth(chordNotes, sawSynth);
  } else if (currentInstrument === 'Guitar') {
    const scale = scales.get(scaleType);
    const baseChord = scale[scaleDegree];
    const transformedChord = Chord.transformChord(baseChord, chordTransform);

    const chordSemitones = transformedChord.getSemitones()
        .filter(s => s !== undefined)
        .map(s => (s + scaleSemitones));

    guitar.updateChord(chordSemitones);
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
  }
  currentlyPlayingChord = null;
  currentlyPlayingStepInScale = null;
  clearMiniPiano();
}

function playSines(nodes) {
  const bass = nodes[0].replace(/4/g, '3');
  const withBass = [bass].concat(nodes)
  sineSynth.triggerAttackRelease(withBass, "4n");
}

function playSynth(nodes, synth) {
  const bass = nodes[0].replace(/4/g, '3');
  const chord = [bass].concat(nodes)

  let nodesToPlay = chord;
  if (chordIsPlaying()) {
    nodesToPlay = nodesToPlay.filter(n => !currentlyPlayingChord.includes(n));
    const nodesToRelease = currentlyPlayingChord.filter(n => !chord.includes(n));
    synth.triggerRelease(nodesToRelease); // releases currently playing chord
  }

  currentlyPlayingChord = chord;
  setMiniPianoActive(currentlyPlayingChord);
  synth.triggerAttack(nodesToPlay);
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
    showKeyPressed(index)
    play(index);
  }
}

function showKeyPressed(index) {
  const buttons = document.querySelectorAll(".chord-key");
  buttons.forEach(btn => btn.classList.remove("pressed"));
  buttons[index].classList.add("pressed");
}

function showKeyReleased(index) {
  const buttons = document.querySelectorAll(".chord-key");
  buttons[index].classList.remove("pressed");
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
    k.style.setProperty('--x', positions[i].x+"%");
    k.style.setProperty('--y', positions[i].y+"%");
    k.addEventListener("mousedown", async () => {
      showKeyPressed(i)
      await play(i)
    })
    k.addEventListener("mouseup", () => {
      showKeyReleased(i)
      releaseChordKey(i)
    })
    keys.appendChild(k);
  }
}
const positions = [
  {x: 14, y:50},
  {x: 32, y:27},
  {x: 32, y:73},
  {x: 50, y:50},
  {x: 68, y:27},
  {x: 68, y:73},
  {x: 86, y:50}

];

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
    option.textContent = `root: ${k}`;
    dropdown.appendChild(option)
  })
}

function addScaleTypeDropdownOptions() {
  const dropdown = document.getElementById("scale-type-select")

  for (let i = 0; i < scales.size; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `scale: ${scaleNames.get(i)}`;
    dropdown.appendChild(option)
  }
}

function addInstrumentDropdownOptions() {
  const dropdown = document.getElementById("instrument-select")
  for (let i = 0; i < INSTRUMENTS.length; i++) {
    const option = document.createElement("option");
    option.value = INSTRUMENTS[i];
    option.textContent = `instrument: ${INSTRUMENTS[i]}`; 
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
    renderMiniPiano(6,1);
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

// --- MINI PIANO ---
function renderMiniPiano(octaves = 2, baseOctave = 4) {
  const piano = document.getElementById("piano");
  if (!piano) return;

  piano.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "mini-piano";
  piano.appendChild(wrap);

  const WHITE = ["C","D","E","F","G","A","B"];
  const BLACK_AFTER_WHITE = { C:"C#", D:"D#", F:"F#", G:"G#", A:"A#" };

  const whiteW = 14, gap = 2, step = whiteW + gap;
  let whiteIndex = 0;

  for (let o = 0; o < octaves; o++) {
    const octave = baseOctave + o;

    for (const w of WHITE) {
      const el = document.createElement("div");
      el.className = "pkey white";
      el.dataset.note = `${w}${octave}`;   // C4 ... B4, C5 ... B5
      wrap.appendChild(el);

      const bName = BLACK_AFTER_WHITE[w];
      if (bName) {
        const b = document.createElement("div");
        b.className = "pkey black";
        b.dataset.note = `${bName}${octave}`; // C#4 ...
        b.style.left = `${(whiteIndex + 1) * step - 5}px`;
        wrap.appendChild(b);
      }

      whiteIndex++;
    }
  }
}

function setMiniPianoActive(notesWithOctave) {
  // notesWithOctave ["C3","C4","E4","G4"...] 
  document.querySelectorAll("#piano .pkey")
    .forEach(k => k.classList.remove("active", "bass"));

  if (!notesWithOctave?.length) return;

  const [bass, ...chord] = notesWithOctave;

  const bassEl = document.querySelector(`#piano .pkey[data-note="${bass}"]`);
  if (bassEl) bassEl.classList.add("bass");

  chord.forEach(note => {
    const el = document.querySelector(`#piano .pkey[data-note="${note}"]`);
    if (el) el.classList.add("active");
  });
}
function clearMiniPiano() {
  document.querySelectorAll("#piano .pkey")
    .forEach(k => k.classList.remove("active", "bass"));
}

initializeApp();
