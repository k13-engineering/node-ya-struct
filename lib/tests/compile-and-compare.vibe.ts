import type { TAbi } from "../common.ts";
import type { TLayoutedField } from "../layout.ts";
import { define } from "../parser.ts";
import type { TFieldType } from "../types/index.ts";

type TLayoutError = {
  type: "size-mismatch",
  fieldPath: string;
  expectedSizeInBits: number;
  actualSizeInBits: number;
} | {
  type: "offset-mismatch",
  fieldPath: string;
  expectedOffsetInBits: number;
  actualOffsetInBits: number;
};

type TCompileAndCompareResult = {
  layoutErrors: TLayoutError[];
};

type TFlatField = {
  fieldPath: string;
  offsetInBits: number;
  sizeInBits: number;
  isStruct: boolean;
};

type TStructLayoutedFields =
  (TLayoutedField & { type: "struct" })["fields"];

const flattenLayout = ({
  fields,
  parentPath
}: {
  fields: TStructLayoutedFields;
  parentPath: string;
}): TFlatField[] => {
  return fields.flatMap((field) => {
    if (field.pad) {
      return [];
    }

    const fieldPath = parentPath
      ? `${parentPath}.${field.name}`
      : field.name!;

    const isStruct = field.definition.type === "struct";

    const entry: TFlatField = {
      fieldPath,
      offsetInBits: field.definition.offsetInBits,
      sizeInBits: field.definition.sizeInBits,
      isStruct,
    };

    if (isStruct) {
      return [
        entry,
        ...flattenLayout({
          fields: field.definition.fields,
          parentPath: fieldPath,
        }),
      ];
    }

    return [entry];
  });
};

const generateSourceCode = ({
  globalCode,
  cStructName,
  flatFields,
}: {
  globalCode: string;
  cStructName: string;
  flatFields: TFlatField[];
}) => {

  const printStatements = flatFields.map((f, idx) => {
    if (f.isStruct) {
      const offsetExpr =
        `offsetof(struct ${cStructName}, ${f.fieldPath}) * CHAR_BIT`;
      const sizeExpr =
        `sizeof(((struct ${cStructName}*)0)->${f.fieldPath}) * CHAR_BIT`;

      return `  printf("%zu %zu\\n", `
        + `(size_t)(${offsetExpr}), (size_t)(${sizeExpr}));`;
    }

    // Use memory scanning to detect actual bit offset and size.
    // This works for both regular fields and bitfields.
    return `  {
    struct ${cStructName} __s${idx};
    memset(&__s${idx}, 0, sizeof(__s${idx}));
    memset(&__s${idx}.${f.fieldPath}, 0xFF, sizeof(__s${idx}.${f.fieldPath}));
    unsigned char *__p${idx} = (unsigned char *)&__s${idx};
    size_t __off${idx} = 0, __sz${idx} = 0;
    int __found${idx} = 0;
    for (size_t __i = 0; __i < sizeof(struct ${cStructName}) * CHAR_BIT; __i++) {
      if (__p${idx}[__i / CHAR_BIT] & (1u << (__i % CHAR_BIT))) {
        if (!__found${idx}) { __off${idx} = __i; __found${idx} = 1; }
        __sz${idx}++;
      }
    }
    printf("%zu %zu\\n", __off${idx}, __sz${idx});
  }`;
  }).join("\n");

  return `#include <stdio.h>
#include <stddef.h>
#include <limits.h>
#include <string.h>
${globalCode}

int main(void) {
${printStatements}
  return 0;
}
`;
};

const parseCOutput = ({
  output,
}: {
  output: string;
}): { offset: number; size: number }[] => {
  return output.trim().split("\n").map((line) => {
    const parts = line.trim().split(" ");
    return {
      offset: parseInt(parts[0], 10),
      size: parseInt(parts[1], 10),
    };
  });
};

const compareLayouts = ({
  flatFields,
  cFields,
}: {
  flatFields: TFlatField[];
  cFields: { offset: number; size: number }[];
}): TLayoutError[] => {
  return flatFields.flatMap((field, idx) => {
    const cField = cFields[idx];
    if (!cField) {
      return [];
    }

    const sizeMismatch: TLayoutError[] =
      cField.size === field.sizeInBits
        ? []
        : [{
          type: "size-mismatch" as const,
          fieldPath: field.fieldPath,
          expectedSizeInBits: cField.size,
          actualSizeInBits: field.sizeInBits,
        }];

    const offsetMismatch: TLayoutError[] =
      cField.offset === field.offsetInBits
        ? []
        : [{
          type: "offset-mismatch" as const,
          fieldPath: field.fieldPath,
          expectedOffsetInBits: cField.offset,
          actualOffsetInBits: field.offsetInBits,
        }];

    return [...sizeMismatch, ...offsetMismatch];
  });
};

const compileAndCompare = async ({
  structDefinition,
  abi,

  globalCode,
  cStructName,

  compileAndRun
}: {
  structDefinition: Extract<TFieldType, { type: "struct" }>;
  abi: TAbi;

  globalCode: string;
  cStructName: string;

  compileAndRun: ({ sourceCode }: { sourceCode: string }) => Promise<{
    output: string;
  }>;
}): Promise<TCompileAndCompareResult> => {

  const def = define({ definition: structDefinition });
  const parser = def.parser({ abi });
  const layoutResult = parser.layout;

  if (layoutResult.type !== "struct") {
    throw Error("expected struct layout");
  }

  const flatFields = flattenLayout({
    fields: layoutResult.fields,
    parentPath: "",
  });

  const sourceCode = generateSourceCode({
    globalCode,
    cStructName,
    flatFields,
  });

  const { output } = await compileAndRun({ sourceCode });

  const cFields = parseCOutput({ output });

  const layoutErrors = compareLayouts({ flatFields, cFields });

  return { layoutErrors };
};

export {
  compileAndCompare
};
