const NO_LIMIT = Number.MAX_SAFE_INTEGER;

function solve({ blocked = [], config = [], overrides = [], requests = [] }) {
  const [defaultLimit, windowSize] =
    config.length > 0 ? config[0].split(',').map(Number) : [NO_LIMIT, NO_LIMIT];
  const limitByUser = new Map(
    overrides.map((line) => {
      const [user, limit] = line.split(',');

      return [user, Number(limit)];
    }),
  );
  const blockedSet = new Set(blocked);
  const allowedByUser = new Map();

  return requests.map((line) => {
    const [timestampText, user] = line.split(',');
    const timestamp = Number(timestampText);
    let verdict = 'BLOCKED';
    if (!blockedSet.has(user)) {
      const limit = limitByUser.has(user) ? limitByUser.get(user) : defaultLimit;
      const history = allowedByUser.get(user) || [];
      const count = history.filter((time) => time > timestamp - windowSize).length;
      if (count < limit) {
        verdict = 'ALLOWED';
        allowedByUser.set(user, [...history, timestamp]);
      }
    }

    return `${timestampText},${user},${verdict}`;
  });
}

module.exports = { solve };
