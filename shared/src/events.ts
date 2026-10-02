import type {
  AuthResult,
  Contact,
  ContactResult,
  DeleteMessageResult,
  EditMessageResult,
  Message,
  PublicUser,
  SendMessageResult,
  StatusResult,
  UserStatus,
} from './index.js';

/**
 * Имена событий Socket.IO — единый источник истины.
 * Используются и сервером, и клиентом, чтобы не было «магических строк».
 */
export const EVENTS = {
  // Клиент → сервер
  register: 'register',
  login: 'login',
  addContact: 'addContact',
  sendMessage: 'sendMessage',
  editMessage: 'editMessage',
  deleteMessage: 'deleteMessage',
  setStatus: 'setStatus',
  typing: 'typing',
  getHistory: 'getHistory',
  getUsers: 'getUsers',
  logout: 'logout',
  // Сервер → клиент
  contacts: 'contacts',
  contactStatus: 'contactStatus',
  message: 'message',
  messageEdited: 'messageEdited',
  messageDeleted: 'messageDeleted',
} as const;

/** События, которые сервер отправляет клиенту. */
export interface ServerToClientEvents {
  contacts: (contacts: Contact[]) => void;
  contactStatus: (p: { uin: number; status: UserStatus }) => void;
  message: (m: Message) => void;
  messageEdited: (m: Message) => void;
  messageDeleted: (p: { id: string; from: number; to: number }) => void;
  typing: (p: { from: number; typing: boolean }) => void;
}

/** События, которые клиент отправляет серверу (второй аргумент — ack-колбэк). */
export interface ClientToServerEvents {
  register: (p: { nickname: string; password: string }, cb: (res: AuthResult) => void) => void;
  login: (p: { login: string; password: string }, cb: (res: AuthResult) => void) => void;
  addContact: (p: { uin: number }, cb: (res: ContactResult) => void) => void;
  sendMessage: (p: { to: number; text: string }, cb: (res: SendMessageResult) => void) => void;
  editMessage: (p: { id: string; text: string }, cb: (res: EditMessageResult) => void) => void;
  deleteMessage: (p: { id: string }, cb: (res: DeleteMessageResult) => void) => void;
  setStatus: (p: { status: UserStatus }, cb: (res: StatusResult) => void) => void;
  typing: (p: { to: number; typing: boolean }) => void;
  getHistory: (p: { with: number }, cb: (messages: Message[]) => void) => void;
  getUsers: (p: unknown, cb: (users: PublicUser[]) => void) => void;
  logout: () => void;
}

/** Данные, привязанные к конкретному socket-соединению. */
export interface SocketData {
  uin: number | undefined;
}
