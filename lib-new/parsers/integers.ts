import type { TCompiler, TDataModel, TEndianness } from "../common";
import { TFieldParser } from "../parser";

const Integer = ({
    endianness,
    sizeInBits,
    signed
}: {
    endianness: TEndianness;
    sizeInBits: number;
    signed: boolean;
}): TFieldParser<bigint> => {

    type C = TFieldParser<bigint>;

    const layout: C["layout"] = ({ predecessors }) => {
        if (predecessors.length === 0) {
            return {
                offsetInBits: 0,
                sizeInBits: sizeInBits
            };
        }

        const last = predecessors[predecessors.length - 1];

        return {
            offsetInBits: last.offsetInBits + last.sizeInBits,
            sizeInBits: sizeInBits
        };
    };

    const parse: C["parse"] = ({ data }) => {
        throw Error("not implemented yet");
    };

    const format: C["format"] = ({ value }) => {
        throw Error("not implemented yet");
    };

    return {
        layout,
        parse,
        format  
    };
};

export {
    Integer
};
