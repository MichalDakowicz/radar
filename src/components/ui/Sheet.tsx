import { BottomSheetBackdrop, type BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { forwardRef, useCallback, type ReactNode } from 'react';

export { BottomSheetModal } from '@gorhom/bottom-sheet';

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
      onDismiss={onDismiss}
      onChange={onChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#404040' : '#d4d4d4' }}
    >
      <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
