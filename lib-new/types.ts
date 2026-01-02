
import type { IBitBuffer } from "./bit-buffer.ts";

enum EEndianness {
    LE = "LE",
    BE = "BE"
};

enum EDataModel {
    LP64 = "LP64",
    LLP64 = "LLP64",
    ILP32 = "ILP32"
};

enum ECompiler {
    GCC = "gcc",
};

interface IAbiProperties {
    endianness: EEndianness;
    dataModel: EDataModel;
    compiler: ECompiler;
};

interface IType<T> {
    layout: (args: { currentOffsetInBits: number }) => { offsetInBits: number };

    format: (args: { value: T }) => IBitBuffer;
    parse: (args: { data: IBitBuffer }) => T;

    sizeInBits: number;

    // generateParserCode?: (args: { name: string }) => string;
    // generateFormatterCode?: (args: { name: string }) => string;
};

interface ITypeDefinition<T> {
    forAbi: (args: IAbiProperties) => IType<T>;
};

export {
    EEndianness
};

export type {
    IAbiProperties,
    IType,
    ITypeDefinition
};
