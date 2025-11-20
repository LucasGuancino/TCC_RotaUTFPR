import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  Platform, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useRouter } from 'expo-router'; 
import { useUser } from '../context/UserContext'; 

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function App() {
  const { user, setUser } = useUser(); 
  const router = useRouter(); 

  const [curso, setCurso] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateText, setDateText] = useState(''); 

  const [profileImage, setProfileImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async (uri) => {
    const ext = uri.substring(uri.lastIndexOf('.') + 1);
    const fileName = `${new Date().getTime()}.${ext}`;
    const formData = new FormData();

    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: fileName,
      type: `image/${ext}` 
    });

    try {
      await axios.post(
        `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`, 
        formData,
        {
          headers: {
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}`, 
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
    } catch (error) {
      console.log("URL Tentada:", `${SUPABASE_URL}/storage/v1/object/avatars/${fileName}`);
      console.log("Erro Detalhado:", error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        throw new Error("Erro de Permissão (403).");
      }
      throw new Error("Falha ao enviar imagem.");
    }
  };

  const handleRegister = async () => {
    if (!user || !user.email) {
       Alert.alert("Erro", "Dados do usuário não encontrados. Faça login novamente.");
       return;
    }

    if (!curso || !telefone || !dateText || !profileImage) {
      Alert.alert("Erro", "Preencha todos os campos e escolha uma foto.");
      return;
    }

    setLoading(true);

    try {
      console.log("Iniciando upload...");
      const publicAvatarUrl = await uploadImageToSupabase(profileImage);
      console.log("Upload concluído:", publicAvatarUrl);

      const formattedDateISO = date.toISOString().split('T')[0];

      const payload = {
        dsemail: user.email,
        dsnome: user.nome,
        dscurso: curso,
        dstelefone: telefone,
        dsdatanascimento: formattedDateISO,
        dsfotoperfil: publicAvatarUrl
      };
      
      await axios.post(
        `${SUPABASE_URL}/rest/v1/usuario`,
        payload,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert("Sucesso", "Cadastro realizado!");
      router.replace("/MenuScreen");
      
    } catch (error) {
      console.error("Erro no fluxo:", error);
      Alert.alert("Erro", error.message || "Não foi possível realizar o cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);

    if (event.type === 'set' || Platform.OS === 'ios') {
      const fDate = currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear();
      setDateText(fDate);
      if (Platform.OS === 'android') setShowDatePicker(false);
    } else {
      setShowDatePicker(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.title}>Cadastrar</Text>

      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        {profileImage ? (
          <View style={styles.selectedImageContainer}>
             <Image source={{ uri: profileImage }} style={styles.selectedImage} />
          </View>
        ) : (
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>↑</Text> 
          </View>
        )}
        <Text style={styles.uploadText}>
          {profileImage ? "Trocar foto" : "Enviar foto de perfil"}
        </Text>
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Curso matriculado"
          placeholderTextColor="#555"
          value={curso}
          onChangeText={setCurso}
        />

        <TextInput
          style={styles.input}
          placeholder="Telefone"
          placeholderTextColor="#555"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
        />

        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={[styles.inputText, !dateText && styles.placeholderText]}>
            {dateText || "Data de Nascimento"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            maximumDate={new Date()}
            locale="pt-BR"
          />
        )}
      </View>

      <TouchableOpacity 
        style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.registerButtonText}>Cadastrar</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: { width: '100%', alignItems: 'center', marginBottom: 10 },
  logo: { width: 200, height: 100 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#000',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 4,
  },
  uploadButton: {
    backgroundColor: '#FFD700',
    width: '100%',
    height: 55,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#000', 
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  selectedImage: { width: '100%', height: '100%' },
  iconText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: -2 },
  uploadText: { fontSize: 16, fontWeight: '600', color: '#000' },
  inputContainer: { width: '100%', gap: 20, marginBottom: 40 },
  input: {
    backgroundColor: '#D9D9D9',
    width: '100%',
    height: 55,
    borderRadius: 30,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 16,
    color: '#000',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  inputText: { fontSize: 16, color: '#000', textAlign: 'center' },
  placeholderText: { color: '#555' },
  registerButton: {
    backgroundColor: '#FFD700',
    width: 200,
    height: 55,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  registerButtonDisabled: { opacity: 0.7 },
  registerButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  loginLink: { marginBottom: 20 },
  loginLinkText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
});