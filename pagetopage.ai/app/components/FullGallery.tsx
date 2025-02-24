import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Image as RNImage } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMNS = 3;
const THUMBNAIL_SPACING = 10;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (THUMBNAIL_SPACING * 2);
const THUMBNAIL_SIZE = (AVAILABLE_WIDTH - (THUMBNAIL_SPACING * (COLUMNS - 1))) / COLUMNS;

interface FullGalleryProps {
  albumId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function FullGallery({ albumId, visible, onClose }: FullGalleryProps) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      loadPhotos();
    } else {
      translateY.value = SCREEN_HEIGHT;
      opacity.value = 0;
    }
  }, [visible]);

  const loadPhotos = async () => {
    if (!albumId) return;
    
    try {
      const { assets: mediaAssets } = await MediaLibrary.getAssetsAsync({
        album: albumId,
        sortBy: ['creationTime'],
        mediaType: ['photo'],
      });
      setAssets(mediaAssets); // Most recent first
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isAtTop && event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = Math.max(0, 1 - (event.translationY / (SCREEN_HEIGHT * 0.2)));
      }
    })
    .onEnd((event) => {
      if (isAtTop && event.translationY > SCREEN_HEIGHT * 0.2) {
        translateY.value = withSpring(SCREEN_HEIGHT);
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const composed = Gesture.Simultaneous(panGesture, Gesture.Native());

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const rBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${opacity.value * 0.5})`,
  }));

  const onScroll = useCallback(({ nativeEvent }: { nativeEvent: any }) => {
    setIsAtTop(nativeEvent.contentOffset.y <= 0);
  }, []);

  const renderThumbnail = useCallback(({ item }: { item: MediaLibrary.Asset }) => (
    <View style={styles.thumbnailContainer}>
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={200}
        placeholder={{ color: '#E1E1E1' }}
        cachePolicy="memory-disk"
      />
    </View>
  ), []);

  const getItemLayout = useCallback(
    (data: ArrayLike<MediaLibrary.Asset> | null | undefined, index: number) => ({
      length: THUMBNAIL_SIZE + THUMBNAIL_SPACING,
      offset: (THUMBNAIL_SIZE + THUMBNAIL_SPACING) * Math.floor(index / COLUMNS),
      index,
    }),
    []
  );

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, rBackgroundStyle]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.galleryContainer, rStyle]}>
          <View style={styles.pullIndicator} />
          <FlatList
            data={assets}
            renderItem={renderThumbnail}
            keyExtractor={item => item.id}
            numColumns={COLUMNS}
            windowSize={5}
            maxToRenderPerBatch={15}
            initialNumToRender={12}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  galleryContainer: {
    backgroundColor: 'white',
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    overflow: 'hidden',
  },
  pullIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#DDDDDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  gridContainer: {
    paddingHorizontal: THUMBNAIL_SPACING,
    paddingVertical: THUMBNAIL_SPACING,
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginRight: THUMBNAIL_SPACING,
    marginBottom: THUMBNAIL_SPACING,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E1E1E1',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
}); 