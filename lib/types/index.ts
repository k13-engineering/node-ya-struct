import type { TAbi } from "../common.ts";

type TCFieldType =
  "char" | "unsigned char" |
  "short" | "unsigned short" |
  "int" | "unsigned int" |
  "long" | "unsigned long" |
  "long long" | "unsigned long long" |
  "float" | "double" | "long double";

type TFieldType = {
  readonly type: "integer";
  readonly sizeInBits: number;
  readonly signed: boolean;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "float";
  readonly sizeInBits: number;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "pointer";
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "array";
  readonly elementType: TFieldType;
  readonly length: number;
} | {
  readonly type: "struct";
  readonly fields: readonly { readonly name: string; readonly definition: TFieldType }[];
  readonly packed: boolean;
  readonly fixedAbi: Partial<TAbi>;
} | {
  readonly type: "string";
  readonly charSizeInBits: number;
  readonly nullTerminatorMandatory: boolean;
  readonly length: number;
} | {
  readonly type: "c-type";
  readonly cType: TCFieldType;
  readonly fixedAbi: Partial<TAbi>;
};

type TBasicFieldType = Exclude<TFieldType, { type: "c-type" }>;
type TPrimitiveBasicFieldType = Exclude<TBasicFieldType, { type: "array" } | { type: "struct" } | { type: "string" }>;

const Int16: TFieldType = {
  type: "integer",
  sizeInBits: 16,
  signed: true,
  fixedAbi: {}
} as const;

const UInt16: TFieldType = {
  type: "integer",
  sizeInBits: 16,
  signed: false,
  fixedAbi: {}
} as const;

const Int32: TFieldType = {
  type: "integer",
  sizeInBits: 32,
  signed: true,
  fixedAbi: {}
} as const;

const Int64: TFieldType = {
  type: "integer",
  sizeInBits: 64,
  signed: true,
  fixedAbi: {}
} as const;

const UInt32: TFieldType = {
  type: "integer",
  sizeInBits: 32,
  signed: false,
  fixedAbi: {}
} as const;

const UInt64: TFieldType = {
  type: "integer",
  sizeInBits: 64,
  signed: false,
  fixedAbi: {}
} as const;

const ascii = ({ length }: { length: number }): TFieldType => {
  return {
    type: "string",
    charSizeInBits: 8,
    nullTerminatorMandatory: true,
    length
  } as const;
};

const pointer: TFieldType = {
  type: "pointer",
  fixedAbi: {}
} as const;

export type {
  TBasicFieldType,
  TFieldType,
  TCFieldType,
  TPrimitiveBasicFieldType
};

const types = {
  Int16,
  UInt16,
  Int32,
  Int64,
  UInt32,
  UInt64,
  ascii,
  pointer
} as const;

export {
  types
};
