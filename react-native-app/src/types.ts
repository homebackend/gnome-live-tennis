import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Settings } from '../../src/common/settings';

export type RootStackParamList = {
  Home: undefined;
  Settings: { settings: Settings };
  CountrySettings: {
    summary: string,
    description: string,
    key: string,
    initialValues: string[],
    settings: Settings,
  };
};

export type HomeNavigationProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type SettingsNavigationProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
export type CountrySettingsNavigationProps = NativeStackScreenProps<RootStackParamList, 'CountrySettings'>;

