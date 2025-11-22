import { MenuRendererCommon } from "../menu_renderer";
import { CheckedMenuItem, CheckedMenuItemProperties, LinkMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, MenuItem, PopubSubMenuItemProperties, PopupSubMenuItem } from "../menuitem.js";
import { Alignment, Renderer } from "../renderer";
import { Settings } from "../settings";
import { StyleKeys } from "../style_keys";

export abstract class AppMenuRenderer<ContainerType, TextType, ImageType, MIC,
    PI extends PopupSubMenuItem<MIC, MIC>, LI extends MenuItem<MIC>, CI extends CheckedMenuItem<MIC>, MI extends MatchMenuItem<MIC>>
    extends MenuRendererCommon<ContainerType, TextType, ImageType, MIC, MIC, MIC, MIC, PI, LI, CI, MI> {

    protected eventContainer: ContainerType;
    protected otherContainer: ContainerType;

    constructor(basePath: string, log: (logs: string[]) => void, settings: Settings,
        renderer: Renderer<ContainerType, TextType, ImageType>,
        EConstructor: new (properties: PopubSubMenuItemProperties) => PI,
        LConstructor: new (properties: LinkMenuItemProperties) => LI,
        CConstructor: new (properties: CheckedMenuItemProperties, renderer: Renderer<ContainerType, TextType, ImageType>) => CI,
        MConstructor: new (properties: MatchMenuItemProperties, renderer: Renderer<ContainerType, TextType, ImageType>) => MI,
    ) {
        super(log, settings, basePath, renderer, EConstructor, LConstructor, CConstructor, MConstructor);
        this.eventContainer = renderer.createContainer({ vertical: true, xExpand: true });
        this.otherContainer = renderer.createContainer({ vertical: true, xExpand: true });
    }

    protected abstract refresh(): void;
    protected abstract openSettingsWindow(): void;
    protected abstract quit(): void;

    addMenuSeprator(): void {
        const r = this._renderer;
        r.addContainersToContainer(this.otherContainer, r.createSeparator({}));
    }

    protected getRefreshMenuItem(text: string): [ContainerType, TextType] {
        const r = this._renderer;
        const container = r.createContainer({ xExpand: true, className: StyleKeys.MainMenuMatchItem });
        r.addTextToContainer(container, {
            text: 'Last Refresh',
            onClick: this.refresh.bind(this),
            className: StyleKeys.NoWrapText,
        });
        const refreshText = r.addTextToContainer(container, {
            text: text,
            className: `${StyleKeys.NoWrapText} ${StyleKeys.MainMenuRefreshLabel}`,
            xExpand: true,
            textAlign: Alignment.End,
            onClick: this.refresh.bind(this),
        });

        return [container, refreshText];
    }

    addSettingsItem(): void {
        const r = this._renderer;
        r.addTextToContainer(this.otherContainer, {
            text: 'Settings',
            xExpand: true,
            className: StyleKeys.MainMenuMatchItem,
            onClick: this.openSettingsWindow.bind(this),
        });
    }

    setupAdditionalMenuItems(): void {
        this.addMenuSeprator();
        const r = this._renderer;
        r.addTextToContainer(this.otherContainer, {
            text: 'Quit Application',
            xExpand: true,
            onClick: this.quit.bind(this),
            className: `${StyleKeys.NoWrapText} ${StyleKeys.MainMenuMatchItem}`,
        });
    }

}