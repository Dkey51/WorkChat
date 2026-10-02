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
  return new Promise((resolve) => socket.emit(event, payload, (res) => resolve(res)));
}

function waitFor(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout "${event}"`)), timeout);
    socket.once(event, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });
}

async function main() {
  const suffix = Date.now().toString().slice(-6);
  const nickA = 'Alice' + suffix;
  const nickB = 'Bob' + suffix;

  const a = await connect();
  const ra = await ack(a, 'register', { nickname: nickA, password: '1234' });
  if (!ra.ok) throw new Error('register A failed');
  const b = await connect();
  const rb = await ack(b, 'register', { nickname: nickB, password: '1234' });
  if (!rb.ok) throw new Error('register B failed');

  const add = await ack(a, 'addContact', { uin: rb.user.uin });
  if (!add.ok) throw new Error('addContact failed');

  // Отправка
  const bMsgP = waitFor(b, 'message');
  const send = await ack(a, 'sendMessage', { to: rb.user.uin, text: 'Привет' });
  const msgId = send.message.id;
  await bMsgP;
  console.log('sent, id =', msgId.slice(0, 8));

  // Редактирование владельцем
  const bEditP = waitFor(b, 'messageEdited');
  const edit = await ack(a, 'editMessage', { id: msgId, text: 'Привет, мир!' });
  const bEdit = await bEditP;
  console.log('edit ok:', edit.ok, '| Bob got:', bEdit.text);
  if (!edit.ok || bEdit.text !== 'Привет, мир!') throw new Error('edit failed');

  // Редактирование чужим — должно быть запрещено
  const badEdit = await ack(b, 'editMessage', { id: msgId, text: 'hack' });
  console.log('non-owner edit ok:', badEdit.ok, '| error:', badEdit.error);
  if (badEdit.ok) throw new Error('non-owner edit should fail');

  // Удаление чужим — должно быть запрещено
  const badDel = await ack(b, 'deleteMessage', { id: msgId });
  console.log('non-owner delete ok:', badDel.ok, '| error:', badDel.error);
  if (badDel.ok) throw new Error('non-owner delete should fail');

  // Удаление владельцем
  const bDelP = waitFor(b, 'messageDeleted');
  const del = await ack(a, 'deleteMessage', { id: msgId });
  const bDel = await bDelP;
  console.log('delete ok:', del.ok, '| Bob got id:', bDel.id.slice(0, 8));
  if (!del.ok || bDel.id !== msgId) throw new Error('delete failed');

  // История должна быть пустой после удаления
  const hist = await ack(a, 'getHistory', { with: rb.user.uin });
  console.log('history after delete:', hist.length);
  if (hist.length !== 0) throw new Error('history not empty after delete');

  a.close();
  b.close();
  console.log('SMOKE3 TEST PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE3 FAILED:', e.message);
  process.exit(1);
});
