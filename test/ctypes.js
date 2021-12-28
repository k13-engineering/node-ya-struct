/* global describe */
/* global it */

import struct from "../lib/index.js";
import tmp from "tmp-promise";
import path from "path";
import fs from "fs";
import child_process from "child_process";
import assert from "assert";

const cTypeNameMap = {
  signedChar: "signed char",
  signedShort: "signed short",
  signedInt: "signed int",
  signedLong: "signed long",
  signedLongLong: "signed long long",

  unsignedChar: "unsigned char",
  unsignedShort: "unsigned short",
  unsignedInt: "unsigned int",
  unsignedLong: "unsigned long",
  unsignedLongLong: "unsigned long long",

  //   float: "float",
  //   double: "double",
  //   longDouble: "long double",
};

const typesToTest = Object.keys(cTypeNameMap);

const exec = (command) => {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(stderr || err);
      } else {
        resolve(stdout);
      }
    });
  });
};

const compileAndRun = async ({ code }) => {
  return await tmp.withDir(async (dir) => {
    const sourceFile = path.resolve(dir.path, "main.c");
    const binaryFile = path.resolve(dir.path, "main.out");

    await fs.promises.writeFile(sourceFile, code);
    try {
      await exec(`gcc "${sourceFile}" -o "${binaryFile}"`);
      try {
        return await exec(`"${binaryFile}"`);
      } finally {
        await fs.promises.unlink(binaryFile);
      }
    } finally {
      await fs.promises.unlink(sourceFile);
    }
  });
};

const testNativeStructOffsetAndSize = async ({ fields }) => {
  const code = `
  #include <stdio.h>

  struct test_struct {
      ${fields.map((field) => `${field.type} ${field.name};`).join("\n")}
  };

  int main(int argc, char* argv[]) {
  ${fields
    .map((field) => {
      return `printf("${field.name} %i %i\\n",
           __builtin_offsetof(struct test_struct, ${field.name}),
           sizeof(((struct test_struct*) 0)->${field.name}));`;
    })
    .join("\n")}

    return 0;
  }
    `;

  const output = await compileAndRun({
    code,
  });

  let result = {};

  const lines = output
    .trim()
    .split("\n")
    .map((line) => line.trim());
  lines.forEach((line) => {
    const parts = line.split(/\s+/);
    const fieldName = parts[0];
    const offset = parseInt(parts[1], 10);
    const size = parseInt(parts[2], 10);

    result = {
      ...result,
      [fieldName]: {
        offset,
        size,
      },
    };
  });

  return result;
};

const genTestStructures = ({ numFields }) => {
  if (numFields === 0) {
    return [[]];
  }

  const other = genTestStructures({ numFields: numFields - 1 });

  let result = [];
  other.forEach((entry) => {
    typesToTest.forEach((type) => {
      result = [...result, [type, ...entry]];
    });
  });

  return result;
};

describe("ctypes", () => {
  const testStructures = genTestStructures({ numFields: 2 });

  testStructures.forEach((testStructure, idx) => {
    describe(`c test structure #${idx + 1}`, () => {
      it("should have correct offsets and sizes", async () => {
        const fields = testStructure.map((typeName, fieldIdx) => {
          return {
            name: `field${fieldIdx}`,
            type: `${cTypeNameMap[typeName]}`,
          };
        });

        const result = await testNativeStructOffsetAndSize({ fields });

        const def = struct
          .define(({ field }) => {
            testStructure.forEach((typeName, fieldIdx) => {
              field.CTypes[typeName](`field${fieldIdx}`);
            });
          })
          .forHost();

        let jsFields = {};
        Object.keys(def.fields).forEach((fieldName) => {
          jsFields = {
            ...jsFields,
            [fieldName]: {
              offset: def.fields[fieldName].offset,
              size: def.fields[fieldName].size,
            },
          };
        });

        assert.deepEqual(jsFields, result);
      });
    });
  });
});
