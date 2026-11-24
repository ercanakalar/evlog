import { useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

/**
 * Whether the camera may be used, and how to ask for it. Once the user has
 * refused for good the system stops showing its question, so asking then
 * opens the app's settings, and access given there counts on the way back.
 */
export function useCameraAccess() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  const request = async () => {
    const couldAsk = permission?.canAskAgain !== false;
    // Always ask: "cannot ask again" is remembered and can be out of date.
    const answer = await requestPermission();
    // A refusal just given is respected; one given earlier left no question to answer.
    if (!answer.granted && !couldAsk) await Linking.openSettings();
  };

  return { granted: permission?.granted === true, request: () => void request() };
}
