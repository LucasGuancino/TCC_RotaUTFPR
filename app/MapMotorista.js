import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';

import NavBar from "../components/navbar"; 
import { useUser } from '../context/UserContext'; 

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";
const { width, height } = Dimensions.get('window');

export default function MapMotoristaScreen() {
  const { caronaId } = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef(null);
  const { user } = useUser(); 
  const userId = user?.id_user;
  const locationSubscription = useRef(null);
  const locationRecordId = useRef(null); 
  const lastDbUpdate = useRef(0); 
  const [driverLocation, setDriverLocation] = useState(null);
  const [passengerLocation, setPassengerLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passengerInfo, setPassengerInfo] = useState(null);
  const [distance, setDistance] = useState("0 km");
  const [duration, setDuration] = useState("0 min");

  const updateDbLocation = async (coords) => {
    if (!userId || !caronaId) return;

    const now = Date.now();
    if (now - lastDbUpdate.current < 40000) {
        return; 
    }

    lastDbUpdate.current = now;
    const timestampISO = new Date().toISOString();

    try {
        if (!locationRecordId.current) {
            const { data: existingData } = await axios.get(`${SUPABASE_URL}/rest/v1/localizacao_motorista`, {
                params: { id_carona: `eq.${caronaId}`, select: 'id_localizacao' },
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });

            if (existingData && existingData.length > 0) {
                locationRecordId.current = existingData[0].id_localizacao;
            }
        }

        if (!locationRecordId.current) {
            const body = {
                id_carona: caronaId,
                id_motorista: userId,
                lat_motorista: coords.latitude,
                lng_motorista: coords.longitude,
                dt_atualizacao: timestampISO
            };
            
            const response = await axios.post(`${SUPABASE_URL}/rest/v1/localizacao_motorista`, body, {
                 headers: { 
                    'apikey': SUPABASE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                 }
            });
            
            if (response.data && response.data.length > 0) {
                locationRecordId.current = response.data[0].id_localizacao; 
            }
        } else {
            const body = {
                lat_motorista: coords.latitude,
                lng_motorista: coords.longitude,
                dt_atualizacao: timestampISO
            };

            await axios.patch(`${SUPABASE_URL}/rest/v1/localizacao_motorista?id_localizacao=eq.${locationRecordId.current}`, body, {
                headers: { 
                    'apikey': SUPABASE_KEY, 
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error("Erro DB Location:", error);
    }
  };

  useEffect(() => {
    const startNavigation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'O acesso à localização é necessário.');
          setLoading(false);
          return;
        }

        const currentPos = await Location.getCurrentPositionAsync({});
        setDriverLocation(currentPos.coords);
        updateDbLocation(currentPos.coords);

        const resPassageiroLink = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resPassageiroLink.data.length > 0) {
          const dadosLink = resPassageiroLink.data[0];
          
          const destLoc = {
            latitude: dadosLink.lat_origem_passageiro,
            longitude: dadosLink.lng_origem_passageiro
          };
          setPassengerLocation(destLoc);

          const resUser = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
            params: { id_user: `eq.${dadosLink.id_passageiro}`, select: 'id_user,dsnome,dsfotoperfil' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          setPassengerInfo(resUser.data[0]);

          await fetchRouteOSRM(currentPos.coords, destLoc);

          locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000, 
                distanceInterval: 0, 
            },
            (newLocation) => {
                setDriverLocation(newLocation.coords);
                updateDbLocation(newLocation.coords);
            }
          );

        } else {
          Alert.alert("Aviso", "Nenhum passageiro encontrado.");
          setPassengerLocation(currentPos.coords); 
        }

      } catch (error) {
        console.error("Erro ao iniciar navegação:", error);
        Alert.alert("Erro", "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    if (caronaId) {
      startNavigation();
    }

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [caronaId]);

  const fetchRouteOSRM = async (start, end) => {
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
      const response = await axios.get(url);
      
      if (response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const coords = route.geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0],
        }));

        setRouteCoords(coords);
        
        const distKm = (route.distance / 1000).toFixed(1);
        const durMin = Math.round(route.duration / 60);
        
        setDistance(`${distKm} km`);
        setDuration(`${durMin} mins`);

        if (mapRef.current) {
            mapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                animated: true
            });
        }
      }
    } catch (error) {
      console.log("Erro OSRM:", error);
    }
  };
  const handleEndRoute = async () => {
    Alert.alert(
      "Encerrar Rota",
      "Deseja finalizar a carona?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sim, Finalizar", 
          onPress: async () => {
            try {
              await axios.patch(`${SUPABASE_URL}/rest/v1/carona?id_carona=eq.${caronaId}`, 
                { dsstatuscarona: "Finalizada" },
                { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } }
              );
              router.replace({
                pathname: '/Avaliacao',
                params: { 
                  id_carona: caronaId, 
                  id_passageiro: passengerInfo?.id_user, 
                  id_motorista: userId 
                }
              });
            } catch (e) {
              console.error(e);
              Alert.alert("Erro", "Não foi possível finalizar no banco.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{marginTop: 10, color: '#000'}}>Iniciando navegação...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topOverlay}>
        <NavBar />
        <View style={styles.instructionBar}>
           <Text style={styles.arrowIcon}>⬆</Text>
           <Text style={styles.instructionText}>Siga em direção ao passageiro</Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation?.latitude || -23.55052, 
          longitude: driverLocation?.longitude || -46.633308,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true} 
        followsUserLocation={true} 
      >
        {passengerLocation && (
            <Marker coordinate={passengerLocation} title="Passageiro">
            <View >
                <Text style={{fontSize: 30}}>🧍</Text>
            </View>
            </Marker>
        )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#00BFFF"
            strokeWidth={5}
          />
        )}
      </MapView>

      <View style={styles.footer}>
            <View style={styles.avatarContainer}>
            {passengerInfo?.dsfotoperfil ? (
                <Image source={{ uri: passengerInfo.dsfotoperfil }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, { backgroundColor: '#999', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{fontSize: 30}}>👤</Text>
                </View>
            )}
            </View>

            <View style={styles.footerContent}>
                <View style={styles.infoRow}>
                    <View style={styles.textInfoContainer}>
                        <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
                           Passageiro: {passengerInfo?.dsnome || "..."}
                        </Text>
                        <Text style={styles.subLabel}>Distância: {distance}</Text>
                    </View>
                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.endButton} onPress={handleEndRoute}>
                            <Text style={styles.endButtonText}>Encerrar</Text>
                        </TouchableOpacity>
                        <Text style={styles.timeText}>Tempo: {duration}</Text>
                    </View>
                </View>
            </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF', 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF'
  },
  map: {
    width: width,
    height: height,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  instructionBar: {
    backgroundColor: '#333', 
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIcon: {
    color: '#FFF',
    fontSize: 24,
    marginRight: 15,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 40, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 15,
  },
  avatarContainer: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    zIndex: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFD700',
    backgroundColor: '#FFF',
  },
  footerContent: {
    flexDirection: 'column',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%', 
  },
  textInfoContainer: {
    flex: 1, 
    marginRight: 10, 
  },
  actionContainer: {
    alignItems: 'flex-end',
    flexShrink: 0, 
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },
  endButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 5,
  },
  endButtonText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 14,
  },
  timeText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 16,
  }
});