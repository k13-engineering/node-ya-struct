const dataAndAlignmentModels = {
  LP64: {
    gcc: {
      signedChar: {
        signed: true,
        size: 1,
        align: 1,
      },
      signedShort: {
        signed: true,
        size: 2,
        align: 2,
      },
      signedInt: {
        signed: true,
        size: 4,
        align: 4,
      },
      signedLong: {
        signed: true,
        size: 8,
        align: 8,
      },
      signedLongLong: {
        signed: true,
        size: 8,
        align: 8,
      },
      unsignedChar: {
        signed: false,
        size: 1,
        align: 1,
      },
      unsignedShort: {
        signed: false,
        size: 2,
        align: 2,
      },
      unsignedInt: {
        signed: false,
        size: 4,
        align: 4,
      },
      unsignedLong: {
        signed: false,
        size: 8,
        align: 8,
      },
      unsignedLongLong: {
        signed: false,
        size: 8,
        align: 8,
      },
    },
  },
  ILP32: {
    gcc: {
      signedChar: {
        signed: true,
        size: 1,
        align: 1,
      },
      signedShort: {
        signed: true,
        size: 2,
        align: 2,
      },
      signedInt: {
        signed: true,
        size: 4,
        align: 4,
      },
      signedLong: {
        signed: true,
        size: 4,
        align: 4,
      },
      signedLongLong: {
        signed: true,
        size: 8,
        align: 8,
      },
      unsignedChar: {
        signed: false,
        size: 1,
        align: 1,
      },
      unsignedShort: {
        signed: false,
        size: 2,
        align: 2,
      },
      unsignedInt: {
        signed: false,
        size: 4,
        align: 4,
      },
      unsignedLong: {
        signed: false,
        size: 4,
        align: 4,
      },
      unsignedLongLong: {
        signed: false,
        size: 8,
        align: 8,
      },
    },
  },
};

const abi = ({ dataModel, compiler, endianness }) => {
  const model = dataAndAlignmentModels[dataModel]?.[compiler];
  if (!model) {
    throw Error(
      `data model ${dataModel} on compiler ${compiler} not supported`
    );
  }

  const findAlignedOffset = ({ offset, align }) => {
    return Math.floor((offset + align - 1) / align) * align;
  };

  const type = ({ signed, size, align }) => {
    return ({ offset }) => {
      const alignedOffset = findAlignedOffset({ offset, align });

      return {
        signed,
        offset: alignedOffset,
        size,
        endianness: size > 1 ? endianness : undefined,
      };
    };
  };

  return {
    char: type(model.signedChar),
    short: type(model.signedShort),
    int: type(model.signedInt),
    long: type(model.signedLong),
    longLong: type(model.signedLongLong),

    signedChar: type(model.signedChar),
    signedShort: type(model.signedShort),
    signedInt: type(model.signedInt),
    signedLong: type(model.signedLong),
    signedLongLong: type(model.signedLongLong),

    unsignedChar: type(model.unsignedChar),
    unsignedShort: type(model.unsignedShort),
    unsignedInt: type(model.unsignedInt),
    unsignedLong: type(model.unsignedLong),
    unsignedLongLong: type(model.unsignedLongLong),
  };
};

export default {
  abi,
};
