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
            case 'None':
                break;
            case 'sus2': 
                newChord.third = newChord.root + 2;
                break;
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