import messaging from '@react-native-firebase/messaging';
import { saveItem, getItem } from '../services/local_storage_service';
import { Local_Storage } from '../enum_ish';


export const requestPushNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    await saveItem(Local_Storage.push_permission, authStatus);
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  } catch (error) {
    throw error;
  }
}

// Get the FCM token
export const getFCMToken = async () => {
  try {
    return await messaging().getToken();
  } catch (error) {
    throw error;
  }
};

export const isPushNotificationEnabled = async () => {
  try {
    const authStatus = await getItem(Local_Storage.push_permission);
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    throw error;
  }
}

export const onTapPushNotification = async () => {
  try {
    messaging().onNotificationOpenedApp(remoteMessage => {
      // Access the data sent with the notification
      const data = remoteMessage.data;
      // Navigate to a specific screen based on the notification data
      if (data.screen) {
        // If the notification includes a specific screen to navigate to
        navigation.navigate(data.screen, { params: data.params });
      } else {
        // Default behavior when the notification doesn't specify a screen
        navigation.navigate('DefaultScreen');
      }
    });
  } catch (error) {
    throw error;
  }
}
