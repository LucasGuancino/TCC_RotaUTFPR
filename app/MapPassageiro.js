import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';

import NavBar from "../components/navbar"; 

const SUPABASE_URL = "SUPABASE_URL";
const SUPABASE_KEY = "SUPABASE_KEY";
const { width, height } = Dimensions.get('window');

export default function MapPassageiroScreen() {
  const { caronaId } = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef(null);
  const [driverLocation, setDriverLocation] = useState(null); 
  const [passengerLocation, setPassengerLocation] = useState(null); 
  const [routeCoords, setRouteCoords] = useState([]);
  const [driverInfo, setDriverInfo] = useState(null); 
  const [vehicleInfo, setVehicleInfo] = useState(null); 
  const [distance, setDistance] = useState("0 km");
  const [duration, setDuration] = useState("0 min");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        if (!caronaId) return;

        let currentDestLoc = null;

        const resPassageiro = await axios.get(`${SUPABASE_URL}/rest/v1/carona_passageiros`, {
          params: { id_carona: `eq.${caronaId}`, select: '*' },
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resPassageiro.data.length > 0) {
          const dadosPas = resPassageiro.data[0];
          currentDestLoc = {
            latitude: dadosPas.lat_origem_passageiro,
            longitude: dadosPas.lng_origem_passageiro
          };
          setPassengerLocation(currentDestLoc);
        }

        const resCarona = await axios.get(`${SUPABASE_URL}/rest/v1/carona`, {
            params: { id_carona: `eq.${caronaId}`, select: '*' },
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (resCarona.data.length > 0) {
            const dadosCarona = resCarona.data[0];
            const resMotorista = await axios.get(`${SUPABASE_URL}/rest/v1/usuario`, {
                params: { id_user: `eq.${dadosCarona.id_motorista}`, select: 'dsnome,dsfotoperfil' },
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            setDriverInfo(resMotorista.data[0]);

            const resVeiculo = await axios.get(`${SUPABASE_URL}/rest/v1/veiculo`, {
                params: { id_veiculo: `eq.${dadosCarona.id_veiculo}`, select: 'dsnome,dsplaca' },
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            setVehicleInfo(resVeiculo.data[0]);
        }
        await fetchDriverLocationFromDB(currentDestLoc);

      } catch (error) {
        console.error("Erro ao iniciar mapa passageiro:", error);
        Alert.alert("Erro", "Falha ao carregar dados da viagem.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [caronaId]);

  useEffect(() => {
    const interval = setInterval(() => {
        console.log("Atualizando posição do motorista (Polling 40s)...");
        fetchDriverLocationFromDB(passengerLocation);
    }, 40000); // 40 segundos

    return () => clearInterval(interval);
  }, [caronaId, passengerLocation]); 
  const fetchDriverLocationFromDB = async (destinationOverride = null) => {
      try {
          const response = await axios.get(`${SUPABASE_URL}/rest/v1/localizacao_motorista`, {
              params: { 
                  id_carona: `eq.${caronaId}`, 
                  select: 'lat_motorista,lng_motorista',
                  order: 'dt_atualizacao.desc',
                  limit: 1
              },
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });

          if (response.data && response.data.length > 0) {
              const loc = response.data[0];
              const newDriverLoc = {
                  latitude: loc.lat_motorista,
                  longitude: loc.lng_motorista
              };
              
              setDriverLocation(newDriverLoc);
              const targetDest = destinationOverride || passengerLocation;

              if (targetDest) {
                  fetchRouteOSRM(newDriverLoc, targetDest);
              }
          }
      } catch (error) {
          console.log("Erro ao buscar localização do motorista:", error);
      }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{marginTop: 10, color: '#000'}}>Localizando sua carona...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topOverlay}>
        <NavBar />
        <View style={styles.instructionBar}>
           <Text style={styles.arrowIcon}>🚗</Text>
           <Text style={styles.instructionText}>Motorista a caminho</Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: passengerLocation?.latitude || -23.55052, 
          longitude: passengerLocation?.longitude || -46.633308,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {passengerLocation && (
            <Marker coordinate={passengerLocation} title="Seu Local">
            <View >
                <Text style={{fontSize: 30}}>🧍</Text>
            </View>
            </Marker>
        )}

        {driverLocation && (
             <Marker coordinate={driverLocation} title="Motorista">
                <View style={styles.driverMarkerContainer}>
                    <Text style={{fontSize: 30}}>🚘</Text>
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
            {driverInfo?.dsfotoperfil ? (
                <Image source={{ uri: driverInfo.dsfotoperfil }} style={styles.avatar} />
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
                           Motorista: {driverInfo?.dsnome || "Carregando..."}
                        </Text>
                        <Text style={styles.subLabel}>
                            Carro: {vehicleInfo ? `${vehicleInfo.dsnome} - ${vehicleInfo.dsplaca}` : "..."}
                        </Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <Text style={styles.distText}>Distância: {distance}</Text>
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
    fontSize: 24,
    marginRight: 15,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
    fontWeight: 'bold',
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
  statsContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 5,
  },
  distText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 16,
  },
  driverMarkerContainer: {
  }
});