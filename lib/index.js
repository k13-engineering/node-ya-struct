import b2a from "buffer2address";
import os from "os";

import fieldBuilder from "./builder.js";

const defineWithBuilderAndAbi = ({ builder, abi }) => {
  const { fields, size, marshal, unmarshal } =
    fieldBuilder.createFieldsViaBuilder({ builder, abi });

  const parse = (buf) => {
    if (!Buffer.isBuffer(buf)) {
      throw new Error(`given argument is not a buffer`);
    }

    if (buf.length < size) {
      throw new Error(
        `given buffer is too small for structure (has ${buf.length} bytes, needs ${size} bytes)`
      );
    }

    return unmarshal({ buffer: buf });
  };

  let emptyData = {};
  Object.keys(fields).forEach((fieldName) => {
    emptyData = {
      ...emptyData,
      [fieldName]: 0n,
    };
  });

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
          [fieldName]: value,
        });
        links = [...links, value];
      } else if (typeof value === "bigint") {
        primitives = Object.assign({}, primitives, {
          [fieldName]: value,
        });
      } else {
        throw new Error(
          `only Buffer and BigInt supported, "${fieldName}" was of type "${typeof value}"`
        );
      }
    });

    let bufferDataToMarshal = {};

    Object.keys(buffers).forEach((fieldName) => {
      const value = b2a.buffer2address(data[fieldName]);

      bufferDataToMarshal = {
        ...bufferDataToMarshal,
        [fieldName]: value,
      };
    });

    return marshal({
      data: {
        ...emptyData,
        ...primitives,
        ...bufferDataToMarshal,
      },
      links,
    });
  };

  return {
    fields,
    size,

    parse,
    format,
  };
};

const hostDataModels = {
  x64: {
    win32: "LLP64",
    linux: "LP64",
  },
  arm: {
    linux: "ILP32",
  },
  arm64: {
    linux: "LP64",
  },
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
    arch: process.arch,
    platform: process.platform,
  });
};

const findLikelyHostCompiler = () => {
  return "gcc";
};

const define = (builder) => {
  const abi = ({ endianness, dataModel, compiler }) => {
    return defineWithBuilderAndAbi({
      builder,
      abi: {
        endianness,
        dataModel,
        compiler,
      },
    });
  };

  const forHost = () => {
    const endianness = os.endianness();
    const dataModel = findHostDataModel();
    const compiler = findLikelyHostCompiler();

    return abi({
      endianness,
      dataModel,
      compiler,
    });
  };

  return {
    abi,
    forHost,
  };
};

export default {
  define,
};
