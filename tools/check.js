const fs = require('node:fs');
const path = require('node:path');

const { runTests } = require('../runner');

const PROBLEMS_DIRECTORY = path.join(__dirname, '..', 'problems');

async function checkProblem(id, file) {
  const output = await runTests({
    code: fs.readFileSync(file, 'utf8'),
    problemDirectory: path.join(PROBLEMS_DIRECTORY, id),
    shouldMaskHidden: false,
  });
  if (output.compileError !== null) {
    console.log(`${id}: compile error\n${output.compileError}`);
    process.exitCode = 1;

    return;
  }

  output.resultList.forEach((result) => {
    if (result.status !== 'pass') {
      console.log(`${result.status.toUpperCase()} ${id} ${result.label}`);
      console.log(`  expected: ${JSON.stringify(result.expected)}`);
      console.log(`  actual:   ${JSON.stringify(result.actual)}`);
      process.exitCode = 1;
    }
  });
  const passedCount = output.resultList.filter((result) => result.status === 'pass').length;
  console.log(`${id}: ${passedCount}/${output.resultList.length} passed`);
}

async function main() {
  const [idArgument, fileArgument] = process.argv.slice(2);
  const idList = idArgument ? [idArgument] : fs.readdirSync(PROBLEMS_DIRECTORY);
  for (const id of idList) {
    const file = fileArgument ? path.resolve(fileArgument) : path.join(__dirname, id, 'reference.cpp');
    await checkProblem(id, file);
  }
}

main();
