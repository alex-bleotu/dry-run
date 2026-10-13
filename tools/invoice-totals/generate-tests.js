const { writeTests } = require('../lib/write-tests');
const { solve } = require('./reference');

const RATES = ['EUR,110', 'GBP,125'];
const INVOICES = ['acme,1000,EUR', 'acme,200,USD', 'globex,100,GBP'];
const DISCOUNTS = ['acme,10'];
const REFUNDS = ['acme,100,EUR', 'globex,500,USD'];

const VISIBLE_EXPECTED = {
  'Part 1 example': 'acme,1200\nglobex,500',
  'Part 2 example': 'acme,1300\nglobex,125',
  'Part 3 example': 'acme,1170\nglobex,125',
  'Part 4 example': 'acme,1071\nglobex,0',
};

const visibleList = [
  {
    input: { invoices: ['acme,1000,USD', 'globex,500,USD', 'acme,200,USD'] },
    name: 'Part 1 example',
    part: 1,
  },
  { input: { invoices: INVOICES, rates: RATES }, name: 'Part 2 example', part: 2 },
  { input: { discounts: DISCOUNTS, invoices: INVOICES, rates: RATES }, name: 'Part 3 example', part: 3 },
  {
    input: { discounts: DISCOUNTS, invoices: INVOICES, rates: RATES, refunds: REFUNDS },
    name: 'Part 4 example',
    part: 4,
  },
];

const hiddenList = [
  {
    input: { invoices: ['a,100,USD', 'b,100,XYZ'] },
    name: 'unknown currency ignored',
    part: 2,
  },
  { input: { invoices: ['a,100,EUR'], rates: ['EUR,110', 'EUR,120'] }, name: 'later rate wins', part: 2 },
  { input: { invoices: ['a,100,USD'], rates: ['USD,200'] }, name: 'USD rate line ignored', part: 2 },
  {
    input: { discounts: ['a,100'], invoices: ['a,500,USD'] },
    name: 'full discount',
    part: 3,
  },
  { input: { discounts: ['a,0'], invoices: ['a,500,USD'] }, name: 'zero discount', part: 3 },
  { input: { discounts: ['a,101'], invoices: ['a,500,USD'] }, name: 'invalid discount ignored', part: 3 },
  {
    input: { discounts: ['a,10', 'a,20', 'a,150'], invoices: ['a,500,USD'] },
    name: 'last valid discount wins',
    part: 3,
  },
  { input: { refunds: ['z,50,USD'] }, name: 'refund only customer', part: 4 },
  {
    input: { discounts: ['a,50'], invoices: ['a,100,USD'], refunds: ['a,300,USD'] },
    name: 'refund exceeds invoices',
    part: 4,
  },
  { input: { invoices: ['a,10,X'], rates: ['X,33'] }, name: 'total rounds down', part: 2 },
  {
    input: { discounts: ['a,50'], invoices: ['a,199,USD'] },
    name: 'rounds down after discount',
    part: 3,
  },
  {
    input: { invoices: ['a,1000000000,EUR', 'a,1000000000,EUR'], rates: ['EUR,150'] },
    name: 'total exceeds 32 bits',
    part: 2,
  },
  { input: {}, name: 'empty input', part: 1 },
  {
    input: { discounts: ['ghost,10'], invoices: ['a,10,USD'] },
    name: 'discount for unknown customer',
    part: 3,
  },
  {
    input: { invoices: ['b2,5,USD', 'b10,5,USD', 'a,5,USD'] },
    name: 'customers sorted as strings',
    part: 1,
  },
  {
    input: { invoices: ['a,100,USD'], refunds: ['a,50,XYZ'] },
    name: 'refund in unknown currency ignored',
    part: 4,
  },
  {
    input: { invoices: ['a,100,USD', 'a,50,USD'], refunds: ['a,30,USD', 'a,20,USD'] },
    name: 'several refunds',
    part: 4,
  },
];

writeTests({
  hiddenList,
  problemId: 'invoice-totals',
  solve,
  visibleExpected: VISIBLE_EXPECTED,
  visibleList,
});
