// ACOUSTIC GUITAR
// check https://www.mathworks.com/help/signal/ug/generate-guitar-chords-using-the-karplus-strong-algorithm.html to understand the code 

// DSP: sample-by-sample IIR filtering (mimicking MATLAB filter funct.)
// check https://nl.mathworks.com/help/matlab/ref/filter.html 

// const ctxt = new AudioContext();

const karplusProcessorScript = `
    class KarplusProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super(options);

            this.y_history = new Float32Array(2000).fill(0); // buffer
            this.delayLength = 0;
            this.amplitude = 0;
            this.pointer = 0;

            this.port.onmessage = (e) => {
                if (e.data.type === 'PLUCK') {
                    const zi = e.data.zi;
                    this.delayLength = e.data.delayLength;
                    // resetting buffer with new noise for specific pitch
                    for (let i = 0; i < zi.length; i++) {
                        this.y_history[i] = zi[i];
                    }
                    this.amplitude = e.data.velocity || 1.0;
                    this.pointer = 0;
                }
            };
        }

        process(inputs, outputs) {
            const output = outputs[0];
            const outChannel = output[0];
            if (this.amplitude <= 0.0001 || this.delayLength === 0) return true;

            for (let n=0; n < outChannel.length; n++) {
                const D = this.delayLength;
                // feedback 
                const idx1 = (this.pointer) % D;
                const idx2 = (this.pointer + 1) % D;

                // karplus strong feedback loop
                let newSample = (this.y_history[idx1] * 0.5) + (this.y_history[idx2] * 0.5);
                outChannel[n] = newSample * this.amplitude;
                this.y_history[this.pointer % D] = newSample;

                this.pointer++;
                this.amplitude *= 0.99999;

            }
            return true;
        }
    }
    registerProcessor('karplus-processor', KarplusProcessor);
`;

let workletLoadPromise = null;
export function setupWorklet(audioContext){
    if (!workletLoadPromise) {
        const blob = new Blob([karplusProcessorScript], {type: 'application/javascript'})
        const url = URL.createObjectURL(blob);
        workletLoadPromise = audioContext.audioWorklet.addModule(url);
    }
    return workletLoadPromise;
}
  
// Karplus-Strong algorithm : single guitar string
class GuitarString {
    constructor(audioCtx, openNoteHz) {
        this.audioCtx = audioCtx;
        this.openNoteHz = openNoteHz; // freq of the open string
        this.Fs = 44100; // sampling freq.
        this.node = null;
        this.outputGain = audioCtx.createGain();
        this.outputGain.gain.value = 0.9;

        

    }

    async init() {
        this.node = new AudioWorkletNode(this.audioCtx, 'karplus-processor');
        this.node.connect(this.outputGain);
    }

    pluck(startTime, fretOffset = 0, velocity = 0.7){
        const freq = this.openNoteHz * Math.pow(2, fretOffset / 12);
        const freqWithInharmonicity = freq * (1 + (Math.random() - 0.5) * 0.001);
        const delayLength = Math.floor(this.Fs / freqWithInharmonicity);
    
        let prev = 0;
        // uniform noise
        const zi = new Float32Array(delayLength).map(() => {
           const white = (Math.random() * 2-1);
           prev = 0.5 * prev + 0.5 * white;
           return prev * velocity;
        });
        // triangular waveform noise
        // const zi = new Float32Array(delayLength).map((_, i) => {
        //     const x = i / delayLength;
        //     return (1 - x) * (Math.random() * 2 - 1); // pluck near the bridge
        // });
        // filtered noise
        // const zi = new Float32Array(delayLength).map((_, i) => {
        //     const t = i / delayLength;
        //     return Math.sin(Math.PI * t) * (Math.random() * 2 - 1); // smoother pluck
        //   });
          
          

        this.node.port.postMessage({
            type: 'PLUCK',
            zi: zi,
            delayLength: delayLength,
            velocity: velocity 
        });

    }
}

import * as Tone from "tone";

function makeSaturationCurve(amount = 2.5) {
    const n = 44100;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  }

export class Guitar {

    static OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
    static OPEN_STRING_PITCH = Guitar.OPEN_STRING_MIDI.map(m => (m % 12));
  
    constructor(audioContext) {
        this.context = audioContext;
        this.midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  
        this.strings = [];
        this.currentChord = null;
  
        this.rhythmPattern1 = ["down", null, "down", "up", null, "up", "down", "up"];
  
        this.strumDelay = 0.015; 

        // filters

        this.bodyLow = this.context.createBiquadFilter();
        this.bodyLow.type = "lowpass";
        this.bodyLow.frequency.value = 700;

        this.bodyMid = this.context.createBiquadFilter();
        this.bodyMid.type = "bandpass";
        this.bodyMid.frequency.value = 250;
        this.bodyMid.Q.value = 1.2;

        this.air = this.context.createBiquadFilter();
        this.air.type = "highpass";
        this.air.frequency.value = 3500;

        this.bodyLow.connect(this.bodyMid);
        this.bodyMid.connect(this.air);

        //preamp

        this.preamp = this.context.createGain();
        this.preamp.gain.value = 10.0;

        //saturation

        this.saturation = this.context.createWaveShaper();
        this.saturation.curve = makeSaturationCurve(2.2);
        this.saturation.oversample = "4x";


        // compressor

        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -26;
        this.compressor.ratio.value = 3.5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.15;

        // final output

        this.outputGain = this.context.createGain();
        this.outputGain.gain.value = 0.9;

        //

        this.air.connect(this.preamp);
        this.preamp.connect(this.saturation);
        this.saturation.connect(this.compressor);
        this.compressor.connect(this.outputGain);
        this.outputGain.connect(this.context.destination);

        this.rhythmScheduler();
    }
  
    async initializeStrings() {
      const openFrequencies =
        Guitar.OPEN_STRING_MIDI.map(m => this.midiToHz(m));
  
      this.strings =
        openFrequencies.map(hz => new GuitarString(this.context, hz));
  
      await Promise.all(this.strings.map(s => s.init()));

      this.strings.forEach(s => s.outputGain.connect(this.bodyLow));

      console.log("6 guitar strings initialised");

    }
  
    calculateTriadFrets(chordPitchClasses, maxFret = 12, preferredMaxFret = 5) {
      const frets = [];
  
      for (let string = 0; string < 6; string++) {
        const openPitch = Guitar.OPEN_STRING_PITCH[string];
        let chosenFret = -1;
  
        for (let fret = 0; fret <= preferredMaxFret; fret++) {
          const notePC = (openPitch + fret) % 12;
          if (chordPitchClasses.includes(notePC)) {
            chosenFret = fret;
            break;
          }
        }
  
        if (chosenFret === -1) {
          for (let fret = preferredMaxFret + 1; fret <= maxFret; fret++) {
            const notePC = (openPitch + fret) % 12;
            if (chordPitchClasses.includes(notePC)) {
              chosenFret = fret;
              break;
            }
          }
        }
  
        if (chosenFret > preferredMaxFret) chosenFret = -1;
        frets.push(chosenFret);
      }
  
      return frets;
    }
  
    updateChord(chordSemitones) {
      if (
        this.currentChord &&
        JSON.stringify(this.currentChord) === JSON.stringify(chordSemitones)
      ) {
        return;
      }
  
      this.currentChord = chordSemitones;
  
      if (Tone.getTransport().state !== "started") {
        Tone.getTransport().start();
      }
    }
  
    playStrum(direction = "down", velocity = 0.7) {
      if (!this.currentChord) return;
  
      const frets = this.calculateTriadFrets(
        this.currentChord.map(n => n % 12)
      );
  
      // Decide strum order
      const indices =
        direction === "down"
          ? [0, 1, 2, 3, 4, 5]
          : [5, 4, 3, 2, 1, 0];
  
      const now = this.context.currentTime;
  
      indices.forEach((stringIndex, i) => {
        const fret = frets[stringIndex];
        if (fret >= 0) {
          const time = now + i * this.strumDelay;
  
          // Slight per-string velocity variation
          const stringVelocity =
            velocity * (0.7 + Math.random() * 0.4);
  
          this.strings[stringIndex].pluck(
            time,
            fret,
            stringVelocity
          );
        }
      });
    }
  
    rhythmScheduler() {
      const steps = this.rhythmPattern1.length;
  
      Tone.getTransport().scheduleRepeat(() => {
        const ticksPerStep = Tone.getTransport().PPQ / 2; // 8th notes
        const step =
          Math.floor(Tone.getTransport().ticks / ticksPerStep) % steps;
  
        const action = this.rhythmPattern1[step];
        if (!action) return;
  
        if (action === "down") {
          this.playStrum("down", 0.8);
        } else if (action === "up") {
          this.playStrum("up", 0.6);
        }
  
      }, "8n");
    }
  }
  

