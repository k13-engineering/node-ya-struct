import nodeAssert from "node:assert";
import { define } from "../lib/parser.ts";
import type { TFieldType } from "../lib/types/index.ts";

describe("bitfields", () => {
  it("should layout packed arbitrary-width integer fields", () => {
    const definition: TFieldType & { type: "struct" } = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        {
          name: "a",
          definition: {
            type: "integer",
            signed: false,
            sizeInBits: 3,
            fixedAbi: {}
          }
        },
        {
          name: "b",
          definition: {
            type: "integer",
            signed: false,
            sizeInBits: 5,
            fixedAbi: {}
          }
        },
        {
          name: "c",
          definition: {
            type: "integer",
            signed: false,
            sizeInBits: 9,
            fixedAbi: {}
          }
        }
      ]
    };

    const parser = define({ definition }).parser({
      abi: {
        compiler: "gcc",
        dataModel: "LP64",
        endianness: "little"
      }
    });

    nodeAssert.strictEqual(parser.size, 3);
    nodeAssert.strictEqual(parser.layout.type, "struct");

    const [a, b, c] = parser.layout.fields;
    nodeAssert.strictEqual(a.definition.offsetInBits, 0);
    nodeAssert.strictEqual(a.definition.sizeInBits, 3);
    nodeAssert.strictEqual(b.definition.offsetInBits, 3);
    nodeAssert.strictEqual(b.definition.sizeInBits, 5);
    nodeAssert.strictEqual(c.definition.offsetInBits, 8);
    nodeAssert.strictEqual(c.definition.sizeInBits, 9);
  });

  it("should format and parse signed and unsigned bitfields", () => {
    const definition: TFieldType & { type: "struct" } = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        {
          name: "a",
          definition: {
            type: "integer",
            signed: false,
            sizeInBits: 3,
            fixedAbi: {}
          }
        },
        {
          name: "b",
          definition: {
            type: "integer",
            signed: true,
            sizeInBits: 5,
            fixedAbi: {}
          }
        },
        {
          name: "c",
          definition: {
            type: "integer",
            signed: false,
            sizeInBits: 10,
            fixedAbi: {}
          }
        }
      ]
    };

    const parser = define({ definition }).parser({
      abi: {
        compiler: "gcc",
        dataModel: "LP64",
        endianness: "little"
      }
    });

    const sourceValue = {
      a: 5n,
      b: -7n,
      c: 777n
    };

    const formatted = parser.format({ value: sourceValue });
    nodeAssert.strictEqual(formatted.length, 3);

    const parsed = parser.parse({ data: formatted });
    nodeAssert.deepStrictEqual(parsed, sourceValue);
  });
});
