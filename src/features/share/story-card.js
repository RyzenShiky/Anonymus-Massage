const W = 1080, H = 1920;
const FONT = "Inter, system-ui, sans-serif";

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Render a 9:16 story card (question + answer) as a PNG blob. */
export async function renderStoryCard({ question, answer, handle }) {
  try {
    await document.fonts.ready;
  } catch (_) {}
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#5b5ce2");
  bg.addColorStop(1, "#c04cd8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.font = `600 52px ${FONT}`;
  const qLines = wrap(ctx, question, W - 240).slice(0, 8);
  const top = 480;
  const cardH = Math.max(qLines.length * 68 + 170, 240);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(80, top, W - 160, cardH, 48);
  } else {
    ctx.rect(80, top, W - 160, cardH);
  }
  ctx.fill();
  ctx.fillStyle = "#6b6b80";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("Pesan anonim", 120, top + 75);
  ctx.fillStyle = "#14141f";
  ctx.font = `600 52px ${FONT}`;
  qLines.forEach((l, i) => ctx.fillText(l, 120, top + 160 + i * 68));

  ctx.fillStyle = "#fff";
  ctx.font = `700 60px ${FONT}`;
  wrap(ctx, answer, W - 160)
    .slice(0, 10)
    .forEach((l, i) => ctx.fillText(l, 80, top + cardH + 120 + i * 80));

  ctx.globalAlpha = 0.85;
  ctx.font = `500 36px ${FONT}`;
  ctx.fillText(handle || "", 80, H - 120);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Native share sheet when available, otherwise download. */
export async function shareCard(blob) {
  if (!blob) throw new Error("No image");
  const file = new File([blob], "story.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (e) {
      if (e.name === "AbortError") return "cancelled";
    }
  }
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "story.png",
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return "downloaded";
}
