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

  // eslint-disable-next-line max-statements, complexity
  const parse: TIntegerParser["parse"] = ({ data, offsetInBits }) => {
    if (data.length < sizeInBits / 8) {
      throw Error("BUG: not enough data for integer parsing");
    }

    if (offsetInBits !== 0) {
      throw Error("unaligned data in integer parser, not supported yet");
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
    if (offsetInBits !== 0) {
      throw Error("unaligned data in integer formatter, not supported yet");
    }

    if (typeof value !== "bigint") {
      throw Error("invalid value type for integer formatter");
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
