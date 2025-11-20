import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router';
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function CaronasDisponiveisScreen() {
  const { user } = useUser();
  const router = useRouter();
  const userId = user?.id_user; 
  const [caronasAbertas, setCaronasAbertas] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getStreetName = async (lat, lng) => {
    if (!lat || !lng) return "Localização desconhecida";
    try {
      const response = await axios.get(`http://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`);
      if (response.data.waypoints && response.data.waypoints.length > 0) {
        return response.data.waypoints[0].name || "Rua sem nome";
      }
      return "Localização no mapa";
    } catch (error) {
      return "Localização indisponível";
    }
  };

  const fetchUserData = async (id) => {
    try {
      const response = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
        params: { id_user: `eq.${id}`, select: 'dsnome,dsfotoperfil' },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      return response.data[0] || { dsnome: 'Desconhecido', dsfotoperfil: null };
    } catch (e) {
      return { dsnome: 'Erro', dsfotoperfil: null };
    }
  };

  const fetchData = async () => {
    if (!userId) return; 
    setLoading(true);
    
    try {
      const resAbertas = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
        params: { dsstatuscarona: 'eq.Aberta', select: '*' },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      const abertasComMotorista = await Promise.all(resAbertas.data.map(async (carona) => {
        if (carona.id_motorista === userId) return null;

        const motorista = await fetchUserData(carona.id_motorista);

        const resPassageiros = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { 
            id_carona: `eq.${carona.id_carona}`,
            select: 'id_passageiro'
          },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        const jaEstouNaCarona = resPassageiros.data.some(p => p.id_passageiro === userId);
        if (jaEstouNaCarona) return null;

        const vagasOcupadas = resPassageiros.data.length;
        const vagasTotais = carona.dsvagas;
        const vagasDisponiveis = vagasTotais - vagasOcupadas;; 

        return { 
          ...carona, 
          motorista,
          vagasCalculadas: {
            disponiveis: vagasDisponiveis,
            totais: vagasTotais
          }
        };
      }));
      
      setCaronasAbertas(abertasComMotorista.filter(item => item !== null));

      const resSolicitadas = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
        params: { dsstatuscarona: 'eq.Solicitado', select: '*' },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      const solicitacoesCompletas = await Promise.all(resSolicitadas.data.map(async (carona) => {
        const resPassageiro = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${carona.id_carona}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        const dadosPassageiro = resPassageiro.data[0];
        
        if (dadosPassageiro) {
           if (dadosPassageiro.id_passageiro === userId) return null;

           const infoUsuario = await fetchUserData(dadosPassageiro.id_passageiro);
           const nomeRua = await getStreetName(dadosPassageiro.lat_origem_passageiro, dadosPassageiro.lng_origem_passageiro);
           
           return { 
             ...carona, 
             passageiro: infoUsuario, 
             localizacaoTexto: nomeRua,
             dadosIntermediarios: dadosPassageiro
           };
        }
        return null;
      }));

      setSolicitacoes(solicitacoesCompletas.filter(item => item !== null));

    } catch (error) {
      console.error("Erro ao carregar caronas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [userId]) 
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const CaronaCard = ({ title, subtitle, imageUri, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.avatarContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
             <View style={styles.avatarSmile} /> 
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>{title}</Text>
        <Text style={styles.detailText}>{subtitle}</Text>
        <Text style={styles.clickText}>Clique para mais detalhes</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>Caronas Disponíveis</Text>
           <View style={styles.filterIcon}>
              <View style={[styles.bar, { width: 24 }]} />
              <View style={[styles.bar, { width: 16, alignSelf: 'flex-end' }]} />
              <View style={[styles.bar, { width: 8, alignSelf: 'center' }]} />
           </View>
        </View>
        <View style={styles.divider} />

        {loading && !refreshing ? (
           <ActivityIndicator color="#FFD700" style={{marginTop: 20}} />
        ) : (
           caronasAbertas.length > 0 ? (
             caronasAbertas.map((item) => (
               <View key={item.id_carona}>
                 <CaronaCard 
                    title={item.motorista.dsnome}
                    subtitle={`Vagas: ${item.vagasCalculadas.disponiveis}/${item.vagasCalculadas.totais}`} 
                    imageUri={item.motorista.dsfotoperfil}
                    onPress={() => router.push({ pathname: '/DetalhesCaronaScreen', params: { caronaId: item.id_carona } })}
                 />
                 <View style={styles.itemDivider} />
               </View>
             ))
           ) : (
             <Text style={styles.emptyText}>Nenhuma carona disponível no momento.</Text>
           )
        )}

        <View style={[styles.sectionHeader, { marginTop: 40 }]}>
           <Text style={styles.sectionTitle}>Solicitações de Carona</Text>
           <View style={styles.filterIcon}>
              <View style={[styles.bar, { width: 24 }]} />
              <View style={[styles.bar, { width: 16, alignSelf: 'center' }]} />
           </View>
        </View>
        <View style={styles.divider} />

        {loading && !refreshing ? (
           <ActivityIndicator color="#FFD700" style={{marginTop: 20}} />
        ) : (
           solicitacoes.length > 0 ? (
             solicitacoes.map((item) => (
               <View key={item.id_carona}>
                 <CaronaCard 
                    title={item.passageiro.dsnome}
                    subtitle={item.localizacaoTexto}
                    imageUri={item.passageiro.dsfotoperfil}
                    onPress={() => router.push({ pathname: '/AceitarCaronaScreen', params: { caronaId: item.id_carona } })}
                 />
                 <View style={styles.itemDivider} />
               </View>
             ))
           ) : (
             <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
           )
        )}

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
    padding: 25,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  filterIcon: {
    gap: 4,
    marginTop: 5,
  },
  bar: {
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  divider: {
    height: 2,
    backgroundColor: '#70C0C9', 
    marginBottom: 10,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#70C0C9',
    marginVertical: 5,
    opacity: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmile: {
    width: 30,
    height: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  detailText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  clickText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 20,
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