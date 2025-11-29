import { ImageStyle, TextStyle, useColorScheme, ViewStyle } from 'react-native';
import cssStyles from "../../src/common/style.css";
import { StyleKeys } from '../../src/common/style_keys';

export interface LiveTennisTheme {
    textColor: string;
    bgColor: string;
    menuItemBgNormal: string;
    menuItemBgHover: string;
    menuItemText: string;
    menuItemLiveColor: string;
    menuItemFinishedColor: string;
    menuItemPausedColor: string;
    menuItemUpcomingColor: string;
    menuItemSuspendedColor: string;
    menuItemVsColor: string;
    linkColor: string;
}

const LightTheme: LiveTennisTheme = {
    bgColor: '#ffffff',
    textColor: '#000000',
    menuItemBgNormal: '#F0F0F0',
    menuItemBgHover: '#E0E0E0',
    menuItemText: '#000000',
    menuItemLiveColor: '#002F6C',
    menuItemFinishedColor: '#4A235A',
    menuItemPausedColor: 'yellow',
    menuItemSuspendedColor: 'orchid',
    menuItemUpcomingColor: 'gray',
    menuItemVsColor: 'forestgreen',
    linkColor: 'blue',
};

const DarkTheme: LiveTennisTheme = {
    bgColor: '#1e1e1e',
    textColor: '#ffffff',
    menuItemBgNormal: '#333333',
    menuItemBgHover: '#444444',
    menuItemText: '#ffffff',
    menuItemLiveColor: 'yellow',
    menuItemFinishedColor: 'aqua',
    menuItemPausedColor: 'yellow',
    menuItemSuspendedColor: 'orchid',
    menuItemUpcomingColor: 'gray',
    menuItemVsColor: 'greenyellow',
    linkColor: 'aqua',
};

export const useTheme = (): LiveTennisTheme => {
    const scheme = useColorScheme();
    return scheme === 'dark' ? DarkTheme : LightTheme;
};

export const getCssThemeStyles = (theme: LiveTennisTheme) => {
    const themeStyles: Record<string, ViewStyle | TextStyle | ImageStyle> = { ...cssStyles };
    themeStyles[StyleKeys.MainMenuLinkButton] = {
        color: theme.linkColor,
        textDecorationLine: 'underline',
    };

    themeStyles[StyleKeys.MainMenuTournamentItem] = {
        fontWeight: 'bold',
        borderRadius: 4,
        color: theme.menuItemText,
        backgroundColor: theme.menuItemBgNormal,
        padding: 5,
    };

    themeStyles[StyleKeys.MainMenuMatchItem] = {
        borderRadius: 4,
        color: theme.menuItemText,
        backgroundColor: theme.menuItemBgNormal,
        padding: 5,
    };

    themeStyles[StyleKeys.MainMenuMatchStatusLive] = {
        color: theme.menuItemLiveColor,
    };

    themeStyles[StyleKeys.MainMenuMatchStatusFinished] = {
        color: theme.menuItemFinishedColor,
    };

    themeStyles[StyleKeys.MainMenuVerses] = {
        color: theme.menuItemVsColor,
    };

    themeStyles[StyleKeys.LiveViewMatchHeaderLabel] = {
        ...themeStyles[StyleKeys.LiveViewMatchHeaderLabel], ... {
            color: theme.menuItemText,
        }
    };

    themeStyles[StyleKeys.LiveViewFloatingScoreWindow] = {
        ...themeStyles[StyleKeys.LiveViewFloatingScoreWindow], ...{
            backgroundColor: theme.menuItemBgNormal,
            color: theme.menuItemText,
        }
    };

    return themeStyles;
}
