import type { TEndianness } from "../common.ts";
import type { TValueParser } from "./value.ts";

type TIntegerParser = TValueParser<bigint>;

const createIntegerParser = ({
  sizeInBits,
  signed,
  endianness
}: {
  sizeInBits: number,
  signed: boolean,
  endianness: TEndianness
}): TIntegerParser => {

  const readBit = ({ data, bitOffset }: { data: Uint8Array, bitOffset: number }): bigint => {
    const byteIndex = Math.floor(bitOffset / 8);
    const bitInByte = bitOffset % 8;

    if (byteIndex >= data.length) {
      throw Error("BUG: not enough data for integer bit parsing");
    }

    return BigInt((data[byteIndex] >> bitInByte) & 1);
  };

  const writeBit = ({ data, bitOffset, bit }: { data: Uint8Array, bitOffset: number, bit: bigint }): void => {
    const byteIndex = Math.floor(bitOffset / 8);
    const bitInByte = bitOffset % 8;

    if (byteIndex >= data.length) {
      throw Error("BUG: not enough data for integer bit formatting");
    }

    const mask = 1 << bitInByte;
    if (bit === 1n) {
      data[byteIndex] |= mask;
    } else {
      data[byteIndex] &= (~mask) & 0xFF;
    }
  };

  const parseArbitrarySized = ({ data, offsetInBits }: { data: Uint8Array, offsetInBits: number }): bigint => {
    let result = 0n;

    if (endianness === "little") {
      for (let i = 0; i < sizeInBits; i += 1) {
        const bit = readBit({ data, bitOffset: offsetInBits + i });
        result |= bit << BigInt(i);
      }
    } else {
      for (let i = 0; i < sizeInBits; i += 1) {
        const bit = readBit({ data, bitOffset: offsetInBits + i });
        const shift = BigInt(sizeInBits - 1 - i);
        result |= bit << shift;
      }
    }

    if (!signed) {
      return result;
    }

    const signBit = 1n << BigInt(sizeInBits - 1);
    if ((result & signBit) === 0n) {
      return result;
    }

    return result - (1n << BigInt(sizeInBits));
  };

  const formatArbitrarySized = ({
    value,
    target,
    offsetInBits
  }: {
    value: bigint,
    target: Uint8Array,
    offsetInBits: number
  }): void => {
    const bitLength = BigInt(sizeInBits);
    const modulus = 1n << bitLength;

    let unsignedValue = value;
    if (signed && value < 0n) {
      unsignedValue = value + modulus;
    }

    if (unsignedValue < 0n || unsignedValue >= modulus) {
      throw Error(`integer value ${value} does not fit in ${sizeInBits} bits`);
    }

    if (endianness === "little") {
      for (let i = 0; i < sizeInBits; i += 1) {
        const bit = (unsignedValue >> BigInt(i)) & 1n;
        writeBit({ data: target, bitOffset: offsetInBits + i, bit });
      }
    } else {
      for (let i = 0; i < sizeInBits; i += 1) {
        const shift = BigInt(sizeInBits - 1 - i);
        const bit = (unsignedValue >> shift) & 1n;
        writeBit({ data: target, bitOffset: offsetInBits + i, bit });
      }
    }
  };

  // eslint-disable-next-line max-statements, complexity
  const parse: TIntegerParser["parse"] = ({ data, offsetInBits }) => {
    const neededBytes = Math.ceil((offsetInBits + sizeInBits) / 8);
    if (data.length < neededBytes) {
      throw Error("BUG: not enough data for integer parsing");
    }

    if (offsetInBits !== 0 || (sizeInBits !== 8 && sizeInBits !== 16 && sizeInBits !== 32 && sizeInBits !== 64)) {
      return parseArbitrarySized({ data, offsetInBits });
    }

    const view = new DataView(data.buffer, data.byteOffset);

    if (sizeInBits === 8) {
      if (signed) {
        return BigInt(view.getInt8(0));
      } else {
        return BigInt(view.getUint8(0));
      }
    } else if (sizeInBits === 16) {
      if (signed) {
        if (endianness === "little") {
          return BigInt(view.getInt16(0, true));
        } else {
          return BigInt(view.getInt16(0, false));
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          return BigInt(view.getUint16(0, true));
        } else {
          return BigInt(view.getUint16(0, false));
        }
      }
    } else if (sizeInBits === 32) {
      if (signed) {
        if (endianness === "little") {
          return BigInt(view.getInt32(0, true));
        } else {
          return BigInt(view.getInt32(0, false));
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          return BigInt(view.getUint32(0, true));
        } else {
          return BigInt(view.getUint32(0, false));
        }
      }
    } else if (sizeInBits === 64) {
      if (signed) {
        if (endianness === "little") {
          return view.getBigInt64(0, true);
        } else {
          return view.getBigInt64(0, false);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          return view.getBigUint64(0, true);
        } else {
          return view.getBigUint64(0, false);
        }
      }
    }

    throw Error("not implemented yet");
  };

  // eslint-disable-next-line max-statements, complexity
  const format: TIntegerParser["format"] = ({ value, target, offsetInBits }) => {
    if (typeof value !== "bigint") {
      throw Error("invalid value type for integer formatter");
    }

    const neededBytes = Math.ceil((offsetInBits + sizeInBits) / 8);
    if (target.length < neededBytes) {
      throw Error("not enough space in target for integer formatting");
    }

    if (offsetInBits !== 0 || (sizeInBits !== 8 && sizeInBits !== 16 && sizeInBits !== 32 && sizeInBits !== 64)) {
      formatArbitrarySized({ value, target, offsetInBits });
      return;
    }

    const view = new DataView(target.buffer, target.byteOffset);

    if (sizeInBits === 8) {
      if (signed) {
        view.setInt8(0, Number(value));
      } else {
        view.setUint8(0, Number(value));
      }
    } else if (sizeInBits === 16) {
      if (signed) {
        if (endianness === "little") {
          view.setInt16(0, Number(value), true);
        } else {
          view.setInt16(0, Number(value), false);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          view.setUint16(0, Number(value), true);
        } else {
          view.setUint16(0, Number(value), false);
        }
      }
    } else if (sizeInBits === 32) {
      if (signed) {
        if (endianness === "little") {
          view.setInt32(0, Number(value), true);
        } else {
          view.setInt32(0, Number(value), false);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          view.setUint32(0, Number(value), true);
        } else {
          view.setUint32(0, Number(value), false);
        }
      }
    } else if (sizeInBits === 64) {
      if (signed) {
        if (endianness === "little") {
          view.setBigInt64(0, value, true);
        } else {
          view.setBigInt64(0, value, false);
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (endianness === "little") {
          view.setBigUint64(0, value, true);
        } else {
          view.setBigUint64(0, value, false);
        }
      }
    } else {
      throw Error("not implemented yet");
    }
  };

  return {
    parse,
    format
  };
};

export {
  createIntegerParser
};
