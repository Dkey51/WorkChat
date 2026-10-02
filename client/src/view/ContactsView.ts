import { Contact, PublicUser, UserStatus } from '@isq/shared';
import { h, clear } from './dom';
import { View } from './base';
import type { SidebarTab } from '../model/slices/contactsSlice';

export interface ContactsViewProps {
  selfNickname: string;
  selfUin: number;
  selfStatus: UserStatus;
  contacts: Contact[];
  activeUin: number | null;
  connected: boolean;
  unreadByContact: Record<number, number>;
  allUsers: PublicUser[];
  sidebarTab: SidebarTab;
}

export interface ContactsViewEvents extends Record<string, unknown[]> {
  selectContact: [uin: number];
  addContact: [uin: number];
  setStatus: [status: UserStatus];
  setSidebarTab: [tab: SidebarTab];
  logout: [];
}

export class ContactsView extends View<ContactsViewEvents> {
  private errorEl: HTMLElement | null = null;

  render(props: ContactsViewProps): void {
    clear(this.root);
    this.root.append(
      h('div', { className: 'sidebar-inner' }, [
        this.header(props),
        this.tabs(props),
        (this.errorEl = h('div', { className: 'sidebar-error' }, [])),
        props.sidebarTab === 'contacts'
          ? h('div', { className: 'sidebar-body' }, [
              this.addContactForm(),
              this.contactList(props),
            ])
          : this.usersList(props),
      ])
    );
  }

  setError(message: string | null): void {
    if (this.errorEl) this.errorEl.textContent = message ?? '';
  }

  private header(props: ContactsViewProps): HTMLElement {
    return h('div', { className: 'sidebar-header' }, [
      h('div', { className: 'me-info' }, [
        h('div', { className: 'me-name' }, [props.selfNickname]),
        h('div', { className: 'me-uin' }, [`UIN: ${props.selfUin}`]),
      ]),
      h('div', { className: 'me-controls' }, [
        h(
          'select',
          {
            className: 'status-select',
            onChange: (e: Event) =>
              this.emit('setStatus', (e.target as HTMLSelectElement).value as UserStatus),
          },
          [
            h('option', { value: 'online', selected: props.selfStatus === 'online' }, ['В сети']),
            h('option', { value: 'away', selected: props.selfStatus === 'away' }, ['Отошёл']),
          ]
        ),
        h('button', { className: 'btn btn-ghost', onClick: () => this.emit('logout') }, ['Выйти']),
      ]),
      h('div', { className: 'conn' + (props.connected ? ' online' : ' offline') }, [
        props.connected ? 'Подключено' : 'Нет соединения',
      ]),
    ]);
  }

  private tabs(props: ContactsViewProps): HTMLElement {
    return h('div', { className: 'sidebar-tabs' }, [
      h(
        'button',
        {
          className: 'stab' + (props.sidebarTab === 'contacts' ? ' active' : ''),
          onClick: () => this.emit('setSidebarTab', 'contacts'),
        },
        ['Контакты']
      ),
      h(
        'button',
        {
          className: 'stab' + (props.sidebarTab === 'users' ? ' active' : ''),
          onClick: () => this.emit('setSidebarTab', 'users'),
        },
        ['Пользователи']
      ),
    ]);
  }

  private addContactForm(): HTMLElement {
    const input = h('input', {
      className: 'input',
      type: 'number',
      placeholder: 'UIN контакта',
    });
    const form = h('form', { className: 'add-contact' }, [
      input,
      h('button', { className: 'btn btn-primary', type: 'submit' }, ['Добавить']),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const uin = parseInt(input.value, 10);
      if (!Number.isNaN(uin)) {
        this.emit('addContact', uin);
        input.value = '';
      }
    });
    return form;
  }

  private contactList(props: ContactsViewProps): HTMLElement {
    if (props.contacts.length === 0) {
      return h('div', { className: 'contact-list empty' }, [
        'Добавьте контакт по UIN или на вкладке «Пользователи»',
      ]);
    }
    return h(
      'div',
      { className: 'contact-list' },
      props.contacts.map((c) => {
        const unread = props.unreadByContact[c.uin] ?? 0;
        return h(
          'button',
          {
            className: 'contact' + (c.uin === props.activeUin ? ' active' : ''),
            onClick: () => this.emit('selectContact', c.uin),
          },
          [
            h('span', { className: 'status-dot ' + c.status }, []),
            h('span', { className: 'contact-name' }, [c.nickname]),
            unread > 0 ? h('span', { className: 'badge' }, [String(unread)]) : null,
            h('span', { className: 'contact-uin' }, [String(c.uin)]),
          ]
        );
      })
    );
  }

  private usersList(props: ContactsViewProps): HTMLElement {
    if (props.allUsers.length === 0) {
      return h('div', { className: 'contact-list empty' }, [
        'Зарегистрированных пользователей пока нет',
      ]);
    }
    const contactUins = new Set(props.contacts.map((c) => c.uin));
    return h(
      'div',
      { className: 'contact-list' },
      props.allUsers.map((u) => {
        const added = contactUins.has(u.uin);
        return h('div', { className: 'user-row' }, [
          h('span', { className: 'status-dot ' + u.status }, []),
          h('span', { className: 'contact-name' }, [u.nickname]),
          h('span', { className: 'contact-uin' }, [String(u.uin)]),
          added
            ? h('span', { className: 'badge added' }, ['в контактах'])
            : h(
                'button',
                {
                  className: 'btn btn-primary btn-sm',
                  onClick: () => this.emit('addContact', u.uin),
                },
                ['Добавить']
              ),
        ]);
      })
    );
  }
}
