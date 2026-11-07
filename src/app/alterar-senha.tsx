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
  Pressable,
  Alert,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { apiFetch } from '@/services/api';

export default function AlterarSenhaScreen() {
  const { user, refreshProfile } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState<'atual' | 'nova' | 'confirmar' | null>(null);

  const atualRef = useRef<any>(null);
  const novaRef = useRef<any>(null);
  const confirmarRef = useRef<any>(null);

  const isMandatory = user?.must_change_password;

  const handleSubmit = async () => {
    if (!senhaAtual.trim()) {
      setErrorMessage('Por favor, informe sua senha atual.');
      return;
    }
    if (!novaSenha.trim()) {
      setErrorMessage('Por favor, informe a nova senha.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErrorMessage('A nova senha e a confirmação não conferem.');
      return;
    }
    if (novaSenha.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (novaSenha === senhaAtual) {
      setErrorMessage('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await apiFetch('/auth/alterar-senha/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
          confirmar_nova_senha: confirmarSenha,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Formata mensagens de erro retornadas pelo Django
        let errorMsg = 'Falha ao alterar a senha.';
        if (data.senha_atual) {
          errorMsg = Array.isArray(data.senha_atual) ? data.senha_atual[0] : data.senha_atual;
        } else if (data.nova_senha) {
          errorMsg = Array.isArray(data.nova_senha) ? data.nova_senha.join('\n') : data.nova_senha;
        } else if (data.confirmar_nova_senha) {
          errorMsg = Array.isArray(data.confirmar_nova_senha) ? data.confirmar_nova_senha[0] : data.confirmar_nova_senha;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.non_field_errors) {
          errorMsg = data.non_field_errors.join('\n');
        }
        throw new Error(errorMsg);
      }

      // Atualiza o perfil na memória e desmarca must_change_password
      await refreshProfile();

      Alert.alert(
        'Senha Atualizada!',
        'Sua senha de acesso foi alterada com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isMandatory) {
                router.replace('/(tabs)' as any);
              } else {
                router.back();
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="light" />

      {/* Fundo escuro com gradiente e luz ambiental */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['#030f14', '#071f28', '#0c2f3b', '#06171e']}
          locations={[0, 0.35, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.ambientGlow} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Barra Superior */}
        <View style={styles.topBar}>
          {!isMandatory ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={styles.topBarTitle}>Segurança da Conta</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>

            {/* Cabeçalho do Card */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="key" size={28} color="#2dd4bf" />
              </View>

              <Text style={styles.title}>Alteração de Senha</Text>
              <Text style={styles.subtitle}>
                {isMandatory
                  ? 'Por segurança, é obrigatório definir uma nova senha no seu primeiro acesso.'
                  : 'Crie uma nova credencial forte para manter seus dados corporativos protegidos.'}
              </Text>
            </View>

            {/* Formulário */}
            <View style={styles.formContainer}>
              {/* Mensagem de Erro */}
              {!!errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={20} color="#f87171" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Campo: Senha Atual */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha Atual</Text>
                <Pressable
                  onPress={() => atualRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'atual' && styles.inputWrapperFocused,
                  ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedField === 'atual' ? '#2dd4bf' : '#64748b'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={atualRef}
                    style={styles.input}
                    placeholder="Sua senha atual"
                    placeholderTextColor="#64748b"
                    cursorColor="#2dd4bf"
                    selectionColor="#2dd4bf"
                    secureTextEntry={!showSenhaAtual}
                    value={senhaAtual}
                    onChangeText={setSenhaAtual}
                    onFocus={() => setFocusedField('atual')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => novaRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSenhaAtual(!showSenhaAtual)}
                    hitSlop={10}
                    style={styles.eyeButton}>
                    <Ionicons
                      name={showSenhaAtual ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={showSenhaAtual ? '#2dd4bf' : '#64748b'}
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* Campo: Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nova Senha (mínimo 8 dígitos)</Text>
                <Pressable
                  onPress={() => novaRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'nova' && styles.inputWrapperFocused,
                  ]}>
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={focusedField === 'nova' ? '#2dd4bf' : '#64748b'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={novaRef}
                    style={styles.input}
                    placeholder="Nova senha segura"
                    placeholderTextColor="#64748b"
                    cursorColor="#2dd4bf"
                    selectionColor="#2dd4bf"
                    secureTextEntry={!showNovaSenha}
                    value={novaSenha}
                    onChangeText={setNovaSenha}
                    onFocus={() => setFocusedField('nova')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmarRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNovaSenha(!showNovaSenha)}
                    hitSlop={10}
                    style={styles.eyeButton}>
                    <Ionicons
                      name={showNovaSenha ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={showNovaSenha ? '#2dd4bf' : '#64748b'}
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* Campo: Confirmar Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Nova Senha</Text>
                <Pressable
                  onPress={() => confirmarRef.current?.focus()}
                  style={[
                    styles.inputWrapper,
                    focusedField === 'confirmar' && styles.inputWrapperFocused,
                  ]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={focusedField === 'confirmar' ? '#2dd4bf' : '#64748b'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={confirmarRef}
                    style={styles.input}
                    placeholder="Repita a nova senha"
                    placeholderTextColor="#64748b"
                    cursorColor="#2dd4bf"
                    selectionColor="#2dd4bf"
                    secureTextEntry={!showConfirmarSenha}
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    onFocus={() => setFocusedField('confirmar')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    hitSlop={10}
                    style={styles.eyeButton}>
                    <Ionicons
                      name={showConfirmarSenha ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={showConfirmarSenha ? '#2dd4bf' : '#64748b'}
                    />
                  </TouchableOpacity>
                </Pressable>
              </View>

              {/* Botão de Confirmação */}
              <TouchableOpacity
                onPress={handleSubmit}
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
                      <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Salvar Nova Senha</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Rodapé Informativo */}
            <View style={styles.footer}>
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={14} color="#2dd4bf" style={{ marginRight: 6 }} />
                <Text style={styles.securityText}>Criptografia Hash PBKDF2 Nativa</Text>
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
    backgroundColor: 'rgba(24, 163, 158, 0.12)',
    transform: [{ scaleX: 1.5 }],
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
    marginTop: 10,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 290,
  },
  formContainer: {
    width: '100%',
    marginVertical: 10,
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
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
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
    marginTop: 12,
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
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
