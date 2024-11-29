import refbuf from "./refbuf.js";

const createInterpretingMarshaller = ({ fieldDefinitions, size }) => {
  const findReadWriteMethodName = ({ signed, fieldSizeInBits, endianness }) => {
    const bigOrNot = fieldSizeInBits === 64 ? "Big" : "";
    const signedOrNot = signed ? "" : "U";
    const intType = `Int${fieldSizeInBits}`;

    return `${bigOrNot}${signedOrNot}${intType}${endianness || ""}`;
  };

  const workBuffer = Buffer.alloc(size);

  const fieldMarshalers = Object.keys(fieldDefinitions).map((fieldName) => {
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


    // if (!result[writeFuncName]) {
    //   throw Error(`can't marshal "${fieldName}" ${JSON.stringify(fieldDefinitions[fieldName])}`);
    // }

    const writeFunction = workBuffer[writeFuncName].bind(workBuffer);
    const needsBigInt = writeFuncName.includes("Big");

    return ({ data }) => {
      const value = data[fieldName];
      const valueToWrite = needsBigInt ? BigInt(value) : Number(value);

      writeFunction(valueToWrite, offset);
    };
  });

  const marshal = ({ data, links }) => {

    workBuffer.fill(0);

    fieldMarshalers.forEach((fieldMarshaler) => {
      fieldMarshaler({ data });
    });

    const result = refbuf.create({ links, size });
    workBuffer.copy(result);

    return result;
  };

  const fieldUnmarshalers = Object.keys(fieldDefinitions).map((fieldName) => {
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

    const readFunction = workBuffer[readFuncName].bind(workBuffer);

    return ({ result }) => {
      const val = readFunction(offset);

      // TODO: remove this once immutability is fast
      result[fieldName] = BigInt(val);
    };
  });

  const unmarshal = ({ buffer }) => {

    // eslint-disable-next-line prefer-const
    let result = {};

    buffer.copy(workBuffer);

    fieldUnmarshalers.forEach((fieldUnmarshaler) => {
      fieldUnmarshaler({ result });
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
