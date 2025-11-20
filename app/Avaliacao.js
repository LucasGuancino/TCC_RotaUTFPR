import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';

import NavBar from "../components/navbar";

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function AvaliacaoScreen() {
  const { id_carona, id_motorista } = useLocalSearchParams();
  const router = useRouter();
  const [passengerPhoto, setPassengerPhoto] = useState(null);
  const [fetchedPassengerId, setFetchedPassengerId] = useState(null);
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const loadPassengerData = async () => {
      if (!id_carona) return;

      try {
        console.log("Buscando passageiro vinculado à carona:", id_carona);
        const resVinculo = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${id_carona}`, select: 'id_passageiro' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resVinculo.data.length > 0) {
          const pId = resVinculo.data[0].id_passageiro;
          setFetchedPassengerId(pId); 
          const resUser = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
            params: { id_user: `eq.${pId}`, select: 'dsfotoperfil' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });

          if (resUser.data.length > 0) {
            setPassengerPhoto(resUser.data[0].dsfotoperfil);
          }
        } else {
          console.log("Nenhum passageiro encontrado para esta carona.");
        }
      } catch (error) {
        console.log("Erro ao carregar dados do passageiro:", error);
      }
    };

    loadPassengerData();
  }, [id_carona]);

  const handleFinalizar = async () => {
    if (rating === 0) {
      Alert.alert("Avaliação", "Por favor, selecione pelo menos 1 estrela.");
      return;
    }

    if (!fetchedPassengerId || !id_motorista || !id_carona) {
        Alert.alert("Erro", "Dados incompletos. Aguarde o carregamento ou tente novamente.");
        console.error("IDs Faltando -> Carona:", id_carona, "Mot:", id_motorista, "Pass:", fetchedPassengerId);
        return;
    }

    setLoading(true);

    try {
      const payload = {
        id_carona: id_carona,
        id_motorista: id_motorista,
        id_passageiro: fetchedPassengerId, 
        dsavaliacao: parseFloat(rating), 
        dscomentario: comentario,
        dtavaliacao: new Date().toISOString() 
      };

      console.log("Enviando avaliação:", payload);

      await axios.post(`${SUPABASE_URL}/rest/v1/avaliacao_motorista`, payload, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      Alert.alert("Sucesso", "Avaliação enviada com sucesso!", [
        { text: "OK", onPress: () => router.replace('/MenuScreen') }
      ]);

    } catch (error) {
      console.error("Erro ao avaliar:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível salvar a avaliação.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [1, 2, 3, 4, 5];
    return (
      <View style={styles.starsContainer}>
        {stars.map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.starText, { color: star <= rating ? '#4F949E' : '#D1D5DB' }]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.title}>
            Uhuuul, parece que a carona{'\n'}foi um sucesso!!
          </Text>

          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/RoboAsset.png')} 
              style={styles.roboImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.subTitle}>Que tal deixar sua avaliação?</Text>

          <View style={styles.ratingRow}>
             <View style={styles.avatarContainer}>
                {passengerPhoto ? (
                  <Image source={{ uri: passengerPhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
             </View>

             {renderStars()}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Deixe seu comentário..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={comentario}
              onChangeText={setComentario}
            />
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleFinalizar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitText}>Finalizar</Text>
            )}
          </TouchableOpacity>

          <Image source={require('../assets/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 30,
  },
  imageContainer: {
    marginBottom: 30,
  },
  roboImage: {
    width: 120,
    height: 120,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 30,
  },
  avatarContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  starText: {
    fontSize: 40, 
  },
  inputContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    padding: 15,
    marginBottom: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    textAlignVertical: 'top', 
    fontWeight: 'bold',
  },
  submitButton: {
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
  submitText: {
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
  }
});