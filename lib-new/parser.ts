type TFieldParserLayoutReturn = {
    offsetInBits: number;
    sizeInBits: number;
};

type TFieldParserLayoutParams = {
    predecessors: TFieldParserLayoutReturn[];
};

type TFieldParser<T> = {
    layout: (params: TFieldParserLayoutParams) => TFieldParserLayoutReturn;

    parse: (params: { data: Uint8Array }) => T;
    format: (params: { value: T }) => Uint8Array;
};

export type {
    TFieldParser
};
