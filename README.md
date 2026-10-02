# Рабочий чат — в стиле ICQ («Аська»)

Одностраничное приложение (SPA) на **TypeScript** с архитектурой **MVP**
(Model — View — Presenter). Бэкенд на **Node.js + Socket.IO + MongoDB**, состояние
на клиенте — **Redux (Redux Toolkit)**.

> По заданию преподавателя рекомендована COM-модель, но по договорённости используется MVP.

## Возможности

- Регистрация с выдачей уникального номера **UIN** (как в ICQ).
- Вход по логину (нику) или UIN + паролю.
- Список контактов с живыми статусами (в сети / отошёл / не в сети).
- Добавление контакта по UIN или из списка зарегистрированных пользователей.
- Список всех зарегистрированных пользователей.
- Личная переписка в реальном времени.
- Редактирование и удаление своих сообщений.
- Индикатор «печатает…».
- Уведомления о новых сообщениях (счётчик непрочитанных + браузерные уведомления).
- История сообщений (хранится в MongoDB — переживает перезапуск сервера).

## Архитектура (MVP)

```
client/src
├── model/          Модель — данные и бизнес-логика
│   ├── store.ts        Redux store (объединяет slice'ы)
│   ├── api.ts          ChatApi: обёртка над socket.io-client
│   └── slices/         authSlice, contactsSlice, chatSlice, uiSlice
├── view/           Представление — пассивный DOM, не знает про логику
│   ├── dom.ts          хелпер h() для построения DOM
│   ├── base.ts         EventEmitter / View
│   └── AuthView / ContactsView / ChatView
├── presenters/     Презентер — связывает View и Model
│   ├── base.ts         BasePresenter (шаблон Template Method)
│   └── AuthPresenter / ContactsPresenter / ChatPresenter
└── app.ts          сборка экранов
```

- **Model** — Redux store + `ChatApi`. Входящие события сервера превращаются в
  действия Redux и попадают в store.
- **View** — пассивные DOM-компоненты. Только рисуют (`render`) и сообщают о
  действиях пользователя через события (`emit`).
- **Presenter** — подписывается на события View, вызывает Model (dispatch / api)
  и на изменение store обновляет View.

## Структура проекта

```
deep ISQ/
├── shared/           @isq/shared — доменные типы + типизированные события Socket.IO
│   ├── src/index.ts      типы (User, Contact, Message, ...)
│   └── src/events.ts     EVENTS + ClientToServerEvents / ServerToClientEvents
├── server/           @isq/server — Node.js + Socket.IO + MongoDB
│   └── src/             index.ts (bootstrap) · socket.ts (обработчики) · db.ts (repository) · config.ts (.env)
├── client/           @isq/client — SPA (Vite + Redux Toolkit + socket.io-client)
├── docker-compose.yml  MongoDB в Docker (хост-порт 27018)
└── scripts/          smoke*.mjs / persist.mjs — проверочные скрипты
```

## Паттерны и практики

- **Типизированные события Socket.IO** — имена в одном месте (`EVENTS`), контракты
  `ClientToServerEvents` / `ServerToClientEvents` дают проверку типов на обеих сторонах.
- **MVP** на клиенте: `Model` (Redux + `ChatApi`) — `View` (пассивный DOM) — `Presenter`.
  Базовый `BasePresenter` реализует шаблон **Template Method**.
- **Repository** на сервере: `db.ts` инкапсулирует всю работу с MongoDB.
- **Конфигурация через окружение** — `server/src/config.ts` + `.env` (см. `.env.example`).
- **Разделение ответственности** на сервере: `index.ts` (bootstrap) и `socket.ts` (обработчики).
- **Единый стиль кода** — Prettier (`npm run format`) и EditorConfig.

## Запуск

Требуется Node.js ≥ 18 и Docker.

### 1. Поднять MongoDB (Docker)

```bash
docker compose up -d     # MongoDB на localhost:27018, данные в Docker-томе mongo-data
```

### 2. Запустить приложение

```bash
npm install              # установка зависимостей (workspaces)
npm run dev              # сервер (:3001) + Vite dev-сервер (:5173)
```

Откройте http://localhost:5173, зарегистрируйте двух пользователей в разных
вкладках браузера, добавьте друг друга по UIN и общайтесь.

### Продакшн-сборка

```bash
npm run build            # сборка shared → server → client
npm start                # сервер отдаёт собранный клиент на http://localhost:3001
```

### Переменные окружения сервера

| Переменная  | По умолчанию                | Назначение      |
| ----------- | --------------------------- | --------------- |
| `MONGO_URI` | `mongodb://localhost:27018` | адрес MongoDB   |
| `MONGO_DB`  | `workchat`                  | имя базы данных |
| `PORT`      | `3001`                      | порт сервера    |

Данные сохраняются в MongoDB и остаются после перезапуска сервера или контейнера.
Чтобы полностью очистить базу: `docker compose down -v` (удаляет том с данными).

## События Socket.IO

| Направление | Событие                                                                             | Назначение                                |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| C → S       | `register`, `login`                                                                 | создание аккаунта / вход                  |
| C → S       | `addContact`, `getHistory`, `getUsers`                                              | контакты / история / список пользователей |
| C → S       | `sendMessage`, `editMessage`, `deleteMessage`, `typing`, `setStatus`, `logout`      | чат                                       |
| S → C       | `contacts`, `contactStatus`, `message`, `messageEdited`, `messageDeleted`, `typing` | обновления                                |

## UML-диаграммы

Модель взаимодействия компонентов (диаграммы компонентов, классов и последовательностей)
в формате Mermaid: [docs/uml.md](docs/uml.md).
