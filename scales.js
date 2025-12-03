export class Chord {
    constructor(rootSemitones, chordType) {
        this.root = rootSemitones;
        this.chordType = chordType;
        switch (chordType) {
            case 'maj':
                this.third = rootSemitones + 4;
                this.fifth = rootSemitones + 7;
                break;
            case 'min':
                this.third = rootSemitones + 3;
                this.fifth = rootSemitones + 7;
                break;
            case 'dim':
                this.third = rootSemitones + 3;
                this.fifth = rootSemitones + 6;
                break;
            case 'aug':
                this.third = rootSemitones + 4;
                this.fifth = rootSemitones + 8;
                break;
        }
    }

    getSemitones() {
        return [this.root, this.third, this.fifth]
    }
}

// all the chords of the major scale expressed in terms of semitones about the root of the scale
const majorScaleChords = [
    new Chord(0, 'maj'),
    new Chord(2, 'min'),
    new Chord(4, 'min'),
    new Chord(5, 'maj'),
    new Chord(7, 'maj'),
    new Chord(9, 'min'),
    new Chord(11, 'dim')
]

const minorScaleChords = [
    new Chord(0, 'min'),
    new Chord(2, 'dim'),
    new Chord(3, 'maj'),
    new Chord(5, 'min'),
    new Chord(7, 'min'),
    new Chord(8, 'maj'),
    new Chord(10, 'maj')
]

const melodicMinorChords = [
    new Chord(0, 'min'),
    new Chord(2, 'min'),
    new Chord(3, 'aug'),
    new Chord(5, 'maj'),
    new Chord(7, 'maj'),
    new Chord(9, 'dim'),
    new Chord(11, 'dim')
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