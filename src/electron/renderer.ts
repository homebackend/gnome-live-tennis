import { Alignment, ContainerItemProperties, ContainerProperties, ImageProperties, Renderer, SeparatorPropeties, TextProperties } from "../common/renderer.js";
import { StyleKeys } from "./style_keys.js";

export class ElectronRenderer extends Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement> {
    openURL(url: string): void {
        throw new Error("Method not implemented.");
    }

    private _getAlignment(alignment: Alignment): string {
        switch (alignment) {
            case Alignment.Begin: return 'flex-start';
            case Alignment.End: return 'flex-end';
            case Alignment.Center: return 'center';
        }
    }

    private _getTextAlignment(alignment: Alignment): string {
        switch (alignment) {
            case Alignment.Begin: return 'left';
            case Alignment.End: return 'right';
            case Alignment.Center: return 'center';
        }
    }

    createContainer(properties?: ContainerProperties): HTMLDivElement {
        const div = document.createElement('div');
        if (properties) {
            if (properties.className) {
                div.className = properties.className;
            }
            div.style.display = 'flex';
            div.style.flexDirection = properties.vertical ? 'column' : 'row';
            div.style.flexWrap = 'nowrap';
            if (properties.vertical) {
                div.style.justifyContent = this._getAlignment(properties.yAlign ?? Alignment.Begin);                
                div.style.alignItems = this._getAlignment(properties.xAlign ?? Alignment.Begin);
            } else {
                div.style.justifyContent = this._getAlignment(properties.xAlign ?? Alignment.Begin);
                div.style.alignItems = this._getAlignment(properties.yAlign ?? Alignment.Begin);
            }

            if (properties.xExpand) {
                div.style.width = '100%';
            }
            if (properties.yExpand) {
                div.style.height = '100%';
            }
        }

        return div;
    }

    createSeparator(properties: SeparatorPropeties): HTMLDivElement {
        const div = document.createElement('div');

        if (properties.className) {
            div.className = properties.className;
        } else if (properties.vertical) {
            div.className = StyleKeys.SeparatorVertical;
        } else {
            div.className = StyleKeys.SeparatorHorizontal;
        }

        if (properties.vertical) {
            if (properties.size) {
                div.style.height = `${properties.size}px`;
            } else {
                div.style.height = '100%';
            }
            div.style.width = `${properties.width ?? 2}px`;
        } else {
            div.style.height = `${properties.width ?? 2}px`;
            if (properties.size) {
                div.style.width = `${properties.size}px`;
            } else {
                div.style.width = '100%';
            }
        }

        return div;
    }

    addContainersToContainer(parent: HTMLDivElement, children: HTMLDivElement | HTMLDivElement[]): void {
        (Array.isArray(children) ? children : [children]).forEach(child => parent.appendChild(child));
    }

    private _createItemContainerAndAddItem(container: HTMLDivElement, properties: ContainerItemProperties, item: HTMLElement) {
        const div = document.createElement('div');
        // This div is contained within container div - which has its display set to flex and is either vertical or horizontal.
        div.style.display = 'flex';
        div.className = item.className;

        if (properties.xExpand || properties.yExpand) {
            div.style.flexGrow = '10';
            div.style.width = '100%';
        }
        if (properties.xAlign || properties.yAlign) {
            div.style.alignItems = this._getAlignment(properties.xAlign ? properties.xAlign : properties.yAlign!);
        }
        if (properties.visibility) {
            div.style.visibility = properties.visibility;
        }
        if (properties.attributes) {
            properties.attributes.forEach((value, key) => div.setAttribute(key, value));
        }
        if (properties.onClick) {
            this.addOnClickHandler(div, properties.onClick);
        }
        if (properties.paddingLeft) {
            div.style.paddingLeft = properties.paddingLeft;
        }
        if (properties.paddingRight) {
            div.style.paddingRight = properties.paddingRight;
        }

        div.appendChild(item);
        container.appendChild(div);
    }

    addTextToContainer(container: HTMLDivElement, textProperties: TextProperties): HTMLSpanElement {
        const span = document.createElement('span');
        if (textProperties.className) {
            span.className = textProperties.className;
        }
        if (textProperties.link) {
            const a = document.createElement('a');
            a.href = textProperties.link;
            a.target = '_blank';
            if (textProperties.text.includes('<')) {
                a.innerHTML = textProperties.text;
            } else {
                a.textContent = textProperties.text;
            }
            a.title = textProperties.text;
            span.appendChild(a);
        } else {
            if (textProperties.text.includes('<')) {
                span.innerHTML = textProperties.text;
            } else {
                span.textContent = textProperties.text;
            }
        }
        if (textProperties.xExpand || textProperties.yExpand) {
            span.style.flexGrow = '10';
        }
        if (textProperties.textAlign) {
            span.style.textAlign = this._getTextAlignment(textProperties.textAlign);
        }

        this._createItemContainerAndAddItem(container, textProperties, span);

        return span;
    }

    addImageToContainer(container: HTMLDivElement, imageProperties: ImageProperties): HTMLImageElement {
        const imageElement = document.createElement('img');
        imageElement.src = imageProperties.src;
        if (imageProperties.alt) {
            imageElement.alt = imageProperties.alt;
        }
        if (imageProperties.title) {
            imageElement.title = imageProperties.title;
        }
        if (imageProperties.iconSize) {
            imageElement.height = imageProperties.iconSize;
        }
        if (imageProperties.height) {
            imageElement.height = imageProperties.height;
        }
        if (imageProperties.width) {
            imageElement.width = imageProperties.width;
        }
        if (imageProperties.className) {
            imageElement.className = imageProperties.className;
        }

        this._createItemContainerAndAddItem(container, imageProperties, imageElement);

        return imageElement;
    }

    addOnClickHandler(element: HTMLDivElement | HTMLSpanElement | HTMLImageElement, handler: () => void): void {
        element.onclick = handler;
    }

    destroy(): void {

    }
};
