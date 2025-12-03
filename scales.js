export class Chord {
    constructor(chordType, root, third, fifth, seventh) {
        this.root = root;
        this.third = third;
        this.fifth = fifth;
        this.seventh = seventh;
        this.chordType = chordType;
    }

    getSemitones() {
        return [this.root, this.third, this.fifth]
    }

    
    static transformChord(chord, transform) {
        let newChord = this.clone(chord)
        
        switch (transform) {
            case 'sus2': 
                newChord.third = newChord.root + 2;
            default: 
                console.log("Not implemented")
        }
        return newChord;
    }
    
    static clone(chord) {
        return this.createChord(chord.root, chord.chordType)
    }

    static createChord(rootSemitones, chordType) {
        let third;
        let fifth;
        switch (chordType) {
            case 'maj':
                third = rootSemitones + 4;
                fifth = rootSemitones + 7;
                break;
            case 'min':
                third = rootSemitones + 3;
                fifth = rootSemitones + 7;
                break;
            case 'dim':
                third = rootSemitones + 3;
                fifth = rootSemitones + 6;
                break;
            case 'aug':
                third = rootSemitones + 4;
                fifth = rootSemitones + 8;
                break;
            default:
                console.error('Unrecognized chord type: ' + chordType);
        }
        return new Chord(chordType, rootSemitones, third, fifth);
    }
}

// all the chords of the major scale expressed in terms of semitones about the root of the scale
const majorScaleChords = [
    Chord.createChord(0, 'maj'),
    Chord.createChord(2, 'min'),
    Chord.createChord(4, 'min'),
    Chord.createChord(5, 'maj'),
    Chord.createChord(7, 'maj'),
    Chord.createChord(9, 'min'),
    Chord.createChord(11, 'dim')
]


const minorScaleChords = [
    Chord.createChord(0, 'min'),
    Chord.createChord(2, 'dim'),
    Chord.createChord(3, 'maj'),
    Chord.createChord(5, 'min'),
    Chord.createChord(7, 'min'),
    Chord.createChord(8, 'maj'),
    Chord.createChord(10, 'maj')
]

const melodicMinorChords = [
    Chord.createChord(0, 'min'),
    Chord.createChord(2, 'min'),
    Chord.createChord(3, 'aug'),
    Chord.createChord(5, 'maj'),
    Chord.createChord(7, 'maj'),
    Chord.createChord(9, 'dim'),
    Chord.createChord(11, 'dim')
]

export const scaleNames = new Map([
    [0, "Major"],
    [1, "Minor"],
    [2, "Melodic minor"]
])

export const scales = new Map([
    [0, majorScaleChords],
    [1, minorScaleChords],
    [2, melodicMinorChords]
])