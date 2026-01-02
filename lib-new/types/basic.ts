import type {
    IAbiProperties,
    IType,
    ITypeDefinition
} from "../types.ts";

import {
    fromUint8Array
} from "../bit-buffer.ts";

const numeric = ({
    signed,
    bits
} : {
    signed,
    bits,
}) : ITypeDefinition<bigint> => {

    return {
        forAbi: ({ endianness }) => {

            const layout : IType<bigint>["layout"] = ({ currentOffsetInBits }) => {
                return {
                    offsetInBits: currentOffsetInBits + bits
                };
            };

            const format : IType<bigint>["format"] = ({ value }) => {

                return fromUint8Array({ data: new Uint8Array(2), offsetInBits: 0, sizeInBits: bits });
            };

            const parse : IType<bigint>["parse"] = ({ data }) => {
                return 0n;
            };

            return {
                layout,
                format,
                parse,
                sizeInBits: bits
            };
        }
    };
};

export {
    numeric
};
