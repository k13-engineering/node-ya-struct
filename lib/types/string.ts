import type { TValueParser } from "./value.ts";

type TStringParser = TValueParser<string>;

const createStringParser = ({ length }: { length: number }): TStringParser => {

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const parse: TStringParser["parse"] = ({ data, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned data in string parser, not supported yet");
    }

    if (data.length < length) {
      throw Error("not enough data for string parsing");
    }

    const stringData = data.subarray(0, length);
    const nullTerminatorIndex = stringData.indexOf(0);

    if (nullTerminatorIndex < 0) {
      return decoder.decode(stringData);
    }

    return decoder.decode(stringData.subarray(0, nullTerminatorIndex));
  };

  const format: TStringParser["format"] = ({ value, target, offsetInBits }) => {
    if (offsetInBits !== 0) {
      throw Error("unaligned data in string formatter, not supported yet");
    }

    if (target.length < length) {
      throw Error("not enough space in target for string formatting");
    }

    const encoded = encoder.encode(value);

    if (encoded.length + 1 >= length) {
      throw Error("string too long to fit in target");
    }

    target.set(encoded, 0);
    target[encoded.length] = 0;
  };

  return {
    parse,
    format
  };
};

export {
  createStringParser
};
