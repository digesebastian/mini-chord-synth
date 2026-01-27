export class Chord {
    constructor(chordName, root, third, fifth, seventh, ninth) {
        this.root = root;
        this.third = third;
        this.fifth = fifth;
        this.seventh = seventh;
        this.ninth = ninth;
        this.chordName = chordName;
    }

    getSemitones() {
        return [this.root, this.third, this.fifth, this.seventh, this.ninth]
    }

    static transformChord(chord, transform) {
        let newChord = this.clone(chord)

        switch (transform) {
            case 'None':
                break;

            case 'maj/min':
                // if maj → min
                if (newChord.chordName === 'maj') {
                    newChord.third -= 1
                    newChord.chordName = 'min'
                }
                // if min → maj
                else if (newChord.chordName === 'min') {
                    newChord.third += 1
                    newChord.chordName = 'maj'
                }
                break;

            case '7th':
                // dominant 7 
                newChord.third = newChord.root + 4
                newChord.seventh = newChord.root + 10
                break;

            case 'maj/min 7th':
                if (newChord.chordName === 'maj') {
                    // Major → Major 7
                    newChord.seventh = newChord.root + 11
                    

                } else if (newChord.chordName === 'min') {
                    // Minor → Minor 7
                    newChord.seventh = newChord.root + 10
                    
                }
                break;

            case 'maj/min 9th':
                // first maj↔min 
                if (newChord.chordName === 'maj') {
                    // Major → Major 7
                    newChord.ninth = newChord.root + 14
                    

                } else if (newChord.chordName === 'min') {
                    // Minor → Minor 7
                    newChord.ninth = newChord.root + 13
                    
                }
                break;

            case 'sus4':

                newChord.third = newChord.root + 5
                break;

            case 'sus2':
                newChord.third = newChord.root + 2;
                break;

            case 'dim':
                // transforming to dim chord
                newChord.third = newChord.root + 3
                newChord.fifth = newChord.root + 6
                newChord.chordName = 'dim'
                break;

            case 'aug':
                // transforming to dim chord
                newChord.third = newChord.root + 4
                newChord.fifth = newChord.root + 8
                newChord.chordName = 'aug'
                break;



            default:
                console.log("Not implemented")
        }
        return newChord;
    }

    static clone(chord) {
        return this.createChord(chord.root, chord.third, chord.fifth)
    }

    static createChord(root, third, fifth) {
        let thirdInterval = third - root;
        let fifthInterval = fifth - root;
        
        let chordName;
        if (thirdInterval === 4) {
            if (fifthInterval === 7) {
                chordName = 'maj'
            } else if (fifthInterval === 8) {
                chordName = 'aug'
            } else {
                console.error('Invalid chord intervals')
            }
        } else if (thirdInterval === 3) {
            if (fifthInterval === 7) {
                chordName = 'min'
            } else if (fifthInterval === 6) {
                chordName = 'dim'
            } else {
                console.error('Invalid chord intervals')
            }
        } else {
            console.error('Invalid chord intervals')
        }

        return new Chord(chordName, root, third, fifth);
    }
}

export function createChords(scale) {
    const nodesInScale = scale.length;
    const secondOctave = scale.map(num => num + 12); 
    const twoOctaves = scale.concat(secondOctave);
    
    const chords = [];
    for (let i = 0; i < nodesInScale; i++) {        
        const root = twoOctaves[i];
        const third = twoOctaves[i + 2];
        const fifth = twoOctaves[i + 4];
        
        let chord = Chord.createChord(root, third, fifth);
        
        chords.push(chord);
    }
    return chords;
}