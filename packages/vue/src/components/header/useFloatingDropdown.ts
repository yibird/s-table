import { computed, onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { useThemeVariables } from '../../theme/useThemeVariables';
import { getOwnerDocument } from '../../utils';

type ElementRef = Readonly<ShallowRef<HTMLElement | null>>;

export type UseFloatingDropdownOptions = {
  /** 受控打开状态；提供后组件不再维护内部状态。 */
  open?: Readonly<Ref<boolean | undefined>>;
  /** 打开状态变化通知；受控和内部模式都会调用。 */
  onOpenChange?: (open: boolean) => void;
  /** 浮层挂载容器解析器；返回 null 时回退到 body。 */
  getContainer?: () => HTMLElement | null;
};

export const useFloatingDropdown = (
  referenceRef: ElementRef,
  floatingRef: ElementRef,
  options: UseFloatingDropdownOptions = {}
) => {
  const internalOpen = shallowRef(false);
  const isOpen = computed<boolean>({
    get: () => options.open?.value ?? internalOpen.value,
    set: (value) => {
      // `open` ref 存在但值为 undefined 表示调用方未启用受控模式。
      if (options.open && options.open.value !== undefined) {
        options.onOpenChange?.(value);
        return;
      }
      if (internalOpen.value === value) return;
      internalOpen.value = value;
      options.onOpenChange?.(value);
    },
  });
  let listenerDocument: Document | undefined;

  const teleportTarget = computed<HTMLElement | null>(() => {
    const reference = referenceRef.value;
    if (!reference) return null;
    const container = options.getContainer?.();
    if (container?.isConnected) return container;
    return reference.ownerDocument.body;
  });

  const { floatingStyles: positionStyles, placement } = useFloating(referenceRef, floatingRef, {
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    // 使用 top/left 定位，把 transform 留给 Vue 过渡（slide/scale），避免内联
    // transform 覆盖过渡类中的位移与缩放。
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });
  const { themeVariables } = useThemeVariables(referenceRef, isOpen);
  const floatingStyles = computed(() => ({
    ...positionStyles.value,
    ...themeVariables.value,
  }));

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (target && (referenceRef.value?.contains(target) || floatingRef.value?.contains(target))) {
      return;
    }
    isOpen.value = false;
  };

  const removeOutsideListener = () => {
    listenerDocument?.removeEventListener('mousedown', handleClickOutside, true);
    listenerDocument = undefined;
  };

  watch(
    [isOpen, referenceRef],
    ([open, reference]) => {
      // Do not attach a global listener until the trigger has been mounted. The
      // SSR-safe fallback in getOwnerDocument is intentionally not used for a
      // missing reference, otherwise an unmounted dropdown would listen to the
      // global document unnecessarily.
      const ownerDocument = open && reference ? getOwnerDocument(reference) : undefined;
      if (ownerDocument === listenerDocument) return;
      removeOutsideListener();
      if (!ownerDocument) return;
      listenerDocument = ownerDocument;
      listenerDocument.addEventListener('mousedown', handleClickOutside, true);
    },
    { immediate: true }
  );

  onBeforeUnmount(removeOutsideListener);

  return { isOpen, floatingStyles, placement, teleportTarget };
};
