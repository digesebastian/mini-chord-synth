import * as Tone from 'https://esm.sh/tone';

// ACOUSTIC GUITAR
// check https://www.mathworks.com/help/signal/ug/generate-guitar-chords-using-the-karplus-strong-algorithm.html to understand the code 

// DSP: sample-by-sample IIR filtering (mimicking MATLAB filter funct.)
// check https://nl.mathworks.com/help/matlab/ref/filter.html 

const karplusProcessorScript = `
    class KarplusProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super(options);

            this.y_history = new Float32Array(2000).fill(0); // buffer
            this.delayLength = 0; //string length (pitch)
            this.amplitude = 0;
            this.pointer = 0;

            this.port.onmessage = (e) => {
                if (e.data.type === 'PLUCK') {
                    const zi = e.data.zi;
                    this.delayLength = e.data.delayLength;
                    
                    for (let i = 0; i < zi.length; i++) {
                    this.y_history[i] = zi[i]; // as matlab's filter(1, [1 -1], zi)
                    }
              
                    this.amplitude = e.data.velocity || 1.0;
                    this.pointer = 0;
                }

                if (e.data.type === 'DAMP') {
                    this.amplitude = 0;
                }
            };
              
        }

        process(inputs, outputs) {  //audio processing loop
            const output = outputs[0];
            const outChannel = output[0];
            if (this.amplitude <= 0.0001 || this.delayLength === 0) return true;

            for (let n=0; n < outChannel.length; n++) {
                const D = this.delayLength;
                // feedback 
                const idx1 = (this.pointer) % D;
                const idx2 = (this.pointer + 1) % D;

                // karplus strong feedback loop
                //let newSample = (this.y_history[idx1] * 0.5) + (this.y_history[idx2] * 0.5);

                let newSample;

                if (this.delayLength > 300) { // Low E, A strings //280
                    const y0 = this.y_history[idx1];
                    const y1 = this.y_history[idx2];
                    const y2 = this.y_history[(this.pointer + 2) % D];
                    newSample = (y0 + y1 + y2) / 3; 
                } else if (this.delayLength > 200) { // D string
                    newSample = (this.y_history[idx1] + this.y_history[idx2]) * 0.5;
                } else { // G, B, high E
                    newSample = (this.y_history[idx1] + this.y_history[idx2]) * 0.5;
                }

                outChannel[n] = newSample * this.amplitude;
                this.y_history[this.pointer % D] = newSample;

                this.pointer++;
                  this.amplitude *= 0.99997;
                //this.amplitude *= (this.delayLength > 300 ? 0.99994 : 0.99998);
            }
            return true;
        }
    }
    registerProcessor('karplus-processor', KarplusProcessor);
`;

let workletLoadPromise = null;
export function setupWorklet(audioContext) {
  if (!workletLoadPromise) {
    const blob = new Blob([karplusProcessorScript], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob);
    workletLoadPromise = audioContext.audioWorklet.addModule(url);
  }
  return workletLoadPromise;
}

// (one string)
class GuitarString {
    constructor(audioCtx, openNoteHz) {
        this.audioCtx = audioCtx;
        this.openNoteHz = openNoteHz; // freq of the open string
        this.Fs = audioCtx.sampleRate; // sampling freq.

        this.node = null;
        this.outputNode = audioCtx.createStereoPanner();
        this.outputNode.pan.value = 0;
    }

    //vibrating string
    async init() {
        this.node = new AudioWorkletNode(this.audioCtx, 'karplus-processor');
        this.node.connect(this.outputNode);
    }

    pluck(startTime, fretOffset = 0, velocity = 0.7, detune = 0, isStrum=false){
        if (!this.node) {
            console.warn("GuitarString not initialized yet");
            return;
        }
        const freq = this.openNoteHz * Math.pow(2, fretOffset / 12);
        const drift = (Math.random() - 0.5) * 0.8;
        const freqWithDetune = freq * Math.pow(2, (detune + drift)/ 1200);
        const delayLength = Math.floor(this.Fs / freqWithDetune);

        const pickPosition = 0.2 + Math.random() * 0.6; 
        const bassStrings = this.openNoteHz < 150; //(E2, A2, D3)
        let prev = 0;

        const zi = new Float32Array(delayLength).map((_, i) => { //excitationBuffer
            const x = i / delayLength;
            const env = Math.sin(Math.PI * x * pickPosition);
            const noiseAmount = isStrum ? 0.4 : 1.0;
            const white = (Math.random() * 2 - 1) * noiseAmount;
          
            if (bassStrings) {
                prev = 0.92 * prev + 0.08 * white;
                return env * prev * velocity * 1.4;
            } else {
                prev = 0.7 * prev + 0.3 * white;
                return env * prev * velocity;
            }
        });
          
        this.node.port.postMessage({
            type: 'PLUCK',
            zi: zi,
            delayLength: delayLength,
            velocity: velocity 
        });
    }
}

//instrument
export class Guitar {

    static openStringMidi = [40, 45, 50, 55, 59, 64];
    static openStringPitch = Guitar.openStringMidi.map(m => (m % 12));
  
    constructor(audioContext) {
        this.context = audioContext;
        this.midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  
        this.strings = [];
        this.currentChord = null;
        this.arpIndex = 0;
        this.pendingRhythmRestart = false;
        this.currentScale = null;


        this.rhythmPatterns = {
            slowUpDown: ["down", null, "up", null, "down", null, "up", null],
            fastUpDown: ["down", "up", "down", "up", "down", "up", "down", "up"],
            popRock: ["down", null, "down", "up", null, "up", "down", "up"],
            basicRock: ["down", null, "down", null, "down", null, "down", null],
            indie: ["down", null, "up", "up", null, "up", null, "up"],
            arpDown: ["arpDown", "arpDown", "arpDown", "arpDown", "arpDown", "arpDown", "arpDown", "arpDown"],
            arpUp:   ["arpUp", "arpUp", "arpUp", "arpUp", "arpUp",   "arpUp", "arpUp", "arpUp"],
            bassTreble: ["bassTreble", "bassTreble", "bassTreble", "bassTreble", "bassTreble", "bassTreble", "bassTreble", "bassTreble"]
            };
            this.currentRhythm = "popRock";          
            this.strumDelay = 0.015; 

        // final output
        this.outputNode = this.context.createGain();
        this.outputNode.gain.value = 3;

        // filters for strumming
        this.strumBus = this.context.createGain();
        this.strumBus.gain.value = 0.9;

        this.strumLowpass = this.context.createBiquadFilter();
        this.strumLowpass.type = "lowpass";
        this.strumLowpass.frequency.value = 3800; //lower warmer, higher brighter

        this.strumBus.connect(this.strumLowpass).connect(this.outputNode);

        // filter for fingerpicking
        this.fingerLowpass = this.context.createBiquadFilter();
        this.fingerLowpass.type = "lowpass";
        this.fingerLowpass.frequency.value = 8000; // very high cutoff //9000
        
        this.fingerLowpass.Q.value = 0.5; //0.3
        this.fingerLowpass.connect(this.outputNode);

    this.rhythmScheduler();
    
    }

    async initializeStrings() {
        const openFrequencies =
        Guitar.openStringMidi.map(m => this.midiToHz(m));
        this.strings = openFrequencies.map(hz => new GuitarString(this.context, hz));
  
        await Promise.all(this.strings.map(s => s.init())); //DSP nodes
        this.strings.forEach(s => s.outputNode.connect(this.fingerLowpass));
    }

    getStringPitchClass(stringIndex, fret) {
        return (Guitar.openStringPitch[stringIndex] + fret) % 12;
    }
    
    calculateTriadFrets(chordPitchClasses, maxFret = 12, preferredMaxFret = 5) {
        const frets = [];
        const usedPitchClasses = new Set();
      
        for (let string = 0; string < 6; string++) {
            const openPC = Guitar.openStringPitch[string];
            let chosenFret = -1;
      
            for (let fret = 0; fret <= maxFret; fret++) {
                const pc = (openPC + fret) % 12;
                if (!chordPitchClasses.includes(pc)) continue;
      
                const isNewTone = !usedPitchClasses.has(pc);
      
                if (isNewTone && usedPitchClasses.size === 3 && string < 3) continue;

                if (isNewTone && usedPitchClasses.size === 3 && string >= 3) {
                    chosenFret = fret;
                    usedPitchClasses.add(pc);
                    break;
                }
      
                if (fret <= preferredMaxFret && chosenFret === -1) {
                    chosenFret = fret;
                }
            }
      
            if (string < 3 && chosenFret > preferredMaxFret) chosenFret = -1;
      
            if (chosenFret >= 0) {
                const pc = (openPC + chosenFret) % 12;
                usedPitchClasses.add(pc);
            }
            frets.push(chosenFret);
        }
        return frets;
    } 

    updateChord(chordSemitones) {
        this.currentChord = chordSemitones;

        this.arpIndex = 0;
        this.pendingRhythmRestart = true;

      
        if (Tone.getTransport().state !== "started") {
            Tone.getTransport().start();
        }
    }
      

    updateScale(scaleSemitones) {
        this.currentScale = scaleSemitones;
    }
      

    stop() {
        this.currentChord = null;
      
        this.strings.forEach(s => {
            if (!s.outputNode) return;
      
            const now = this.context.currentTime;
      
            s.outputNode.pan.cancelScheduledValues(now);
            s.outputNode.pan.value = s.outputNode.pan.value;
      
            if (s.node) {
                s.node.port.postMessage({ type: "DAMP" });
            }
        });
    }

    applyToneByVelocity(isStrum, velocity) {
        if (isStrum) {
            this.strumLowpass.frequency.value =
                2800 + velocity * 2200; 
        } else {
            this.fingerLowpass.frequency.value =
                7500 + velocity * 2500; 
        }
    }
  
    playStrum(direction = "down", velocity = 0.7) {
        if (!this.currentChord) return;
  
        const frets = this.calculateTriadFrets(
            this.currentChord.map(n => n % 12)
        );

        const indices = direction === "down" ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

        const now = this.context.currentTime;

        const detuneTable = [-6, -3, 0, 2, 4, 7];
  
        indices.forEach((stringIndex, i) => {
            const fret = frets[stringIndex];
            if (fret < 0) return;

            const time = now + i * this.strumDelay;
            const stringWeight = [0.85, 0.95, 1.1, 1.1, 0.95, 0.8];
            const stringVelocity = velocity * stringWeight[stringIndex] * (0.95 + Math.random() * 0.1);

            const detune = detuneTable[stringIndex] + (Math.random() - 0.5) * 1.5;
            const pan = (stringIndex - 2.5) / 8;
            this.strings[stringIndex].outputNode.pan.value = pan;

            const isMuted = Math.random() < 0.15;
  
            this.strings[stringIndex].pluck(
                time,
                fret,
                isMuted ? stringVelocity * 0.3 : stringVelocity,
                detune,
                true
            );
            this.applyToneByVelocity(true, stringVelocity);
            this.strings[stringIndex].outputNode.disconnect();
            this.strings[stringIndex].outputNode.connect(this.strumBus);

        });
    }

    playArp(direction = "down", velocity = 0.6) {
        if (!this.currentChord) return;
      
        const frets = this.calculateTriadFrets(
            this.currentChord.map(n => n % 12)
        );
      
        const order = direction === "down" ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
      
        const stringIndex = order[this.arpIndex % order.length];
        const fret = frets[stringIndex];
        if (fret < 0) return;
      
        const time = this.context.currentTime;
        const velocityJitter = velocity * (0.8 + Math.random() * 0.3);
      
        this.strings[stringIndex].pluck(
            time,
            fret,
            velocityJitter,
            0,
            false
        );
        this.applyToneByVelocity(false, velocityJitter);
        this.strings[stringIndex].outputNode.disconnect();
        this.strings[stringIndex].outputNode.connect(this.fingerLowpass);
      
        this.arpIndex++;
    }

    playBassTrebleArp(velocity = 0.6) {
        if (!this.currentChord || !this.currentScale) return;

        const chordSemitones = this.currentChord.map(n => n % 12);
        const scaleSemitones = this.currentScale.map(n => n % 12);
      
        const frets = this.calculateTriadFrets(chordSemitones);
      
        const rootPC = chordSemitones[0] % 12;
        const scaleSet = new Set(scaleSemitones.map(s => s % 12));
      
        const rootBassStrings = [0, 1, 2].filter(i => {
            if (frets[i] < 0) return false;
            const pc = this.getStringPitchClass(i, frets[i])
            ;
            return pc === rootPC;
        });
      
        const bassString = rootBassStrings.length > 0 ? rootBassStrings[0] : [0, 1, 2].find(i => frets[i] >= 0);
      
        const trebleStrings = [3, 4, 5].filter(i => {
            if (frets[i] < 0) return false;
            const pc = this.getStringPitchClass(i, frets[i])            ;
            return scaleSet.has(pc);
        });
      
        if (bassString == null || trebleStrings.length === 0) return;
      
        let stringIndex;
      
        if (this.arpIndex % 4 === 0) {
            stringIndex = bassString;
        } else {
            stringIndex = trebleStrings[(this.arpIndex - 1) % trebleStrings.length];
        }
      
        const time = this.context.currentTime;
        const velocityJitter = velocity * (0.85 + Math.random() * 0.2);
      
        this.strings[stringIndex].pluck(
            time,
            frets[stringIndex],
            velocityJitter
        );
        this.applyToneByVelocity(false, velocityJitter);
        this.strings[stringIndex].outputNode.disconnect();
        this.strings[stringIndex].outputNode.connect(this.fingerLowpass);

        this.arpIndex++;
      }

    setRhythm(name) {
        if (this.rhythmPatterns[name]) {
            this.currentRhythm = name;
            this.rhythmIndex = 0;
            Tone.getTransport().ticks = 0;
        }
    }
        
  
    rhythmScheduler() {
        Tone.getTransport().scheduleRepeat(() => {

            if (this.pendingRhythmRestart) {
                Tone.getTransport().ticks = 0;
                this.pendingRhythmRestart = false;
            }

            const pattern = this.rhythmPatterns[this.currentRhythm];
            if (!pattern) return;
      
            const steps = pattern.length;
            const ticksPerStep = Tone.getTransport().PPQ / 2; // 8th notes
      
            const step = Math.floor(Tone.getTransport().ticks / ticksPerStep) % steps;
      
            const action = pattern[step];
            if (!action) return;
      
            if (action === "down") {
                this.playStrum("down", 0.8);
            } else if (action === "up") {
                this.playStrum("up", 0.6);
            } else if (action === "arpDown") {
                this.playArp("down", 0.7);
            } else if (action === "arpUp") {
                this.playArp("up", 0.7);
            } else if (action === "bassTreble") {
                if (!this.currentChord || !this.currentScale) return;
                this.playBassTrebleArp(0.7);               
            }
        }, "8n");
    }
}
  


