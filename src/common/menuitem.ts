import { StyleKeys } from "./style_keys";
import { Alignment, ContainerProperties, Renderer } from "./renderer";
import { MenuUrl, TennisEvent, TennisMatch, TennisTeam } from "./types";

export function getMatchMenuItemProperties(): ContainerProperties {
    return { className: StyleKeys.MainMenuMatchItem, xExpand: true }
}

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

    private _addTeam(matchDataElement: T, team: TennisTeam, reverse: boolean) {
        const teamItems: (() => void)[] = [];
        team.players.forEach(p => {
            const url = p.headUrl;
            if (url) {
                teamItems.push(() =>
                    this.r.addImageToContainer(matchDataElement, {
                        src: url,
                        alt: p.displayName,
                        className: StyleKeys.MainMenuPlayerImage,
                        height: MatchMenuItemRenderer.ImageHeight,
                        paddingRight: MatchMenuItemRenderer.ImagePadding,
                    })
                );
            }

            if (!p.placeholder && p.countryCode) {
                teamItems.push(() =>
                    this.r.addFlagToContainer(
                        matchDataElement,
                        p.countryCode,
                        StyleKeys.MainMenuPlayerFlag,
                        MatchMenuItemRenderer.ImageHeight,
                        MatchMenuItemRenderer.ImagePadding
                    )
                );
            }
        });

        teamItems.push(() =>
            this.r.addTextToContainer(matchDataElement, {
                text: team.displayName,
                className: StyleKeys.NoWrapText,
                paddingRight: MatchMenuItemRenderer.TextPadding,
            })
        );

        if (reverse) {
            teamItems.reverse();
        }

        teamItems.forEach(f => f());
    }

    updateMatchData(matchDataElement: T, match: TennisMatch, smallWidth: boolean = false) {
        let row1: T;
        let row2: T;
        if (smallWidth) {
            const dataContainer = this.r.createContainer({ vertical: true });
            row1 = this.r.createContainer(getMatchMenuItemProperties());
            row2 = this.r.createContainer(getMatchMenuItemProperties());
            this.r.addContainersToContainer(dataContainer, [row1, row2]);
            this.r.addContainersToContainer(matchDataElement, dataContainer);
        } else {
            row1 = row2 = matchDataElement;
        }

        this._addTeam(row1, match.team1, false);
        this.r.addTextToContainer(row1, {
            text: 'VS',
            className: StyleKeys.MainMenuVerses,
            paddingRight: MatchMenuItemRenderer.TextPadding,
        });
        this._addTeam(row1, match.team2, true);

        if (match.url) {
            this.r.addTextToContainer(row2, {
                text: 'Stats',
                link: match.url,
                paddingRight: MatchMenuItemRenderer.TextPadding,
            });
        }

        if (match.h2hUrl) {
            this.r.addTextToContainer(row2, {
                text: 'H2H',
                link: match.h2hUrl,
                paddingRight: MatchMenuItemRenderer.TextPadding,
            });
        }

        if (match.isLive) {
            this.r.addTextToContainer(row2, {
                text: 'LIVE',
                className: StyleKeys.MainMenuMatchStatusLive,
                paddingRight: MatchMenuItemRenderer.TextPadding,
            });
        }

        if (match.displayScore) {
            this.r.addTextToContainer(row2, {
                text: match.displayScore,
                className: `${StyleKeys.NoWrapText} ${match.isLive ? StyleKeys.MainMenuMatchStatusLive : StyleKeys.MainMenuMatchStatusFinished}`,
                xExpand: true,
                textAlign: Alignment.End,
            });
        }
    }
}