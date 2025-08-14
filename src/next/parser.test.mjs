import {describe, expect, it} from "@jest/globals";
import {parseHeader} from "./parser.mjs";
import {read} from "../../tests/setup.mjs";

describe('struct', () => {
    it('should ignore forward struct declaration', () => {
        const ast = parseHeader(read('tests/struct_forward.hpp'));

        expect(ast).toBeNull();
    });

    it('should parse empty structs', () => {
        const ast = parseHeader(read('tests/struct_empty.hpp'));

        expect(ast).toEqual(expect.objectContaining({
            'type': 'struct',
            'name': 'GameApp',
            'fields': [],
        }));
    });

    it('should parse struct and its fields', () => {
        const ast = parseHeader(read('tests/struct.hpp'));

        expect(ast).toEqual(expect.objectContaining({
            'type': 'struct',
            'name': 'GameApp',
            'fields': expect.arrayContaining([
                {'name': 'context', 'type': {'name': 'void', 'ptr': true}},
                {'name': 'delta', 'type': {'name': 'float'}},
                {'name': 'isRunning', 'type': {'name': 'bool'}},

                {'name': 'buffer', 'type': {'name': 'DynArray', 'templates': [{'name': 'int32_t'}]}},
                {'name': 'lines', 'type': {'name': 'DynArray',  'templates': [{'name': 'char', 'ptr': true}]}},

                {'name': 'pool', 'type': {'name': 'HashMap', 'templates': [{'name': 'uint64_t'}, {'name': 'CString'}]}},
            ]),
        }));
    });

    it('should parse structs within a namespace', () => {
        const ast = parseHeader(read('tests/struct_namespace.hpp'));

        expect(ast).toEqual(expect.objectContaining({
            'type': 'namespace',
            'name': 'Awesome',
            'children': [
                expect.objectContaining({
                    'type': 'struct',
                    'name': 'GameApp',
                    'fields': [],
                })
            ]
        }));
    });
});
