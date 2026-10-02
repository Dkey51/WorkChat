import { h, clear } from './dom';
import { View } from './base';

export interface AuthViewEvents extends Record<string, unknown[]> {
  login: [login: string, password: string];
  register: [nickname: string, password: string];
}

export class AuthView extends View<AuthViewEvents> {
  private mode: 'login' | 'register' = 'login';
  private errorEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    super(root);
    this.render();
  }

  private render(): void {
    clear(this.root);
    this.root.append(
      h('div', { className: 'auth-card' }, [
        h('div', { className: 'auth-logo' }, ['Рабочий чат']),
        h('div', { className: 'auth-subtitle' }, ['Мессенджер в стиле ICQ']),
        h('div', { className: 'tabs' }, [
          h(
            'button',
            {
              className: 'tab' + (this.mode === 'login' ? ' active' : ''),
              onClick: () => this.switchMode('login'),
            },
            ['Вход']
          ),
          h(
            'button',
            {
              className: 'tab' + (this.mode === 'register' ? ' active' : ''),
              onClick: () => this.switchMode('register'),
            },
            ['Регистрация']
          ),
        ]),
        this.mode === 'login' ? this.loginForm() : this.registerForm(),
        (this.errorEl = h('div', { className: 'auth-error' }, [])),
      ])
    );
  }

  private switchMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.render();
  }

  private loginForm(): HTMLElement {
    const loginInput = h('input', {
      className: 'input',
      type: 'text',
      placeholder: 'Логин или UIN',
    });
    const passInput = h('input', { className: 'input', type: 'password', placeholder: 'Пароль' });
    const submit = h('button', { className: 'btn btn-primary', type: 'submit' }, ['Войти']);

    const form = h('form', { className: 'form' }, [loginInput, passInput, submit]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emit('login', loginInput.value, passInput.value);
    });
    return form;
  }

  private registerForm(): HTMLElement {
    const nickInput = h('input', { className: 'input', type: 'text', placeholder: 'Никнейм' });
    const passInput = h('input', { className: 'input', type: 'password', placeholder: 'Пароль' });
    const submit = h('button', { className: 'btn btn-primary', type: 'submit' }, [
      'Зарегистрироваться',
    ]);

    const form = h('form', { className: 'form' }, [nickInput, passInput, submit]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emit('register', nickInput.value, passInput.value);
    });
    return form;
  }

  setLoading(loading: boolean): void {
    const submit = this.root.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submit) {
      submit.disabled = loading;
      submit.textContent = loading
        ? 'Подождите…'
        : this.mode === 'login'
          ? 'Войти'
          : 'Зарегистрироваться';
    }
  }

  setError(message: string | null): void {
    if (this.errorEl) this.errorEl.textContent = message ?? '';
  }
}
