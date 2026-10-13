# Rate Limiter

Write one function in `solution.cpp`. It handles every part: lists a test does not use are empty.

```cpp
vector<string> solve(const vector<string>& config, const vector<string>& overrides,
                     const vector<string>& blocked, const vector<string>& requests);
```

Return one line per request, in input order: `timestamp,user,ALLOWED` or `timestamp,user,BLOCKED`.

| List | Format |
| --- | --- |
| `config` | `limit,window_seconds` (at most one line; empty means no limit) |
| `overrides` | `user,limit` |
| `blocked` | `user` |
| `requests` | `timestamp,user` (timestamps never decrease, whole seconds) |

## The rule

A request at time `t` from `user` is `ALLOWED` when both are true:

- `user` is not in `blocked`
- the number of that user's earlier `ALLOWED` requests with timestamp in `[t - window + 1, t]` is less than the user's limit

Otherwise it is `BLOCKED`. Blocked requests are not counted. Use `long long`: timestamps and windows can be large.

## Part 1: a limit per user

Only `config` and `requests` are filled, and the window is longer than the whole log. A user gets at most `limit` allowed requests.

```
config   = ["2,1000000"]
requests = ["1,alice","2,alice","3,bob","4,alice","5,bob"]
```

```
1,alice,ALLOWED
2,alice,ALLOWED
3,bob,ALLOWED
4,alice,BLOCKED
5,bob,ALLOWED
```

## Part 2: sliding window

Old allowed requests leave the window as time passes.

```
config   = ["2,10"]
requests = ["1,alice","2,alice","3,alice","11,alice","12,alice","13,alice"]
```

```
1,alice,ALLOWED
2,alice,ALLOWED
3,alice,BLOCKED
11,alice,ALLOWED
12,alice,ALLOWED
13,alice,BLOCKED
```

## Part 3: overrides

Now `overrides` is filled too. An override `user,limit` gives that one user their own limit instead of the default from `config`. The window size stays the same for everyone.

```
config    = ["2,10"]
overrides = ["bob,1","carol,3"]
requests  = ["1,alice","2,bob","3,bob","4,carol","5,carol","6,carol","7,carol","8,alice","9,alice"]
```

Decide each request using that user's own limit and only that user's own earlier allowed requests:

| User | Limit | Requests and decisions |
| --- | --- | --- |
| alice | 2 (default) | t=1 allowed (0 earlier). t=8: window `[-1, 8]` holds `{1}`, 1 < 2, allowed. t=9: window `[0, 9]` holds `{1, 8}`, 2 is not < 2, blocked. |
| bob | 1 (override) | t=2 allowed. t=3: window holds `{2}`, 1 is not < 1, blocked. |
| carol | 3 (override) | t=4, 5, 6 allowed (0, 1, 2 earlier). t=7: window `[-2, 7]` holds `{4, 5, 6}`, 3 is not < 3, blocked. |

Output stays in input order:

```
1,alice,ALLOWED
2,bob,ALLOWED
3,bob,BLOCKED
4,carol,ALLOWED
5,carol,ALLOWED
6,carol,ALLOWED
7,carol,BLOCKED
8,alice,ALLOWED
9,alice,BLOCKED
```

Things to handle:

- If a user appears twice in `overrides`, the last line wins.
- An override of `0` means every request from that user is blocked.
- Users without an override use the default limit.

## Part 4: blocklist

Now `blocked` is filled too. Each line is a user name. A blocked user is always `BLOCKED`, whatever the limit, the window or an override says. Their requests are not counted, because they are never allowed.

```
config   = ["1,10"]
blocked  = ["dave"]
requests = ["1,dave","2,alice","3,dave"]
```

- t=1 `dave`: in `blocked`, so `BLOCKED`. Nothing else is checked.
- t=2 `alice`: not blocked, limit 1, no earlier allowed requests, `ALLOWED`.
- t=3 `dave`: `BLOCKED` again.

```
1,dave,BLOCKED
2,alice,ALLOWED
3,dave,BLOCKED
```

So the check for each request is, in this order:

1. Is the user in `blocked`? If yes, `BLOCKED`.
2. Otherwise find the user's limit (override, or the default from `config`).
3. Count the user's earlier `ALLOWED` requests with timestamp in `[t - window + 1, t]`.
4. If the count is less than the limit, `ALLOWED` (remember this request for later). Otherwise `BLOCKED`.

## Rules for all parts

- With no `config`, the default limit and the window are unlimited. An override still sets a limit for that user, over an unlimited window.
- A limit of `0` blocks every request from that user.
- With no requests, return nothing.
