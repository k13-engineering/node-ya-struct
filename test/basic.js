/* global describe */
/* global it */

import struct from "../lib/index.js";
import assert from "assert";

describe("basic", () => {
  it("should support structure definition", () => {
    const def = struct
      .define(({ field }) => {
        field.UInt32LE("myfield1");
        field.UInt32LE("myfield2");
      })
      .abi({});

    assert.strictEqual(def.size, 8);
    assert.strictEqual(def.fields.myfield1.offset, 0);
    assert.strictEqual(def.fields.myfield1.size, 4);
    assert.strictEqual(def.fields.myfield2.offset, 4);
    assert.strictEqual(def.fields.myfield2.size, 4);
  });

  it("should allow empty instantiation", () => {
    const def = struct
      .define(({ field }) => {
        field.UInt32LE("myfield1");
        field.UInt32LE("myfield2");
      })
      .abi({});

    const buf = def.format({});

    assert.strictEqual(buf.length, 8);
    assert.strictEqual(buf.readUInt32LE(0), 0);
    assert.strictEqual(buf.readUInt32LE(4), 0);
  });

  it("should format data correctly", () => {
    const def = struct
      .define(({ field }) => {
        field.UInt32LE("myfield1");
        field.UInt32LE("myfield2");
      })
      .abi({});

    const buf = def.format({
      myfield1: 10n,
      myfield2: 20n,
    });

    assert.strictEqual(buf.length, 8);
    assert.strictEqual(buf.readUInt32LE(0), 10);
    assert.strictEqual(buf.readUInt32LE(4), 20);
  });

  it("should partial-format data correctly", () => {
    const def = struct
      .define(({ field }) => {
        field.UInt32LE("myfield1");
        field.UInt32LE("myfield2");
      })
      .abi({});

    const buf = def.format({
      myfield2: 20n,
    });

    assert.strictEqual(buf.length, 8);
    assert.strictEqual(buf.readUInt32LE(0), 0);
    assert.strictEqual(buf.readUInt32LE(4), 20);
  });

  it("should parse data correctly", () => {
    const def = struct
      .define(({ field }) => {
        field.UInt32LE("myfield1");
        field.UInt32LE("myfield2");
      })
      .abi({});

    const buf = def.format({});

    assert.strictEqual(buf.length, 8);

    buf.writeUInt32LE(30, 0);

    const data = def.parse(buf);

    assert.strictEqual(data.myfield1, 30n);
    assert.strictEqual(data.myfield2, 0n);
  });
});
