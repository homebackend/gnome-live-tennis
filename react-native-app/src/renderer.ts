// Import shared types from your common directory
import uuid from 'react-native-uuid';
import { Image, ImageStyle, Linking, Pressable, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import React, { ReactElement } from 'react';
import {
    ContainerItemProperties,
    ContainerProperties,
    ImageProperties,
    Renderer,
    SeparatorPropeties,
    TextProperties
} from '../../src/common/renderer';
import { getAlignItems, getAlignmentStyle, getJustifyContent, getTextAlignment } from '../../src/common/app/renderer';
import cssStyles from "../../src/common/style.css";
import { StyleKeys } from '../../src/common/style_keys';

export interface RNElement {
    hidden?: boolean;
    parent?: RNElement;
    children?: (RNElement | ReactElementGenerator)[];
    handler?: () => void;
    element: () => ReactElement;
}

export type ReactElementGenerator = () => ReactElement;

export class RNRenderer extends Renderer<RNElement, RNElement, RNElement> {
    private static CommonStyle = StyleSheet.create({
        linkText: {
            color: 'blue',
            textDecorationLine: 'underline',
        },
    });

    openURL(url: string): void {
        Linking.openURL(url).catch(err => console.error("Failed to open URL", err));
    }

    createContainer(properties?: ContainerProperties): RNElement {
        const createContainer = (containerElement: RNElement): ReactElement => {
            // Filter out hidden children and get element() call value
            const childElements = containerElement.children ? containerElement.children
                .filter(c => !('hidden' in c) || !c.hidden)
                .map(c => {
                    if ('element' in c) {
                        return c.element();
                    } else {
                        return React.createElement(c);
                    }
                }) : [];

            let style: ViewStyle | undefined;
            let cssStyle: ViewStyle | undefined;

            if (properties) {
                if (properties.className) {
                    cssStyle = cssStyles[properties.className];
                }
                const flexDirection = 'vertical' in properties ? properties.vertical ? 'column' : 'row' : 'row';

                style = {
                    flexDirection: flexDirection,
                    flexWrap: 'nowrap',
                    justifyContent: getJustifyContent(properties),
                    alignItems: getAlignItems(properties),
                };

                if ('xExpand' in properties) style.width = '100%';
                if ('yExpand' in properties) style.height = '100%';
            }

            const finalStyle = StyleSheet.flatten([cssStyle, style]);

            const viewElement = React.createElement(View, { style: finalStyle, key: uuid.v4().toString() }, ...childElements);
            if (containerElement.handler) {
                const wrapper = React.createElement(Pressable, { key: uuid.v4().toString(), onPress: containerElement.handler }, viewElement);
                return wrapper;
            } else {
                return viewElement;
            }
        }

        const containerElement: RNElement = {
            children: [],
            hidden: properties?.hidden,
            element: () => createContainer(containerElement),
        };

        return containerElement;
    }

    createSeparator(properties: SeparatorPropeties): RNElement {
        return {
            element: (): ReactElement => {
                let style: ViewStyle = {};
                let classNameToUse: string;

                if (properties.className) {
                    classNameToUse = properties.className;
                } else if (properties.vertical) {
                    classNameToUse = StyleKeys.SeparatorVertical;
                } else {
                    classNameToUse = StyleKeys.SeparatorHorizontal;
                }

                const cssStyle = cssStyles[classNameToUse] as ViewStyle | undefined;

                if (properties.vertical) {
                    if (properties.size) {
                        style.height = properties.size;
                    } else {
                        style.height = '100%';
                    }
                    style.width = properties.width ?? 2;
                } else {
                    style.height = properties.width ?? 2;
                    if (properties.size) {
                        style.width = properties.size;
                    } else {
                        style.width = '100%';
                    }
                }

                const finalStyle = StyleSheet.flatten([cssStyle, style]);

                return React.createElement(View, { style: finalStyle, key: uuid.v4().toString() });
            },
        };
    }

    addContainersToContainer(parent: RNElement, children: RNElement | RNElement[]): void {
        if (!parent.children) {
            parent.children = [];
        }

        if (Array.isArray(children)) {
            parent.children = [...parent.children, ...children];
        } else {
            parent.children.push(children);
        }
    }

    private _createItemContainerStyle(properties: ContainerItemProperties): ViewStyle {
        const style: ViewStyle = {};

        if (properties.xExpand || properties.yExpand) {
            style.flexGrow = 1;
        }
        if (properties.xAlign || properties.yAlign) {
            style.alignItems = getAlignmentStyle(properties.xAlign ? properties.xAlign : properties.yAlign);
        }
        if (!properties.visible) {
            style.opacity = 0;
        }

        if (properties.paddingLeft) style.paddingLeft = parseInt(properties.paddingLeft, 10);
        if (properties.paddingRight) style.paddingRight = parseInt(properties.paddingRight, 10);

        return style;
    }

    addTextToContainer(container: RNElement, textProperties: TextProperties): RNElement {
        const textElement: RNElement = {
            element: (): ReactElement => {
                const textStyle: TextStyle = {};
                if (textProperties.xExpand || textProperties.yExpand) {
                    textStyle.flexGrow = 1;
                }
                if (textProperties.textAlign) {
                    textStyle.textAlign = getTextAlignment(textProperties.textAlign);
                }

                // Get styles from CSS file if className is specified
                const cssTextClassStyle = textProperties.className ? cssStyles[textProperties.className] : undefined;

                let content: ReactElement;

                if (textProperties.link) {
                    // Wrap content in TouchableOpacity and use Linking API
                    content = React.createElement(TouchableOpacity, {
                        onPress: () => this.openURL(textProperties.link!),
                        // RN TouchableOpacity style doesn't have text style properties, 
                        // so apply link styles to the nested <Text>
                    }, React.createElement(Text, {
                        style: [cssTextClassStyle, textStyle, RNRenderer.CommonStyle.linkText]
                    }, textProperties.text));

                } else {
                    // Use standard Text component. RN does not support innerHTML
                    content = React.createElement(Text, {
                        style: [cssTextClassStyle, textStyle]
                    }, textProperties.text);
                }

                // Create the wrapper View style that applies padding/alignment/expand properties
                const itemContainerStyle = this._createItemContainerStyle(textProperties);
                const cssItemClassStyle = textProperties.className ? cssStyles[textProperties.className] : undefined;
                const finalContainerStyle = StyleSheet.flatten([cssItemClassStyle, itemContainerStyle]);

                // The RN equivalent of _createItemContainerAndAddItem is creating this wrapper View:
                return React.createElement(View, { style: finalContainerStyle, key: uuid.v4().toString() }, content);
            },
        };

        this.addContainersToContainer(container, textElement);

        return textElement;
    }

    addImageToContainer(container: RNElement, imageProperties: ImageProperties): RNElement {
        const image: RNElement = {
            element: (): ReactElement => {
                const imageStyle: ImageStyle = {}; // Start with a strict ImageStyle object

                // ... (source definition remains the same)
                const source = typeof imageProperties.src === 'string' ? { uri: imageProperties.src } : imageProperties.src;

                // RN Image needs explicit dimensions
                if (imageProperties.iconSize) imageStyle.height = imageProperties.iconSize;
                if (imageProperties.height) imageStyle.height = imageProperties.height;
                if (imageProperties.width) imageStyle.width = imageProperties.width;
                // ... (default size logic) ...

                // Retrieve the style object from the CSS import
                // We must explicitly cast this to ImageStyle because the declaration file uses a union type
                const cssImageClassStyle = cssStyles[imageProperties.className!] as ImageStyle | undefined;

                const imageElement = React.createElement(Image, {
                    source: source,
                    // The issue is here: StyleSheet.flatten can return a ViewStyle/ImageStyle union.
                    // We must ensure the result conforms to ImageStyle before passing it to <Image>
                    style: StyleSheet.flatten([cssImageClassStyle, imageStyle]),
                    accessibilityLabel: imageProperties.alt,
                    key: uuid.v4().toString(),
                });

                // --- The Fix: Create the surrounding container View for layout/padding/alignment ---

                // The item properties (padding, alignment, expand) should be applied to a parent <View>,
                // not the <Image> component itself, as those are ViewStyle properties.
                const itemContainerStyle = this._createItemContainerStyle(imageProperties); // This returns a ViewStyle
                const cssItemClassStyle = imageProperties.className ? cssStyles[imageProperties.className] : undefined;
                const finalContainerStyle = StyleSheet.flatten([cssItemClassStyle, itemContainerStyle]);

                let wrappedElement: ReactElement;

                if (imageProperties.link) {
                    // If there's a link, wrap the Image in a TouchableOpacity
                    wrappedElement = React.createElement(TouchableOpacity, {
                        onPress: () => this.openURL(imageProperties.link!),
                    }, imageElement);
                } else {
                    wrappedElement = imageElement;
                }

                // Return a <View> that handles the layout, containing the strict <Image> element
                return React.createElement(View, { style: finalContainerStyle, key: uuid.v4().toString() }, wrappedElement);
            },
        };

        this.addContainersToContainer(container, image);
        return image;
    }

    addOnClickHandler(element: RNElement, handler: () => void): void {
        element.handler = handler;
    }

    destroy(): void {

    }
}
