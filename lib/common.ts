type TDataModel = "LP64" | "ILP32";
type TCompiler = "gcc";
type TEndianness = "little" | "big";

type TAbi = {
  endianness: TEndianness;
  compiler: TCompiler;
  dataModel: TDataModel;
};

const align = ({ offset, alignment }: { offset: number; alignment: number }): number => {
  const remainder = offset % alignment;
  if (remainder === 0) {
    return offset;
  }

  return offset + (alignment - remainder);
};

export type {
  TDataModel,
  TCompiler,
  TEndianness,

  TAbi
};

export {
  align
};
