
// --- MINI PIANO ---
// Renders a visual mini piano used for chord feedback.
// Keys are generated dynamically based on octave range.

export function renderMiniPiano(octaves = 2, baseOctave = 4) {
  const piano = document.getElementById("piano");
  if (!piano) return;

  // Clear existing piano before rendering
  piano.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "mini-piano";
  piano.appendChild(wrap);

  // White keys in one octave
  const WHITE = ["C", "D", "E", "F", "G", "A", "B"];
  // Mapping of where black keys appear relative to white keys
  const BLACK_AFTER_WHITE = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

  const whiteW = 14, gap = 2, step = whiteW + gap;
  let whiteIndex = 0;

  // Generate keys octave by octave
  for (let o = 0; o < octaves; o++) {
    const octave = baseOctave + o;

    // Create white key
    for (const w of WHITE) {
      const el = document.createElement("div");
      el.className = "pkey white";
      el.dataset.note = `${w}${octave}`;   // C4 ... B4, C5 ... B5
      wrap.appendChild(el);

      // Create corresponding black key when applicable
      const bName = BLACK_AFTER_WHITE[w];
      if (bName) {
        const b = document.createElement("div");
        b.className = "pkey black";
        b.dataset.note = `${bName}${octave}`; // C#4 ...
        b.style.left = `${(whiteIndex + 1) * step - 5}px`;
        wrap.appendChild(b);
      }

      whiteIndex++;
    }
  }
}

// Highlights currently played notes on the mini piano
export function setMiniPianoActive(notesWithOctave) {

  // notesWithOctave example: ["C3","C4","E4","G4"]
  document.querySelectorAll("#piano .pkey")
    .forEach(k => k.classList.remove("active", "bass"));

  if (!notesWithOctave?.length) return;

  const [bass, ...chord] = notesWithOctave;

  // Highlight bass note separately
  const bassEl = document.querySelector(`#piano .pkey[data-note="${bass}"]`);
  if (bassEl) bassEl.classList.add("bass");

  // Highlight remaining chord tones
  chord.forEach(note => {
    const el = document.querySelector(`#piano .pkey[data-note="${note}"]`);
    if (el) el.classList.add("active");
  });
}

// Clears all active highlights from the mini piano
export function clearMiniPiano() {
  document.querySelectorAll("#piano .pkey")
    .forEach(k => k.classList.remove("active", "bass"));
}
