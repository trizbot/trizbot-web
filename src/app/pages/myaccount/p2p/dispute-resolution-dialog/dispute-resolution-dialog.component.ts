import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialModule } from '../../../../material.module';
import { SharedService } from '../../../../shared/shared.service';
import { P2pService } from '../service/p2p.service';
import { P2PTrade, DisputeResolution, fiatSymbol, maskAccountNumber } from '../model/p2p.model';

export interface DisputeResolutionDialogData {
  trade: P2PTrade;
}

interface TouchPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-dispute-resolution-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './dispute-resolution-dialog.component.html',
  styleUrls: ['./dispute-resolution-dialog.component.scss'],
})
export class DisputeResolutionDialogComponent {
  readonly DisputeResolution = DisputeResolution;

  trade: P2PTrade;
  adminNote = '';
  resolving: DisputeResolution | null = null;
  errorMessage = '';

  // ---- Zoom / lightbox state ----
  zoomImageUrl: string | null = null;
  zoomTitle = '';
  zoomScale = 1;
  readonly minZoom = 1;
  readonly maxZoom = 6;
  private readonly zoomStep = 0.35;

  panX = 0;
  panY = 0;
  isDragging = false;

  // mouse drag
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;

  // touch state
  private activeTouches: TouchPoint[] = [];
  private touchStartDistance = 0;
  private touchStartScale = 1;
  private touchStartMidpoint: TouchPoint = { x: 0, y: 0 };
  private lastTapTime = 0;

  constructor(
    private dialogRef: MatDialogRef<DisputeResolutionDialogComponent>,
    private p2pService: P2pService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) public data: DisputeResolutionDialogData
  ) {
    this.trade = data.trade;
  }

  close(result?: P2PTrade): void {
    this.dialogRef.close(result);
  }

  tradeFiatSymbol(): string {
    return fiatSymbol(this.trade.order?.fiatCurrency);
  }

  maskedAccountNumber(value: string | undefined | null): string {
    return maskAccountNumber(value);
  }

  looksLikeImage(url: string | undefined | null): boolean {
    if (!url) return false;
    return /\.(png|jpe?g|gif|webp)($|\?)/i.test(url) || url.startsWith('data:image/');
  }

  resolve(resolution: DisputeResolution): void {
    if (this.resolving) return;

    const label =
      resolution === DisputeResolution.ReleaseToBuyer
        ? `release ${this.trade.coinAmount} ${this.trade.order?.coin || ''} to the buyer (@${this.trade.buyer.username})`
        : `refund ${this.trade.coinAmount} ${this.trade.order?.coin || ''} to the seller (@${this.trade.seller.username})`;

    const confirmed = window.confirm(
      `You are about to ${label}. This is based on your review of the submitted evidence and cannot be undone. Continue?`
    );
    if (!confirmed) return;

    this.errorMessage = '';
    this.resolving = resolution;

    this.p2pService
      .resolveDispute({
        tradeId: this.trade.id,
        resolution,
        note: this.adminNote.trim() || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.resolving = null;
          this.sharedService.showToast({
            title:
              resolution === DisputeResolution.ReleaseToBuyer
                ? 'Funds released to the buyer.'
                : 'Funds refunded to the seller.',
          });
          this.close(updated);
        },
        error: (err) => {
          this.resolving = null;
          const message = err?.error?.message || 'Could not resolve this dispute right now.';
          this.errorMessage = Array.isArray(message) ? message.join(', ') : message;
        },
      });
  }

  // ---------------- Zoom / lightbox logic ----------------

  openZoom(url: string | undefined | null, title: string): void {
    if (!url) return;
    this.zoomImageUrl = url;
    this.zoomTitle = title;
    this.resetZoomState();
  }

  closeZoom(): void {
    this.zoomImageUrl = null;
    this.zoomTitle = '';
    this.resetZoomState();
  }

  onOverlayClick(event: MouseEvent): void {
    // Click/tap on the dark backdrop (not the image or toolbar) closes the lightbox
    this.closeZoom();
  }

  zoomIn(): void {
    this.setZoom(this.zoomScale + this.zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.zoomScale - this.zoomStep);
  }

  resetZoom(): void {
    this.resetZoomState();
  }

  onDoubleClick(): void {
    if (this.zoomScale > this.minZoom) {
      this.resetZoomState();
    } else {
      this.setZoom(2.5);
    }
  }

  // ----- mouse (desktop) -----

  onWheelZoom(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
    this.setZoom(this.zoomScale + delta);
  }

  onDragStart(event: MouseEvent): void {
    if (this.zoomScale <= this.minZoom) return;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
  }

  onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.panX = this.panStartX + (event.clientX - this.dragStartX);
    this.panY = this.panStartY + (event.clientY - this.dragStartY);
  }

  onDragEnd(): void {
    this.isDragging = false;
  }

  // ----- touch (mobile: pinch-to-zoom, one-finger pan, double-tap) -----

  onTouchStart(event: TouchEvent): void {
    this.activeTouches = this.touchesToPoints(event.touches);

    if (this.activeTouches.length === 2) {
      // start of a pinch gesture
      this.isDragging = false;
      this.touchStartDistance = this.distanceBetween(this.activeTouches[0], this.activeTouches[1]);
      this.touchStartScale = this.zoomScale;
      this.touchStartMidpoint = this.midpointBetween(this.activeTouches[0], this.activeTouches[1]);
    } else if (this.activeTouches.length === 1) {
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        // double-tap detected
        this.onDoubleClick();
        this.lastTapTime = 0;
        return;
      }
      this.lastTapTime = now;

      if (this.zoomScale > this.minZoom) {
        this.isDragging = true;
        this.dragStartX = this.activeTouches[0].x;
        this.dragStartY = this.activeTouches[0].y;
        this.panStartX = this.panX;
        this.panStartY = this.panY;
      }
    }
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touches = this.touchesToPoints(event.touches);

    if (touches.length === 2) {
      // pinch zoom
      const distance = this.distanceBetween(touches[0], touches[1]);
      if (this.touchStartDistance > 0) {
        const ratio = distance / this.touchStartDistance;
        this.setZoom(this.touchStartScale * ratio);
      }
    } else if (touches.length === 1 && this.isDragging) {
      // one-finger pan
      this.panX = this.panStartX + (touches[0].x - this.dragStartX);
      this.panY = this.panStartY + (touches[0].y - this.dragStartY);
    }

    this.activeTouches = touches;
  }

  onTouchEnd(event: TouchEvent): void {
    const remaining = this.touchesToPoints(event.touches);
    this.activeTouches = remaining;

    if (remaining.length === 0) {
      this.isDragging = false;
      this.touchStartDistance = 0;
    } else if (remaining.length === 1 && this.zoomScale > this.minZoom) {
      // transition from pinch to single-finger pan
      this.isDragging = true;
      this.dragStartX = remaining[0].x;
      this.dragStartY = remaining[0].y;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
    }
  }

  private touchesToPoints(touches: TouchList): TouchPoint[] {
    const points: TouchPoint[] = [];
    for (let i = 0; i < touches.length; i++) {
      points.push({ x: touches[i].clientX, y: touches[i].clientY });
    }
    return points;
  }

  private distanceBetween(a: TouchPoint, b: TouchPoint): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private midpointBetween(a: TouchPoint, b: TouchPoint): TouchPoint {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.zoomImageUrl) {
      this.closeZoom();
    }
  }

  private setZoom(value: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, value));
    this.zoomScale = clamped;
    if (clamped <= this.minZoom) {
      this.panX = 0;
      this.panY = 0;
    }
  }

  private resetZoomState(): void {
    this.zoomScale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.activeTouches = [];
    this.touchStartDistance = 0;
  }
}