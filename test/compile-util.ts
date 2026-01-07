import tmp from "tmp-promise";
import path from "node:path";
import fs from "node:fs";
import child_process from "node:child_process";
import assert from "node:assert";

const exec = ({ command }: { command: string }) => {
    return new Promise<{ stdout: string }>((resolve, reject) => {
        child_process.exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(Error(`run failed: ${stderr}`, { cause: err }));
            } else {
                resolve({ stdout });
            }
        });
    });
};

const compileAndRun = async ({ code, bits }: { code: string, bits: 64 | 32 }) => {
    return await tmp.withDir(async (dir) => {
        const sourceFile = path.resolve(dir.path, "main.c");
        const binaryFile = path.resolve(dir.path, "main.out");

        await fs.promises.writeFile(sourceFile, code);
        try {
            await exec({ command: `gcc -m${bits} "${sourceFile}" -o "${binaryFile}"` });
            try {
                return await exec({ command: `"${binaryFile}"` });
            } finally {
                await fs.promises.unlink(binaryFile);
            }
        } finally {
            await fs.promises.unlink(sourceFile);
        }
    });
};

const determineCCompilerStructLayout = async ({
    definitions,
    structName,
    fieldNames,
    bits
}: {
    definitions: string,
    structName: string,
    fieldNames: string[],
    bits: 64 | 32
}) => {
    const code = `

    ${definitions}

    #include <stdio.h>

    int main(int argc, char* argv[]) {
      printf("{ \\"fields\\": {");
      ${fieldNames.map((field, idx) => {

        let lines = [`printf("\\"${field}\\": { \\"offset\\": %i, \\"length\\": %i }",
                     __builtin_offsetof(struct ${structName}, ${field}),
                    sizeof(((struct ${structName}*) 0)->${field}));`];

        if (idx < fieldNames.length - 1) {
            lines = [...lines, ` printf(", "); `];
        }

        return lines.join("\n");
    }).join("\n")}
      printf("} }");


      return 0;
    }
  `;

    const { stdout } = await compileAndRun({ code, bits });

    const parsed = JSON.parse(stdout.trim());

    const fields = parsed.fields;
    Object.keys(fields).forEach((fieldName) => {
        assert.ok(typeof fields[fieldName].offset === "number");
        assert.ok(typeof fields[fieldName].length === "number");
    });

    return fields as { [key: string]: { offset: number; length: number } };
};

export {
    compileAndRun,
    determineCCompilerStructLayout
};
