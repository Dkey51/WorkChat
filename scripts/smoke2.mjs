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
  const suffix = Date.now().toString().slice(-6);
  const nickA = 'Alice' + suffix;
  const nickB = 'Bob' + suffix;

  const c1 = await connect();
  const r1 = await ack(c1, 'register', { nickname: nickA, password: '1234' });
  console.log('Alice UIN:', r1.user?.uin, '| nick:', nickA);
  if (!r1.ok) throw new Error('register Alice failed: ' + r1.error);
  c1.close();

  const c2 = await connect();
  const r2 = await ack(c2, 'register', { nickname: nickB, password: '1234' });
  console.log('Bob UIN:', r2.user?.uin, '| nick:', nickB);
  if (!r2.ok) throw new Error('register Bob failed: ' + r2.error);

  // 1) Вход по логину (нику)
  const c3 = await connect();
  const loginByNick = await ack(c3, 'login', { login: nickA, password: '1234' });
  console.log('login by nickname ok:', loginByNick.ok, '| user:', loginByNick.user?.nickname);
  if (!loginByNick.ok || loginByNick.user?.nickname !== nickA)
    throw new Error('login by nickname failed');

  // 2) Список зарегистрированных пользователей (для Alice) — должен быть Bob, без Alice
  const users = await ack(c3, 'getUsers', {});
  console.log(
    'users list contains Bob:',
    users.some((u) => u.nickname === nickB)
  );
  if (!users.some((u) => u.nickname === nickB)) throw new Error('users list missing Bob');
  if (users.some((u) => u.nickname === nickA)) throw new Error('users list should exclude self');

  // 3) Вход по UIN тоже работает
  const c4 = await connect();
  const loginByUin = await ack(c4, 'login', { login: String(r2.user.uin), password: '1234' });
  console.log('login by UIN ok:', loginByUin.ok, '| user:', loginByUin.user?.nickname);
  if (!loginByUin.ok || loginByUin.user?.nickname !== nickB) throw new Error('login by UIN failed');

  // 4) Неверный пароль отклоняется
  const c5 = await connect();
  const bad = await ack(c5, 'login', { login: nickA, password: 'wrong' });
  console.log('bad password ok:', bad.ok, '| error:', bad.error);
  if (bad.ok) throw new Error('bad password should fail');

  c2.close();
  c3.close();
  c4.close();
  c5.close();
  console.log('SMOKE2 TEST PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE2 FAILED:', e.message);
  process.exit(1);
});
