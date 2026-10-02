import crypto from 'node:crypto';
import { Collection, Db, MongoClient } from 'mongodb';
import { Contact, Message, PublicUser, User, UserStatus } from '@isq/shared';

// ---------- Схемы документов MongoDB ----------
interface UserDoc {
  uin: number;
  nickname: string;
  nicknameLower: string; // для регистронезависимого поиска
  passwordHash: string;
  status: UserStatus;
  contacts: number[]; // список UIN контактов (взаимное добавление)
}

interface MessageDoc {
  _id: string; // uuid, генерируется на сервере
  from: number;
  to: number;
  text: string;
  timestamp: number;
}

interface CounterDoc {
  _id: string;
  seq: number;
}

let client: MongoClient | null = null;
let usersCol: Collection<UserDoc>;
let messagesCol: Collection<MessageDoc>;
let countersCol: Collection<CounterDoc>;

/** Подключение к MongoDB и подготовка коллекций/индексов. */
export async function connect(uri: string, dbName: string): Promise<void> {
  client = new MongoClient(uri);
  await client.connect();
  const db: Db = client.db(dbName);
  usersCol = db.collection<UserDoc>('users');
  messagesCol = db.collection<MessageDoc>('messages');
  countersCol = db.collection<CounterDoc>('counters');

  await usersCol.createIndex({ uin: 1 }, { unique: true });
  await usersCol.createIndex({ nicknameLower: 1 }, { unique: true });
  await messagesCol.createIndex({ from: 1, to: 1, timestamp: 1 });
}

export async function disconnect(): Promise<void> {
  await client?.close();
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Атомарная выдача следующего UIN через счётчик.
async function nextUin(): Promise<number> {
  const res = await countersCol.findOneAndUpdate(
    { _id: 'uin' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const seq = res?.seq ?? 1;
  return 999_999 + seq;
}

export async function createUser(nickname: string, password: string): Promise<User> {
  const uin = await nextUin();
  const doc: UserDoc = {
    uin,
    nickname,
    nicknameLower: nickname.toLowerCase(),
    passwordHash: hashPassword(password),
    status: 'offline',
    contacts: [],
  };
  await usersCol.insertOne(doc);
  return { uin, nickname, passwordHash: doc.passwordHash, status: 'offline' };
}

export async function findUser(uin: number): Promise<User | undefined> {
  const doc = await usersCol.findOne({ uin });
  if (!doc) return undefined;
  return {
    uin: doc.uin,
    nickname: doc.nickname,
    passwordHash: doc.passwordHash,
    status: doc.status,
  };
}

export async function findUserByNickname(nickname: string): Promise<User | undefined> {
  const doc = await usersCol.findOne({ nicknameLower: nickname.toLowerCase() });
  if (!doc) return undefined;
  return {
    uin: doc.uin,
    nickname: doc.nickname,
    passwordHash: doc.passwordHash,
    status: doc.status,
  };
}

export function verifyPassword(user: User, password: string): boolean {
  return user.passwordHash === hashPassword(password);
}

export function toPublicUser(user: User): PublicUser {
  return { uin: user.uin, nickname: user.nickname, status: user.status };
}

export async function getContacts(uin: number): Promise<Contact[]> {
  const me = await usersCol.findOne({ uin });
  if (!me || me.contacts.length === 0) return [];
  const docs = await usersCol.find({ uin: { $in: me.contacts } }).toArray();
  return docs
    .map((c) => ({ uin: c.uin, nickname: c.nickname, status: c.status }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
}

export async function getAllUsers(): Promise<PublicUser[]> {
  const docs = await usersCol.find({}).toArray();
  return docs
    .map((u) => ({ uin: u.uin, nickname: u.nickname, status: u.status }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
}

export async function addContact(a: number, b: number): Promise<void> {
  await usersCol.updateOne({ uin: a }, { $addToSet: { contacts: b } });
  await usersCol.updateOne({ uin: b }, { $addToSet: { contacts: a } });
}

export async function setStatus(uin: number, status: UserStatus): Promise<void> {
  await usersCol.updateOne({ uin }, { $set: { status } });
}

export async function saveMessage(message: Message): Promise<void> {
  const doc: MessageDoc = {
    _id: message.id,
    from: message.from,
    to: message.to,
    text: message.text,
    timestamp: message.timestamp,
  };
  await messagesCol.insertOne(doc);
}

export async function getHistory(a: number, b: number): Promise<Message[]> {
  const docs = await messagesCol
    .find({
      $or: [
        { from: a, to: b },
        { from: b, to: a },
      ],
    })
    .sort({ timestamp: 1 })
    .toArray();
  return docs.map((d) => ({
    id: d._id,
    from: d.from,
    to: d.to,
    text: d.text,
    timestamp: d.timestamp,
  }));
}

export async function findMessage(id: string): Promise<Message | undefined> {
  const doc = await messagesCol.findOne({ _id: id });
  if (!doc) return undefined;
  return { id: doc._id, from: doc.from, to: doc.to, text: doc.text, timestamp: doc.timestamp };
}

export async function updateMessageText(id: string, text: string): Promise<Message | undefined> {
  const res = await messagesCol.findOneAndUpdate(
    { _id: id },
    { $set: { text } },
    { returnDocument: 'after' }
  );
  if (!res) return undefined;
  return { id: res._id, from: res.from, to: res.to, text: res.text, timestamp: res.timestamp };
}

export async function deleteMessage(id: string): Promise<void> {
  await messagesCol.deleteOne({ _id: id });
}

export function generateId(): string {
  return crypto.randomUUID();
}
