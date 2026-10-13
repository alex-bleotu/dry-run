const { writeTests } = require('../lib/write-tests');
const { solve } = require('./reference');

const ALLOWED_ORDER_EXAMPLE = ['1,alice', '2,alice', '3,bob', '4,alice', '5,bob'];
const WINDOW_EXAMPLE = ['1,alice', '2,alice', '3,alice', '11,alice', '12,alice', '13,alice'];
const OVERRIDE_REQUESTS = ['1,alice', '2,bob', '3,bob', '4,carol', '5,carol', '6,carol', '7,carol', '8,alice', '9,alice'];

const VISIBLE_EXPECTED = {
  'Part 1 example':
    '1,alice,ALLOWED\n2,alice,ALLOWED\n3,bob,ALLOWED\n4,alice,BLOCKED\n5,bob,ALLOWED',
  'Part 2 example':
    '1,alice,ALLOWED\n2,alice,ALLOWED\n3,alice,BLOCKED\n11,alice,ALLOWED\n12,alice,ALLOWED\n13,alice,BLOCKED',
  'Part 3 example':
    '1,alice,ALLOWED\n2,bob,ALLOWED\n3,bob,BLOCKED\n4,carol,ALLOWED\n5,carol,ALLOWED\n6,carol,ALLOWED\n7,carol,BLOCKED\n8,alice,ALLOWED\n9,alice,BLOCKED',
  'Part 4 example': '1,dave,BLOCKED\n2,alice,ALLOWED\n3,dave,BLOCKED',
};

const visibleList = [
  { input: { config: ['2,1000000'], requests: ALLOWED_ORDER_EXAMPLE }, name: 'Part 1 example', part: 1 },
  { input: { config: ['2,10'], requests: WINDOW_EXAMPLE }, name: 'Part 2 example', part: 2 },
  {
    input: { config: ['2,10'], overrides: ['bob,1', 'carol,3'], requests: OVERRIDE_REQUESTS },
    name: 'Part 3 example',
    part: 3,
  },
  {
    input: { blocked: ['dave'], config: ['1,10'], requests: ['1,dave', '2,alice', '3,dave'] },
    name: 'Part 4 example',
    part: 4,
  },
];

const hiddenList = [
  { input: { requests: ['1,a', '2,a', '3,b'] }, name: 'no config allows everything', part: 1 },
  { input: { blocked: ['x'], requests: ['1,x', '2,y'] }, name: 'no config but blocked user', part: 4 },
  { input: { config: ['0,10'], requests: ['1,a'] }, name: 'limit zero blocks all', part: 1 },
  {
    input: { config: ['5,10'], overrides: ['a,0'], requests: ['1,a', '2,b'] },
    name: 'override limit zero',
    part: 3,
  },
  {
    input: { config: ['1,1'], requests: ['5,a', '5,a', '6,a', '6,a', '7,a'] },
    name: 'window of one second',
    part: 2,
  },
  {
    input: { config: ['1,10'], requests: ['1,a', '2,a', '11,a'] },
    name: 'blocked requests are not counted',
    part: 2,
  },
  {
    input: { config: ['1,100'], requests: ['1,a', '2,b', '3,a', '4,b'] },
    name: 'users are independent',
    part: 1,
  },
  {
    input: {
      config: ['1,100'],
      overrides: ['vip,3'],
      requests: ['1,vip', '2,vip', '3,vip', '4,vip', '5,a', '6,a'],
    },
    name: 'override above default',
    part: 3,
  },
  {
    input: { blocked: ['a'], config: ['5,10'], overrides: ['a,5'], requests: ['1,a'] },
    name: 'blocked user with override',
    part: 4,
  },
  {
    input: {
      config: ['2,500000000000'],
      requests: ['1000000000000,a', '1000000000001,a', '1000000000002,a', '1500000000001,a'],
    },
    name: 'large timestamps',
    part: 2,
  },
  { input: { config: ['2,10'], requests: [] }, name: 'no requests', part: 1 },
  {
    input: { config: ['5,10'], overrides: ['a,1', 'a,3'], requests: ['1,a', '2,a', '3,a', '4,a'] },
    name: 'last override wins',
    part: 3,
  },
  {
    input: { overrides: ['a,1'], requests: ['1,a', '100,a', '1,b'] },
    name: 'override without config',
    part: 3,
  },
  {
    input: { config: ['3,5'], requests: ['1,a', '1,a', '1,a', '1,a', '6,a'] },
    name: 'same timestamp burst',
    part: 2,
  },
];

writeTests({
  hiddenList,
  problemId: 'rate-limiter',
  solve,
  visibleExpected: VISIBLE_EXPECTED,
  visibleList,
});
