import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Dimensions, Alert, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { useUser } from "../context/UserContext";
import { useRouter } from "expo-router";
import { supabase } from "../components/supabase"; 

const { width } = Dimensions.get("window");

export default function InicialScreen() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const { user, setUser } = useUser();

  async function handleLogin() {
    if (!login || !password) {
      Alert.alert("Atenção", "Preencha login e senha");
      return;
    }

    try {
      const response = await fetch(
        "URL_AUTENTICACAO_UTFPR",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password }),
        }
      );

      if (!response.ok) {
        Alert.alert("Erro", "R.A ou senha inválidos.");
        return;
      }
      const data = await response.json();
      console.log(data);
      const email = data?.email;
      const nome = data?.name;

      if (!email) {
        Alert.alert("Erro", "Não foi possível recuperar o e-mail do usuário.");
        return;
      }
      setUser({ ...user, email, nome });

      const supa = await supabase.get("usuario", {
        params: {
          select: "*",
          dsemail: `eq.${email}`,
        },
      });

      const registros = supa.data;

      if (registros.length > 0) {
        router.replace("/MenuScreen");
      } else {
        Alert.alert(
          "Cadastro incompleto",
          "Para prosseguir é necessário completar seu cadastro"
        );

        router.replace("/RegisterScreen");
      }

    } catch (err) {
      Alert.alert("Erro", "Falha na conexão.");
      console.log(err);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("../assets/AppLogo.png")} style={styles.logo} />

        <View style={styles.inputsContainer}>
          <TextInput
            style={styles.input}
            placeholder="Login"
            value={login}
            onChangeText={setLogin}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Todos os Direitos Reservados</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  logo: {
    width: width * 0.7,
    height: width * 0.4,
    resizeMode: "contain",
    marginBottom: 20,
  },
  inputsContainer: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: width * 0.75,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#FECC00",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 60,
    width: width * 0.55,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#000",
    fontSize: 16,
  },
  footer: {
    marginTop: 40,
    fontSize: 12,
    color: "#000",
  },
});
