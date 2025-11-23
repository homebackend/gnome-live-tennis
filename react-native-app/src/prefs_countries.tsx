import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Countries } from "../../src/common/countries";
import { useState } from "react";
import { CommaSeparatedInputProperties, flagImageSource, styles } from "./prefs_common";
import { CountrySettingsNavigationProps } from "./types";

const CountrySelector: React.FC<CommaSeparatedInputProperties> = ({ initialValuesArray, summary, description, onChange }) => {
    const [selectedCountries, setSelectedCountries] = useState<string[]>(initialValuesArray);

    const toggleCountry = (countryIoc: string) => {
        let newSelectedCountries: string[];

        if (selectedCountries.includes(countryIoc)) {
            newSelectedCountries = selectedCountries.filter(ioc => ioc !== countryIoc);
        } else {
            newSelectedCountries = [...selectedCountries, countryIoc];
        }

        setSelectedCountries(newSelectedCountries);
        onChange(newSelectedCountries);
    };

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.header}>{summary}</Text>
                <Text style={styles.headerDescription}>{description}</Text>
            </View>
            <ScrollView style={styles.container}>
                {Countries.map(country => {
                    const isSelected = selectedCountries.includes(country.ioc);
                    const flagSource = flagImageSource(country.ioc.toLowerCase());
                    if (!flagSource) {
                        return null;
                    }

                    return (
                        <TouchableOpacity
                            key={country.ioc}
                            style={styles.countryItem}
                            onPress={() => toggleCountry(country.ioc)}
                        >
                            <Image source={flagSource} style={styles.flag} />
                            <Text style={styles.countryName}>{country.name}</Text>
                            <View style={styles.checkboxPlaceholder}>
                                {isSelected && <Text>✓</Text>}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export const CountryPreferencesScreen = ({ route }: CountrySettingsNavigationProps) => {
    const { summary, description, key, initialValues, settings } = route.params;
    const [selectedCountries, setSelectedCountries] = useState(initialValues);

    const handleChange = (values: string[]) => {
        setSelectedCountries([...values]);
        settings.setStrv(key, values);
    };


    return <CountrySelector
        summary={summary!}
        description={description!}
        initialValuesArray={selectedCountries}
        onChange={(values: string[]) => handleChange(values)}
    />
}
