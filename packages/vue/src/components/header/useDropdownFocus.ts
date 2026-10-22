import { nextTick, type Ref, type ShallowRef } from 'vue';

const DEFAULT_FOCUS_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseDropdownFocusOptions = {
  triggerRef: Readonly<ShallowRef<HTMLElement | null>>;
  floatingRef: Readonly<ShallowRef<HTMLElement | null>>;
  isOpen: Ref<boolean>;
  /** 自定义首个焦点元素；默认取面板内第一个可聚焦元素。 */
  getInitialFocus?: (root: HTMLElement) => HTMLElement | null;
};

/**
 * 浮层焦点管理：
 * - 打开后把焦点移入面板（Teleport 到 body 时 Tab 顺序才能到达）；
 * - 关闭时等退场动画结束再归还触发器，避免同一按键的 keyup 重新打开。
 */
export const useDropdownFocus = ({
  triggerRef,
  floatingRef,
  isOpen,
  getInitialFocus,
}: UseDropdownFocusOptions) => {
  let restoreAfterLeave = false;

  const focusInitial = () => {
    nextTick(() => {
      if (!isOpen.value) return;
      const root = floatingRef.value;
      if (!root) return;
      const target = getInitialFocus
        ? getInitialFocus(root)
        : root.querySelector<HTMLElement>(DEFAULT_FOCUS_SELECTOR);
      target?.focus();
    });
  };

  const closeWithFocus = () => {
    restoreAfterLeave = true;
    isOpen.value = false;
  };

  const closeWithoutFocus = () => {
    restoreAfterLeave = false;
    isOpen.value = false;
  };

  const resetRestoreFocus = () => {
    restoreAfterLeave = false;
  };

  const handleAfterLeave = () => {
    if (!restoreAfterLeave) return;
    restoreAfterLeave = false;
    triggerRef.value?.focus();
  };

  return {
    focusInitial,
    closeWithFocus,
    closeWithoutFocus,
    resetRestoreFocus,
    handleAfterLeave,
  };
};
