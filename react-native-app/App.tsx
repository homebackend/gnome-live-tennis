// App.tsx
import * as React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './src/navigation_types'; // Import main param list
import { MainMenu } from './src/menu';
import { PreferencesScreen } from './src/prefs';
import { CountryPreferencesScreen } from './src/prefs_countries';
import { useColorScheme } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={MainMenu}
          options={{ title: 'Live Tennis' }}
        />
        <Stack.Screen
          name="Settings"
          component={PreferencesScreen}
          options={{ title: `Settings` }}
        />
        <Stack.Screen
          name="CountrySettings"
          component={CountryPreferencesScreen}
          options={{ title: `Country Settings` }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
