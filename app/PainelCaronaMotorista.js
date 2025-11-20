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

import NavBar from "../components/navbar";

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function PainelCaronaScreen() {
  const { caronaId } = useLocalSearchParams();
  const router = useRouter();

  const [caronaInfo, setCaronaInfo] = useState(null);
  const [passageiros, setPassageiros] = useState([]);
  const [enderecoEncontro, setEnderecoEncontro] = useState("Carregando localização...");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); 

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
        setCaronaInfo(resCarona.data[0]);

        const resLinks = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resLinks.data.length > 0) {
          const links = resLinks.data;
          fetchAddress(links[0].lat_origem_passageiro, links[0].lng_origem_passageiro);

          const listaPassageiros = await Promise.all(links.map(async (link) => {
             const resUser = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
                params: { id_user: `eq.${link.id_passageiro}`, select: 'dsnome' },
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
             });
             return resUser.data[0]?.dsnome || "Desconhecido";
          }));
          
          setPassageiros(listaPassageiros);
        } else {
          setEnderecoEncontro("Nenhum passageiro (Sem local definido)");
        }

      } catch (error) {
        console.error("Erro ao carregar painel:", error);
      } finally {
        setLoading(false);
      }
    };

    if (caronaId) loadData();
  }, [caronaId]);

  const fetchAddress = async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const response = await axios.get(`http://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`);
      if (response.data.waypoints && response.data.waypoints.length > 0) {
        setEnderecoEncontro(response.data.waypoints[0].name || "Rua sem nome identificado");
      }
    } catch (e) {
      setEnderecoEncontro("Erro ao obter endereço");
    }
  };

  const formatDataHora = (isoString) => {
    if (!isoString) return "--/--/----";
    const date = new Date(isoString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
  };

  const handleCancelCarona = () => {
    Alert.alert(
      "Cancelar Carona",
      "Tem certeza que deseja cancelar esta carona? Essa ação não pode ser desfeita.",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim, Cancelar", style: 'destructive', onPress: performDelete }
      ]
    );
  };

  const performDelete = async () => {
    setProcessing(true);
    try {
      await axios.delete(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
        params: { id_carona: `eq.${caronaId}` },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      await axios.delete(`${SUPABASE_URL}/rest/v1/carona`, {
        params: { id_carona: `eq.${caronaId}` },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      Alert.alert("Sucesso", "Carona cancelada.", [
        { text: "OK", onPress: () => router.replace('/MinhasCaronasScreen') } 
      ]);
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      Alert.alert("Erro", "Falha ao cancelar carona.");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartRoute = async () => {
    setProcessing(true); 
    
    try {
        console.log("Iniciando rota e atualizando status...");
        await axios.patch(`${SUPABASE_URL}/rest/v1/carona?id_carona=eq.${caronaId}`, 
            { dsstatuscarona: "Em Andamento" },
            { 
                headers: { 
                    'apikey': SUPABASE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_KEY}`, 
                    'Content-Type': 'application/json' 
                } 
            }
        );

        router.push({ 
            pathname: '/MapMotorista', 
            params: { caronaId: caronaId } 
        });

    } catch (error) {
        console.error("Erro ao iniciar rota:", error);
        Alert.alert("Erro", "Não foi possível atualizar o status da carona.");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{textAlign: 'center', marginTop: 10}}>Carregando painel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.headerTitle}>Visualização da Carona:</Text>

        <View style={styles.imageContainer}>
           <Image 
             source={require('../assets/VisualizarCarona.png')} 
             style={styles.mainImage}
             resizeMode="contain"
           />
        </View>

        <View style={styles.infoSection}>
           
           <View style={styles.infoBlock}>
              <Text style={styles.label}>Ponto de Encontro:</Text>
              <Text style={styles.value}>{enderecoEncontro}</Text>
           </View>

           <View style={styles.infoBlock}>
              <Text style={styles.label}>Horário</Text>
              <Text style={styles.value}>{formatDataHora(caronaInfo?.dsdatahora)}</Text>
           </View>

           <View style={styles.infoBlockLeft}>
              <Text style={styles.label}>Passageiros:</Text>
              {passageiros.length > 0 ? (
                passageiros.map((nome, index) => (
                  <Text key={index} style={styles.passengerItem}>• {nome}</Text>
                ))
              ) : (
                <Text style={styles.passengerItem}>Nenhum passageiro confirmado ainda.</Text>
              )}
           </View>

        </View>

        <View style={styles.buttonGroup}>
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleStartRoute}
                disabled={processing} 
            >
               {processing ? (
                   <ActivityIndicator color="#000" />
               ) : (
                   <Text style={styles.buttonText}>Iniciar a Rota</Text>
               )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleCancelCarona}
              disabled={processing}
            >
              <Text style={styles.buttonText}>Cancelar a{'\n'}Carona</Text>
            </TouchableOpacity>
        </View>

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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  imageContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  mainImage: {
    width: 280,
    height: 160,
  },
  infoSection: {
    width: '100%',
    gap: 20,
    marginBottom: 40,
  },
  infoBlock: {
    alignItems: 'flex-start',
    width: '100%',
  },
  infoBlockLeft: {
    alignItems: 'flex-start',
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginLeft: 10,
  },
  passengerItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 20,
    marginTop: 2,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  actionButton: {
    backgroundColor: '#FFD700',
    width: 240,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
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