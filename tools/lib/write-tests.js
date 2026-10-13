const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function withExpected(testList, solve, expectedByName) {
  return testList.map((test) => {
    const expected = solve(test.input).join('\n');
    if (expectedByName) {
      assert.strictEqual(expected, expectedByName[test.name], test.name);
    }

    return { expected, input: test.input, name: test.name, part: test.part };
  });
}

function writeTests({ hiddenList, problemId, solve, visibleExpected, visibleList }) {
  const testsDirectory = path.join(__dirname, '..', '..', 'problems', problemId, 'tests');
  fs.mkdirSync(testsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(testsDirectory, 'visible.json'),
    `${JSON.stringify(withExpected(visibleList, solve, visibleExpected), null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(testsDirectory, 'hidden.json'),
    `${JSON.stringify(withExpected(hiddenList, solve, null), null, 2)}\n`,
  );
  console.log(`${problemId}: visible ${visibleList.length}, hidden ${hiddenList.length}`);
}

module.exports = { writeTests };
