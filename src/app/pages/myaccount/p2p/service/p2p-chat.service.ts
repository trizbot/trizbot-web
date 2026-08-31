import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, delay, map, retryWhen } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { environment } from '../../../../../environments/environment';
import { ChatSocketEvent, ChatMessage, normalizeChatMessage, ChatMessageType, SendChatMessageReqBody } from '../model/p2p-chat.model';

interface ApiEnvelope<T> {
  message: string;
  data: T;
}

const SOCKET_RETRY_DELAY_MS = 3000;

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
  private connected$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------------------
  // REST: history, send, read receipts
  // ---------------------------------------------------------------------

  getMessages(tradeId: string): Observable<ChatMessage[]> {
    return this.http
      .get<ApiEnvelope<any[]> | any[]>(`${this.base}/trades/${tradeId}/messages`)
      .pipe(map((res) => this.unwrap(res).map((m) => normalizeChatMessage(m))));
  }

  sendText(tradeId: string, text: string, clientId: string): Observable<ChatMessage> {
    return this.postMessage({ tradeId, type: ChatMessageType.Text, text, clientId });
  }

  sendImage(tradeId: string, imageUrl: string, clientId: string): Observable<ChatMessage> {
    return this.postMessage({ tradeId, type: ChatMessageType.Image, imageUrl, clientId });
  }

  private postMessage(body: SendChatMessageReqBody): Observable<ChatMessage> {
    return this.http
      .post<ApiEnvelope<any> | any>(`${this.base}/trades/${body.tradeId}/messages`, body)
      .pipe(map((res) => normalizeChatMessage((res as any)?.data ?? res)));
  }

  markRead(tradeId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/trades/${tradeId}/messages/read`, {});
  }


  connect(tradeId: string): void {
    if (this.activeTradeId === tradeId && this.socket$) return;
    this.disconnect();
    this.activeTradeId = tradeId;

    this.socket$ = webSocket<ChatSocketEvent>({
      url: `${this.wsBase}?tradeId=${encodeURIComponent(tradeId)}`,
      openObserver: { next: () => this.connected$.next(true) },
      closeObserver: { next: () => this.connected$.next(false) },
    });

    this.socket$
      .pipe(
        retryWhen((errors) => errors.pipe(delay(SOCKET_RETRY_DELAY_MS))),
        catchError(() => EMPTY)
      )
      .subscribe((evt) => this.handleEvent(evt));
  }

  disconnect(): void {
    this.socket$?.complete();
    this.socket$ = null;
    this.activeTradeId = null;
    this.connected$.next(false);
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
    }
  }

  notifyTyping(isTyping: boolean): void {
    if (!this.socket$ || !this.activeTradeId) return;
    this.socket$.next({ event: 'typing', tradeId: this.activeTradeId, payload: { isTyping } });
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

  get connected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  // ---------------------------------------------------------------------
  // Image attach — same "embed as data URL for now, swap for a real
  // upload-to-storage call later" approach already used for payment proofs.
  // ---------------------------------------------------------------------

  fileToDataUrl(file: File): Observable<string> {
    return new Observable((subscriber) => {
      const reader = new FileReader();
      reader.onload = () => {
        subscriber.next(reader.result as string);
        subscriber.complete();
      };
      reader.onerror = () => subscriber.error(new Error('Could not read that file.'));
      reader.readAsDataURL(file);
    });
  }

  private unwrap<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return (res as any)?.data ?? [];
  }
}