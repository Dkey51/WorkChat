import { Server, Socket } from 'socket.io';
import { EVENTS } from '@isq/shared';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  UserStatus,
} from '@isq/shared';
import * as db from './db.js';

type Io = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Онлайн-пользователи: uin -> множество socketId.
const socketsByUin = new Map<number, Set<string>>();

async function emitContacts(io: Io, uin: number): Promise<void> {
  const set = socketsByUin.get(uin);
  if (!set) return;
  const contacts = await db.getContacts(uin);
  for (const sid of set) io.to(sid).emit(EVENTS.contacts, contacts);
}

async function broadcastStatus(io: Io, uin: number, status: UserStatus): Promise<void> {
  const contacts = await db.getContacts(uin);
  for (const c of contacts) {
    const set = socketsByUin.get(c.uin);
    if (!set) continue;
    for (const sid of set) io.to(sid).emit(EVENTS.contactStatus, { uin, status });
  }
}

async function attachUser(io: Io, socket: Sock, uin: number): Promise<void> {
  await detachUser(io, socket);
  socket.data.uin = uin;
  if (!socketsByUin.has(uin)) socketsByUin.set(uin, new Set());
  socketsByUin.get(uin)!.add(socket.id);
  await db.setStatus(uin, 'online');
  await broadcastStatus(io, uin, 'online');
  await emitContacts(io, uin);
}

async function detachUser(io: Io, socket: Sock): Promise<void> {
  const uin = socket.data.uin;
  if (!uin) return;
  const set = socketsByUin.get(uin);
  if (set) {
    set.delete(socket.id);
    if (set.size === 0) {
      socketsByUin.delete(uin);
      await db.setStatus(uin, 'offline');
      await broadcastStatus(io, uin, 'offline');
    }
  }
  socket.data.uin = undefined;
}

/** Регистрирует все обработчики Socket.IO. */
export function registerSocketHandlers(io: Io): void {
  io.on('connection', (socket) => {
    console.log(`[чат] подключён: ${socket.id}`);

    socket.on(EVENTS.register, async (payload, cb) => {
      const nickname = (payload.nickname ?? '').trim();
      const password = payload.password ?? '';
      if (nickname.length < 2) {
        return cb({ ok: false, error: 'Никнейм должен быть не короче 2 символов' });
      }
      if (password.length < 4) {
        return cb({ ok: false, error: 'Пароль должен быть не короче 4 символов' });
      }
      if (await db.findUserByNickname(nickname)) {
        return cb({ ok: false, error: 'Этот никнейм уже занят' });
      }
      const user = await db.createUser(nickname, password);
      await attachUser(io, socket, user.uin);
      cb({ ok: true, user: db.toPublicUser(user), contacts: await db.getContacts(user.uin) });
    });

    socket.on(EVENTS.login, async (payload, cb) => {
      const loginValue = (payload.login ?? '').trim();
      const password = payload.password ?? '';
      let user;
      if (/^\d+$/.test(loginValue)) {
        user = await db.findUser(Number(loginValue));
      } else {
        user = await db.findUserByNickname(loginValue);
      }
      if (!user || !db.verifyPassword(user, password)) {
        return cb({ ok: false, error: 'Неверный логин/UIN или пароль' });
      }
      await attachUser(io, socket, user.uin);
      cb({ ok: true, user: db.toPublicUser(user), contacts: await db.getContacts(user.uin) });
    });

    socket.on(EVENTS.addContact, async (payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb({ ok: false, error: 'Не авторизован' });
      const target = await db.findUser(payload.uin);
      if (!target) return cb({ ok: false, error: 'Пользователь с таким UIN не найден' });
      if (target.uin === me) return cb({ ok: false, error: 'Нельзя добавить самого себя' });
      if ((await db.getContacts(me)).some((c) => c.uin === target.uin)) {
        return cb({ ok: false, error: 'Контакт уже в списке' });
      }
      await db.addContact(me, target.uin);
      const contact = { uin: target.uin, nickname: target.nickname, status: target.status };
      await emitContacts(io, me);
      await emitContacts(io, target.uin);
      cb({ ok: true, contact });
    });

    socket.on(EVENTS.sendMessage, async (payload, cb) => {
      const from = socket.data.uin;
      if (!from) return cb({ ok: false, error: 'Не авторизован' });
      const text = (payload.text ?? '').trim();
      if (!text) return cb({ ok: false, error: 'Пустое сообщение' });
      if (!(await db.findUser(payload.to))) {
        return cb({ ok: false, error: 'Получатель не найден' });
      }
      const message = { id: db.generateId(), from, to: payload.to, text, timestamp: Date.now() };
      await db.saveMessage(message);
      const targetSockets = socketsByUin.get(payload.to);
      if (targetSockets) {
        for (const sid of targetSockets) io.to(sid).emit(EVENTS.message, message);
      }
      socket.emit(EVENTS.message, message); // эхо отправителю
      cb({ ok: true, message });
    });

    socket.on(EVENTS.editMessage, async (payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb({ ok: false, error: 'Не авторизован' });
      const text = (payload.text ?? '').trim();
      if (!text) return cb({ ok: false, error: 'Пустое сообщение' });
      const msg = await db.findMessage(payload.id);
      if (!msg) return cb({ ok: false, error: 'Сообщение не найдено' });
      if (msg.from !== me) {
        return cb({ ok: false, error: 'Редактировать можно только свои сообщения' });
      }
      const updated = await db.updateMessageText(msg.id, text);
      if (updated) {
        for (const uin of new Set([updated.from, updated.to])) {
          const set = socketsByUin.get(uin);
          if (set) for (const sid of set) io.to(sid).emit(EVENTS.messageEdited, updated);
        }
      }
      cb({ ok: true, message: updated });
    });

    socket.on(EVENTS.deleteMessage, async (payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb({ ok: false, error: 'Не авторизован' });
      const msg = await db.findMessage(payload.id);
      if (!msg) return cb({ ok: false, error: 'Сообщение не найдено' });
      if (msg.from !== me) {
        return cb({ ok: false, error: 'Удалять можно только свои сообщения' });
      }
      await db.deleteMessage(msg.id);
      const data = { id: msg.id, from: msg.from, to: msg.to };
      for (const uin of new Set([msg.from, msg.to])) {
        const set = socketsByUin.get(uin);
        if (set) for (const sid of set) io.to(sid).emit(EVENTS.messageDeleted, data);
      }
      cb({ ok: true });
    });

    socket.on(EVENTS.setStatus, async (payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb({ ok: false, error: 'Не авторизован' });
      const status: UserStatus = payload.status === 'away' ? 'away' : 'online';
      await db.setStatus(me, status);
      await broadcastStatus(io, me, status);
      cb({ ok: true });
    });

    socket.on(EVENTS.typing, (payload) => {
      const me = socket.data.uin;
      if (!me) return;
      const set = socketsByUin.get(payload.to);
      if (set) {
        for (const sid of set) io.to(sid).emit(EVENTS.typing, { from: me, typing: payload.typing });
      }
    });

    socket.on(EVENTS.getHistory, async (payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb([]);
      cb(await db.getHistory(me, payload.with));
    });

    socket.on(EVENTS.getUsers, async (_payload, cb) => {
      const me = socket.data.uin;
      if (!me) return cb([]);
      const users = await db.getAllUsers();
      cb(users.filter((u) => u.uin !== me));
    });

    socket.on(EVENTS.logout, () => void detachUser(io, socket));
    socket.on('disconnect', () => {
      console.log(`[чат] отключён: ${socket.id}`);
      void detachUser(io, socket);
    });
  });
}
