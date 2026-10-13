#include <bits/stdc++.h>
using namespace std;

namespace {

vector<string> splitFields(const string& line) {
    vector<string> fields;
    stringstream stream(line);
    string field;
    while (getline(stream, field, ',')) {
        fields.push_back(field);
    }

    return fields;
}

void applyLines(const vector<string>& lines, long long sign, const map<string, long long>& rateByCurrency,
                map<string, long long>& unitsByCustomer) {
    for (const string& line : lines) {
        vector<string> fields = splitFields(line);
        auto rate = rateByCurrency.find(fields[2]);
        if (rate == rateByCurrency.end()) {
            continue;
        }
        unitsByCustomer[fields[0]] += sign * stoll(fields[1]) * rate->second;
    }
}

}  // namespace

vector<string> solve(const vector<string>& invoices, const vector<string>& rates,
                     const vector<string>& discounts, const vector<string>& refunds) {
    map<string, long long> rateByCurrency = {{"USD", 100}};
    for (const string& line : rates) {
        vector<string> fields = splitFields(line);
        if (fields[0] != "USD") {
            rateByCurrency[fields[0]] = stoll(fields[1]);
        }
    }

    map<string, long long> unitsByCustomer;
    applyLines(invoices, 1, rateByCurrency, unitsByCustomer);
    applyLines(refunds, -1, rateByCurrency, unitsByCustomer);

    map<string, long long> discountByCustomer;
    for (const string& line : discounts) {
        vector<string> fields = splitFields(line);
        long long percent = stoll(fields[1]);
        if (percent >= 0 && percent <= 100) {
            discountByCustomer[fields[0]] = percent;
        }
    }

    vector<string> output;
    for (const auto& entry : unitsByCustomer) {
        long long units = max(0LL, entry.second);
        long long discount = discountByCustomer.count(entry.first) != 0 ? discountByCustomer[entry.first] : 0;
        output.push_back(entry.first + "," + to_string(units * (100 - discount) / 10000));
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
    vector<string> invoices = readList();
    vector<string> rates = readList();
    vector<string> discounts = readList();
    vector<string> refunds = readList();
    for (const string& line : solve(invoices, rates, discounts, refunds)) {
        cout << line << "\n";
    }

    return 0;
}
