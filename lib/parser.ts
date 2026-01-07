import type { TAbi } from "./common.ts";
import { layout, type TLayoutedField } from "./layout.ts";
import type { TFieldType } from "./types/index.ts";
import { createStructParser } from "./types/struct.ts";
import type { TValueParser } from "./types/value.ts";

type FieldValue<T extends TFieldType> =
  T extends { type: "integer" } ? bigint :
  T extends { type: "float" } ? number :
  T extends { type: "pointer" } ? bigint :
  T extends { type: "string" } ? string :
  T extends { type: "array"; elementType: infer E; length: number }
  ? FieldValue<E & TFieldType>[] :
  T extends { type: "struct"; fields: infer F }
  ? StructValue<F & readonly { name: string; definition: TFieldType }[]> :
  never;

type StructValue<
  F extends readonly { name: string; definition: TFieldType }[]
> = {
    [K in F[number]as K["name"]]: FieldValue<K["definition"]>;
  };

type Simplify<T> = {
  [K in keyof T]: T[K]
} & {};

type TParsedValueOfDefinition<T extends TFieldType> = Simplify<FieldValue<T>>;

type TParser<T extends TFieldType> = {
  size: number;
  parse: ({ data }: { data: Uint8Array }) => TParsedValueOfDefinition<T>;
  format: ({ value }: { value: TParsedValueOfDefinition<T> }) => Uint8Array;
  layout: TLayoutedField;
};

const define = <const T extends TFieldType>({ definition }: { definition: T }) => {

  const parser = ({ abi }: { abi: TAbi }): TParser<T> => {

    type P = TParser<T>;

    const l = layout({ definition, abi, currentOffsetInBits: 0 });

    const size = Math.ceil(l.sizeInBits / 8);

    // console.log(l);

    let valueParser: TValueParser<TParsedValueOfDefinition<T>>;

    if (l.type === "struct") {
      valueParser = createStructParser({
        layoutedFields: l.fields,
        endianness: abi.endianness
      }) as unknown as TValueParser<TParsedValueOfDefinition<T>>;
    } else {
      throw Error("only struct root definitions are supported currently");
    }

    const parse: P["parse"] = ({ data }) => {
      return valueParser.parse({ data, offsetInBits: 0 });
    };

    const format: P["format"] = ({ value }) => {
      const data = new Uint8Array(l.sizeInBits / 8);
      valueParser.format({ value, target: data, offsetInBits: 0 });

      return data;
    };

    return {
      size,
      parse,
      format,
      layout: l
    };
  };

  return {
    definition,
    parser
  };
};

export {
  define
};
