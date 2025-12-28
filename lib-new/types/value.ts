import type { TBitBuffer } from "../bit-buffer.ts";

type TValueParser<T> = {
    parse: ({ data }: { data: Uint8Array, offsetInBits: number }) => T;
    format: ({ value, target }: { value: T, target: Uint8Array, offsetInBits: number }) => void;
};

export type {
    TValueParser
};
