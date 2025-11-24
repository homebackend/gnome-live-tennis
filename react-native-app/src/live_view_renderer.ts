import { ReactElement } from "react";

import { RNElement } from "./renderer";
import { LiveViewRendererCommon } from '../../src/common/live_view_renderer';
import { TennisMatch } from "../../src/common/types";
import { StyleKeys } from "../../src/common/style_keys";

export class RNLiveViewRenderer extends LiveViewRendererCommon<RNElement, RNElement, RNElement> {
    public renderWindowUI(match: TennisMatch): ReactElement {
        const topBox = this.renderer.createContainer({
            xExpand: true,
            yExpand: true,
            className: StyleKeys.LiveViewFloatingScoreWindow,
        });

        const mainBox = this.renderer.createContainer({
            xExpand: true,
            yExpand: true,
            vertical: true,
            className: StyleKeys.LiveViewMainBox,
        });
        this.renderer.addContainersToContainer(topBox, mainBox);

        this.createMainWindow(mainBox, match);

        return topBox.element();
    }
}
