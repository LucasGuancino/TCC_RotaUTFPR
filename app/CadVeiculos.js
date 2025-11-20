import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function CadVeiculosScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [placa, setPlaca] = useState('');
  const [descricao, setDescricao] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nome || !placa || !descricao) {
      Alert.alert("Atenção", "Preencha todos os campos!");
      return;
    }

    if (!user || !user.id_user) {
      Alert.alert("Erro", "Usuário não identificado. Faça login novamente.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        dsnome: nome,
        dsplaca: placa.toUpperCase(),
        dsdescricao: descricao,
        id_user: user.id_user
      };

      console.log("Enviando payload:", payload);
      await axios.post(
        `${SUPABASE_URL}/rest/v1/veiculo`,
        payload,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal' 
          }
        }
      );

      Alert.alert("Sucesso", "Veículo cadastrado com sucesso!", [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]);

    } catch (error) {
      console.error("Erro ao salvar veículo:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível salvar o veículo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.headerImage} 
              resizeMode="contain"
            />
            <Text style={styles.title}>Painel de{'\n'}Veículos</Text>
        </View>
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nome do Veiculo"
            placeholderTextColor="#666"
            value={nome}
            onChangeText={setNome}
          />

          <TextInput
            style={styles.input}
            placeholder="Placa"
            placeholderTextColor="#666"
            value={placa}
            onChangeText={setPlaca}
            autoCapitalize="characters"
          />

          <TextInput
            style={styles.input}
            placeholder="Descrição do Veiculo"
            placeholderTextColor="#666"
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color="#000" />
          ) : (
             <Text style={styles.saveText}>Salvar</Text>
          )}
        </TouchableOpacity>

        <Image 
          source={require('../assets/logo.png')} 
          style={styles.watermarkLogo}
          resizeMode="contain"
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerImage: {
    width: 180,
    height: 90, 
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    width: '80%',
    gap: 20,
  },
  input: {
    backgroundColor: '#D9D9D9', 
    width: '100%',
    height: 55,
    borderRadius: 27.5, 
    paddingHorizontal: 20,
    textAlign: 'center', 
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  saveButton: {
    marginTop: 60,
    backgroundColor: '#FFD700',
    width: 180,
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
    fontSize: 20,
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
  }
});