import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SettingsManager from './settings';
import { Schema, schema, SettingApplicability } from '../../src/common/schema';

type SettingsState = Schema | null;

// --- 1. Define SettingRow component OUTSIDE of SettingsScreen ---

interface SettingRowProps {
  settingKey: keyof Schema;
  currentValue: boolean;
  onValueChange: (key: keyof Schema, value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = React.memo(({ settingKey, currentValue, onValueChange }) => {
  const itemSchema = schema[settingKey];
    
  // Filter settings if not applicable to this environment (assuming Electron/All for this UI)
  if (itemSchema.applicability && itemSchema.applicability !== SettingApplicability.All && itemSchema.applicability !== SettingApplicability.ElectronTrayApp) {
      return null;
  }

  return React.createElement(
    View,
    { style: styles.settingRow },
    React.createElement(View, { style: styles.labelContainer },
      React.createElement(Text, { style: styles.settingTitle }, itemSchema.summary),
      React.createElement(Text, { style: styles.settingDescription }, itemSchema.description)
    ),
    React.createElement(Switch, {
      value: currentValue,
      onValueChange: (newValue) => onValueChange(settingKey, newValue),
    })
  );
});

// --- 2. Main SettingsScreen component ---

const SettingsScreen: React.FC = () => {
  const [appSettings, setAppSettings] = useState<SettingsState>(null);

  useEffect(() => {
    const initSettings = async () => {
      const loadedSettings = await SettingsManager.loadSettings();
      setAppSettings(loadedSettings);
    };
    initSettings();
  }, []);

  // This function is defined once and passed down as a stable callback
  const handleSettingChange = async <K extends keyof Schema>(key: K, value: Schema[K]) => {
    await SettingsManager.saveSetting(key, value);
    // Use functional state update to ensure we always have the latest state reference
    setAppSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  if (!appSettings) {
    return React.createElement(Text, { style: styles.loadingText }, "Loading preferences...");
  }
  
  // Replicating the HTML structure
  return React.createElement(
    View,
    { style: styles.fullScreenContainer },
    React.createElement(View, { style: styles.titlebar },
      React.createElement(Text, { style: styles.title }, "Preferences"),
      React.createElement(View, { style: { flexGrow: 10 } }),
      React.createElement(Text, { style: styles.closeBtn }, "X") 
    ),
    React.createElement(ScrollView, { style: styles.scrollViewContent },
      // Enable Tours Section
      React.createElement(View, { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, "Enable tours"),
        React.createElement(Text, { style: styles.sectionDescription }, "Control which tours are enabled and processed."),
        React.createElement(View, { style: styles.settingsGroup },
          // Pass necessary props down to the stable component
          React.createElement(SettingRow, { settingKey: 'enable_atp', currentValue: appSettings.enable_atp, onValueChange: handleSettingChange }),
          React.createElement(View, { style: styles.separatorHorizontal }),
          React.createElement(SettingRow, { settingKey: 'enable_wta', currentValue: appSettings.enable_wta, onValueChange: handleSettingChange }),
          React.createElement(View, { style: styles.separatorHorizontal }),
          React.createElement(SettingRow, { settingKey: 'enable_atp_challenger', currentValue: appSettings.enable_atp_challenger, onValueChange: handleSettingChange }),
          React.createElement(View, { style: styles.separatorHorizontal }),
          React.createElement(SettingRow, { settingKey: 'enable_tennis_temple', currentValue: appSettings.enable_tennis_temple, onValueChange: handleSettingChange }),
        )
      ),
      React.createElement(View, { style: styles.separatorHorizontal }),

      // Developer Options Section
      React.createElement(View, { style: styles.sectionContainer },
        React.createElement(Text, { style: styles.sectionTitle }, "Developer Options"),
        React.createElement(Text, { style: styles.sectionDescription }, "Control developer mode used to debug this extension."),
        React.createElement(View, { style: styles.settingsGroup },
          React.createElement(SettingRow, { settingKey: 'enable_debug_logging', currentValue: appSettings.enable_debug_logging, onValueChange: handleSettingChange }),
        )
      ),
    )
  );
};

const styles = StyleSheet.create({
  loadingText: { textAlign: 'center', marginTop: 20 },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgb(34, 34, 38)', 
    borderRadius: 15,
    overflow: 'hidden',
  },
  titlebar: { /* ... (styles omitted for brevity, they are unchanged) ... */
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeBtn: {
    color: '#fff',
    padding: 5,
  },
  scrollViewContent: {
    flex: 1,
    padding: 20,
  },
  sectionContainer: {
    width: '100%',
    flexDirection: 'column',
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bolder',
    fontSize: 16,
    paddingBottom: 10,
  },
  sectionDescription: {
    color: '#ccc',
    fontWeight: 'lighter',
    fontSize: 12,
    paddingBottom: 10,
  },
  settingsGroup: {
    width: '100%',
    flexDirection: 'column',
    backgroundColor: 'rgb(52, 52, 55)',
    borderRadius: 10,
  },
  settingRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'center',
  },
  labelContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontWeight: 'bolder',
    fontSize: 16,
  },
  settingDescription: {
    color: '#ccc',
    fontWeight: 'lighter',
    fontSize: 12,
  },
  separatorHorizontal: {
    width: '100%',
    height: 1,
    backgroundColor: '#333',
  },
});

export default SettingsScreen;
