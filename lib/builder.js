/* global BigInt */

const bufferTypeSizes = {
  "UInt8": 1,
  "UInt16LE": 2,
  "UInt16BE": 2,
  "UInt32LE": 4,
  "UInt32BE": 4,
  "BigUInt64LE": 8,
  "BigUInt64BE": 8,

  "Int8": 1,
  "Int16LE": 2,
  "Int16BE": 2,
  "Int32LE": 4,
  "Int32BE": 4,
  "BigInt64LE": 8,
  "BigInt64BE": 8
};

const dataModelMaps = {
  "LP64": {
    "Pointer": "UInt64"
  }
};

const createAccessorFor = ({ type, offset }) => {
  const readFrom = ({ buffer }) => {
    return BigInt(buffer[`read${type}`](offset));
  };

  const writeTo = ({ buffer, value }) => {
    if (type.indexOf("Big") >= 0) {
      buffer[`write${type}`](value, offset);
    } else {
      buffer[`write${type}`](Number(value), offset);
    }
  };

  return {
    readFrom,
    writeTo
  };
};

const createFieldsViaBuilder = ({ builder, "abi": { endianness, dataModel } = {} }) => {
  let fields = {};

  let currentOffset = 0;

  const standardField = (type) => {
    return (name) => {
      const offset = currentOffset;
      const size = bufferTypeSizes[type];
      if (size === undefined) {
        throw new Error(`could not map unknown type "${type}"`);
      }

      const { readFrom, writeTo } = createAccessorFor({ type, offset });

      fields = Object.assign({}, fields, {
        [name]: {
          name,
          readFrom,
          writeTo,
          offset,
          size
        }
      });

      currentOffset += size;
    };
  };

  let fieldObject = {
    "UInt8": standardField("UInt8"),
    "UInt16LE": standardField("UInt16LE"),
    "UInt16BE": standardField("UInt16BE"),
    "UInt32LE": standardField("UInt32LE"),
    "UInt32BE": standardField("UInt32BE"),
    "UInt64LE": standardField("BigUInt64LE"),
    "UInt64BE": standardField("BigUInt64BE"),

    "Int8": standardField("Int8"),
    "Int16LE": standardField("Int16LE"),
    "Int16BE": standardField("Int16BE"),
    "Int32LE": standardField("Int32LE"),
    "Int32BE": standardField("Int32BE"),
    "Int64LE": standardField("BigInt64LE"),
    "Int64BE": standardField("BigInt64BE")
  };

  if (endianness === "LE" || endianness === "BE") {
    fieldObject = Object.assign({}, fieldObject, {
      "Int16": standardField(`Int16${endianness}`),
      "Int32": standardField(`Int32${endianness}`),
      "Int64": standardField(`BigInt64${endianness}`),
      "UInt16": standardField(`UInt16${endianness}`),
      "UInt32": standardField(`UInt32${endianness}`),
      "UInt64": standardField(`BigUInt64${endianness}`),
    });
  }

  const dataModelMap = dataModelMaps[dataModel] || {};
  Object.keys(dataModelMap).forEach((key) => {
    fieldObject = Object.assign({}, fieldObject, {
      [key]: fieldObject[dataModelMap[key]]
    });
  });

  builder({ "field": fieldObject });

  const size = currentOffset;

  return {
    fields,
    size
  };
};

export default {
  createFieldsViaBuilder
};
