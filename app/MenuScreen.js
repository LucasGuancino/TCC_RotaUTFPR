import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from "react-native";
import NavBar from "../components/navbar";
import { useRouter } from "expo-router";
import { useUser } from '../context/UserContext';
import axios from 'axios';

const { width, height } = Dimensions.get("window");

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";

const AppMenu = () => {
  const { user, setUser } = useUser(); 
  const router = useRouter();

  if (!user) return null;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return;

      try {
        console.log("Buscando dados completos para:", user.email);

        const queryUrl = `${SUPABASE_URL}/rest/v1/usuario?dsemail=eq.${user.email}&select=*`;

        const response = await axios.get(queryUrl, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const data = response.data;

        if (data && data.length > 0) {
          const userData = data[0];
          console.log("Dados encontrados no banco:", userData);
          
          setUser(prevUser => ({
            ...prevUser, 
            nome: userData.dsnome || prevUser.nome, 
            email: userData.dsemail || prevUser.email,
            curso: userData.dscurso,
            telefone: userData.dstelefone,
            datanascimento: userData.dsdatanascimento,
            fotoperfil: userData.dsfotoperfil,
            id_user: userData.id_user
          }));
        } else {
          console.log("Usuário não encontrado no banco de dados com este email.");
        }
      } catch (err) {
        console.error("Erro ao buscar dados no Menu:", err.response?.data || err.message);
      }
    };

    fetchUserData();
  }, [user?.email]);


  const buttons = [
    {
      id: 1,
      title: "Caronas\nDisponíveis",
      description: "Busque por caronas para a UTFPR",
      color: "#FECC00",
      icon: require("../assets/icon1.png"),
    },
    {
      id: 2,
      title: "Pedir\nCarona",
      description: "Peça uma carona\nagora mesmo!",
      color: "#43929E",
      icon: require("../assets/icon2.png"),
    },
    {
      id: 3,
      title: "Oferecer uma\nCarona",
      description: "Ofereça caronas para outros estudantes até a UTFPR",
      color: "#FECC00",
      icon: require("../assets/icon3.png"),
    },
    {
      id: 4,
      title: "Veículos",
      description: "Gerencie seus veículos",
      color: "#43929E",
      icon: require("../assets/icon4.png"),
    },
  ];

  return (
    <View style={styles.container}>
      <NavBar />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Olá {user?.nome}!</Text>

        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[styles.button, { backgroundColor: button.color }]}
            onPress={() => {
              if (button.id === 1){
                router.push("/CaronasDisponiveis");
              }
              if (button.id === 2) {
                router.push("/PedirCarona");
              }
              if (button.id === 3){
                router.push("/CriarCarona");
              }
              if (button.id === 4) {
                router.push("/Veiculos");
              }
            }}
          >
            <View style={styles.buttonContent}>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{button.title}</Text>
                <Text style={styles.description}>{button.description}</Text>
              </View>
              <Image source={button.icon} style={styles.icon} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.03,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginVertical: height * 0.02,
    textAlign: "left",
  },
  button: {
    width: "100%",
    maxWidth: 400,
    height: height * 0.12,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    alignSelf: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#000000",
    marginBottom: 5,
  },
  description: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#000000",
  },
  icon: {
    width: width * 0.12,
    height: width * 0.12,
    resizeMode: "contain",
  },
});

export default AppMenu;