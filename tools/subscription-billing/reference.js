const LAST_DAY = 30;
const KIND_ORDER = { cancel: 2, change: 1, start: 0 };

function isValidDay(day) {
  return Number.isInteger(day) && day >= 1 && day <= LAST_DAY;
}

function solve(input) {
  const { cancellations = [], changes = [], starts = [], subscriptions } = input;
  const subscriptionById = new Map();
  const unitsByUser = new Map();

  function close(subscription, endDay) {
    const dayCount = Math.max(0, endDay - subscription.start + 1);
    unitsByUser.set(subscription.user, unitsByUser.get(subscription.user) + subscription.rate * dayCount);
    subscription.isActive = false;
  }

  function open(user, id, start, rate) {
    if (!unitsByUser.has(user)) {
      unitsByUser.set(user, 0);
    }
    subscriptionById.set(id, { isActive: true, rate, start, user });
  }

  subscriptions.forEach((line) => {
    const [user, id, rate] = line.split(',');
    if (!subscriptionById.has(id)) {
      open(user, id, 1, Number(rate));
    }
  });

  const eventList = [
    ...starts.map((line) => ({ fields: line.split(','), kind: 'start' })),
    ...changes.map((line) => ({ fields: line.split(','), kind: 'change' })),
    ...cancellations.map((line) => ({ fields: line.split(','), kind: 'cancel' })),
  ].map((event) => ({
    ...event,
    day: Number(event.kind === 'change' ? event.fields[3] : event.fields[2]),
  }));
  eventList.sort((left, right) => left.day - right.day || KIND_ORDER[left.kind] - KIND_ORDER[right.kind]);

  eventList.forEach(({ day, fields, kind }) => {
    if (!isValidDay(day)) {
      return;
    }
    if (kind === 'start') {
      const [user, id, , rate] = fields;
      if (!subscriptionById.has(id)) {
        open(user, id, day, Number(rate));
      }

      return;
    }

    const [user, oldId, newId, , newRate] = kind === 'change' ? fields : [fields[0], fields[1]];
    const old = subscriptionById.get(oldId);
    if (!old || old.user !== user || !old.isActive) {
      return;
    }
    if (kind === 'change') {
      if (subscriptionById.has(newId)) {
        return;
      }
      close(old, day - 1);
      open(user, newId, day, Number(newRate));

      return;
    }
    close(old, day - 1);
  });

  subscriptionById.forEach((subscription) => {
    if (subscription.isActive) {
      close(subscription, LAST_DAY);
    }
  });

  return [...unitsByUser.keys()]
    .sort()
    .map((user) => `${user},${Math.floor(unitsByUser.get(user) / LAST_DAY)}`);
}

module.exports = { solve };
