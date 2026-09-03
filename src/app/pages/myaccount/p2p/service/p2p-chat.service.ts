import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  throwError,
} from 'rxjs';

import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import {
  signInAnonymously,
  User,
} from 'firebase/auth';

import {
  ChatMessage,
  normalizeChatMessage,
  ChatMessageType,
  SendChatMessageReqBody,
} from '../model/p2p-chat.model';

import { P2PTrade } from '../model/p2p.model';

// import { firebaseAuth, firebaseDb } from '../../../../core/firebase/firebase';

import { environment } from '../../../../../environments/environment';
import { firebaseAuth, firebaseDb } from '../trade-chat/firestore/firebase_config';

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'disconnected';

export interface UploadProgress {
  clientId: string;
  progress: number;
  message?: ChatMessage;
}

interface FirebaseChatMessage {
  id?: string;

  tradeId: string;

  clientId?: string;

  type: ChatMessageType;

  text?: string;

  imageUrl?: string;

  imageBytes?: number;

  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };

  isMine?: boolean;

  isSystem?: boolean;

  createdAt: any;

  readAt?: any;

  pending?: boolean;

  failed?: boolean;
}

interface PresenceDocument {
  uid: string;
  userId: string;
  username: string;

  online: boolean;

  typing: boolean;

  updatedAt: any;
}

@Injectable({
  providedIn: 'root',
})
export class P2pChatService {
  private readonly collectionName =
    environment.FIREBASE_COLLECTION_NAME;

  private readonly tradesCollection = 'trades';

  private readonly messagesCollection = 'messages';

  private readonly presenceCollection = 'presence';

  private activeTradeId: string | null = null;

  private currentUser: User | null = null;

  private currentTrade: P2PTrade | null = null;

  private messageSubject =
    new Subject<ChatMessage>();

  private typingSubject =
    new Subject<boolean>();

  private presenceSubject =
    new BehaviorSubject<boolean>(false);

  private connectionStateSubject =
    new BehaviorSubject<ConnectionState>('disconnected');

  private readReceiptSubject =
    new Subject<string>();

  private unsubscribeMessages: Unsubscribe | null = null;

  private unsubscribePresence: Unsubscribe | null = null;

  private unsubscribeTyping: Unsubscribe | null = null;

  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  async initialize(trade: P2PTrade): Promise<void> {
    this.currentTrade = trade;

    if (this.currentUser) {
      return;
    }

    try {
      this.connectionStateSubject.next('connecting');

      const credential =
        await signInAnonymously(firebaseAuth);

      this.currentUser = credential.user;

      this.connectionStateSubject.next('connected');
    } catch (error) {
      console.error(
        'Firebase authentication failed:',
        error
      );

      this.connectionStateSubject.next('disconnected');

      throw error;
    }
  }

  // ---------------------------------------------------------
  // Firebase realtime connection
  // ---------------------------------------------------------

  async connect(
    tradeId: string,
    trade?: P2PTrade
  ): Promise<void> {
    if (
      this.activeTradeId === tradeId &&
      this.unsubscribeMessages
    ) {
      return;
    }

    this.disconnect();

    this.activeTradeId = tradeId;

    if (trade) {
      this.currentTrade = trade;
    }

    if (!this.currentUser) {
      if (!this.currentTrade) {
        throw new Error(
          'P2P trade is required before connecting to chat.'
        );
      }

      await this.initialize(this.currentTrade);
    }

    this.connectionStateSubject.next('connecting');

    this.listenToMessages(tradeId);

    await this.listenToPresence(tradeId);

    await this.listenToTyping(tradeId);

    this.connectionStateSubject.next('connected');

    await this.setMyPresence(true);
  }

  disconnect(): void {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
      this.unsubscribeMessages = null;
    }

    if (this.unsubscribePresence) {
      this.unsubscribePresence();
      this.unsubscribePresence = null;
    }

    if (this.unsubscribeTyping) {
      this.unsubscribeTyping();
      this.unsubscribeTyping = null;
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (this.currentUser && this.activeTradeId) {
      this.setMyPresence(false).catch(() => {});
    }

    this.activeTradeId = null;

    this.presenceSubject.next(false);

    this.typingSubject.next(false);

    this.connectionStateSubject.next(
      'disconnected'
    );
  }

  // ---------------------------------------------------------
  // Firestore paths
  // ---------------------------------------------------------

  private tradeRef(tradeId: string) {
    return doc(
      firebaseDb,
      this.collectionName,
      tradeId
    );
  }

  private messagesRef(tradeId: string) {
    return collection(
      firebaseDb,
      this.collectionName,
      tradeId,
      this.messagesCollection
    );
  }

  private presenceRef(
    tradeId: string,
    uid: string
  ) {
    return doc(
      firebaseDb,
      this.collectionName,
      tradeId,
      this.presenceCollection,
      uid
    );
  }

  // ---------------------------------------------------------
  // History
  // ---------------------------------------------------------

  async getMessages(
    tradeId: string,
    before?: string
  ): Promise<ChatMessage[]> {
    try {
      const messagesCollection =
        this.messagesRef(tradeId);

      let q;

      if (before) {
        const timestamp =
          Timestamp.fromDate(
            new Date(before)
          );

        q = query(
          messagesCollection,
          orderBy('createdAt', 'desc'),
          where(
            'createdAt',
            '<',
            timestamp
          ),
          limit(50)
        );
      } else {
        q = query(
          messagesCollection,
          orderBy('createdAt', 'asc'),
          limit(100)
        );
      }

      const snapshot =
        await getDocs(q);

      const messages =
        snapshot.docs
          .map((item) =>
            this.firestoreToChatMessage(
              item
            )
          )
          .filter(Boolean) as ChatMessage[];

      if (before) {
        messages.reverse();
      }

      return messages;
    } catch (error) {
      console.error(
        'Unable to load Firebase chat history:',
        error
      );

      throw error;
    }
  }

  // ---------------------------------------------------------
  // Realtime messages
  // ---------------------------------------------------------

  private listenToMessages(
    tradeId: string
  ): void {
    const q = query(
      this.messagesRef(tradeId),
      orderBy('createdAt', 'asc')
    );

    this.unsubscribeMessages =
      onSnapshot(
        q,
        {
          includeMetadataChanges: false,
        },
        (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (
              change.type !== 'added' &&
              change.type !== 'modified'
            ) {
              continue;
            }

            const message =
              this.firestoreToChatMessage(
                change.doc
              );

            if (!message) {
              continue;
            }

            this.messageSubject.next(
              message
            );
          }
        },
        (error) => {
          console.error(
            'Firebase message listener failed:',
            error
          );

          this.connectionStateSubject.next(
            'disconnected'
          );
        }
      );
  }

  // ---------------------------------------------------------
  // Send text
  // ---------------------------------------------------------

  sendText(
    tradeId: string,
    text: string,
    clientId: string
  ): Observable<ChatMessage> {
    return new Observable<ChatMessage>(
      (subscriber) => {
        this.createTextMessage(
          tradeId,
          text,
          clientId
        )
          .then((message) => {
            subscriber.next(message);
            subscriber.complete();
          })
          .catch((error) => {
            subscriber.error(error);
          });
      }
    );
  }

  private async createTextMessage(
    tradeId: string,
    text: string,
    clientId: string
  ): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error(
        'Firebase user is not authenticated.'
      );
    }

    const cleanText =
      text.trim().slice(0, 1000);

    if (!cleanText) {
      throw new Error(
        'Message cannot be empty.'
      );
    }

    const user =
      this.currentUser;

    const messageData:
      FirebaseChatMessage = {
      tradeId,

      clientId,

      type: ChatMessageType.Text,

      text: cleanText,

      sender: {
        id: user.uid,
        username:
          this.getCurrentUsername(),
      },

      isSystem: false,

      createdAt:
        serverTimestamp(),
    };

    const messageReference =
      await addDoc(
        this.messagesRef(tradeId),
        messageData
      );

    return {
      id: messageReference.id,

      tradeId,

      type: ChatMessageType.Text,

      text: cleanText,

      sender: {
        id: user.uid,
        username:
          this.getCurrentUsername(),
      },

      isMine: true,

      isSystem: false,

      createdAt:
        new Date().toISOString(),

      clientId,
    } as ChatMessage;
  }

  // ---------------------------------------------------------
  // Image upload
  // ---------------------------------------------------------

  sendImageFile(
    tradeId: string,
    file: File,
    clientId: string
  ): Observable<UploadProgress> {
    return new Observable<UploadProgress>(
      (subscriber) => {
        this.uploadImage(
          tradeId,
          file,
          clientId,
          (progress) => {
            subscriber.next({
              clientId,
              progress,
            });
          }
        )
          .then((message) => {
            subscriber.next({
              clientId,
              progress: 100,
              message,
            });

            subscriber.complete();
          })
          .catch((error) => {
            subscriber.error(error);
          });
      }
    );
  }

  private async uploadImage(
    tradeId: string,
    file: File,
    clientId: string,
    onProgress: (
      progress: number
    ) => void
  ): Promise<ChatMessage> {
    if (!this.currentUser) {
      throw new Error(
        'Firebase user is not authenticated.'
      );
    }

    const timestamp =
      Date.now();

    const safeName =
      file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    const uploadUrl =
      `${environment.cloudUploadApiUrl}/${environment.cloudinaryName}/upload`;

    const formData =
      new FormData();

    formData.append(
      'file',
      file,
      safeName
    );

    /*
     * IMPORTANT:
     *
     * This must be an UNSIGNED Cloudinary upload preset.
     *
     * Never put the Cloudinary API secret
     * in this Angular application.
     */
    formData.append(
      'upload_preset',
      environment.cloudinaryPreset
    );

    formData.append(
      'folder',
      `${environment.cloudAssetFolderName}/chat/${tradeId}`
    );

    formData.append(
      'public_id',
      `chat_${timestamp}_${clientId}`
    );

    const imageUrl =
      await this.uploadToCloudinary(
        uploadUrl,
        formData,
        onProgress
      );

    const messageData:
      FirebaseChatMessage = {
      tradeId,

      clientId,

      type: ChatMessageType.Image,

      imageUrl,

      imageBytes: file.size,

      sender: {
        id: this.currentUser.uid,
        username:
          this.getCurrentUsername(),
      },

      isSystem: false,

      createdAt:
        serverTimestamp(),
    };

    const messageReference =
      await addDoc(
        this.messagesRef(tradeId),
        messageData
      );

    return {
      id: messageReference.id,

      tradeId,

      type: ChatMessageType.Image,

      imageUrl,

      imageBytes: file.size,

      sender: {
        id: this.currentUser.uid,
        username:
          this.getCurrentUsername(),
      },

      isMine: true,

      isSystem: false,

      createdAt:
        new Date().toISOString(),

      clientId,
    } as ChatMessage;
  }

  private uploadToCloudinary(
    url: string,
    formData: FormData,
    onProgress: (
      progress: number
    ) => void
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const xhr =
          new XMLHttpRequest();

        xhr.open(
          'POST',
          url,
          true
        );

        xhr.upload.onprogress =
          (event) => {
            if (!event.lengthComputable) {
              return;
            }

            const progress =
              Math.round(
                (event.loaded /
                  event.total) *
                  100
              );

            onProgress(progress);
          };

        xhr.onload = () => {
          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {
            try {
              const response =
                JSON.parse(xhr.responseText);

              if (!response.secure_url) {
                reject(
                  new Error(
                    'Cloudinary did not return an image URL.'
                  )
                );

                return;
              }

              resolve(
                response.secure_url
              );
            } catch {
              reject(
                new Error(
                  'Invalid Cloudinary response.'
                )
              );
            }

            return;
          }

          reject(
            new Error(
              `Image upload failed (${xhr.status}).`
            )
          );
        };

        xhr.onerror = () => {
          reject(
            new Error(
              'Network error during image upload.'
            )
          );
        };

        xhr.send(formData);
      }
    );
  }

  // ---------------------------------------------------------
  // Read receipts
  // ---------------------------------------------------------

  async markRead(
    tradeId: string
  ): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    const readAt =
      new Date().toISOString();

    const messages =
      await getDocs(
        query(
          this.messagesRef(tradeId),
          orderBy(
            'createdAt',
            'asc'
          )
        )
      );

    const updates: Promise<void>[] = [];

    for (
      const item of messages.docs
    ) {
      const data =
        item.data() as FirebaseChatMessage;

      if (
        data.sender?.id ===
          this.currentUser.uid
      ) {
        continue;
      }

      if (data.readAt) {
        continue;
      }

      updates.push(
        updateDoc(
          item.ref,
          {
            readAt:
              Timestamp.fromDate(
                new Date(readAt)
              ),
          }
        )
      );
    }

    await Promise.all(updates);

    await this.setReadReceipt(
      tradeId,
      readAt
    );
  }

  private async setReadReceipt(
    tradeId: string,
    readAt: string
  ): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    const receiptRef =
      doc(
        firebaseDb,
        this.collectionName,
        tradeId,
        'readReceipts',
        this.currentUser.uid
      );

    await setDoc(
      receiptRef,
      {
        uid:
          this.currentUser.uid,

        readAt:
          Timestamp.fromDate(
            new Date(readAt)
          ),

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    this.readReceiptSubject.next(
      readAt
    );
  }

  notifyRead(): void {
    if (
      !this.activeTradeId ||
      !this.currentUser
    ) {
      return;
    }

    this.markRead(
      this.activeTradeId
    ).catch(() => {});
  }

  // ---------------------------------------------------------
  // Typing
  // ---------------------------------------------------------

  notifyTyping(
    isTyping: boolean
  ): void {
    if (
      !this.currentUser ||
      !this.activeTradeId
    ) {
      return;
    }

    this.setTyping(
      this.activeTradeId,
      isTyping
    ).catch((error) => {
      console.error(
        'Unable to update typing:',
        error
      );
    });

    if (this.typingTimeout) {
      clearTimeout(
        this.typingTimeout
      );
    }

    if (isTyping) {
      this.typingTimeout =
        setTimeout(() => {
          this.notifyTyping(false);
        }, 2500);
    }
  }

  private async listenToTyping(
    tradeId: string
  ): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    const q = query(
      collection(
        firebaseDb,
        this.collectionName,
        tradeId,
        this.presenceCollection
      ),
      where(
        'typing',
        '==',
        true
      )
    );

    this.unsubscribeTyping =
      onSnapshot(
        q,
        (snapshot) => {
          const someoneTyping =
            snapshot.docs.some(
              (item) =>
                item.id !==
                this.currentUser?.uid
            );

          this.typingSubject.next(
            someoneTyping
          );
        },
        () => {
          this.typingSubject.next(
            false
          );
        }
      );
  }

  private async setTyping(
    tradeId: string,
    isTyping: boolean
  ): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    const ref =
      this.presenceRef(
        tradeId,
        this.currentUser.uid
      );

    await setDoc(
      ref,
      {
        uid:
          this.currentUser.uid,

        userId:
          this.getCurrentUserId(),

        username:
          this.getCurrentUsername(),

        online: true,

        typing: isTyping,

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  // ---------------------------------------------------------
  // Presence
  // ---------------------------------------------------------

  private async listenToPresence(
    tradeId: string
  ): Promise<void> {
    const q = query(
      collection(
        firebaseDb,
        this.collectionName,
        tradeId,
        this.presenceCollection
      ),
      where(
        'online',
        '==',
        true
      )
    );

    this.unsubscribePresence =
      onSnapshot(
        q,
        (snapshot) => {
          const otherUserOnline =
            snapshot.docs.some(
              (item) =>
                item.id !==
                this.currentUser?.uid
            );

          this.presenceSubject.next(
            otherUserOnline
          );
        },
        () => {
          this.presenceSubject.next(
            false
          );
        }
      );
  }

  private async setMyPresence(
    online: boolean
  ): Promise<void> {
    if (
      !this.currentUser ||
      !this.activeTradeId
    ) {
      return;
    }

    const ref =
      this.presenceRef(
        this.activeTradeId,
        this.currentUser.uid
      );

    await setDoc(
      ref,
      {
        uid:
          this.currentUser.uid,

        userId:
          this.getCurrentUserId(),

        username:
          this.getCurrentUsername(),

        online,

        typing: false,

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  // ---------------------------------------------------------
  // Observables
  // ---------------------------------------------------------

  get messages$(): Observable<ChatMessage> {
    return this.messageSubject.asObservable();
  }

  get counterpartyTyping$(): Observable<boolean> {
    return this.typingSubject.asObservable();
  }

  get counterpartyOnline$(): Observable<boolean> {
    return this.presenceSubject.asObservable();
  }

  get connectionState(): Observable<ConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  get counterpartyReadUpTo$(): Observable<string> {
    return this.readReceiptSubject.asObservable();
  }

  // ---------------------------------------------------------
  // Firebase -> application message
  // ---------------------------------------------------------

  private firestoreToChatMessage(
    snapshot: QueryDocumentSnapshot<DocumentData>
  ): ChatMessage | null {
    const data =
      snapshot.data() as FirebaseChatMessage;

    if (!data) {
      return null;
    }

    const createdAt =
      this.firebaseTimestampToISOString(
        data.createdAt
      );

    const readAt =
      this.firebaseTimestampToISOString(
        data.readAt
      );

    const isMine =
      data.sender?.id ===
      this.currentUser?.uid;

    return normalizeChatMessage({
      id: snapshot.id,

      tradeId:
        data.tradeId,

      clientId:
        data.clientId,

      type:
        data.type,

      text:
        data.text || '',

      imageUrl:
        data.imageUrl,

      imageBytes:
        data.imageBytes,

      sender:
        data.sender,

      isMine,

      isSystem:
        data.isSystem || false,

      createdAt,

      readAt,

      pending: false,

      failed: false,
    });
  }

  private firebaseTimestampToISOString(
    value: any
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    if (
      value instanceof Timestamp
    ) {
      return value
        .toDate()
        .toISOString();
    }

    if (
      typeof value.toDate ===
      'function'
    ) {
      return value
        .toDate()
        .toISOString();
    }

    if (
      typeof value === 'string'
    ) {
      return value;
    }

    if (
      value instanceof Date
    ) {
      return value.toISOString();
    }

    return undefined;
  }

  // ---------------------------------------------------------
  // Current user
  // ---------------------------------------------------------

  private getCurrentUserId(): string {
    /*
     * IMPORTANT:
     *
     * Replace this with your actual
     * authenticated TrizBot user ID.
     *
     * Firebase Anonymous Authentication
     * gives us a Firebase UID, but it does
     * not automatically know your application's
     * user ID.
     */

    const trade: any =
      this.currentTrade;

    if (
      trade?.currentUserId
    ) {
      return String(
        trade.currentUserId
      );
    }

    if (
      trade?.userId
    ) {
      return String(
        trade.userId
      );
    }

    if (
      trade?.buyerId &&
      trade?.isBuyer
    ) {
      return String(
        trade.buyerId
      );
    }

    if (
      trade?.sellerId &&
      !trade?.isBuyer
    ) {
      return String(
        trade.sellerId
      );
    }

    return (
      this.currentUser?.uid ||
      'anonymous'
    );
  }

  private getCurrentUsername(): string {
    const trade: any =
      this.currentTrade;

    if (
      trade?.currentUsername
    ) {
      return String(
        trade.currentUsername
      );
    }

    if (
      trade?.username
    ) {
      return String(
        trade.username
      );
    }

    if (
      trade?.isBuyer
    ) {
      return (
        trade?.buyerUsername ||
        trade?.buyer?.username ||
        'Buyer'
      );
    }

    return (
      trade?.sellerUsername ||
      trade?.seller?.username ||
      'Seller'
    );
  }
}