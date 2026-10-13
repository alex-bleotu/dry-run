#include <bits/stdc++.h>
using namespace std;

namespace {

const int LAST_DAY = 30;

struct Subscription {
    string user;
    int start;
    long long rate;
    bool isActive;
};

struct Event {
    int day;
    int kind;
    vector<string> fields;
};

vector<string> splitFields(const string& line) {
    vector<string> fields;
    stringstream stream(line);
    string field;
    while (getline(stream, field, ',')) {
        fields.push_back(field);
    }

    return fields;
}

void closeSubscription(Subscription& subscription, int endDay, map<string, long long>& unitsByUser) {
    int dayCount = max(0, endDay - subscription.start + 1);
    unitsByUser[subscription.user] += subscription.rate * dayCount;
    subscription.isActive = false;
}

}  // namespace

vector<string> solve(const vector<string>& subscriptions, const vector<string>& changes,
                     const vector<string>& cancellations, const vector<string>& starts) {
    map<string, Subscription> subscriptionById;
    map<string, long long> unitsByUser;

    for (const string& line : subscriptions) {
        vector<string> fields = splitFields(line);
        if (subscriptionById.count(fields[1]) == 0) {
            unitsByUser.emplace(fields[0], 0);
            subscriptionById[fields[1]] = {fields[0], 1, stoll(fields[2]), true};
        }
    }

    vector<Event> eventList;
    for (const string& line : starts) {
        vector<string> fields = splitFields(line);
        eventList.push_back({stoi(fields[2]), 0, fields});
    }
    for (const string& line : changes) {
        vector<string> fields = splitFields(line);
        eventList.push_back({stoi(fields[3]), 1, fields});
    }
    for (const string& line : cancellations) {
        vector<string> fields = splitFields(line);
        eventList.push_back({stoi(fields[2]), 2, fields});
    }
    stable_sort(eventList.begin(), eventList.end(), [](const Event& left, const Event& right) {
        if (left.day != right.day) {
            return left.day < right.day;
        }

        return left.kind < right.kind;
    });

    for (const Event& event : eventList) {
        if (event.day < 1 || event.day > LAST_DAY) {
            continue;
        }
        const vector<string>& fields = event.fields;
        if (event.kind == 0) {
            if (subscriptionById.count(fields[1]) == 0) {
                unitsByUser.emplace(fields[0], 0);
                subscriptionById[fields[1]] = {fields[0], event.day, stoll(fields[3]), true};
            }
            continue;
        }

        auto found = subscriptionById.find(fields[1]);
        if (found == subscriptionById.end() || found->second.user != fields[0] || !found->second.isActive) {
            continue;
        }
        if (event.kind == 1) {
            if (subscriptionById.count(fields[2]) != 0) {
                continue;
            }
            closeSubscription(found->second, event.day - 1, unitsByUser);
            subscriptionById[fields[2]] = {fields[0], event.day, stoll(fields[4]), true};
            continue;
        }
        closeSubscription(found->second, event.day - 1, unitsByUser);
    }

    for (auto& entry : subscriptionById) {
        if (entry.second.isActive) {
            closeSubscription(entry.second, LAST_DAY, unitsByUser);
        }
    }

    vector<string> output;
    for (const auto& entry : unitsByUser) {
        output.push_back(entry.first + "," + to_string(entry.second / LAST_DAY));
    }

    return output;
}

int main() {
    auto readList = []() {
        string line;
        getline(cin, line);
        vector<string> items(stoi(line));
        for (string& item : items) {
            getline(cin, item);
        }

        return items;
    };
    vector<string> subscriptions = readList();
    vector<string> changes = readList();
    vector<string> cancellations = readList();
    vector<string> starts = readList();
    for (const string& line : solve(subscriptions, changes, cancellations, starts)) {
        cout << line << "\n";
    }

    return 0;
}
