/* global describe */
/* global it */

import struct from "../lib/index.js";
import assert from "assert";

describe("basic", () => {
  it("should support structure definition", () => {
    const def = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    assert.equal(def.size, 8);
    assert.equal(def.offsetof("myfield1"), 0);
    assert.equal(def.sizeof("myfield1"), 4);
    assert.equal(def.offsetof("myfield2"), 4);
    assert.equal(def.sizeof("myfield2"), 4);
  });

  it("should allow empty instantiation", () => {
    const def = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    const buf = def.format({});

    assert.equal(buf.length, 8);
    assert.equal(buf.readUInt32LE(0), 0);
    assert.equal(buf.readUInt32LE(4), 0);
  });

  it("should format data correctly", () => {
    const def = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    const buf = def.format({
      "myfield1": 10n,
      "myfield2": 20n
    });

    assert.equal(buf.length, 8);
    assert.equal(buf.readUInt32LE(0), 10);
    assert.equal(buf.readUInt32LE(4), 20);
  });

  it("should partial-format data correctly", () => {
    const def = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    const buf = def.format({
      "myfield2": 20n
    });

    assert.equal(buf.length, 8);
    assert.equal(buf.readUInt32LE(0), 0);
    assert.equal(buf.readUInt32LE(4), 20);
  });

  it("should parse data correctly", () => {
    const def = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    const buf = def.format({});

    assert.equal(buf.length, 8);

    buf.writeUInt32LE(30, 0);

    const data = def.parse(buf);

    assert.equal(data.myfield1, 30n);
    assert.equal(data.myfield2, 0n);
  });
});
