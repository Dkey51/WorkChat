import { AuthView } from '../view/AuthView';
import { BasePresenter } from './base';
import { login, register } from '../model/slices/authSlice';
import type { AppStore } from '../model/store';
import type { ChatApi } from '../model/api';

/**
 * Presenter экрана входа/регистрации.
 * Связывает View (формы) и Model (Redux + api): принимает события View,
 * дёргает Model, а подписка на store обновляет View.
 */
export class AuthPresenter extends BasePresenter {
  constructor(
    private view: AuthView,
    store: AppStore,
    api: ChatApi
  ) {
    super(store, api);
    this.view.on('login', (loginValue, password) => void this.handleLogin(loginValue, password));
    this.view.on('register', (nickname, password) => void this.handleRegister(nickname, password));
    this.render();
  }

  protected render(): void {
    this.view.setLoading(this.store.getState().auth.status === 'loading');
  }

  private async handleLogin(loginValue: string, password: string): Promise<void> {
    if (!loginValue.trim() || !password) {
      this.view.setError('Введите логин (или UIN) и пароль');
      return;
    }
    await this.store.dispatch(login({ login: loginValue.trim(), password }));
    this.afterAuth();
  }

  private async handleRegister(nickname: string, password: string): Promise<void> {
    if (nickname.trim().length < 2 || password.length < 4) {
      this.view.setError('Никнейм от 2 символов, пароль от 4');
      return;
    }
    await this.store.dispatch(register({ nickname: nickname.trim(), password }));
    this.afterAuth();
  }

  private afterAuth(): void {
    const auth = this.store.getState().auth;
    if (auth.user) {
      this.requestNotificationPermission();
      this.view.setError(null);
    } else {
      this.view.setError(auth.error);
    }
  }

  private requestNotificationPermission(): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }
}
