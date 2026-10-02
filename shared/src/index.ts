// Общие типы и события, используемые и сервером, и клиентом.

export * from './events.js';

/** Статус пользователя (как в ICQ). */
export type UserStatus = 'online' | 'away' | 'offline';

/** Пользователь на сервере (с хэшем пароля). */
export interface User {
  uin: number;
  nickname: string;
  passwordHash: string;
  status: UserStatus;
}

/** Публичная информация о пользователе, которую можно отдавать клиенту. */
export interface PublicUser {
  uin: number;
  nickname: string;
  status: UserStatus;
}

/** Запись в списке контактов. */
export interface Contact {
  uin: number;
  nickname: string;
  status: UserStatus;
}

/** Сообщение чата. */
export interface Message {
  id: string;
  from: number;
  to: number;
  text: string;
  timestamp: number;
}

/** Результат регистрации / входа. */
export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: PublicUser;
  contacts?: Contact[];
}

/** Результат добавления контакта. */
export interface ContactResult {
  ok: boolean;
  error?: string;
  contact?: Contact;
}

/** Результат отправки сообщения. */
export interface SendMessageResult {
  ok: boolean;
  error?: string;
  message?: Message;
}

/** Результат смены статуса. */
export interface StatusResult {
  ok: boolean;
  error?: string;
}

/** Результат редактирования сообщения. */
export interface EditMessageResult {
  ok: boolean;
  error?: string;
  message?: Message;
}

/** Результат удаления сообщения. */
export interface DeleteMessageResult {
  ok: boolean;
  error?: string;
}
