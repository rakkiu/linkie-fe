export type PhotoboothLayout = 'strip1x2' | 'grid2x2' | 'grid2x4';

export type StickerCategory = 'emoji' | 'decorative' | 'text';

export interface StickerItem {
  id: string;
  content: string;
  category: StickerCategory;
  position: { x: number; y: number }; // normalized 0.0 to 1.0
  scale: number;
  rotation: number; // radians
  baseFontSize: number;
  textColor?: string;
}

export const PHOTOBOOTH_LAYOUT_META = {
  strip1x2: {
    photoCount: 2,
    label: '1×2 Strip',
    icon: '📋'
  },
  grid2x2: {
    photoCount: 4,
    label: '2×2 Grid',
    icon: '⊞'
  },
  grid2x4: {
    photoCount: 8,
    label: '2×4 Grid',
    icon: '▦'
  }
};

interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
  isTopEdge: boolean;
  isBottomEdge: boolean;
  isLeftEdge: boolean;
  isRightEdge: boolean;
}

export class PhotoboothCompositor {
  static readonly canvasWidth = 1080;
  static readonly canvasHeight = 1920;
  
  // -- THÔNG SỐ KHUNG CHUẨN --
  static readonly gap = 24.0;           // Khoảng cách giữa các ảnh
  static readonly paddingTop = 100.0;   // Lề trên (để header)
  static readonly paddingBottom = 280.0;// Lề dưới lớn (để footer, sticker, QR...)
  static readonly paddingSide = 56.0;   // Lề trái phải (để chữ chạy dọc)
  
  private static readonly cornerRadius = 0.0;

  /** Helper load an image from URL / Base64 */
  static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  /** Main composite function using HTML5 Canvas. */
  static async compositePhotobooth({
    photos,
    layout,
    frameOverlayUrl,
    stickers = [],
    isFrontCamera = true,
  }: {
    photos: string[]; // base64 or blob URLs
    layout: PhotoboothLayout;
    frameOverlayUrl?: string | null;
    stickers?: StickerItem[];
    isFrontCamera?: boolean;
  }): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');

    // 1. Draw gradient background
    this.drawBackground(ctx);

    // 2. Decode photos and draw in cells
    const cellRects = this.getCellRects(layout);
    for (let i = 0; i < cellRects.length && i < photos.length; i++) {
      try {
        const img = await this.loadImage(photos[i]);
        this.drawPhotoInCell(ctx, img, cellRects[i], isFrontCamera);
      } catch (err) {
        console.error('Failed to load photo for compositing:', err);
      }
    }

    // 3. Draw AR Frame overlay
    if (frameOverlayUrl) {
      try {
        const frameImg = await this.loadImage(frameOverlayUrl);
        ctx.drawImage(frameImg, 0, 0, this.canvasWidth, this.canvasHeight);
      } catch (err) {
        console.error('Failed to load frame overlay for compositing:', err);
      }
    }

    // 4. Draw stickers
    for (const sticker of stickers) {
      this.drawSticker(ctx, sticker);
    }

    // 5. Output as data URL
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  /** Draw flat background */
  private static drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000000'; // Đen tuyệt đối để dễ đồng bộ với Khung AR
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /** Calculate cell rectangle bounds based on layout */
  private static getCellRects(layout: PhotoboothLayout): CellRect[] {
    const rects: CellRect[] = [];
    const W = this.canvasWidth;
    const H = this.canvasHeight;
    const gap = this.gap;
    const pT = this.paddingTop;
    const pB = this.paddingBottom;
    const pS = this.paddingSide;

    if (layout === 'strip1x2') {
      const cellW = W - pS * 2;
      const totalGaps = gap * 1;
      const cellH = (H - pT - pB - totalGaps) / 2;
      for (let row = 0; row < 2; row++) {
        const y = pT + row * (cellH + gap);
        rects.push({
          x: pS,
          y,
          w: cellW,
          h: cellH,
          isTopEdge: row === 0,
          isBottomEdge: row === 1,
          isLeftEdge: true,
          isRightEdge: true
        });
      }
    } else if (layout === 'grid2x2') {
      const cellW = (W - pS * 2 - gap) / 2;
      const cellH = (H - pT - pB - gap) / 2;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const x = pS + col * (cellW + gap);
          const y = pT + row * (cellH + gap);
          rects.push({
            x,
            y,
            w: cellW,
            h: cellH,
            isTopEdge: row === 0,
            isBottomEdge: row === 1,
            isLeftEdge: col === 0,
            isRightEdge: col === 1
          });
        }
      }
    } else if (layout === 'grid2x4') {
      const cellW = (W - pS * 2 - gap) / 2;
      const totalGaps = gap * 3;
      const cellH = (H - pT - pB - totalGaps) / 4;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          const x = pS + col * (cellW + gap);
          const y = pT + row * (cellH + gap);
          rects.push({
            x,
            y,
            w: cellW,
            h: cellH,
            isTopEdge: row === 0,
            isBottomEdge: row === 3,
            isLeftEdge: col === 0,
            isRightEdge: col === 1
          });
        }
      }
    }
    return rects;
  }

  /** Draw a single image into a layout cell with cover fit, border radius, border and flip option */
  private static drawPhotoInCell(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cell: CellRect,
    _flipHorizontal: boolean
  ) {
    ctx.save();

    // Định nghĩa lượng bleed khác nhau giữa mép ngoài và mép trong (gap)
    const outerBleed = 40.0; // Tràn mạnh 40px ở các mép tiếp giáp khung viền ngoài để đảm bảo che hết vạch đen
    const innerBleed = 0.0;  // Không tràn ở các mép trong để giữ nguyên vẹn đường line ở giữa

    const bleedTop = cell.isTopEdge ? outerBleed : innerBleed;
    const bleedBottom = cell.isBottomEdge ? outerBleed : innerBleed;
    const bleedLeft = cell.isLeftEdge ? outerBleed : innerBleed;
    const bleedRight = cell.isRightEdge ? outerBleed : innerBleed;

    const drawX = cell.x - bleedLeft;
    const drawY = cell.y - bleedTop;
    const drawW = cell.w + bleedLeft + bleedRight;
    const drawH = cell.h + bleedTop + bleedBottom;

    // 1) Clip rounded rectangle path (chỉ clip khi có bo góc > 0)
    if (this.cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, this.cornerRadius);
      ctx.clip();
    }

    // 2) Calculate cover fit (crop to fill) theo kích thước vẽ thực tế
    const imgAspect = img.width / img.height;
    const drawAspect = drawW / drawH;

    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > drawAspect) {
      // Image is wider than cell - crop horizontal sides
      sw = img.height * drawAspect;
      sx = (img.width - sw) / 2;
    } else {
      // Image is taller than cell - crop vertical top/bottom
      sh = img.width / drawAspect;
      sy = (img.height - sh) / 2;
    }

    // 4) Draw the cropped image with bleed coordinates
    ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawW, drawH);

    ctx.restore();

    // 5) Draw inner stroke (border) around the image  // Viền trắng mờ đã bị xoá theo yêu cầu để tránh lộ khe hở với Khung AR.
  }

  /** Draw sticker on canvas */
  private static drawSticker(ctx: CanvasRenderingContext2D, sticker: StickerItem) {
    ctx.save();

    // Map normalized coordinates (0..1) to actual canvas size
    const dx = sticker.position.x * this.canvasWidth;
    const dy = sticker.position.y * this.canvasHeight;

    ctx.translate(dx, dy);
    ctx.rotate(sticker.rotation);
    ctx.scale(sticker.scale, sticker.scale);

    // Font size is scaled up because canvas is 1080x1920
    const fontSize = sticker.baseFontSize * 2;

    if (sticker.category === 'text') {
      this.drawTextSticker(ctx, sticker, fontSize);
    } else {
      // Draw Emoji sticker
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sticker.content, 0, 0);
    }

    ctx.restore();
  }

  /** Draw styled text sticker with background pill and shadow glow */
  private static drawTextSticker(ctx: CanvasRenderingContext2D, sticker: StickerItem, fontSize: number) {
    ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = sticker.content;
    const textMetrics = ctx.measureText(text);
    
    // Approximate height since textMetrics.actualBoundingBoxAscent can be noisy
    const textHeight = fontSize * 0.8;
    const textWidth = textMetrics.width;

    const bgW = textWidth + 40;
    const bgH = textHeight + 24;

    ctx.save();

    // Shadow glow
    const pillColor = sticker.textColor || '#E91E8C';
    ctx.shadowColor = pillColor;
    ctx.shadowBlur = 24;

    // Draw background pill
    ctx.beginPath();
    ctx.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, 24);
    ctx.fillStyle = pillColor;
    ctx.fill();

    ctx.restore();

    // Draw bold white text on top
    ctx.fillStyle = '#ffffff';
    // Offset slightly for text vertical alignment alignment
    ctx.fillText(text, 0, fontSize * 0.05);
  }
}
