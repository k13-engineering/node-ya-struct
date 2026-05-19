import type { TEndianness } from "../common.ts";
import type { TLayoutedField } from "../layout.ts";
import { createIntegerParser } from "./integer.ts";
import { createPointerParser } from "./pointer.ts";
import { createStringParser } from "./string.ts";
import { createArrayParser } from "./array.ts";
import { createBlobParser } from "./blob.ts";
import type { TValueParser } from "./value.ts";

type TStructParser = TValueParser<Record<string, unknown>>;

const subData = ({ data, offsetInBits, sizeInBits }: { data: Uint8Array, offsetInBits: number, sizeInBits: number }) => {
  return {
    data: new Uint8Array(data.buffer, data.byteOffset + Math.floor(offsetInBits / 8), Math.ceil(sizeInBits / 8)),
    offsetInBits: offsetInBits % 8
  };
};

// eslint-disable-next-line complexity, @typescript-eslint/no-explicit-any
const createFieldParser = ({ definition, endianness }: { definition: TLayoutedField, endianness: TEndianness }): TValueParser<any> => {
  if (definition.type === "integer") {
    return createIntegerParser({
      sizeInBits: definition.sizeInBits,
      signed: definition.signed,
      endianness
    });
  }

  if (definition.type === "pointer") {
    return createPointerParser({
      sizeInBits: definition.sizeInBits,
      endianness
    });
  }

  if (definition.type === "struct") {
    // eslint-disable-next-line no-use-before-define
    return createStructParser({
      layoutedFields: definition.fields,
      structOffsetInBits: definition.offsetInBits,
      endianness
    });
  }

  if (definition.type === "string") {
    return createStringParser({
      length: definition.length,
    });
  }

  if (definition.type === "array") {
    const elementParser = createFieldParser({ definition: definition.elementType, endianness });
    const elementSizeInBytes = definition.elementType.sizeInBits / 8;
    return createArrayParser({
      fieldParser: elementParser as TValueParser<unknown>,
      elementSizeInBytes,
      length: definition.length
    });
  }

  if (definition.type === "blob") {
    return createBlobParser({
      sizeInBytes: definition.sizeInBits / 8
    });
  }

  throw Error("not implemented yet");
};

const createStructParser = ({
  layoutedFields,
  structOffsetInBits,
  endianness
}: {
  layoutedFields: (TLayoutedField & { type: "struct" })["fields"];
  structOffsetInBits: number;
  endianness: TEndianness
}): TStructParser => {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldParsers: TValueParser<any>[] = layoutedFields.map((field) => {
    return createFieldParser({ definition: field.definition, endianness });
  });

  const parse: TStructParser["parse"] = ({ data, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned struct parsing not supported yet");
    }

    // eslint-disable-next-line prefer-const
    let result: Record<string, unknown> = {};

    layoutedFields.forEach((field, idx) => {
      if (field.pad) {
        return;
      }

      const fieldParser = fieldParsers[idx];

      // field definition is absolute, subtracting struct offset gives bit offset inside struct
      // adding data bit offset gives bit offset inside provided data
      const offsetToProvidedDataInBits = field.definition.offsetInBits - structOffsetInBits + offsetInBits;

      const offsetInBitsInByte = field.definition.offsetInBits % 8;
      if (offsetInBitsInByte !== 0) {
        throw Error("not implemented yet: unaligned field parsing");
      }

      const {
        data: fieldData,
        offsetInBits: fieldOffsetInBits
      } = subData({
        data,
        offsetInBits: offsetToProvidedDataInBits,
        sizeInBits: field.definition.sizeInBits
      });

      // eslint-disable-next-line immutable/no-mutation -- performance
      result[field.name!] = fieldParser.parse({ data: fieldData, offsetInBits: fieldOffsetInBits });
    });

    return result;
  };

  const format: TStructParser["format"] = ({ value, target, offsetInBits }) => {
    if (offsetInBits % 8 !== 0) {
      throw Error("unaligned struct formatting not supported yet");
    }

    layoutedFields.forEach((field, idx) => {
      if (field.pad) {
        return;
      }

      const fieldValue = value[field.name!];
      const fieldParser = fieldParsers[idx];

      const offsetInBitsInByte = field.definition.offsetInBits % 8;
      if (offsetInBitsInByte !== 0) {
        throw Error("not implemented yet: unaligned field formatting");
      }

      const {
        data: fieldTarget,
        offsetInBits: fieldOffsetInBits
      } = subData({
        data: target,
        offsetInBits: field.definition.offsetInBits - structOffsetInBits + offsetInBits,
        sizeInBits: field.definition.sizeInBits
      });

      try {
        fieldParser.format({ value: fieldValue, target: fieldTarget, offsetInBits: fieldOffsetInBits });
      } catch (ex) {
        throw Error(`failed to format field "${field.name}"`, { cause: ex });
      }
    });
  };

  return {
    parse,
    format
  };
};

export {
  createStructParser
};
