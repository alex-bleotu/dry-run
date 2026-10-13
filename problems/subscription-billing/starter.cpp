#include <bits/stdc++.h>
using namespace std;

vector<string> solve(const vector<string>&, const vector<string>&, const vector<string>&, const vector<string>&) {
    return {};
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
