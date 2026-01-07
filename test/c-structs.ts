import { type TCompiler, type TDataModel } from "../lib/common.ts";
import { define } from "../lib/parser.ts";
import { type TCFieldType, type TFieldType } from "../lib/types/index.ts";
import { determineCCompilerStructLayout } from "./compile-util.ts";
import nodeAssert from "node:assert";

type TStructDefinition = TFieldType & { type: "struct" };

const simpleStructDefinitionToCCode = ({
    definition,
    structName,
    packed
}: {
    definition: TStructDefinition,
    structName: string,
    packed: boolean
}) => {

    const fieldDefinitions = definition.fields.map((field) => {

        switch (field.definition.type) {
            case "c-type": {
                return `${field.definition.cType} ${field.name};`;
            }
            case "pointer": {
                return `void* ${field.name};`;
            }
            case "string": {
                return `char ${field.name}[${field.definition.length}];`;
            }
            default: {
                throw Error(`unsupported field type "${field.definition.type}"`);
            }
        }
    });

    return `
      struct ${structName} {
        ${fieldDefinitions.join("\n")}
      } ${packed ? "__attribute__((__packed__))" : ""};
    `;
};

const defineStructTestFor = ({
    packed,
    dataModel,
    compiler,
    fields,
    structName,
}: {
    packed: boolean,
    dataModel: TDataModel,
    compiler: TCompiler,
    fields: TStructDefinition["fields"],
    structName: string
}) => {
    it(`should work for ${structName}, packed=${packed ? "true" : "false"}, dataModel=${dataModel}, compiler=${compiler}`, async () => {
        const definition: TStructDefinition = {
            type: "struct",
            fields,
            fixedAbi: {},
            packed
        };

        const structName = "MyStruct1";
        const cDefinition = simpleStructDefinitionToCCode({
            definition,
            structName,
            packed
        });

        const cLayout = await determineCCompilerStructLayout({
            definitions: cDefinition,
            structName,
            fieldNames: definition.fields.map((f) => f.name),
        });

        const def = define({
            definition
        });

        const parser = def.parser({
            abi: {
                compiler: "gcc",
                dataModel: "LP64",
                endianness: "little"
            }
        });

        nodeAssert.strictEqual(parser.layout.type, "struct");

        let expectedLayout = {};

        parser.layout.fields.forEach((fieldLayout) => {
            const correspondinCLayout = cLayout[fieldLayout.name];
            nodeAssert.ok(correspondinCLayout !== undefined);

            nodeAssert.ok(fieldLayout.definition.offsetInBits % 8 === 0);
            nodeAssert.ok(fieldLayout.definition.sizeInBits % 8 === 0);

            expectedLayout = {
                ...expectedLayout,
                [fieldLayout.name]: {
                    offset: fieldLayout.definition.offsetInBits / 8,
                    length: fieldLayout.definition.sizeInBits / 8
                }
            };
        });

        nodeAssert.deepStrictEqual(cLayout, expectedLayout);
    });
};

type TSingleStructField = TStructDefinition["fields"][0];

const cField = ({ name, cType }: { name: string; cType: TCFieldType }): TSingleStructField => {
    return {
        name,
        definition: {
            type: "c-type",
            cType,
            fixedAbi: {}
        }
    };
};

describe("c-structs", () => {

    const dataModels: TDataModel[] = [
        "LP64"
    ];

    const compilers: TCompiler[] = [
        "gcc"
    ];

    const fieldsDefinitions: { fields: TStructDefinition["fields"] }[] = [
        {
            fields: [
                cField({ name: "a", cType: "char" }),
                cField({ name: "b", cType: "int" }),
            ]
        },
        // {
        //     fields: [
        //         cField({ name: "a", cType: "double" }),
        //         cField({ name: "b", cType: "int" }),
        //         cField({ name: "c", cType: "char" }),
        //     ]
        // }
        {
            fields: [
                cField({ name: "a", cType: "char" }),
                cField({ name: "b", cType: "char" }),
                cField({ name: "c", cType: "char" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned char" }),
                cField({ name: "b", cType: "unsigned char" }),
                cField({ name: "c", cType: "unsigned char" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "short" }),
                cField({ name: "b", cType: "short" }),
                cField({ name: "c", cType: "short" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned short" }),
                cField({ name: "b", cType: "unsigned short" }),
                cField({ name: "c", cType: "unsigned short" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "int" }),
                cField({ name: "b", cType: "int" }),
                cField({ name: "c", cType: "int" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned int" }),
                cField({ name: "b", cType: "unsigned int" }),
                cField({ name: "c", cType: "unsigned int" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "long" }),
                cField({ name: "b", cType: "long" }),
                cField({ name: "c", cType: "long" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned long" }),
                cField({ name: "b", cType: "unsigned long" }),
                cField({ name: "c", cType: "unsigned long" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "long long" }),
                cField({ name: "b", cType: "long long" }),
                cField({ name: "c", cType: "long long" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned long long" }),
                cField({ name: "b", cType: "unsigned long long" }),
                cField({ name: "c", cType: "unsigned long long" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "char" }),
                cField({ name: "b", cType: "short" }),
                cField({ name: "c", cType: "int" }),
                cField({ name: "d", cType: "long" }),
                cField({ name: "e", cType: "long long" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned char" }),
                cField({ name: "b", cType: "unsigned short" }),
                cField({ name: "c", cType: "unsigned int" }),
                cField({ name: "d", cType: "unsigned long" }),
                cField({ name: "e", cType: "unsigned long long" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "long long" }),
                cField({ name: "b", cType: "long" }),
                cField({ name: "c", cType: "int" }),
                cField({ name: "d", cType: "short" }),
                cField({ name: "e", cType: "char" }),
            ]
        },
        {
            fields: [
                cField({ name: "a", cType: "unsigned long long" }),
                cField({ name: "b", cType: "unsigned long" }),
                cField({ name: "c", cType: "unsigned int" }),
                cField({ name: "d", cType: "unsigned short" }),
                cField({ name: "e", cType: "unsigned char" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "int" }),
                {
                    name: "b",
                    definition: {
                        type: "string",
                        charSizeInBits: 8,
                        nullTerminatorMandatory: true,
                        length: 9
                    }
                },
                cField({ name: "c", cType: "int" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "char" }),
                {
                    name: "b",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                cField({ name: "c", cType: "unsigned long" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "char" }),
                {
                    name: "b",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                cField({ name: "c", cType: "unsigned long long" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "char" }),
                {
                    name: "b",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                cField({ name: "c", cType: "unsigned int" }),
            ]
        },

        {
            fields: [
                cField({ name: "a", cType: "unsigned long" }),
                {
                    name: "b",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                cField({ name: "c", cType: "unsigned int" }),
            ]
        },

        {
            fields: [
                {
                    name: "a",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                {
                    name: "b",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
                {
                    name: "c",
                    definition: {
                        type: "pointer",
                        fixedAbi: {}
                    }
                },
            ]
        }
    ];

    fieldsDefinitions.forEach(({ fields }, idx) => {
        [
            false,
            true
        ].forEach((packed) => {
            dataModels.forEach((dataModel) => {
                compilers.forEach((compiler) => {
                    defineStructTestFor({
                        packed,
                        dataModel,
                        compiler,
                        fields,
                        structName: `definition #${idx + 1}`
                    });
                });
            });
        });
    });
});
