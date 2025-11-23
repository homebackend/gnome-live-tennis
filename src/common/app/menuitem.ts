import { getMatchMenuItemProperties, LinkMenuItemProperties, PopubSubMenuItemProperties } from "../menuitem";
import { Renderer } from "../renderer";
import { StyleKeys } from "../style_keys";

export const TextMenuClosed = '▶';
export const TextMenuOpen = '▼';

export function getPopupSubMenuItem<ContainerType, TextType, ImageType>(
    isExpanded: boolean, toggleIsExpanded: (handler: () => void) => void,
    properties: PopubSubMenuItemProperties, r: Renderer<ContainerType, TextType, ImageType>
): [ContainerType, ContainerType, TextType] {
    const eventElement = r.createContainer({ className: StyleKeys.MainMenuTournamentItem, xExpand: true });
    if (properties.url) {
        r.addImageToContainer(eventElement, { src: properties.url, alt: properties.event.type, height: 20, paddingRight: '5px' });
    }
    r.addTextToContainer(eventElement, { text: properties.text, className: StyleKeys.NoWrapText, xExpand: true });
    const indicator = r.addTextToContainer(eventElement, {
        text: isExpanded ? TextMenuOpen : TextMenuClosed,
        className: StyleKeys.MainMenuEventIndicator
    });

    const menuContainer = r.createContainer({ vertical: true, xExpand: true, hidden: !isExpanded });
    const wrapper = r.createContainer({ vertical: true, xExpand: true });
    r.addContainersToContainer(wrapper, [eventElement, menuContainer]);

    r.addOnClickHandler(eventElement, () => toggleIsExpanded(() => {
        if (properties.clickHandler) {
            properties.clickHandler();
        }
    }));

    return [wrapper, menuContainer, indicator];
}

export function getLinkMenuItem<ContainerType, TextType, ImageType>(
    properties: LinkMenuItemProperties,
    r: Renderer<ContainerType, TextType, ImageType>,
): ContainerType {
    const item = r.createContainer({ xExpand: true, className: StyleKeys.MainMenuMatchItem });
    properties.menuUrls.forEach(menuUrl => r.addTextToContainer(item, {
        text: menuUrl.title,
        link: menuUrl.url,
        paddingRight: '5px',
    }));

    return item;
}

function addCheckmark<ContainerType, TextType, ImageType>(
    r: Renderer<ContainerType, TextType, ImageType>,
    c: ContainerType, isVisible: boolean, toggleHandler: () => void,
): TextType {
    const element = r.addTextToContainer(c, {
        text: '✓',
        className: StyleKeys.MainMenuCheckMark,
        visible: isVisible,
        paddingRight: '5px',
    });
    r.addOnClickHandler(element, () => toggleHandler());

    return element;
}

export function getCheckedMenuItem<ContainerType, TextType, ImageType>(
    r: Renderer<ContainerType, TextType, ImageType>,
    checked: boolean,
    toggleHandler: () => void,
): [ContainerType, TextType, ContainerType] {
    const item = r.createContainer(getMatchMenuItemProperties());
    const checkMarkItem = addCheckmark(r, item, checked, toggleHandler);
    const itemData = r.createContainer({ xExpand: true });
    r.addOnClickHandler(itemData, () => toggleHandler());
    r.addContainersToContainer(item, itemData);

    return [item, checkMarkItem, itemData];
}