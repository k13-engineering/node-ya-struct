const dataAndAlignmentModels = {
  LP64: {
    gcc: {
      Int8: {
        signed: true,
        align: 1,
        size: 1,
      },
      Int16: {
        signed: true,
        align: 2,
        size: 2,
      },
      Int32: {
        signed: true,
        align: 4,
        size: 4,
      },
      Int64: {
        signed: true,
        align: 8,
        size: 8,
      },

      UInt8: {
        signed: false,
        align: 1,
        size: 1,
      },
      UInt16: {
        signed: false,
        align: 2,
        size: 2,
      },
      UInt32: {
        signed: false,
        align: 4,
        size: 4,
      },
      UInt64: {
        signed: false,
        align: 8,
        size: 8,
      },

      Pointer: {
        signed: false,
        align: 8,
        size: 8,
      },
    },
  },
  default: {
    Int8: {
      signed: true,
      align: 1,
      size: 1,
    },
    Int16: {
      signed: true,
      align: 2,
      size: 2,
    },
    Int32: {
      signed: true,
      align: 4,
      size: 4,
    },
    Int64: {
      signed: true,
      align: 8,
      size: 8,
    },

    UInt8: {
      signed: false,
      align: 1,
      size: 1,
    },
    UInt16: {
      signed: false,
      align: 2,
      size: 2,
    },
    UInt32: {
      signed: false,
      align: 4,
      size: 4,
    },
    UInt64: {
      signed: false,
      align: 8,
      size: 8,
    },
  },
};

const abi = ({ dataModel, compiler, endianness }) => {
  const model =
    dataAndAlignmentModels[dataModel]?.[compiler] ||
    dataAndAlignmentModels.default;

  const findAlignedOffset = ({ offset, align }) => {
    return Math.floor((offset + align - 1) / align) * align;
  };

  const type = ({ signed, align, size }) => {
    return ({ offset }) => {
      const alignedOffset = findAlignedOffset({ offset, align });

      return {
        signed,
        offset: alignedOffset,
        size,
        endianness,
      };
    };
  };

  return {
    Int8: type({ ...model.Int8, endianness: undefined }),
    Int16: type({ ...model.Int16, endianness }),
    Int16LE: type({ ...model.Int16, endianness: "LE" }),
    Int16BE: type({ ...model.Int16, endianness: "BE" }),
    Int32: type({ ...model.Int32, endianness }),
    Int32LE: type({ ...model.Int32, endianness: "LE" }),
    Int32BE: type({ ...model.Int32, endianness: "BE" }),
    Int64: type({ ...model.Int64, endianness }),
    Int64LE: type({ ...model.Int64, endianness: "LE" }),
    Int64BE: type({ ...model.Int64, endianness: "BE" }),

    UInt8: type({ ...model.UInt8, endianness: undefined }),
    UInt16: type({ ...model.UInt16, endianness }),
    UInt16LE: type({ ...model.UInt16, endianness: "LE" }),
    UInt16BE: type({ ...model.UInt16, endianness: "BE" }),
    UInt32: type({ ...model.UInt32, endianness }),
    UInt32LE: type({ ...model.UInt32, endianness: "LE" }),
    UInt32BE: type({ ...model.UInt32, endianness: "BE" }),
    UInt64: type({ ...model.UInt64, endianness }),
    UInt64LE: type({ ...model.UInt64, endianness: "LE" }),
    UInt64BE: type({ ...model.UInt64, endianness: "BE" }),

    Pointer: type({ ...model.Pointer, endianness }),
  };
};

export default {
  abi,
};
