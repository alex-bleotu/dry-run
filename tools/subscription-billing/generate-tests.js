const { writeTests } = require('../lib/write-tests');
const { solve } = require('./reference');

const BASE = ['user1,sub_a,30', 'user1,sub_b,60', 'user2,sub_c,30', 'user3,sub_d,150'];
const BASE_CHANGES = [
  'user1,sub_a,sub_a_plus,11,60',
  'user2,sub_c,sub_c_pro,16,120',
  'user1,sub_a_plus,sub_a_pro,21,120',
];
const BASE_CANCELLATIONS = ['user1,sub_b,6', 'user1,sub_a_pro,26', 'user3,sub_d,31'];
const BASE_STARTS = ['user2,sub_e,10,90', 'user4,sub_f,25,30'];

const VISIBLE_EXPECTED = {
  'Part 1 example': 'user1,90\nuser2,30\nuser3,150',
  'Part 2 example': 'user1,130\nuser2,75\nuser3,150',
  'Part 3 example': 'user1,60\nuser2,75\nuser3,150',
  'Part 4 example': 'user1,60\nuser2,138\nuser3,150\nuser4,6',
};

const visibleList = [
  { input: { subscriptions: BASE }, name: 'Part 1 example', part: 1 },
  { input: { changes: BASE_CHANGES, subscriptions: BASE }, name: 'Part 2 example', part: 2 },
  {
    input: { cancellations: BASE_CANCELLATIONS, changes: BASE_CHANGES, subscriptions: BASE },
    name: 'Part 3 example',
    part: 3,
  },
  {
    input: {
      cancellations: BASE_CANCELLATIONS,
      changes: BASE_CHANGES,
      starts: BASE_STARTS,
      subscriptions: BASE,
    },
    name: 'Part 4 example',
    part: 4,
  },
];

const hiddenList = [
  { input: { subscriptions: ['solo,only,7'] }, name: 'single user single sub', part: 1 },
  {
    input: { subscriptions: ['user2,a,1', 'user10,b,2', 'user1,c,3', 'user2,d,4'] },
    name: 'users sorted as strings',
    part: 1,
  },
  {
    input: { subscriptions: ['big,a,2000000000', 'big,b,2000000000', 'big,c,2000000000'] },
    name: 'sum exceeds 32 bits',
    part: 1,
  },
  {
    input: { changes: ['u,a,b,1,50'], subscriptions: ['u,a,10'] },
    name: 'change on day 1 charges old for 0 days',
    part: 2,
  },
  {
    input: { changes: ['u,a,b,30,50'], subscriptions: ['u,a,10'] },
    name: 'change on day 30',
    part: 2,
  },
  {
    input: {
      changes: ['u,a_pro,a_max,21,30', 'u,a,a_pro,11,20'],
      subscriptions: ['u,a,10'],
    },
    name: 'changes given out of day order',
    part: 2,
  },
  {
    input: { changes: ['u,ghost,b,5,50'], subscriptions: ['u,a,10'] },
    name: 'change of unknown sub ignored',
    part: 2,
  },
  {
    input: { changes: ['u,a,b,5,50', 'u,a,c,9,70'], subscriptions: ['u,a,10'] },
    name: 'second change on replaced sub ignored',
    part: 2,
  },
  {
    input: { changes: ['u,a,b,5,50'], subscriptions: ['u,a,10', 'u,b,20'] },
    name: 'change to existing sub id ignored',
    part: 2,
  },
  {
    input: { changes: ['v,a,b,5,50'], subscriptions: ['u,a,10', 'v,c,1'] },
    name: 'change by wrong user ignored',
    part: 2,
  },
  {
    input: { changes: ['u,a,b,31,50', 'u,a,c,0,50'], subscriptions: ['u,a,10'] },
    name: 'change day outside period ignored',
    part: 2,
  },
  {
    input: { changes: ['u,a,b,2,2000000000'], subscriptions: ['u,a,1'] },
    name: 'total exceeds 32 bits',
    part: 2,
  },
  {
    input: { cancellations: ['u,a,2'], subscriptions: ['u,a,1'] },
    name: 'total rounds down',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,1'], subscriptions: ['u,a,10', 'u,b,5'] },
    name: 'cancel on day 1',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,30'], subscriptions: ['u,a,10'] },
    name: 'cancel on day 30',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,31'], subscriptions: ['u,a,10'] },
    name: 'cancel on day 31 has no effect',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,5'], changes: ['u,a,b,10,20'], subscriptions: ['u,a,10'] },
    name: 'change after cancel ignored',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,12'], changes: ['u,a,b,10,20'], subscriptions: ['u,a,10'] },
    name: 'cancel of replaced sub ignored',
    part: 3,
  },
  {
    input: { cancellations: ['u,b,10'], changes: ['u,a,b,10,20'], subscriptions: ['u,a,10'] },
    name: 'cancel new sub same day as change',
    part: 3,
  },
  {
    input: { cancellations: ['u,a,5', 'u,a,8'], subscriptions: ['u,a,10'] },
    name: 'second cancel ignored',
    part: 3,
  },
  {
    input: { cancellations: ['v,a,5'], subscriptions: ['u,a,10', 'v,b,1'] },
    name: 'cancel by wrong user ignored',
    part: 3,
  },
  {
    input: { cancellations: ['u,ghost,5'], subscriptions: ['u,a,10'] },
    name: 'cancel of unknown sub ignored',
    part: 3,
  },
  {
    input: { starts: ['u,b,1,5'], subscriptions: ['u,a,10'] },
    name: 'start on day 1',
    part: 4,
  },
  {
    input: { starts: ['u,a,10,99'], subscriptions: ['u,a,10'] },
    name: 'start with existing id ignored',
    part: 4,
  },
  {
    input: { changes: ['u,b,c,10,7'], starts: ['u,b,10,5'], subscriptions: ['u,a,1'] },
    name: 'start then change same day',
    part: 4,
  },
  {
    input: { cancellations: ['u,b,10'], starts: ['u,b,10,5'], subscriptions: ['u,a,1'] },
    name: 'start then cancel same day',
    part: 4,
  },
  {
    input: { starts: ['late,x,10,5'], subscriptions: ['u,a,1'] },
    name: 'user appears from start only',
    part: 4,
  },
  {
    input: { starts: ['late,x,31,5'], subscriptions: ['u,a,1'] },
    name: 'start on day 31 ignored',
    part: 4,
  },
  {
    input: { cancellations: ['u,b,5'], starts: ['u,b,10,5'], subscriptions: ['u,a,1'] },
    name: 'cancel before start ignored',
    part: 4,
  },
  {
    input: { cancellations: ['u,a,30'], subscriptions: ['u,a,1'] },
    name: 'cancel on day 30 is not active',
    part: 4,
  },
  {
    input: {
      changes: ['u,c,d,20,4'],
      starts: ['u,c,2,3', 'u,b,3,1'],
      subscriptions: ['u,z,1', 'u,a,1'],
    },
    name: 'start then change chain',
    part: 4,
  },
  {
    input: {
      cancellations: ['u,a_plus,25', 'v,w,3'],
      changes: ['u,a,a_plus,10,2'],
      starts: ['v,w,2,9'],
      subscriptions: ['u,a,1'],
    },
    name: 'all subs ended still listed',
    part: 4,
  },
];

writeTests({
  hiddenList,
  problemId: 'subscription-billing',
  solve,
  visibleExpected: VISIBLE_EXPECTED,
  visibleList,
});
