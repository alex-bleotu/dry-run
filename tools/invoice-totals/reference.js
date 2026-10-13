const USD_RATE = 100n;

function solve({ discounts = [], invoices = [], rates = [], refunds = [] }) {
  const rateByCurrency = new Map([['USD', USD_RATE]]);
  rates.forEach((line) => {
    const [currency, percent] = line.split(',');
    if (currency !== 'USD') {
      rateByCurrency.set(currency, BigInt(percent));
    }
  });

  const unitsByCustomer = new Map();
  function apply(lineList, sign) {
    lineList.forEach((line) => {
      const [customer, amount, currency] = line.split(',');
      if (!rateByCurrency.has(currency)) {
        return;
      }
      const current = unitsByCustomer.get(customer) || 0n;
      unitsByCustomer.set(customer, current + sign * BigInt(amount) * rateByCurrency.get(currency));
    });
  }
  apply(invoices, 1n);
  apply(refunds, -1n);

  const discountByCustomer = new Map();
  discounts.forEach((line) => {
    const [customer, percent] = line.split(',');
    const value = Number(percent);
    if (Number.isInteger(value) && value >= 0 && value <= 100) {
      discountByCustomer.set(customer, BigInt(value));
    }
  });

  return [...unitsByCustomer.keys()].sort().map((customer) => {
    const units = unitsByCustomer.get(customer);
    const positive = units > 0n ? units : 0n;
    const discount = discountByCustomer.get(customer) || 0n;

    return `${customer},${(positive * (100n - discount)) / 10000n}`;
  });
}

module.exports = { solve };
