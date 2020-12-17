/* global describe */
/* global it */

import struct from "../lib/index.js";
import assert from "assert";

describe("abi", () => {
  it("should not support endian-less types without ABI specification", () => {
    assert.throws(() => {
      struct.define(({ field }) => {
        field.UInt32("myfield1");
        field.UInt32("myfield2");
      });
    });
  });

  const testEndiannessFor = ({ endianness }) => {
    it("should support structure definition", () => {
      const def = struct.abi({ endianness }).define(({ field }) => {
        field.UInt32("myfield1");
        field.UInt32("myfield2");
      });

      assert.equal(def.size, 8);
      assert.equal(def.offsetof("myfield1"), 0);
      assert.equal(def.sizeof("myfield1"), 4);
      assert.equal(def.offsetof("myfield2"), 4);
      assert.equal(def.sizeof("myfield2"), 4);
    });

    it("should parse data correctly", () => {
      const def = struct.abi({ endianness }).define(({ field }) => {
        field.UInt32("myfield1");
        field.UInt32("myfield2");
      });

      const buf = def.format({});

      buf[`writeUInt32${endianness}`](20, 0);
      buf[`writeUInt32${endianness}`](30, 4);

      const data = def.parse(buf);
      assert.equal(data.myfield1, 20n);
      assert.equal(data.myfield2, 30n);
    });

    it("should format data correctly", () => {
      const def = struct.abi({ endianness }).define(({ field }) => {
        field.UInt32("myfield1");
        field.UInt32("myfield2");
      });

      const buf = def.format({
        "myfield1": 20n,
        "myfield2": 30n
      });

      const myfield1 = buf[`readUInt32${endianness}`](0);
      const myfield2 = buf[`readUInt32${endianness}`](4);

      assert.equal(myfield1, 20n);
      assert.equal(myfield2, 30n);
    });
  };

  describe("little endian", () => {
    testEndiannessFor({ "endianness": "LE" });
  });

  describe("big endian", () => {
    testEndiannessFor({ "endianness": "BE" });
  });

  describe("data models", () => {
    describe("LP64", () => {
      const structAbi = struct.abi({ "endianness": "LE", "dataModel": "LP64" });

      it("should support structure definition", () => {
        const def = structAbi.define(({ field }) => {
          field.Pointer("myfield1");
          field.Pointer("myfield2");
        });

        assert.equal(def.size, 16);
        assert.equal(def.offsetof("myfield1"), 0);
        assert.equal(def.sizeof("myfield1"), 8);
        assert.equal(def.offsetof("myfield2"), 8);
        assert.equal(def.sizeof("myfield2"), 8);
      });

      it("should parse data correctly", () => {
        const def = structAbi.define(({ field }) => {
          field.Pointer("myfield1");
          field.Pointer("myfield2");
        });

        const buf = def.format({});

        buf.writeBigUInt64LE(20n, 0);
        buf.writeBigUInt64LE(30n, 8);

        const data = def.parse(buf);
        assert.equal(data.myfield1, 20n);
        assert.equal(data.myfield2, 30n);
      });

      it("should format data correctly", () => {
        const def = structAbi.define(({ field }) => {
          field.Pointer("myfield1");
          field.Pointer("myfield2");
        });

        const buf = def.format({
          "myfield1": 20n,
          "myfield2": 30n
        });

        const myfield1 = buf.readBigUInt64LE(0);
        const myfield2 = buf.readBigUInt64LE(8);

        assert.equal(myfield1, 20n);
        assert.equal(myfield2, 30n);
      });
    });
  });

  const supportedAbiPlatforms = [
    {
      "arch": "x64",
      "platform": "linux"
    }
  ];

  const isHostSupported = supportedAbiPlatforms.some(({ arch, platform }) => {
    return process.arch === arch && process.platform === platform;
  });

  describe("host detection", () => {
    (isHostSupported ? it : it.skip)("should detect host without error", () => {
      struct.forHost();
    });
  });
});
