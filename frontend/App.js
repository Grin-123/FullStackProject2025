import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import Checkbox from "expo-checkbox";

/**
 * IMPORTANT (Real phone):
 * Put your PC's IP address here (same Wi-Fi as your phone).
 * Example: "http://192.168.0.12:8000"
 *
 * How to find your PC IP (Windows):
 * 1) Open CMD
 * 2) Run: ipconfig
 * 3) Look for "IPv4 Address"
 */
const API = "http://192.168.0.12:8000"; // <-- CHANGE THIS TO YOUR PC IPv4

const CATEGORIES = ["Food", "Rent", "Transport", "Salary", "Bills", "Other"];

function PillButton({ label, onPress, variant = "primary", disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "danger" && styles.btnDanger,
        variant === "ghost" && styles.btnGhost,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === "ghost" ? styles.btnTextGhost : styles.btnTextSolid,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RadioRow({ selected, onSelect }) {
  return (
    <View style={styles.radioRow}>
      {["income", "expense"].map((opt) => {
        const isOn = selected === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.radioChip, isOn && styles.radioChipOn]}
          >
            <Text style={[styles.radioText, isOn && styles.radioTextOn]}>
              {opt === "income" ? "Income" : "Expense"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [token, setToken] = useState("");

  // login
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");

  // form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("income"); // radio
  const [category, setCategory] = useState(CATEGORIES[0]); // dropdown
  const [includeArchived, setIncludeArchived] = useState(false); // checkbox

  const [transactions, setTransactions] = useState([]);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(
        `${API}/transactions?include_archived=${includeArchived}`
      );
      setTransactions(res.data);
    } catch (err) {
      Alert.alert(
        "Backend not reachable",
        `Could not connect to:\n${API}\n\nFix tips:\n- Make sure Docker backend is running\n- Phone and PC on same Wi-Fi\n- Use your PC IPv4 address\n- Allow port 8000 in Windows Firewall`
      );
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const login = async () => {
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);

      const res = await axios.post(`${API}/token`, form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      setToken(res.data.access_token);
      Alert.alert("Logged in", "JWT token saved ✅");
    } catch (err) {
      setToken("");
      Alert.alert("Login failed", "Use admin / password");
    }
  };

  const addTransaction = async () => {
    const amt = Number(amount);

    if (!title.trim()) return Alert.alert("Validation", "Title is required");
    if (!Number.isFinite(amt) || amt < 0)
      return Alert.alert("Validation", "Amount must be a number >= 0");

    try {
      const today = new Date().toISOString().split("T")[0];
      await axios.post(`${API}/transactions`, {
        title: title.trim(),
        amount: amt,
        transaction_type: transactionType,
        category,
        transaction_date: today,
        archived: false,
      });

      setTitle("");
      setAmount("");
      fetchTransactions();
    } catch (err) {
      Alert.alert("Error", "Could not add transaction");
    }
  };

  const archiveTransaction = async (id) => {
    if (!token) return Alert.alert("Auth required", "Login first to archive");
    try {
      await axios.patch(
        `${API}/transactions/${id}/archive`,
        {},
        { headers: authHeaders }
      );
      fetchTransactions();
    } catch {
      Alert.alert("Error", "Archive failed (are you logged in?)");
    }
  };

  const deleteTransaction = async (id) => {
    if (!token) return Alert.alert("Auth required", "Login first to delete");

    Alert.alert("Confirm delete", "This is permanent. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API}/transactions/${id}`, {
              headers: authHeaders,
            });
            fetchTransactions();
          } catch {
            Alert.alert("Error", "Delete failed (are you logged in?)");
          }
        },
      },
    ]);
  };

  const summary = useMemo(() => {
    const active = transactions.filter((t) => !t.archived);
    const income = active
      .filter((t) => t.transaction_type === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = active
      .filter((t) => t.transaction_type === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [transactions]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Personal Finance Tracker</Text>
        <Text style={styles.sub}>API: {API}</Text>

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary (active only)</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={styles.summaryValue}>${summary.income.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>${summary.expense.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={styles.summaryValue}>${summary.balance.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login (JWT)</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.row}>
            <PillButton label="Login" onPress={login} />
            <PillButton
              label={token ? "Token ✅" : "No Token"}
              onPress={() => {}}
              variant="ghost"
              disabled
            />
          </View>
        </View>

        {/* Add Transaction Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Transaction</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Lunch"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1200"
            placeholderTextColor="rgba(255,255,255,0.5)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Type (Radio)</Text>
          <RadioRow selected={transactionType} onSelect={setTransactionType} />

          <Text style={styles.label}>Category (Dropdown)</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={category} onValueChange={(v) => setCategory(v)}>
              {CATEGORIES.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>

          <PillButton label="Add Transaction" onPress={addTransaction} />
        </View>

        {/* Filters */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>
          <View style={styles.filterRow}>
            <Checkbox value={includeArchived} onValueChange={setIncludeArchived} />
            <Text style={{ marginLeft: 10, color: "white" }}>
              Include archived (Checkbox)
            </Text>
          </View>
          <PillButton label="Refresh" onPress={fetchTransactions} variant="ghost" />
        </View>

        {/* List */}
        <Text style={styles.h2}>Transactions</Text>
        <FlatList
          scrollEnabled={false}
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.sub}>No transactions yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>
                  {item.title} • ${Number(item.amount).toFixed(2)}
                </Text>
                <Text style={styles.badge}>
                  {item.transaction_type.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.sub}>
                {item.category} • {item.transaction_date} •{" "}
                {item.archived ? "ARCHIVED" : "ACTIVE"}
              </Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <PillButton
                    label="Archive"
                    onPress={() => archiveTransaction(item.id)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PillButton
                    label="Delete"
                    onPress={() => deleteTransaction(item.id)}
                    variant="danger"
                  />
                </View>
              </View>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------ styles ------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0f14" },
  container: { padding: 16, paddingBottom: 60 },
  h1: { fontSize: 26, fontWeight: "800", color: "white" },
  h2: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    marginTop: 8,
    marginBottom: 10,
  },
  sub: { color: "rgba(255,255,255,0.7)", marginTop: 6 },

  card: {
    backgroundColor: "#121a23",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitle: { color: "white", fontWeight: "800", marginBottom: 10, fontSize: 16 },

  label: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 10,
    marginBottom: 6,
    fontWeight: "700",
  },

  input: {
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 8,
  },

  pickerWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0b0f14",
  },

  row: { flexDirection: "row", gap: 10, marginTop: 10 },

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: "white", borderColor: "white" },
  btnDanger: { backgroundColor: "#ff4d4d", borderColor: "#ff4d4d" },
  btnGhost: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.2)" },
  btnText: { fontWeight: "900" },
  btnTextSolid: { color: "#0b0f14" },
  btnTextGhost: { color: "rgba(255,255,255,0.85)" },

  radioRow: { flexDirection: "row", gap: 10 },
  radioChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  radioChipOn: { backgroundColor: "white", borderColor: "white" },
  radioText: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },
  radioTextOn: { color: "#0b0f14" },

  filterRow: { flexDirection: "row", alignItems: "center" },

  item: {
    backgroundColor: "#121a23",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { color: "white", fontWeight: "900" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "900",
    fontSize: 12,
  },

  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  summaryLabel: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 12 },
  summaryValue: { color: "white", fontWeight: "900", marginTop: 6 },
});
