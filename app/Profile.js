import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios'; 
import NavBar from "../components/navbar";
import { useUser } from '../context/UserContext';

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

export default function PerfilScreen() {
  const { user, setUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return;

      try {
        console.log("Buscando dados:", user.email);

        const response = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
          params: {
            dsemail: `eq.${user.email}`, 
            select: '*'                  
          },
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json' 
          }
        });

        const data = response.data;

        if (data && data.length > 0) {
          const userData = data[0];
          console.log("Dados recebidos do Axios:", userData);
          
          setUser(prevUser => ({
            ...prevUser,
            nome: userData.dsnome,
            curso: userData.dscurso,
            telefone: userData.dstelefone,
            datanascimento: userData.dsdatanascimento,
            fotoperfil: userData.dsfotoperfil,
            email: userData.dsemail 
          }));
        } else {
          console.log("Nenhum usuário encontrado com este email.");
        }

      } catch (err) {
        console.error("Erro na requisição Axios:", err.response?.data || err.message);
      }
    };

    fetchUserData();
  }, [user?.email]); 

  const handleLogout = () => {
    router.replace('/InicialScreen');
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Não informada";
    try {
      const [year, month, day] = dateString.split('-');
      if (!year || !month || !day) return dateString;
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };
  
  const currentUser = user || { nome: 'Carregando...', email: '', telefone: '', curso: '' };

  return (
    <View style={styles.mainContainer}>
      <NavBar />

      <SafeAreaView style={styles.contentContainer}>
        <View style={styles.avatarWrapper}>
          {currentUser.fotoperfil ? (
            <Image 
              source={{ uri: currentUser.fotoperfil }} 
              style={styles.avatarImage} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
               <Text style={styles.avatarInitial}>
                 {currentUser.nome && currentUser.nome !== 'Carregando...' 
                   ? currentUser.nome.charAt(0).toUpperCase() 
                   : '?'}
               </Text>
            </View>
          )}
        </View>

        <View style={styles.infoList}>
          
          <Text style={styles.infoRow}>
            <Text style={styles.label}>Nome : </Text>
            <Text style={styles.value}>{currentUser.nome}</Text>
          </Text>

          <Text style={styles.infoRow}>
            <Text style={styles.label}>Email: </Text>
            <Text style={styles.value}>{currentUser.email}</Text>
          </Text>

          <Text style={styles.infoRow}>
            <Text style={styles.label}>Telefone: </Text>
            <Text style={styles.value}>{currentUser.telefone}</Text>
          </Text>

          <Text style={styles.infoRow}>
            <Text style={styles.label}>Data de Nascimento: </Text>
            <Text style={styles.value}>{formatDate(currentUser.datanascimento)}</Text>
          </Text>

          <Text style={styles.infoRow}>
            <Text style={styles.label}>Curso: </Text>
            <Text style={styles.value}>{currentUser.curso}</Text>
          </Text>

        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Encerrar sessão</Text>
        </TouchableOpacity>

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
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 30,
  },
  avatarWrapper: {
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#333', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 60,
    fontWeight: 'bold',
  },
  infoList: {
    width: '100%',
    marginBottom: 50,
    gap: 15, 
  },
  infoRow: {
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontWeight: 'bold',
    color: '#4a4a4a',
  },
  value: {
    fontWeight: 'normal',
    color: '#555',
  },
  logoutButton: {
    backgroundColor: '#FFD700', 
    width: '100%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2, 
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  watermarkLogo: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    opacity: 0.1, 
    zIndex: 0,
  }
});