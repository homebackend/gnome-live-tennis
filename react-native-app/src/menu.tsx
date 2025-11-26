import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, NativeEventEmitter, NativeModules, StyleSheet, View } from "react-native";

import { HomeNavigationProps } from "./types";
import { RNRunner } from "./runner";
import { RNPopupSubMenuItem } from "./menuitem";
import { ApiHandlers, LiveViewUpdater } from "../../src/common/live_view_updater";
import { NodeTTFetcher } from "../../src/common/tt_fetcher";
import { RNSettings } from "./settings";
import { AxiosApiHandler } from "../../src/common/app/api";
import { RNLiveViewManager } from "./live_view_manager";
import { useTheme } from "./style";
import { TennisMatch } from "../../src/common/types";
import { RNRenderer } from "./renderer";
import { RNLiveViewRenderer } from "./live_view_renderer";

const { PipModule } = NativeModules;
const pipEventEmitter = new NativeEventEmitter(PipModule);

export const MainMenu = ({ navigation }: HomeNavigationProps) => {

  const [isInPipMode, setIsInPipMode] = useState(false);
  const [isLiveViewAvailable, setLiveViewAvailable] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<TennisMatch | undefined>(undefined);
  const [debug, setDebug] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [runner, setRunner] = useState<RNRunner | null>(null);
  const [refreshTimeText, setRefreshTimeText] = useState('Never'); // Will update after each fetch
  const [expandedEvent, setExpandEvent] = useState<RNPopupSubMenuItem | null>(null); // Will update after clicking event menu
  const theme = useTheme();

  const log = useCallback((logs: string[]) => {
    if (debug) {
      console.log("[Live Tennis]", logs.join(", "));
    }
  }, [debug]);

  useEffect(() => {
    const initializeApp = async () => {
      log(['Intialize App']);
      let updater: LiveViewUpdater<NodeTTFetcher> | undefined;
      const settings = new RNSettings();
      await settings.initialize();
      setDebug(await settings.getBoolean('enable-debug-logging'));

      const pipSubscription = pipEventEmitter.addListener('onPipModeChanged', (event) => {
        setIsInPipMode(event);
      });

      const newRunner = new RNRunner(log, settings, theme, setRefreshTimeText, setExpandEvent, () => navigation.navigate('Settings', { settings: settings }), () => {
        if (updater) {
          updater.fetchMatchData();
        }
      });
      await newRunner.setupBaseMenu();
      setRunner(newRunner);
      const apiHandlers: ApiHandlers = {
        atp: new AxiosApiHandler(log),
        wta: new AxiosApiHandler(log),
        tt: new AxiosApiHandler(log),
      };
      const manager = new RNLiveViewManager(log, isInPipMode, setCurrentMatch, setLiveViewAvailable);
      updater = new LiveViewUpdater(newRunner, manager, apiHandlers, settings, log, NodeTTFetcher);
      await updater.fetchMatchData();

      setIsReady(true);

      log(['Intialize App finished']);
      return () => {
        manager.unsetFetchTimer();
        manager.destroyCycleTimeout();
        // LiveScoreService.unsubscribeFromScore(); 
        pipSubscription.remove();
      };
    };

    initializeApp();
  }, [isInPipMode, log, navigation, theme]);

  if (!isReady || !runner || (isInPipMode && !currentMatch)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (isInPipMode && currentMatch) {
    log(['Detected to be in PiP mode'])
    const renderer = new RNRenderer('.', log, theme);
    return new RNLiveViewRenderer('.', log, renderer).renderWindowUI(currentMatch);
  } else {
    return runner.renderMainUI(refreshTimeText, isLiveViewAvailable, expandedEvent);
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
