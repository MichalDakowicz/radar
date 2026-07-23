import { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { cssInterop, useColorScheme } from 'nativewind';
import { forwardRef, useCallback, type ReactNode } from 'react';

// gorhom's keyboard-aware TextInput isn't a nativewind-registered component, so
// `className` is a no-op on it until we map className -> style.
cssInterop(BottomSheetTextInput, { className: 'style' });

export { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';

// Shared bottom-sheet primitive (doc 12 part 2) - the filter sheet and the
// Quick-Add / status pickers all render through this instead of a bespoke Modal.
type SheetProps = {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  onChange?: (index: number) => void;
};

export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(
  { children, snapPoints = ['50%'], onDismiss, onChange },
  ref,
) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />,
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={onDismiss}
      onChange={onChange}
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
