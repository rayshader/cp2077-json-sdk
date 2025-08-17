import {describe, expect, it} from "@jest/globals";
import {parseCPP} from "./parser.mjs";
import {read, withFormatter} from "../tests/setup.mjs";

describe('enum', () => {
    it('should parse enum', () => {
        let ast = withFormatter(parseCPP(read('tests/enum.hpp')));

        expect(ast).toEqual([
            {
                type: 'enum',
                name: 'EGameMode',
                values: [
                    {name: 'Singleplayer', value: 0},
                    {name: 'Multiplayer', value: 1},
                    {name: 'Count', value: 2},
                    {name: 'Invalid', value: 3},
                ]
            },
            {
                type: 'enum',
                name: 'EShape',
                base: 'int8_t',
                values: [
                    {name: 'Rectangle', value: 0},
                    {name: 'Circle', value: 1},
                    {name: 'Triangle', value: 2},
                    {name: 'Count', value: 3},
                    {name: 'Invalid', value: 4},
                ]
            },
            {
                type: 'enum',
                name: 'ETextureFormat',
                base: 'uint16_t',
                values: [
                    {name: 'RGB', value: 0},
                    {name: 'RGBA', value: 1},
                    {name: 'DXT', value: 2},

                    {name: 'RGB_Unsigned', value: 'RGB'},
                    {name: 'DXT_Unsigned', value: 'DXT'},
                ]
            },
        ]);
    });
});

describe('struct', () => {
    it('should ignore forward structs declaration', () => {
        let ast = withFormatter(parseCPP(read('tests/struct_forward.hpp')));

        expect(ast).toHaveLength(0);
    });

    it('should parse empty structs', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_empty.hpp')));

        expect(ast).toEqual([
            {
                type: 'struct',
                name: 'GameApp',
                nested: [],
                fields: [],
            },
            {
                type: 'struct',
                name: 'GameNetwork',
                nested: [],
                fields: [],
            }
        ]);
    });

    it('should parse struct and its fields', () => {
        const ast = withFormatter(parseCPP(read('tests/struct.hpp')));
        expect(ast).toHaveLength(1);

        const struct = ast[0];
        expect(struct).toEqual({
            type: 'struct',
            name: 'GameApp',
            nested: [],
            fields: [
                {
                    name: 'kMode',
                    type: {'static': true, 'constexpr': true, 'const': true, name: 'bool'},
                    default: 'true'
                },
                {
                    name: 'kPi',
                    type: {'static': true, 'constexpr': true, 'const': true, name: 'float'},
                    default: 3.141592
                },
                {name: 'kMax', type: {'static': true, 'constexpr': true, 'const': true, name: 'int32_t'}, default: 128},
                {
                    name: 'kAudioSize',
                    type: {'static': true, 'constexpr': true, 'const': true, name: 'uint32_t'},
                    default: 'ESystemPoolSize::Audio'
                },

                {offset: 0x0, name: 'isRunning', type: {name: 'bool'}},
                {offset: 0x4, name: 'delta', type: {name: 'float'}},
                {offset: 0x8, name: 'context', type: {name: 'void', 'ptr': true}},

                {offset: 0x10, name: 'buffer', type: {name: 'DynArray', templates: [{name: 'int32_t'}]}},
                {offset: 0x20, name: 'lines', type: {name: 'DynArray', templates: [{name: 'char', 'ptr': true}]}},

                {offset: 0x30, name: 'unk30', type: {name: 'uint8_t', fixedArray: 0x1B}},
                {offset: 0x4B, name: 'unk4B', type: {name: 'uint8_t', fixedArray: 0x10}},
                {name: 'unk78', type: {name: 'uintptr_t', fixedArray: 0x18}},

                {name: 'pool', type: {name: 'HashMap', templates: [{name: 'uint64_t'}, {name: 'CString'}]}},

                {
                    name: 'components',
                    type: {
                        name: 'DynArray',
                        templates: [{name: 'Handle', templates: [{name: 'void', 'ptr': true}]}]
                    }
                },

                {name: 'vehicle', type: {namespaces: ['game', 'vehicle'], name: 'BaseObject'}},
                {name: 'gameObject', type: {namespaces: ['game'], name: 'Object', ptr: true}},
                {
                    name: 'world',
                    type: {
                        name: 'Handle',
                        templates: [
                            {namespaces: ['game', 'world'], name: 'worldNode'}
                        ]
                    }
                },
                {
                    name: 'gameObjectRef',
                    type: {
                        name: 'Handle',
                        templates: [
                            {namespaces: ['game'], name: 'Object', ptr: true}
                        ]
                    }
                },

                {
                    name: 'vector',
                    type: {
                        name: 'Array',
                        templates: [
                            {name: 'float'},
                            {name: 4}
                        ]
                    }
                },
                {
                    name: 'fixedConstant',
                    type: {
                        name: 'uint32_t',
                        fixedArray: 128
                    }
                },
                {
                    name: 'resources',
                    type: {
                        name: 'Array',
                        templates: [
                            {
                                name: 'void',
                                ptr: true
                            },
                            {
                                name: 128
                            }
                        ],
                    }
                },
                {
                    name: 'pool',
                    type: {
                        name: 'Array',
                        fixedArray: 'ESystemPoolSize::Audio',
                        templates: [
                            {name: 'uint32_t'},
                            {
                                // NOTE: the first pass will output {name: 'ESystemPoolSize::Audio'} as expected.
                                //       the second pass is changed as the original statement is not preserved.
                                name: 'Audio',
                                namespaces: ['ESystemPoolSize']
                            }
                        ],
                    }
                },
            ],
        });
    });

    it('should parse struct with bitfield clauses', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_bitfield.hpp')));

        expect(ast).toEqual([
            {
                type: 'struct',
                name: 'ColorFlags',
                nested: [],
                fields: [
                    {name: 'r', type: {name: 'uint8_t', bitfield: 3}},
                    {name: 'g', type: {name: 'uint8_t', bitfield: 2}},
                    {name: 'b', type: {name: 'uint8_t', bitfield: 3}},
                ],
            },
        ]);
    });

    it('should parse struct and ignore functions/operators/ctor/dtor', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_functions.hpp')));
        expect(ast).toHaveLength(1);

        const struct = ast[0];
        expect(struct).toEqual({
            type: 'struct',
            name: 'GameApp',
            nested: [],
            fields: [],
        });
    });

    it('should parse struct with inheritance', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_inherit.hpp')));

        expect(ast).toEqual([
            {
                type: 'struct',
                name: 'Entity',
                nested: [],
                fields: [],
            },
            {
                type: 'struct',
                name: 'GameObject',
                inherit: {name: 'Entity'},
                nested: [],
                fields: [],
            },
            {
                type: 'struct',
                name: 'ASystem',
                templates: [
                    {name: 'T'}
                ],
                nested: [],
                fields: [],
            },
            {
                type: 'struct',
                name: 'AudioSystem',
                inherit: {
                    name: 'ASystem',
                    templates: [
                        {name: 'GameObject'}
                    ]
                },
                nested: [],
                fields: [],
            },
        ]);
    });

    it('should parse struct and ignore alignment', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_alignment.hpp')));

        expect(ast).toEqual([
            {
                type: 'struct',
                name: 'Backpack',
                inherit: {name: 'Storage'},
                nested: [],
                fields: [],
            },
        ]);
    });

    it('should parse struct and nested structs', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_nested.hpp')));

        expect(ast).toEqual([
            {
                type: 'struct',
                name: 'Player',
                nested: [
                    {
                        type: 'enum',
                        name: 'Owner',
                        base: 'int8_t',
                        values: [
                            {name: 'Player', value: 0},
                            {name: 'Johnny', value: 1},
                            {name: 'Puppet', value: 2},
                            {name: 'Count', value: 3},
                            {name: 'Invalid', value: 4},
                        ]
                    },

                    {
                        type: 'struct',
                        name: 'Binding',
                        nested: [],
                        fields: [
                            {name: 'id', type: {name: 'uint32_t'}},
                            {name: 'position', type: {name: 'Vector3'}},
                            {name: 'rotation', type: {name: 'Vector3'}},
                        ]
                    }
                ],
                fields: [
                    {name: 'position', type: {name: 'Vector3'}},
                    {name: 'velocity', type: {name: 'Vector3'}},
                    {name: 'rotation', type: {name: 'Vector3'}},
                    {name: 'parent', type: {name: 'Binding'}},
                ],
            },
        ]);
    });

    it('should parse structs within a namespace', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_namespace.hpp')));

        expect(ast).toEqual([
            {
                type: 'namespace',
                name: 'Awesome',
                children: [
                    {
                        type: 'struct',
                        name: 'GameApp',
                        nested: [],
                        fields: [],
                    },
                    {
                        type: 'struct',
                        name: 'GameNetwork',
                        nested: [],
                        fields: [],
                    },
                ]
            },

            {
                type: 'namespace',
                name: 'Epsiloon',
                children: [
                    {
                        type: 'struct',
                        name: 'RendererSystem',
                        nested: [],
                        fields: [],
                    },
                    {
                        type: 'struct',
                        name: 'AudioSystem',
                        nested: [],
                        fields: [],
                    },
                ]
            },

            {
                type: 'namespace',
                name: 'Universe',
                children: [
                    {
                        type: 'struct',
                        name: 'Body',
                        nested: [],
                        fields: [],
                    },
                ]
            },

            {
                type: 'namespace',
                name: 'Universe',
                children: [
                    {
                        type: 'namespace',
                        name: 'Galaxy',
                        children: [
                            {
                                type: 'namespace',
                                name: 'StellarSystem',
                                children: [
                                    {
                                        type: 'struct',
                                        name: 'Planet',
                                        nested: [],
                                        fields: [],
                                    },
                                    {
                                        type: 'struct',
                                        name: 'Star',
                                        inherit: {namespaces: ['Universe'], name: 'Body'},
                                        nested: [],
                                        fields: [],
                                    },
                                ]
                            },
                        ]
                    },
                ]
            }
        ]);
    });

    it('should parse structs with nested namespaces', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_namespace_nested.hpp')));

        expect(ast).toEqual([
            {
                type: 'namespace',
                name: 'Awesome',
                children: [
                    {
                        type: 'namespace',
                        name: 'Event',
                        children: [
                            {
                                type: 'struct',
                                name: 'EventListener',
                                nested: [],
                                fields: [],
                            }
                        ],
                    },
                ]
            },
        ]);
    });

    it('should parse structs with templates', () => {
        const ast = withFormatter(parseCPP(read('tests/struct_template.hpp')));

        expect(ast).toEqual([
            // Vector<T>
            {
                type: 'struct',
                name: 'Vector',
                templates: [
                    {name: 'T'},
                ],
                nested: [],
                fields: [
                    {offset: 0x0, type: {name: 'T', 'ptr': true}, name: 'items'},
                    {offset: 0x8, type: {name: 'uint32_t'}, name: 'size'},
                    {offset: 0xC, type: {name: 'uint32_t'}, name: 'capacity'}
                ]
            },

            // Pair<K, V>
            {
                type: 'struct',
                name: 'Pair',
                templates: [
                    {name: 'K'},
                    {name: 'V'},
                ],
                nested: [],
                fields: [
                    {type: {name: 'K'}, name: 'key'},
                    {type: {name: 'V'}, name: 'value'},
                ]
            },

            // Map<K, V>
            {
                type: 'struct',
                name: 'Map',
                templates: [
                    {name: 'K'},
                    {name: 'V'},
                ],
                nested: [],
                fields: [
                    {type: {name: 'Pair', templates: [{name: 'K'}, {name: 'V'}], 'ptr': true}, name: 'pairs'},
                    {type: {name: 'uint32_t'}, name: 'size'},
                    {type: {name: 'uint32_t'}, name: 'capacity'}
                ]
            }
        ]);
    });
});

describe('class', () => {
    it('should parse class with access', () => {
        const ast = withFormatter(parseCPP(read('tests/class.hpp')));
        expect(ast).toEqual([
            {
                type: 'class',
                name: 'ISerializable',
                nested: [],
                fields: [
                    {name: 'typeName', type: {name: 'CName'}},
                ]
            },
            {
                type: 'class',
                name: 'IScriptable',
                inherit: {visibility: 'public', name: 'ISerializable'},
                nested: [],
                fields: [
                    {
                        name: 'properties',
                        type: {
                            name: 'DynArray',
                            templates: [
                                {name: 'CProperty', 'ptr': true}
                            ]
                        }
                    },
                    {
                        name: 'functions',
                        type: {
                            name: 'DynArray',
                            templates: [
                                {name: 'CBaseFunction', 'ptr': true}
                            ]
                        }
                    }
                ]
            }
        ]);
    });
});
