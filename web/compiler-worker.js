// Compiles solutions with Clang built for WebAssembly (@yowasp/clang). Loaded as a module worker by practice.js.
// tools/build-web.js gzips the compiler's large files and splits them into parts; this worker puts them back
// together, and uses the precompiled <bits/stdc++.h> from the build so each compile skips the standard headers.
const COMPILER_URL = new URL('../compiler/', import.meta.url);
const PCH_NAME = 'stdc++.pch';
const nativeFetch = globalThis.fetch.bind(globalThis);

let compilerPromise = null;
let lastStatus = '';
let manifest = null;

function postStatus(text) {
  if (text !== lastStatus) {
    lastStatus = text;
    globalThis.postMessage({ text, type: 'status' });
  }
}

async function fetchOk(url) {
  const response = await nativeFetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }

  return response;
}

function joinParts(partList) {
  const responsePromiseList = partList.map((part) => fetchOk(new URL(part, COMPILER_URL)));
  responsePromiseList.forEach((promise) => promise.catch(() => {}));
  let index = 0;
  let reader = null;

  return new ReadableStream({
    async pull(controller) {
      while (index < responsePromiseList.length) {
        if (!reader) {
          reader = (await responsePromiseList[index]).body.getReader();
        }
        const { done, value } = await reader.read();
        if (!done) {
          controller.enqueue(value);

          return;
        }
        reader = null;
        index += 1;
      }
      controller.close();
    },
  });
}

function fetchPacked(name) {
  const entry = manifest.fileMap[name];
  const stream = joinParts(entry.partList).pipeThrough(new DecompressionStream('gzip'));

  return new Response(stream, { headers: { 'content-type': entry.type } });
}

// The compiler bundle captures fetch when it is first imported, so the packed files are served from here.
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), globalThis.location.href);
  const name = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
  if (manifest && url.href.startsWith(COMPILER_URL.href) && manifest.fileMap[name]) {
    return Promise.resolve(fetchPacked(name));
  }

  return nativeFetch(input, init);
};

function loadCompiler() {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      postStatus('Downloading compiler...');
      manifest = await (await fetchOk(new URL('manifest.json', COMPILER_URL))).json();
      const [{ Exit, runClang }, pch] = await Promise.all([
        import(new URL('bundle.js', COMPILER_URL).href),
        fetchPacked(PCH_NAME).arrayBuffer().then((buffer) => new Uint8Array(buffer)),
      ]);
      const fetchProgress = ({ doneLength, totalLength }) => {
        const percent = Math.min(100, Math.floor((100 * doneLength) / totalLength));
        postStatus(percent < 100 ? `Downloading compiler... ${percent}%` : 'Starting compiler...');
      };
      await runClang(['clang++', '--version'], {}, { fetchProgress, stderr: null, stdout: null });
      postStatus(manifest.description);

      return { Exit, pch, runClang };
    })();
    compilerPromise.catch((error) => {
      console.error('Compiler failed to load', { error });
      compilerPromise = null;
      postStatus('Compiler failed to load');
    });
  }

  return compilerPromise;
}

async function compile(code) {
  const { Exit, pch, runClang } = await loadCompiler();
  const decoder = new TextDecoder();
  let message = '';
  const collect = (bytes) => {
    if (bytes) {
      message += decoder.decode(bytes, { stream: true });
    }
  };
  const fileTree = {
    include: { bits: { 'stdc++.h': manifest.header } },
    'solution.cpp': code,
    [PCH_NAME]: pch,
  };
  const argumentList = [
    'clang++',
    ...manifest.compileFlagList,
    '-include-pch',
    PCH_NAME,
    'solution.cpp',
    ...manifest.linkFlagList,
    '-o',
    'program',
  ];
  try {
    const output = await runClang(argumentList, fileTree, { decodeASCII: false, stderr: collect, stdout: collect });

    return { compileError: null, wasm: output.program };
  } catch (error) {
    if (error instanceof Exit) {
      return { compileError: message || error.message, wasm: null };
    }
    throw error;
  }
}

globalThis.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    loadCompiler().catch(() => {});

    return;
  }

  try {
    const { compileError, wasm } = await compile(data.code);
    globalThis.postMessage({ compileError, id: data.id, wasm }, wasm ? [wasm.buffer] : []);
  } catch (error) {
    globalThis.postMessage({ error: `Could not compile: ${error.message}`, id: data.id });
  }
};
