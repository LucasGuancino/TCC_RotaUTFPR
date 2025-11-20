import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function CriarCaronaScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicleName, setSelectedVehicleName] = useState('Selecionar Veículo');
  const [vagas, setVagas] = useState(null); 
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showVagasModal, setShowVagasModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const userId = user?.id_user; 

  useEffect(() => {
    const fetchUserVehicles = async () => {
      if (!userId) return;
      
      try {
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/veiculo`, {
          params: {
            id_user: `eq.${userId}`,
            select: 'id_veiculo,dsnome,dsplaca'
          },
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        setVehiclesList(response.data);
      } catch (error) {
        console.log("Erro ao buscar veículos:", error);
      }
    };
    
    fetchUserVehicles();
  }, [userId]);

  const showDatepicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const showTimepicker = () => {
    setPickerMode('time');
    setShowPicker(true);
  };

  const onDateTimeChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
       setShowPicker(false);
       return;
    }
    
    if (Platform.OS === 'android') setShowPicker(false);

    if (selectedDate) {
      const newDate = new Date(date);

      if (pickerMode === 'date') {
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
      } else {
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
      }
      
      setDate(newDate);
    }
  };

  const displayDate = date.toLocaleDateString('pt-BR');
  const displayTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleCreateCarona = async () => {
    if (!selectedVehicleId || !vagas) {
      Alert.alert("Atenção", "Selecione um veículo e a quantidade de vagas.");
      return;
    }

    if (!userId) {
      Alert.alert("Erro", "Usuário não identificado.");
      return;
    }

    setLoading(true);

    try {
      // CORREÇÃO DE FUSO HORÁRIO
      const timeZoneOffset = date.getTimezoneOffset() * 60000; 
      const localDate = new Date(date.getTime() - timeZoneOffset);
      const dataHoraFormatada = localDate.toISOString();

      const payload = {
        id_motorista: userId,  
        id_veiculo: selectedVehicleId,
        dsdatahora: dataHoraFormatada, 
        dsvagas: parseInt(vagas),
        dsstatuscarona: "Aberta"
      };

      console.log("Enviando Carona:", payload);

      await axios.post(`${SUPABASE_URL}/rest/v1/carona`, payload, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      Alert.alert("Sucesso", "Carona oferecida com sucesso! Para acompanha-la selecione o icone de bússola no navegador.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error("Erro ao criar carona:", error.response?.data || error.message);
      Alert.alert("Erro", "Falha ao registrar carona.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>Oferecer uma Carona</Text>

        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/logocarromao.png')} 
            style={styles.mainImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.formContainer}>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.inputButton, styles.halfInput]} onPress={showDatepicker}>
              <Text style={styles.inputText}>{displayDate}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.inputButton, styles.halfInput]} onPress={showTimepicker}>
              <Text style={styles.inputText}>{displayTime}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.inputButton} 
            onPress={() => setShowVehicleModal(true)}
          >
            <Text style={[styles.inputText, !selectedVehicleId && styles.placeholderText]}>
              {selectedVehicleName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.inputButton} 
            onPress={() => setShowVagasModal(true)}
          >
             <Text style={[styles.inputText, !vagas && styles.placeholderText]}>
              {vagas ? `${vagas} vaga(s)` : "Quantas vagas tem na carona?"}
            </Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleCreateCarona}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Oferecer A Carona</Text>}
        </TouchableOpacity>

        <Image source={require('../assets/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />

      </ScrollView>

      <Modal visible={showVehicleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Veículo</Text>
            {vehiclesList.length === 0 ? (
              <Text style={{padding: 20, textAlign: 'center'}}>Nenhum veículo encontrado.</Text>
            ) : (
              <FlatList 
                data={vehiclesList}
                keyExtractor={item => item.id_veiculo.toString()}
                renderItem={({item}) => (
                  <TouchableOpacity 
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedVehicleId(item.id_veiculo);
                      setSelectedVehicleName(item.dsnome);
                      setShowVehicleModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.dsnome} - {item.dsplaca}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowVehicleModal(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showVagasModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Número de Vagas</Text>
            {[1, 2, 3, 4].map(num => (
              <TouchableOpacity 
                key={num}
                style={styles.modalItem}
                onPress={() => {
                  setVagas(num);
                  setShowVagasModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{num} vaga{num > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowVagasModal(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode={pickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateTimeChange}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 20,
    color: '#000',
  },
  imageContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  mainImage: {
    width: 250,
    height: 180,
  },
  formContainer: {
    width: '100%',
    gap: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  inputButton: {
    backgroundColor: '#D9D9D9',
    height: 55,
    borderRadius: 27.5, 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  inputText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  placeholderText: {
    color: '#666',
    fontWeight: 'normal',
  },
  saveButton: {
    marginTop: 50,
    backgroundColor: '#FFD700',
    width: 220,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  saveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  watermarkLogo: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    opacity: 0.08, 
    zIndex: -1,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalItem: {
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalClose: {
    marginTop: 15,
    padding: 10,
  },
  modalCloseText: {
    color: 'red',
    fontWeight: 'bold',
  },
});