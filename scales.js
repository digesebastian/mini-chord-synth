import { Chord } from './chord'

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