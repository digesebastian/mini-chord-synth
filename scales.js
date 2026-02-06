const majorScale = [0, 2, 4, 5, 7, 9, 11];

const minorScale = [0, 2, 3, 5, 7, 8, 10];

const melodicMinorScale = [0, 2, 3, 5, 7, 9, 11];

export const scaleNames = new Map([
    [0, "Major"],
    [1, "Minor"],
    [2, "Melodic minor"]
])

export const scales = new Map([
    [0, majorScale],
    [1, minorScale],
    [2, melodicMinorScale]
])

// scale names and number of semitones above C
export const scaleMap = new Map([
    ['C', 0],
    ['C#', 1],
    ['Db', 1],
    ['D', 2],
    ['D#', 3],
    ['Eb', 3],
    ['E', 4],
    ['F', 5],
    ['F#', 6],
    ['Gb', 6],
    ['G', 7],
    ['G#', 8],
    ['Ab', 8],
    ['A', 9],
    ['A#', 10],
    ['Bb', 10],
    ['B', 11]
]);