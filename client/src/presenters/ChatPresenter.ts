import { ChatView } from '../view/ChatView';
import { BasePresenter } from './base';
import type { AppStore } from '../model/store';
import type { ChatApi } from '../model/api';

export class ChatPresenter extends BasePresenter {
  constructor(
    private view: ChatView,
    store: AppStore,
    api: ChatApi
  ) {
    super(store, api);
    this.view.on('sendMessage', (text) => void this.handleSend(text));
    this.view.on('typing', (typing) => this.handleTyping(typing));
    this.view.on('editMessage', (id, text) => void this.handleEdit(id, text));
    this.view.on('deleteMessage', (id) => void this.handleDelete(id));
    this.render();
  }

  protected render(): void {
    const { contacts, chat, auth } = this.store.getState();
    const active = contacts.activeUin;
    const contact = contacts.items.find((c) => c.uin === active);
    this.view.render({
      contact,
      messages: active != null ? (chat.messagesByContact[active] ?? []) : [],
      selfUin: auth.user?.uin ?? 0,
      typing: active != null ? (chat.typingByContact[active] ?? false) : false,
    });
  }

  private async handleSend(text: string): Promise<void> {
    const active = this.store.getState().contacts.activeUin;
    const trimmed = text.trim();
    if (active == null || !trimmed) return;
    this.view.clearInput();
    const res = await this.api.sendMessage(active, trimmed);
    if (!res.ok) this.view.setError(res.error ?? 'Ошибка отправки');
  }

  private async handleEdit(id: string, text: string): Promise<void> {
    const res = await this.api.editMessage(id, text);
    if (!res.ok) this.view.setError(res.error ?? 'Не удалось отредактировать');
  }

  private async handleDelete(id: string): Promise<void> {
    const res = await this.api.deleteMessage(id);
    if (!res.ok) this.view.setError(res.error ?? 'Не удалось удалить');
  }

  private handleTyping(typing: boolean): void {
    const active = this.store.getState().contacts.activeUin;
    if (active != null) this.api.typing(active, typing);
  }
}
