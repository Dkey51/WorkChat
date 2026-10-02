/**
 * Базовые классы слоя View.
 * View — пассивный: он только отрисовывает данные (render) и сообщает
 * о действиях пользователя через события (emit/on). Всю логику берёт на себя Presenter.
 */
export abstract class EventEmitter<Events extends Record<string, unknown[]>> {
  private handlers = new Map<keyof Events, Array<(...args: unknown[]) => void>>();

  on<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as unknown as (...args: unknown[]) => void);
    this.handlers.set(event, list);
  }

  protected emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const handler of list) handler(...args);
  }
}

export abstract class View<Events extends Record<string, unknown[]>> extends EventEmitter<Events> {
  constructor(protected root: HTMLElement) {
    super();
  }
}
