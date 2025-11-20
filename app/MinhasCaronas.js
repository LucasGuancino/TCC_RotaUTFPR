import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';

import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function MinhasCaronasScreen() {
  const { user } = useUser();
  const userId = user?.id_user;
  const router = useRouter();

  const [minhasCaronas, setMinhasCaronas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserInfo = async (id) => {
    if (!id) return null;
    try {
      const res = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
        params: { id_user: `eq.${id}`, select: 'dsnome,dsfotoperfil' },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      return res.data[0] || null;
    } catch (e) {
      return null;
    }
  };

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      const resMotorista = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
        params: { 
          id_motorista: `eq.${userId}`, 
          dsstatuscarona: 'neq.Finalizada', 
          select: '*' 
        },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      const listaComoMotorista = await Promise.all(resMotorista.data.map(async (carona) => {
        const resPassageiros = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${carona.id_carona}`, select: 'id_passageiro' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        
        const idPassageiro = resPassageiros.data.length > 0 ? resPassageiros.data[0].id_passageiro : null;
        const infoPassageiro = await fetchUserInfo(idPassageiro);

        return {
          ...carona,
          tipo: 'motorista',
          outroUsuario: infoPassageiro, 
          tituloPapel: 'Você é o motorista nessa carona'
        };
      }));

      const resPassageiroLinks = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
        params: { id_passageiro: `eq.${userId}`, select: '*' },
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });

      const listaComoPassageiro = await Promise.all(resPassageiroLinks.data.map(async (link) => {
        const resCaronaDetalhe = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
          params: { 
            id_carona: `eq.${link.id_carona}`, 
            dsstatuscarona: 'neq.Finalizada', 
            select: '*' 
          },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resCaronaDetalhe.data.length === 0) return null;
        
        const dadosCarona = resCaronaDetalhe.data[0];
        const infoMotorista = await fetchUserInfo(dadosCarona.id_motorista);

        return {
          ...dadosCarona,
          tipo: 'passageiro',
          outroUsuario: infoMotorista, 
          tituloPapel: 'Você é o passageiro nessa carona'
        };
      }));

      const listaFinal = [...listaComoMotorista, ...listaComoPassageiro].filter(item => item !== null);
      listaFinal.sort((a, b) => new Date(b.dsdatahora) - new Date(a.dsdatahora));

      setMinhasCaronas(listaFinal);

    } catch (error) {
      console.error("Erro ao buscar minhas caronas:", error);
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

  const handleCaronaPress = (carona) => {
    if (carona.dsstatuscarona === "Em Andamento") {
        if (carona.tipo === 'motorista') {
            router.push({ 
                pathname: '/MapMotorista', 
                params: { caronaId: carona.id_carona } 
            });
        } else {
            router.push({ 
                pathname: '/MapPassageiro', 
                params: { caronaId: carona.id_carona } 
            });
        }
        return;
    }

    if (carona.tipo === 'motorista') {
      router.push({ 
        pathname: '/PainelCaronaMotorista', 
        params: { caronaId: carona.id_carona } 
      });
    } else {
      router.push({ 
        pathname: '/PainelCaronaPassageiro', 
        params: { caronaId: carona.id_carona } 
      });
    }
  };

  const CaronaCard = ({ item }) => {
    let nomeExibicao = "";
    let fotoExibicao = null;

    if (item.outroUsuario) {
      nomeExibicao = item.outroUsuario.dsnome;
      fotoExibicao = item.outroUsuario.dsfotoperfil;
    } else {
      if (item.tipo === 'motorista') {
         nomeExibicao = "Aguardando Passageiro";
      } else {
         nomeExibicao = "Aguardando Motorista";
      }
    }

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleCaronaPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {fotoExibicao ? (
            <Image source={{ uri: fotoExibicao }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
               <View style={styles.avatarSmile} />
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{nomeExibicao}</Text>
          <Text style={styles.roleText}>{item.tituloPapel}</Text>
          <Text style={styles.statusText}>Status: <Text style={{fontWeight: 'normal'}}>{item.dsstatuscarona}</Text></Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        <Text style={styles.pageTitle}>Suas caronas</Text>

        {loading && !refreshing ? (
           <ActivityIndicator color="#FFD700" style={{marginTop: 50}} size="large" />
        ) : (
           minhasCaronas.length > 0 ? (
             minhasCaronas.map((item, index) => (
               <View key={`${item.id_carona}-${index}`}>
                 <CaronaCard item={item} />
                 <View style={styles.divider} />
               </View>
             ))
           ) : (
             <Text style={styles.emptyText}>Você não possui caronas ativas.</Text>
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
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmile: {
    width: 35,
    height: 18,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#5F9EA0',
    width: '100%',
    marginVertical: 5,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20,
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