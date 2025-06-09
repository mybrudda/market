import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { TextInput, Button, Text, useTheme, HelperText } from 'react-native-paper';
import { router, Redirect } from 'expo-router';
import SafeScreen from '../../components/layout/SafeScreen';
import { useAuthStore } from '../../store/useAuthStore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const { signUp, loading, session } = useAuthStore();

  // Redirect if already logged in
  if (session) {
    return <Redirect href="/home" />;
  }

  const validateForm = () => {
    if (!username || !email || !password) {
      setError('Username, email, and password are required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    // Username should only contain letters, numbers, and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setError('');
      await signUp(email, password, {
        username: username.toLowerCase(),
        full_name: fullName || null,
      });
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
            <Text variant="headlineMedium" style={{ marginBottom: 24, textAlign: 'center' }}>
              Create Account
            </Text>

            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <TextInput
              mode="outlined"
              label="Username"
              value={username}
              onChangeText={(text) => setUsername(text.trim())}
              autoCapitalize="none"
              style={{ marginBottom: 16 }}
              disabled={loading}
            />

            <TextInput
              mode="outlined"
              label="Full Name (Optional)"
              value={fullName}
              onChangeText={setFullName}
              style={{ marginBottom: 16 }}
              disabled={loading}
            />
            
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: 16 }}
              disabled={loading}
            />

            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={{ marginBottom: 24 }}
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              style={{ marginBottom: 16 }}
              loading={loading}
              disabled={loading}
            >
              Register
            </Button>

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Text variant="bodyMedium">Already have an account? </Text>
              <Button 
                mode="text" 
                compact 
                onPress={() => router.replace('/(auth)/login')}
                disabled={loading}
              >
                Login
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
}); 