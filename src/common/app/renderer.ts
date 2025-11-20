import { AlignItems, Alignment, ContainerProperties, JustifyContent, TextAlign } from "../renderer";

export function getAlignmentStyle(alignment: Alignment | undefined): 'flex-start' | 'flex-end' | 'center' {
    switch (alignment) {
        case Alignment.Begin: return 'flex-start';
        case Alignment.End: return 'flex-end';
        case Alignment.Center: return 'center';
        default: return 'flex-start';
    }
}

export function getTextAlignment(alignment: Alignment): TextAlign {
    switch (alignment) {
        case Alignment.Begin: return 'left';
        case Alignment.End: return 'right';
        case Alignment.Center: return 'center';
    }
}

export function getJustifyContent(properties: ContainerProperties): JustifyContent {
    if (properties.justifyContent) {
        return properties.justifyContent;
    }

    if (properties.vertical) {
        return getAlignmentStyle(properties.yAlign ?? Alignment.Begin);
    }

    return getAlignmentStyle(properties.xAlign ?? Alignment.Begin)
}

export function getAlignItems(properties: ContainerProperties): AlignItems {
    if (properties.alignItems) {
        return properties.alignItems;
    }

    if (properties.vertical) {
        return getAlignmentStyle(properties.xAlign ?? Alignment.Begin);
    }

    return getAlignmentStyle(properties.yAlign ?? Alignment.Begin);
}
