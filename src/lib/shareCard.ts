"use client";

interface ShareCardOptions {
  eyebrow: string;
  title: string;
  statLine: string;
  progressPercent?: number;
  footer: string;
  userName?: string;
  level?: number;
}

const WIDTH = 1080;
const HEIGHT = 1080;

export async function generateShareCard(opts: ShareCardOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#17140f";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(150, 120, 0, 150, 120, 650);
  glow.addColorStop(0, "rgba(224,138,95,0.26)");
  glow.addColorStop(1, "rgba(224,138,95,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const margin = 86;
  let y = 110;

  // Large profile header — intentionally much more visible than the old footer avatar.
  if (opts.userName) {
    ctx.fillStyle = "rgba(236,231,217,0.08)";
    roundRect(ctx, margin, y, WIDTH - margin * 2, 138, 34);
    ctx.fill();

    const avatarX = margin + 68;
    const avatarY = y + 69;
    const avatarR = 42;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = "#e08a5f";
    ctx.fill();
    ctx.fillStyle = "#17140f";
    ctx.font = "700 30px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(opts.userName), avatarX, avatarY + 1);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ece7d9";
    ctx.font = "700 34px Georgia, serif";
    ctx.fillText(opts.userName, margin + 132, y + 60);
    ctx.fillStyle = "#a89e8a";
    ctx.font = "600 23px Arial, sans-serif";
    ctx.fillText(typeof opts.level === "number" ? `LEVEL ${opts.level}` : "CONFLICT-CALENDAR", margin + 132, y + 98);
    y += 185;
  }

  ctx.fillStyle = "#e08a5f";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(opts.eyebrow.toUpperCase(), margin, y);

  y += 100;
  ctx.fillStyle = "#ece7d9";
  ctx.font = "700 74px Georgia, serif";
  const maxWidth = WIDTH - margin * 2;
  const lines: string[] = [];
  let line = "";
  for (const word of opts.title.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, margin, y);
    y += 86;
  }

  y += 20;
  ctx.fillStyle = "#a89e8a";
  ctx.font = "400 36px Arial, sans-serif";
  ctx.fillText(opts.statLine, margin, y);

  if (typeof opts.progressPercent === "number") {
    y += 72;
    const barW = WIDTH - margin * 2;
    const barH = 24;
    ctx.fillStyle = "rgba(236,231,217,0.14)";
    roundRect(ctx, margin, y, barW, barH, 12);
    ctx.fill();
    ctx.fillStyle = "#e08a5f";
    const filled = Math.max(barH, (Math.min(100, Math.max(0, opts.progressPercent)) / 100) * barW);
    roundRect(ctx, margin, y, filled, barH, 12);
    ctx.fill();

    ctx.fillStyle = "#ece7d9";
    ctx.font = "700 28px Arial, sans-serif";
    ctx.fillText(`${Math.round(opts.progressPercent)}% COMPLETE`, margin, y + 62);
  }

  ctx.fillStyle = "#6b6355";
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillText(opts.footer, margin, HEIGHT - 60);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
      // cancelled/failed -> download below
    }
  }
  downloadBlob(blob, filename);
}
