// Judging shared by the desktop runner (Node) and the website (browser), so both grade code the same way.
(function exportJudge(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dryRunJudge = factory();
  }
})(globalThis, () => {
  function buildStdin(input, inputKeyList) {
    return inputKeyList.map((key) => {
      const lineList = input[key] || [];

      return [String(lineList.length), ...lineList].join('\n');
    }).join('\n') + '\n';
  }

  function normalize(text) {
    return text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  function judge(test, runResult, number, shouldMaskHidden) {
    const actual = runResult.stdout;
    let status = 'fail';
    if (runResult.isTimedOut) {
      status = 'timeout';
    } else if (runResult.exitCode !== 0) {
      status = 'error';
    } else if (normalize(actual) === normalize(test.expected)) {
      status = 'pass';
    }

    const name = `Test ${number}`;
    if (test.isHidden && shouldMaskHidden) {
      return { isHidden: true, name, status };
    }

    return {
      actual: normalize(actual),
      expected: test.expected,
      input: test.input,
      isHidden: test.isHidden,
      label: test.name,
      name,
      part: test.part,
      status,
      stderr: runResult.stderr,
    };
  }

  return { buildStdin, judge, normalize };
});
