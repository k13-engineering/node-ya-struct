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
    "Pointer": "BigUInt64"
  }
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

      fields = Object.assign({}, fields, {
        [name]: {
          name,
          "readFrom": ({ buffer }) => {
            return BigInt(buffer[`read${type}`](offset));
          },
          "writeTo": ({ buffer, value }) => {
            if (type.indexOf("Big") >= 0) {
              buffer[`write${type}`](value, offset);
            } else {
              buffer[`write${type}`](Number(value), offset);
            }
          },
          "bufferType": type,
          offset,
          size
        }
      });

      currentOffset += size;
    };
  };

  let fieldObject = {};
  Object.keys(bufferTypeSizes).forEach((type) => {
    fieldObject = Object.assign({}, fieldObject, {
      [type]: standardField(type)
    });
  });

  if (endianness === "LE" || endianness === "BE") {
    [
      "Int16",
      "Int32",
      "BigInt64",
      "UInt16",
      "UInt32",
      "BigUInt64"
    ].forEach((endianType) => {
      fieldObject = Object.assign({}, fieldObject, {
        [endianType]: standardField(`${endianType}${endianness}`)
      });
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
