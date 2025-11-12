import { StyleKeys } from "./style_keys.js";
import { Alignment, Renderer } from "./renderer.js";
import { TennisMatch, TennisPlayer, TennisSetScore, TennisTeam } from "./types.js";

export abstract class LiveViewRendererCommon<T, TT, IT> {
    protected basePath: string;
    protected renderer: Renderer<T, TT, IT>;
    protected log: (logs: string[]) => void;

    constructor(basePath: string, log: (logs: string[]) => void, renderer: Renderer<T, TT, IT>) {
        this.basePath = basePath;
        this.log = log;
        this.renderer = renderer;
    }

    private _addEventHeader(eventHeader: T, match: TennisMatch) {
        const event = match.event;

        const eventType = this.renderer.createContainer({ className: StyleKeys.LiveViewEventType, xAlign: Alignment.Center, yExpand: false });
        ///*
        this.renderer.addTextToContainer(eventType, { text: match.event.displayType, className: StyleKeys.LiveViewEventTypeText });
        //*/
        /*
            const url = match.event.eventTypeUrl;
            if (!url) {
                const eventTypeLabel = new St.Label({ text: match.event.type, style_class: StyleKeys.LiveViewEventTypeText });
                eventType.add_child(eventTypeLabel);
            } else {
                loadWebImage(url, this._uuid, eventType, -120, this._log);
            }
        */

        this.renderer.addContainersToContainer(eventHeader, eventType);
        this.renderer.addSeparatorToContainer(eventHeader, { vertical: true });

        const eventDescription = this.renderer.createContainer({ vertical: true });
        this.renderer.addTextToContainer(eventDescription, { text: match.event.title, className: StyleKeys.LiveViewEventText, link: match.event.url });
        const locationBox = this.renderer.createContainer();
        this.renderer.addTextToContainer(locationBox, { text: `${match.event.city}, ${match.event.country}`, className: StyleKeys.LiveViewEventText });
        if (event.countryCode) {
            this.renderer.addFlagToContainer(locationBox, event.countryCode, StyleKeys.LiveViewPlayerFlag, 16);
        }
        this.renderer.addContainersToContainer(eventDescription, locationBox);
        this.renderer.addContainersToContainer(eventHeader, eventDescription);

        let hasDetails = false;

        const eventDetails = this.renderer.createContainer({ vertical: true, xAlign: Alignment.End, yAlign: Alignment.Begin });
        if (event.surface) {
            hasDetails = true;
            this.renderer.addTextToContainer(eventDetails, { text: `${event.surface}/${event.indoor ? 'Indoor' : 'Outdoor'}`, className: StyleKeys.LiveViewEventText });
        }
        if (event.prizeMoney && event.prizeMoneyCurrency) {
            hasDetails = true;
            this.renderer.addTextToContainer(eventDetails, { text: `${event.prizeMoneyCurrency} ${event.prizeMoney}`, className: StyleKeys.LiveViewEventText });
        }
        if (event.singlesDrawSize && event.singlesDrawSize > 0 && event.doublesDrawSize && event.doublesDrawSize > 0) {
            hasDetails = true;
            this.renderer.addTextToContainer(eventDetails, { text: `Draw: ${event.singlesDrawSize}/${event.doublesDrawSize}`, className: StyleKeys.LiveViewEventText });
        }

        if (hasDetails) {
            this.renderer.addSeparatorToContainer(eventHeader, { vertical: true });
            this.renderer.addContainersToContainer(eventHeader, eventDetails);
        }
    }

    private _addMatchHeader(box: T, match: TennisMatch) {
        // Match Header (Quarterfinals, etc.)
        const matchHeader = this.renderer.createContainer({ className: StyleKeys.LiveViewMatchHeaderBox, xExpand: true });
        this.renderer.addTextToContainer(matchHeader, {
            text: `${match.roundName}`,
            className: `${StyleKeys.NoWrapText} ${StyleKeys.LiveViewMatchHeaderLabel} ${StyleKeys.LiveViewRoundLabel}`
        });
        this.renderer.addTextToContainer(matchHeader, {
            text: match.displayStatus,
            className: `${StyleKeys.LiveViewMatchHeaderLabel} ${StyleKeys.LiveViewMatchStatus}${match.displayStatus.toLowerCase()}`,
            yAlign: Alignment.Begin,
        });
        this.renderer.addTextToContainer(matchHeader, {
            text: match.courtName ?? '',
            className: `${StyleKeys.NoWrapText} ${StyleKeys.LiveViewMatchHeaderLabel}`,
            yAlign: Alignment.Begin,
        });
        this.renderer.addTextToContainer(matchHeader, {
            text: match.matchTotalTime ?? '',
            className: StyleKeys.LiveViewMatchHeaderLabel,
            xExpand: true,
            xAlign: Alignment.End,
            yAlign: Alignment.Begin,
            textAlign: Alignment.End,
        });

        this.renderer.addContainersToContainer(box, matchHeader);
    }

    private _addTeam(team: TennisTeam, isDoubles: boolean, row: T) {
        const teamBox = this.renderer.createContainer({ vertical: false, className: `${StyleKeys.LiveViewTeamBox} ${StyleKeys.LiveViewTeamRow}` });

        // Player Info
        const playerInfoBox = this.renderer.createContainer({ vertical: true });
        team.players.forEach((p: TennisPlayer) => {
            const playerRow = this.renderer.createContainer({ className: StyleKeys.LiveViewPlayerRow });

            const playerImage = this.renderer.createContainer({ className: StyleKeys.LiveViewPlayerImage });
            this.renderer.addContainersToContainer(playerRow, playerImage);
            const playerImageUrl = p.headUrl
            if (playerImageUrl) {
                this.renderer.addImageToContainer(playerImage, {
                    src: playerImageUrl,
                    isLocal: false,
                    iconSize: 25,
                });
            }

            // Create flag icon from country code
            this.renderer.addFlagToContainer(playerRow, p.countryCode, StyleKeys.LiveViewPlayerFlag, 16);
            this.renderer.addTextToContainer(playerRow, { text: team.entryType ? `[${team.entryType}] ` : '' });

            // Player name label
            let name: string = `${p.firstName} ${p.lastName}`;
            if (team.seed) {
                name += ` (${team.seed})`
            }
            this.renderer.addTextToContainer(playerRow, {
                text: name,
                isMarkup: true,
                className: StyleKeys.LiveViewPlayerName,
                link: p.url,
            });

            this.renderer.addContainersToContainer(playerInfoBox, playerRow);
        });
        this.renderer.addContainersToContainer(teamBox, playerInfoBox);

        this.renderer.addContainersToContainer(row, teamBox);
    }

    private _addScore(team: TennisTeam, alignment: Alignment, gameScoreStyle: string, isServing: boolean, row: T) {
        const serviceBox = this.renderer.createContainer({ className: StyleKeys.LiveViewServiceBox, yAlign: alignment });
        if (isServing) {
            this.renderer.addImageToContainer(serviceBox, {
                src: `${this.basePath}/icons/tennis-icon.png`,
                isLocal: true,
                iconSize: 16,
            });
        }
        this.renderer.addContainersToContainer(row, serviceBox);

        this.renderer.addTextToContainer(row, {
            text: team.gameScore != null ? team.gameScore : '',
            className: StyleKeys.LiveViewGameScoreBox,
            yAlign: alignment,
        });

        this._formatSetScores(team.setScores).forEach(scoreText => {
            if (!scoreText) {
                return;
            }

            this.renderer.addTextToContainer(row, {
                text: scoreText,
                isMarkup: true,
                className: StyleKeys.LiveViewScoreBox,
                yAlign: alignment,
            });
        });
    }

    private _addMatchScoreRow(box: T, match: TennisMatch, team: TennisTeam, server: number, scoreAlignment: Alignment) {
        const row = this.renderer.createContainer({ className: StyleKeys.LiveViewMatchContentBox, xAlign: Alignment.Begin, yAlign: scoreAlignment });
        this._addTeam(team, match.isDoubles, row);
        this._addScore(team, scoreAlignment, StyleKeys.LiveViewGameScoreBoxTop, match.server == server, row);
        this.renderer.addContainersToContainer(box, row);
    }

    private _addMatchScoreRows(box: T, match: TennisMatch) {
        this._addMatchScoreRow(box, match, match.team1, 0, Alignment.End);
        this.renderer.addSeparatorToContainer(box, {});
        this._addMatchScoreRow(box, match, match.team2, 1, Alignment.Begin);
    }

    private _addExtrasRows(box: T, match: TennisMatch) {
        if (match.h2hUrl || match.umpireFirstName || match.umpireLastName) {
            const row = this.renderer.createContainer({
                xExpand: true,
            });

            if (match.h2hUrl) {
                this.renderer.addTextToContainer(row, {
                    text: 'Head 2 Head',
                    link: match.h2hUrl,
                    className: StyleKeys.LiveViewSmallTextLabel,
                });
            }

            if (match.umpireLastName && match.umpireFirstName) {
                this.renderer.addTextToContainer(row, {
                    text: `Ump: ${match.umpireFirstName} ${match.umpireLastName}`,
                    className: StyleKeys.LiveViewSmallTextLabel,
                });
            }

            this.renderer.addContainersToContainer(box, row);
        }

        if (match.message) {
            this.renderer.addTextToContainer(box, { text: match.message, className: StyleKeys.LiveViewSmallTextLabel });
        }
    }

    private _formatSetScores(scores: TennisSetScore[]): string[] {
        if (!scores || scores.length === 0) {
            return [''];
        }

        return scores.filter(s => s && s.score != null && s.score >= 0).map(s => {
            let scoreString = `${s.score}`;
            if (s.tiebrake) {
                scoreString += `<sup>${s.tiebrake}</sup>`;
            }
            return scoreString;
        });
    }

    protected createMainWindow(mainBox: T, match: TennisMatch) {
        const eventHeader = this.renderer.createContainer({ justifyContent: 'space-between', xExpand: true });
        this._addEventHeader(eventHeader, match);
        this.renderer.addContainersToContainer(mainBox, eventHeader);

        const box = this.renderer.createContainer({ vertical: true, xExpand: true, className: StyleKeys.LiveViewSubMainBox });

        this._addMatchHeader(box, match);
        this.renderer.addSeparatorToContainer(box, {});
        this._addMatchScoreRows(box, match);
        this.renderer.addSeparatorToContainer(box, {});
        this._addExtrasRows(box, match);
        this.renderer.addContainersToContainer(mainBox, box);
    }
}