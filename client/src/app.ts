import { AuthView } from './view/AuthView';
import { ContactsView } from './view/ContactsView';
import { ChatView } from './view/ChatView';
import { AuthPresenter } from './presenters/AuthPresenter';
import { ContactsPresenter } from './presenters/ContactsPresenter';
import { ChatPresenter } from './presenters/ChatPresenter';
import { h, clear } from './view/dom';
import type { AppStore } from './model/store';
import type { ChatApi } from './model/api';

/**
 * Корневой компонент приложения: собирает экраны (auth / main),
 * создаёт View и Presenter, переключает экраны по состоянию auth.
 */
export class App {
  private authScreen!: HTMLElement;
  private mainScreen!: HTMLElement;

  constructor(
    private store: AppStore,
    private api: ChatApi
  ) {}

  mount(root: HTMLElement): void {
    clear(root);

    this.authScreen = h('div', { className: 'screen auth-screen' });
    this.mainScreen = h('div', { className: 'screen main-screen hidden' });

    const sidebar = h('div', { className: 'sidebar' });
    const chatArea = h('div', { className: 'chat-area' });
    this.mainScreen.append(sidebar, chatArea);

    // View
    const authView = new AuthView(this.authScreen);
    const contactsView = new ContactsView(sidebar);
    const chatView = new ChatView(chatArea);

    root.append(this.authScreen, this.mainScreen);

    // Presenter
    new AuthPresenter(authView, this.store, this.api);
    new ContactsPresenter(contactsView, this.store, this.api);
    new ChatPresenter(chatView, this.store, this.api);

    this.store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    const user = this.store.getState().auth.user;
    this.authScreen.classList.toggle('hidden', Boolean(user));
    this.mainScreen.classList.toggle('hidden', !user);
  }
}
