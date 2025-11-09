import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import St from "gi://St";

import { Alignment, ContainerProperties, ImageProperties, Renderer, SeparatorPropeties, TextProperties } from "../common/renderer.js";
import { loadWebImage } from "./image_loader.js";
import { StyleKeys } from "../common/style_keys.js";

export class GnomeRenderer extends Renderer<St.BoxLayout, St.BoxLayout, St.BoxLayout> {
    protected uuid: string;
    private _openConnections: Map<St.Widget, number[]> = new Map();

    constructor(uuid: string, basePath: string, log: (logs: string[]) => void) {
        super(basePath, log);
        this.uuid = uuid;
    }

    private _addConnection(key: St.Widget, value: number) {
        const existingArray = this._openConnections.get(key);
        if (existingArray) {
            existingArray.push(value);
        } else {
            this._openConnections.set(key, [value]);
        }
    }

    openURL(url: string): void {
        Gio.AppInfo.launch_default_for_uri(url, null);
    }

    private _getAlignment(a: Alignment) {
        switch (a) {
            case Alignment.Begin: return Clutter.ActorAlign.START;
            case Alignment.Center: return Clutter.ActorAlign.CENTER;
            case Alignment.End: return Clutter.ActorAlign.END;
        }
    }

    createContainer(properties?: ContainerProperties): St.BoxLayout {
        const props: Partial<St.BoxLayout.ConstructorProps> = {};
        if (properties) {
            if (properties.vertical) {
                props.vertical = properties.vertical;
            }
            if (properties.className) {
                props.style_class = properties.className;
            }
            if (properties.xAlign) {
                props.x_align = this._getAlignment(properties.xAlign);
            }
            if (properties.yAlign) {
                props.y_align = this._getAlignment(properties.yAlign);
            }
            if (properties.xExpand) {
                props.x_expand = properties.xExpand;
            }
            if (properties.yExpand) {
                props.y_expand = properties.yExpand;
            }
        }

        return new St.BoxLayout(props);
    }

    createSeparator(properties: SeparatorPropeties): St.BoxLayout {
        const props: Partial<St.BoxLayout.ConstructorProps> = {};
        if (properties.vertical) {
            props.vertical = properties.vertical;
            props.x_align = Clutter.ActorAlign.CENTER;
            props.yAlign = Clutter.ActorAlign.START;
        } else {
            props.x_align = Clutter.ActorAlign.START;
            props.yAlign = Clutter.ActorAlign.CENTER;
        }

        if (properties.size) {
            if (properties.vertical) {
                props.height = properties.size;
            } else {
                props.width = properties.size;
            }
        } else {
            if (properties.vertical) {
                props.y_expand = true;
            } else {
                props.x_expand = true;
            }
        }

        const width = properties.width ?? 2;
        if (properties.vertical) {
            props.width = width;
        } else {
            props.height = width;
        }

        if (properties.className) {
            props.style_class = properties.className;
        } else {
            if (properties.vertical) {
                props.style_class = StyleKeys.SeparatorVertical;
            } else {
                props.style_class = StyleKeys.SeparatorVertical;
            }
        }

        return new St.BoxLayout(props);
    }

    addContainersToContainer(parent: St.BoxLayout, children: St.BoxLayout | St.BoxLayout[]): void {
        (Array.isArray(children) ? children : [children]).forEach(child => parent.add_child(child));
    }

    addTextToContainer(container: St.BoxLayout, textProperties: TextProperties): St.BoxLayout {
        const labelProperties: Partial<St.Label.ConstructorProps> = textProperties.isMarkup ? {} : { text: textProperties.text };
        if (textProperties.className) { labelProperties.style_class = textProperties.className; }
        if (textProperties.xAlign) { labelProperties.x_align = this._getAlignment(textProperties.xAlign); }
        if (textProperties.yAlign) { labelProperties.y_align = this._getAlignment(textProperties.yAlign); }
        if (textProperties.textAlign) { labelProperties.x_align = this._getAlignment(textProperties.textAlign); }
        if (textProperties.xExpand) { labelProperties.x_expand = textProperties.xExpand; }
        if (textProperties.yExpand) { labelProperties.y_expand = textProperties.yExpand; }

        let style = '';
        if (textProperties.paddingLeft) { style += `padding-left: ${textProperties.paddingLeft};`; }
        if (textProperties.paddingRight) { style += `padding-right: ${textProperties.paddingRight};`; }
        if (style) { labelProperties.style = style; }

        const boxProperties: Partial<St.BoxLayout.ConstructorProps> = {};
        if (textProperties.xExpand) { boxProperties.x_expand = textProperties.xExpand; }
        if (textProperties.yExpand) { boxProperties.y_expand = textProperties.yExpand; }

        const box = new St.BoxLayout(boxProperties);
        const label = new St.Label(labelProperties);
        label.clutter_text.set_markup(textProperties.text);
        if (textProperties.link) {
            const button = new St.Button({
                reactive: true,
                can_focus: true,
                track_hover: true,
                style_class: StyleKeys.MainMenuLinkButton,
            });
            button.set_child(label);
            const id = button.connect('button-press-event', this.openURL.bind(this, textProperties.link));
            this._addConnection(button, id);
            box.add_child(button);
        } else {
            box.add_child(label);
        }
        container.add_child(box);

        return box;
    }

    addImageToContainer(container: St.BoxLayout, imageProperties: ImageProperties): St.BoxLayout {
        const box = new St.BoxLayout();
        container.add_child(box);
        if (imageProperties.isLocal) {
            const gicon = Gio.icon_new_for_string(imageProperties.src);
            const properties: Partial<St.Icon.ConstructorProps> = {
                gicon: gicon
            };
            let style = '';
            if (imageProperties.iconSize) { properties.icon_size = imageProperties.iconSize; }
            if (imageProperties.height) { properties.height = imageProperties.height; }
            if (imageProperties.width) { properties.width = imageProperties.width; }
            if (imageProperties.paddingLeft) { style += `padding-left: ${imageProperties.paddingLeft};`; }
            if (imageProperties.paddingRight) { style += `padding-right: ${imageProperties.paddingRight};`; }
            if (imageProperties.className) { properties.styleClass = imageProperties.className; }

            if (style) {
                properties.style = style;
            }
            box.add_child(new St.Icon(properties));
        } else {
            loadWebImage(imageProperties.src, this.uuid, box, imageProperties.iconSize ?? imageProperties.height ?? -1, this.log);
        }

        return box;
    }

    addOnClickHandler(element: St.BoxLayout, handler: () => void): void {
        const id = element.connect(
            'button-press-event',
            handler,
        );
        this._addConnection(element, id);
    }

    destroy(): void {
        this._openConnections.forEach((ids, widget) => ids.forEach(id => widget.disconnect(id)));
    }

}