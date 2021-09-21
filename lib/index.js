import b2a from "buffer2address";
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
        throw new Error(`only Buffer and BigInt supported, "${fieldName}" was of type "${typeof value}"`);
      }
    });

    const result = refbuf.create({ links, size });

    Object.keys(primitives).forEach((fieldName) => {
      const value = data[fieldName];
      const field = fields[fieldName];
      field.writeTo({ "buffer": result, value });
    });

    Object.keys(buffers).forEach((fieldName) => {
      const value = b2a.buffer2address(data[fieldName]);
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

const hostDataModels = {
  "x64": {
    "win32": "LLP64",
    "linux": "LP64"
  }
};

const findDataModelFor = ({ arch, platform }) => {
  const archDataModels = hostDataModels[arch];
  if (!archDataModels) {
    throw new Error(`unsupported CPU architecture ${arch}`);
  }

  const dataModel = archDataModels[platform];
  if (!dataModel) {
    throw new Error(`unsupported platform ${platform}`);
  }

  return dataModel;
};

const findHostDataModel = () => {
  return findDataModelFor({
    "arch": process.arch,
    "platform": process.platform
  });
};

const alignmentModels = {
  "LP64": {
    "gcc": {
      "Int8": 1,
      "UInt8": 1,
      "Int16": 2,
      "UInt16": 2,
      "Int32": 4,
      "UInt32": 4,
      "Int64": 8,
      "UInt64": 8
    }
  }
};

const findLikelyHostCompiler = () => {
  return "gcc";
};

const findHostAlignmentModel = () => {
  const dataModel = findHostDataModel();

  const compiler = findLikelyHostCompiler();

  return alignmentModels[dataModel] && alignmentModels[dataModel][compiler];
};

const define = (builder) => {
  const abi = ({ endianness, dataModel, alignmentModel }) => {
    return defineWithBuilderAndAbi({
      builder,
      "abi": {
        endianness,
        dataModel,
        alignmentModel
      }
    });
  };

  const forHost = () => {
    const endianness = os.endianness();
    const dataModel = findHostDataModel();
    const alignmentModel = findHostAlignmentModel();
  
    return abi({
      endianness,
      dataModel,
      alignmentModel
    });
  };
  
  return {
    abi,
    forHost
  };
};

export default {
  define,
  alignmentModels
};
