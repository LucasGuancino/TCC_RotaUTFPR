import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';

import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function AceitarCaronaScreen() {
  const { caronaId } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();
  const [passageiro, setPassageiro] = useState(null);
  const [caronaInfo, setCaronaInfo] = useState(null);
  const [endereco, setEndereco] = useState("Carregando endereço...");
  const [myVehicles, setMyVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedVehicleName, setSelectedVehicleName] = useState('Selecionar Veículo');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const resCarona = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        if (!resCarona.data.length) {
          Alert.alert("Erro", "Carona não encontrada.");
          router.back();
          return;
        }
        setCaronaInfo(resCarona.data[0]);

        const resPassageiroLink = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resPassageiroLink.data.length > 0) {
          const dadosLink = resPassageiroLink.data[0];
          
          const resUserPassageiro = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
            params: { id_user: `eq.${dadosLink.id_passageiro}`, select: 'dsnome,dsfotoperfil' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          setPassageiro(resUserPassageiro.data[0]);

          fetchAddress(dadosLink.lat_origem_passageiro, dadosLink.lng_origem_passageiro);
        }

        if (user?.id_user) {
          const resVehicles = await axios.get(`${SUPABASE_URL}/rest/v1/veiculo`, {
            params: { id_user: `eq.${user.id_user}`, select: 'id_veiculo,dsnome,dsplaca' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          setMyVehicles(resVehicles.data);
        }

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        Alert.alert("Erro", "Falha ao carregar informações.");
      } finally {
        setLoading(false);
      }
    };

    if (caronaId) {
      loadAllData();
    }
  }, [caronaId, user]);

  const fetchAddress = async (lat, lng) => {
    if (!lat || !lng) {
      setEndereco("Localização não informada");
      return;
    }
    try {
      const response = await axios.get(`http://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`);
      if (response.data.waypoints && response.data.waypoints.length > 0) {
        setEndereco(response.data.waypoints[0].name || "Rua sem nome identificado");
      } else {
        setEndereco("Localização no mapa (Sem nome)");
      }
    } catch (error) {
      setEndereco("Erro ao buscar endereço");
    }
  };

  const formatDataHora = (isoString) => {
    if (!isoString) return "--/--/----";
    const date = new Date(isoString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
  };

  const handleAcceptCarona = async () => {
    if (!selectedVehicleId) {
      Alert.alert("Atenção", "Selecione um veículo para realizar a carona.");
      return;
    }
    if (!user?.id_user) {
      Alert.alert("Erro", "Usuário não identificado.");
      return;
    }

    setAccepting(true);

    try {
      const payload = {
        id_motorista: user.id_user,     
        id_veiculo: selectedVehicleId,  
        dsstatuscarona: "Aberta"        
      };

      console.log("Aceitando carona (PATCH):", payload);

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/carona?id_carona=eq.${caronaId}`, 
        payload, 
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert("Sucesso", "Carona aceita! Você agora é o motorista.", [
        { text: "OK", onPress: () => router.replace('/CaronasDisponiveis') } 
      ]);

    } catch (error) {
      console.error("Erro ao aceitar:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível aceitar a carona.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{textAlign: 'center', marginTop: 10}}>Carregando pedido...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>
          Pedido de Carona do {passageiro?.dsnome || "Usuário"}:
        </Text>

        <View style={styles.avatarContainer}>
           {passageiro?.dsfotoperfil ? (
             <Image source={{ uri: passageiro.dsfotoperfil }} style={styles.avatar} />
           ) : (
             <View style={styles.avatarPlaceholder}>
                <View style={styles.avatarSmile} />
             </View>
           )}
        </View>

        <View style={styles.infoSection}>
          
          <View style={styles.infoBlock}>
             <Text style={styles.label}>Ponto de Encontro:</Text>
             <Text style={styles.value}>{endereco}</Text>
          </View>

          <View style={styles.infoBlock}>
             <Text style={styles.label}>Horário Solicitado:</Text>
             <Text style={styles.value}>{formatDataHora(caronaInfo?.dsdatahora)}</Text>
          </View>

          <TouchableOpacity 
            style={styles.vehicleSelector} 
            onPress={() => setShowVehicleModal(true)}
          >
            <Text style={[styles.vehicleText, !selectedVehicleId && { color: '#666', fontWeight: 'normal' }]}>
              {selectedVehicleName}
            </Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity 
          style={styles.acceptButton} 
          onPress={handleAcceptCarona}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.acceptButtonText}>Aceitar</Text>
          )}
        </TouchableOpacity>

        <Image source={require('../assets/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />

      </ScrollView>

      <Modal visible={showVehicleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione seu Veículo</Text>
            {myVehicles.length === 0 ? (
              <Text style={{padding: 20, textAlign: 'center'}}>Você não tem veículos cadastrados.</Text>
            ) : (
              <FlatList 
                data={myVehicles}
                keyExtractor={item => item.id_veiculo.toString()}
                renderItem={({item}) => (
                  <TouchableOpacity 
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedVehicleId(item.id_veiculo);
                      setSelectedVehicleName(`${item.dsnome} (${item.dsplaca})`);
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
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarSmile: {
    width: 50,
    height: 25,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
  infoSection: {
    width: '100%',
    alignItems: 'center',
    gap: 25,
    marginBottom: 50,
  },
  infoBlock: {
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  value: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  vehicleSelector: {
    backgroundColor: '#D9D9D9',
    width: '100%',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  acceptButton: {
    backgroundColor: '#FFD700',
    width: 220,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  acceptButtonText: {
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