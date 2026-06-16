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
  photoDataUrl?: string;
}

export function defaultPhotoIndex(count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.floor(count / 2));
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

function formatCompletedDate(endedAt: string): string {
  return new Date(endedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load photo'));
    img.src = dataUrl;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const ox = x + (w - dw) / 2;
  const oy = y + (h - dh) / 2;
  ctx.drawImage(img, ox, oy, dw, dh);
}

function drawPhotoScrim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
  gradient.addColorStop(0.45, 'rgba(15, 23, 42, 0.35)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): number {
  ctx.font = 'bold 22px Nunito, system-ui, sans-serif';
  const padX = 18;
  const padY = 10;
  const textW = ctx.measureText(text).width;
  const w = textW + padX * 2;
  const h = 22 + padY * 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  fillRoundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  strokeRoundRect(ctx, x, y, w, h, h / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + padX, y + h / 2);
  ctx.textBaseline = 'alphabetic';
  return w;
}

function drawStatTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  accent: string,
): void {
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  fillRoundRect(ctx, x, y, w, h, 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 20);

  ctx.textAlign = 'center';
  ctx.font = `bold 44px Nunito, system-ui, sans-serif`;
  ctx.fillStyle = accent;
  ctx.fillText(value, x + w / 2, y + h * 0.42);
  ctx.font = '600 22px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(label, x + w / 2, y + h * 0.74);
}

const W = 1080;
const H = 1350;
const CARD_X = 40;
const CARD_Y = 40;
const CARD_W = W - CARD_X * 2;
const CARD_H = H - CARD_Y * 2;
const PAD = 44;
const SECTION_GAP = 48;
const STAT_TILE_H = 128;
const MIN_PHOTO_H = 420;

function drawCardBackground(ctx: CanvasRenderingContext2D): void {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0c1222');
  bg.addColorStop(0.5, '#151033');
  bg.addColorStop(1, '#3b0764');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  fillRoundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 36);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 36);
}

function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  y: number,
  modeLabel: string,
): number {
  const innerX = CARD_X + PAD;
  const innerW = CARD_W - PAD * 2;

  ctx.textAlign = 'left';
  ctx.font = 'bold 30px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Seeker Motion Quiz', innerX, y);

  ctx.font = '600 20px Nunito, system-ui, sans-serif';
  const badge = modeLabel.toUpperCase();
  const badgeW = ctx.measureText(badge).width + 28;
  const badgeX = innerX + innerW - badgeW;
  const badgeY = y - 26;
  ctx.fillStyle = 'rgba(129, 140, 248, 0.22)';
  fillRoundRect(ctx, badgeX, badgeY, badgeW, 36, 18);
  ctx.fillStyle = '#c7d2fe';
  ctx.textAlign = 'center';
  ctx.fillText(badge, badgeX + badgeW / 2, y - 2);
  ctx.textAlign = 'left';

  return y + 36;
}

function drawTopicTitle(ctx: CanvasRenderingContext2D, y: number, packName: string): number {
  const innerX = CARD_X + PAD;
  const maxW = CARD_W - PAD * 2;

  ctx.textAlign = 'left';
  ctx.font = 'bold 38px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  const lines = wrapText(ctx, packName, maxW);
  for (const line of lines.slice(0, 2)) {
    ctx.fillText(line, innerX, y);
    y += 46;
  }
  return y + 8;
}

function drawScoreBlock(ctx: CanvasRenderingContext2D, y: number, score: number): number {
  const innerX = CARD_X + PAD;

  ctx.textAlign = 'left';
  ctx.font = 'bold 96px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  ctx.fillText(String(score), innerX, y);

  const scoreW = ctx.measureText(String(score)).width;
  ctx.font = '600 26px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('points', innerX + scoreW + 16, y - 8);

  return y + 48;
}

function drawScoreOnPhoto(
  ctx: CanvasRenderingContext2D,
  photoX: number,
  photoY: number,
  photoW: number,
  photoH: number,
  score: number,
): void {
  const scrimH = Math.min(220, Math.max(160, photoH * 0.32));
  drawPhotoScrim(ctx, photoX, photoY + photoH - scrimH, photoW, scrimH);

  const baseX = photoX + 28;
  const baseY = photoY + photoH - 36;

  ctx.textAlign = 'left';
  ctx.font = 'bold 88px Nunito, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score), baseX, baseY);

  const scoreW = ctx.measureText(String(score)).width;
  ctx.font = '600 24px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('points', baseX + scoreW + 14, baseY - 6);
}

function measureTopicTitle(ctx: CanvasRenderingContext2D, packName: string, startY: number): number {
  const maxW = CARD_W - PAD * 2;
  ctx.font = 'bold 38px Nunito, system-ui, sans-serif';
  const lines = wrapText(ctx, packName, maxW).slice(0, 2);
  return startY + lines.length * 46 + 8;
}

function countMetaLines(input: GameMomentInput): number {
  return input.challengeId || input.walletAddress ? 2 : 1;
}

interface BottomLayout {
  statsY: number;
  metaStartY: number;
  proofY: number | null;
  footerY: number;
}

function computeBottomLayout(input: GameMomentInput): BottomLayout {
  const footerY = CARD_Y + CARD_H - 44;
  const metaLineH = 34;
  const metaBlockH = countMetaLines(input) * metaLineH;
  const metaStartY = footerY - 52 - metaBlockH;

  let blockTop = metaStartY - SECTION_GAP;
  let proofY: number | null = null;
  if (input.hasSignedProof) {
    const proofH = 52;
    proofY = blockTop - proofH;
    blockTop = proofY - SECTION_GAP;
  }

  const statsY = blockTop - STAT_TILE_H;
  return { statsY, metaStartY, proofY, footerY };
}

function drawBottomSections(
  ctx: CanvasRenderingContext2D,
  input: GameMomentInput,
  layout: BottomLayout,
): void {
  const innerX = CARD_X + PAD;
  const innerW = CARD_W - PAD * 2;
  const gap = 16;
  const tileW = (innerW - gap * 2) / 3;

  drawStatTile(
    ctx, innerX, layout.statsY, tileW, STAT_TILE_H,
    `${input.accuracy.toFixed(0)}%`, 'Accuracy', '#ffffff',
  );
  drawStatTile(
    ctx, innerX + tileW + gap, layout.statsY, tileW, STAT_TILE_H,
    String(input.correctCount), 'Correct', '#86efac',
  );
  drawStatTile(
    ctx, innerX + (tileW + gap) * 2, layout.statsY, tileW, STAT_TILE_H,
    String(input.wrongCount), 'Wrong', '#fca5a5',
  );

  ctx.textAlign = 'center';
  let metaY = layout.metaStartY + 24;
  ctx.font = '600 26px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const timeLine = `${formatElapsedMs(input.startedAt, input.endedAt)} · ${formatCompletedDate(input.endedAt)}`;
  ctx.fillText(timeLine, innerX + innerW / 2, metaY);
  metaY += 34;

  const extras: string[] = [];
  if (input.challengeId) extras.push(`Challenge ${input.challengeId.slice(0, 8)}…`);
  if (input.walletAddress) extras.push(`Wallet ${shortenAddress(input.walletAddress, 6)}`);
  if (extras.length > 0) {
    ctx.font = '600 22px Nunito, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(extras.join(' · '), innerX + innerW / 2, metaY);
  }

  if (layout.proofY != null) {
    const badgeW = 380;
    const badgeH = 52;
    const badgeX = (W - badgeW) / 2;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
    fillRoundRect(ctx, badgeX, layout.proofY, badgeW, badgeH, 24);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
    ctx.lineWidth = 1.5;
    strokeRoundRect(ctx, badgeX, layout.proofY, badgeW, badgeH, 24);
    ctx.font = 'bold 22px Nunito, system-ui, sans-serif';
    ctx.fillStyle = '#86efac';
    ctx.fillText('Signed Score Proof', W / 2, layout.proofY + 32);
  }

  ctx.textAlign = 'center';
  ctx.font = '600 20px Nunito, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('Saved locally · not uploaded', W / 2, layout.footerY);
}

/**
 * Compose a portrait result card as a JPEG data URL (local only, no upload).
 */
export async function composeResultMoment(input: GameMomentInput): Promise<string | null> {
  let photo: HTMLImageElement | null = null;
  if (input.photoDataUrl) {
    try {
      photo = await loadImage(input.photoDataUrl);
    } catch {
      photo = null;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  drawCardBackground(ctx);

  const modeLabel = input.playMode === 'challenge' ? 'Challenge' : 'Solo';
  const innerX = CARD_X + PAD;
  const innerW = CARD_W - PAD * 2;
  const layout = computeBottomLayout(input);

  let headerY = CARD_Y + PAD;
  headerY = drawBrandHeader(ctx, headerY, modeLabel);
  const headerBottom = measureTopicTitle(ctx, input.packName, headerY);
  drawTopicTitle(ctx, headerY, input.packName);

  if (photo) {
    const photoY = headerBottom + SECTION_GAP;
    const photoH = Math.max(MIN_PHOTO_H, layout.statsY - SECTION_GAP - photoY);

    ctx.save();
    fillRoundRect(ctx, innerX, photoY, innerW, photoH, 24);
    ctx.clip();
    drawCoverImage(ctx, photo, innerX, photoY, innerW, photoH);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    strokeRoundRect(ctx, innerX, photoY, innerW, photoH, 24);

    drawPillBadge(ctx, 'Game Moment', innerX + 20, photoY + 20);
    drawScoreOnPhoto(ctx, innerX, photoY, innerW, photoH, input.score);
  } else {
    const scoreAreaTop = headerBottom + SECTION_GAP;
    const scoreAreaBottom = layout.statsY - SECTION_GAP;
    const scoreAreaH = scoreAreaBottom - scoreAreaTop;
    const scoreBaseline = scoreAreaTop + scoreAreaH * 0.62;
    drawScoreBlock(ctx, scoreBaseline, input.score);
  }

  drawBottomSections(ctx, input, layout);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function gameMomentFilename(packName: string): string {
  const slug = packName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return `seeker-game-moment-${slug || 'quiz'}-${date}.jpg`;
}
