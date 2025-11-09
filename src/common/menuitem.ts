import { StyleKeys } from "./style_keys.js";
import { Alignment, Renderer } from "./renderer.js";
import { MenuUrl, TennisEvent, TennisMatch, TennisTeam } from "./types.js";

export interface PopubSubMenuItemProperties {
    basePath: string;
    log: (logs: string[]) => void;
    event: TennisEvent;
    text: string;
    url?: string;
    uuid?: string;
    clickHandler?: () => void;
}

export interface LinkMenuItemProperties {
    basePath: string;
    uuid?: string;
    log: (logs: string[]) => void;
    menuUrls: MenuUrl[];
}

export interface CheckedMenuItemProperties {
    text: string;
    checked: boolean;
    clickHandler?: (checked: boolean) => void;
}

export interface MatchMenuItemProperties {
    match: TennisMatch;
    checked: boolean;
    clickHandler?: (checked: boolean) => void;
};

export interface PopupSubMenuItem<T, U> {
    get menu(): T;
    addMenuItem(item: MenuItem<U>): void;
    hide(): void;
    destroy(): void;
};

export interface MenuItem<T> {
    get item(): T;
    connect(action: string, handler: () => void): void;
    destroy(): void;
};

export interface CheckedMenuItem<T> extends MenuItem<T> {
    get checked(): boolean;
    set checked(checked: boolean);
};

export interface MatchMenuItem<T> extends CheckedMenuItem<T> {
    set match(match: TennisMatch);
};

export abstract class MatchMenuItemRenderer<T, TextType, ImageType> {
    private static ImageHeight = 16;
    private static ImagePadding = '5px';
    private static TextPadding = '5px';
    protected r: Renderer<T, TextType, ImageType>;

    constructor(r: Renderer<T, TextType, ImageType>) {
        this.r = r;
    }

    private _addTeam(matchDataElement: T, team: TennisTeam) {
        team.players.forEach(p => {
            const url = p.headUrl;
            if (url) {
                this.r.addImageToContainer(matchDataElement, {
                    src: url,
                    alt: p.displayName,
                    className: StyleKeys.MainMenuPlayerImage,
                    height: MatchMenuItemRenderer.ImageHeight,
                    paddingRight: MatchMenuItemRenderer.ImagePadding,
                });
            }

            this.r.addFlagToContainer(
                matchDataElement,
                p.countryCode,
                StyleKeys.MainMenuPlayerFlag,
                MatchMenuItemRenderer.ImageHeight,
                MatchMenuItemRenderer.ImagePadding
            );
        });

        this.r.addTextToContainer(matchDataElement, {
            text: team.displayName,
            className: StyleKeys.NoWrapText,
            paddingRight: MatchMenuItemRenderer.TextPadding,
        });
    }

    updateMatchData(matchDataElement: T, match: TennisMatch) {
        this._addTeam(matchDataElement, match.team1);
        this.r.addTextToContainer(matchDataElement, {
            text: 'vs',
            paddingRight: MatchMenuItemRenderer.TextPadding,
        });
        this._addTeam(matchDataElement, match.team2);

        if (match.isLive) {
            this.r.addTextToContainer(matchDataElement, {
                text: 'LIVE',
                className: StyleKeys.MainMenuMatchStatusLive,
                paddingRight: MatchMenuItemRenderer.TextPadding,
            });
        }

        if (match.displayScore) {
            this.r.addTextToContainer(matchDataElement, {
                text: match.displayScore,
                className: `${StyleKeys.NoWrapText} ${match.isLive ? StyleKeys.MainMenuMatchStatusLive : StyleKeys.MainMenuMatchStatusFinished}`,
                xExpand: true,
                textAlign: Alignment.End,
            });
        }
    }
}