import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { apiFetch } from '@/services/api';
import { sseManager } from '@/services/sse';

interface DashboardStats {
  total: number;
  abertos: number;
  em_progresso: number;
  pendentes: number;
  resolvidos: number;
  fechados: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch('/dashboard/stats/');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('[Dashboard] Erro ao buscar métricas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  useEffect(() => {
    const unsubscribe = sseManager.addListener(() => {
      fetchStats();
    });
    return () => {
      unsubscribe();
    };
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const navigateToChamadosWithStatus = (statusFilter?: string) => {
    if (statusFilter) {
      router.push({
        pathname: '/(tabs)/chamados',
        params: { status: statusFilter },
      } as any);
    } else {
      router.push('/(tabs)/chamados' as any);
    }
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Bom dia';
    if (hours < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Fundo escuro com gradiente executivo */}
      <LinearGradient
        colors={['#030f14', '#06171e', '#09212a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2dd4bf"
              colors={['#2dd4bf']}
            />
          }
          showsVerticalScrollIndicator={false}>

          {/* Cabeçalho do Colaborador */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.nome_completo || user?.username || 'Colaborador'}</Text>
              <View style={styles.roleBadge}>
                <View style={styles.roleDot} />
                <Text style={styles.roleText}>{user?.role_display || 'Usuário'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newButton}
              onPress={() => router.push('/(tabs)/novo' as any)}
              activeOpacity={0.85}>
              <LinearGradient
                colors={['#0e6a79', '#18a39e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newButtonGradient}>
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.newButtonText}>Novo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Banner de Status de Push / Sistema */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconWrapper}>
              <Ionicons name="notifications-outline" size={18} color="#2dd4bf" />
            </View>
            <View style={styles.statusTextWrapper}>
              <Text style={styles.statusBannerTitle}>Notificações Push Ativas</Text>
              <Text style={styles.statusBannerDesc}>
                Avisos instantâneos sobre atualizações e respostas de chamados.
              </Text>
            </View>
          </View>

          {/* Seção de Métricas de Chamados */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visão Geral dos Chamados</Text>
            <TouchableOpacity onPress={() => navigateToChamadosWithStatus('todos')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2dd4bf" />
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {/* Card Abertos */}
              <TouchableOpacity
                style={[styles.card, styles.cardAberto]}
                onPress={() => navigateToChamadosWithStatus('aberto')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                  <Ionicons name="alert-circle" size={22} color="#0284c7" />
                </View>
                <Text style={styles.cardNumber}>{stats?.abertos ?? 0}</Text>
                <Text style={styles.cardLabel}>Abertos</Text>
              </TouchableOpacity>

              {/* Card Em Progresso */}
              <TouchableOpacity
                style={[styles.card, styles.cardProgresso]}
                onPress={() => navigateToChamadosWithStatus('em_progresso')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="time" size={22} color="#f59e0b" />
                </View>
                <Text style={styles.cardNumber}>{stats?.em_progresso ?? 0}</Text>
                <Text style={styles.cardLabel}>Em Progresso</Text>
              </TouchableOpacity>

              {/* Card Pendentes */}
              <TouchableOpacity
                style={[styles.card, styles.cardPendente]}
                onPress={() => navigateToChamadosWithStatus('pendente')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Ionicons name="hourglass" size={22} color="#a855f7" />
                </View>
                <Text style={styles.cardNumber}>{stats?.pendentes ?? 0}</Text>
                <Text style={styles.cardLabel}>Pendentes</Text>
              </TouchableOpacity>

              {/* Card Resolvidos */}
              <TouchableOpacity
                style={[styles.card, styles.cardResolvido]}
                onPress={() => navigateToChamadosWithStatus('resolvido')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-done" size={22} color="#10b981" />
                </View>
                <Text style={styles.cardNumber}>{stats?.resolvidos ?? 0}</Text>
                <Text style={styles.cardLabel}>Resolvidos</Text>
              </TouchableOpacity>

              {/* Card Fechados */}
              <TouchableOpacity
                style={[styles.card, styles.cardFechado]}
                onPress={() => navigateToChamadosWithStatus('fechado')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                  <Ionicons name="lock-closed" size={20} color="#94a3b8" />
                </View>
                <Text style={styles.cardNumber}>{stats?.fechados ?? 0}</Text>
                <Text style={styles.cardLabel}>Fechados</Text>
              </TouchableOpacity>

              {/* Card Total */}
              <TouchableOpacity
                style={[styles.card, styles.cardTotal]}
                onPress={() => navigateToChamadosWithStatus('todos')}
                activeOpacity={0.75}>
                <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(45, 212, 191, 0.15)' }]}>
                  <Ionicons name="layers" size={22} color="#2dd4bf" />
                </View>
                <Text style={styles.cardNumber}>{stats?.total ?? 0}</Text>
                <Text style={styles.cardLabel}>Total Geral</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Atalho Rápido para Abrir Chamado */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/novo' as any)}
            activeOpacity={0.85}>
            <View style={styles.actionCardContent}>
              <View style={styles.actionIcon}>
                <Ionicons name="create-outline" size={24} color="#2dd4bf" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Precisa de Suporte?</Text>
                <Text style={styles.actionCardDesc}>
                  Abra um novo chamado com fotos e detalhes direto do seu celular.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </View>
          </TouchableOpacity>

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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2dd4bf',
    marginRight: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2dd4bf',
  },
  newButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#18a39e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  newButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  statusIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusTextWrapper: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBannerDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2dd4bf',
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardAberto: {
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  cardProgresso: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  cardPendente: {
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  cardResolvido: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardFechado: {
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  cardTotal: {
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
