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
    vector<string> invoices = readList();
    vector<string> rates = readList();
    vector<string> discounts = readList();
    vector<string> refunds = readList();
    for (const string& line : solve(invoices, rates, discounts, refunds)) {
        cout << line << "\n";
    }

    return 0;
}
