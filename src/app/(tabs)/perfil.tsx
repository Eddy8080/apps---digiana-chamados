import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import * as Notifications from 'expo-notifications';
import { registerPushDevice } from '@/services/api';

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const [testingPush, setTestingPush] = React.useState(false);
  const [pushStatusText, setPushStatusText] = React.useState('Toque para testar / conectar');

  const handleTestarPush = async () => {
    setTestingPush(true);
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Chamados',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2dd4bf',
          sound: 'default',
        });
      }

      const perm = await Notifications.getPermissionsAsync();
      let status = perm.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        setPushStatusText('Permissão negada no Android');
        Alert.alert('Diagnóstico Push', `Permissão não concedida no Android: ${status}`);
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '7dd24128-9199-4c61-a894-156f62cf217d',
      });

      if (tokenData?.data) {
        await registerPushDevice(tokenData.data);
        setPushStatusText('Conectado à VPS');
        Alert.alert(
          'Push Conectado!',
          `Token gerado e salvo no servidor com sucesso!\n\n${tokenData.data.substring(0, 30)}...`
        );
      } else {
        setPushStatusText('Falha ao obter token');
        Alert.alert('Diagnóstico Push', 'O Expo não retornou dados de token.');
      }
    } catch (e: any) {
      setPushStatusText('Erro no Google FCM');
      Alert.alert(
        'Diagnóstico do Android',
        `Erro ao gerar token:\n\n${e.message || String(e)}\n\n(No Android standalone, o Google Play Services exige a configuração do Firebase/google-services.json)`
      );
    } finally {
      setTestingPush(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Encerrar Sessão',
      'Deseja realmente sair da sua conta no aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login' as any);
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.nome_completo) {
      const parts = user.nome_completo.trim().split(' ');
      if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (user?.username?.substring(0, 2) || 'DG').toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#030f14', '#06171e', '#09212a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <Text style={styles.screenTitle}>Meu Perfil</Text>

          {/* Card Principal do Usuário */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#0e6a79', '#18a39e']}
                style={styles.avatarGradient}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.userName}>
              {user?.nome_completo || user?.username}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'Sem e-mail cadastrado'}</Text>

            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{user?.role_display || 'Usuário'}</Text>
            </View>
          </View>

          {/* Informações da Conta */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Dados Corporativos</Text>

            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={18} color="#2dd4bf" style={styles.infoIcon} />
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Organização / Cliente</Text>
                <Text style={styles.infoValue}>Digiana Soluções Tecnológicas</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2dd4bf" style={styles.infoIcon} />
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Nível de Acesso</Text>
                <Text style={styles.infoValue}>{user?.user_role?.toUpperCase() || 'PADRÃO'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.infoRow, { borderBottomWidth: 0, justifyContent: 'space-between' }]}
              onPress={handleTestarPush}
              disabled={testingPush}
              activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="notifications-outline" size={18} color="#2dd4bf" style={styles.infoIcon} />
                <View style={styles.infoTextGroup}>
                  <Text style={styles.infoLabel}>Notificações Push (Toque p/ Testar)</Text>
                  <Text style={[styles.infoValue, { color: pushStatusText.includes('Conectado') ? '#10b981' : '#f59e0b' }]}>
                    {testingPush ? 'Testando conexão...' : pushStatusText}
                  </Text>
                </View>
              </View>
              <Ionicons name="refresh-circle-outline" size={22} color="#2dd4bf" />
            </TouchableOpacity>
          </View>

          {/* Configurações e Segurança */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Segurança & Conta</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/alterar-senha' as any)}
              activeOpacity={0.75}>
              <View style={styles.actionLeft}>
                <Ionicons name="key-outline" size={20} color="#94a3b8" style={styles.actionIcon} />
                <Text style={styles.actionTitle}>Alterar Senha de Acesso</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={handleLogout}
              activeOpacity={0.75}>
              <View style={styles.actionLeft}>
                <Ionicons name="log-out-outline" size={20} color="#f87171" style={styles.actionIcon} />
                <Text style={[styles.actionTitle, { color: '#f87171' }]}>Encerrar Sessão</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Rodapé Informativo */}
          <View style={styles.footer}>
            <Text style={styles.footerVersion}>Digiana Chamados v1.0.0 (Build 2026)</Text>
            <Text style={styles.footerCopyright}>
              Digiana © 2026 — Números que Contam Histórias
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030f14',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#18a39e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2dd4bf',
    marginRight: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2dd4bf',
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 16,
  },
  footerVersion: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  footerCopyright: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
});
