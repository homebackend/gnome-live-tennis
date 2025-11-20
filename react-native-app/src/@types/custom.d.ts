declare module "*.css" {
    import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

    const content: Record<string, ViewStyle | TextStyle | ImageStyle>;
    export default content;
}
