import { computed, onBeforeUnmount, shallowRef, watch, type ShallowRef } from 'vue';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { useThemeVariables } from '../../theme/useThemeVariables';
import { getOwnerDocument } from '../../utils';

type ElementRef = Readonly<ShallowRef<HTMLElement | null>>;

export const useFloatingDropdown = (referenceRef: ElementRef, floatingRef: ElementRef) => {
  const isOpen = shallowRef(false);
  let listenerDocument: Document | undefined;

  const { floatingStyles: positionStyles } = useFloating(referenceRef, floatingRef, {
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
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

  return { isOpen, floatingStyles };
};
