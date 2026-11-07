import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Pressable,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUserFocused, setIsUserFocused] = useState(false);
  const [isPassFocused, setIsPassFocused] = useState(false);

  const userInputRef = useRef<any>(null);
  const passInputRef = useRef<any>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setErrorMessage('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { mustChangePassword } = await signIn(username.trim(), password);
      if (mustChangePassword) {
        router.replace('/alterar-senha' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="light" />

      {/* Fundo Imersivo Tecnológico com pointerEvents="none" para NUNCA interferir no touch */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['#030f14', '#071f28', '#0c2f3b', '#06171e']}
          locations={[0, 0.35, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Luz Ambiental de Fundo */}
        <View style={styles.ambientGlow} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>

            {/* Cabeçalho Institucional Nativo */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/images/logo_digiana_dark.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>CHAMADOS & SUPORTE</Text>
              </View>

              <Text style={styles.subtitle}>
                Acesse sua conta para gerenciar e acompanhar seus chamados corporativos
              </Text>
            </View>

            {/* Formulário Integrado ao Fundo */}
            <View style={styles.formContainer}>
              {/* Banner de Erro Reativo */}
              {!!errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={20} color="#f87171" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Campo Usuário */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Usuário</Text>
                <Pressable
                  onPress={() => userInputRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    isUserFocused && styles.inputWrapperFocused,
                  ]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isUserFocused ? '#2dd4bf' : '#64748b'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={userInputRef}
                    style={styles.input}
                    placeholder="Seu login corporativo"
                    placeholderTextColor="#64748b"
                    cursorColor="#2dd4bf"
                    selectionColor="#2dd4bf"
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setIsUserFocused(true)}
                    onBlur={() => setIsUserFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passInputRef.current?.focus()}
                  />
                </Pressable>
              </View>

              {/* Campo Senha com Revelador Interativo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha de Acesso</Text>
                <Pressable
                  onPress={() => passInputRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    isPassFocused && styles.inputWrapperFocused,
                  ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isPassFocused ? '#2dd4bf' : '#64748b'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passInputRef}
                    style={styles.input}
                    placeholder="Sua senha de acesso"
                    placeholderTextColor="#64748b"
                    cursorColor="#2dd4bf"
                    selectionColor="#2dd4bf"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setIsPassFocused(true)}
                    onBlur={() => setIsPassFocused(false)}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={showPassword ? '#2dd4bf' : '#64748b'}
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* Botão de Ação Primária com Gradiente */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.buttonShadow}>
                <LinearGradient
                  colors={['#0e6a79', '#148694', '#18a39e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Acessar Sistema</Text>
                      <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Rodapé Institucional */}
            <View style={styles.footer}>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={15} color="#2dd4bf" style={{ marginRight: 6 }} />
                <Text style={styles.securityText}>Ambiente Seguro & Criptografado</Text>
              </View>
              <Text style={styles.copyrightText}>
                Digiana © 2026 — Números que Contam Histórias
              </Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#030f14',
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(24, 163, 158, 0.14)',
    transform: [{ scaleX: 1.5 }],
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 24 : 12,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 250,
    height: 78,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    marginBottom: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2dd4bf',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#2dd4bf',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    color: '#94a3b8',
    maxWidth: 290,
  },
  formContainer: {
    width: '100%',
    marginVertical: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: '#2dd4bf',
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    shadowColor: '#2dd4bf',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#ffffff',
  },
  eyeButton: {
    padding: 6,
  },
  buttonShadow: {
    marginTop: 10,
    borderRadius: 14,
    shadowColor: '#18a39e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2dd4bf',
    letterSpacing: 0.3,
  },
  copyrightText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});
