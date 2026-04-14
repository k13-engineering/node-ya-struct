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
});
