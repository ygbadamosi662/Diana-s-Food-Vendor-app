import { StyleSheet, Text, View, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { adjustColorBrightness } from './tools/theme';
import Ionicons from "@expo/vector-icons/Ionicons";
import Home from './screens/pre_login/Home';
import { AboutStack } from './stacks/hold_stack';
// import { getFCMToken } from './services/push_notification_service';

const Tab = createBottomTabNavigator();

export default function App() {
  // getFCMToken().then(token => {
  //   console.log("FCM Token: ", token);
  // });
  // messaging().onNotificationOpenedApp(remoteMessage => {
  //   console.log('Notification opened by user: ', remoteMessage);
  //   // Handle navigation or other actions based on the remoteMessage
  // });
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          //   tabBarShowLabel: false,
          tabBarLabelPosition: "below-icon",
          tabBarActiveTintColor: "purple",
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={Home} 
          options={{
            // tabBarLabel: "My Profile",
            tabBarIcon: () => <Ionicons name={"person"} size={20} />,
            tabBarBadge: 3,
            headerShown: false
          }}
        />
        <Tab.Screen name="Nested" component={AboutStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adjustColorBrightness('rgb(237,61,83)', 0.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  Text: {
    color: adjustColorBrightness('rgb(255,255,255)', 0.5),
  }
});
