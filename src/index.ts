export type TypeRef =
    | { kind: 'primitive'; name: string }
    | { kind: 'array'; type: TypeRef }
    | { kind: 'generic'; name: string; typeParams: TypeRef[] }
    | { kind: 'object'; fields: { name: string; type: TypeRef }[] }
    | { kind: 'literal'; value: any }
    | { kind: 'union'; types: TypeRef[] }

export interface TypeDef {
    name: string;
    typeParams: string[];
    fields: { name: string; type: TypeRef }[];
}
