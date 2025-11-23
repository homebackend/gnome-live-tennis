import { ImageSourcePropType, StyleSheet } from "react-native";
import flags from "./flags";

export interface CommaSeparatedInputProperties {
    initialValuesArray: string[];
    summary: string;
    description: string;
    onChange: (values: string[]) => void;
}

export const flagImageSource = (ioc: string) => flags[`/flags/${ioc.toLowerCase()}.svg` as keyof typeof flags] as ImageSourcePropType;

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 10,
    },
    header: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 5,
        paddingHorizontal: 10,
    },
    headerDescription: {
        fontSize: 12,
        marginTop: 5,
        marginBottom: 5,
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 12,
    },
    description: {
        fontSize: 10,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
    },
    rangeInfo: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    input: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textAlign: 'center',
        borderRadius: 5,
    },
    textInput: {
        width: 200,
        height: 40,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
    },
    arrayOutputTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    arrayOutput: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    tag: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        marginRight: 5,
        marginBottom: 5,
        flexDirection: 'row',
    },
    tagText: {
        fontSize: 14,
    },
    deleteButton: {
        marginLeft: 5,
        padding: 3,
    },
    deleteButtonText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 12,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    flag: {
        width: 24,
        height: 18,
        marginRight: 10,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
    },
    checkboxPlaceholder: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
