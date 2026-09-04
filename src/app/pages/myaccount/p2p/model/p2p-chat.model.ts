export enum ChatMessageType {
  Text = 'Text',
  Image = 'Image',
  System = 'System',
}

export interface ChatParticipant {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  tradeId: string;
  type: ChatMessageType;
  text?: string;
  imageUrl?: string;
  imageBytes?: number;
  sender: ChatParticipant;
  isMine: boolean;
  isSystem: boolean;
  createdAt: string;
  readAt?: string;
  /** Client-only fields used for optimistic UI while a message is in flight. */
  clientId?: string;
  pending?: boolean;
  failed?: boolean;
  /** 0-100 upload progress, only set while an image evidence upload is in flight. */
  progress?: number;
  /** Kept client-side only so a failed image send can be retried without re-picking the file. */
  file?: File;
}

export interface SendChatMessageReqBody {
  tradeId: string;
  type: ChatMessageType;
  text?: string;
  imageUrl?: string;
  clientId: string;
}

export interface ChatSocketEvent {
  event: 'message' | 'typing' | 'read' | 'presence';
  tradeId: string;
  payload: any;
}

/**
 * Evidence photos (payment screenshots, receipts, etc.) are frequently
 * multi-MB, high-resolution phone screenshots. 10MB comfortably covers
 * that while still guarding the backend against abuse.
 */
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10MB
export const MIN_GUARANTEED_EVIDENCE_BYTES = 2 * 1024 * 1024; // 2MB floor, always supported

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractId(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$oid) return raw.$oid;
  return String(raw);
}

function extractDate(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.$date) return raw.$date;
  return String(raw);
}

export function normalizeChatSender(raw: any): ChatParticipant {
  return {
    id: extractId(raw?.id || raw?._id),
    username: raw?.username || 'Trader',
    avatarUrl: raw?.avatarUrl ?? null,
  };
}

export function normalizeChatMessage(raw: any): ChatMessage {
  const sender = normalizeChatSender(raw.sender || { id: raw.senderId, username: raw.senderName });
  const type: ChatMessageType =
    raw.type || (raw.imageUrl ? ChatMessageType.Image : ChatMessageType.Text);

  return {
    id: extractId(raw.id || raw._id) || raw.clientId || `${Date.now()}`,
    tradeId: extractId(raw.tradeId),
    type,
    text: raw.text || undefined,
    imageUrl: raw.imageUrl || undefined,
    imageBytes: raw.imageBytes || undefined,
    sender,
    isMine: typeof raw.isMine === 'boolean' ? raw.isMine : false,
    isSystem: type === ChatMessageType.System,
    createdAt: extractDate(raw.createdAt) || new Date().toISOString(),
    readAt: raw.readAt ? extractDate(raw.readAt) : undefined,
    clientId: raw.clientId,
  };
}

/** Groups a flat message list into day buckets for date-divider rendering. */
export function groupMessagesByDay(
  messages: ChatMessage[]
): { dateLabel: string; messages: ChatMessage[] }[] {
  const groups: { dateLabel: string; messages: ChatMessage[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    let label: string;
    if (isSameDay(d, today)) label = 'Today';
    else if (isSameDay(d, yesterday)) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) last.messages.push(msg);
    else groups.push({ dateLabel: label, messages: [msg] });
  }
  return groups;
}

export const CHAT_QUICK_REPLIES_BUYER: string[] = [
  'Payment sent, please check.',
  'Waiting for your confirmation.',
  'Did you receive it?',
  'Sending payment now.',
];

export const CHAT_QUICK_REPLIES_SELLER: string[] = [
  'Received, releasing now.',
  'Please send payment screenshot.',
  "Haven't received it yet.",
  'Give me a few minutes.',
];

export const CHAT_QUICK_EMOJIS: string[] = [
  '👍', '🙏', '✅', '⏳', '💰', '📷', '❤️', '😊', '👌', '🤝',
];