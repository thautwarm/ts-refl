# TS-REFL

This project builds a simple executable that extracts TypeScript type definitions into the following data type structure for the sake of code generation:

```typescript
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
```

The project could not get registered as I cannot pass NPM's human verification.
