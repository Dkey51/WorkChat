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

async function main() {
  // Сервер уже перезапущен, поэтому данные должны читаться из MongoDB.
  const s = await connect();
  const login = await ack(s, 'login', { uin: 1000001, password: '1234' });
  console.log('login after restart ok:', login.ok, '| user:', login.user?.nickname);
  if (!login.ok) throw new Error('login failed after restart');

  const hasAlice = (login.contacts ?? []).some((c) => c.nickname === 'Alice');
  console.log('contact Alice preserved:', hasAlice);
  if (!hasAlice) throw new Error('contacts not persisted');

  const hist = await ack(s, 'getHistory', { with: 1000000 });
  console.log('history after restart:', hist.length, '| last:', hist[hist.length - 1]?.text);
  if (hist.length !== 1 || hist[hist.length - 1]?.text !== 'Привет, Боб!') {
    throw new Error('messages not persisted');
  }

  s.close();
  console.log('PERSISTENCE TEST PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error('PERSISTENCE TEST FAILED:', e.message);
  process.exit(1);
});
