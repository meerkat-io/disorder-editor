import * as yaml from 'js-yaml';

export interface Schema {
    schema: string;
    version: string;
    package: string;
    import: string[];
    messages: Map<string, Map<string, string>>;
    enums: Map<string, string[]>;
    services: Map<string, Map<string, Rpc>>;
}

export interface Rpc {
    input: string;
    output: string;
}

export function loadSchema(schema: string): Schema {
    return yaml.load(schema) as Schema;
}