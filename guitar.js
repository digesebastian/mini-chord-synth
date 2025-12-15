// ACOUSTIC GUITAR
// check https://www.mathworks.com/help/signal/ug/generate-guitar-chords-using-the-karplus-strong-algorithm.html to understand the code 

// DSP: sample-by-sample IIR filtering (mimicking MATLAB filter funct.)
// check https://nl.mathworks.com/help/matlab/ref/filter.html 

// const ctxt = new AudioContext();

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

let workletLoadPromise = null;
export function setupWorklet(audioContext) {
    if (!workletLoadPromise) {
        const blob = new Blob(
            [karplusProcessorScript],
            { type: 'application/javascript' }
        );

        const url = URL.createObjectURL(blob);

        workletLoadPromise = audioContext.audioWorklet
            .addModule(url)
            .then(() => {
                console.log("Karplus worklet loaded");
            })
            .catch(err => {
                console.error("Error loading worklet:", err);
                workletLoadPromise = null;
                throw err;
            });
    }

    return workletLoadPromise;
}

// Karplus-Strong algorithm : single guitar string
class GuitarString {
    constructor(audioCtx, openNoteHz, velocity = 0.7) {
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
        //const delay = Math.round(this.Fs / freq); //delay: pitch determination
        const exactDelay = this.Fs / freq;
        const delay = Math.floor(exactDelay - 0.5);
        const fracDelay = exactDelay - (delay + 0.5);
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
        const { a, b } = this.getDSPFIR(freq);

        // how the string is started: generation of initial noise (zi)
        const ziLength = a.length - 1;
        // const randomZi = new Array(ziLength).fill(0).map(() => (Math.random() * 2 - 1) * this.velocity); // white noise 
        let prev = 0;
        const randomZi = new Array(ziLength).fill(0).map(() => { // low-passed noise
            const white = (Math.random() * 2 - 1);
            prev = 0.5 * prev + 0.5 * white;
            return prev * this.velocity;
        });
        

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
// standard guitar EADGBe tuning 
// corresponds to the MIDI note numbers: 40, 45, 50, 55, 59, 64
export class Guitar {

    static chordsFretMap = {
            'C': [3, 3, 2, 0, 1, 0], 
            'Dm': [-1, -1, 0, 2, 3, 1], // -1 means chord is muted
            'Em': [0, 2, 2, 0, 0, 0],
            'F': [1, 3, 3, 2, 1, 1], 
            'G': [3, 2, 0, 0, 0, 3],
            'Am': [0, 0, 2, 2, 1, 0],
            'Bdim': [-1, 2, 0, 4, 3, 1],
        };

    constructor(audioContext) {
        this.context = audioContext;
        this.midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
        this.openStringFrets = [
            this.midiToHz(40), this.midiToHz(45), this.midiToHz(50),
            this.midiToHz(55), this.midiToHz(59), this.midiToHz(64)
        ];
        this.strings = [];
    }

    initializeStrings() {
        this.strings = this.openStringFrets.map(hz => new GuitarString(this.context, hz));
    }

    // playing the chord
    // velocity: velocity of the strumming 
    // timeUnit: simulate delay between successive strings
    strumChord(chordName, velocity = 0.9, timeUnit = 0.05) {
        if (this.strings.length === 0) {
            console.warn("Worklet loading incomplete");
            return;
        }

        const fretMap = Guitar.chordsFretMap[chordName];
        if (!fretMap) {
            console.error('Chord map not found for:' + chordName);
            return;
        }

        const now = this.context.currentTime;
        let strumTime = now;

        // downstroke simulation
        // loop iterates from index 0 to 5 -> low E to high e
        for (let i = 0; i < 6; i++) {
            const fret = fretMap[i];
            const string = this.strings[i];
            if (fret !== -1) {
                string.velocity = velocity * (1.0 - Math.random() * 0.1); // velocity variation (randomness)
                string.pluck(strumTime, fret); 
            }

            strumTime += timeUnit + (Math.random() * 0.005); // incrementing time for the next string 
        }
    }
}

export const guitarChordsTest = Object.keys(Guitar.chordsFretMap); 



