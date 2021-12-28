import refbuf from "./refbuf.js";

const createInterpretingMarshaller = ({ fieldDefinitions, size }) => {
  const findReadWriteMethodName = ({ signed, fieldSizeInBits, endianness }) => {
    const bigOrNot = fieldSizeInBits === 64 ? "Big" : "";
    const signedOrNot = signed ? "" : "U";
    const intType = `Int${fieldSizeInBits}`;

    return `${bigOrNot}${signedOrNot}${intType}${endianness || ""}`;
  };

  const marshal = ({ data, links }) => {
    const result = refbuf.create({ links, size });

    Object.keys(fieldDefinitions).forEach((fieldName) => {
      const {
        signed,
        offset,
        size: fieldSize,
        endianness,
      } = fieldDefinitions[fieldName];

      const fieldSizeInBits = fieldSize * 8;
      const writeFuncName = `write${findReadWriteMethodName({
        signed,
        fieldSizeInBits,
        endianness,
      })}`;
      const valueToWrite = writeFuncName.includes("Big")
        ? BigInt(data[fieldName])
        : Number(data[fieldName]);

      result[writeFuncName](valueToWrite, offset);
    });

    return result;
  };

  const unmarshal = ({ buffer }) => {
    let result = {};

    Object.keys(fieldDefinitions).forEach((fieldName) => {
      const {
        signed,
        offset,
        size: fieldSize,
        endianness,
      } = fieldDefinitions[fieldName];

      const fieldSizeInBits = fieldSize * 8;
      const readFuncName = `read${findReadWriteMethodName({
        signed,
        fieldSizeInBits,
        endianness,
      })}`;

      const val = buffer[readFuncName](offset);

      result = {
        ...result,
        [fieldName]: BigInt(val),
      };
    });

    return result;
  };

  return {
    marshal,
    unmarshal,
  };
};

const create = ({ fieldDefinitions, size }) => {
  return createInterpretingMarshaller({ fieldDefinitions, size });
};

export default {
  create,
};
