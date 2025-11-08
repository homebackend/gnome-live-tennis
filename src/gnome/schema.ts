import { js2xml } from 'xml-js';
import { promises as fs } from 'fs';
import { schema } from '../common/schema.js';

function getType(valueType: string, items: { type: string } = { type: 'none' }): string {
    switch (valueType) {
        case 'boolean': return 'b';
        case 'number': return 'i';
        case 'array':
            if (items.type == 'string') return 'as';
            break;
    }

    return '';
}

async function toSchemaXml(path: string, schemaId: string, schemaPath: string): Promise<void> {
    const keys = Object.keys(schema).map(key => {
        const value = schema[key as keyof typeof schema];
        const n = {
            _attributes: {
                name: key.replaceAll('_', '-'),
                type: 'items' in value ? getType(value.type, value.items) : getType(value.type),
            },
            default: Array.isArray(value.default) ? { _text: '[]' } : value.default,
            summary: { _text: value.summary },
            description: { _text: value.description },
        };

        if ('minimum' in value && 'maximum' in value) {
            return {
                ...n,
                range: {
                    _attributes: {
                        min: value.minimum,
                        max: value.maximum,
                    }
                }
            }
        }

        return n;
    });

    const xml = {
        _declaration: { _attributes: { version: '1.0', encoding: 'UTF-8' } },
        schemalist: {
            schema: {
                _attributes: { id: schemaId, path: schemaPath },
                key: keys,
            }
        }
    };

    const xmlString = js2xml(xml, { compact: true, spaces: 4, fullTagEmptyElement: true });

    try {
        await fs.writeFile(path, xmlString);
        console.log(`Successfully generated file: ${path}`);
    } catch (error) {
        console.error(`Error writing to file: ${error}`);
    }
}

toSchemaXml('dist-gnome/schemas/org.gnome.shell.extensions.live-tennis.gschema.xml', 'org.gnome.shell.extensions.live-tennis', '/org/gnome/shell/extensions/live-tennis/');
