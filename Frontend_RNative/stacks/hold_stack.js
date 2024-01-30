import { Pressable, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/pre_login/Home";

const Stack = createNativeStackNavigator();

export const AboutStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#6a51ae" },
        headerTitleStyle: { fontWeight: "bold" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#e8e4f3" },
        headerRight: () => (
          <Pressable onPress={() => alert("Menu button pressed!")}>
            <Text style={{ color: "#fff", fontSize: 16 }}>Menu</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="Home"
        component={Home}
        options={{
          title: "Welcome Home",
        }}
      />
      <Stack.Screen
        name="About Time"
        component={Home}
        initialParams={{
          name: "Guest",
        }}
      />
    </Stack.Navigator>
  );
};
