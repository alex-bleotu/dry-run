# Invoice Totals

Write one function in `solution.cpp`. It handles every part: lists a test does not use are empty.

```cpp
vector<string> solve(const vector<string>& invoices, const vector<string>& rates,
                     const vector<string>& discounts, const vector<string>& refunds);
```

Return one line per customer, sorted by customer (plain string order): `customer,total`. The total is in USD, rounded down to a whole number.

| List | Format |
| --- | --- |
| `invoices` | `customer,amount,currency` |
| `rates` | `currency,percent` (1 unit of the currency is `percent / 100` USD) |
| `discounts` | `customer,percent` (0 to 100) |
| `refunds` | `customer,amount,currency` |

## The rule

- `USD` always has rate `100`. A `rates` line for `USD` is ignored.
- A later `rates` line for the same currency replaces an earlier one.
- A customer's `units` is the sum of `amount * rate` over their invoices, minus the same sum over their refunds. If `units` is negative, use `0`.
- `total = floor(units * (100 - discount) / 10000)`. The discount defaults to `0`.
- Use `long long`: amounts reach `1000000000`.

## Part 1: USD invoices

Only `invoices` is filled, all in `USD`.

```
invoices = ["acme,1000,USD","globex,500,USD","acme,200,USD"]
```

```
acme,1200
globex,500
```

## Part 2: Other currencies

```
rates    = ["EUR,110","GBP,125"]
invoices = ["acme,1000,EUR","acme,200,USD","globex,100,GBP"]
```

acme: 1000 x 110 + 200 x 100 = 130000, divided by 100 is 1300.

```
acme,1300
globex,125
```

## Part 3: Discounts

Now `discounts` is filled too. A discount `customer,percent` takes `percent`% off that customer's total. It applies **after** the currency conversion.

Use the same input as Part 2, plus:

```
discounts = ["acme,10"]
```

For acme the converted units are still 130000 (1000 EUR x 110 + 200 USD x 100). With a 10% discount the customer pays 90%, so:

`total = floor(130000 x (100 - 10) / 10000) = floor(11700000 / 10000) = 1170`

globex has no discount line, so the discount is `0` and nothing changes: `floor(12500 x 100 / 10000) = 125`.

```
acme,1170
globex,125
```

Things to handle:

- Round down **once**, at the very end, after applying the discount. Do not round before the discount.
- A customer can appear several times in `discounts`. The last valid line wins.
- A discount outside `0..100` (for example `150`) is invalid. Ignore that line only.
- A discount for a customer who has no valid invoice or refund line is ignored. It does not make the customer appear in the output.

## Part 4: Refunds

Now `refunds` is filled too. A refund `customer,amount,currency` has the same format as an invoice, but it **subtracts** from what the customer owes. It is converted with the same rates.

Use the same input as Part 3, plus:

```
refunds = ["acme,100,EUR","globex,500,USD"]
```

Steps for each customer:

1. units = (sum of invoices x rate) minus (sum of refunds x rate)
2. If units is negative, use `0`
3. Apply the discount and round down

acme:
- invoices: 130000 units
- refund: 100 EUR x 110 = 11000
- units = 130000 - 11000 = 119000
- with 10% off: `119000 x 90 / 10000 = 1071`

globex:
- invoices: 100 GBP x 125 = 12500
- refund: 500 USD x 100 = 50000
- units = 12500 - 50000 = -37500, which is negative, so it becomes `0`
- total `0`

globex still appears in the output because it has valid lines, even though its total is `0`.

```
acme,1071
globex,0
```

Things to handle:

- A customer with only refunds (no invoices) appears with total `0`.
- A refund in an unknown currency is ignored completely.
- Take the refund off before applying the "if negative, use 0" step and before the discount.

## Rules for all parts

- A line with an unknown currency (no rate and not `USD`) is ignored completely. It does not make the customer appear.
- A customer appears if they have at least one valid invoice or refund line, even if the total is `0`.
- A discount for a customer with no valid line is ignored.
- With no valid lines, return nothing.
