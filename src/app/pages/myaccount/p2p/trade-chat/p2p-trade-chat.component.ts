import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
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
  CHAT_QUICK_EMOJIS,
  CHAT_QUICK_REPLIES_BUYER,
  CHAT_QUICK_REPLIES_SELLER,
  ChatMessage,
  ChatMessageType,
  formatBytes,
  groupMessagesByDay,
  MAX_EVIDENCE_BYTES,
} from '../model/p2p-chat.model';
import { ConnectionState, P2pChatService } from '../service/p2p-chat.service';

const TYPING_STOP_DELAY_MS = 2000;
const NEAR_BOTTOM_PX = 120;
const NEAR_TOP_PX = 80;
const MAX_MESSAGE_LENGTH = 1000;

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
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  readonly ChatMessageType = ChatMessageType;
  readonly quickEmojis = CHAT_QUICK_EMOJIS;
  readonly maxMessageLength = MAX_MESSAGE_LENGTH;
  readonly maxEvidenceLabel = formatBytes(MAX_EVIDENCE_BYTES);

  messages: ChatMessage[] = [];
  loading = true;
  loadError = '';
  loadingOlder = false;
  hasMoreHistory = true;

  draft = '';
  imageError = '';
  showEmojiPicker = false;
  isDragging = false;

  counterpartyTyping = false;
  counterpartyOnline = false;
  connectionState: ConnectionState = 'disconnected';

  showJumpToBottom = false;
  unseenWhileScrolledUp = 0;

  lightboxUrl: string | null = null;

  private shouldAutoScroll = true;
  private lastRenderedCount = 0;
  private dragCounter = 0;

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
    this.subs.add(this.chatService.connectionState.subscribe((s) => (this.connectionState = s)));
    this.subs.add(this.chatService.counterpartyReadUpTo$.subscribe((readAt) => this.applyReadReceipt(readAt)));
    this.subs.add(
      this.typingStop$.pipe(debounceTime(TYPING_STOP_DELAY_MS)).subscribe(() => this.chatService.notifyTyping(false))
    );
    this.initialize();
  }



  async initialize(): Promise<void> {
  try {
    this.loading = true;

    await this.chatService.initialize(
      this.trade
    );

    this.loadHistory();

    await this.chatService.connect(
      this.trade.id,
      this.trade
    );

    this.subs.add(
      this.chatService.messages$
        .subscribe((msg) =>
          this.onIncoming(msg)
        )
    );

    this.subs.add(
      this.chatService.counterpartyTyping$
        .subscribe(
          (typing) =>
            (this.counterpartyTyping =
              typing)
        )
    );

    this.subs.add(
      this.chatService.counterpartyOnline$
        .subscribe(
          (online) =>
            (this.counterpartyOnline =
              online)
        )
    );

    this.subs.add(
      this.chatService.connectionState
        .subscribe(
          (state) =>
            (this.connectionState =
              state)
        )
    );

    this.subs.add(
      this.chatService
        .counterpartyReadUpTo$
        .subscribe((readAt) =>
          this.applyReadReceipt(
            readAt
          )
        )
    );

    this.subs.add(
      this.typingStop$
        .pipe(
          debounceTime(
            TYPING_STOP_DELAY_MS
          )
        )
        .subscribe(() =>
          this.chatService.notifyTyping(
            false
          )
        )
    );
  } catch (error) {
    console.error(
      'Unable to initialize Firebase chat:',
      error
    );

    this.loading = false;

    this.loadError =
      'Unable to connect to chat. Please try again.';
  }
}


  async ngOnChanges(
  changes: SimpleChanges
): Promise<void> {
  if (
    changes['trade'] &&
    !changes['trade'].firstChange
  ) {
    const prevId =
      changes['trade']
        .previousValue?.id;

    const currId =
      changes['trade']
        .currentValue?.id;

    if (
      prevId &&
      currId &&
      prevId !== currId
    ) {
      this.messages = [];

      this.hasMoreHistory = true;

      this.loading = true;

      try {
        await this.chatService.connect(
          currId,
          this.trade
        );

        await this.loadHistory();
      } catch (error) {
        console.error(
          'Unable to switch Firebase chat room:',
          error
        );

        this.loadError =
          'Unable to connect to this chat.';
      }
    }
  }
}

ngOnDestroy(): void {
  this.subs.unsubscribe();
  this.chatService.disconnect();
  this.revokeAllObjectUrls();
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

 private async loadHistory(): Promise<void> {
  this.loading = true;
  this.loadError = '';

  try {
    const messages =
      await this.chatService.getMessages(
        this.trade.id
      );

    this.messages = messages;

    this.loading = false;

    this.hasMoreHistory =
      messages.length >= 100;

    this.markReadIfNeeded();
  } catch (error) {
    console.error(
      'Chat history error:',
      error
    );

    this.loading = false;

    this.loadError =
      'Could not load chat history.';
  }
}

  async loadOlder(): Promise<void> {
  if (
    this.loadingOlder ||
    !this.hasMoreHistory ||
    this.messages.length === 0
  ) {
    return;
  }

  const el =
    this.threadEl?.nativeElement;

  const prevScrollHeight =
    el?.scrollHeight ?? 0;

  this.loadingOlder = true;

  const oldest =
    this.messages[0]?.createdAt;

  try {
    const older =
      await this.chatService.getMessages(
        this.trade.id,
        oldest
      );

    if (older.length === 0) {
      this.hasMoreHistory = false;
      return;
    }

    this.messages = [
      ...older,
      ...this.messages,
    ];

    queueMicrotask(() => {
      if (el) {
        el.scrollTop =
          el.scrollHeight -
          prevScrollHeight;
      }
    });

    this.hasMoreHistory =
      older.length >= 50;
  } catch (error) {
    console.error(
      'Unable to load older messages:',
      error
    );
  } finally {
    this.loadingOlder = false;
  }
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
      if (!this.shouldAutoScroll && !msg.isMine) {
        this.unseenWhileScrolledUp++;
        this.showJumpToBottom = true;
      }
    }
    this.markReadIfNeeded();
  }

  /** Real-time double-check-mark update: counterparty just read our messages. */
  private applyReadReceipt(readAt: string): void {
    const readAtMs = new Date(readAt).getTime();
    this.messages = this.messages.map((m) =>
      m.isMine && !m.readAt && new Date(m.createdAt).getTime() <= readAtMs ? { ...m, readAt } : m
    );
  }

  onScroll(): void {
    const el = this.threadEl?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.shouldAutoScroll = distanceFromBottom < NEAR_BOTTOM_PX;
    this.showJumpToBottom = !this.shouldAutoScroll;
    if (this.shouldAutoScroll) this.unseenWhileScrolledUp = 0;

    if (el.scrollTop < NEAR_TOP_PX) this.loadOlder();
  }

  jumpToBottom(): void {
    this.shouldAutoScroll = true;
    this.unseenWhileScrolledUp = 0;
    this.showJumpToBottom = false;
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement?.scrollIntoView({ block: 'end' });
  }

 private markReadIfNeeded(): void {
  const hasUnread =
    this.messages.some(
      (message) =>
        !message.isMine &&
        !message.readAt
    );

  if (!hasUnread) {
    return;
  }

  this.chatService
    .markRead(this.trade.id)
    .catch((error) => {
      console.error(
        'Unable to mark chat as read:',
        error
      );
    });

  this.chatService.notifyRead();
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

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    this.draft = `${this.draft}${emoji}`;
    this.showEmojiPicker = false;
  }

  useQuickReply(text: string): void {
    this.draft = text;
    this.sendDraft();
  }

  sendDraft(): void {
    const text = this.draft.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || this.chatDisabled) return;
    this.draft = '';
    this.showEmojiPicker = false;
    this.pushOptimisticTextAndSend(text);
  }

  retry(message: ChatMessage): void {
    if (!message.clientId) return;
    this.messages = this.messages.filter((m) => !(m.clientId === message.clientId && m.failed));
    if (message.type === ChatMessageType.Text) {
      this.pushOptimisticTextAndSend(message.text || '');
    } else if (message.file) {
      this.pushOptimisticImageAndSend(message.file);
    } else {
      this.imageError = 'Please re-attach the file to retry this evidence upload.';
    }
  }


 private pushOptimisticTextAndSend(
  text: string
): void {
  const clientId =
    this.nextClientId();

  const optimistic =
    this.buildOptimisticMessage(
      clientId,
      {
        type:
          ChatMessageType.Text,
        text,
      }
    );

  this.appendOptimistic(
    optimistic
  );

  this.chatService
    .sendText(
      this.trade.id,
      text,
      clientId
    )
    .subscribe({
      next: (saved) => {
        this.reconcileOptimistic(
          clientId,
          {
            ...saved,
            clientId,
          }
        );
      },

      error: () => {
        this.failOptimistic(
          clientId
        );
      },
    });
}

  // -----------------------------------------------------------------
  // Evidence / image attachment — drag & drop, paste, and file picker,
  // all funneled through the same validated upload path.
  // -----------------------------------------------------------------

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.tryAttachEvidence(file);
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (this.chatDisabled) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          this.tryAttachEvidence(file);
          event.preventDefault();
        }
        break;
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (this.chatDisabled) return;
    this.dragCounter++;
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = Math.max(0, this.dragCounter - 1);
    if (this.dragCounter === 0) this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = 0;
    this.isDragging = false;
    if (this.chatDisabled) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.tryAttachEvidence(file);
  }

  private tryAttachEvidence(file: File): void {
    this.imageError = '';
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please share evidence as an image file (screenshot, photo of receipt, etc.).';
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      this.imageError = `That image is ${formatBytes(file.size)}. Evidence photos up to ${this.maxEvidenceLabel} are supported.`;
      return;
    }
    this.pushOptimisticImageAndSend(file);
  }

 private pushOptimisticImageAndSend(
  file: File
): void {
  const clientId =
    this.nextClientId();

  const previewUrl =
    URL.createObjectURL(file);

  const optimistic =
    this.buildOptimisticMessage(
      clientId,
      {
        type:
          ChatMessageType.Image,

        imageUrl:
          previewUrl,

        imageBytes:
          file.size,

        file,

        progress: 0,
      }
    );

  this.appendOptimistic(
    optimistic
  );

  this.chatService
    .sendImageFile(
      this.trade.id,
      file,
      clientId
    )
    .subscribe({
      next: (update) => {
        const idx =
          this.messages.findIndex(
            (m) =>
              m.clientId ===
              clientId
          );

        if (idx < 0) {
          return;
        }

        if (update.message) {
          URL.revokeObjectURL(
            previewUrl
          );

          this.messages[idx] = {
            ...update.message,
            clientId,
            file: undefined,
          };

          this.messages = [
            ...this.messages,
          ];
        } else {
          this.messages[idx] = {
            ...this.messages[idx],
            progress:
              update.progress,
          };

          this.messages = [
            ...this.messages,
          ];
        }
      },

      error: () => {
        this.failOptimistic(
          clientId
        );
      },
    });
}

  openLightbox(url?: string): void {
    if (url) this.lightboxUrl = url;
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
  }



  private nextClientId(): string {
    return `local-${Date.now()}-${this.clientIdSeq++}`;
  }

  private buildOptimisticMessage(clientId: string, partial: Partial<ChatMessage>): ChatMessage {
    return {
      id: clientId,
      tradeId: this.trade.id,
      type: ChatMessageType.Text,
      sender: { id: 'me', username: 'You' },
      isMine: true,
      isSystem: false,
      createdAt: new Date().toISOString(),
      clientId,
      pending: true,
      ...partial,
    };
  }

  private appendOptimistic(message: ChatMessage): void {
    this.messages = [...this.messages, message];
    this.shouldAutoScroll = true;
    this.showJumpToBottom = false;
  }

  private reconcileOptimistic(clientId: string, saved: ChatMessage): void {
    const idx = this.messages.findIndex((m) => m.clientId === clientId);
    if (idx >= 0) {
      this.messages[idx] = saved;
      this.messages = [...this.messages];
    }
  }

  private failOptimistic(clientId: string): void {
    const idx = this.messages.findIndex((m) => m.clientId === clientId);
    if (idx >= 0) {
      this.messages[idx] = { ...this.messages[idx], pending: false, failed: true, progress: undefined };
      this.messages = [...this.messages];
    }
  }

  private revokeAllObjectUrls(): void {
    for (const m of this.messages) {
      if (m.type === ChatMessageType.Image && m.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(m.imageUrl);
      }
    }
  }

  trackByMessageId(_index: number, msg: ChatMessage): string {
    return msg.clientId || msg.id;
  }




get counterpartyUsername(): string {
 
  const t = this.trade as any;
  return (
    t.counterpartyUsername ||
    t.counterparty?.username ||
    (this.trade.isBuyer ? t.sellerUsername || t.seller?.username : t.buyerUsername || t.buyer?.username) ||
    'Counterparty'
  );
}

}