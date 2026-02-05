import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Image, 
  Alert, 
  Switch,
  ActivityIndicator
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { 
  User, 
  Camera, 
  LogOut, 
  Trash2, 
  Bell, 
  Zap, 
  ChevronRight,
  Globe,
  Save,
  Server,
  Fingerprint,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { loadUserData, saveUserData, clearAllData, saveEmployeeData, loadEmployeeData } from '../utils/storage';
import { verificarEmpleado } from '../services/api';
import { triggerHaptic } from '../utils/haptics';

export const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    name: '',
    currency: 'USD',
    photo: null,
    settings: {
      haptics: true,
      notifications: true
    }
  });

  const [employeeCve, setEmployeeCve] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [isVerifyingEmpl, setIsVerifyingEmpl] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const data = await loadUserData();
      if (data) {
        setUserData(data);
      }

      const empData = await loadEmployeeData();
      if (empData) {
        setEmployeeData(empData);
        setEmployeeCve(empData.cve_emple.toString());
      }
    };
    fetchInitialData();
  }, []);

  const handleVerifyEmployee = async () => {
    if (!employeeCve) {
      Alert.alert('Error', 'Ingresa una clave de empleado.');
      return;
    }

    setIsVerifyingEmpl(true);
    triggerHaptic('impactMedium');

    try {
      const data = await verificarEmpleado(employeeCve);
      if (data) {
        setEmployeeData(data);
        await saveEmployeeData(data);
        triggerHaptic('notificationSuccess');
        Alert.alert('Éxito', `Empleado vinculado: ${data.descri}`);
      } else {
        setEmployeeData(null);
        Alert.alert('No encontrado', 'No se encontró un empleado con esa clave.');
        triggerHaptic('notificationError');
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un fallo al contactar al servidor. Revisa tu conexión.');
    } finally {
      setIsVerifyingEmpl(false);
    }
  };

  const handleUnlink = async () => {
    Alert.alert(
      'Desvincular',
      '¿Deseas quitar la vinculación de este empleado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desvincular', 
          style: 'destructive',
          onPress: async () => {
            setEmployeeData(null);
            setEmployeeCve('');
            await saveEmployeeData(null);
            triggerHaptic('impactLight');
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    await saveUserData(userData);
    triggerHaptic('notificationSuccess');
    Alert.alert('¡Buen viaje!', 'Perfil actualizado con éxito.');
  };

  const pickImage = async () => {
    triggerHaptic('impactLight');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUserData({ ...userData, photo: result.assets[0].uri });
    }
  };

  const handleHardReset = () => {
    triggerHaptic('notificationWarning');
    Alert.alert(
      '¿Estás seguro?',
      'Se borrarán todos tus viajes, fotos y gastos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          onPress: () => {
            // Segunda confirmación
            setTimeout(() => {
              Alert.alert(
                'Acción Irreversible',
                'Esta acción no se puede deshacer. ¿Proceder con el borrado total?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'BORRAR TODO', 
                    style: 'destructive',
                    onPress: async () => {
                      await clearAllData();
                      setUserData({
                        name: '',
                        currency: 'USD',
                        photo: null,
                        settings: { haptics: true, notifications: true }
                      });
                      triggerHaptic('notificationError');
                      Alert.alert('Reinicio Completo', 'Todos los datos han sido eliminados.');
                      // Navegamos al inicio para refrescar el estado
                      navigation.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [{ name: 'MainTabs' }],
                        })
                      );
                    } 
                  }
                ]
              );
            }, 100);
          } 
        }
      ]
    );
  };

  const toggleSetting = (key) => {
    const newSettings = { ...userData.settings, [key]: !userData.settings[key] };
    setUserData({ ...userData, settings: newSettings });
    triggerHaptic('selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con Foto */}
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {userData.photo ? (
              <Image source={{ uri: userData.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User size={40} color={THEME.primary} />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Camera size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.greetingHeader}>
            Hola, {employeeData ? employeeData.descri.split(' ')[0] : (userData.name || 'Viajero')}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Vinculación de Empleado</Text>
          
          {!employeeData ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clave de Empleado (ERP)</Text>
              <View style={styles.inputWrapper}>
                <Fingerprint size={18} color={THEME.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 1025"
                  placeholderTextColor={THEME.textMuted}
                  value={employeeCve}
                  onChangeText={setEmployeeCve}
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={styles.verifyButton} 
                  onPress={handleVerifyEmployee}
                  disabled={isVerifyingEmpl}
                >
                  {isVerifyingEmpl ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Vincular</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>Necesario para sincronizar tus viajes con el ERP.</Text>
            </View>
          ) : (
            <View style={styles.linkedCard}>
              <View style={styles.linkedInfo}>
                <View style={styles.linkedIconContainer}>
                  <CheckCircle size={24} color="#FFFFFF" />
                </View>
                <View style={styles.linkedTextContainer}>
                  <Text style={styles.linkedName}>{employeeData.descri}</Text>
                  <Text style={styles.linkedDept}>{employeeData.depto || 'Sin Departamento'}</Text>
                  <Text style={styles.linkedId}>Clave: {employeeData.cve_emple}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleUnlink} style={styles.unlinkButton}>
                <Text style={styles.unlinkButtonText}>Desvincular</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Preferencias</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferencia de Moneda</Text>
            <View style={styles.inputWrapper}>
              <Globe size={18} color={THEME.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. USD, EUR, MXN"
                placeholderTextColor={THEME.textMuted}
                value={userData.currency}
                onChangeText={(text) => setUserData({ ...userData, currency: text.toUpperCase() })}
                maxLength={3}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: THEME.primary + '15' }]}>
                <Zap size={20} color={THEME.primary} />
              </View>
              <Text style={styles.settingLabel}>Vibración (Haptics)</Text>
            </View>
            <Switch
              value={userData.settings.haptics}
              onValueChange={() => toggleSetting('haptics')}
              trackColor={{ false: THEME.divider, true: THEME.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: THEME.secondary + '15' }]}>
                <Bell size={20} color={THEME.secondary} />
              </View>
              <Text style={styles.settingLabel}>Notificaciones</Text>
            </View>
            <Switch
              value={userData.settings.notifications}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: THEME.divider, true: THEME.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: THEME.primary + '15' }]}>
                <Server size={20} color={THEME.primary} />
              </View>
              <Text style={styles.settingLabel}>Sincronización ERP</Text>
            </View>
            <ChevronRight size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.dangerZone}>
          <TouchableOpacity style={[styles.item, styles.hardReset]} onPress={handleHardReset} activeOpacity={0.7}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#E6394610' }]}>
                <Trash2 size={20} color="#E63946" />
              </View>
              <Text style={[styles.settingLabel, { color: '#E63946' }]}>Borrar todos los datos</Text>
            </View>
            <ChevronRight size={18} color="#E63946" style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.version}>Raven Journey v1.0.0</Text>
          <Text style={styles.madeBy}>Hecho con pasión por el viaje</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: THEME.surface,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: THEME.primary + '30',
  },
  avatarPlaceholder: {
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  form: {
    padding: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.primary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.divider,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    color: THEME.text,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 12,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  settingsSection: {
    padding: 24,
    paddingTop: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  dangerZone: {
    padding: 24,
    paddingTop: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  hardReset: {
    borderColor: '#E6394620',
    backgroundColor: '#F1F3F5', // Gris muy claro
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 110, // Espacio para el tab bar
  },
  version: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: 'bold',
  },
  madeBy: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  verifyButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 8,
    marginLeft: 4,
  },
  linkedCard: {
    backgroundColor: THEME.primary + '10',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.primary + '30',
  },
  linkedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkedTextContainer: {
    flex: 1,
  },
  linkedName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  linkedDept: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  linkedId: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  unlinkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  unlinkButtonText: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '600',
  }
});
