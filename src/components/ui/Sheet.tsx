import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput as GorhomBottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { cssInterop, useColorScheme } from 'nativewind';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, type ScrollViewProps, TextInput, useWindowDimensions, View } from 'react-native';

import { isWeb, useIsDesktop } from '@/hooks/useResponsive';

export { BottomSheetModal } from '@gorhom/bottom-sheet';

/**
 * Sheet-aware text input. Every input rendered inside a Sheet must come from
 * here rather than straight from gorhom.
 *
 * gorhom's version exists to keep the soft keyboard from covering the sheet: it
 * tracks focus by calling `TextInput.State.currentlyFocusedInput()` on blur - an
 * API react-native-web does not implement, so on web every blur inside a sheet
 * throws `RNTextInput.default.State.currentlyFocusedInput is not a function`.
 * A browser has no soft keyboard to avoid, so plain RN TextInput is both safe
 * and behaviourally equivalent there.
 */
export const BottomSheetTextInput = (isWeb ? TextInput : GorhomBottomSheetTextInput) as unknown as typeof TextInput;

// gorhom's input isn't a nativewind-registered component, so `className` is a
// no-op on it until we map className -> style. RN's own TextInput (the web
// branch above) is registered by nativewind already.
if (!isWeb) cssInterop(GorhomBottomSheetTextInput, { className: 'style' });

/**
 * Scrollable body for sheet content. gorhom's scrollables read the sheet's
 * internal context to hand the pan gesture back to the sheet at scroll top, so
 * they *throw* outside one - which is exactly what the desktop dialog below is.
 * Switching on the same `useIsDesktop()` the Sheet itself branches on keeps the
 * two in lockstep.
 */
export function SheetScrollView({ children, ...props }: ScrollViewProps & { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (isDesktop) return <ScrollView {...props}>{children}</ScrollView>;
  return <BottomSheetScrollView {...props}>{children}</BottomSheetScrollView>;
}

type SheetProps = {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  /** Desktop dialog width cap. Wider for sheets that hold a grid of results. */
  maxWidth?: number;
};

const DESKTOP_MAX_WIDTH = 560;
const DESKTOP_MIN_HEIGHT = 280;
const DESKTOP_MAX_HEIGHT_RATIO = 0.9;

/**
 * Shared sheet primitive (doc 12 part 2) - the filter sheet and the Quick-Add /
 * status pickers all render through this instead of a bespoke Modal.
 *
 * Two implementations behind one API: a bottom sheet you drag on phones, and a
 * centred modal dialog on desktop web. A sheet that slides up from the bottom
 * edge of a 27" monitor is a phone gesture pretending to work with a mouse -
 * desktop gets a real dialog with a backdrop click, an X, and Escape.
 */
export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(props, ref) {
  // Crossing the desktop breakpoint swaps implementations, which remounts the
  // sheet closed. That only happens while resizing the window past 1024px, where
  // the whole layout is changing anyway.
  const isDesktop = useIsDesktop();
  if (isDesktop) return <SheetDialog {...props} ref={ref} />;
  return <BottomSheet {...props} ref={ref} />;
});

const BottomSheet = forwardRef<BottomSheetModal, SheetProps>(function BottomSheet(
  { children, snapPoints = ['50%'], onDismiss, onChange },
  ref,
) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const innerRef = useRef<BottomSheetModal | null>(null);
  const [open, setOpen] = useState(false);

  // Keep our own handle alongside the caller's so Escape can dismiss.
  const setRefs = useCallback(
    (instance: BottomSheetModal | null) => {
      innerRef.current = instance;
      if (typeof ref === 'function') ref(instance);
      else if (ref) ref.current = instance;
    },
    [ref],
  );

  const handleChange = useCallback(
    (index: number) => {
      setOpen(index >= 0);
      onChange?.(index);
    },
    [onChange],
  );

  // Mobile *web* still lands here (narrow viewport, no desktop dialog), and a
  // browser has an Escape key even without a mouse.
  useEffect(() => {
    if (!isWeb || !open || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') innerRef.current?.dismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={setRefs}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={onDismiss}
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#404040' : '#d4d4d4' }}
      // Keyboard handling: without these the soft keyboard covers the sheet
      // content (search results, inputs). `extend` snaps to the top snap point
      // when the keyboard opens (reliable on Android, where `interactive` is
      // flaky); `adjustResize` makes Android resize instead of pan-only.
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});

/**
 * The tallest snap point, resolved to pixels. Sheet content is written against a
 * definite height (`flex-1` bodies, internal lists), so the dialog needs one
 * too - and the tallest point is the right pick when there's no drag handle to
 * expand with.
 */
function dialogHeight(snapPoints: (string | number)[], windowHeight: number): number {
  const resolved = snapPoints
    .map((point) => (typeof point === 'number' ? point : (parseFloat(point) / 100) * windowHeight))
    .filter((value) => Number.isFinite(value) && value > 0);
  const tallest = resolved.length ? Math.max(...resolved) : windowHeight * 0.5;
  return Math.min(Math.max(tallest, DESKTOP_MIN_HEIGHT), windowHeight * DESKTOP_MAX_HEIGHT_RATIO);
}

const SheetDialog = forwardRef<BottomSheetModal, SheetProps>(function SheetDialog(
  { children, snapPoints = ['50%'], onDismiss, onChange, maxWidth = DESKTOP_MAX_WIDTH },
  ref,
) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';
  const { height: windowHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  // Mirrors `visible` for the guards below, so a stray dismiss() on an already
  // closed dialog can't fire onDismiss a second time.
  const openRef = useRef(false);

  const present = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    setVisible(true);
    onChange?.(0);
  }, [onChange]);

  const dismiss = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setVisible(false);
    onChange?.(-1);
    onDismiss?.();
  }, [onChange, onDismiss]);

  useImperativeHandle(
    ref,
    () =>
      // Only present/dismiss/snapToIndex are actually called by consumers; the
      // rest of BottomSheetModal's imperative surface is stubbed so the shared
      // ref type still fits. snapToIndex is a no-op because the dialog is
      // already at its tallest snap point.
      ({
        present,
        dismiss,
        close: dismiss,
        forceClose: dismiss,
        collapse: () => {},
        expand: () => {},
        snapToIndex: () => {},
        snapToPosition: () => {},
      }) as unknown as BottomSheetModal,
    [present, dismiss],
  );

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, dismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 items-center justify-center p-6">
        {/* Backdrop is a sibling *behind* the card, not its parent: on web a
            click inside the card would otherwise bubble up and close it. */}
        <Pressable
          onPress={dismiss}
          accessibilityLabel="Close dialog"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
        />
        <View
          className="overflow-hidden rounded-2xl border border-border"
          style={{ width: '100%', maxWidth, height: dialogHeight(snapPoints, windowHeight), backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}
        >
          <View className="flex-1">{children}</View>
          <Pressable
            onPress={dismiss}
            accessibilityLabel="Close"
            className="absolute right-3 top-3 z-10 rounded-full bg-black/45 p-2"
          >
            <X size={16} color={isDark ? '#fafafa' : '#0a0a0a'} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});
