/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { RNSettings } from './src/settings';
import { ApiHandlers, LiveViewUpdater } from '../src/common/live_view_updater';
import { AxiosApiHandler } from '../src/common/app/api';
import { NodeTTFetcher } from '../src/common/tt_fetcher';
import { RNLiveViewManager } from './src/live_view_manager';
import { RNRunner } from './src/runner';
import React from 'react';


function AppRunner() {
  const settings = new RNSettings();
  settings.getBoolean('enable-debug-logging').then(debug => {
    const log = (logs: string[]) => {
      settings.getBoolean('enable-debug-logging').then(v => debug = v);

      if (debug) {
        console.log("[Live Tennis]", logs.join(", "));
      }
    }

    addAutostartIfApplicable(log, settings);

    const apiHandlers: ApiHandlers = {
      atp: new AxiosApiHandler(log),
      wta: new AxiosApiHandler(log),
      tt: new AxiosApiHandler(log),
    };
    const runner = new RNRunner(log, settings);
    const manager = new RNLiveViewManager();
    const updater = new LiveViewUpdater(runner, manager, apiHandlers, settings, log, NodeTTFetcher);



    function handleSettingChange(key: string) {
      if (key === 'autostart') {
        return addAutostartIfApplicable(log, settings);
      }

      ['enabled', 'num-windows', 'selected-matches', 'auto-view-new-matches',
        'match-display-duration', 'enable-atp', 'enable-wta', 'enable-atp-challenger',
        'auto-hide-no-live-matches']
        .forEach(k => {
          if (k == key) {
            updater.updateUI();
          }
        });

      ['live-window-size-x', 'live-window-size-y'].forEach(k => {
        if (k == key) {
          manager.destroyLiveView();
          updater.updateUI();
        }
      });
    }

    /*
    ipcMain.handle(MenuRenderKeys.getSettingBoolean, async (_, key: string) => await settings.getBoolean(key));
    ipcMain.on(MenuRenderKeys.setSettingBoolean, async (_, key: string, value: boolean) => {
      await settings.setBoolean(key, value);
      handleSettingChange(key);
    });
    ipcMain.handle(MenuRenderKeys.getSettingInt, async (_, key: string) => await settings.getInt(key));
    ipcMain.on(MenuRenderKeys.setSettingInt, async (_, key: string, value: number) => {
      await settings.setInt(key, value);
      handleSettingChange(key);
    });
    ipcMain.handle(MenuRenderKeys.getSettingStrV, async (_, key: string) => await settings.getStrv(key));
    ipcMain.on(MenuRenderKeys.setSettingStrv, async (_, key: string, value: string[]) => {
      await settings.setStrv(key, value);
      handleSettingChange(key);
    });

    ipcMain.on(MenuRenderKeys.log, (_, logs: string[]) => log(logs));
    ipcMain.handle(MenuRenderKeys.basePath, () => __dirname);
    ipcMain.on(MenuRenderKeys.quit, () => app.quit());
    ipcMain.on(MenuRenderKeys.openSettingsWindow, () => new PrefsManager(__dirname));

    ipcMain.on(MenuRenderKeys.refresh, () => {
      log(['Manual refresh triggered']);
      updater.fetchMatchData();
    });
    */
  });

}

const App = () => {
  let debug = true;
  const settings = new RNSettings();

  settings.getBoolean('enable-debug-logging').then(enabled => { debug = enabled; });
  const log = (logs: string[]) => {
    if (debug) {
      console.log("[Live Tennis]", logs.join(", "));
    }
  }

  const apiHandlers: ApiHandlers = {
    atp: new AxiosApiHandler(log),
    wta: new AxiosApiHandler(log),
    tt: new AxiosApiHandler(log),
  };
  const runner = new RNRunner(log, settings);
  const manager = new RNLiveViewManager();
  const updater = new LiveViewUpdater(runner, manager, apiHandlers, settings, log, NodeTTFetcher);

  return runner.generator;
};


const App2 = () => {
  // Mock function to simulate an API call
  const fetchEvents = async () => {
    console.log("Fetching data...");
    // In a real app, replace this mock with your actual fetch() call
    const mockData = [
      {
        id: 1, name: "Wimbledon Final",
        matches: [
          { id: 101, player1: "Djokovic", player2: "Alcaraz", score: "6-4, 6-4" },
          { id: 102, player1: "Federer", player2: "Nadal", score: "Retired" }
        ]
      },
      {
        id: 2, name: "US Open Semi-Final",
        matches: [
          { id: 201, player1: "Medvedev", player2: "Zverev", score: "In Progress" },
        ]
      }
    ];
    // Use setEvents to update the state with fetched data
    setEvents(mockData);
  };

  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents(); // Fetch immediately on mount
    const intervalId = setInterval(fetchEvents, 15000); // Fetch every 15 seconds
    return () => clearInterval(intervalId); // Cleanup interval
  }, []);

  // Define how to render each item in the FlatList
  const renderItem = ({ item }) => {
    return React.createElement(EventItem, { event: item });
  };

  return React.createElement(
    View,
    { style: styles.container },
    React.createElement(Text, { style: styles.header }, "Tennis Events Live"),
    React.createElement(FlatList, {
      data: events,
      renderItem: renderItem,
      keyExtractor: (item) => item.id.toString(),
      style: styles.list
    })
  );
};

function App1() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
