import type { ResultSession } from '@/storage/types';

export interface GameMomentInput {
  packName: string;
  score: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  playMode?: string;
  challengeId?: string;
  challengeName?: string;
  startedAt: string;
  endedAt: string;
  walletAddress?: string;
  hasSignedProof: boolean;
}

export function resultSessionToGameMomentInput(session: ResultSession): GameMomentInput {
  return {
    packName: session.challengeName ?? session.lessonTitle,
    score: session.score,
    accuracy: session.accuracy,
    correctCount: session.correctCount,
    wrongCount: session.wrongCount,
    skippedCount: session.skippedCount,
    playMode: session.playMode,
    challengeId: session.challengeId,
    challengeName: session.challengeName,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    walletAddress: session.walletAddress ?? session.scoreProof?.walletAddress,
    hasSignedProof: Boolean(session.scoreProof),
  };
}

function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 1) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

function formatElapsedMs(startedAt: string, endedAt: string): string {
  const ms = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
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
  return lines.length > 0 ? lines : [text];
}

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

const W = 1080;
const H = 1350;

/**
 * Compose a portrait result card as a JPEG data URL (local only, no upload).
 */
export function composeResultMoment(input: GameMomentInput): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.45, '#1e1b4b');
  bg.addColorStop(1, '#4c1d95');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  fillRoundRect(ctx, 64, 64, W - 128, H - 128, 32);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, 64, 64, W - 128, H - 128, 32);

  const pad = 120;
  let y = 160;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px Nunito, system-ui, sans-serif';
  ctx.fillText('Seeker Motion Quiz', W / 2, y);
  y += 48;

  ctx.font = '600 28px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const modeLabel = input.playMode === 'challenge' ? 'Challenge' : 'Solo';
  ctx.fillText(`${modeLabel} · Game Moment`, W / 2, y);
  y += 72;

  ctx.font = 'bold 44px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const titleLines = wrapText(ctx, input.packName, W - pad * 2);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, W / 2, y);
    y += 52;
  }
  y += 24;

  ctx.font = 'bold 120px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  ctx.fillText(String(input.score), W / 2, y);
  y += 36;
  ctx.font = '600 32px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('points', W / 2, y);
  y += 80;

  const statY = y;
  const colW = (W - pad * 2) / 3;
  const stats = [
    { label: 'Accuracy', value: `${input.accuracy.toFixed(0)}%` },
    { label: 'Correct', value: String(input.correctCount) },
    { label: 'Wrong', value: String(input.wrongCount) },
  ];
  stats.forEach((s, i) => {
    const cx = pad + colW * i + colW / 2;
    ctx.font = 'bold 48px Nunito, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.value, cx, statY);
    ctx.font = '600 24px Nunito, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(s.label, cx, statY + 36);
  });
  y = statY + 100;

  ctx.font = '600 28px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left';
  const metaX = pad + 16;
  const metaLines: string[] = [
    `Time: ${formatElapsedMs(input.startedAt, input.endedAt)}`,
    `Completed: ${new Date(input.endedAt).toLocaleString()}`,
  ];
  if (input.challengeId) {
    metaLines.push(`Challenge ID: ${input.challengeId}`);
  }
  if (input.walletAddress) {
    metaLines.push(`Wallet: ${shortenAddress(input.walletAddress, 6)}`);
  }
  for (const line of metaLines) {
    ctx.fillText(line, metaX, y);
    y += 40;
  }

  if (input.hasSignedProof) {
    y += 16;
    const badgeW = 420;
    const badgeH = 52;
    const badgeX = (W - badgeW) / 2;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    fillRoundRect(ctx, badgeX, y - 36, badgeW, badgeH, 26);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    strokeRoundRect(ctx, badgeX, y - 36, badgeW, badgeH, 26);
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Nunito, system-ui, sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.fillText('Signed Score Proof', W / 2, y);
  }

  const footerY = H - 200;
  ctx.textAlign = 'center';
  ctx.font = '600 24px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Saved locally. Not uploaded.', W / 2, footerY);
  ctx.font = '600 22px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('seeker-motion-quiz · local result card', W / 2, footerY + 36);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function gameMomentFilename(packName: string): string {
  const slug = packName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `seeker-game-moment-${slug || 'quiz'}-${date}.jpg`;
}
