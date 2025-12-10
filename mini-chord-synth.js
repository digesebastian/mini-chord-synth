import { scales, scaleNames } from "./scales.js";
import { Chord } from "./chord.js";
import { JoyStick } from "./joystick.js"
import { isKeyForJoystick, handleJoystickKeydown, handleJoystickKeyup } from "./joystick-keyboard.js";
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

const INSTRUMENTS = ['Sines', 'Sawtooth'];


// VARIABLES

let joy;

let sineSynth;

let sawSynth;

let scaleSemitones = 0;

let scaleType = 0;

let chordTransform = 'None';

let currentInstrument = 'Sines';

let isInitialized = false;

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
initializeAudioContext()

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
  if (currentInstrument === 'Sines') {
    playSines(getChord(scaleDegree));
  } else if (currentInstrument === 'Sawtooth') {
    playSawtooth(getChord(scaleDegree));
  }
}

function playSines(nodes) {
  const bass = nodes[0].replace(/4/g, '3');
  const withBass = [bass].concat(nodes)
  sineSynth.triggerAttackRelease(withBass, "4n");
}

function playSawtooth(nodes) {
  const bass = nodes[0].replace(/4/g, '3');
  const withBass = [bass].concat(nodes)
  sawSynth.triggerAttackRelease(withBass, "4n");
}

function changeScaleRoot(root) {
  scaleSemitones = parseInt(root);
}
document.getElementById("scale-root-select").addEventListener("change", (e) => changeScaleRoot(e.target.value))

function changeScaleType(scaleType) {
  scaleType = parseInt(scaleType);
}
document.getElementById("scale-type-select").addEventListener("change", (e) => changeScaleType(e.target.value))

function changeInstrument(instrument) {
  currentInstrument = instrument;
}
document.getElementById("instrument-select").addEventListener("change", (e) => changeInstrument(e.target.value))

const chordKeys = ["a", "s", "d", "f", "g", "h", "j"];
async function handleChordKey(e) {
  if (!isInitialized) {
    await Tone.start()
    isInitialized = true;
  }
  const key = e.key.toLowerCase();

  const index = chordKeys.indexOf(key);
  if (index !== -1) {
    e.preventDefault()
    const buttons = document.querySelectorAll(".chord-key");
    const btn = buttons[index];
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 150);

    btn.click();
  }
}

async function handleKeydown(e) {
  if (e.repeat) {
    return // ignore keydown if it is fired from holding down a key
  }
  if (isKeyForJoystick(e.key)) {
    e.preventDefault(); // prevent page scrolling
    const joyStickPos = handleJoystickKeydown(e.key);
    joy.setPosition(joyStickPos[0], joyStickPos[1])
  } else {
    handleChordKey(e)
  }
}
document.addEventListener("keydown", async (e) => await handleKeydown(e))

function handleKeyup(e) {
  if (isKeyForJoystick(e.key)) {
    e.preventDefault();
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
    k.addEventListener("click", async () => await play(i))
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

addKeys();
addScaleRootDropdownOptions();
addScaleTypeDropdownOptions();
addInstrumentDropdownOptions();
addJoystick();

// ACOUSTIC GUITAR
// check https://www.mathworks.com/help/signal/ug/generate-guitar-chords-using-the-karplus-strong-algorithm.html to understand the code 

// DSP: sample-by-sample IIR filtering (mimicking MATLAB filter funct.)
// check https://nl.mathworks.com/help/matlab/ref/filter.html 
const karplusProcessorScript = `
    class KarplusProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super(options);

            // DSP parameters retreival (delayLength; denominator and numerator coefficients) 
            this.a = options.processorOptions.a_coeffs; 
            this.b = options.processorOptions.b_coeffs; 
            this.delayLength = this.a.length - 1;

            // memory buffer 
            this.y_history = new Array(this.delayLength).fill(0);
            
            // initial random noise (zi)
            const randomZi = options.processorOptions.initial_states;
            if (randomZi) {
                for(let i = 0; i < randomZi.length; i++) {
                    this.y_history[i] = randomZi[i];
                }
            }
            this.amplitude = 1.0; // gain scaling factor
        }

        // sample by sample processing
        process(inputs, outputs, parameters) {
            const output = outputs[0];
            const outChannel = output[0];
            
            if (!outChannel) return true;

            // Feedback calculation
            for (let n = 0; n < outChannel.length; n++) {
                
                let newSample = 0;
                
                const D = this.a.length - 3;

                const idx1 = (this.delayLength - (D + 1)) % this.delayLength;
                const idx2 = (this.delayLength - (D + 2)) % this.delayLength;
                
                // retrieves old samples from the delay
                newSample = (this.y_history[idx1] * 0.5) + (this.y_history[idx2] * 0.5);
                
                outChannel[n] = newSample * this.amplitude;
                
                // updating buffer
                for (let i = 0; i < this.delayLength - 1; i++) {
                    this.y_history[i] = this.y_history[i + 1];
                }
                this.y_history[this.delayLength - 1] = newSample; // Store the newest sample
                
                this.amplitude *= 0.99999; // amp decay 
            }
            return this.amplitude > 0.0001; 
        }
    }
    registerProcessor('karplus-processor', KarplusProcessor);
`;

// transition from the main thread to the DSP thread
async function setupWorklet(audioContext) {
    const blob = new Blob([karplusProcessorScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
        await audioContext.audioWorklet.addModule(url);
    } catch (e) {
        console.error('Error loading Worklet (check browser version/settings):', e.message);
    }
}
setupWorklet(ctxt);

// Karplus-Strong algorithm : single guitar string
class GuitarString {
    constructor(audioCtx, openNoteHz, velocity = 0.8) {
        this.audioCtx = audioCtx;
        this.openNoteHz = openNoteHz; // freq of the open string
        this.velocity = velocity; // pluck strength 
        this.stringTension = 1;  // fine-tune the pitch (simulating the inharmonicity)
        this.Fs = 44100; // sampling freq.
    }

    // calculate the freq from the open note and fret offset (uses equal temperament formula)
    getFrequency(fretOffset) {
        return this.openNoteHz * Math.pow(2, fretOffset / 12);
    }

    // calculating the DSP coefficients 
    getDSPFIR(freq) {
        const delay = Math.round(this.Fs / freq); //delay: pitch determination
        const b_coeffs = [1.0]; // numerator (simplified from matlab code)
        const a_coeffs = new Array(delay + 3).fill(0); // denominator
        a_coeffs[0] = 1.0;
        a_coeffs[delay + 1] = -0.5;
        a_coeffs[delay + 2] = -0.5;
        
        return { delay: delay, a: a_coeffs, b: b_coeffs };
    }

    // initating the string sound:
    pluck(startTime, fretOffset = 0) {
        const freq = this.getFrequency(fretOffset);
        const { delay, a, b } = this.getDSPFIR(freq);

        // generation of initial noise (zi)
        const ziLength = a.length - 1;
        const randomZi = new Array(ziLength).fill(0).map(() => (Math.random() * 2 - 1) * this.velocity);

        // sending parameters to the DSP thread
        const processorNode = new AudioWorkletNode(this.audioCtx, 'karplus-processor', {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            processorOptions: {
                a_coeffs: a,
                b_coeffs: b,
                initial_states: randomZi
            }
        });
        
        // output
        const outputGain = this.audioCtx.createGain();
        outputGain.gain.setValueAtTime(1.0, startTime);
        processorNode.connect(outputGain).connect(this.audioCtx.destination);
        
        setTimeout(() => {
            processorNode.disconnect();
            outputGain.disconnect();
        }, (startTime - this.audioCtx.currentTime + 5.5) * 1000);
    }
}

 // Guitar Chords 
const Guitar = (() => {
    // standard guitar EADGBe tuning 
    // corresponds to the MIDI note numbers: 40, 45, 50, 55, 59, 64
    const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

    const openStringFrets = [
        midiToHz(40), // E2
        midiToHz(45), // A2
        midiToHz(50), // D3
        midiToHz(55), // G3
        midiToHz(59), // B3
        midiToHz(64)  // E4
    ];

    const chordsFretMap = {
        'C': [3, 3, 2, 0, 1, 0], 
        'Dm': [-1, -1, 0, 2, 3, 1], // -1 means chord is muted
        'Em': [0, 2, 2, 0, 0, 0],
        'F': [1, 3, 3, 2, 1, 1], // simplified
        'G': [3, 2, 0, 0, 0, 3],
        'Am': [0, 0, 2, 2, 1, 0],
        //'Bdim': [-1, 2, 0, 3, 0, -1], //simplified
        'Bdim': [-1, 2, 0, 4, 3, 1],
    };

    // initialise the guitar: six separate GuitarString objects
    let strings = [];
    ctxt.audioWorklet.addModule(URL.createObjectURL(new Blob([karplusProcessorScript], { type: 'application/javascript' }))).then(() => {
        strings = openStringFrets.map(hz => new GuitarString(ctxt, hz));
    }).catch(e => {
        console.error("Failed to initialize strings due to Worklet error:", e);
    });

    // playing the chord
    // velocity: velocity of the strumming 
    // timeUnit: simulate delay between successive strings
    function strumChord(chordName, velocity = 0.9, timeUnit = 0.05) {
        if (strings.length === 0) {
            console.warn("Worklet not yet loaded. Please wait and try again.");
            return;
        }

        const fretMap = chordsFretMap[chordName];
        if (!fretMap) {
            console.error(`Chord map not found for: ${chordName}`);
            return;
        }

        const now = ctxt.currentTime;
        let strumTime = now;

        // downstroke simulation
        // loop iterates from index 0 to 5 -> low E to high e
        for (let i = 0; i < 6; i++) {
            const fret = fretMap[i];
            const string = strings[i];

            if (fret !== -1) {
                string.velocity = velocity * (1.0 - Math.random() * 0.1); // velocity variation (randomness)
                string.pluck(strumTime, fret); 
            }

            strumTime += timeUnit + (Math.random() * 0.005); // incrementing time for the next string 
        }
    }

    return {
        strumChord: strumChord,
        chordsFretMap: chordsFretMap
    };
})();

function playChordFromNote(noteName) {
    if (ctxt.state === 'suspended') ctxt.resume();
    
    if (Guitar.chordsFretMap.hasOwnProperty(noteName)) {
        Guitar.strumChord(noteName, 0.9, 0.02); 
    } else {
        console.error(`Chord '${noteName}' not found in map.`);
    }
}

const guitarChordsTest = Object.keys(Guitar.chordsFretMap); 

function addGuitarKeys() {
  const keys = document.getElementById("guitar-keys"); 
  if (!keys) return; 

  for (const chordName of guitarChordsTest) {
    const k = document.createElement("button");
    k.classList.add("chord-key", "guitar-key");
    k.innerText = `Strum ${chordName}`;
    k.addEventListener("click", () => {
        if (ctxt.state === 'suspended') ctxt.resume();
        Guitar.strumChord(chordName);
    });
    keys.appendChild(k);
  }
}
addGuitarKeys();


