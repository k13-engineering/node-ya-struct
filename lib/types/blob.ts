import type { TValueParser } from "./value.ts";

type TBlobParser = TValueParser<Uint8Array>;

const createBlobParser = ({ sizeInBytes }: { sizeInBytes: number }): TBlobParser => {

  const parse: TBlobParser["parse"] = ({ data, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned data in blob parser, not supported yet");
    }

    if (data.length < sizeInBytes) {
      throw Error("not enough data for blob parsing");
    }

    return data.slice(0, sizeInBytes);
  };

  const format: TBlobParser["format"] = ({ value, target, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned data in blob formatter, not supported yet");
    }

    if (target.length < sizeInBytes) {
      throw Error("not enough space in target for blob formatting");
    }

    if (value.length !== sizeInBytes) {
      throw Error(`blob size mismatch: expected ${sizeInBytes} bytes, got ${value.length} bytes`);
    }

    target.set(value, 0);
  };

  return {
    parse,
    format
  };
};

export {
  createBlobParser
};
