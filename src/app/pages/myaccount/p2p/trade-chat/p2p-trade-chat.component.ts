import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MaterialModule } from '../../../../material.module';
import { P2PTrade, TradeStatus } from '../model/p2p.model';
import {
  CHAT_QUICK_REPLIES_BUYER,
  CHAT_QUICK_REPLIES_SELLER,
  ChatMessage,
  ChatMessageType,
  groupMessagesByDay,
} from '../model/p2p-chat.model';
import { P2pChatService } from '../service/p2p-chat.service';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPING_STOP_DELAY_MS = 2000;

@Component({
  selector: 'app-p2p-trade-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './p2p-trade-chat.component.html',
  styleUrls: ['./p2p-trade-chat.component.scss'],
})
export class P2pTradeChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input({ required: true }) trade!: P2PTrade;

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('threadEl') private threadEl?: ElementRef<HTMLDivElement>;

  readonly ChatMessageType = ChatMessageType;

  messages: ChatMessage[] = [];
  loading = true;
  loadError = '';

  draft = '';
  sending = false;
  imageError = '';

  counterpartyTyping = false;
  counterpartyOnline = false;

  private shouldAutoScroll = true;
  private lastRenderedCount = 0;

  private subs = new Subscription();
  private typingStop$ = new Subject<void>();
  private clientIdSeq = 0;

  constructor(private chatService: P2pChatService) {}

  ngOnInit(): void {
    this.loadHistory();
    this.chatService.connect(this.trade.id);

    this.subs.add(this.chatService.messages$.subscribe((msg) => this.onIncoming(msg)));
    this.subs.add(this.chatService.counterpartyTyping$.subscribe((t) => (this.counterpartyTyping = t)));
    this.subs.add(this.chatService.counterpartyOnline$.subscribe((o) => (this.counterpartyOnline = o)));
    this.subs.add(
      this.typingStop$.pipe(debounceTime(TYPING_STOP_DELAY_MS)).subscribe(() => this.chatService.notifyTyping(false))
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If the parent swaps to a different trade while this component stays
    // mounted, reset state and reconnect against the new trade room.
    if (changes['trade'] && !changes['trade'].firstChange) {
      const prevId = changes['trade'].previousValue?.id;
      const currId = changes['trade'].currentValue?.id;
      if (prevId && currId && prevId !== currId) {
        this.messages = [];
        this.loadHistory();
        this.chatService.connect(currId);
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.chatService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length !== this.lastRenderedCount) {
      this.lastRenderedCount = this.messages.length;
      this.scrollToBottom();
    }
  }

  // -----------------------------------------------------------------
  // Loading + grouping
  // -----------------------------------------------------------------

  private loadHistory(): void {
    this.loading = true;
    this.loadError = '';
    this.chatService.getMessages(this.trade.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;
        this.markReadIfNeeded();
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Could not load chat history.';
      },
    });
  }

  get groupedMessages() {
    return groupMessagesByDay(this.messages);
  }

  // -----------------------------------------------------------------
  // Incoming / outgoing messages
  // -----------------------------------------------------------------

  private onIncoming(msg: ChatMessage): void {
    // Reconcile against an optimistic message already rendered locally.
    const optimisticIdx = msg.clientId
      ? this.messages.findIndex((m) => m.clientId === msg.clientId && m.pending)
      : -1;

    if (optimisticIdx >= 0) {
      this.messages[optimisticIdx] = msg;
    } else if (!this.messages.some((m) => m.id === msg.id)) {
      this.messages = [...this.messages, msg];
    }
    this.markReadIfNeeded();
  }

  onScroll(): void {
    const el = this.threadEl?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.shouldAutoScroll = distanceFromBottom < 120;
  }

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement?.scrollIntoView({ block: 'end' });
  }

  private markReadIfNeeded(): void {
    const hasUnread = this.messages.some((m) => !m.isMine && !m.readAt);
    if (hasUnread) {
      this.chatService.markRead(this.trade.id).subscribe({ error: () => {} });
    }
  }

  // -----------------------------------------------------------------
  // Composing
  // -----------------------------------------------------------------

  get chatDisabled(): boolean {
    return this.trade.status === TradeStatus.Cancelled || this.trade.status === TradeStatus.Expired;
  }

  get quickReplies(): string[] {
    return this.trade.isBuyer ? CHAT_QUICK_REPLIES_BUYER : CHAT_QUICK_REPLIES_SELLER;
  }

  onDraftChange(): void {
    this.chatService.notifyTyping(true);
    this.typingStop$.next();
  }

  useQuickReply(text: string): void {
    this.draft = text;
    this.sendDraft();
  }

  sendDraft(): void {
    const text = this.draft.trim();
    if (!text || this.chatDisabled) return;
    this.draft = '';
    this.pushOptimisticAndSend({ type: ChatMessageType.Text, text });
  }

  retry(message: ChatMessage): void {
    if (!message.clientId) return;
    this.messages = this.messages.filter((m) => !(m.clientId === message.clientId && m.failed));
    if (message.type === ChatMessageType.Text) {
      this.pushOptimisticAndSend({ type: ChatMessageType.Text, text: message.text || '' });
    } else if (message.imageUrl) {
      this.pushOptimisticAndSend({ type: ChatMessageType.Image, imageUrl: message.imageUrl });
    }
  }

  private pushOptimisticAndSend(payload: { type: ChatMessageType; text?: string; imageUrl?: string }): void {
    const clientId = `local-${Date.now()}-${this.clientIdSeq++}`;
    const optimistic: ChatMessage = {
      id: clientId,
      tradeId: this.trade.id,
      type: payload.type,
      text: payload.text,
      imageUrl: payload.imageUrl,
      sender: { id: 'me', username: 'You' },
      isMine: true,
      isSystem: false,
      createdAt: new Date().toISOString(),
      clientId,
      pending: true,
    };
    this.messages = [...this.messages, optimistic];
    this.shouldAutoScroll = true;
    this.sending = true;

    const request$ =
      payload.type === ChatMessageType.Text
        ? this.chatService.sendText(this.trade.id, payload.text || '', clientId)
        : this.chatService.sendImage(this.trade.id, payload.imageUrl || '', clientId);

    request$.subscribe({
      next: (saved) => {
        this.sending = false;
        const idx = this.messages.findIndex((m) => m.clientId === clientId);
        if (idx >= 0) this.messages[idx] = { ...saved, clientId };
      },
      error: () => {
        this.sending = false;
        const idx = this.messages.findIndex((m) => m.clientId === clientId);
        if (idx >= 0) this.messages[idx] = { ...this.messages[idx], pending: false, failed: true };
      },
    });
  }

  // -----------------------------------------------------------------
  // Image attachment
  // -----------------------------------------------------------------

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.chatDisabled) return;

    this.imageError = '';
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please choose an image file.';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError = 'Image is too large (max 4MB).';
      return;
    }

    this.chatService.fileToDataUrl(file).subscribe({
      next: (dataUrl) => this.pushOptimisticAndSend({ type: ChatMessageType.Image, imageUrl: dataUrl }),
      error: () => (this.imageError = 'Could not read that file, please try again.'),
    });
  }

  openImage(url?: string): void {
    if (url) window.open(url, '_blank');
  }

  trackByMessageId(_index: number, msg: ChatMessage): string {
    return msg.clientId || msg.id;
  }
}