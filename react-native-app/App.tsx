import { RNSettings } from './src/settings';
import { RNRunner } from './src/runner';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { RNPopupSubMenuItem } from './src/menuitem';
import { ApiHandlers, LiveViewUpdater } from '../src/common/live_view_updater';
import { AxiosApiHandler } from '../src/common/app/api';
import { RNLiveViewManager } from './src/live_view_manager';
import { NodeTTFetcher } from '../src/common/tt_fetcher';

const App = () => {
  const [debug, setDebug] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [runner, setRunner] = useState<RNRunner | null>(null);
  const [refreshTimeText, setRefreshTimeText] = useState('Never'); // Will update after each fetch
  const [expandedEvent, setExpandEvent] = useState<RNPopupSubMenuItem | null>(null); // Will update after clicking event menu

  const log = useCallback((logs: string[]) => {
    if (debug) {
      console.log("[Live Tennis]", logs.join(", "));
    }

  }, [debug]);

  useEffect(() => {
    const initializeApp = async () => {
      const settings = new RNSettings();
      await settings.initialize();
      setDebug(await settings.getBoolean('enable-debug-logging'));

      const newRunner = new RNRunner(log, settings, setRefreshTimeText, setExpandEvent);
      await newRunner.setupBaseMenu();
      setRunner(newRunner);
      const apiHandlers: ApiHandlers = {
        atp: new AxiosApiHandler(log),
        wta: new AxiosApiHandler(log),
        tt: new AxiosApiHandler(log),
      };
      const manager = new RNLiveViewManager(settings);
      const updater = new LiveViewUpdater(newRunner, manager, apiHandlers, settings, log, NodeTTFetcher);
      await updater.fetchMatchData();

      setIsReady(true);
    };

    initializeApp();
  }, [log]);

  if (!isReady || !runner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return runner.renderMainUI(refreshTimeText, expandedEvent);
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
