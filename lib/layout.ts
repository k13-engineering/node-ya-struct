import { align, type TAbi } from "./common.ts";
import { createCTypeNormalizer } from "./types/c-types.ts";
import type { TFieldType } from "./types/index.ts";
import nodeUtil from "node:util";

type TLayoutedField = {
  readonly type: "integer";
  readonly offsetInBits: number;
  readonly sizeInBits: number;
  readonly signed: boolean;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "float";
  readonly offsetInBits: number;
  readonly sizeInBits: number;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "pointer";
  readonly offsetInBits: number;
  readonly sizeInBits: number;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "array";
  readonly elementType: TLayoutedField;
  readonly length: number;
  readonly offsetInBits: number;
  readonly sizeInBits: number;
} | {
  readonly type: "struct";
  readonly offsetInBits: number;
  readonly sizeInBits: number;
  readonly fields: readonly { readonly name: string; readonly definition: TLayoutedField }[];
  readonly packed: boolean;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "string";
  readonly charSizeInBits: number;
  readonly length: number;
  readonly offsetInBits: number;
  readonly sizeInBits: number;
};

const pointerSizeInBitsByDataModel = ({ dataModel }: { dataModel: TAbi["dataModel"] }): number => {
  switch (dataModel) {
    case "LP64":
      return 64;
    case "ILP32":
      return 32;
    default:
      throw Error(`unsupported data model "${dataModel}" for pointer size determination`);
  }
};

const layoutStruct = ({
  definition,
  abi,
  currentOffsetInBits: initialOffsetInBits
}: {
  definition: TFieldType & { type: "struct" },
  abi: TAbi,
  currentOffsetInBits: number
}): TLayoutedField => {

  // TODO: implement alignment handling
  const structAlignmentInBits = 64;
  // const fieldAlignmentInBits = 64;
  const fieldAlignmentInBits = 1;
  const pointerSizeInBits = pointerSizeInBitsByDataModel({ dataModel: abi.dataModel });

  let currentOffsetInBits = align({ offset: initialOffsetInBits, alignment: structAlignmentInBits });
  let layoutedFields: (TLayoutedField & { type: "struct" })["fields"] = [];

  // eslint-disable-next-line max-statements,complexity
  definition.fields.forEach((field) => {

    let normalizedField: TFieldType = field.definition;

    if (field.definition.type === "c-type") {
      const cTypeNormalizer = createCTypeNormalizer({ abi });
      normalizedField = cTypeNormalizer.normalize({ cField: field.definition });
    }

    if (!definition.packed) {
      switch (normalizedField.type) {
        case "integer":
        case "float": {
          const sizeInBits = normalizedField.sizeInBits;

          if (abi.compiler === "gcc" && abi.dataModel === "ILP32" && sizeInBits === 64) {
            // special handling for gcc 64-bit integers on ILP32 data model (alignment to 32 bits)
            currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: 32 });
          } else {
            currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: sizeInBits });
          }

          break;
        }
        case "array": {

          // TODO: this is probably not sufficient for all cases

          // eslint-disable-next-line no-use-before-define
          const { sizeInBits } = layout({ definition: normalizedField.elementType, abi, currentOffsetInBits: 0 });

          if (abi.compiler === "gcc" && abi.dataModel === "ILP32" && sizeInBits === 64) {
            // special handling for gcc 64-bit integers on ILP32 data model (alignment to 32 bits)
            currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: 32 });
          } else {
            currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: sizeInBits });
          }

          break;
        }
        case "struct": {

          if (currentOffsetInBits % 64 !== 0) {
            throw Error("nested struct alignment handling not implemented yet");
          }

          break;
        }
        case "string": {
          // no special alignment needed
          break;
        }
        case "pointer": {
          currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: pointerSizeInBits });
          break;
        }
        default:
          throw Error(`unsupported field type for struct layout: ${nodeUtil.inspect(field.definition)}`);
      }
    }

    // eslint-disable-next-line no-use-before-define
    const fieldLayout = layout({ definition: normalizedField, abi, currentOffsetInBits });

    layoutedFields = [
      ...layoutedFields,
      {
        name: field.name,
        definition: fieldLayout
      }
    ];

    currentOffsetInBits = align({ offset: fieldLayout.offsetInBits + fieldLayout.sizeInBits, alignment: fieldAlignmentInBits });
  });

  return {
    type: "struct",
    offsetInBits: initialOffsetInBits,
    sizeInBits: currentOffsetInBits - initialOffsetInBits,
    fields: layoutedFields,
    packed: definition.packed,
    fixedAbi: definition.fixedAbi
  };
};

const layoutPrimitive = ({
  definition,
  abi,
  currentOffsetInBits
}: {
  definition: TFieldType & ({ type: "integer" } | { type: "float" } | { type: "pointer" }),
  abi: TAbi,
  currentOffsetInBits: number
}): TLayoutedField => {

  if (definition.type === "integer") {
    return {
      type: "integer",
      offsetInBits: currentOffsetInBits,
      sizeInBits: definition.sizeInBits,
      signed: definition.signed,
      fixedAbi: definition.fixedAbi
    };
  }

  if (definition.type === "float") {
    return {
      type: "float",
      offsetInBits: currentOffsetInBits,
      sizeInBits: definition.sizeInBits,
      fixedAbi: definition.fixedAbi
    };
  }

  const pointerSizeInBits = pointerSizeInBitsByDataModel({ dataModel: abi.dataModel });

  return {
    type: definition.type,
    offsetInBits: currentOffsetInBits,
    sizeInBits: pointerSizeInBits,
    fixedAbi: definition.fixedAbi
  };
};

const layoutString = ({
  definition,
  currentOffsetInBits
}: {
  definition: TFieldType & { type: "string" },
  abi: TAbi,
  currentOffsetInBits: number
}): TLayoutedField => {

  const sizeInBits = definition.charSizeInBits * definition.length;

  return {
    type: "string",
    offsetInBits: currentOffsetInBits,
    sizeInBits,
    charSizeInBits: definition.charSizeInBits,
    length: definition.length
  };
};

const layoutArray = ({
  definition,
  abi,
  currentOffsetInBits
}: {
  definition: TFieldType & { type: "array" },
  abi: TAbi,
  currentOffsetInBits: number
}): TLayoutedField => {

  // eslint-disable-next-line no-use-before-define
  const elementLayout = layout({ definition: definition.elementType, abi, currentOffsetInBits: 0 });

  // TODO: handle alignment
  const sizeInBits = elementLayout.sizeInBits * definition.length;

  return {
    type: "array",
    offsetInBits: currentOffsetInBits,
    sizeInBits,
    elementType: elementLayout,
    length: definition.length
  };
};

const layout = ({
  definition,
  abi,
  currentOffsetInBits
}: {
  definition: TFieldType,
  abi: TAbi,
  currentOffsetInBits: number
  // eslint-disable-next-line complexity
}): TLayoutedField => {

  if (definition.type === "struct") {
    return layoutStruct({ definition, abi, currentOffsetInBits });
  }

  if (definition.type === "integer" || definition.type === "float" || definition.type === "pointer") {
    return layoutPrimitive({ definition, abi, currentOffsetInBits });
  }

  if (definition.type === "string") {
    return layoutString({ definition, abi, currentOffsetInBits });
  }

  if (definition.type === "array") {
    return layoutArray({ definition, abi, currentOffsetInBits });
  }

  if (definition.type === "c-type") {
    const cTypeNormalizer = createCTypeNormalizer({ abi });
    const basicField = cTypeNormalizer.normalize({ cField: definition });

    return layout({ definition: basicField, abi, currentOffsetInBits });
  }

  throw Error("not implemented yet");
};

export {
  layout
};

export type {
  TLayoutedField
};
