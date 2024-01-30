import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Handle background messages using setBackgroundMessageHandler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Check if app was launched in the background and conditionally render null if so
function HeadlessRoot() {
  messaging()
    .getIsHeadless()
    .then(isHeadless => {
      if (isHeadless) {
        return null;
      }
      return <App />;
    })
    .catch(error => {
      console.log(error);
    });
}

AppRegistry.registerComponent('app', () => HeadlessRoot);
