import { useCallback, useState, useRef, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { CameraView, CameraType, FlashMode, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImageManipulator from 'expo-image-manipulator';
import TextEditorModal from './components/TextEditorModal';
import LoginModal from './components/LoginModal';
// Keep SignUpModal import commented out
// import SignUpModal from './components/SignUpModal';

interface SignUpData {
  name?: string;
  username: string;
  email?: string;
  password: string;
}

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [albumId, setAlbumId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [responseData, setResponseData] = useState<{ results: { text: string }[] } | null>(null);
  const [selectedImages, setSelectedImages] = useState<{ uri: string }[]>([]);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Keep SignUp state commented out
  // const [showSignUp, setShowSignUp] = useState(false);

  // Initialize album on component mount
  useEffect(() => {
    const initializeAlbum = async () => {
      try {
        if (!mediaPermission?.granted) {
          const permission = await requestMediaPermission();
          if (!permission.granted) return;
        }

        let album = await MediaLibrary.getAlbumAsync('PageToPage.AI');
        
        if (!album) {
          const tempAsset = await MediaLibrary.createAssetAsync(
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
          );
          album = await MediaLibrary.createAlbumAsync('PageToPage.AI', tempAsset);
          await MediaLibrary.deleteAssetsAsync([tempAsset]);
        }
        
        if (album) {
          setAlbumId(album.id);
        }
      } catch (error) {
        console.error('Album initialization error:', error);
      }
    };

    initializeAlbum();
  }, [mediaPermission, requestMediaPermission]);

  const convertHEICToPNG = async (uri: string) => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [], // no transformations needed, just format conversion
        { format: ImageManipulator.SaveFormat.PNG }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error converting HEIC to PNG:', error);
      throw error;
    }
  };

  const openImagePicker = useCallback(async () => {
    console.log('Gallery button pressed');  // Debug log
    //if (!isAuthenticated) {
      //console.log('User not authenticated, showing login modal');  // Debug log
      //setShowLoginModal(true);
      //return;
    //}

    //console.log('User is authenticated, opening image picker');  // Debug log
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
        orderedSelection: true,
        allowsMultipleSelection: true,
      });
      console.log('Image picker result:', result.canceled ? 'canceled' : 'selected');  // Debug log
      setIsAuthenticated(false);

      if (!result.canceled) {
        // Process images and send directly to backend
        const processedImages = await Promise.all(
          result.assets.map(async (asset) => ({
            uri: asset.uri.toLowerCase().endsWith('.heic')
              ? await convertHEICToPNG(asset.uri)
              : asset.uri
          }))
        );

        // Create form data and send to backend immediately
        const formData = new FormData();
        
        processedImages.forEach((image, index) => {
          formData.append('images', {
            uri: image.uri,
            name: `photo${index + 1}.png`,
            type: 'image/png'
          } as any);
        });

        try {
          console.log('Attempting upload to:', 'https://backend-830284147363.us-east1.run.app/process-document');
          const response = await fetch('https://backend-830284147363.us-east1.run.app/process-document', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          console.log('Response status:', response.status);
          const responseText = await response.text();
          console.log('Response body:', responseText);

          const data = {
            results: [{
              text: JSON.parse(responseText)["results"][0]["text"]
            }]
          };
          setResponseData(data);
          setIsEditorVisible(true);
        } catch (error) {
          console.error('Full error details:', error);
          console.error('Error name:', (error as Error).name);
          console.error('Error message:', (error as Error).message);
          if ((error as any).response) {
            console.error('Error response:', await (error as any).response.text());
          }
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
    }
  }, [isAuthenticated]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    console.log('Login attempt with email:', email);  // Debug log
    // For now, just simulate a successful login
    setIsAuthenticated(true);
    console.log('Authentication successful');  // Debug log
    setShowLoginModal(false);
    console.log('Login modal closed');  // Debug log
    // After successful login, automatically open image picker
    //setIsAuthenticated(false);
    openImagePicker();
  }, [openImagePicker]);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => current === "back" ? "front" : "back");
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash(current => {
      switch (current) {
        case "off": return "on";
        case "on": return "auto";
        default: return "off";
      }
    });
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
      });

      // Request media library permission if not granted
      if (!mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) return;
      }

      // Save photo to media library
      const asset = await MediaLibrary.createAssetAsync(photo.uri);
      
      // Add to custom album if we have an albumId
      if (albumId) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], albumId, false);
      } else {
        // Fallback to just saving to camera roll
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
    }
  }, [flash, mediaPermission, requestMediaPermission, albumId]);

  const getFlashIcon = useCallback(() => {
    switch (flash) {
      case "on":
        return "flash-on";
      case "auto":
        return "flash-auto";
      default:
        return "flash-off";
    }
  }, [flash]);

  const handleSaveText = useCallback(async (text: string): Promise<void> => {
    console.log('Edited text:', text);
  }, []);

  // Keep handleSignUp commented out
  // const handleSignUp = useCallback((data: SignUpData) => {
  //   console.log('Sign up data:', data);
  //   // Here you would typically handle the sign up process
  // }, []);

  // Handle loading state
  if (!permission) {
    return null;
  }

  // Handle permission denied state - making this minimal as well
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={requestPermission}
        >
          <MaterialIcons name="camera" size={32} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  // Main camera view
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
        >
          <View style={styles.overlay}>
            <View style={styles.topButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
                <MaterialIcons name={getFlashIcon()} size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton}>
                <MaterialIcons name="send" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={openImagePicker}
              >
                <MaterialIcons name="photo-library" size={32} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={takePhoto}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={toggleCameraFacing}
              >
                <MaterialIcons name="flip-camera-ios" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
      
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        // Keep onSignUpPress commented out
        // onSignUpPress={() => setShowSignUp(true)}
      />
      
      {/* Keep SignUpModal commented out */}
      {/* <SignUpModal
        visible={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSignUp={handleSignUp}
      /> */}

      <TextEditorModal
        visible={isEditorVisible}
        onClose={() => setIsEditorVisible(false)}
        onSave={handleSaveText}
        responseData={responseData}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingTop: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
  },
  permissionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtons: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
});
