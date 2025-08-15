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
                {'name': 'kMode', 'type': {'static': true, 'constexpr': true, 'const': true, 'name': 'bool'}},

                {'offset': 0x0, 'name': 'isRunning', 'type': {'name': 'bool'}},
                {'offset': 0x4, 'name': 'delta', 'type': {'name': 'float'}},
                {'offset': 0x8, 'name': 'context', 'type': {'name': 'void', 'ptr': true}},

                {'offset': 0x10, 'name': 'buffer', 'type': {'name': 'DynArray', 'templates': [{'name': 'int32_t'}]}},
                {'offset': 0x20, 'name': 'lines', 'type': {'name': 'DynArray', 'templates': [{'name': 'char', 'ptr': true}]}},

                {'name': 'pool', 'type': {'name': 'HashMap', 'templates': [{'name': 'uint64_t'}, {'name': 'CString'}]}},

                {
                    'name': 'components',
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

    it('should parse structs with nested namespaces', () => {
        const ast = parseHeader(read('tests/struct_namespace_nested.hpp'));

        expect(ast).toEqual([
            {
                'type': 'namespace',
                'name': 'Awesome',
                'children': [
                    {
                        'type': 'namespace',
                        'name': 'Event',
                        'children': [
                            {
                                'type': 'struct',
                                'name': 'EventListener',
                                'fields': [],
                            }
                        ],
                    },
                ]
            },
        ]);
    });

    it('should parse structs with templates', () => {
        const ast = parseHeader(read('tests/struct_template.hpp'));

        expect(ast).toEqual([
            // Vector<T>
            {
                'type': 'struct',
                'name': 'Vector',
                'templates': [
                    {'name': 'T'},
                ],
                'fields': [
                    {'offset': 0x0, 'type': {'name': 'T', 'ptr': true}, 'name': 'items'},
                    {'offset': 0x8, 'type': {'name': 'uint32_t'}, 'name': 'size'},
                    {'offset': 0xC, 'type': {'name': 'uint32_t'}, 'name': 'capacity'}
                ]
            },

            // Pair<K, V>
            {
                'type': 'struct',
                'name': 'Pair',
                'templates': [
                    {'name': 'K'},
                    {'name': 'V'},
                ],
                'fields': [
                    {'type': {'name': 'K'}, 'name': 'key'},
                    {'type': {'name': 'V'}, 'name': 'value'},
                ]
            },

            // Map<K, V>
            {
                'type': 'struct',
                'name': 'Map',
                'templates': [
                    {'name': 'K'},
                    {'name': 'V'},
                ],
                'fields': [
                    {'type': {'name': 'Pair', 'templates': [{'name': 'K'}, {'name': 'V'}]}, 'name': 'pairs'},
                    {'type': {'name': 'uint32_t'}, 'name': 'size'},
                    {'type': {'name': 'uint32_t'}, 'name': 'capacity'}
                ]
            }
        ]);
    });
});
