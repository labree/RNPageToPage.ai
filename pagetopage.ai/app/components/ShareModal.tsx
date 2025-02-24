import { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  text: string;
}

export default function ShareModal({ visible, onClose, text }: ShareModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const toastOpacity = useSharedValue(0);

  // Animation effects
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = SCREEN_HEIGHT;
      opacity.value = 0;
    }
  }, [visible]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 500 })
    );
  }, []);

  const handleShareToNotion = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      //const response = await fetch('http://192.168.1.179:8080/notion-upload', {
      const response = await fetch('https://backend-830284147363.us-east1.run.app/notion-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to share to Notion');
      }

      showToast('Successfully shared to Notion');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSystemShare = async () => {
    try {
      const result = await Share.share({
        message: text,
        title: 'Share Text',
      });

      if (result.action === Share.sharedAction) {
        showToast('Successfully shared via system');
        return;
      }
    } catch (error) {
      setError('Failed to open share dialog');
    }
  };

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

  const rBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${opacity.value * 0.5})`,
  }));

  const rModalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, rBackgroundStyle]}>
      <Animated.View style={[styles.modalContent, rModalStyle]}>
        <Animated.View style={[styles.toast, toastStyle]}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>

        <View style={styles.header}>
          <Text style={styles.title}>Share to</Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareToNotion}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="description" size={24} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share to Notion</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, styles.systemShareButton]}
            onPress={handleSystemShare}
          >
            <MaterialIcons name="share" size={24} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share via System</Text>
          </TouchableOpacity>
        </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: SCREEN_HEIGHT * 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: 8,
  },
  systemShareButton: {
    backgroundColor: '#34C759',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 15,
  },
  toast: {
    position: 'absolute',
    top: -60,
    left: '50%',
    transform: [
      { translateX: -130 },
      { translateY: 0 }
    ],
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 300,
    zIndex: 1000,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  toastText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
}); 