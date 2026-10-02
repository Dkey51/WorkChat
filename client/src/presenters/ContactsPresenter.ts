import { UserStatus } from '@isq/shared';
import { ContactsView } from '../view/ContactsView';
import { BasePresenter } from './base';
import {
  selectContact,
  setSidebarTab,
  usersLoaded,
  contactsReset,
  SidebarTab,
} from '../model/slices/contactsSlice';
import { historyLoaded, markRead, chatReset } from '../model/slices/chatSlice';
import { logoutUser, selfStatusChanged } from '../model/slices/authSlice';
import type { AppStore } from '../model/store';
import type { ChatApi } from '../model/api';

export class ContactsPresenter extends BasePresenter {
  constructor(
    private view: ContactsView,
    store: AppStore,
    api: ChatApi
  ) {
    super(store, api);
    this.view.on('selectContact', (uin) => void this.handleSelect(uin));
    this.view.on('addContact', (uin) => void this.handleAdd(uin));
    this.view.on('setStatus', (status) => void this.handleStatus(status));
    this.view.on('setSidebarTab', (tab) => void this.handleTab(tab));
    this.view.on('logout', () => this.handleLogout());
    this.render();
  }

  protected render(): void {
    const { auth, contacts, chat, ui } = this.store.getState();
    this.view.render({
      selfNickname: auth.user?.nickname ?? '',
      selfUin: auth.user?.uin ?? 0,
      selfStatus: auth.user?.status ?? 'offline',
      contacts: contacts.items,
      activeUin: contacts.activeUin,
      connected: ui.connected,
      unreadByContact: chat.unreadByContact,
      allUsers: contacts.allUsers,
      sidebarTab: contacts.sidebarTab,
    });
  }

  private async handleSelect(uin: number): Promise<void> {
    this.store.dispatch(selectContact(uin));
    this.store.dispatch(markRead({ peer: uin }));
    const history = await this.api.getHistory(uin);
    this.store.dispatch(historyLoaded({ with: uin, messages: history }));
  }

  private async handleTab(tab: SidebarTab): Promise<void> {
    this.store.dispatch(setSidebarTab(tab));
    if (tab === 'users') {
      const users = await this.api.getUsers();
      this.store.dispatch(usersLoaded(users));
    }
  }

  private async handleAdd(uin: number): Promise<void> {
    const res = await this.api.addContact(uin);
    this.view.setError(res.ok ? null : (res.error ?? 'Ошибка добавления'));
  }

  private async handleStatus(status: UserStatus): Promise<void> {
    const res = await this.api.setStatus(status);
    if (res.ok) this.store.dispatch(selfStatusChanged(status));
  }

  private handleLogout(): void {
    this.api.logout();
    this.store.dispatch(logoutUser());
    this.store.dispatch(contactsReset());
    this.store.dispatch(chatReset());
  }
}
