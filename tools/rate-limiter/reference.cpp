#include <bits/stdc++.h>
using namespace std;

namespace {

const long long NO_LIMIT = LLONG_MAX / 4;

vector<string> splitFields(const string& line) {
    vector<string> fields;
    stringstream stream(line);
    string field;
    while (getline(stream, field, ',')) {
        fields.push_back(field);
    }

    return fields;
}

}  // namespace

vector<string> solve(const vector<string>& config, const vector<string>& overrides,
                     const vector<string>& blocked, const vector<string>& requests) {
    long long defaultLimit = NO_LIMIT;
    long long windowSize = NO_LIMIT;
    if (!config.empty()) {
        vector<string> fields = splitFields(config[0]);
        defaultLimit = stoll(fields[0]);
        windowSize = stoll(fields[1]);
    }
    map<string, long long> limitByUser;
    for (const string& line : overrides) {
        vector<string> fields = splitFields(line);
        limitByUser[fields[0]] = stoll(fields[1]);
    }
    set<string> blockedSet(blocked.begin(), blocked.end());
    map<string, vector<long long>> allowedByUser;

    vector<string> output;
    for (const string& line : requests) {
        vector<string> fields = splitFields(line);
        long long timestamp = stoll(fields[0]);
        const string& user = fields[1];
        bool isAllowed = false;
        if (blockedSet.count(user) == 0) {
            long long limit = limitByUser.count(user) != 0 ? limitByUser[user] : defaultLimit;
            long long count = 0;
            for (long long time : allowedByUser[user]) {
                if (time > timestamp - windowSize) {
                    count++;
                }
            }
            if (count < limit) {
                isAllowed = true;
                allowedByUser[user].push_back(timestamp);
            }
        }
        output.push_back(fields[0] + "," + user + (isAllowed ? ",ALLOWED" : ",BLOCKED"));
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
    vector<string> config = readList();
    vector<string> overrides = readList();
    vector<string> blocked = readList();
    vector<string> requests = readList();
    for (const string& line : solve(config, overrides, blocked, requests)) {
        cout << line << "\n";
    }

    return 0;
}
