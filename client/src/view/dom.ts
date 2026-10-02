type Child = Node | string | number | false | null | undefined;

/** Мини-хелпер создания DOM-элементов (аналог hyperscript). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'className') {
      el.className = String(value);
    } else if (key === 'textContent') {
      el.textContent = String(value);
    } else if (key === 'innerHTML') {
      el.innerHTML = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'style' && typeof value === 'object' && value !== null) {
      Object.assign(el.style, value as CSSStyleDeclaration);
    } else if (key === 'value') {
      (el as HTMLInputElement).value = String(value);
    } else if (key === 'checked') {
      (el as HTMLInputElement).checked = Boolean(value);
    } else if (key === 'selected') {
      (el as HTMLOptionElement).selected = Boolean(value);
    } else if (key === 'disabled') {
      (el as HTMLButtonElement).disabled = Boolean(value);
    } else if (typeof value === 'string' || typeof value === 'number') {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
