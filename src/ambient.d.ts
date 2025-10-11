// src/ambient.d.ts
declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  import Extension from '@girs/gnome-shell/extensions/extension';
  export = Extension;
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  import Main from '@girs/gnome-shell/ui/main';
  export = Main;
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
  import PanelMenu from '@girs/gnome-shell/ui/panelMenu';
  export = PanelMenu;
}

// Add the declaration for popupMenu.js
declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
    import PopupMenu from '@girs/gnome-shell/ui/popupMenu';
    export = PopupMenu;
}

declare module 'resource:///org/gnome/shell/ui/modalDialog.js' {
    import ModalDialog from '@girs/gnome-shell/ui/modalDialog';
    export = ModalDialog;
}