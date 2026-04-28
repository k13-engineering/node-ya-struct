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
  readonly fields: readonly ({
    readonly pad?: false;
    readonly name: string;
    readonly definition: TLayoutedField;
  } | {
    readonly pad: true;
    readonly name: string | undefined;
    readonly definition: TLayoutedField;
  })[];
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

// eslint-disable-next-line max-statements, complexity
const alignmentOfField = ({ definition, abi }: { definition: TFieldType, abi: TAbi }): number => {
  if (definition.type === "c-type") {
    const cTypeNormalizer = createCTypeNormalizer({ abi });
    const normalizedField = cTypeNormalizer.normalize({ cField: definition });
    return alignmentOfField({ definition: normalizedField, abi });
  }

  if (definition.type === "integer" || definition.type === "float") {
    const sizeInBits = definition.sizeInBits;
    if (abi.compiler === "gcc" && abi.dataModel === "ILP32" && sizeInBits === 64) {
      return 32;
    }
    return sizeInBits;
  }

  if (definition.type === "pointer") {
    return pointerSizeInBitsByDataModel({ dataModel: abi.dataModel });
  }

  if (definition.type === "array") {
    return alignmentOfField({ definition: definition.elementType, abi });
  }

  if (definition.type === "struct") {
    if (definition.packed) {
      return 8;
    }
    if (definition.fields.length === 0) {
      return 8;
    }
    return Math.max(...definition.fields.map((f) => {
      return alignmentOfField({ definition: f.definition, abi });
    }));
  }

  if (definition.type === "string") {
    return definition.charSizeInBits;
  }

  throw Error(`unsupported field type for alignment calculation`);
};

// eslint-disable-next-line complexity
const translateLayoutOffset = ({ field, offset }: { field: TLayoutedField; offset: number }): TLayoutedField => {
  if (offset === 0) {
    return field;
  }

  switch (field.type) {
  case "integer":
    return { ...field, offsetInBits: field.offsetInBits + offset };
  case "float":
    return { ...field, offsetInBits: field.offsetInBits + offset };
  case "pointer":
    return { ...field, offsetInBits: field.offsetInBits + offset };
  case "string":
    return { ...field, offsetInBits: field.offsetInBits + offset };
  case "array":
    return { ...field, offsetInBits: field.offsetInBits + offset };
  case "struct":
    return {
      ...field,
      offsetInBits: field.offsetInBits + offset,
      fields: field.fields.map((f) => {
        const translated = translateLayoutOffset({ field: f.definition, offset });
        if (f.pad) {
          return { pad: true as const, name: f.name, definition: translated };
        }
        return { name: f.name, definition: translated };
      })
    };
  default:
    throw Error(`unsupported field type for layout offset translation`);
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

  const structAlignmentInBits = definition.packed ? 8 : alignmentOfField({ definition, abi });
  const fieldAlignmentInBits = 1;
  const pointerSizeInBits = pointerSizeInBitsByDataModel({ dataModel: abi.dataModel });

  // Compute internal layout from offset 0 to ensure correct internal alignment
  // independent of the struct's placement position
  let currentOffsetInBits = 0;
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
        const nestedAlignment = alignmentOfField({ definition: normalizedField, abi });
        currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: nestedAlignment });
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
      field.pad
        ? { pad: true as const, name: field.name, definition: fieldLayout }
        : { name: field.name, definition: fieldLayout }
    ];

    currentOffsetInBits = align({ offset: fieldLayout.offsetInBits + fieldLayout.sizeInBits, alignment: fieldAlignmentInBits });
  });

  if (!definition.packed) {
    currentOffsetInBits = align({ offset: currentOffsetInBits, alignment: structAlignmentInBits });
  }

  const sizeInBits = currentOffsetInBits;

  // Translate all field offsets to the actual placement position
  const translatedFields = layoutedFields.map((f) => {
    const translated = translateLayoutOffset({ field: f.definition, offset: initialOffsetInBits });
    if (f.pad) {
      return { pad: true as const, name: f.name, definition: translated };
    }
    return { name: f.name, definition: translated };
  });

  return {
    type: "struct",
    offsetInBits: initialOffsetInBits,
    sizeInBits,
    fields: translatedFields,
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
