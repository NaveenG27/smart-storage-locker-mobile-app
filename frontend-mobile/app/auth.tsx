import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async () => {
    if (!username || !password) {
      return Alert.alert("Required", "Please enter username and password.");
    }

    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/api/auth/login/', {
          username: username.trim(),
          password: password
        });

        await AsyncStorage.setItem('token', response.data.access);
        await AsyncStorage.setItem('username', username.trim());
        router.replace('/(tabs)');
      } else {
        await api.post('/api/auth/register/', {
          username: username.trim(),
          password: password,
          email: email.trim(),
          name: fullName.trim()
        });

        Alert.alert("Success 🎉", "Account created successfully! Please login now.");
        setIsLogin(true);
      }
    } catch (error: any) {
      console.log("Auth Debug:", error.message);

      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.detail || error.response.data?.error;

        if (status === 401) {
          Alert.alert("Login Failed", "Invalid username or password.");
        } else {
          Alert.alert("Error", serverMessage || "Something went wrong on the server.");
        }
      } else if (error.request) {
        Alert.alert("Connection Timeout", "Could not reach the server. Make sure your Django server is running at 192.168.29.222:8000");
      } else {
        Alert.alert("Error", "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'SmartLocker Login' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Enter your admin or user credentials' : 'Join the SmartLocker management system'}
          </Text>

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                onChangeText={setFullName}
                value={fullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={setEmail}
                value={email}
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            onChangeText={setUsername}
            value={username}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            onChangeText={setPassword}
            value={password}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Register'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 5,
    fontWeight: '500'
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1e293b',
    fontSize: 16
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  switchBtn: { marginTop: 25, alignItems: 'center' },
  switchText: { color: '#2563eb', fontWeight: '700', fontSize: 14 }
});