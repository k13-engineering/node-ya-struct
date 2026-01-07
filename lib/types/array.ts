import type { TEndianness } from "../common.ts";
import type { TFieldType } from "./index.ts";
import { createIntegerParser } from "./integer.ts";
import type { TValueParser } from "./value.ts";

type TArrayParser = TValueParser<unknown[]>;

const createArrayParser = ({
  elementType,
  length,
  endianness
}: {
  elementType: TFieldType,
  length: number,
  endianness: TEndianness
}): TArrayParser => {

  let fieldParser: TValueParser<unknown>;

  if (elementType.type === "integer") {
    fieldParser = createIntegerParser({
      sizeInBits: elementType.sizeInBits,
      signed: elementType.signed,
      endianness
    }) as TValueParser<unknown>;
  } else {
    throw Error("only integer array elements are supported currently");
  }

  const elementSizeInBytes = elementType.sizeInBits / 8;
  if (!Number.isInteger(elementSizeInBytes)) {
    throw Error("BUG: non byte-aligned array element size");
  }

  const parse: TArrayParser["parse"] = ({ data, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned array parsing not supported yet");
    }

    // eslint-disable-next-line prefer-const
    let result: unknown[] = [];

    for (let i = 0; i < length; i += 1) {
      const fieldData = data.subarray(i * elementSizeInBytes, (i + 1) * elementSizeInBytes);
      const fieldValue = fieldParser.parse({ data: fieldData, offsetInBits: 0 });
      result.push(fieldValue);
    }

    return result;
  };

  // eslint-disable-next-line complexity
  const format: TArrayParser["format"] = ({ value, target, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned array formatting not supported yet");
    }

    if (value.length !== length) {
      throw Error(`array length mismatch: field length is ${length}, value length is ${value.length}`);
    }

    if (target.length < length * elementSizeInBytes) {
      throw Error("not enough space in target for array formatting");
    }

    for (let i = 0; i < length; i += 1) {
      const fieldTarget = target.subarray(i * elementSizeInBytes, (i + 1) * elementSizeInBytes);

      try {
        fieldParser.format({
          value: value[i],
          target: fieldTarget,
          offsetInBits: 0
        });
      } catch (ex) {
        throw Error(`failed to format array element at index ${i}`, { cause: ex });
      }

    }
  };

  return {
    parse,
    format
  };
};

export {
  createArrayParser
};
