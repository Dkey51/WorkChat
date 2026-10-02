import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@isq/shared';
import { config } from './config.js';
import { registerSocketHandlers } from './socket.js';
import * as db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// HTTP: в production отдаём собранный клиент, иначе сообщаем, что нужен dev-сервер.
const httpServer = http.createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (!fs.existsSync(CLIENT_DIST)) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      'Рабочий чат: сервер запущен (сборка клиента не найдена — запустите Vite dev-сервер на :5173).'
    );
    return;
  }
  let filePath = path.join(CLIENT_DIST, url === '/' ? 'index.html' : url);
  if (
    !filePath.startsWith(CLIENT_DIST) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    filePath = path.join(CLIENT_DIST, 'index.html'); // SPA fallback
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, { cors: { origin: true } });

registerSocketHandlers(io);

async function main(): Promise<void> {
  await db.connect(config.mongoUri, config.mongoDb);
  httpServer.listen(config.port, () => {
    console.log(`Рабочий чат: сервер запущен на http://localhost:${config.port}`);
    console.log(`MongoDB: ${config.mongoUri} (база: ${config.mongoDb})`);
  });
}

main().catch((err) => {
  console.error('Не удалось запустить сервер:', err);
  process.exit(1);
});
