import type { ShallowRef } from 'vue';

const DEFAULT_MENU_ITEM_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseMenuKeyboardOptions = {
  floatingRef: Readonly<ShallowRef<HTMLElement | null>>;
  close: () => void;
  itemSelector?: string;
  /** 自定义条目解析；优先级高于 `itemSelector`。 */
  getItems?: (root: HTMLElement) => HTMLElement[];
};

/** 菜单内方向键 / Home / End / Escape 键盘导航。 */
export const useMenuKeyboard = ({
  floatingRef,
  close,
  itemSelector = DEFAULT_MENU_ITEM_SELECTOR,
  getItems,
}: UseMenuKeyboardOptions) => {
  const resolveItems = (): HTMLElement[] => {
    const root = floatingRef.value;
    if (!root) return [];
    return getItems ? getItems(root) : Array.from(root.querySelectorAll<HTMLElement>(itemSelector));
  };

  const handleMenuKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = resolveItems();
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(
      (floatingRef.value?.ownerDocument.activeElement as HTMLElement) ?? null
    );
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return { handleMenuKeydown };
};
