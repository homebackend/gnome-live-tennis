import { CheckedMenuItem, CheckedMenuItemProperties, MatchMenuItem, MatchMenuItemProperties, PopubSubMenuItemProperties, PopupSubMenuItem } from "./menuitem.js";
import { Renderer } from "./renderer.js";
import { Runner } from "./runner.js";
import { Settings } from "./settings.js";
import { TennisEvent, TennisMatch } from "./types.js";

export abstract class MenuRendererCommon<T, TT, IT, PI, CI, MI,
    E extends PopupSubMenuItem<PI, CI | MI>, C extends CheckedMenuItem<CI>, M extends MatchMenuItem<MI>> extends Runner {
    private _EConstructor: new (properties: PopubSubMenuItemProperties) => E;
    private _CConstructor: new (properties: CheckedMenuItemProperties, renderer: Renderer<T, TT, IT>) => C;
    private _MConstructor: new (properties: MatchMenuItemProperties, renderer: Renderer<T, TT, IT>) => M;
    protected _renderer: Renderer<T, TT, IT>;
    private _settings: Settings;

    private _tournamentHeaders: Map<string, E> = new Map();
    private _eventAutoItems: Map<string, C> = new Map();
    private _matchesMenuItems: Map<string, M> = new Map();

    constructor(log: (logs: string[]) => void, settings: Settings, basePath: string,
        renderer: Renderer<T, TT, IT>,
        EConstructor: new (properties: PopubSubMenuItemProperties) => E,
        CConstructor: new (properties: CheckedMenuItemProperties, renderer: Renderer<T, TT, IT>) => C,
        MConstructor: new (properties: MatchMenuItemProperties, renderer: Renderer<T, TT, IT>) => M,
    ) {
        super(log, settings, basePath);

        this._renderer = renderer;
        this._settings = settings;
        this._EConstructor = EConstructor;
        this._CConstructor = CConstructor;
        this._MConstructor = MConstructor;
    }

    abstract addEventMenuItemToMenu(item: E, position: number): void;
    abstract setLastRefrestTimeText(text: string): void;
    abstract addMenuSeprator(): void;
    abstract addItemToMenu(item: C): void;
    abstract addRefreshMenuItem(): void;
    abstract addSettingsItem(): void;
    abstract setupAdditionalMenuItems(): void;

    updateLastRefreshTime(): void {
        const timeString = this.lastRefreshTimeDisplay();
        this.setLastRefrestTimeText(`Last Refresh: <span weight='bold'>${timeString}</span>`);
    }

    hasEvent(eventId: string): boolean {
        return this._tournamentHeaders.has(eventId);
    }

    addEventMenuItem(event: TennisEvent, text: string, position: number, url: string | undefined, isAuto: boolean): void {
        const submenuItem = new this._EConstructor({
            basePath: this.basePath,
            log: this.log,
            event: event,
            text: text,
            url: url,
            clickHandler: () => this._tournamentHeaders.forEach((submenuItem) => submenuItem.hide()),
        });
        this.addEventMenuItemToMenu(submenuItem, position);
        this._tournamentHeaders.set(event.id, submenuItem);

        const autoItem = new this._CConstructor({
            text: 'Auto add new matches',
            checked: isAuto,
            clickHandler: () => this._toggleAutoSelection(event.id),
        }, this._renderer);
        submenuItem.addMenuItem(autoItem);
        this._eventAutoItems.set(event.id, autoItem);
    }

    hasMatch(matchId: string): boolean {
        return this._matchesMenuItems.has(matchId);
    }

    addMatchMenuItem(event: TennisEvent, match: TennisMatch, isSelected: boolean): void {
        const submenuItem = this._tournamentHeaders.get(event.id);
        if (submenuItem) {
            const menuItem = new this._MConstructor({
                match: match,
                checked: isSelected,
                clickHandler: () => this._toggleMatchSelection(matchId),
            }, this._renderer);
            submenuItem.addMenuItem(menuItem);
            const matchId = this.uniqMatchId(event, match);
            this._matchesMenuItems.set(matchId, menuItem);
        } else {
            this.log(['Event not found', event.id]);
        }
    }

    updateMatchMenuItem(matchId: string, match: TennisMatch): void {
        const menuItem = this._matchesMenuItems.get(matchId);
        if (menuItem) {
            menuItem.match = match;
        }
    }

    isMatchSelected(matchId: string): boolean {
        return this._matchesMenuItems.get(matchId)!.checked;
    }

    setMatchSelection(matchId: string, selection: boolean): void {
        this._matchesMenuItems.get(matchId)!.checked = selection;
    }

    removeEventMenuItem(event: TennisEvent): void {
        const autoItem = this._eventAutoItems.get(event.id);
        if (autoItem) {
            autoItem.destroy();
            this._eventAutoItems.delete(event.id);
        }

        const header = this._tournamentHeaders.get(event.id);
        if (header) {
            header.destroy();
            this._tournamentHeaders.delete(event.id);
        }
    }

    removeMatchMenuItem(matchId: string): void {
        const matchItem = this._matchesMenuItems.get(matchId);
        if (matchItem) {
            matchItem.destroy();
            this._matchesMenuItems.delete(matchId);
        }
    }

    async setupBaseMenu(): Promise<void> {
        this.addMenuSeprator();

        const isEnabled = await this._settings.getBoolean('enabled');
        const enableLiveViewItem = new this._CConstructor({
            text: 'Enable live view',
            checked: isEnabled,
            clickHandler: (value) => this._settings.setBoolean('enabled', value),
        }, this._renderer);
        this.addItemToMenu(enableLiveViewItem);
        this.addMenuSeprator();
        this.addRefreshMenuItem();
        this.addMenuSeprator();
        this.addSettingsItem();
        this.setupAdditionalMenuItems();
    }

    destroy(): void {
        this._renderer.destroy();
    }
}
