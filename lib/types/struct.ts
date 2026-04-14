import type { TEndianness } from "../common.ts";
import type { TLayoutedField } from "../layout.ts";
import { createIntegerParser } from "./integer.ts";
import { createPointerParser } from "./pointer.ts";
import { createStringParser } from "./string.ts";
import { createArrayParser } from "./array.ts";
import type { TValueParser } from "./value.ts";
import type { TFieldType } from "./index.ts";

type TStructParser = TValueParser<Record<string, unknown>>;

const subData = ({ data, offsetInBits, sizeInBits }: { data: Uint8Array, offsetInBits: number, sizeInBits: number }) => {
  return {
    data: new Uint8Array(data.buffer, data.byteOffset + Math.floor(offsetInBits / 8), Math.ceil(sizeInBits / 8)),
    offsetInBits: offsetInBits % 8
  };
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

  // eslint-disable-next-line complexity, @typescript-eslint/no-explicit-any
  const fieldParsers: TValueParser<any>[] = layoutedFields.map((field) => {
    if (field.definition.type === "integer") {
      return createIntegerParser({
        sizeInBits: field.definition.sizeInBits,
        signed: field.definition.signed,
        endianness
      });
    }

    if (field.definition.type === "pointer") {
      return createPointerParser({
        sizeInBits: field.definition.sizeInBits,
        endianness
      });
    }

    if (field.definition.type === "struct") {
      return createStructParser({
        layoutedFields: field.definition.fields,
        structOffsetInBits: field.definition.offsetInBits,
        endianness
      });
    }

    if (field.definition.type === "string") {
      return createStringParser({
        length: field.definition.length,
      });
    }

    if (field.definition.type === "array") {
      return createArrayParser({
        // TODO: cast should not be necessary
        elementType: field.definition.elementType as TFieldType,
        endianness,
        length: field.definition.length
      });
    }

    throw Error("not implemented yet");
  });

  const parse: TStructParser["parse"] = ({ data, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned struct parsing not supported yet");
    }

    // eslint-disable-next-line prefer-const
    let result: Record<string, unknown> = {};

    layoutedFields.forEach((field, idx) => {
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

      result[field.name] = fieldParser.parse({ data: fieldData, offsetInBits: fieldOffsetInBits });
    });

    return result;
  };

  const format: TStructParser["format"] = ({ value, target, offsetInBits }) => {
    if (offsetInBits % 8 !== 0) {
      throw Error("unaligned struct formatting not supported yet");
    }

    layoutedFields.forEach((field, idx) => {
      const fieldValue = value[field.name];
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
