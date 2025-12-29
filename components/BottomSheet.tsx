import { useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useEffect } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoint?: number; // Height of the sheet when open
  onClose?: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ children, snapPoint = 300, onClose }, ref) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const active = useSharedValue(false);
    const backdropOpacity = useSharedValue(0);

    const open = useCallback(() => {
      active.value = true;
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT - snapPoint, {
        damping: 50,
        stiffness: 400,
      });
    }, [snapPoint]);

    const close = useCallback(() => {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(
        SCREEN_HEIGHT,
        { damping: 50, stiffness: 400 },
        () => {
          active.value = false;
          if (onClose) {
            runOnJS(onClose)();
          }
        }
      );
    }, [onClose]);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    // Handle Android back button
    useEffect(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (active.value) {
            close();
            return true;
          }
          return false;
        }
      );
      return () => subscription.remove();
    }, [close]);

    const gesture = Gesture.Pan()
      .onUpdate((event) => {
        if (event.translationY > 0) {
          translateY.value = SCREEN_HEIGHT - snapPoint + event.translationY;
        }
      })
      .onEnd((event) => {
        if (event.translationY > snapPoint / 3 || event.velocityY > 500) {
          runOnJS(close)();
        } else {
          translateY.value = withSpring(SCREEN_HEIGHT - snapPoint, {
            damping: 50,
            stiffness: 400,
          });
        }
      });

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
      pointerEvents: active.value ? 'auto' : 'none',
    }));

    return (
      <>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableWithoutFeedback onPress={close}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Sheet */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 101,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
});

export default BottomSheet;
