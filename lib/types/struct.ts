import type { TEndianness } from "../common.ts";
import type { TLayoutedField } from "../layout.ts";
import { createIntegerParser } from "./integer.ts";
import { createPointerParser } from "./pointer.ts";
import { createStringParser } from "./string.ts";
import { createArrayParser } from "./array.ts";
import type { TValueParser } from "./value.ts";
import type { TFieldType } from "./index.ts";

type TStructParser = TValueParser<Record<string, any>>;

const createStructParser = ({
    layoutedFields,
    endianness
}: {
    layoutedFields: (TLayoutedField & { type: "struct" })["fields"];
    endianness: TEndianness
}): TStructParser => {

    let sizeInBits = 0;
    layoutedFields.forEach((field) => {
        sizeInBits += field.definition.sizeInBits;
    });

    const fieldParsers: TValueParser<any>[] = layoutedFields.map((field) => {
        if (field.definition.type === "integer") {
            return createIntegerParser({
                sizeInBits: field.definition.sizeInBits,
                signed: field.definition.signed,
                endianness
            });
        }

        if (field.definition.type === "pointer") {
            return createPointerParser({
                sizeInBits: field.definition.sizeInBits,
                endianness
            });
        }

        if (field.definition.type === "struct") {
            return createStructParser({
                layoutedFields: field.definition.fields,
                endianness
            });
        }

        if (field.definition.type === "string") {
            return createStringParser({
                length: field.definition.length,
            });
        }

        if (field.definition.type === "array") {
            return createArrayParser({
                // TODO: cast should not be necessary
                elementType: field.definition.elementType as TFieldType,
                endianness,
                length: field.definition.length
            });
        }

        throw Error("not implemented yet");
    });

    const parse: TStructParser["parse"] = ({ data, offsetInBits }) => {
        if (offsetInBits !== 0) {
            throw Error("unaligned struct parsing not supported yet");
        }

        let result: Record<string, any> = {};

        layoutedFields.forEach((field, idx) => {
            const fieldParser = fieldParsers[idx];

            const offsetInBitsInByte = field.definition.offsetInBits % 8;
            if (offsetInBitsInByte !== 0) {
                throw Error("not implemented yet: unaligned field parsing");
            }

            const fieldData = new Uint8Array(data.buffer, data.byteOffset + (field.definition.offsetInBits / 8));
            result[field.name] = fieldParser.parse({ data: fieldData, offsetInBits: offsetInBitsInByte });
        });

        return result;
    };

    const format: TStructParser["format"] = ({ value, target, offsetInBits }) => {
        layoutedFields.forEach((field, idx) => {
            const fieldValue = value[field.name];
            const fieldParser = fieldParsers[idx];

            const offsetInBitsInByte = field.definition.offsetInBits % 8;
            if (offsetInBitsInByte !== 0) {
                throw Error("not implemented yet: unaligned field formatting");
            }

            const fieldTarget = new Uint8Array(target.buffer, target.byteOffset + (field.definition.offsetInBits / 8));

            try {
                fieldParser.format({ value: fieldValue, target: fieldTarget, offsetInBits });
            } catch (ex) {
                throw Error(`failed to format field "${field.name}"`, { cause: ex });
            }
        });
    };

    return {
        parse,
        format
    };
};

export {
    createStructParser
};
