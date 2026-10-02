# UML — модель взаимодействия компонентов

Схемы описывают архитектуру MVP и ключевые потоки взаимодействия между клиентом
(браузер), сервером (Node.js) и MongoDB. Формат — **Mermaid**: диаграммы рендерятся
на GitHub/GitLab и в большинстве современных редакторов.

---

## 1. Диаграмма компонентов

Показывает составные части системы и связи между ними.

```mermaid
flowchart LR
    subgraph Client["client — SPA (браузер)"]
        View["View<br/>DOM-компоненты"]
        Presenter["Presenter<br/>BasePresenter + 3 презентера"]
        Model["Model<br/>Redux store + ChatApi"]
    end

    subgraph Server["server — Node.js"]
        HTTP["index.ts<br/>HTTP-статика + bootstrap"]
        Socket["socket.ts<br/>обработчики Socket.IO"]
        Repo["db.ts<br/>Repository"]
        Cfg["config.ts<br/>.env"]
    end

    Shared["@isq/shared<br/>типы + EVENTS"]
    DB[("MongoDB (Docker)")]

    View -->|"emit / on"| Presenter
    Presenter -->|"dispatch / subscribe"| Model
    Model -->|"Socket.IO (EVENTS)"| Socket
    Socket -->|"вызовы репозитория"| Repo
    Repo -->|"mongodb driver"| DB
    HTTP -.->|"отдаёт client/dist"| Client
    Shared -.-> Model
    Shared -.-> Socket
    Cfg -.-> Socket
```

- **View** → **Presenter**: события пользователя (`emit`) и перерисовка по команде.
- **Presenter** → **Model**: `dispatch` действий Redux и подписка на store.
- **Model** → **Server**: запросы по Socket.IO; имена событий — из `@isq/shared` (`EVENTS`).
- **Server** → **MongoDB**: вся работа с БД инкапсулирована в репозитории `db.ts`.

---

## 2. Диаграмма классов клиента (MVP)

Структура слоёв Model / View / Presenter.

```mermaid
classDiagram
    class View {
        +on(event, handler)
        #emit(event, ...args)
    }
    class AuthView
    class ContactsView
    class ChatView
    View <|-- AuthView
    View <|-- ContactsView
    View <|-- ChatView

    class BasePresenter {
        #store
        #api
        #render()*
        +dispose()
    }
    class AuthPresenter
    class ContactsPresenter
    class ChatPresenter
    BasePresenter <|-- AuthPresenter
    BasePresenter <|-- ContactsPresenter
    BasePresenter <|-- ChatPresenter

    class ChatApi {
        +register()
        +login()
        +addContact()
        +sendMessage()
        +editMessage()
        +deleteMessage()
        +setStatus()
        +getHistory()
        +getUsers()
        +typing()
    }

    class Store["Redux store<br/>auth / contacts / chat / ui"]

    BasePresenter --> View : управляет
    BasePresenter --> Store : dispatch / subscribe
    BasePresenter --> ChatApi : вызывает
    ChatApi --> Store : dispatch
```

- `BasePresenter` реализует шаблон **Template Method**: подписка на store и абстрактный
  `render()` в базовом классе, привязка событий — в подклассах.
- `ChatApi` — часть Model: превращает входящие события сервера в действия Redux.

---

## 3. Sequence — вход по логину/UIN

```mermaid
sequenceDiagram
    actor U as Пользователь
    participant V as AuthView
    participant P as AuthPresenter
    participant M as Redux + ChatApi
    participant S as Server (socket.ts)
    participant DB as MongoDB

    U->>V: вводит логин (или UIN) и пароль
    V->>P: emit('login', login, password)
    P->>M: dispatch(login thunk)
    M->>S: emit('login', { login, password })
    S->>DB: findUser / findUserByNickname + verifyPassword
    DB-->>S: user | undefined
    alt пользователь найден
        S->>S: attachUser → статус online
        S-->>M: emit('contacts', [...])
        S-->>M: ack({ ok: true, user })
        M->>M: authSlice.fulfilled → user в store
        M-->>P: store изменился
        P->>V: render()
        Note over M: App переключает экран на main
    else неверные данные
        S-->>M: ack({ ok: false, error })
        M->>M: authSlice → error
        P->>V: setError(...)
    end
```

---

## 4. Sequence — отправка сообщения

```mermaid
sequenceDiagram
    actor A as Алиса
    participant V as ChatView
    participant P as ChatPresenter
    participant M as ChatApi + Redux
    participant S as Server
    participant DB as MongoDB
    participant B as Боб (другой клиент)

    A->>V: вводит сообщение
    V->>P: emit('sendMessage', text)
    P->>M: api.sendMessage(to, text)
    M->>S: emit('sendMessage', { to, text })
    S->>DB: saveMessage
    DB-->>S: ok
    S-->>B: emit('message', msg)
    S-->>M: emit('message', msg) — эхо отправителю
    M->>M: messageReceived → store
    M-->>P: store изменился
    P->>V: render()
    Note over B: ChatApi → messageReceived → render
```

---

## 5. Sequence — редактирование / удаление сообщения

```mermaid
sequenceDiagram
    actor A as Автор сообщения
    participant V as ChatView
    participant P as ChatPresenter
    participant M as ChatApi + Redux
    participant S as Server
    participant DB as MongoDB
    participant B as Собеседник

    A->>V: жмёт ✏️ (или 🗑)
    V->>P: emit('editMessage' | 'deleteMessage', id, ...)
    P->>M: api.editMessage(id, text) / api.deleteMessage(id)
    M->>S: emit('editMessage' | 'deleteMessage', ...)
    S->>DB: findMessage + проверка msg.from === me
    DB-->>S: message
    alt автор подтверждён
        S->>DB: updateMessageText / deleteMessage
        DB-->>S: ok
        S-->>B: emit('messageEdited' | 'messageDeleted', ...)
        S-->>M: emit(...) — эхо автору
        M->>M: messageEdited / messageDeleted → store
        P->>V: render()
    else чужое сообщение
        S-->>M: ack({ ok: false, error })
        P->>V: setError(...)
    end
```

> Удаление отличается от редактирования только событием (`deleteMessage` →
> `messageDeleted`) и отсутствием нового текста.
