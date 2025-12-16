import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";

// IMPORTANT:
// - Android Emulator: http://10.0.2.2:8000
// - iOS Simulator: http://localhost:8000
// - Real phone: http://<your-pc-ip>:8000
const API = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

const CATEGORIES = ["Food", "Rent", "Transport", "Salary", "Bills", "Other"];

function Radio({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

function Checkbox({ label, checked, onToggle }) {
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [token, setToken] = useState("");

  // login fields
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");

  // transaction fields
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("income"); // radio
  const [category, setCategory] = useState(CATEGORIES[0]); // dropdown
  const [includeArchived, setIncludeArchived] = useState(false); // checkbox

  const [transactions, setTransactions] = useState([]);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/transactions?include_archived=${includeArchived}`);
      setTransactions(res.data);
    } catch (e) {
      Alert.alert("Error", "Failed to load transactions. Is backend running?");
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
      Alert.alert("Login", "Token saved ✅");
    } catch (e) {
      setToken("");
      Alert.alert("Login failed", "Use username: admin and password: password");
    }
  };

  const addTransaction = async () => {
    const amt = Number(amount);
    if (!title.trim()) return Alert.alert("Validation", "Title is required");
    if (!Number.isFinite(amt) || amt < 0) return Alert.alert("Validation", "Amount must be a number >= 0");

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
    } catch (e) {
      Alert.alert("Error", "Failed to add transaction.");
    }
  };

  const archiveTransaction = async (id) => {
    if (!token) return Alert.alert("Auth required", "Login first to archive.");
    try {
      await axios.patch(`${API}/transactions/${id}/archive`, {}, { headers: authHeaders });
      fetchTransactions();
    } catch (e) {
      Alert.alert("Error", "Archive failed. Are you logged in?");
    }
  };

  const deleteTransaction = async (id) => {
    if (!token) return Alert.alert("Auth required", "Login first to delete.");
    Alert.alert("Confirm", "Delete this transaction permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API}/transactions/${id}`, { headers: authHeaders });
            fetchTransactions();
          } catch (e) {
            Alert.alert("Error", "Delete failed. Are you logged in?");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Personal Finance Tracker</Text>
      <Text style={styles.small}>API: {API}</Text>

      {/* LOGIN (Textboxes + Button) */}
      <View style={styles.card}>
        <Text style={styles.h2}>Login (JWT)</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <Button title="Login (Get Token)" onPress={login} />
        <Text style={styles.small}>Token: {token ? "Saved ✅" : "Not logged in ❌"}</Text>
      </View>

      {/* CREATE FORM */}
      <View style={styles.card}>
        <Text style={styles.h2}>Add Transaction</Text>

        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title (e.g., Lunch)" />
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (e.g., 1200)"
          keyboardType="numeric"
        />

        {/* RADIO BUTTONS */}
        <Text style={styles.label}>Type</Text>
        <View style={styles.row}>
          <Radio
            label="Income"
            selected={transactionType === "income"}
            onPress={() => setTransactionType("income")}
          />
          <Radio
            label="Expense"
            selected={transactionType === "expense"}
            onPress={() => setTransactionType("expense")}
          />
        </View>

        {/* DROPDOWN */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={(v) => setCategory(v)}>
            {CATEGORIES.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <Button title="Add" onPress={addTransaction} />
      </View>

      {/* CHECKBOX (meaningful filter) */}
      <View style={styles.card}>
        <Checkbox
          label="Include archived transactions"
          checked={includeArchived}
          onToggle={() => setIncludeArchived((v) => !v)}
        />
        <Button title="Refresh List" onPress={fetchTransactions} />
      </View>

      {/* LIST */}
      <Text style={styles.h2}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>
              {item.title} — ${item.amount} ({item.transaction_type})
            </Text>
            <Text style={styles.small}>
              {item.category} • {item.transaction_date} • {item.archived ? "ARCHIVED" : "ACTIVE"}
            </Text>

            <View style={styles.row}>
              <View style={styles.btn}>
                <Button title="Archive" onPress={() => archiveTransaction(item.id)} />
              </View>
              <View style={styles.btn}>
                <Button title="Delete" onPress={() => deleteTransaction(item.id)} />
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.small}>No transactions yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingTop: 40 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  small: { fontSize: 12, opacity: 0.8, marginTop: 6 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: "600" },
  card: { padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 },
  pickerWrap: { borderWidth: 1, borderRadius: 8, overflow: "hidden", marginBottom: 10 },
  item: { padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 10 },
  itemTitle: { fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  btn: { flex: 1 },

  radioRow: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  radioOuter: { width: 20, height: 20, borderWidth: 2, borderRadius: 10, marginRight: 8 },
  radioOuterSelected: {},
  radioInner: { width: 10, height: 10, borderRadius: 5, margin: 3, backgroundColor: "black" },
  radioLabel: { fontSize: 14 },

  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkboxBox: { width: 22, height: 22, borderWidth: 2, marginRight: 10, alignItems: "center", justifyContent: "center" },
  checkboxBoxChecked: {},
  checkboxTick: { fontWeight: "900" },
  checkboxLabel: { fontSize: 14 },
});
