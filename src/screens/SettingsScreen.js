import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { ArrowLeft, Server, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react-native';
import { THEME } from '../theme/theme';
import { loadServerUrl, saveServerUrl } from '../utils/storage';
import { testConnection } from '../services/api';
import * as Haptics from 'expo-haptics';

export function SettingsScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    loadInitialSettings();
  }, []);

  const loadInitialSettings = async () => {
    const savedUrl = await loadServerUrl();
    if (savedUrl) {
      setServerUrl(savedUrl);
    }
  };

  const handleSave = async () => {
    if (!serverUrl) {
      Alert.alert('Error', 'Por favor ingresa una dirección de servidor válida.');
      return;
    }
    
    await saveServerUrl(serverUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Éxito', 'Configuración guardada correctamente.');
  };

  const handleTestConnection = async () => {
    if (!serverUrl) {
      Alert.alert('Error', 'Ingresa una URL antes de probar.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const isOk = await testConnection(serverUrl);
      if (isOk) {
        setTestResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setTestResult('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      setTestResult('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={THEME.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Ajustes de Conexión</Text>
          </View>

          {/* Icon and Description */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Server size={40} color={THEME.primary} />
            </View>
            <Text style={styles.heroTitle}>Sincronización ERP</Text>
            <Text style={styles.heroDescription}>
              Configura la dirección de tu servidor Raven para sincronizar tus viajes y gastos en tiempo real.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Dirección del Servidor</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="https://tu-dominio.com o http://192.168.1.50:4000"
                placeholderTextColor={THEME.textMuted}
                value={serverUrl}
                onChangeText={(text) => {
                  setServerUrl(text);
                  setTestResult(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Test Connection Result */}
            {testResult === 'success' && (
              <View style={[styles.statusBadge, styles.successBadge]}>
                <CheckCircle2 size={18} color={THEME.primary} />
                <Text style={styles.successText}>Conexión Exitosa</Text>
              </View>
            )}

            {testResult === 'error' && (
              <View style={[styles.statusBadge, styles.errorBadge]}>
                <XCircle size={18} color="#C0392B" />
                <Text style={styles.errorText}>No se pudo alcanzar el servidor. Verifica la IP y que estés en la misma red.</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.button, styles.testButton]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color={THEME.primary} size="small" />
                ) : (
                  <>
                    <ShieldCheck size={20} color={THEME.primary} />
                    <Text style={styles.testButtonText}>Probar Conexión</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Guardar Configuración</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Asegúrate de que el endpoint /health esté disponible en tu servidor.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginLeft: 12,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 20,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: THEME.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  successBadge: {
    backgroundColor: '#E6F4F1', // Verde esmeralda muy claro
  },
  successText: {
    color: THEME.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorBadge: {
    backgroundColor: '#FDECEA',
  },
  errorText: {
    color: '#C0392B',
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  testButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.primary,
  },
  testButtonText: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: THEME.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
  }
});
