import nodeAssert from "node:assert";
import { define } from "../lib/parser.ts";
import { types } from "../lib/types/index.ts";

const abi = {
  compiler: "gcc",
  dataModel: "LP64",
  endianness: "little",
} as const;

const innerStructDefinition = {
  type: "struct",
  packed: false,
  fixedAbi: {},
  fields: [
    { name: "a", definition: types.UInt64 },
    { name: "b", definition: types.UInt32 },
    { name: "c", definition: types.UInt32 },
  ],
} as const;

const outerStructDefinition = {
  type: "struct",
  packed: false,
  fixedAbi: {},
  fields: [
    { name: "x", definition: types.UInt64 },
    { name: "inner", definition: innerStructDefinition },
  ],
} as const;

const expectedEncoded = () => {
  const data = new Uint8Array(24);
  const view = new DataView(data.buffer);

  view.setBigUint64(0, 1n, true);
  view.setBigUint64(8, 2n, true);
  view.setUint32(16, 3, true);
  view.setUint32(20, 4, true);

  return data;
};

describe("nested-structs", () => {
  it("should format nested structs", () => {
    const parser = define({ definition: outerStructDefinition }).parser({ abi });

    const encoded = parser.format({
      value: {
        x: 1n,
        inner: {
          a: 2n,
          b: 3n,
          c: 4n,
        },
      },
    });

    nodeAssert.deepStrictEqual(encoded, expectedEncoded());
  });

  it("should parse nested structs", () => {
    const parser = define({ definition: outerStructDefinition }).parser({ abi });

    const parsed = parser.parse({
      data: expectedEncoded(),
    });

    nodeAssert.deepStrictEqual(parsed, {
      x: 1n,
      inner: {
        a: 2n,
        b: 3n,
        c: 4n,
      },
    });
  });

  it("should align nested struct after smaller field", () => {
    // struct Outer { char x; struct Inner { int a; char b; } inner; char y; }
    // Inner alignment = 32 (from int), Inner size = 64 (with end padding)
    // x: offset 0, 8 bits
    // inner: offset 32, size 64 (aligned to 32)
    //   inner.a: offset 32, 32 bits
    //   inner.b: offset 64, 8 bits
    // y: offset 96, 8 bits
    // total: 128 bits = 16 bytes (with end padding to 32)
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const innerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "a", definition: types.UInt32 },
        { name: "b", definition: UInt8 },
      ],
    } as const;

    const outerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "x", definition: UInt8 },
        { name: "inner", definition: innerDef },
        { name: "y", definition: UInt8 },
      ],
    } as const;

    const parser = define({ definition: outerDef }).parser({ abi });

    const encoded = parser.format({
      value: {
        x: 0x11n,
        inner: { a: 0x22n, b: 0x33n },
        y: 0x44n,
      },
    });

    nodeAssert.strictEqual(encoded.length, 16);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // x at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // inner.a at byte 4
    nodeAssert.strictEqual(view.getUint32(4, true), 0x22);
    // inner.b at byte 8
    nodeAssert.strictEqual(view.getUint8(8), 0x33);
    // y at byte 12
    nodeAssert.strictEqual(view.getUint8(12), 0x44);

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed, {
      x: 0x11n,
      inner: { a: 0x22n, b: 0x33n },
      y: 0x44n,
    });
  });

  it("should align nested struct with 16-bit alignment", () => {
    // struct Outer { char x; struct Inner { short a; short b; } inner; }
    // Inner alignment = 16, Inner size = 32
    // x: offset 0, 8 bits
    // inner: offset 16, size 32 (aligned to 16)
    //   inner.a: offset 16, 16 bits
    //   inner.b: offset 32, 16 bits
    // total: 48 bits → pad to 16 → 48 = 6 bytes
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const innerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "a", definition: types.UInt16 },
        { name: "b", definition: types.UInt16 },
      ],
    } as const;

    const outerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "x", definition: UInt8 },
        { name: "inner", definition: innerDef },
      ],
    } as const;

    const parser = define({ definition: outerDef }).parser({ abi });

    const encoded = parser.format({
      value: {
        x: 0x11n,
        inner: { a: 0xAAn, b: 0xBBn },
      },
    });

    nodeAssert.strictEqual(encoded.length, 6);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // x at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // inner.a at byte 2
    nodeAssert.strictEqual(view.getUint16(2, true), 0xAA);
    // inner.b at byte 4
    nodeAssert.strictEqual(view.getUint16(4, true), 0xBB);
  });

  it("should handle packed nested struct inside non-packed struct", () => {
    // struct Outer { char x; struct __attribute__((packed)) Inner { int a; char b; } inner; }
    // Packed inner struct: alignment = 1 byte (8 bits), size = 40 bits (5 bytes, no padding)
    // x: offset 0, 8 bits
    // inner: offset 8, size 40 (aligned to 8 = 1 byte)
    //   inner.a: offset 8, 32 bits
    //   inner.b: offset 40, 8 bits
    // total: 48 bits → pad to 8 → 48 = 6 bytes
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const innerDef = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "a", definition: types.UInt32 },
        { name: "b", definition: UInt8 },
      ],
    } as const;

    const outerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "x", definition: UInt8 },
        { name: "inner", definition: innerDef },
      ],
    } as const;

    const parser = define({ definition: outerDef }).parser({ abi });

    const encoded = parser.format({
      value: {
        x: 0x11n,
        inner: { a: 0x22n, b: 0x33n },
      },
    });

    nodeAssert.strictEqual(encoded.length, 6);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // x at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // inner.a at byte 1 (packed, no alignment)
    nodeAssert.strictEqual(view.getUint32(1, true), 0x22);
    // inner.b at byte 5
    nodeAssert.strictEqual(view.getUint8(5), 0x33);
  });

  it("should handle nested struct end padding", () => {
    // struct Outer { struct Inner { int a; char b; } inner; int y; }
    // Inner alignment = 32, Inner size = 64 (with end padding from 40→64)
    // inner: offset 0, size 64
    //   inner.a: offset 0, 32 bits
    //   inner.b: offset 32, 8 bits
    // y: offset 64, 32 bits
    // total: 96 bits = 12 bytes
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const outerDef = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        {
          name: "inner",
          definition: {
            type: "struct",
            packed: false,
            fixedAbi: {},
            fields: [
              { name: "a", definition: types.UInt32 },
              { name: "b", definition: UInt8 },
            ],
          },
        },
        { name: "y", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: outerDef }).parser({ abi });

    const encoded = parser.format({
      value: {
        inner: { a: 0xAAn, b: 0xBBn },
        y: 0xCCn,
      },
    });

    nodeAssert.strictEqual(encoded.length, 12);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // inner.a at byte 0
    nodeAssert.strictEqual(view.getUint32(0, true), 0xAA);
    // inner.b at byte 4
    nodeAssert.strictEqual(view.getUint8(4), 0xBB);
    // y at byte 8 (after inner's end padding)
    nodeAssert.strictEqual(view.getUint32(8, true), 0xCC);

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed, {
      inner: { a: 0xAAn, b: 0xBBn },
      y: 0xCCn,
    });
  });

  it("should skip unnamed padding fields in parse/format", () => {
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "a", definition: UInt8 },
        { pad: true, name: undefined, definition: types.UInt32 },
        { name: "b", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    // a at byte 0 (8 bits), pad at byte 4 (32 bits, aligned), b at byte 8 (32 bits)
    nodeAssert.strictEqual(parser.size, 12);

    const encoded = parser.format({
      value: {
        a: 0x11n,
        b: 0x22n,
      },
    });

    nodeAssert.strictEqual(encoded.length, 12);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // a at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // b at byte 8
    nodeAssert.strictEqual(view.getUint32(8, true), 0x22);

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed, {
      a: 0x11n,
      b: 0x22n,
    });
  });

  it("should skip named padding fields in parse/format", () => {
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const def = {
      type: "struct",
      packed: false,
      fixedAbi: {},
      fields: [
        { name: "a", definition: UInt8 },
        { pad: true, name: "reserved", definition: types.UInt32 },
        { name: "b", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    nodeAssert.strictEqual(parser.size, 12);

    const encoded = parser.format({
      value: {
        a: 0x11n,
        b: 0x22n,
      },
    });

    nodeAssert.strictEqual(encoded.length, 12);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // a at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // reserved at byte 4 (zeroed, not formatted)
    nodeAssert.strictEqual(view.getUint32(4, true), 0x00);
    // b at byte 8
    nodeAssert.strictEqual(view.getUint32(8, true), 0x22);

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed, {
      a: 0x11n,
      b: 0x22n,
    });
  });

  it("should handle unnamed padding in packed struct", () => {
    const UInt8 = { type: "integer", sizeInBits: 8, signed: false, fixedAbi: {} } as const;

    const def = {
      type: "struct",
      packed: true,
      fixedAbi: {},
      fields: [
        { name: "a", definition: UInt8 },
        { pad: true, name: undefined, definition: UInt8 },
        { name: "b", definition: types.UInt32 },
      ],
    } as const;

    const parser = define({ definition: def }).parser({ abi });

    // packed: a at byte 0, pad at byte 1, b at byte 2
    nodeAssert.strictEqual(parser.size, 6);

    const encoded = parser.format({
      value: {
        a: 0x11n,
        b: 0x22n,
      },
    });

    nodeAssert.strictEqual(encoded.length, 6);

    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    // a at byte 0
    nodeAssert.strictEqual(view.getUint8(0), 0x11);
    // b at byte 2
    nodeAssert.strictEqual(view.getUint32(2, true), 0x22);

    const parsed = parser.parse({ data: encoded });
    nodeAssert.deepStrictEqual(parsed, {
      a: 0x11n,
      b: 0x22n,
    });
  });
});
