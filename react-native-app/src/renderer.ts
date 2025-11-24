// Import shared types from your common directory
import uuid from 'react-native-uuid';
import React, { ReactElement, useEffect, useState } from 'react';
import { SvgUri } from 'react-native-svg';
import { ActivityIndicator, Dimensions, Image, ImageStyle, Linking, Pressable, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { RenderHTML } from 'react-native-render-html';

import { LRUCache } from '../../src/common/util';
import {
    ContainerItemProperties,
    ContainerProperties,
    ImageProperties,
    Renderer,
    SeparatorPropeties,
    TextProperties
} from '../../src/common/renderer';
import { getAlignItems, getAlignmentStyle, getJustifyContent } from '../../src/common/app/renderer';
import { StyleKeys } from '../../src/common/style_keys';
import flags from './flags';
import { getCssThemeStyles, LiveTennisTheme } from './style';

export interface RNElement {
    hidden?: boolean;
    parent?: RNElement;
    children?: (RNElement | ReactElementGenerator)[];
    handler?: () => void;
    element: () => ReactElement;
}

export type ReactElementGenerator = () => ReactElement;
type CSSStyle = ViewStyle | TextStyle | ImageStyle;

export class RNRenderer extends Renderer<RNElement, RNElement, RNElement> {
    private _imageSize: LRUCache<string, { width: number, height: number }> = new LRUCache(100);
    private _images: LRUCache<string, ReactElement> = new LRUCache(100);
    private _theme: LiveTennisTheme;

    constructor(basePath: string, log: (logs: string[]) => void, theme: LiveTennisTheme) {
        super(basePath, log);
        this._theme = theme;
    }

    private getCssStyle(className: string): CSSStyle[] {
        const themeStyles = getCssThemeStyles(this._theme);
        return className.split(' ').map(cn => themeStyles[cn]);
    }

    openURL(url: string): void {
        Linking.openURL(url).catch(err => console.error("Failed to open URL", err));
    }

    private _setExpand(properties: ContainerProperties | undefined, style: ViewStyle) {
        if (properties) {
            if ('xExpand' in properties) {
                if (properties.vertical) {
                    style.width = '100%';
                } else {
                    style.flex = 1;
                }
            }

            if ('yExpand' in properties) {
                if (properties.vertical) {
                    style.flex = 1;
                } else {
                    style.height = '100%';
                }
            }
        }
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
                        // This creates and Anonymouse node in dev tools
                        return React.createElement(c, { style: style });
                    }
                }) : [];

            let style: ViewStyle | undefined;
            let cssStyle: ViewStyle[] | undefined;

            if (properties) {
                if (properties.className) {
                    cssStyle = this.getCssStyle(properties.className);
                }
                const flexDirection = properties.vertical ? 'column' : 'row';

                style = {
                    flexDirection: flexDirection,
                    flexWrap: 'nowrap',
                    justifyContent: getJustifyContent(properties),
                    alignItems: getAlignItems(properties),
                };

                this._setExpand(properties, style);
            }

            const finalStyle = StyleSheet.flatten([cssStyle, style]);

            let wrapper: ReactElement[];

            if (containerElement.handler) {
                let pressableStyle: ViewStyle = {};
                if (properties) {
                    if ('xExpand' in properties) pressableStyle.flex = 1;
                    if ('yExpand' in properties) pressableStyle.flex = 1;
                    pressableStyle.flexDirection = properties.vertical ? 'column' : 'row';
                }
                wrapper = [React.createElement(Pressable, { key: uuid.v4().toString(), style: pressableStyle, onPress: containerElement.handler }, ...childElements)];
            } else {
                wrapper = childElements;
            }

            return React.createElement(View, { style: finalStyle, key: uuid.v4().toString() }, ...wrapper);
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

                const cssStyle = this.getCssStyle(classNameToUse);

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

        // Default is column in react native.
        style.flexDirection = 'row';
        if (properties.xExpand || properties.yExpand) {
            style.flexGrow = 1;
        }
        if (properties.xAlign || properties.yAlign) {
            style.justifyContent = getAlignmentStyle(properties.xAlign ? properties.xAlign : properties.yAlign);
        }
        if (properties.visible === false) {
            style.opacity = 0;
        } else {
            style.opacity = 1;
        }

        if (properties.paddingLeft) style.paddingLeft = parseInt(properties.paddingLeft, 10);
        if (properties.paddingRight) style.paddingRight = parseInt(properties.paddingRight, 10);

        return style;
    }

    addTextToContainer(container: RNElement, textProperties: TextProperties): RNElement {
        const textElement: RNElement = {
            element: (): ReactElement => {
                const textStyle: TextStyle = {};
                if (textProperties.textAlign) {
                    textProperties.xAlign = textProperties.textAlign;
                }

                const cssTextClassStyle = textProperties.className ? this.getCssStyle(textProperties.className) : undefined;
                const linkTextStyle = textProperties.link || textProperties.onClick ? this.getCssStyle(StyleKeys.MainMenuLinkButton) : undefined;

                let textContent: ReactElement;
                if (textProperties.text.includes('<')) {
                    const contentWidth = Dimensions.get('window').width;
                    textContent = React.createElement(RenderHTML, {
                        source: { html: textProperties.text },
                        contentWidth: contentWidth,
                    });
                } else {
                    textContent = React.createElement(Text, { style: [cssTextClassStyle, textStyle, linkTextStyle] }, textProperties.text);
                }

                let content: ReactElement;
                if (textProperties.link || textProperties.onClick) {
                    content = React.createElement(TouchableOpacity, {
                        style: [cssTextClassStyle, textStyle],
                        onPress: () => {
                            if (textProperties.link) {
                                this.openURL(textProperties.link);
                            }
                            if (textProperties.onClick) {
                                textProperties.onClick();
                            }
                        },
                    }, textContent);

                } else {
                    content = textContent;
                }

                const itemContainerStyle = this._createItemContainerStyle(textProperties);
                const cssItemClassStyle = textProperties.className ? this.getCssStyle(textProperties.className) : undefined;
                const finalContainerStyle = StyleSheet.flatten([cssItemClassStyle, itemContainerStyle]);

                return React.createElement(View, { style: finalContainerStyle, key: uuid.v4().toString() }, content);
            },
        };

        this.addContainersToContainer(container, textElement);

        return textElement;
    }

    addImageToContainer(container: RNElement, imageProperties: ImageProperties): RNElement {
        const imageSize = this._imageSize;
        const images = this._images;

        const image: RNElement = {
            element: (): ReactElement => {
                const CreateImage = (uri: string, expectedHeight: number, attribs: any) => {
                    const [dimensions, setDimensions] = useState(imageSize.get(uri) ?? { width: 0, height: 0 });
                    const [isLoading, setIsLoading] = useState(images.get(uri) ? false : true);
                    const [error, setError] = useState(false);

                    useEffect(() => {
                        const dimension = imageSize.get(uri);
                        if (dimension) {
                            setDimensions(dimension);
                            setIsLoading(false);
                            return;
                        }

                        const updateImage = (width: number, height: number) => {
                            imageSize.put(uri, { width: width, height: height });
                            setDimensions({ width, height });
                            setIsLoading(false);
                        };

                        if (uri.endsWith('.svg')) {
                            const processSvg = async () => {
                                const response = await fetch(uri);
                                const svgText = await response.text();

                                const widthMatch = svgText.match(/width="(\d+(\.\d+)?)"/);
                                const heightMatch = svgText.match(/height="(\d+(\.\d+)?)"/);
                                const viewBoxMatch = svgText.match(/viewBox="0 0 (\d+(\.\d+)?) (\d+(\.\d+)?)"/);

                                let width = 0;
                                let height = 0;

                                if (widthMatch && heightMatch) {
                                    width = parseFloat(widthMatch[1]);
                                    height = parseFloat(heightMatch[1]);
                                } else if (viewBoxMatch) {
                                    width = parseFloat(viewBoxMatch[1]);
                                    height = parseFloat(viewBoxMatch[3]);
                                }

                                if (width > 0 && height > 0) {
                                    updateImage(width, height);
                                } else {
                                    console.error("Failed to get svg image size");
                                    setError(true);
                                    setIsLoading(false);
                                }
                            };

                            processSvg();
                        } else {
                            Image.getSize(
                                uri,
                                (width, height) => {
                                    updateImage(width, height);
                                },
                                (err) => {
                                    console.error("Failed to get image size", err);
                                    setError(true);
                                    setIsLoading(false);
                                }
                            );
                        }
                    }, [uri]);

                    if (isLoading) {
                        return React.createElement(ActivityIndicator, { style: { height: expectedHeight } });
                    }

                    if (error || dimensions.width === 0 || dimensions.height === 0) {
                        return React.createElement(View, { style: { height: expectedHeight, justifyContent: 'center', alignItems: 'center' } },
                            React.createElement(Text, {}, 'Error loading image'),
                        )
                    }

                    const aspectRatio = dimensions.width / dimensions.height;

                    let imageElement = images.get(uri);
                    if (!imageElement) {
                        if (uri.endsWith('.svg')) {
                            imageElement = React.createElement(SvgUri, { uri: uri, ...attribs, width: '100%', height: '100%' });
                        } else {
                            imageElement = React.createElement(Image, { source: { uri: uri }, ...attribs, height: expectedHeight });
                        }

                        images.put(uri, imageElement);
                    }

                    return React.createElement(View, { style: { height: expectedHeight, aspectRatio: aspectRatio } }, imageElement);
                }

                const imageStyle: ImageStyle = {};

                if (imageProperties.isLocal) {
                    if (imageProperties.iconSize) imageStyle.height = imageProperties.iconSize;
                    if (imageProperties.height) imageStyle.height = imageProperties.height;
                    if (imageProperties.width) imageStyle.width = imageProperties.width;
                    imageStyle.height = imageStyle.width = imageStyle.height ? imageStyle.height : imageStyle.width;
                }

                const cssImageClassStyle = imageProperties.className ? this.getCssStyle(imageProperties.className) as ImageStyle[] : undefined;

                const attribs = {
                    style: StyleSheet.flatten([cssImageClassStyle, imageStyle]),
                    accessibilityLabel: imageProperties.alt,
                    key: uuid.v4().toString(),
                }

                let imageElement: ReactElement;

                if (imageProperties.isLocal) {
                    const source = flags[imageProperties.src as keyof typeof flags];
                    imageElement = React.createElement(Image, { source: source, ...attribs });
                } else {
                    const expectedHeight = imageProperties.height ? imageProperties.height : 20;
                    imageElement = CreateImage(imageProperties.src, expectedHeight, attribs);
                }

                const itemContainerStyle = this._createItemContainerStyle(imageProperties);
                const cssItemClassStyle = imageProperties.className ? this.getCssStyle(imageProperties.className) : undefined;
                const finalContainerStyle = StyleSheet.flatten([cssItemClassStyle, itemContainerStyle]);

                let wrappedElement: ReactElement;

                if (imageProperties.link || imageProperties.onClick) {
                    wrappedElement = React.createElement(TouchableOpacity, {
                        onPress: () => {
                            if (imageProperties.link) {
                                this.openURL(imageProperties.link);
                            }
                            if (imageProperties.onClick) {
                                imageProperties.onClick();
                            }
                        },
                    }, imageElement);
                } else {
                    wrappedElement = imageElement;
                }

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
