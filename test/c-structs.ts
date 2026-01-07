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
            bits: dataModel === "LP64" ? 64 : 32
        });

        const def = define({
            definition
        });

        const parser = def.parser({
            abi: {
                compiler,
                dataModel,
                endianness: "little"
            }
        });

        nodeAssert.strictEqual(parser.layout.type, "struct");

        let ourLayout = {};

        parser.layout.fields.forEach((fieldLayout) => {
            const correspondinCLayout = cLayout[fieldLayout.name];
            nodeAssert.ok(correspondinCLayout !== undefined);

            nodeAssert.ok(fieldLayout.definition.offsetInBits % 8 === 0);
            nodeAssert.ok(fieldLayout.definition.sizeInBits % 8 === 0);

            ourLayout = {
                ...ourLayout,
                [fieldLayout.name]: {
                    offset: fieldLayout.definition.offsetInBits / 8,
                    length: fieldLayout.definition.sizeInBits / 8
                }
            };
        });

        nodeAssert.deepStrictEqual(ourLayout, cLayout);
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
        "LP64",
        "ILP32"
    ];

    const compilers: TCompiler[] = [
        "gcc"
    ];

    const fieldsDefinitions: { structName: string, fields: TStructDefinition["fields"] }[] = [
        {
            structName: "definition #1",
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
            structName: "definition #2",
            fields: [
                cField({ name: "a", cType: "char" }),
                cField({ name: "b", cType: "char" }),
                cField({ name: "c", cType: "char" }),
            ]
        },
        {
            structName: "definition #3",
            fields: [
                cField({ name: "a", cType: "unsigned char" }),
                cField({ name: "b", cType: "unsigned char" }),
                cField({ name: "c", cType: "unsigned char" }),
            ]
        },
        {
            structName: "definition #4",
            fields: [
                cField({ name: "a", cType: "short" }),
                cField({ name: "b", cType: "short" }),
                cField({ name: "c", cType: "short" }),
            ]
        },
        {
            structName: "definition #5",
            fields: [
                cField({ name: "a", cType: "unsigned short" }),
                cField({ name: "b", cType: "unsigned short" }),
                cField({ name: "c", cType: "unsigned short" }),
            ]
        },
        {
            structName: "definition #6",
            fields: [
                cField({ name: "a", cType: "int" }),
                cField({ name: "b", cType: "int" }),
                cField({ name: "c", cType: "int" }),
            ]
        },
        {
            structName: "definition #7",
            fields: [
                cField({ name: "a", cType: "unsigned int" }),
                cField({ name: "b", cType: "unsigned int" }),
                cField({ name: "c", cType: "unsigned int" }),
            ]
        },
        {
            structName: "definition #8",
            fields: [
                cField({ name: "a", cType: "long" }),
                cField({ name: "b", cType: "long" }),
                cField({ name: "c", cType: "long" }),
            ]
        },
        {
            structName: "definition #9",
            fields: [
                cField({ name: "a", cType: "unsigned long" }),
                cField({ name: "b", cType: "unsigned long" }),
                cField({ name: "c", cType: "unsigned long" }),
            ]
        },
        {
            structName: "definition #10",
            fields: [
                cField({ name: "a", cType: "long long" }),
                cField({ name: "b", cType: "long long" }),
                cField({ name: "c", cType: "long long" }),
            ]
        },
        {
            structName: "definition #11",
            fields: [
                cField({ name: "a", cType: "unsigned long long" }),
                cField({ name: "b", cType: "unsigned long long" }),
                cField({ name: "c", cType: "unsigned long long" }),
            ]
        },
        {
            structName: "definition #12",
            fields: [
                cField({ name: "a", cType: "char" }),
                cField({ name: "b", cType: "short" }),
                cField({ name: "c", cType: "int" }),
                cField({ name: "d", cType: "long" }),
                cField({ name: "e", cType: "long long" }),
            ]
        },
        {
            structName: "definition #13",
            fields: [
                cField({ name: "a", cType: "unsigned char" }),
                cField({ name: "b", cType: "unsigned short" }),
                cField({ name: "c", cType: "unsigned int" }),
                cField({ name: "d", cType: "unsigned long" }),
                cField({ name: "e", cType: "unsigned long long" }),
            ]
        },
        {
            structName: "definition #14",
            fields: [
                cField({ name: "a", cType: "long long" }),
                cField({ name: "b", cType: "long" }),
                cField({ name: "c", cType: "int" }),
                cField({ name: "d", cType: "short" }),
                cField({ name: "e", cType: "char" }),
            ]
        },
        {
            structName: "definition #15",
            fields: [
                cField({ name: "a", cType: "unsigned long long" }),
                cField({ name: "b", cType: "unsigned long" }),
                cField({ name: "c", cType: "unsigned int" }),
                cField({ name: "d", cType: "unsigned short" }),
                cField({ name: "e", cType: "unsigned char" }),
            ]
        },

        {
            structName: "definition #16",
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
            structName: "definition #17",
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
            structName: "definition #18",
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
            structName: "definition #19",
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
            structName: "definition #20",
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
            structName: "definition #21",
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

    fieldsDefinitions.forEach(({ fields, structName }, idx) => {
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
                        structName
                    });
                });
            });
        });
    });
});
