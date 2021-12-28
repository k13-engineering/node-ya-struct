import ctypes from "./types/ctypes.js";
import basicTypes from "./types/basic.js";
import marshallerFactory from "./marshaller.js";

const createFieldsViaBuilder = ({
  builder,
  abi: { endianness = "LE", dataModel = "LP64", compiler = "gcc" } = {},
}) => {
  let fieldDefinitions = {};

  let currentOffset = 0;

  const fieldBuilderForAbi = ({ abi }) => {
    let result = {};
    Object.keys(abi).forEach((typeName) => {
      result = {
        ...result,
        [typeName]: (name) => {
          const def = abi[typeName]({ offset: currentOffset });

          fieldDefinitions = {
            ...fieldDefinitions,
            [name]: def,
          };

          currentOffset = def.offset + def.size;
        },
      };
    });

    return result;
  };

  const basicTypesAbi = basicTypes.abi({ dataModel, compiler, endianness });
  const cTypesAbi = ctypes.abi({ dataModel, compiler, endianness });

  const field = {
    ...fieldBuilderForAbi({ abi: basicTypesAbi }),
    CTypes: fieldBuilderForAbi({ abi: cTypesAbi }),
  };

  builder({ field });

  const size = currentOffset;

  const { marshal, unmarshal } = marshallerFactory.create({
    fieldDefinitions,
    size,
  });

  return {
    fields: fieldDefinitions,
    size,

    marshal,
    unmarshal,
  };
};

export default {
  createFieldsViaBuilder,
};
