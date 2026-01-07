import { type TCompiler, type TDataModel, type TAbi } from "../common.ts";
import { type TFieldType, type TCFieldType, type TPrimitiveBasicFieldType } from "./index.ts";

type TCField = TFieldType & { type: "c-type" };

type TPartialCTypeMappings = {
  [dataModel in TDataModel]?: {
    [compiler in TCompiler]?: {
      [field in TCFieldType]?: TPrimitiveBasicFieldType
    }
  }
};

const cTypeMappings: TPartialCTypeMappings = {
  LP64: {
    gcc: {
      "char": {
        type: "integer",
        sizeInBits: 8,
        fixedAbi: {},
        signed: true
      },
      "unsigned char": {
        type: "integer",
        sizeInBits: 8,
        fixedAbi: {},
        signed: false
      },
      "short": {
        type: "integer",
        sizeInBits: 16,
        fixedAbi: {},
        signed: true
      },
      "unsigned short": {
        type: "integer",
        sizeInBits: 16,
        fixedAbi: {},
        signed: false
      },
      "int": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: true
      },
      "unsigned int": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: false
      },
      "long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: true
      },
      "unsigned long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: false
      },
      "long long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: true
      },
      "unsigned long long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: false
      },
      "float": {
        type: "float",
        sizeInBits: 32,
        fixedAbi: {}
      },
      "double": {
        type: "float",
        sizeInBits: 64,
        fixedAbi: {}
      },
      "long double": {
        type: "float",
        sizeInBits: 128,
        fixedAbi: {}
      },
    }
  },

  ILP32: {
    gcc: {
      "char": {
        type: "integer",
        sizeInBits: 8,
        fixedAbi: {},
        signed: true
      },
      "unsigned char": {
        type: "integer",
        sizeInBits: 8,
        fixedAbi: {},
        signed: false
      },
      "short": {
        type: "integer",
        sizeInBits: 16,
        fixedAbi: {},
        signed: true
      },
      "unsigned short": {
        type: "integer",
        sizeInBits: 16,
        fixedAbi: {},
        signed: false
      },
      "int": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: true
      },
      "unsigned int": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: false
      },
      "long": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: true
      },
      "unsigned long": {
        type: "integer",
        sizeInBits: 32,
        fixedAbi: {},
        signed: false
      },
      "long long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: true
      },
      "unsigned long long": {
        type: "integer",
        sizeInBits: 64,
        fixedAbi: {},
        signed: false
      },
      "float": {
        type: "float",
        sizeInBits: 32,
        fixedAbi: {}
      },
      "double": {
        type: "float",
        sizeInBits: 64,
        fixedAbi: {}
      },
      "long double": {
        type: "float",
        sizeInBits: 128,
        fixedAbi: {}
      },
    }
  }
};

const createCTypeNormalizer = ({
  abi
}: {
  abi: TAbi
}) => {

  const fieldMappings = cTypeMappings[abi.dataModel]?.[abi.compiler];
  if (!fieldMappings) {
    throw Error(`no c-type mappings for data model ${abi.dataModel} and compiler ${abi.compiler}`);
  }

  const normalize = ({ cField }: { cField: TCField }): TPrimitiveBasicFieldType => {

    const mapping = fieldMappings[cField.cType];
    if (mapping === undefined) {
      throw Error(`no c-type mapping for c-type "${cField.cType}" for data model ${abi.dataModel} and compiler ${abi.compiler}`);
    }

    const mappingFixedAbi = mapping.fixedAbi;
    const fieldFixedAbi = cField.fixedAbi;

    const fixedAbi = {
      ...mappingFixedAbi,
      ...fieldFixedAbi
    };

    Object.keys(fixedAbi).forEach((keyAsString) => {
      const key = keyAsString as keyof TAbi;
      if (mappingFixedAbi[key] !== undefined && fieldFixedAbi[key] !== undefined) {
        throw Error(`conflicting fixed ABI property for key ${key} between c-type mapping and c-field`);
      }
    });

    return {
      ...mapping,
      fixedAbi
    };
  };

  return {
    normalize
  };
};

export {
  createCTypeNormalizer
};
