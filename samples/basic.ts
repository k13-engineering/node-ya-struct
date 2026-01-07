import { define, types } from "../lib/index.ts";

const def = define({
  definition: {
    type: "struct",
    packed: false,
    fixedAbi: {},
    fields: [
      { name: "a", definition: types.Int16 },
      { name: "b", definition: types.UInt16 },
      { name: "c", definition: types.UInt32 },
    ]
  }
});

const parser = def.parser({
  abi: {
    endianness: "little",
    dataModel: "LP64",
    compiler: "gcc",
  }
});

const value: ReturnType<typeof parser.parse> = {
  a: 0n,
  b: 1n,
  c: 2n,
};

console.log("value", value);

const formatted = parser.format({
  value
});

console.log("formatted", formatted);

const reparsed = parser.parse({ data: formatted });

console.log("reparsed", reparsed);
