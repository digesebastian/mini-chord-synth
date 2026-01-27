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