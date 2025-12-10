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


            case 'maj/min':
            // if maj → min
                if (newChord.chordType === 'maj') {
                    newChord.third -= 1
                    newChord.chordType = 'min'
            }
            // if min → maj
                else if (newChord.chordType === 'min') {
                    newChord.third += 1
                    newChord.chordType = 'maj'
            }
                break;
            
            case '7th':
                // dominant 7 
                newChord.seventh = newChord.root + 10
                break;    

            case 'maj/min 7th':
                // first maj↔min 
                if (newChord.chordType === 'maj') {
                    newChord.third -= 1
                    newChord.chordType = 'min'
            }   else if (newChord.chordType === 'min') {
                    newChord.third += 1
                    newChord.chordType = 'maj'
            }
                // than maj7 ekleme (root + 11)
                newChord.seventh = newChord.root + 11
                break;

            case 'maj/min 9th':
                // first maj↔min 
                if (newChord.chordType === 'maj') {
                    newChord.third -= 1
                    newChord.chordType = 'min'
            }   else if (newChord.chordType === 'min') {
                    newChord.third += 1
                    newChord.chordType = 'maj'
            }
                
                newChord.ninth = newChord.root + 14
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
                newChord.chordType = 'dim'
                break;
            
            case 'aug':
                // transforming to dim chord
                newChord.third = newChord.root + 4
                newChord.fifth = newChord.root + 8
                newChord.chordType = 'aug'
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