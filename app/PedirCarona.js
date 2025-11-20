import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location'; 
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function PedirCaronaScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [vagas, setVagas] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showVagasModal, setShowVagasModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');

  const userId = user?.id_user; 

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização para pedir a carona.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      console.log("Localização obtida:", location.coords);
    })();
  }, []);

  const showDatepicker = () => { setPickerMode('date'); setShowPicker(true); };
  const showTimepicker = () => { setPickerMode('time'); setShowPicker(true); };

  const onDateTimeChange = (event, selectedDate) => {
    if (event.type === 'dismissed') { setShowPicker(false); return; }
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

  const handlePedirCarona = async () => {
    if (!vagas) {
      Alert.alert("Atenção", "Informe quantas vagas você precisa.");
      return;
    }
    if (!userId) {
      Alert.alert("Erro", "Usuário não identificado.");
      return;
    }
    if (!userLocation) {
      Alert.alert("Aguarde", "Ainda estamos obtendo sua localização...");
      return;
    }

    setLoading(true);

    try {
      const timeZoneOffset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - timeZoneOffset);
      const dataHoraFormatada = localDate.toISOString();

      const caronaBody = {
        dsdatahora: dataHoraFormatada,
        dsvagas: parseInt(vagas),
        dsstatuscarona: "Solicitado" 
      };

      console.log("Criando Carona:", caronaBody);

      const responseCarona = await axios.post(`${SUPABASE_URL}/rest/v1/carona`, caronaBody, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation' 
        }
      });

      const novaCarona = responseCarona.data[0];
      const idCaronaCriada = novaCarona.id_carona;
      
      console.log("Carona criada com ID:", idCaronaCriada);

      const passageiroBody = {
        id_carona: idCaronaCriada,
        id_passageiro: userId,
        status_passageiro: "Confirmado",
        lat_origem_passageiro: userLocation.latitude,
        lng_origem_passageiro: userLocation.longitude
      };

      console.log("Vinculando Passageiro:", passageiroBody);

      await axios.post(`${SUPABASE_URL}/rest/v1/carona_passageiros`, passageiroBody, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      Alert.alert("Sucesso", "Sua solicitação de carona foi registrada! Para acompanha-la selecione o icone de bússola no navegador.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error("Erro no pedido:", error.response?.data || error.message);
      Alert.alert("Erro", "Falha ao pedir carona.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>Pedir uma Carona</Text>
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/PedirCarona.png')} 
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
            onPress={() => setShowVagasModal(true)}
          >
             <Text style={[styles.inputText, !vagas && styles.placeholderText]}>
              {vagas ? `${vagas} vaga(s)` : "Quantas vagas disponiveis?"}
            </Text>
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Aviso: Sua localização atual será compartilhada com o motorista quando ele aceitar a carona.
            </Text>
          </View>

        </View>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handlePedirCarona}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Pedir A Carona</Text>}
        </TouchableOpacity>

        <Image source={require('../assets/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />

      </ScrollView>

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
    marginBottom: 20,
    alignItems: 'center',
  },
  mainImage: {
    width: 150, 
    height: 150,
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
  warningContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  warningBox: {
    marginTop: 10,
    backgroundColor: '#FFFBE6', 
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  warningText: {
    fontSize: 12,
    color: '#8B8000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 40,
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