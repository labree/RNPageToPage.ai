import { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Dimensions, 
  TouchableOpacity, 
  FlatList,
  ListRenderItem 
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  runOnJS,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoGalleryProps {
  images: { uri: string }[];
  onClose: () => void;
  onConfirm: (images: { uri: string }[]) => void;
  visible: boolean;
}

export default function PhotoGallery({ 
  images, 
  onClose, 
  onConfirm, 
  visible 
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(1, { duration: 300 });
      }, 50);
    }
  }, [visible]);

  const animateClose = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, { 
      duration: 300 
    }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const handleClose = useCallback(() => {
    animateClose();
  }, [animateClose]);

  const handleConfirm = useCallback(() => {
    animateClose();
    onConfirm(images);
  }, [images, onConfirm, animateClose]);

  const renderItem: ListRenderItem<{ uri: string }> = useCallback(({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image
        style={styles.image}
        source={{ uri: item.uri }}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
      />
    </View>
  ), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const rBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${opacity.value * 0.5})`,
  }));

  const rModalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, rBackgroundStyle]}>
      <Animated.View style={[styles.modalContent, rModalStyle]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentIndex + 1} of {images.length}
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleConfirm}>
            <Text style={[styles.headerButtonText, styles.confirmButton]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    height: SCREEN_HEIGHT * 0.95,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
  },
  confirmButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.9 - 60, // Subtract header height
    backgroundColor: 'white',
  },
  image: {
    flex: 1,
  },
}); 