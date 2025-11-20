import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  Image,
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import { useRouter, useFocusEffect } from 'expo-router'; 
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function VeiculosScreen() {
  const { user } = useUser();
  const router = useRouter();
  
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchVeiculos = async () => {
        if (!user || !user.id_user) {
          setLoading(false);
          return;
        }

        try {
          console.log("Atualizando lista de veículos...");

          const queryUrl = `${SUPABASE_URL}/rest/v1/veiculo?id_user=eq.${user.id_user}&select=*`;

          const response = await axios.get(queryUrl, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data) {
            setVeiculos(response.data);
          }
        } catch (error) {
          console.error("Erro ao buscar veículos:", error.response?.data || error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchVeiculos();
    }, [user])
  );

  const renderItem = ({ item }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Image 
            source={require('../assets/icon4.png')} 
            style={styles.carIcon}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.carTitle}>{item.dsnome}</Text>
          <Text style={styles.carDetails}>
            Cor: {item.dsdescricao} Placa: {item.dsplaca}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <SafeAreaView style={styles.contentContainer}>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text>Carregando veículos...</Text>
          </View>
        ) : (
          <FlatList
            data={veiculos}
            keyExtractor={(item) => item.id_veiculo?.toString() || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListFooterComponent={() => (
               <View>
                 {veiculos.length > 0 && <View style={styles.separator} />}
                 <View style={styles.addButtonContainer}>
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => router.push('/CadVeiculos')}
                    >
                      <Text style={styles.plusText}>+</Text>
                    </TouchableOpacity>
                 </View>
               </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum veículo cadastrado.</Text>
            }
          />
        )}

        <Image 
          source={require('../assets/logo.png')} 
          style={styles.watermarkLogo}
          resizeMode="contain"
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, 
  },
  cardContainer: {
    marginBottom: 15,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carIcon: {
    width: 60,
    height: 60,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 5,
  },
  carTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  carDetails: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  helperText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  separator: {
    height: 2,
    backgroundColor: '#FFD700',
    width: '100%',
    marginBottom: 15,
  },
  addButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35, 
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  plusText: {
    fontSize: 40,
    color: '#FFF',
    fontWeight: '300', 
    marginTop: -5, 
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  watermarkLogo: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    opacity: 0.1, 
    zIndex: -1,
  }
});