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

/**
 * API URL
 * - Android Emulator: http://10.0.2.2:8000
 * - Expo Web / Browser: http://localhost:8000
 */
const API =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://localhost:8000";

const CATEGORIES = ["Food", "Rent", "Transport", "Salary", "Bills", "Other"];

/* ---------- Small UI helpers (Radio + Checkbox) ---------- */

function Radio({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}

function Checkbox({ label, checked, onToggle }) {
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <View style={styles.checkboxBox}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}

/* -------------------- APP -------------------- */

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [token, setToken] = useState("");

  // Login
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");

  // Form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("income"); // radio
  const [category, setCategory] = useState(CATEGORIES[0]); // dropdown
  const [includeArchived, setIncludeArchived] = useState(false); // checkbox

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  /* ---------- API calls ---------- */

  const fetchTransactions = async () => {
    const res = await axios.get(
      `${API}/transactions?include_archived=${includeArchived}`
    );
    setTransactions(res.data);
  };

  const login = async () => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const res = await axios.post(`${API}/token`, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    setToken(res.data.access_token);
    Alert.alert("Login", "JWT token saved");
  };

  const addTransaction = async () => {
    if (!title || !amount) {
      Alert.alert("Validation", "Title and amount required");
      return;
    }

    await axios.post(`${API}/transactions`, {
      title,
      amount: Number(amount),
      transaction_type: type,
      category,
      transaction_date: new Date().toISOString().split("T")[0],
      archived: false,
    });

    setTitle("");
    setAmount("");
    fetchTransactions();
  };

  const archiveTransaction = async (id) => {
    if (!token) return Alert.alert("Login required");
    await axios.patch(
      `${API}/transactions/${id}/archive`,
      {},
      { headers: authHeaders }
    );
    fetchTransactions();
  };

  const deleteTransaction = async (id) => {
    if (!token) return Alert.alert("Login required");
    await axios.delete(`${API}/transactions/${id}`, {
      headers: authHeaders,
    });
    fetchTransactions();
  };

  useEffect(() => {
    fetchTransactions();
  }, [includeArchived]);

  /* ---------- UI ---------- */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personal Finance Tracker</Text>

      {/* LOGIN */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Login (JWT)</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title="Login" onPress={login} />
        <Text>{token ? "Token saved ✅" : "Not logged in ❌"}</Text>
      </View>

      {/* ADD TRANSACTION */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Add Transaction</Text>

        <TextInput
          style={styles.input}
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Radio Buttons */}
        <Text>Type</Text>
        <View style={styles.row}>
          <Radio label="Income" selected={type === "income"} onPress={() => setType("income")} />
          <Radio label="Expense" selected={type === "expense"} onPress={() => setType("expense")} />
        </View>

        {/* Dropdown */}
        <Text>Category</Text>
        <Picker selectedValue={category} onValueChange={setCategory}>
          {CATEGORIES.map((c) => (
            <Picker.Item key={c} label={c} value={c} />
          ))}
        </Picker>

        <Button title="Add" onPress={addTransaction} />
      </View>

      {/* Checkbox */}
      <Checkbox
        label="Include archived"
        checked={includeArchived}
        onToggle={() => setIncludeArchived(!includeArchived)}
      />

      {/* LIST */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>
              {item.title} - ${item.amount} ({item.transaction_type})
            </Text>
            <Text>{item.category}</Text>

            <View style={styles.row}>
              <Button title="Archive" onPress={() => archiveTransaction(item.id)} />
              <Button title="Delete" onPress={() => deleteTransaction(item.id)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  card: { borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 8 },
  input: { borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 },
  item: { borderWidth: 1, padding: 10, marginBottom: 8, borderRadius: 6 },
  row: { flexDirection: "row", gap: 10, marginBottom: 6 },

  radioRow: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  radioOuter: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 9,
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "black" },

  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxTick: { fontWeight: "bold" },
});
