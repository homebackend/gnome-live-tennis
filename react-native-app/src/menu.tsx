import { useCallback, useEffect, useReducer, useState } from "react";
import React from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

import { HomeNavigationProps } from "./navigation_types";
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
import { LRUCache } from "../../src/common/util";

const ImageDimensionCache: LRUCache<string, { width: number, height: number }> = new LRUCache(100)

export const MainMenu = ({ navigation }: HomeNavigationProps) => {

  const [currentMatch, setCurrentMatch] = useState<TennisMatch | undefined>(undefined);
  const [debug, setDebug] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [runner, setRunner] = useState<RNRunner | null>(null);
  const [liveViewRenderer, setLiveViewRenderer] = useState<RNLiveViewRenderer | null>(null);
  const [refreshTimeText, setRefreshTimeText] = useState('Never'); // Will update after each fetch
  const [expandedEvent, setExpandEvent] = useState<RNPopupSubMenuItem | null>(null); // Will update after clicking event menu
  const theme = useTheme();
  const [imagesToFetch, setImagesToFetch] = useState<string[]>([]);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const log = useCallback((logs: string[]) => {
    if (debug) {
      console.log("[Live Tennis]", logs.join(", "));
    }
  }, [debug]);

  const addToImageFetchQueue = useCallback((uri?: string) => {
    if (!uri || ImageDimensionCache.get(uri)) {
      return;
    }

    setImagesToFetch(prevQueue => {
      if (prevQueue.includes(uri)) {
        return prevQueue;
      }
      return [...prevQueue, uri]
    });
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      let updater: LiveViewUpdater<NodeTTFetcher> | undefined;
      const settings = new RNSettings();
      await settings.initialize();
      setDebug(await settings.getBoolean('enable-debug-logging'));

      const renderer = new RNRenderer(log, theme, ImageDimensionCache);
      const newRunner = new RNRunner(log, settings, theme, renderer,
        setRefreshTimeText, setExpandEvent, addToImageFetchQueue,
        () => navigation.navigate('Settings', { settings: settings }), () => {
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
      const manager = new RNLiveViewManager(log, setCurrentMatch);
      updater = new LiveViewUpdater(newRunner, manager, apiHandlers, settings, log, NodeTTFetcher);
      setLiveViewRenderer(new RNLiveViewRenderer('', log, renderer));
      await updater.fetchMatchData();

      setIsReady(true);

      return () => {
        manager.unsetFetchTimer();
        manager.destroyCycleTimeout();
      };
    };

    initializeApp();
  }, [addToImageFetchQueue, log, navigation, theme]);

  useEffect(() => {
    const fetchImageDimensions = async (uris: string[]) => {
      await Promise.all(uris.map(async uri => {
        if (ImageDimensionCache.get(uri)) {
          return;
        }

        let width = 0;
        let height = 0;

        if (uri.endsWith('.svg')) {
          const response = await fetch(uri);
          const svgText = await response.text();

          const widthMatch = svgText.match(/width="(\d+(\.\d+)?)"/);
          const heightMatch = svgText.match(/height="(\d+(\.\d+)?)"/);
          const viewBoxMatch = svgText.match(/viewBox="0 0 (\d+(\.\d+)?) (\d+(\.\d+)?)"/);

          if (widthMatch && heightMatch) {
            width = parseFloat(widthMatch[1]);
            height = parseFloat(heightMatch[1]);
          } else if (viewBoxMatch) {
            width = parseFloat(viewBoxMatch[1]);
            height = parseFloat(viewBoxMatch[3]);
          }

          if (width <= 0 || height <= 0) {
            console.error("Failed to get svg image size");
          }
        } else {
          try {
            const size = await Image.getSize(uri);
            width = size.width;
            height = size.height;
          } catch (err) {
            console.error("Failed to get image size", err);
          }
        };

        ImageDimensionCache.put(uri, { width: width, height: height });
      }));

      setImagesToFetch([]);
      forceUpdate();
    };

    if (imagesToFetch.length > 0) {
      fetchImageDimensions(imagesToFetch);
    }
  }, [imagesToFetch]);

  if (!isReady || !runner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const menuView = runner.renderMainUI(refreshTimeText, expandedEvent);
  let separator;
  let liveView;
  if (currentMatch && liveViewRenderer) {
    separator = React.createElement(View, { style: { width: '100%', height: 4, backgroundColor: '#000000' } });
    liveView = liveViewRenderer.renderWindowUI(currentMatch, theme);
  }
  return React.createElement(View, { style: { width: '100%', height: '100%' } }, menuView, separator, liveView);
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
