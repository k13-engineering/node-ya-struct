import { type TAbi, type TCompiler, type TDataModel } from "../lib/common.ts";
import { compileAndCompare } from "../lib/tests/compile-and-compare.vibe.ts";
import { types, type TCFieldType, type TFieldType } from "../lib/types/index.ts";
import { compileAndRun } from "./compile-util.ts";
import { describe, it } from "mocha";

type TStructDefinition = TFieldType & { type: "struct" };

let nestedStructCounter = 0;
let padCounter = 0;

// eslint-disable-next-line complexity
const integerSizeToCType = ({ sizeInBits, signed }: { sizeInBits: number, signed: boolean }): string => {
  switch (sizeInBits) {
  case 8: return signed ? "char" : "unsigned char";
  case 16: return signed ? "short" : "unsigned short";
  case 32: return signed ? "int" : "unsigned int";
  case 64: return signed ? "long long" : "unsigned long long";
  default: throw Error(`unsupported integer size ${sizeInBits}`);
  }
};

const structDefinitionToCCode = ({
  definition,
  structName,
  packed
}: {
  definition: TStructDefinition,
  structName: string,
  packed: boolean
}): string => {

  let preamble = "";

  // eslint-disable-next-line complexity
  const fieldDefinitions = definition.fields.map((field) => {
    padCounter += 1;
    const fieldName = field.name ?? `_pad_${padCounter}`;

    switch (field.definition.type) {
    case "c-type": {
      return `${field.definition.cType} ${fieldName};`;
    }
    case "integer": {
      const cType = integerSizeToCType({ sizeInBits: field.definition.sizeInBits, signed: field.definition.signed });
      return `${cType} ${fieldName};`;
    }
    case "pointer": {
      return `void* ${fieldName};`;
    }
    case "string": {
      return `char ${fieldName}[${field.definition.length}];`;
    }
    case "struct": {
      nestedStructCounter += 1;
      const innerStructName = `${structName}_nested_${nestedStructCounter}`;
      preamble += `${structDefinitionToCCode({
        definition: field.definition,
        structName: innerStructName,
        packed: field.definition.packed
      })}\n`;
      return `struct ${innerStructName} ${fieldName};`;
    }
    default: {
      throw Error(`unsupported field type "${field.definition.type}"`);
    }
    }
  });

  return `${preamble}
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

    const cStructName = "MyStruct1";

    const abi: TAbi = {
      compiler,
      dataModel,
      endianness: "little"
    };

    const { layoutErrors } = await compileAndCompare({
      structDefinition: definition,
      abi,
      compileAndRun: async ({ sourceCode }) => {
        const { output } = await compileAndRun({
          sourceCode,
          bits: dataModel === "LP64" ? 64 : 32
        });

        return {
          output
        };
      },
      cStructName,
      globalCode: `
        ${structDefinitionToCCode({ definition, structName: cStructName, packed })}
      `
    });

    layoutErrors.forEach((layoutError) => {
      switch (layoutError.type) {
      case "size-mismatch": {
        const msg = `size mismatch for field "${layoutError.fieldPath}":`
          + ` expected ${layoutError.expectedSizeInBits} bits,`
          + ` actual ${layoutError.actualSizeInBits} bits`;
        throw Error(msg);
      }
      case "offset-mismatch": {
        const msg = `offset mismatch for field "${layoutError.fieldPath}":`
          + ` expected ${layoutError.expectedOffsetInBits} bits,`
          + ` actual ${layoutError.actualOffsetInBits} bits`;
        throw Error(msg);
      }
      default: {
        // @ts-expect-error exhaustiveness check
        throw Error(`unexpected layout error type "${layoutError.type}"`);
      }
      }
    });
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
    },

    {
      structName: "nested #1 (char + inner{int,char})",
      fields: [
        cField({ name: "a", cType: "char" }),
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              cField({ name: "x", cType: "int" }),
              cField({ name: "y", cType: "char" }),
            ]
          }
        },
        cField({ name: "b", cType: "char" }),
      ]
    },

    {
      structName: "nested #2 (char + inner{short,short})",
      fields: [
        cField({ name: "a", cType: "char" }),
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              cField({ name: "x", cType: "short" }),
              cField({ name: "y", cType: "short" }),
            ]
          }
        },
      ]
    },

    {
      structName: "nested #3 (int + inner{long long,char} + char)",
      fields: [
        cField({ name: "a", cType: "int" }),
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              cField({ name: "x", cType: "long long" }),
              cField({ name: "y", cType: "char" }),
            ]
          }
        },
        cField({ name: "b", cType: "char" }),
      ]
    },

    {
      structName: "nested #4 (char + packed inner{int,char})",
      fields: [
        cField({ name: "a", cType: "char" }),
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: true,
            fixedAbi: {},
            fields: [
              cField({ name: "x", cType: "int" }),
              cField({ name: "y", cType: "char" }),
            ]
          }
        },
        cField({ name: "b", cType: "char" }),
      ]
    },

    {
      structName: "nested #5 (inner{char,char,char} + int)",
      fields: [
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              cField({ name: "x", cType: "char" }),
              cField({ name: "y", cType: "char" }),
              cField({ name: "z", cType: "char" }),
            ]
          }
        },
        cField({ name: "a", cType: "int" }),
      ]
    },

    {
      structName: "nested #6",
      fields: [
        {
          name: "preamble",
          definition: types.UInt32
        },
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              {
                name: "x",
                definition: types.UInt32
              },
              {
                name: "y",
                definition: types.UInt32
              }
            ]
          }
        },
        {
          name: "postamble",
          definition: types.UInt32
        }
      ]
    },

    {
      structName: "nested #7",
      fields: [
        {
          name: "type",
          definition: types.UInt32,
        },
        {
          name: "fmt",
          definition: {
            type: "struct",
            fields: [
              {
                name: "pix",
                definition: {
                  type: "struct",
                  fields: [
                    { name: "width", definition: types.UInt32 },
                    { name: "height", definition: types.UInt32 },
                    { name: "pixelformat", definition: types.UInt32 },
                    { name: "field", definition: types.UInt32 },
                    { name: "bytesperline", definition: types.UInt32 },
                    { name: "sizeimage", definition: types.UInt32 },
                    { name: "colorspace", definition: types.UInt32 },
                    { name: "priv", definition: types.UInt32 },
                    { name: "flags", definition: types.UInt32 },
                    { name: "ycbcr_enc", definition: types.UInt32 },
                    { name: "quantization", definition: types.UInt32 },
                    { name: "xfer_func", definition: types.UInt32 },
                  ],
                  fixedAbi: {},
                  packed: false,
                }
              },
            ],
            fixedAbi: {},
            packed: false
          }
        },
      ]
    },

    {
      structName: "pad #1 (char + unnamed pad int + int)",
      fields: [
        cField({ name: "a", cType: "char" }),
        {
          pad: true,
          name: undefined,
          definition: {
            type: "c-type",
            cType: "int",
            fixedAbi: {}
          }
        },
        cField({ name: "b", cType: "int" }),
      ]
    },

    {
      structName: "pad #2 (char + named pad int + long long)",
      fields: [
        cField({ name: "a", cType: "char" }),
        {
          pad: true,
          name: "reserved",
          definition: {
            type: "c-type",
            cType: "int",
            fixedAbi: {}
          }
        },
        cField({ name: "b", cType: "long long" }),
      ]
    },

    {
      structName: "pad #3 (int + unnamed pad char + int)",
      fields: [
        cField({ name: "a", cType: "int" }),
        {
          pad: true,
          name: undefined,
          definition: {
            type: "integer",
            sizeInBits: 8,
            signed: false,
            fixedAbi: {}
          }
        },
        cField({ name: "b", cType: "int" }),
      ]
    },

    {
      structName: "pad #4 (short + unnamed pad short + long long)",
      fields: [
        cField({ name: "a", cType: "short" }),
        {
          pad: true,
          name: undefined,
          definition: {
            type: "c-type",
            cType: "short",
            fixedAbi: {}
          }
        },
        cField({ name: "b", cType: "long long" }),
      ]
    },
  ];

  fieldsDefinitions.forEach(({ fields, structName }) => {
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
