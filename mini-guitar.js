// --- MINI GUITAR ---
// Renders a simplified guitar fretboard used for visual feedback.
// The layout represents strings (rows) and frets (columns).

// Open string names from low to high pitch.
// Order matches Guitar.OPEN_STRING_MIDI in the audio engine.
const STRINGS = ["E", "A", "D", "G", "B", "E"];

export function renderMiniGuitar(maxFret = 5) {
  const host = document.getElementById("guitar");
  if (!host) return;

  host.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "guitar";
  host.appendChild(wrap);

  // Create one row per string
  for (let si = 0; si < STRINGS.length; si++) {
    const row = document.createElement("div");
    row.className = "g-row";
    wrap.appendChild(row);

    // Create fret cells for each string
    for (let f = 1; f <= maxFret; f++) {
      const cell = document.createElement("div");
      cell.className = "g-cell";

      // Store string and fret index for lookup later
      cell.dataset.string = String(si);
      cell.dataset.fret = String(f);
      row.appendChild(cell);
    }
  }
}

// Removes all active fret highlights
export function clearMiniGuitar() {
  document.querySelectorAll("#guitar .g-cell")
    .forEach(c => c.classList.remove("active"));
}

// Highlights frets based on calculated chord positions.
// `frets` is expected to be an array of length 6,
// where each index corresponds to a string.
export function setMiniGuitarFromFrets(frets) {
  clearMiniGuitar();
  if (!Array.isArray(frets) || frets.length !== 6) return;

  for (let si = 0; si < 6; si++) {
    const f = frets[si];

    // Only highlight frets that are actually pressed
    if (typeof f !== "number" || f <= 0) continue;

    const el = document.querySelector(
      `#guitar .g-cell[data-string="${si}"][data-fret="${f}"]`
    );
    if (!el) continue;

    el.classList.add("active");
  }
}