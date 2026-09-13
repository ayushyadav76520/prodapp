"use client";

interface ShareCardOptions {
  eyebrow: string; // small label at top, e.g. "FOCUS SESSION" or "ZENSPACE CHALLENGE"
  title: string; // big headline, e.g. session title or skill name
  statLine: string; // e.g. "45 minutes focused" or "Day 12 of 90"
  progressPercent?: number; // 0-100, draws a progress bar if provided
  footer: string; // e.g. "conflict-calendar"
  userName?: string; // shows a small avatar (initials) + name near the footer
  level?: number; // shows "LV {level}" badge near the avatar
}

const WIDTH = 1080;
const HEIGHT = 1080;

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background — warm ink tone matching the app's dark theme.
  ctx.fillStyle = "#17140f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Soft accent glow, top-left.
  const glow = ctx.createRadialGradient(200, 200, 0, 200, 200, 600);
  glow.addColorStop(0, "rgba(224,138,95,0.25)");
  glow.addColorStop(1, "rgba(224,138,95,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const marginX = 90;
  let y = 140;

  // Eyebrow
  ctx.fillStyle = "#e08a5f";
  ctx.font = "600 28px Georgia, serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(opts.eyebrow.toUpperCase(), marginX, y);

  // Title — wraps across up to 3 lines.
  y += 90;
  ctx.fillStyle = "#ece7d9";
  ctx.font = "700 74px Georgia, serif";
  const words = opts.title.split(" ");
  let line = "";
  const maxWidth = WIDTH - marginX * 2;
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, marginX, y);
    y += 84;
  }

  // Stat line
  y += 30;
  ctx.fillStyle = "#a89e8a";
  ctx.font = "400 36px Arial, sans-serif";
  ctx.fillText(opts.statLine, marginX, y);

  // Progress bar
  if (typeof opts.progressPercent === "number") {
    y += 60;
    const barWidth = WIDTH - marginX * 2;
    const barHeight = 22;
    ctx.fillStyle = "rgba(236,231,217,0.15)";
    roundRect(ctx, marginX, y, barWidth, barHeight, 11);
    ctx.fill();
    ctx.fillStyle = "#e08a5f";
    const filled = Math.max(barHeight, (Math.min(100, opts.progressPercent) / 100) * barWidth);
    roundRect(ctx, marginX, y, filled, barHeight, 11);
    ctx.fill();
  }

  // Footer
  ctx.fillStyle = "#6b6355";
  ctx.font = "400 30px Arial, sans-serif";
  ctx.fillText(opts.footer, marginX, HEIGHT - 90);

  // Profile avatar (initials circle) + level badge, bottom-right area.
  if (opts.userName) {
    const initials = opts.userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
    const cx = WIDTH - 150;
    const cy = HEIGHT - 105;
    const r = 44;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e08a5f";
    ctx.fill();
    ctx.fillStyle = "#17140f";
    ctx.font = "700 36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, cx, cy + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (typeof opts.level === "number") {
      ctx.fillStyle = "#a89e8a";
      ctx.font = "600 26px Arial, sans-serif";
      ctx.fillText(`LV ${opts.level}`, cx - r, cy + r + 34);
    }
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownload(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return;
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  downloadBlob(blob, filename);
}
