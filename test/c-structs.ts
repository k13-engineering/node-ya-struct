import { type TAbi, type TCompiler, type TDataModel } from "../lib/common.ts";
import { compileAndCompare } from "../lib/tests/compile-and-compare.vibe.ts";
import { type TCFieldType, type TFieldType } from "../lib/types/index.ts";
import { compileAndRun } from "./compile-util.ts";
import { describe, it } from "mocha";

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
        ${simpleStructDefinitionToCCode({ definition, structName: cStructName, packed })}
      `
    });

    layoutErrors.forEach((layoutError) => {
      switch (layoutError.type) {
      case "size-mismatch": {
        throw Error(`size mismatch for field "${layoutError.fieldPath}": expected ${layoutError.expectedSizeInBits} bits, actual ${layoutError.actualSizeInBits} bits`);
      }
      case "offset-mismatch": {
        throw Error(`offset mismatch for field "${layoutError.fieldPath}": expected ${layoutError.expectedOffsetInBits} bits, actual ${layoutError.actualOffsetInBits} bits`);
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
    }
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
