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
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function PainelPassageiroScreen() {
  const { caronaId } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();

  const [caronaInfo, setCaronaInfo] = useState(null);
  const [motorista, setMotorista] = useState(null);
  const [veiculo, setVeiculo] = useState(null);
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
        const dadosCarona = resCarona.data[0];
        setCaronaInfo(dadosCarona);

        if (dadosCarona.id_motorista) {
            const resMotorista = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
            params: { id_user: `eq.${dadosCarona.id_motorista}`, select: 'dsnome,dstelefone' }, 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            setMotorista(resMotorista.data[0]);
        } else {
            setMotorista({ dsnome: "Aguardando motorista...", dstelefone: "" });
        }

        if (dadosCarona.id_veiculo) {
            const resVeiculo = await axios.get(`${SUPABASE_URL}/rest/v1/veiculo`, {
            params: { id_veiculo: `eq.${dadosCarona.id_veiculo}`, select: 'dsnome,dsplaca,dsdescricao' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            setVeiculo(resVeiculo.data[0]);
        }

      } catch (error) {
        console.error("Erro ao carregar painel do passageiro:", error);
        Alert.alert("Erro", "Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    };

    if (caronaId) loadData();
  }, [caronaId]);

  const formatDataHora = (isoString) => {
    if (!isoString) return "--/--/----";
    const date = new Date(isoString);
    return `${date.toLocaleDateString('pt-BR')} - ${date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
  };

  const handleLeaveCarona = () => {
    Alert.alert(
      "Sair da Carona",
      "Tem a certeza que deseja sair desta carona?",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim, Sair", style: 'destructive', onPress: performExit }
      ]
    );
  };

  const performExit = async () => {
    if (!user?.id_user) return;
    
    setProcessing(true);
    try {
      await axios.delete(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
        params: { 
            id_carona: `eq.${caronaId}`,
            id_passageiro: `eq.${user.id_user}`
        },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      const resPassageirosRestantes = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${caronaId}`, select: 'id_passageiro' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      
      const resCaronaCheck = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
          params: { id_carona: `eq.${caronaId}`, select: 'id_motorista' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      
      const caronaAtual = resCaronaCheck.data[0];
      const qtdPassageiros = resPassageirosRestantes.data.length;
      if ((!caronaAtual || !caronaAtual.id_motorista) && qtdPassageiros === 0) {
          console.log("Carona ficou órfã (sem motorista e sem passageiros). Excluindo registro...");
          await axios.delete(`${SUPABASE_URL}/rest/v1/carona`, {
             params: { id_carona: `eq.${caronaId}` },
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
      }

      Alert.alert("Sucesso", "Você saiu da carona.", [
        { text: "OK", onPress: () => router.replace('/MinhasCaronas') }
      ]);

    } catch (error) {
      console.error("Erro ao sair:", error);
      Alert.alert("Erro", "Falha ao sair da carona.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{textAlign: 'center', marginTop: 10}}>Carregando informações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
           <Image 
             source={require('../assets/VisualizarCarona.png')} 
             style={styles.mainImage}
             resizeMode="contain"
           />
        </View>
        <View style={styles.infoSection}>
           
           <View style={styles.infoBlock}>
              <Text style={styles.label}>Motorista:</Text>
              <Text style={styles.value}>{motorista?.dsnome || "Aguardando..."}</Text>
              <Text style={styles.subValue}>Contato: {motorista?.dstelefone || "-"}</Text>
           </View>

           <View style={styles.infoBlock}>
              <Text style={styles.label}>Passageiros:</Text>
              <Text style={styles.value}>{user?.nome || "Você"}</Text>
           </View>

           <View style={styles.infoBlock}>
              <Text style={styles.label}>Horário:</Text>
              <Text style={styles.value}>{formatDataHora(caronaInfo?.dsdatahora)}</Text>
           </View>

           <View style={styles.infoBlock}>
              <Text style={styles.label}>Veículo:</Text>
              <Text style={styles.value}>
                {veiculo ? `${veiculo.dsnome} ${veiculo.dsdescricao} - ${veiculo.dsplaca}` : "Aguardando confirmação"}
              </Text>
           </View>

        </View>

        <TouchableOpacity 
          style={styles.leaveButton} 
          onPress={handleLeaveCarona}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.leaveButtonText}>Sair da Carona</Text>
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
  imageContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  mainImage: {
    width: 240,
    height: 120,
  },
  infoSection: {
    width: '100%',
    gap: 20,
    marginBottom: 50,
  },
  infoBlock: {
    alignItems: 'flex-start',
    width: '100%',
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20, 
  },
  subValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    marginTop: 2,
  },
  leaveButton: {
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
    marginBottom: 20,
  },
  leaveButtonText: {
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