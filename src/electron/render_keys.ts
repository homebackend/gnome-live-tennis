export const MenuRenderKeys = {
    openSettingsWindow: 'open-settings-window',
    log: 'log',
    basePath: 'basePath',
    uniqMatchId: 'uniq-match-id',
    refresh: 'refresh',
    quit: 'quit',
    getSettingBoolean: 'get-setting-b',
    getSettingInt: 'get-setting-i',
    getSettingStrV: 'get-setting-as',
    setSettingBoolean: 'set-setting-b',
    setSettingInt: 'set-setting-i',
    setSettingStrv: 'set-setting-as',
    updateLastRefreshTime: 'update-last-refresh-time',
    addEventMenuItem: 'add-event-menu-item',
    addMatchMenuItem: 'add-match-menu-item',
    updateMatchMenuItem: 'update-match-menu-item',
    setMatchSelected: 'set-match-selected',
    setMatchSelection: 'set-match-selection',
    removeEventMenuItem: 'remove-event-menu-item',
    removeMatchMenuItem: 'remove-match-menu-item',
};

export const LiveViewRendererKeys = {
    log: MenuRenderKeys.log,
    basePath: MenuRenderKeys.basePath,
    resizeToFitContents: 'resize-to-fit-contents',
    updateLiveViewContent: 'update-live-view-content',
    setLiveViewContentsEmpty: 'set-live-view-contents-empty',
    setWindowIndex: 'set-window-index',
};

export const PreferenceRenderKeys = {
    closePreferencesWindow: 'close-prefs-window',    
}
