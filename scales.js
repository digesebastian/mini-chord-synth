// all the chords of the major scale expressed in terms of semitones about the root of the scale
const majorScaleChords = [
    [0, 4, 7],
    [2, 5, 9],
    [4, 7, 11],
    [5, 9, 12],
    [7, 11, 14],
    [9, 12, 16],
    [11, 14, 17],
]

const minorScaleChords = [
    [0, 3, 7],
    [2, 5, 8],
    [3, 7, 10],
    [5, 8, 12],
    [7, 10, 14],
    [8, 12, 15],
    [10, 14, 17],
]

export const scaleNames = new Map([
    [0, "Major"],
    [1, "Minor"]
])

export const scales = new Map([
    [0, majorScaleChords],
    [1, minorScaleChords]
])