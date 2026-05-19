import nodeAssert from "node:assert";
import { define } from "../lib/parser.ts";
import { types } from "../lib/types/index.ts";
import { createArrayParser } from "../lib/types/array.ts";
import { createIntegerParser } from "../lib/types/integer.ts";
import type { TValueParser } from "../lib/types/value.ts";
import { describe, it } from "mocha";

const abi = {
  compiler: "gcc",
  dataModel: "LP64",
  endianness: "little",
} as const;

const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

describe("array-elements", () => {

  describe("integer arrays", () => {
    it("should parse an array of uint32", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "values", definition: { type: "array", elementType: types.UInt32, length: 3 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const data = new Uint8Array(12);
      const view = new DataView(data.buffer);
      view.setUint32(0, 1, true);
      view.setUint32(4, 2, true);
      view.setUint32(8, 3, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, { values: [1n, 2n, 3n] });
    });

    it("should format an array of uint32", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "values", definition: { type: "array", elementType: types.UInt32, length: 3 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({ value: { values: [1n, 2n, 3n] } });

      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      nodeAssert.strictEqual(view.getUint32(0, true), 1);
      nodeAssert.strictEqual(view.getUint32(4, true), 2);
      nodeAssert.strictEqual(view.getUint32(8, true), 3);
    });
  });

  describe("struct arrays", () => {
    const innerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "x", definition: types.UInt16 },
        { name: "y", definition: types.UInt16 },
      ],
    } as const;

    it("should parse an array of structs", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "points", definition: { type: "array", elementType: innerDef, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const data = new Uint8Array(8);
      const view = new DataView(data.buffer);
      view.setUint16(0, 10, true);
      view.setUint16(2, 20, true);
      view.setUint16(4, 30, true);
      view.setUint16(6, 40, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, {
        points: [
          { x: 10n, y: 20n },
          { x: 30n, y: 40n },
        ],
      });
    });

    it("should format an array of structs", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "points", definition: { type: "array", elementType: innerDef, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({
        value: {
          points: [
            { x: 10n, y: 20n },
            { x: 30n, y: 40n },
          ],
        },
      });

      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      nodeAssert.strictEqual(view.getUint16(0, true), 10);
      nodeAssert.strictEqual(view.getUint16(2, true), 20);
      nodeAssert.strictEqual(view.getUint16(4, true), 30);
      nodeAssert.strictEqual(view.getUint16(6, true), 40);
    });

    it("should parse struct arrays with padding", () => {
      const paddedInner = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "a", definition: UInt8 },
          { name: "b", definition: types.UInt32 },
        ],
      } as const;

      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "items", definition: { type: "array", elementType: paddedInner, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      // Each inner struct: 1 byte + 3 padding + 4 bytes = 8 bytes
      const data = new Uint8Array(16);
      const view = new DataView(data.buffer);
      view.setUint8(0, 0xAA);
      view.setUint32(4, 0x11223344, true);
      view.setUint8(8, 0xBB);
      view.setUint32(12, 0x55667788, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, {
        items: [
          { a: 0xAAn, b: 0x11223344n },
          { a: 0xBBn, b: 0x55667788n },
        ],
      });
    });

    it("should format struct arrays with padding", () => {
      const paddedInner = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "a", definition: UInt8 },
          { name: "b", definition: types.UInt32 },
        ],
      } as const;

      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "items", definition: { type: "array", elementType: paddedInner, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({
        value: {
          items: [
            { a: 0xAAn, b: 0x11223344n },
            { a: 0xBBn, b: 0x55667788n },
          ],
        },
      });

      const encodedView = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      nodeAssert.strictEqual(encodedView.getUint8(0), 0xAA);
      nodeAssert.strictEqual(encodedView.getUint32(4, true), 0x11223344);
      nodeAssert.strictEqual(encodedView.getUint8(8), 0xBB);
      nodeAssert.strictEqual(encodedView.getUint32(12, true), 0x55667788);
    });
  });

  describe("string arrays", () => {
    it("should parse an array of strings", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "names",
            definition: {
              type: "array",
              elementType: { type: "string", charSizeInBits: 8, nullTerminatorMandatory: true, length: 4 },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoder = new TextEncoder();
      const data = new Uint8Array([
        ...encoder.encode("abc"), 0,
        ...encoder.encode("xy"), 0, 0,
      ]);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, { names: ["abc", "xy"] });
    });

    it("should format an array of strings", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "names",
            definition: {
              type: "array",
              elementType: { type: "string", charSizeInBits: 8, nullTerminatorMandatory: true, length: 4 },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({ value: { names: ["abc", "xy"] } });

      const decoder = new TextDecoder();
      nodeAssert.strictEqual(decoder.decode(encoded.subarray(0, 3)), "abc");
      nodeAssert.strictEqual(encoded[3], 0);
      nodeAssert.strictEqual(decoder.decode(encoded.subarray(4, 6)), "xy");
      nodeAssert.strictEqual(encoded[6], 0);
    });
  });

  describe("pointer arrays", () => {
    it("should parse an array of pointers (LP64)", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "ptrs",
            definition: {
              type: "array",
              elementType: { type: "pointer", fixedAbi: {} },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const data = new Uint8Array(16);
      const view = new DataView(data.buffer);
      view.setBigUint64(0, 0x1000n, true);
      view.setBigUint64(8, 0x2000n, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, { ptrs: [0x1000n, 0x2000n] });
    });

    it("should format an array of pointers (LP64)", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "ptrs",
            definition: {
              type: "array",
              elementType: { type: "pointer", fixedAbi: {} },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({ value: { ptrs: [0x1000n, 0x2000n] } });

      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      nodeAssert.strictEqual(view.getBigUint64(0, true), 0x1000n);
      nodeAssert.strictEqual(view.getBigUint64(8, true), 0x2000n);
    });

    it("should parse an array of pointers (ILP32)", () => {
      const abi32 = {
        compiler: "gcc",
        dataModel: "ILP32",
        endianness: "little",
      } as const;

      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "ptrs",
            definition: {
              type: "array",
              elementType: { type: "pointer", fixedAbi: {} },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi: abi32 });

      const data = new Uint8Array(8);
      const view = new DataView(data.buffer);
      view.setUint32(0, 0x1000, true);
      view.setUint32(4, 0x2000, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, { ptrs: [0x1000n, 0x2000n] });
    });
  });

  describe("nested arrays", () => {
    it("should parse a nested array (array of arrays)", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "matrix",
            definition: {
              type: "array",
              elementType: { type: "array", elementType: types.UInt16, length: 3 },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const data = new Uint8Array(12);
      const view = new DataView(data.buffer);
      // Row 0
      view.setUint16(0, 1, true);
      view.setUint16(2, 2, true);
      view.setUint16(4, 3, true);
      // Row 1
      view.setUint16(6, 4, true);
      view.setUint16(8, 5, true);
      view.setUint16(10, 6, true);

      const parsed = parser.parse({ data });
      nodeAssert.deepStrictEqual(parsed, {
        matrix: [
          [1n, 2n, 3n],
          [4n, 5n, 6n],
        ],
      });
    });

    it("should format a nested array (array of arrays)", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          {
            name: "matrix",
            definition: {
              type: "array",
              elementType: { type: "array", elementType: types.UInt16, length: 3 },
              length: 2,
            },
          },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({
        value: {
          matrix: [
            [1n, 2n, 3n],
            [4n, 5n, 6n],
          ],
        },
      });

      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      nodeAssert.strictEqual(view.getUint16(0, true), 1);
      nodeAssert.strictEqual(view.getUint16(2, true), 2);
      nodeAssert.strictEqual(view.getUint16(4, true), 3);
      nodeAssert.strictEqual(view.getUint16(6, true), 4);
      nodeAssert.strictEqual(view.getUint16(8, true), 5);
      nodeAssert.strictEqual(view.getUint16(10, true), 6);
    });
  });

  describe("mixed struct with array", () => {
    it("should handle array field alongside other fields", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "count", definition: types.UInt32 },
          { name: "values", definition: { type: "array", elementType: types.UInt32, length: 3 } },
          { name: "flags", definition: UInt8 },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({
        value: {
          count: 3n,
          values: [10n, 20n, 30n],
          flags: 0xFFn,
        },
      });

      const parsed = parser.parse({ data: encoded });
      nodeAssert.deepStrictEqual(parsed, {
        count: 3n,
        values: [10n, 20n, 30n],
        flags: 0xFFn,
      });
    });
  });

  describe("array error handling", () => {
    const elementParser = createIntegerParser({
      sizeInBits: 32, signed: false, endianness: "little",
    }) as TValueParser<unknown>;

    it("should throw on unaligned array parsing", () => {
      const arrayParser = createArrayParser({ fieldParser: elementParser, elementSizeInBytes: 4, length: 2 });
      nodeAssert.throws(() => {
        arrayParser.parse({ data: new Uint8Array(8), offsetInBits: 1 });
      }, /unaligned array parsing not supported yet/);
    });

    it("should throw on unaligned array formatting", () => {
      const arrayParser = createArrayParser({ fieldParser: elementParser, elementSizeInBytes: 4, length: 2 });
      nodeAssert.throws(() => {
        arrayParser.format({ value: [1n, 2n], target: new Uint8Array(8), offsetInBits: 1 });
      }, /unaligned array formatting not supported yet/);
    });

    it("should throw on array length mismatch during format", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "values", definition: { type: "array", elementType: types.UInt32, length: 3 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      nodeAssert.throws(() => {
        parser.format({ value: { values: [1n, 2n] } });
      }, (err: Error) => {
        nodeAssert.match(err.message, /failed to format field "values"/);
        nodeAssert.ok(err.cause instanceof Error);
        nodeAssert.match((err.cause as Error).message, /array length mismatch/);
        return true;
      });
    });

    it("should throw on array element format error", () => {
      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "values", definition: { type: "array", elementType: types.UInt32, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      nodeAssert.throws(() => {
        parser.format({ value: { values: [1n, "not a number" as unknown as bigint] } });
      }, (err: Error) => {
        nodeAssert.ok(err.cause instanceof Error);
        nodeAssert.match((err.cause as Error).message, /failed to format array element at index 1/);
        return true;
      });
    });

    it("should throw when target buffer is too small", () => {
      const arrayParser = createArrayParser({ fieldParser: elementParser, elementSizeInBytes: 4, length: 3 });
      nodeAssert.throws(() => {
        arrayParser.format({ value: [1n, 2n, 3n], target: new Uint8Array(8), offsetInBits: 0 });
      }, /not enough space in target for array formatting/);
    });
  });

  describe("array of structs with nested arrays", () => {
    it("should handle struct elements containing arrays", () => {
      const innerDef = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "id", definition: types.UInt16 },
          { name: "data", definition: { type: "array", elementType: UInt8, length: 2 } },
        ],
      } as const;

      const definition = {
        type: "struct",
        packed: false,
        fixedAbi: {},
        fields: [
          { name: "items", definition: { type: "array", elementType: innerDef, length: 2 } },
        ],
      } as const;

      const parser = define({ definition }).parser({ abi });

      const encoded = parser.format({
        value: {
          items: [
            { id: 1n, data: [0xAAn, 0xBBn] },
            { id: 2n, data: [0xCCn, 0xDDn] },
          ],
        },
      });

      const parsed = parser.parse({ data: encoded });
      nodeAssert.deepStrictEqual(parsed, {
        items: [
          { id: 1n, data: [0xAAn, 0xBBn] },
          { id: 2n, data: [0xCCn, 0xDDn] },
        ],
      });
    });
  });
});
