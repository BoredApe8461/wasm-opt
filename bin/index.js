const fs = require('fs');
const tar = require('tar');
const path = require('path');
const fetch = require('node-fetch');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

/**
 * Creates URL for wasm-opt binary
 *
 * @returns {Promise<string>} binary url
 */
async function getUrl() {
  const { arch, platform } = process;
  const baseURL = 'https://github.com/WebAssembly/binaryen/releases/download/version_100';

  switch (platform) {
    case 'win32':
      if (arch === 'x64') {
        return `${baseURL}/binaryen-version_100-x86_64-windows.tar.gz`;
      }
      break;
    case 'darwin':
      if (arch === 'x64') {
        return `${baseURL}/binaryen-version_100-x86_64-macos.tar.gz`;
      }
      break;
    case 'linux':
      if (arch === 'x64') {
        return `${baseURL}/binaryen-version_100-x86_64-linux.tar.gz`;
      }
      break;
  }

  throw new Error('\x1b[33mThis platform not supported\x1b[0m');
}

/**
 * Returns wasm-opt or wasm-opt.exe string
 *
 * @returns {Promise<string>} name
 */
async function getExecutableFilename() {
  return process.platform === 'win32' ? 'wasm-opt.exe' : 'wasm-opt';
}

/**
 * Returns unpack folder name
 *
 * @returns {Promise<string>} unpack folder name
 */
async function getUnpackedFolderName() {
  return 'binaryen-version_100';
}

/**
 * Downloads binaries
 */
async function main() {
  try {
    const executableFilename = await getExecutableFilename();
    const binariesOutputPath = path.resolve(__dirname, 'binaries.tar');

    const binaryUrl = await getUrl();
    const binaryResponse = await fetch(binaryUrl);
    const binary = await binaryResponse.buffer();

    await writeFile(binariesOutputPath, binary);

    await tar.extract({
      file: binariesOutputPath,
      filter: (_path, stat) => stat.header
        .path
        .split('/')
        .includes(executableFilename),
    });

    const unpackedFolder = path.resolve(__dirname, '..', await getUnpackedFolderName());
    const unpackedBinFolder = path.resolve(unpackedFolder, 'bin');
    const downloadedWasmOpt = path.resolve(unpackedBinFolder, executableFilename);
    const outputWasmOpt = path.resolve(__dirname, await getExecutableFilename());

    await copyFile(downloadedWasmOpt, outputWasmOpt);

    await unlink(binariesOutputPath);
    await unlink(downloadedWasmOpt);
    await rmdir(unpackedBinFolder);
    await rmdir(unpackedFolder);
  } catch (e) {
    throw new Error(`\x1b[31m${e}\x1b[0m`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
