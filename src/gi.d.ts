// src/gi.d.ts
declare module 'gi://Clutter' {
  import Clutter from '@girs/clutter-1.0';
  export = Clutter;
}

declare module 'gi://Clutter?version=1.0' {
  import Clutter from '@girs/clutter-1.0';
  export = Clutter;
}

declare module 'gi://Gio' {
  import Gio from '@girs/gio-2.0';
  export = Gio;
}

declare module 'gi://Gio?version=2.0' {
  import Gio from '@girs/gio-2.0';
  export = Gio;
}

declare module 'gi://St' {
  import St from '@girs/st-16';
  export = St;
}

declare module 'gi://GdkPixbuf' {
  import GdkPixbuf from '@girs/gdkpixbuf-2.0';
  export = GdkPixbuf;
}

declare module 'gi://Gtk' {
  import Gtk from '@girs/gtk-4.0';
  export = Gtk;
}

// Add the declaration for gi://Shell
declare module 'gi://Shell' {
  import Shell from '@girs/gnome-shell/shell';
  export = Shell;
}

declare module 'gi://Shell?version=46' {
  import Shell from '@girs/gnome-shell/shell';
  export = Shell;
}

// Add the declarations for gi://GObject
declare module 'gi://GObject' {
  import GObject from '@girs/gobject-2.0';
  export = GObject;
}

declare module 'gi://GObject?version=2.0' {
  import GObject from '@girs/gobject-2.0';
  export = GObject;
}

// Add the declarations for gi://GLib
declare module 'gi://GLib' {
  import GLib from '@girs/glib-2.0';
  export = GLib;
}

declare module 'gi://GLib?version=2.0' {
  import GLib from '@girs/glib-2.0';
  export = GLib;
}

// Add the declarations for gi://Soup
declare module 'gi://Soup' {
  import Soup from '@girs/soup-3.0';
  export = Soup;
}

declare module 'gi://Soup?version=3.0' {
  import Soup from '@girs/soup-3.0';
  export = Soup;
}

// Add the declarations for gi://Adw
declare module 'gi://Adw' {
  import Adw from '@girs/adw-1';
  export = Adw;
}

declare module 'gi://Adw?version=1' {
  import Adw from '@girs/adw-1';
  export = Adw;
}
