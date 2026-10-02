import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';

function connect() {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

function ack(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (res) => resolve(res));
  });
}

function waitFor(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting "${event}"`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

async function main() {
  const a = await connect();
  const b = await connect();

  const ra = await ack(a, 'register', { nickname: 'Alice', password: '1234' });
  const rb = await ack(b, 'register', { nickname: 'Bob', password: '1234' });
  console.log('Alice UIN:', ra.user?.uin, '| Bob UIN:', rb.user?.uin);
  if (!ra.ok || !rb.ok) throw new Error('register failed');

  // Контакты взаимные: Алиса добавляет Боба — Боб получает обновлённый список.
  const bContactsPromise = waitFor(b, 'contacts');
  const addA = await ack(a, 'addContact', { uin: rb.user.uin });
  console.log('addContact A->B:', addA.ok);
  if (!addA.ok) throw new Error('addContact failed');
  const bContacts = await bContactsPromise;
  console.log('Bob contacts:', bContacts.map((c) => c.nickname).join(', '));
  if (!bContacts.some((c) => c.uin === ra.user.uin))
    throw new Error('Bob missing Alice in contacts');

  const msgPromise = waitFor(b, 'message');
  const send = await ack(a, 'sendMessage', { to: rb.user.uin, text: 'Привет, Боб!' });
  console.log('send ok:', send.ok);
  const received = await msgPromise;
  console.log('Bob received:', JSON.stringify(received.text), 'from', received.from);
  if (received.text !== 'Привет, Боб!' || received.from !== ra.user.uin) {
    throw new Error('message mismatch');
  }

  const hist = await ack(b, 'getHistory', { with: ra.user.uin });
  console.log('history length:', hist.length, '| last:', hist[hist.length - 1]?.text);
  if (hist.length !== 1) throw new Error('history mismatch');

  a.close();
  b.close();
  console.log('SMOKE TEST PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED:', e.message);
  process.exit(1);
});
