import * as Linking from 'expo-linking';
import { Share } from 'react-native';

/** Deep link that opens the app on the join screen with the code filled in. */
export const inviteLink = (code: string) => Linking.createURL(`join/${code}`);

export const shareText = async (message: string) => {
  await Share.share({ message });
};
