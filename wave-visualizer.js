let waveRafId = null;

export function startWaveVisualizer(canvas, waveAnalyser) {

  if (!canvas || !waveAnalyser) return;

  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;

  // retina ölçekleme
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const core = "rgba(106,99,255,0.95)";
  const glow1 = "rgba(106,99,255,0.35)";
  const glow2 = "rgba(106,99,255,0.18)";

  function strokeWave(data, w, h, lineWidth, strokeStyle) {
    const mid = h / 2;
    const amp = h * 0.42;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = mid + data[i] * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

   function draw() {
    const w = cssW;
    const h = cssH;

    // ✅ trail istiyorsan clearRect yerine bunu kullan:
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, w, h);

    const data = waveAnalyser.getValue();

    // ✅ glow katmanları (kalından inceye)
    strokeWave(data, w, h, 8, glow2);
    strokeWave(data, w, h, 4, glow1);
    strokeWave(data, w, h, 2, core);

    waveRafId = requestAnimationFrame(draw);
  }

  if (waveRafId) cancelAnimationFrame(waveRafId);

  // ilk arka planı siyaha bas (trail düzgün başlasın)
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cssW, cssH);

  draw();
}