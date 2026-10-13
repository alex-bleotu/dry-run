// Runs a compiled solution (a WASI preview 1 program) with the given stdin and reports its output and exit code.
// The page stops this worker when a run goes over the time limit.
const MAX_OUTPUT_LENGTH = 1000000;
const WASI_MODULE = 'wasi_snapshot_preview1';
const ERRNO_SUCCESS = 0;
const ERRNO_BADF = 8;
const ERRNO_NOSYS = 52;
const ERRNO_SPIPE = 70;
const PROGRAM_NAME = 'program';

let programModule = null;

class ProcessExit extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

function describeCrash(error) {
  if (error instanceof RangeError && /call stack/i.test(error.message)) {
    return { exitCode: 'SIGSEGV', message: 'Stack overflow: the recursion is too deep for the browser.' };
  }
  if (error instanceof WebAssembly.RuntimeError && /unreachable/.test(error.message)) {
    return { exitCode: 'SIGABRT', message: 'Program aborted.' };
  }
  if (error instanceof WebAssembly.RuntimeError && /divide by zero|integer overflow/.test(error.message)) {
    return { exitCode: 'SIGFPE', message: `Runtime error: ${error.message}.` };
  }
  if (error instanceof WebAssembly.RuntimeError) {
    return { exitCode: 'SIGSEGV', message: `Runtime error: ${error.message}.` };
  }

  return { exitCode: 'SIGABRT', message: `Runtime error: ${error.message}` };
}

function createOutput() {
  const chunkList = [];
  let length = 0;

  return {
    text() {
      const bytes = new Uint8Array(length);
      let offset = 0;
      chunkList.forEach((chunk) => {
        bytes.set(chunk, offset);
        offset += chunk.length;
      });

      return new TextDecoder().decode(bytes);
    },
    write(bytes) {
      const room = MAX_OUTPUT_LENGTH - length;
      if (room > 0) {
        const chunk = bytes.slice(0, room);
        chunkList.push(chunk);
        length += chunk.length;
      }
    },
  };
}

function runProgram(stdinText) {
  const stdinBytes = new TextEncoder().encode(stdinText);
  let stdinOffset = 0;
  const outputByFd = { 1: createOutput(), 2: createOutput() };
  let memory = null;
  const view = () => new DataView(memory.buffer);
  const bytes = () => new Uint8Array(memory.buffer);
  const forEachIov = (iovs, iovsLength, callback) => {
    let total = 0;
    for (let index = 0; index < iovsLength; index += 1) {
      const pointer = view().getUint32(iovs + index * 8, true);
      const length = view().getUint32(iovs + index * 8 + 4, true);
      const done = callback(pointer, length);
      total += done;
      if (done < length) {
        break;
      }
    }

    return total;
  };

  const wasi = {
    args_get(argvPointer, bufferPointer) {
      view().setUint32(argvPointer, bufferPointer, true);
      bytes().set(new TextEncoder().encode(`${PROGRAM_NAME}\0`), bufferPointer);

      return ERRNO_SUCCESS;
    },
    args_sizes_get(countPointer, sizePointer) {
      view().setUint32(countPointer, 1, true);
      view().setUint32(sizePointer, PROGRAM_NAME.length + 1, true);

      return ERRNO_SUCCESS;
    },
    clock_res_get(clockId, resultPointer) {
      view().setBigUint64(resultPointer, 1000n, true);

      return ERRNO_SUCCESS;
    },
    clock_time_get(clockId, precision, resultPointer) {
      const nanoseconds = clockId === 0
        ? BigInt(Date.now()) * 1000000n
        : BigInt(Math.round(performance.now() * 1000000));
      view().setBigUint64(resultPointer, nanoseconds, true);

      return ERRNO_SUCCESS;
    },
    environ_get() {
      return ERRNO_SUCCESS;
    },
    environ_sizes_get(countPointer, sizePointer) {
      view().setUint32(countPointer, 0, true);
      view().setUint32(sizePointer, 0, true);

      return ERRNO_SUCCESS;
    },
    fd_close() {
      return ERRNO_SUCCESS;
    },
    fd_fdstat_get(fd, statPointer) {
      if (fd > 2) {
        return ERRNO_BADF;
      }
      bytes().fill(0, statPointer, statPointer + 24);
      view().setBigUint64(statPointer + 8, 0xffffffffffffffffn, true);
      view().setBigUint64(statPointer + 16, 0xffffffffffffffffn, true);

      return ERRNO_SUCCESS;
    },
    fd_prestat_dir_name() {
      return ERRNO_BADF;
    },
    fd_prestat_get() {
      return ERRNO_BADF;
    },
    fd_read(fd, iovs, iovsLength, readPointer) {
      if (fd !== 0) {
        return ERRNO_BADF;
      }
      const total = forEachIov(iovs, iovsLength, (pointer, length) => {
        const chunk = stdinBytes.subarray(stdinOffset, stdinOffset + length);
        bytes().set(chunk, pointer);
        stdinOffset += chunk.length;

        return chunk.length;
      });
      view().setUint32(readPointer, total, true);

      return ERRNO_SUCCESS;
    },
    fd_seek() {
      return ERRNO_SPIPE;
    },
    fd_write(fd, iovs, iovsLength, writtenPointer) {
      const output = outputByFd[fd];
      if (!output) {
        return ERRNO_BADF;
      }
      const total = forEachIov(iovs, iovsLength, (pointer, length) => {
        output.write(bytes().subarray(pointer, pointer + length));

        return length;
      });
      view().setUint32(writtenPointer, total, true);

      return ERRNO_SUCCESS;
    },
    proc_exit(code) {
      throw new ProcessExit(code);
    },
    random_get(pointer, length) {
      for (let offset = 0; offset < length; offset += 65536) {
        crypto.getRandomValues(bytes().subarray(pointer + offset, pointer + Math.min(length, offset + 65536)));
      }

      return ERRNO_SUCCESS;
    },
    sched_yield() {
      return ERRNO_SUCCESS;
    },
  };

  const importObject = { [WASI_MODULE]: {} };
  WebAssembly.Module.imports(programModule)
    .filter((entry) => entry.module === WASI_MODULE && entry.kind === 'function')
    .forEach(({ name }) => {
      importObject[WASI_MODULE][name] = wasi[name] || (() => ERRNO_NOSYS);
    });

  let exitCode = 0;
  let crashMessage = '';
  try {
    const instance = new WebAssembly.Instance(programModule, importObject);
    memory = instance.exports.memory;
    instance.exports._start();
  } catch (error) {
    if (error instanceof ProcessExit) {
      exitCode = error.code;
    } else {
      const crash = describeCrash(error);
      exitCode = crash.exitCode;
      crashMessage = crash.message;
    }
  }

  const stderr = outputByFd[2].text();

  return {
    exitCode,
    stderr: crashMessage ? `${stderr}${stderr && !stderr.endsWith('\n') ? '\n' : ''}${crashMessage}` : stderr,
    stdout: outputByFd[1].text(),
  };
}

globalThis.onmessage = ({ data }) => {
  if (data.type === 'load') {
    programModule = new WebAssembly.Module(data.wasm);
    globalThis.postMessage({ type: 'ready' });

    return;
  }

  globalThis.postMessage({ type: 'result', ...runProgram(data.stdin) });
};
