import tmp from "tmp-promise";
import path from "node:path";
import fs from "node:fs";
import child_process from "node:child_process";

const exec = ({ command }: { command: string }) => {
  return new Promise<{ stdout: string }>((resolve, reject) => {
    // eslint-disable-next-line k13-engineering/prefer-single-object-parameters
    child_process.exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(Error(`run failed: ${stderr}`, { cause: err }));
      } else {
        resolve({ stdout });
      }
    });
  });
};

const compileAndRun = async ({ sourceCode, bits }: { sourceCode: string, bits: 64 | 32 }) => {
  return await tmp.withDir(async (dir) => {
    const sourceFile = path.resolve(dir.path, "main.c");
    const binaryFile = path.resolve(dir.path, "main.out");

    await fs.promises.writeFile(sourceFile, sourceCode);
    try {
      await exec({ command: `gcc -m${bits} "${sourceFile}" -o "${binaryFile}"` });
      try {
        const { stdout } = await exec({ command: `"${binaryFile}"` });
        return { output: stdout };
      } finally {
        await fs.promises.unlink(binaryFile);
      }
    } finally {
      await fs.promises.unlink(sourceFile);
    }
  });
};

export {
  compileAndRun
};
