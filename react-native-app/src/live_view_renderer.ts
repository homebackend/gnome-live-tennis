import { ReactElement } from "react";

import { RNElement } from "./renderer";
import { LiveViewRendererCommon } from '../../src/common/live_view_renderer';
import { TennisMatch } from "../../src/common/types";
import { StyleKeys } from "../../src/common/style_keys";
import { getCssThemeStyles, LiveTennisTheme, } from './style';
import React from "react";
import { ScrollView } from "react-native";

export class RNLiveViewRenderer extends LiveViewRendererCommon<RNElement, RNElement, RNElement> {
    public renderWindowUI(match: TennisMatch, theme: LiveTennisTheme): ReactElement {
        const mainBox = this.renderer.createContainer({
            xExpand: true,
            yExpand: true,
            vertical: true,
            className: StyleKeys.LiveViewMainBox,
        });

        this.createMainWindow(mainBox, match);

        const themeStyle = getCssThemeStyles(theme);
        const reactElement = React.createElement(ScrollView, {
            horizontal: true,
            style: [{
                height: 300,
                width: '100%'
            },
            themeStyle[StyleKeys.LiveViewFloatingScoreWindow]],
        }, mainBox.element());

        return reactElement;
    }
}
