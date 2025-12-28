import type { TEndianness } from "../common.ts";
import { createIntegerParser } from "./integer.ts";
import type { TValueParser } from "./value.ts";

type TPointerParser = TValueParser<bigint>;

const createPointerParser = ({ sizeInBits, endianness }: { sizeInBits: number, endianness: TEndianness }): TPointerParser => {

    const integerParser = createIntegerParser({ sizeInBits, signed: false, endianness });

    const parse: TPointerParser["parse"] = ({ data, offsetInBits }) => {
        return integerParser.parse({ data, offsetInBits });
    };

    const format: TPointerParser["format"] = ({ value, target, offsetInBits }) => {
        return integerParser.format({ value, target, offsetInBits });
    };

    return {
        parse,
        format
    };
};

export {
    createPointerParser
};
