import type { AppStore } from '../model/store';
import type { ChatApi } from '../model/api';

/**
 * Базовый Presenter (шаблон Template Method).
 * Подписывается на изменения store и вызывает абстрактный render().
 * Подкласс в своём конструкторе привязывает события View и делает первый render().
 */
export abstract class BasePresenter {
  private unsubscribe: () => void;

  constructor(
    protected readonly store: AppStore,
    protected readonly api: ChatApi
  ) {
    this.unsubscribe = store.subscribe(() => this.render());
  }

  protected abstract render(): void;

  dispose(): void {
    this.unsubscribe();
  }
}
