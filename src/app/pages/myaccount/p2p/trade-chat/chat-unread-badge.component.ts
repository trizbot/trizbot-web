import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { P2pChatService } from '../service/p2p-chat.service';

@Component({
  selector: 'app-chat-unread-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="chat-unread-badge" *ngIf="count > 0" [class.dot-only]="dotOnly">
      <ng-container *ngIf="!dotOnly">{{ count > 99 ? '99+' : count }}</ng-container>
    </span>
  `,
  styles: [`
    .chat-unread-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: #ff4d4f;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
    }
    .chat-unread-badge.dot-only {
      min-width: 10px;
      width: 10px;
      height: 10px;
      padding: 0;
      border: 1.5px solid #fff;
    }
  `],
})
export class ChatUnreadBadgeComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) tradeId!: string;
  @Input() dotOnly = true;

  count = 0;
  private sub?: Subscription;

  constructor(private chatService: P2pChatService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tradeId']) {
      this.sub?.unsubscribe();
      this.count = 0;
      if (this.tradeId) {
        this.sub = this.chatService.getUnreadCount(this.tradeId).subscribe((c) => (this.count = c));
      }
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}