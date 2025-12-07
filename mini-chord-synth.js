import { scales, scaleNames } from "./scales.js";
import { Chord } from "./chord.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";
import * as Tone from "tone";
import { log } from "tone/build/esm/core/util/Debug.js";

// VARIABLES

let joy;

// MODEL

const NODE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

let scaleSemitones = 0;

let scaleType = 0;

let chordTransform = 'None';


// CONTROLLER

function getNodeName(semitones) {
  return NODE_NAMES[semitones] + '4'
}

function getChord(scaleDegree) {
  const scale = scales.get(scaleType);

  const chord = scale[scaleDegree];

  const transformedChord = Chord.transformChord(chord, chordTransform);

  const chordSemitones = transformedChord.getSemitones()
    .map(s => (s + scaleSemitones)) // adjust to current scale
    .map(s => s % 12) // fit all notes in one octave

  const chordRoot = getNodeName(chordSemitones[0])
  const chordThird = getNodeName(chordSemitones[1])
  const chordFifth = getNodeName(chordSemitones[2])

  return [chordRoot, chordThird, chordFifth]
}

function play(scaleDegree) {
  playSines(getChord(scaleDegree));
}

function playSines(nodes) {
  const bass = nodes[0].replace(/4/g, '3');
  const withBass = [bass].concat(nodes)
  var synth = new Tone.PolySynth(Tone.Synth, {
    envelope: {
      attack: 0.1,
      decay: 0.5,
      sustain: 0.4,
      release: 2
    }
  }).toDestination();
  synth.triggerAttackRelease(withBass, "4n");
}

function playPluck(nodes) {
  nodes.forEach(n => {
    const synth = new Tone.PluckSynth().toDestination()
    synth.triggerAttackRelease(n, '4n')
  })
}

function changeScaleRoot(root) {
  scaleSemitones = parseInt(root);
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(scaleType) {
  scaleType = parseInt(scaleType);
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
  const joyParams = { "autoReturnToCenter": false }
  var joystickDirection = document.getElementById("joystick-direction");
  var joystickDivId = 'joy-div';
  joy = new JoyStick(joystickDivId, joyParams, function (stickData) {
    chordTransform = transformationMap.get(stickData.cardinalDirection);
    joystickDirection.value = chordTransform;
  });
}

addKeys();
addScaleRootDropdownOptions();
addScaleTypeDropdownOptions();
addJoystick();
