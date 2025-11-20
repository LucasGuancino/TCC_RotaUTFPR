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
  Alert 
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function EntrarNaCarona() {
  const { caronaId } = useLocalSearchParams(); 
  const { user } = useUser();
  const router = useRouter();
  const [caronaDetails, setCaronaDetails] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [veiculo, setVeiculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resCarona = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        if (resCarona.data.length === 0) {
          Alert.alert("Erro", "Carona não encontrada.");
          router.back();
          return;
        }

        const dadosCarona = resCarona.data[0];
        setCaronaDetails(dadosCarona);

        const resMotorista = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
          params: { id_user: `eq.${dadosCarona.id_motorista}`, select: 'dsnome,dsfotoperfil' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        setMotorista(resMotorista.data[0]);

        const resVeiculo = await axios.get(`${SUPABASE_URL}/rest/v1/veiculo`, {
          params: { id_veiculo: `eq.${dadosCarona.id_veiculo}`, select: 'dsnome,dsplaca,dsdescricao' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        setVeiculo(resVeiculo.data[0]);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation(location.coords);
        }

      } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
        Alert.alert("Erro", "Não foi possível carregar os dados da carona.");
      } finally {
        setLoading(false);
      }
    };

    if (caronaId) {
      loadData();
    }
  }, [caronaId]);

  const formatDataHora = (isoString) => {
    if (!isoString) return "Data inválida";
    const date = new Date(isoString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
  };

  const handleJoinCarona = async () => {
    if (!user || !user.id_user) {
      Alert.alert("Erro", "Usuário não identificado.");
      return;
    }
    if (!userLocation) {
      Alert.alert("Localização", "Precisamos da sua localização para confirmar a carona. Verifique o GPS.");
      return;
    }

    setJoining(true);

    try {
      const checkExisting = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
        params: { 
            id_carona: `eq.${caronaId}`, 
            id_passageiro: `eq.${user.id_user}` 
        },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      if (checkExisting.data.length > 0) {
        Alert.alert("Aviso", "Você já está nesta carona!");
        setJoining(false);
        return;
      }

      const payload = {
        id_carona: caronaId,
        id_passageiro: user.id_user,
        status_passageiro: "Confirmado",
        lat_origem_passageiro: userLocation.latitude,
        lng_origem_passageiro: userLocation.longitude
      };

      console.log("Registrando passageiro:", payload);

      await axios.post(`${SUPABASE_URL}/rest/v1/carona_passageiros`, payload, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      Alert.alert("Sucesso", "Você entrou na carona! O motorista receberá sua localização.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error("Erro ao entrar na carona:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível entrar na carona. Tente novamente.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{textAlign: 'center', marginTop: 10}}>Carregando detalhes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>
          Carona de {motorista?.dsnome}:
        </Text>

        <View style={styles.avatarContainer}>
           {motorista?.dsfotoperfil ? (
             <Image source={{ uri: motorista.dsfotoperfil }} style={styles.avatar} />
           ) : (
             <View style={styles.avatarPlaceholder}>
                <View style={styles.avatarSmile} />
             </View>
           )}
        </View>

        <View style={styles.infoSection}>
          
          <View style={styles.infoBlock}>
             <Text style={styles.label}>Horário de Partida:</Text>
             <Text style={styles.value}>{formatDataHora(caronaDetails?.dsdatahora)}</Text>
          </View>

          <View style={styles.infoBlock}>
             <Text style={styles.label}>Veículo:</Text>
             <Text style={styles.value}>
               {veiculo ? `${veiculo.dsnome} - ${veiculo.dsdescricao} Placa: ${veiculo.dsplaca}` : "Informação não disponível"}
             </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Aviso: Sua localização atual será compartilhada com o motorista ao confirmar.
            </Text>
          </View>

        </View>
        <TouchableOpacity 
          style={styles.joinButton} 
          onPress={handleJoinCarona}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.joinButtonText}>Juntar-se a{'\n'}Carona</Text>
          )}
        </TouchableOpacity>

        <Image source={require('../assets/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />

      </ScrollView>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 40,
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
    marginBottom: 40,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000', 
    textAlign: 'center',
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
  joinButton: {
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
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
  },
  watermarkLogo: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    opacity: 0.08, 
    zIndex: -1,
  }
});