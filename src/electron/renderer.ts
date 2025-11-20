import { getAlignItems, getAlignmentStyle, getJustifyContent, getTextAlignment } from "../common/app/renderer";
import { Alignment, ContainerItemProperties, ContainerProperties, ImageProperties, Renderer, SeparatorPropeties, TextProperties } from "../common/renderer";
import { StyleKeys } from "../common/style_keys";

export class ElectronRenderer extends Renderer<HTMLDivElement, HTMLSpanElement, HTMLImageElement> {
    openURL(url: string): void {
        throw new Error("Method not implemented.");
    }

    createContainer(properties?: ContainerProperties): HTMLDivElement {
        const div = document.createElement('div');
        if (properties) {
            if (properties.className) {
                div.className = properties.className;
            }
            if (properties.hidden) {
                div.style.display = 'none';
            } else {
                div.style.display = 'flex';
            }
            div.style.flexDirection = properties.vertical ? 'column' : 'row';
            div.style.flexWrap = 'nowrap';
            div.style.justifyContent = getJustifyContent(properties);
            div.style.alignItems = getAlignItems(properties);

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
            div.style.alignItems = getAlignmentStyle(properties.xAlign ? properties.xAlign : properties.yAlign!);
        }
        if (properties.visible === false) {
            div.style.visibility = 'hidden';
        } else {
            div.style.visibility = 'visible';
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

    private _wrapLink(url: string, content: string | HTMLImageElement): HTMLAnchorElement {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        if (content instanceof HTMLImageElement) {
            a.appendChild(content);
        } else {
            if (content.includes('<')) {
                a.innerHTML = content;
            } else {
                a.textContent = content;
            }
            a.title = content;
        }
        a.onclick = (e) => e.stopPropagation();

        return a;
    }

    addTextToContainer(container: HTMLDivElement, textProperties: TextProperties): HTMLSpanElement {
        const span = document.createElement('span');
        if (textProperties.className) {
            span.className = textProperties.className;
        }
        if (textProperties.link) {
            const a = this._wrapLink(textProperties.link, textProperties.text);
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
            span.style.textAlign = getTextAlignment(textProperties.textAlign);
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

        if (imageProperties.link) {
            const a = this._wrapLink(imageProperties.link, imageElement);
            this._createItemContainerAndAddItem(container, imageProperties, a);
        } else {
            this._createItemContainerAndAddItem(container, imageProperties, imageElement);
        }

        return imageElement;
    }

    addOnClickHandler(element: HTMLDivElement | HTMLSpanElement | HTMLImageElement, handler: () => void): void {
        element.onclick = handler;
    }

    destroy(): void {

    }
};
