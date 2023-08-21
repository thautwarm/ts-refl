import * as ts from 'typescript';
import { TypeDef, TypeRef } from '../src/index';
import { command, run, positional, string } from 'cmd-ts';
import fs from 'fs';

function anyType(): TypeRef {
    return { kind: 'primitive', name: 'any' };
}

function propNameToString(propName: ts.PropertyName | ts.EntityName): string {
    if (ts.isIdentifier(propName)) {
        return propName.text;
    }
    if (ts.isStringLiteral(propName)) {
        return propName.text;
    }
    throw new Error('Unknown property name kind: ' + ts.SyntaxKind[propName.kind]);
}

function visitType(node: ts.TypeNode): TypeRef {
    if (ts.isFunctionTypeNode(node)) {
        const paramTypes = node.parameters.map((param) => {
            if (!param.type)
                return anyType();
            return visitType(param.type);
        })
        const returnType = node.type ? visitType(node.type) : anyType();
        return {
            kind: 'function',
            paramTypes,
            returnType
        };
    }
    if (ts.isTypeLiteralNode(node)) {
        const fields = node.members.map((member) => {
            if (!ts.isPropertySignature(member)) {
                throw new Error('Expected property signature');
            }
            const name = propNameToString(member.name);
            const type = member.type ? visitType(member.type) : anyType();
            return { name, type };
        });

        return {
            kind: 'object',
            fields
        }
    }

    if (ts.isTypeReferenceNode(node)) {

        let pre: TypeRef = {
            kind: 'generic',
            name: propNameToString(node.typeName),
            typeParams: node.typeArguments ? node.typeArguments.map(visitType) : []
        };
        if (pre.typeParams.length == 0) {
            return {
                kind: 'primitive',
                name: pre.name
            }
        }
        return pre;
    }

    if (ts.isArrayTypeNode(node)) {
        return {
            kind: 'array',
            type: visitType(node.elementType)
        };
    }

    if (ts.isIdentifier(node)) {
        return {
            kind: 'primitive',
            name: node.text
        };
    }

    if (ts.isLiteralTypeNode(node)) {
        const literal = node.literal;
        if (ts.isStringLiteral(literal)) {
            return {
                kind: 'literal',
                value: literal.text
            };
        }

        if (ts.isNumericLiteral(literal)) {
            return {
                kind: 'literal',
                value: Number(literal.text)
            };
        }

        if (literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword) {
            return {
                kind: 'literal',
                value: literal.kind === ts.SyntaxKind.TrueKeyword
            };
        }

        if (literal.kind === ts.SyntaxKind.NullKeyword) {
            return {
                kind: 'literal',
                value: null
            };
        }

        if (literal.kind === ts.SyntaxKind.UndefinedKeyword) {
            return {
                kind: 'literal',
                value: undefined
            };
        }

        throw new Error('Unknown literal kind: ' + ts.SyntaxKind[literal.kind]);
    }

    if (ts.isUnionTypeNode(node)) {
        return {
            kind: 'union',
            types: node.types.map(visitType)
        };
    }

    if (node.kind === ts.SyntaxKind.StringKeyword)
        return { kind: 'primitive', name: 'string' };
    if (node.kind === ts.SyntaxKind.NumberKeyword)
        return { kind: 'primitive', name: 'number' };
    if (node.kind === ts.SyntaxKind.BooleanKeyword)
        return { kind: 'primitive', name: 'boolean' };
    if (node.kind === ts.SyntaxKind.NullKeyword)
        return { kind: 'literal', value: null };
    if (node.kind === ts.SyntaxKind.UndefinedKeyword)
        return { kind: 'literal', value: undefined };
    if (node.kind === ts.SyntaxKind.AnyKeyword)
        return { kind: 'primitive', name: 'any' };
    if (node.kind === ts.SyntaxKind.UnknownKeyword)
        return { kind: 'primitive', name: 'unknown' };
    if (node.kind === ts.SyntaxKind.VoidKeyword)
        return { kind: 'primitive', name: 'void' };
    if (node.kind === ts.SyntaxKind.NeverKeyword)
        return { kind: 'primitive', name: 'never' };
    if (node.kind === ts.SyntaxKind.ObjectKeyword)
        return { kind: 'primitive', name: 'object' };
    if (node.kind === ts.SyntaxKind.SymbolKeyword)
        return { kind: 'primitive', name: 'symbol' };

    throw new Error('Unknown type node kind: ' + ts.SyntaxKind[node.kind]);
}


function visitDef(node: ts.InterfaceDeclaration): TypeDef {
    const name = node.name.text;
    let typeParams = (node.typeParameters ?? []).map(
        (param) => param.name.text
    )

    const fields = node.members.map((member) => {
        if (!ts.isPropertySignature(member)) {
            throw new Error('Expected property signature');
        }
        const name = propNameToString(member.name);
        const type = member.type ? visitType(member.type) : anyType();
        const nullable = member.questionToken !== undefined;
        return { name, type, nullable };
    })

    return {
        name,
        typeParams,
        fields
    }
}

function parseTSFile(filePath: string): TypeDef[] {
    const program = ts.createProgram([filePath], {
        noEmitOnError: true,
        noImplicitAny: true,
        target: ts.ScriptTarget.ES2020,
        inlineSources: true,
        module: ts.ModuleKind.CommonJS
    });
    const sourceFile = program.getSourceFile(filePath);

    const defs: TypeDef[] = [];
    if (!sourceFile) {
        throw new Error('Could not find file: ' + filePath);
    }
    sourceFile.forEachChild((node) => {
        if (ts.isInterfaceDeclaration(node)) {
            const def = visitDef(node);
            defs.push(def);
        }
    });
    return defs;
}



const app = command({
    name: "tspi",
    args: {
        file: positional({ type: string, displayName: 'file' }),
        output: positional({ type: string, displayName: 'output' }),
    },
    handler: ({ file, output }) => {
        // read the file to the screen
        const defs = parseTSFile(file);
        const json = JSON.stringify(defs, null, 2);
        fs.writeFileSync(output, json);
    },
});

// parse arguments
run(app, process.argv.slice(2));
