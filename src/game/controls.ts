export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export const touchInput: InputState = { left: false, right: false, jump: false };

/** Debug-only sources. When set, they replace player input so tests are repeatable. */
export const inputOverride: {
  manual: InputState | null;
  bot: ((state: unknown) => InputState) | null;
} = { manual: null, bot: null };

export function bindTouchControls(): void {
  const bind = (id: string, key: keyof InputState) => {
    const button = document.getElementById(id);
    if (!button) return;
    const set = (down: boolean) => {
      touchInput[key] = down;
      button.classList.toggle('active', down);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      set(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      button.addEventListener(type, () => set(false));
    }
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  };
  bind('btn-left', 'left');
  bind('btn-right', 'right');
  bind('btn-jump', 'jump');
}
