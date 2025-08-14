import {describe, expect, it} from "@jest/globals";
import {parseHeader} from "./parser.mjs";
import {read} from "../../tests/setup.mjs";

describe('struct', () => {
    it('should ignore forward structs declaration', () => {
        const ast = parseHeader(read('tests/struct_forward.hpp'));

        expect(ast).toHaveLength(0);
    });

    it('should parse empty structs', () => {
        const ast = parseHeader(read('tests/struct_empty.hpp'));

        expect(ast).toEqual([
            {
                'type': 'struct',
                'name': 'GameApp',
                'fields': [],
            },
            {
                'type': 'struct',
                'name': 'GameNetwork',
                'fields': [],
            }
        ]);
    });

    it('should parse struct and its fields', () => {
        const ast = parseHeader(read('tests/struct.hpp'));
        expect(ast).toHaveLength(1);

        const struct = ast[0];
        expect(struct).toEqual({
            'type': 'struct',
            'name': 'GameApp',
            'fields': [
                {'offset': 0, 'name': 'isRunning', 'type': {'name': 'bool'}},
                {'offset': 4, 'name': 'delta', 'type': {'name': 'float'}},
                {'offset': 8, 'name': 'context', 'type': {'name': 'void', 'ptr': true}},

                {'name': 'buffer', 'type': {'name': 'DynArray', 'templates': [{'name': 'int32_t'}]}},
                {'name': 'lines', 'type': {'name': 'DynArray', 'templates': [{'name': 'char', 'ptr': true}]}},

                {'name': 'pool', 'type': {'name': 'HashMap', 'templates': [{'name': 'uint64_t'}, {'name': 'CString'}]}},

                {'name': 'components',
                    'type': {
                        'name': 'DynArray',
                        'templates': [{'name': 'Handle', 'templates': [{'name': 'void', 'ptr': true}]}]
                    }
                },
            ],
        });
    });

    it('should parse structs within a namespace', () => {
        const ast = parseHeader(read('tests/struct_namespace.hpp'));

        expect(ast).toEqual([
            {
                'type': 'namespace',
                'name': 'Awesome',
                'children': [
                    {
                        'type': 'struct',
                        'name': 'GameApp',
                        'fields': [],
                    },
                    {
                        'type': 'struct',
                        'name': 'GameNetwork',
                        'fields': [],
                    },
                ]
            },

            {
                'type': 'namespace',
                'name': 'Epsiloon',
                'children': [
                    {
                        'type': 'struct',
                        'name': 'RendererSystem',
                        'fields': [],
                    },
                    {
                        'type': 'struct',
                        'name': 'AudioSystem',
                        'fields': [],
                    },
                ]
            }
        ]);
    });
});
