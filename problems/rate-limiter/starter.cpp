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
    vector<string> config = readList();
    vector<string> overrides = readList();
    vector<string> blocked = readList();
    vector<string> requests = readList();
    for (const string& line : solve(config, overrides, blocked, requests)) {
        cout << line << "\n";
    }

    return 0;
}
