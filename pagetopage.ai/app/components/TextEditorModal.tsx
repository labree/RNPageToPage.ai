import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  Keyboard,
  ScrollView,
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
import * as Clipboard from 'expo-clipboard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TextEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
  responseData: any;
  isSaving?: boolean;
}

export default function TextEditorModal({ 
  visible, 
  onClose, 
  onSave,
  responseData 
}: TextEditorModalProps) {
  const [editableText, setEditableText] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const toastOpacity = useSharedValue(0);

  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Extract and combine text from response data
      if (responseData?.results) {
        const combinedText = responseData.results
          .map((result: any) => result.text)
          .join('\n\n');
        setEditableText(combinedText);
      }
      
      // Animate modal in
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      // Animate modal out
      translateY.value = SCREEN_HEIGHT;
      opacity.value = 0;
    }
  }, [visible, responseData]);

  const animateClose = useCallback(() => {
    console.log('AnimateClose called:', Date.now());
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, { 
      duration: 300 
    }, () => {
      console.log('Animation completed:', Date.now());
      runOnJS(onClose)();
    });
  }, [onClose]);

  const handleSave = useCallback(async () => {
    try {
      const result = await Share.share({
        message: editableText,
        title: 'Share Text',
      });

      if (result.action === Share.sharedAction) {
        showToast();
      }
    } catch (error) {
      console.error('Failed to open share dialog:', error);
    }
  }, [editableText]);

  const handleClose = useCallback(() => {
    animateClose();
  }, [animateClose]);

  const showToast = useCallback(() => {
    toastOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 500 })
    );
  }, []);

  const handleCopy = useCallback(async () => {
    await Clipboard.setString(editableText);
    showToast();
  }, [editableText]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

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
        <Animated.View style={[styles.toast, toastStyle]}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.toastText}>Successfully copied to clipboard</Text>
        </Animated.View>

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleClose}
          >
            <Text style={styles.headerButtonText}>Retake</Text>
          </TouchableOpacity>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleCopy}
            >
              <MaterialIcons name="content-copy" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleSave}
            >
              <Text style={styles.headerButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => Keyboard.dismiss()}
            >
              <MaterialIcons name="keyboard-hide" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            multiline
            value={editableText}
            onChangeText={setEditableText}
            autoCorrect={false}
            scrollEnabled={false}
            showSoftInputOnFocus={true}
          />
          <View style={styles.scrollPadding} />
        </ScrollView>
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
    marginTop: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: SCREEN_HEIGHT * 0.7,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollPadding: {
    height: 350,
  },
  toast: {
    position: 'absolute',
    top: 60,
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
}); 