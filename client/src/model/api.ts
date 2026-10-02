import { io, Socket } from 'socket.io-client';
import { EVENTS } from '@isq/shared';
import type {
  AuthResult,
  ClientToServerEvents,
  Contact,
  ContactResult,
  DeleteMessageResult,
  EditMessageResult,
  Message,
  PublicUser,
  SendMessageResult,
  ServerToClientEvents,
  StatusResult,
  UserStatus,
} from '@isq/shared';
import type { AppStore } from './store';
import { contactsLoaded, contactStatusChanged } from './slices/contactsSlice';
import {
  messageReceived,
  typingChanged,
  incrementUnread,
  messageEdited,
  messageDeleted,
} from './slices/chatSlice';
import { connectionChanged } from './slices/uiSlice';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * ChatApi — часть Model: типизированная обёртка над socket.io-client.
 * Исходящие запросы уходят на сервер, входящие события превращаются
 * в действия Redux и диспатчатся в store. Имена событий берутся из EVENTS.
 */
export class ChatApi {
  private socket: ClientSocket;
  private store: AppStore | null = null;

  constructor() {
    this.socket = io({ autoConnect: false });
    this.socket.on('connect', () => this.store?.dispatch(connectionChanged(true)));
    this.socket.on('disconnect', () => this.store?.dispatch(connectionChanged(false)));
    this.socket.on(EVENTS.contacts, (contacts) => this.store?.dispatch(contactsLoaded(contacts)));
    this.socket.on(EVENTS.contactStatus, (p) => this.store?.dispatch(contactStatusChanged(p)));
    this.socket.on(EVENTS.message, (m) => this.onMessage(m));
    this.socket.on(EVENTS.typing, (p) => this.store?.dispatch(typingChanged(p)));
    this.socket.on(EVENTS.messageEdited, (m) => this.onMessageEdited(m));
    this.socket.on(EVENTS.messageDeleted, (p) => this.onMessageDeleted(p));
  }

  attach(store: AppStore): void {
    this.store = store;
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  register(nickname: string, password: string): Promise<AuthResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.register, { nickname, password }, (res) => resolve(res))
    );
  }

  login(login: string, password: string): Promise<AuthResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.login, { login, password }, (res) => resolve(res))
    );
  }

  addContact(uin: number): Promise<ContactResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.addContact, { uin }, (res) => resolve(res))
    );
  }

  sendMessage(to: number, text: string): Promise<SendMessageResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.sendMessage, { to, text }, (res) => resolve(res))
    );
  }

  editMessage(id: string, text: string): Promise<EditMessageResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.editMessage, { id, text }, (res) => resolve(res))
    );
  }

  deleteMessage(id: string): Promise<DeleteMessageResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.deleteMessage, { id }, (res) => resolve(res))
    );
  }

  setStatus(status: UserStatus): Promise<StatusResult> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.setStatus, { status }, (res) => resolve(res))
    );
  }

  getHistory(withUin: number): Promise<Message[]> {
    return new Promise((resolve) =>
      this.socket.emit(EVENTS.getHistory, { with: withUin }, (res) => resolve(res))
    );
  }

  getUsers(): Promise<PublicUser[]> {
    return new Promise((resolve) => this.socket.emit(EVENTS.getUsers, {}, (res) => resolve(res)));
  }

  typing(to: number, typing: boolean): void {
    this.socket.emit(EVENTS.typing, { to, typing });
  }

  logout(): void {
    this.socket.emit(EVENTS.logout);
  }

  private peerOf(m: { from: number; to: number }): number | undefined {
    const selfUin = this.store?.getState().auth.user?.uin;
    if (selfUin == null) return undefined;
    return m.from === selfUin ? m.to : m.from;
  }

  private onMessage(m: Message): void {
    const store = this.store;
    if (!store) return;
    const state = store.getState();
    const selfUin = state.auth.user?.uin;
    const peer = this.peerOf(m);
    if (peer == null) return;
    store.dispatch(messageReceived({ message: m, peer }));

    if (m.from !== selfUin) {
      const notActive = state.contacts.activeUin !== peer;
      if (notActive || document.hidden) {
        store.dispatch(incrementUnread({ peer }));
        this.showNotification(m, peer, state.contacts.items);
      }
    }
  }

  private onMessageEdited(m: Message): void {
    const peer = this.peerOf(m);
    if (peer != null) this.store?.dispatch(messageEdited({ peer, message: m }));
  }

  private onMessageDeleted(p: { id: string; from: number; to: number }): void {
    const peer = this.peerOf(p);
    if (peer != null) this.store?.dispatch(messageDeleted({ peer, id: p.id }));
  }

  private showNotification(m: Message, peer: number, contacts: Contact[]): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const nickname = contacts.find((c) => c.uin === peer)?.nickname ?? `UIN ${peer}`;
    try {
      new Notification('Новое сообщение', { body: `${nickname}: ${m.text}` });
    } catch {
      // браузер может запретить показ — игнорируем
    }
  }
}

export const api = new ChatApi();
