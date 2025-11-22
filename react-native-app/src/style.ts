import { Appearance } from 'react-native';
import cssStyles from "../../src/common/style.css";
import { StyleKeys } from '../../src/common/style_keys';


const colorScheme = Appearance.getColorScheme();
const isDarkMode = colorScheme === 'dark';

const colors = {
    bgColor: '#ffffff',
    textColor: '#000000',
    menuItemBgNormal: '#F0F0F0',
    menuItemBgHover: '#E0E0E0',
    menuItemText: '#000000',
};

if (isDarkMode) {
    colors.bgColor = '#1e1e1e';
    colors.textColor = '#ffffff';
    colors.menuItemBgNormal = '#333333';
    colors.menuItemBgHover = '#444444';
    colors.menuItemText = '#FFFFFF';
}

cssStyles[StyleKeys.MainMenuTournamentItem] = {
    fontWeight: 'bold',
    borderRadius: 4,
    color: colors.menuItemText,
    backgroundColor: colors.menuItemBgNormal,
    padding: 10,
};

cssStyles[StyleKeys.MainMenuMatchItem] = {
    borderRadius: 4,
    color: colors.menuItemText,
    backgroundColor: colors.menuItemBgNormal,
    padding: 10,
};

export { cssStyles, colors };
