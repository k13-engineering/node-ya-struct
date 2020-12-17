/* global describe */
/* global it */

import struct from "../lib/index.js";
import assert from "assert";

describe("referencing", () => {
  it("should allow buffer referencing", () => {
    const def1 = struct.define(({ field }) => {
      field.UInt32LE("myfield1");
      field.UInt32LE("myfield2");
    });

    const def2 = struct.define(({ field }) => {
      field.BigUInt64LE("pointerToDef1");
    });

    const buf1 = def1.format({});
    const buf2 = def2.format({
      "pointerToDef1": buf1
    });

    const addr = buf2.readBigUInt64LE(0);

    assert.equal(typeof addr, "bigint");
    assert(addr !== 0n);
    assert(Array.isArray(buf2.referencedBuffers));
    assert.equal(buf2.referencedBuffers.length, 1);
    assert.equal(buf2.referencedBuffers[0], buf1);
  });
});