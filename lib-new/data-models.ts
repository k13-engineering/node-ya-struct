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
  ILP32: {
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
        align: 4,
        size: 4,
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

export {
    dataAndAlignmentModels
};
