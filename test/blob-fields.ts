import nodeAssert from "node:assert";
import { define } from "../lib/parser.ts";
import { types } from "../lib/types/index.ts";
import { createBlobParser } from "../lib/types/blob.ts";

const abi = {
  compiler: "gcc",
  dataModel: "LP64",
  endianness: "little",
} as const;

describe("blob-fields", () => {
  it("should parse a blob field", () => {
    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "data", definition: types.blob({ sizeInBytes: 4 }) },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    const input = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const parsed = parser.parse({ data: input });

    nodeAssert.ok(parsed.data instanceof Uint8Array);
    nodeAssert.deepStrictEqual(parsed.data, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });

  it("should return a copy when parsing (not a view of the original)", () => {
    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "data", definition: types.blob({ sizeInBytes: 4 }) },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    const input = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
    const parsed = parser.parse({ data: input });

    // Modify original — parsed copy should be unaffected
    // eslint-disable-next-line immutable/no-mutation -- test
    input[0] = 0x00;
    nodeAssert.strictEqual(parsed.data[0], 0xAA);
  });

  it("should format a blob field", () => {
    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "data", definition: types.blob({ sizeInBytes: 4 }) },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    const encoded = parser.format({
      value: {
        data: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
      },
    });

    nodeAssert.deepStrictEqual(encoded, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });

  it("should roundtrip parse/format a blob field", () => {
    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "data", definition: types.blob({ sizeInBytes: 6 }) },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    const original = {
      data: new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]),
    };

    const encoded = parser.format({ value: original });
    const parsed = parser.parse({ data: encoded });

    nodeAssert.deepStrictEqual(parsed.data, original.data);
  });

  it("should handle blob alongside integer fields", () => {
    const def = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "header", definition: types.UInt32 },
        { name: "payload", definition: types.blob({ sizeInBytes: 8 }) },
        { name: "footer", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    nodeAssert.strictEqual(parser.size, 16);

    const encoded = parser.format({
      value: {
        header: 0x12345678n,
        payload: new Uint8Array([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7]),
        footer: 0xDEADBEEFn,
      },
    });

    nodeAssert.strictEqual(encoded.length, 16);

    const parsed = parser.parse({ data: encoded });

    nodeAssert.strictEqual(parsed.header, 0x12345678n);
    nodeAssert.deepStrictEqual(
      parsed.payload,
      new Uint8Array([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7])
    );
    nodeAssert.strictEqual(parsed.footer, 0xDEADBEEFn);
  });

  it("should handle blob in non-packed struct with alignment", () => {
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "a", definition: UInt8 },
        { name: "data", definition: types.blob({ sizeInBytes: 3 }) },
        { name: "b", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    // a: byte 0 (8 bits), data: byte 1 (24 bits, byte-aligned), b: byte 4 (32 bits, aligned to 32)
    nodeAssert.strictEqual(parser.size, 8);

    const encoded = parser.format({
      value: {
        a: 0x11n,
        data: new Uint8Array([0xAA, 0xBB, 0xCC]),
        b: 0x22n,
      },
    });

    const parsed = parser.parse({ data: encoded });
    nodeAssert.strictEqual(parsed.a, 0x11n);
    nodeAssert.deepStrictEqual(parsed.data, new Uint8Array([0xAA, 0xBB, 0xCC]));
    nodeAssert.strictEqual(parsed.b, 0x22n);
  });

  it("should handle blob in array", () => {
    const def = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        {
          name: "items",
          definition: {
            type: "array",
            elementType: types.blob({ sizeInBytes: 2 }),
            length: 3,
          },
        },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    nodeAssert.strictEqual(parser.size, 6);

    const encoded = parser.format({
      value: {
        items: [
          new Uint8Array([0x01, 0x02]),
          new Uint8Array([0x03, 0x04]),
          new Uint8Array([0x05, 0x06]),
        ],
      },
    });

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed.items, [
      new Uint8Array([0x01, 0x02]),
      new Uint8Array([0x03, 0x04]),
      new Uint8Array([0x05, 0x06]),
    ]);
  });

  it("should reject blob format with wrong size", () => {
    const def = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "data", definition: types.blob({ sizeInBytes: 4 }) },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    nodeAssert.throws(() => {
      parser.format({
        value: {
          data: new Uint8Array([0x01, 0x02]),
        },
      });
    }, /blob size mismatch|failed to format field/);
  });

  it("should handle zero-length blob", () => {
    const def = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "header", definition: types.UInt32 },
        { name: "empty", definition: types.blob({ sizeInBytes: 0 }) },
        { name: "footer", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    nodeAssert.strictEqual(parser.size, 8);

    const encoded = parser.format({
      value: {
        header: 1n,
        empty: new Uint8Array(0),
        footer: 2n,
      },
    });

    const parsed = parser.parse({ data: encoded });
    nodeAssert.strictEqual(parsed.header, 1n);
    nodeAssert.deepStrictEqual(parsed.empty, new Uint8Array(0));
    nodeAssert.strictEqual(parsed.footer, 2n);
  });

  it("should handle blob in nested struct", () => {
    const innerDef = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "id", definition: types.UInt16 },
        { name: "payload", definition: types.blob({ sizeInBytes: 4 }) },
      ],
    } as const;

    const outerDef = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "inner", definition: innerDef },
        { name: "tail", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: outerDef }).parser({ abi });

    nodeAssert.strictEqual(parser.size, 10);

    const encoded = parser.format({
      value: {
        inner: {
          id: 0x1234n,
          payload: new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]),
        },
        tail: 0x42n,
      },
    });

    const parsed = parser.parse({ data: encoded });
    nodeAssert.strictEqual(parsed.inner.id, 0x1234n);
    nodeAssert.deepStrictEqual(parsed.inner.payload, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]));
    nodeAssert.strictEqual(parsed.tail, 0x42n);
  });

  it("should throw on unaligned blob parse", () => {
    const parser = createBlobParser({ sizeInBytes: 4 });

    nodeAssert.throws(() => {
      parser.parse({ data: new Uint8Array(8), offsetInBits: 1 });
    }, /unaligned data in blob parser/);
  });

  it("should throw when parse data is too short", () => {
    const parser = createBlobParser({ sizeInBytes: 4 });

    nodeAssert.throws(() => {
      parser.parse({ data: new Uint8Array(2), offsetInBits: 0 });
    }, /not enough data for blob parsing/);
  });

  it("should throw on unaligned blob format", () => {
    const parser = createBlobParser({ sizeInBytes: 4 });

    nodeAssert.throws(() => {
      parser.format({ value: new Uint8Array(4), target: new Uint8Array(8), offsetInBits: 1 });
    }, /unaligned data in blob formatter/);
  });

  it("should throw when format target is too small", () => {
    const parser = createBlobParser({ sizeInBytes: 4 });

    nodeAssert.throws(() => {
      parser.format({ value: new Uint8Array(4), target: new Uint8Array(2), offsetInBits: 0 });
    }, /not enough space in target for blob formatting/);
  });
});
