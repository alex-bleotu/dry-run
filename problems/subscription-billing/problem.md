# Subscription Billing

You run a billing system. Customers have subscriptions. For one 30-day billing period you must work out how much each customer owes.

Write one function in `solution.cpp`. It handles every part: lists a test does not use are empty.

```cpp
vector<string> solve(const vector<string>& subscriptions, const vector<string>& changes,
                     const vector<string>& cancellations, const vector<string>& starts);
```

Return one line per user, sorted by user (plain string order): `user,total`.

## Billing

- The billing period is days `1..30` inclusive (30 days).
- Each subscription has a **monthly price**. It is charged per day: `price / 30` for each day the subscription is active.
- To avoid fractions, work in "units": a subscription active for `n` days adds `price * n` units to its user.
- `total` is the user's units divided by 30, rounded down. Divide **once**, at the end, per user. Do not round each subscription separately.
- Prices can be large. Use `long long`.

The four input lists:

| List | Format | Meaning |
| --- | --- | --- |
| `subscriptions` | `user,sub_id,price` | Active from day 1 |
| `changes` | `user,old_sub,new_sub,day,new_price` | The user swaps `old_sub` for `new_sub` on `day` |
| `cancellations` | `user,sub_id,day` | `sub_id` stops on `day` |
| `starts` | `user,sub_id,day,price` | A brand new subscription begins on `day` |

```
subscriptions = ["user1,sub_a,30","user1,sub_b,60","user2,sub_c,30","user3,sub_d,150"]
```

## Part 1: subscriptions only

Only `subscriptions` is filled. Nothing changes during the period, so every subscription is active for all 30 days. `price * 30 / 30` is just `price`, so each user's total is the sum of their prices.

```
user1,90
user2,30
user3,150
```

user1 has `sub_a` (30) and `sub_b` (60): 30 + 60 = 90.

## Part 2: plan changes

Now `changes` is filled too.

```
changes = ["user1,sub_a,sub_a_plus,11,60",
           "user2,sub_c,sub_c_pro,16,120",
           "user1,sub_a_plus,sub_a_pro,21,120"]
```

A change `user,old_sub,new_sub,day,new_price` means:

- `old_sub` is charged for days `1..day-1`, then it stops.
- `new_sub` is a new subscription with price `new_price`. It is charged from `day` through day 30.
- The new subscription can itself be changed later (user1 does this twice).

Walkthrough for user1:

| Subscription | Price | Active days | Units |
| --- | --- | --- | --- |
| `sub_a` | 30 | 1-10 (10 days) | 300 |
| `sub_a_plus` | 60 | 11-20 (10 days) | 600 |
| `sub_a_pro` | 120 | 21-30 (10 days) | 1200 |
| `sub_b` | 60 | 1-30 (30 days) | 1800 |

Total units 3900. 3900 / 30 = 130.

```
user1,130
user2,75
user3,150
```

## Part 3: cancellations

Now `cancellations` is filled too. A cancellation `user,sub_id,day` means the subscription stops on `day`. It is charged for days `1..day-1`, and not for `day` or after.

```
cancellations = ["user1,sub_b,6","user1,sub_a_pro,26","user3,sub_d,31"]
```

The new thing: a cancellation can target **any** subscription the user has at that moment. That includes one created by a change in Part 2 (`sub_a_pro` was created by a change, then cancelled).

Walkthrough, using the changes from Part 2 plus these cancellations:

user1:

| Subscription | Price | Why | Active days | Units |
| --- | --- | --- | --- | --- |
| `sub_a` | 30 | replaced on day 11 | 1-10 (10) | 300 |
| `sub_a_plus` | 60 | replaced on day 21 | 11-20 (10) | 600 |
| `sub_a_pro` | 120 | cancelled on day 26 | 21-25 (5) | 600 |
| `sub_b` | 60 | cancelled on day 6 | 1-5 (5) | 300 |

Total units 1800. 1800 / 30 = 60.

user2: no cancellations, same as Part 2. 2250 / 30 = 75.

user3: `sub_d` is cancelled on day 31. The period ends on day 30, so day 31 is outside it and the event is ignored. `sub_d` stays active all 30 days: 4500 / 30 = 150.

```
user1,60
user2,75
user3,150
```

### How to approach it

You can solve Parts 2, 3 and 4 with one idea: turn everything into a timeline of events and replay it.

1. Keep a map from `sub_id` to its data: user, price, the day it started, and whether it is still active. Add every line of `subscriptions` with start day 1.
2. Put every change, cancellation (and later start) into one list of events, each with its day.
3. Sort the events by day. For events on the same day, follow the order in "Rules for all parts" below.
4. Replay the events:
   - a **change** closes the old subscription (it ends the day before) and opens the new one on that day
   - a **cancellation** closes the subscription (it ends the day before)
5. When all events are done, close every subscription still active at the end of day 30.
6. When you close a subscription, add `price * days_it_was_active` to its user's units.
7. Print every user, sorted, with `units / 30`.

## Part 4: mid-period starts

Now `starts` is filled too. A start `user,sub_id,day,price` creates a brand new subscription on `day` (it is not a replacement for anything). It is charged from `day` through day 30.

```
starts = ["user2,sub_e,10,90","user4,sub_f,25,30"]
```

Two things are new here:

- A subscription now may begin after day 1, so its active days are `day..30`, not `1..30`.
- A user can appear **only** in `starts`. `user4` is not in `subscriptions` at all, but still gets an output line.

Walkthrough, using Parts 2 and 3 plus these starts:

- user1: unchanged from Part 3. 1800 / 30 = 60.
- user2: the 2250 units from Part 3, plus `sub_e` active days 10-30 (21 days) x 90 = 1890. Total 4140. 4140 / 30 = 138.
- user3: unchanged. 150.
- user4: `sub_f` active days 25-30 (6 days) x 30 = 180. 180 / 30 = 6.

```
user1,60
user2,138
user3,150
user4,6
```

You do not need new logic for this: a start is just one more event in your timeline that opens a subscription on its day.

## Rules for all parts

- Apply events in order of day. If several events fall on the same day, apply them in this order: **starts**, then **changes**, then **cancellations**. Inside one kind, use input order.
- Events with a day outside `1..30` are ignored completely.
- Subscription ids are unique across all users.
- An event is **invalid** and must be ignored when:
  - the subscription it refers to does not exist at that moment, or belongs to another user
  - the subscription is not active (it was already cancelled, or already replaced by a change)
  - a start or change tries to use a `sub_id` that already exists
- A subscription that starts or changes on day `d` and is then cancelled or changed again on day `d` is charged for 0 days. Example: `starts` has `u,x,10,30` and `changes` has `u,x,y,10,60`. Both are on day 10, so the start is applied first, then the change. `x` is active for days 10..9, which is 0 days, and `y` is charged from day 10.
- A cancellation that comes before the start of the same subscription is invalid, because the subscription does not exist yet when it is processed. The subscription then stays active.
- A user appears in the output if they have at least one valid subscription or start line, even if their total ends up as `0`.
