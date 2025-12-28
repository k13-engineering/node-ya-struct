import { define } from "../lib-new/parser.ts";
import { ascii, UInt32 } from "../lib-new/types/index.ts";

const nestedStruct = define({
    definition: {
        type: "struct",
        fields: [
            { name: "nestedField1", definition: UInt32 },
            { name: "nestedField2", definition: UInt32 },
        ],
        packed: false,
        fixedAbi: {}
    }
});

const struct = define({
    definition: {
        type: "struct",
        fields: [
            // { name: "field1", definition: { type: "integer", signed: false, sizeInBits: 32, fixedAbi: {} } }
            { name: "field1", definition: UInt32 },
            { name: "field2", definition: UInt32 },
            { name: "field3", definition: ascii({ length: 16 }) },
            // { name: "field4", definition: nestedStruct.definition }
        ],
        packed: false,
        fixedAbi: {}
    }
}).parser({
    abi: {
        endianness: "little",
        compiler: "gcc",
        dataModel: "LP64"
    }
});

const data = struct.format({
    value: {
        field1: 123n,
        field2: 456n,
        field3: "Hello, world!",
        // field4: {
        //     nestedField1: 789n,
        //     nestedField2: 101112n
        // }
    }
});

console.log("data:", data);

const parsed = struct.parse({ data });

console.log("parsed:", parsed);
