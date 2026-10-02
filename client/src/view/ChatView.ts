import { Contact, Message } from '@isq/shared';
import { h, clear } from './dom';
import { View } from './base';

export interface ChatViewProps {
  contact: Contact | undefined;
  messages: Message[];
  selfUin: number;
  typing: boolean;
}

export interface ChatViewEvents extends Record<string, unknown[]> {
  sendMessage: [text: string];
  typing: [typing: boolean];
  editMessage: [id: string, text: string];
  deleteMessage: [id: string];
}

export class ChatView extends View<ChatViewEvents> {
  private messagesEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private typingSent = false;
  private typingTimer: number | null = null;
  private editingId: string | null = null;
  private lastProps: ChatViewProps | null = null;

  render(props: ChatViewProps): void {
    this.lastProps = props;
    // Сохраняем ввод/фокус, чтобы перерисовка не «сбрасывала» набираемый текст.
    const savedInput = this.inputEl?.value ?? '';
    const hadFocus = document.activeElement === this.inputEl;
    clear(this.root);

    if (!props.contact) {
      this.inputEl = null;
      this.messagesEl = null;
      this.errorEl = null;
      this.editingId = null;
      this.root.append(
        h('div', { className: 'chat-empty' }, ['Выберите контакт, чтобы начать переписку'])
      );
      return;
    }

    this.root.append(
      h('div', { className: 'chat' }, [
        h('div', { className: 'chat-header' }, [
          h('div', { className: 'chat-contact-name' }, [props.contact.nickname]),
          h('div', { className: 'chat-contact-status' }, [statusLabel(props.contact.status)]),
        ]),
        (this.messagesEl = h('div', { className: 'messages' }, this.renderMessages(props))),
        (this.errorEl = h('div', { className: 'chat-error' }, [])),
        h('div', { className: 'typing' }, [
          props.typing ? `${props.contact.nickname} печатает…` : '',
        ]),
        this.inputBar(),
      ])
    );

    if (savedInput && this.inputEl) this.inputEl.value = savedInput;
    if (hadFocus && this.inputEl) this.inputEl.focus();
    this.scrollToBottom();
  }

  clearInput(): void {
    if (this.inputEl) this.inputEl.value = '';
  }

  setError(message: string | null): void {
    if (this.errorEl) this.errorEl.textContent = message ?? '';
  }

  private renderMessages(props: ChatViewProps): HTMLElement[] {
    return props.messages.map((m) => {
      const own = m.from === props.selfUin;
      const editing = own && this.editingId === m.id;
      return h('div', { className: 'message' + (own ? ' own' : '') }, [
        h('div', { className: 'message-bubble' }, [
          editing ? this.editForm(m) : h('div', { className: 'message-text' }, [m.text]),
          h('div', { className: 'message-meta' }, [
            h('span', { className: 'message-time' }, [this.timeLabel(m.timestamp)]),
            own && !editing ? this.msgActions(m) : null,
          ]),
        ]),
      ]);
    });
  }

  private msgActions(m: Message): HTMLElement {
    return h('span', { className: 'msg-actions' }, [
      h(
        'button',
        { className: 'msg-btn', title: 'Редактировать', onClick: () => this.startEdit(m) },
        ['✏️']
      ),
      h(
        'button',
        { className: 'msg-btn', title: 'Удалить', onClick: () => this.confirmDelete(m) },
        ['🗑']
      ),
    ]);
  }

  private editForm(m: Message): HTMLElement {
    const input = h('input', { className: 'input edit-input', type: 'text', value: m.text });
    const save = () => {
      const text = input.value.trim();
      if (text && text !== m.text) this.emit('editMessage', m.id, text);
      this.editingId = null;
      this.rerender();
    };
    const cancel = () => {
      this.editingId = null;
      this.rerender();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') cancel();
    });
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
    return h('div', { className: 'edit-form' }, [
      input,
      h('button', { className: 'btn btn-primary btn-sm', onClick: save }, ['Ок']),
      h('button', { className: 'btn btn-ghost btn-sm', onClick: cancel }, ['Отмена']),
    ]);
  }

  private startEdit(m: Message): void {
    this.editingId = m.id;
    this.rerender();
  }

  private confirmDelete(m: Message): void {
    if (window.confirm('Удалить сообщение?')) {
      this.emit('deleteMessage', m.id);
    }
  }

  private rerender(): void {
    if (this.lastProps) this.render(this.lastProps);
  }

  private timeLabel(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private inputBar(): HTMLElement {
    const input = h('input', {
      className: 'input chat-input',
      type: 'text',
      placeholder: 'Сообщение…',
    });
    this.inputEl = input;
    input.addEventListener('input', () => this.onInput());

    const form = h('form', { className: 'chat-input-bar' }, [
      input,
      h('button', { className: 'btn btn-primary', type: 'submit' }, ['Отправить']),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.stopTyping();
      this.emit('sendMessage', input.value);
    });
    return form;
  }

  private onInput(): void {
    const value = this.inputEl?.value ?? '';
    if (value.length === 0) {
      this.stopTyping();
      return;
    }
    if (!this.typingSent) {
      this.typingSent = true;
      this.emit('typing', true);
    }
    if (this.typingTimer) window.clearTimeout(this.typingTimer);
    this.typingTimer = window.setTimeout(() => this.stopTyping(), 1200);
  }

  private stopTyping(): void {
    this.typingSent = false;
    if (this.typingTimer) {
      window.clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    this.emit('typing', false);
  }

  private scrollToBottom(): void {
    if (this.messagesEl) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}

function statusLabel(status: Contact['status']): string {
  if (status === 'online') return 'в сети';
  if (status === 'away') return 'отошёл';
  return 'не в сети';
}
