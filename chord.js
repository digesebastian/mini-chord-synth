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

    static transformChord(chord, scale, degree,transform) {
        switch (transform) {
            case 'None':
                break;
            case 'maj/min':
                if (chord.chordName === 'maj') {
                    // if maj → min
                    chord.third -= 1
                    chord.chordName = 'min'
                }
                else if (chord.chordName === 'min') {
                    // if min → maj
                    chord.third += 1
                    chord.chordName = 'maj'
                }
                else if (chord.chordName === 'aug') {
                    // if aug → min
                    chord.third -= 1
                    chord.fifth = chord.root + 7
                    chord.chordName = 'min'
                }
                else if (chord.chordName === 'dim') {
                    // if dim → maj
                    chord.third += 1
                    chord.fifth = chord.root + 7
                    chord.chordName = 'maj'
                }
                break;
            case '7th':
                // dominant 7. Overrides dim and aug
                chord.third = chord.root + 4
                chord.fifth = chord.root + 7
                chord.seventh = chord.root + 10
                break;
            case 'maj/min 7th':
                chord.seventh = scale[(degree + 6) % 7]
                break;
            case 'maj/min 9th':
                chord.seventh = scale[(degree + 6) % 7]
                if (chord.chordName === 'maj' || chord.chordName === 'min') {
                    // does not add 9 for dim and aug chords
                    chord.ninth = scale[(degree + 8) % 7]
                }
                break;
            case 'sus4':
                chord.third = chord.root + 5
                break;
            case 'sus2':
                chord.third = chord.root + 2;
                break;
            case 'dim':
                if (chord.chordName !== 'dim') {
                    // transforming to dim chord
                    chord.third = chord.root + 3
                    chord.fifth = chord.root + 6
                    chord.chordName = 'dim'
                } else {
                    // change to minor
                    chord.third = chord.root + 3
                    chord.fifth = chord.root + 7
                    chord.chordName = 'min'
                }
                break;
            case 'aug':
                if (chord.chordName !== 'aug') {  
                    // transforming to dim chord
                    chord.third = chord.root + 4
                    chord.fifth = chord.root + 8
                    chord.chordName = 'aug'
                } else {
                    // change to major
                    chord.third = chord.root + 4
                    chord.fifth = chord.root + 7
                    chord.chordName = 'maj'
                }
                break;
            default:
                console.log("Not implemented")
        }
        return chord;
    }

    static createChord(scale, degree, transform) {
        // Using two octaves in order to have the third and fifth above the root
        // Could probably be done more elegantly
        const secondOctave = scale.map(num => num + 12);
        const twoOctaves = scale.concat(secondOctave); 

        const root = twoOctaves[degree];
        const third = twoOctaves[degree + 2];
        const fifth = twoOctaves[degree + 4];

        let thirdInterval = third - root;
        let fifthInterval = fifth - root;

        let chordName = this.getChordName(thirdInterval, fifthInterval);

        let baseChord = new Chord(chordName, root, third, fifth)
        
        return this.transformChord(baseChord, scale, degree, transform)
    }

    static getChordName(thirdInterval, fifthInterval) {
        if (thirdInterval === 4) {
            if (fifthInterval === 7) {
                return 'maj'
            } else if (fifthInterval === 8) {
                return 'aug'
            }
        } else if (thirdInterval === 3) {
            if (fifthInterval === 7) {
                return 'min'
            } else if (fifthInterval === 6) {
                return 'dim'
            }
        }
        console.error("Unrecognized chord");
    }
}