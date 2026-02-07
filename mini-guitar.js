const STRINGS = ["E", "A", "D", "G", "B", "E"]; // low -> high (Guitar.OPEN_STRING_MIDI ile aynı sıra)

export function renderMiniGuitar(maxFret = 5) {
  const host = document.getElementById("guitar");
  if (!host) return;

  host.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "guitar";
  host.appendChild(wrap);

  for (let si = 0; si < STRINGS.length; si++) {
    const row = document.createElement("div");
    row.className = "g-row";
    wrap.appendChild(row);

    for (let f = 1; f <= maxFret; f++) {
      const cell = document.createElement("div");
      cell.className = "g-cell";
      cell.dataset.string = String(si);
      cell.dataset.fret = String(f);
      row.appendChild(cell);
    }
  }
}

export function clearMiniGuitar() {
  document.querySelectorAll("#guitar .g-cell")
    .forEach(c => c.classList.remove("active"));
}

export function setMiniGuitarFromFrets(frets) {
  clearMiniGuitar();
  if (!Array.isArray(frets) || frets.length !== 6) return;

  for (let si = 0; si < 6; si++) {
    const f = frets[si];

    // only the frets that we press on
    if (typeof f !== "number" || f <= 0) continue;

    const el = document.querySelector(
      `#guitar .g-cell[data-string="${si}"][data-fret="${f}"]`
    );
    if (!el) continue;

    el.classList.add("active");
  }
}