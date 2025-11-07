import { Countries } from "../common/countries.js";
import { prefs, PrefSchema, schema } from "../common/schema.js";
import { StyleKeys } from "./style_keys.js";

declare global {
    interface Window {
        preferences: {
            log(log: string[]): void;
            closeWindow(): void;
            getSettingBoolean: (key: string) => Promise<boolean>;
            getSettingInt: (key: string) => Promise<number>;
            getSettingStrV: (key: string) => Promise<string[]>;
            setSettingBoolean: (key: string, value: boolean) => void;
            setSettingInt: (key: string, value: number) => void;
            setSettingStrv: (key: string, value: string[]) => void;
        }
    }
}

async function getSetting(property: string): Promise<HTMLDivElement> {
    const item = schema[property];

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'row';
    row.style.justifyContent = 'space-between';
    row.style.padding = '10px';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    row.appendChild(left);

    // Create the Label (using 'summary' or capitalizing the key if summary isn't available)
    const summary = document.createElement('label');
    summary.textContent = item.summary || property;
    summary.htmlFor = property;
    summary.style.fontWeight = 'bolder';
    summary.style.fontSize = '16px';
    left.appendChild(summary);

    if (item.description) {
        const description = document.createElement('label');
        description.textContent = item.description
        description.htmlFor = property;
        description.style.fontWeight = 'lighter';
        description.style.fontSize = '12px';
        left.appendChild(description);
    }

    // Create the Input Element
    let inputElement: HTMLElement;

    switch (item.type) {
        case 'boolean':
            {
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = property;
                input.checked = await window.preferences.getSettingBoolean(property);
                input.addEventListener('change', (e) => {
                    const input = e.target as HTMLInputElement;
                    window.preferences.setSettingBoolean(property, input.checked);
                });
                inputElement = input;
            }
            break;

        case 'number':
            {
                const input = document.createElement('input');
                input.type = 'number';
                input.id = property;
                input.value = (await window.preferences.getSettingInt(property)).toString();
                if (item.minimum !== undefined) input.min = item.minimum.toString();
                if (item.maximum !== undefined) input.max = item.maximum.toString();
                input.addEventListener('change', (e) => {
                    const input = e.target as HTMLInputElement;
                    window.preferences.setSettingInt(property, Number(input.value));
                });
                inputElement = input;
            }
            break;

        case 'array':
            console.log([!item.items, item.items?.type == 'string', item.items?.enum != 'country']);
            if (!item.items || (item.items.type == 'string' && (!item.items.enum || item.items.enum != 'country'))) {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = property;
                input.value = (await window.preferences.getSettingStrV(property)).join(', ');
                input.addEventListener('change', (e) => {
                    const input = e.target as HTMLInputElement;
                    const values = input.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    window.preferences.setSettingStrv(property, values);
                });
                inputElement = input;
            } else {
                const div = document.createElement('div');
                div.style.display = 'flex'; 
                div.style.flexDirection = 'column'; 
                div.style.height = '200px'; 
                div.style.overflow = 'scroll';

                let selectedCountries = await window.preferences.getSettingStrV(property);
                Countries.forEach(country => {
                    const countryItem = document.createElement('div');

                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = property;
                    input.checked = selectedCountries.includes(country.ioc);
                    const handler = () => {
                        const checked = !input.checked;
                        input.checked = checked;

                        if (checked) {
                            selectedCountries.push(country.ioc);
                        } else {
                            selectedCountries = selectedCountries.filter(v => v != country.ioc);
                        }

                        window.preferences.setSettingStrv(property, selectedCountries);
                    };
                    input.addEventListener('click', handler);
                    countryItem.appendChild(input);
                    

                    const flag = document.createElement('img');
                    flag.src = `flags/${country.ioc.toLowerCase()}.svg`;
                    flag.width = 24;
                    flag.height = 18;
                    countryItem.appendChild(flag);

                    const text = document.createElement('span');
                    text.textContent = country.name;
                    countryItem.appendChild(text);

                    countryItem.addEventListener('click', handler);
                    div.appendChild(countryItem);
                });

                inputElement = div;
            }
            break;
    }

    row.appendChild(inputElement!);
    return row;
}

function addToAccumulator(accumulator: HTMLElement, current: HTMLDivElement): HTMLElement {
    if (accumulator.children.length > 0) {
        const sep = document.createElement('div');
        sep.style.width = '100%';
        sep.style.height = '2px';
        sep.className = StyleKeys.SeparatorHorizontal;
        accumulator.appendChild(sep);
    }

    accumulator.appendChild(current);
    return accumulator;
}

async function getGroup(pref: PrefSchema): Promise<HTMLDivElement> {
    const row = document.createElement('div');
    row.style.width = '100%'
    row.style.display = 'flex'
    row.style.flexDirection = 'column';

    const title = document.createElement('span');
    title.style.width = '100%';
    title.textContent = pref.title;
    title.style.fontWeight = 'bolder';
    title.style.fontSize = '16px';
    title.style.paddingTop = '20px';
    title.style.paddingBottom = '10px';
    row.appendChild(title);

    const description = document.createElement('span');
    description.style.width = '100%';
    description.textContent = pref.description;
    description.style.fontWeight = 'lighter';
    description.style.fontSize = '12px';
    description.style.paddingBottom = '10px';
    row.appendChild(description);

    const settings = document.createElement('div');
    settings.style.width = '100%';
    settings.style.display = 'flex'
    settings.style.flexDirection = 'column';
    settings.style.backgroundColor = '#343437';
    settings.style.borderRadius = '10px';
    row.appendChild(settings);

    (await Promise.all(pref.properties.map(property => getSetting(property)))).reduce((accumulator, current) => addToAccumulator(accumulator, current), settings as HTMLElement);

    return row;
}

async function showPreferences() {
    const root = document.getElementById('root');

    if (root) {
        (await Promise.all(prefs.map(p => getGroup(p)))).reduce((accumulator, current) => addToAccumulator(accumulator, current), root);
    }
}

document.addEventListener('DOMContentLoaded', showPreferences);

document.getElementById('close-btn')!.addEventListener('click', () => {
    window.preferences.closeWindow();
});
