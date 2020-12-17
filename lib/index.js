import buffer2address from "buffer2address";
import os from "os";

import fieldBuilder from "./builder.js";
import refbuf from "./refbuf.js";

const defineWithBuilderAndAbi = ({ builder, abi }) => {
  const { fields, size } = fieldBuilder.createFieldsViaBuilder({ builder, abi });

  const offsetof = (fieldName) => {
    const field = fields[fieldName];
    if (!field) {
      throw new Error(`field "${fieldName}" not found`);
    }

    return field.offset;
  };

  const sizeof = (fieldName) => {
    const field = fields[fieldName];
    if (!field) {
      throw new Error(`field "${fieldName}" not found`);
    }

    return field.size;
  };

  const parse = (buf) => {
    if (!Buffer.isBuffer(buf)) {
      throw new Error(`given argument is not a buffer`);
    }

    if (buf.length < size) {
      throw new Error(`given buffer is too small for structure (has ${buf.length} bytes, needs ${size} bytes)`);
    }

    let result = {};

    Object.keys(fields).forEach((name) => {
      const field = fields[name];

      result = Object.assign({}, result, {
        [name]: field.readFrom({ "buffer": buf })
      });
    });

    return result;
  };

  const format = (data) => {
    if (typeof data !== "object") {
      throw new Error(`given argument is not a object`);
    }

    let primitives = {};
    let buffers = {};
    let links = [];

    Object.keys(data).forEach((fieldName) => {
      const value = data[fieldName];
      if (Buffer.isBuffer(value)) {
        buffers = Object.assign({}, buffers, {
          [fieldName]: value
        });
        links = [...links, value];
      } else if (typeof value === "bigint") {
        primitives = Object.assign({}, primitives, {
          [fieldName]: value
        });
      } else {
        throw new Error("only Buffer and BigInt supported");
      }
    });

    const result = refbuf.create({ links, size });

    Object.keys(primitives).forEach((fieldName) => {
      const value = data[fieldName];
      const field = fields[fieldName];
      field.writeTo({ "buffer": result, value });
    });

    Object.keys(buffers).forEach((fieldName) => {
      const value = buffer2address(data[fieldName]);
      const field = fields[fieldName];
      field.writeTo({ "buffer": result, value });
    });

    return result;
  };

  return {
    offsetof,
    sizeof,
    size,

    parse,
    format
  };
};

const abi = ({ endianness, dataModel }) => {
  const define = (builder) => {
    return defineWithBuilderAndAbi({
      builder,
      "abi": {
        endianness,
        dataModel
      }
    });
  };

  return {
    define
  };
};

const findHostDataModel = () => {
  if (process.arch === "x64") {
    if (process.platform === "win32") {
      return "LLP64";
    } else if (process.platform === "linux") {
      return "LP64";
    } else {
      throw new Error(`unsupported platform ${process.platform}`);
    }
  } else {
    throw new Error(`unsupported CPU architecture ${process.arch}`);
  }
};

const forHost = () => {
  const dataModel = findHostDataModel();
  const endianness = os.endianness();

  return abi({
    dataModel,
    endianness
  });
};

const define = (builder) => {
  return defineWithBuilderAndAbi({ builder });
};

export default {
  define,
  abi,
  forHost
};