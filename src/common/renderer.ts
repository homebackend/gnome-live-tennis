import { StyleKeys } from "./style_keys";

export enum Alignment {
    Begin,
    Center,
    End,
};

export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type TextAlign = 'auto' | 'left' | 'right' | 'center' | 'justify';

export interface ContainerProperties {
    vertical?: boolean;
    className?: string;
    xAlign?: Alignment;
    yAlign?: Alignment;
    xExpand?: boolean;
    yExpand?: boolean;
    hidden?: boolean;
    justifyContent?: JustifyContent; // Specific to div
    alignItems?: AlignItems; // Specific to div
}

export interface SeparatorPropeties {
    className?: string;
    vertical?: boolean;
    size?: number;
    width?: number;
}

export interface ContainerItemProperties {
    xAlign?: Alignment;
    yAlign?: Alignment;
    xExpand?: boolean;
    yExpand?: boolean;
    paddingLeft?: string;
    paddingRight?: string;
    attributes?: Map<string, string>;
    visible?: boolean;
    onClick?: () => void;
}

export interface TextProperties extends ContainerItemProperties {
    text: string;
    isMarkup?: boolean;
    className?: string;
    link?: string;
    textAlign?: Alignment;
};

export interface ImageProperties extends ContainerItemProperties {
    src: string;
    isLocal?: boolean;
    link?: string;
    className?: string;
    iconSize?: number;
    height?: number;
    width?: number;
    alt?: string;
    title?: string;
};

export abstract class Renderer<T, TextType, ImageType> {
    protected basePath: string;
    protected log: (logs: string[]) => void;

    constructor(basePath: string, log: (logs: string[]) => void) {
        this.basePath = basePath;
        this.log = log;
    }

    abstract openURL(url: string): void;

    abstract createContainer(properties?: ContainerProperties): T;
    abstract createSeparator(properties: SeparatorPropeties): T;
    abstract addContainersToContainer(parent: T, children: T | T[]): void;

    addSeparatorToContainer(parent: T, properties: SeparatorPropeties): void {
        this.addContainersToContainer(parent, this.createSeparator(properties));
    }

    abstract addTextToContainer(container: T, textProperties: TextProperties): TextType;
    abstract addImageToContainer(container: T, imageProperties: ImageProperties): ImageType;

    addFlagToContainer(container: T, countryCode: string, className: string = StyleKeys.LiveViewPlayerFlag,
        iconSize: number | undefined = 16, padding?: string): ImageType {
        const flagPath = `${this.basePath}/flags/${countryCode.toLowerCase()}.svg`;
        return this.addImageToContainer(container, {
            src: flagPath,
            isLocal: true,
            alt: countryCode,
            title: countryCode,
            className: className,
            iconSize: iconSize,
            paddingRight: padding,
        });
    }

    abstract addOnClickHandler(element: T | TextType | ImageType, handler: () => void): void;
    abstract destroy(): void;
}

export type SameTypedRenderer<T> = Renderer<T, T, T>;

