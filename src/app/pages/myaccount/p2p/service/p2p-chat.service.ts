import { HttpClient, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BehaviorSubject, EMPTY, Observable, Subject, throwError, timer } from 'rxjs';
import { catchError, map, retryWhen, scan, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { environment } from '../../../../../environments/environment';
import {
  ChatSocketEvent,
  ChatMessage,
  normalizeChatMessage,
  ChatMessageType,
  SendChatMessageReqBody,
} from '../model/p2p-chat.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface UploadProgress {
  clientId: string;
  progress: number; // 0-100
  message?: ChatMessage; // populated once the server has stored the message
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class P2pChatService {
  private readonly base = `${environment.apiBaseUrl}/p2p`;
  private readonly wsBase = `${environment.apiBaseUrl.replace(/^http/, 'ws')}/p2p/chat`;

  private socket$: WebSocketSubject<ChatSocketEvent> | null = null;
  private activeTradeId: string | null = null;

  private message$ = new Subject<ChatMessage>();
  private typing$ = new Subject<boolean>();
  private presence$ = new BehaviorSubject<boolean>(false);
  private connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');
  /** Emits the ISO timestamp up to which the counterparty has read our messages. */
  private readReceipt$ = new Subject<string>();

  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------------------
  // REST: history, send, read receipts
  // ---------------------------------------------------------------------

  /** Pass `before` (an ISO timestamp) to page in older history when the user scrolls up. */
  getMessages(tradeId: string, before?: string): Observable<ChatMessage[]> {
    let url = `${this.base}/trades/${tradeId}/messages`;
    if (before) url += `?before=${encodeURIComponent(before)}`;
    return this.http
      .get<ApiEnvelope<any[]> | any[]>(url)
      .pipe(map((res) => this.unwrap(res).map((m) => normalizeChatMessage(m))));
  }

  sendText(tradeId: string, text: string, clientId: string): Observable<ChatMessage> {
    return this.postMessage({ tradeId, type: ChatMessageType.Text, text, clientId });
  }

  private postMessage(body: SendChatMessageReqBody): Observable<ChatMessage> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/${body.tradeId}/messages`, body)
      .pipe(map((res) => normalizeChatMessage((res as any)?.data ?? res)));
  }

  /**
   * Uploads a transaction-evidence image as multipart form data (not a base64
   * data URL) so multi-MB screenshots don't bloat the payload, and reports
   * upload progress so the UI can show a real progress bar.
   */
  sendImageFile(tradeId: string, file: File, clientId: string): Observable<UploadProgress> {
    const form = new FormData();
    form.append('type', ChatMessageType.Image);
    form.append('clientId', clientId);
    form.append('image', file, file.name);

    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/${tradeId}/messages/image`, form, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event): UploadProgress => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            return { clientId, progress: Math.round((event.loaded / event.total) * 100) };
          }
          if (event.type === HttpEventType.Response) {
            const body = (event.body as ApiEnvelope<any> | any) ?? {};
            return { clientId, progress: 100, message: normalizeChatMessage(body?.data ?? body) };
          }
          return { clientId, progress: 0 };
        }),
        catchError((err) => throwError(() => err))
      );
  }

  markRead(tradeId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/trades/${tradeId}/messages/read`, {});
  }

  // ---------------------------------------------------------------------
  // Realtime socket
  // ---------------------------------------------------------------------

  connect(tradeId: string): void {
    if (this.activeTradeId === tradeId && this.socket$) return;
    this.disconnect();
    this.activeTradeId = tradeId;
    this.connectionState$.next('connecting');

    this.socket$ = webSocket<ChatSocketEvent>({
      url: `${this.wsBase}?tradeId=${encodeURIComponent(tradeId)}`,
      openObserver: { next: () => this.connectionState$.next('connected') },
      closeObserver: { next: () => this.connectionState$.next('disconnected') },
    });

    this.socket$
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((attempt) => attempt + 1, 0),
            switchMap((attempt) => {
              this.connectionState$.next('connecting');
              const wait = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS);
              return timer(wait);
            })
          )
        ),
        catchError(() => EMPTY)
      )
      .subscribe((evt) => this.handleEvent(evt));
  }

  disconnect(): void {
    this.socket$?.complete();
    this.socket$ = null;
    this.activeTradeId = null;
    this.connectionState$.next('disconnected');
    this.presence$.next(false);
  }

  private handleEvent(evt: ChatSocketEvent): void {
    if (evt.tradeId !== this.activeTradeId) return;
    switch (evt.event) {
      case 'message':
        this.message$.next(normalizeChatMessage(evt.payload));
        break;
      case 'typing':
        this.typing$.next(!!evt.payload?.isTyping);
        break;
      case 'presence':
        this.presence$.next(!!evt.payload?.online);
        break;
      case 'read':
        this.readReceipt$.next(evt.payload?.readAt || new Date().toISOString());
        break;
    }
  }

  notifyTyping(isTyping: boolean): void {
    if (!this.socket$ || !this.activeTradeId) return;
    this.socket$.next({ event: 'typing', tradeId: this.activeTradeId, payload: { isTyping } });
  }

  /** Tells the counterparty (over the socket, instantly) that we've read up to now. */
  notifyRead(): void {
    if (!this.socket$ || !this.activeTradeId) return;
    this.socket$.next({
      event: 'read',
      tradeId: this.activeTradeId,
      payload: { readAt: new Date().toISOString() },
    });
  }

  get messages$(): Observable<ChatMessage> {
    return this.message$.asObservable();
  }

  get counterpartyTyping$(): Observable<boolean> {
    return this.typing$.asObservable();
  }

  get counterpartyOnline$(): Observable<boolean> {
    return this.presence$.asObservable();
  }

  get connectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  get counterpartyReadUpTo$(): Observable<string> {
    return this.readReceipt$.asObservable();
  }

  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return (res as any)?.data ?? [];
  }
}