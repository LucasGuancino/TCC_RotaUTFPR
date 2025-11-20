import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  const mapRef = useRef(null);

  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [endLat, setEndLat] = useState('-26.085000');
  const [endLng, setEndLng] = useState('-53.045000');

  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  const [watching, setWatching] = useState(false);
  const [locationWatcher, setLocationWatcher] = useState(null);

  const parseNumber = (s) => {
    const v = Number(s.replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  };

  const fitMapToRoute = (coords) => {
    if (mapRef.current && coords.length) {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
          animated: true,
        });
      } catch (e) {}
    }
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Habilite o GPS para usar esta função.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: 6 });
    setStartLat(String(loc.coords.latitude));
    setStartLng(String(loc.coords.longitude));
  };

  const fetchRouteOSRM = async (sLat, sLng, eLat, eLng) => {
    try {
      const coordsPart = `${sLng},${sLat};${eLng},${eLat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsPart}?overview=full&geometries=geojson`;    

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (!json.routes || !json.routes.length) {
        Alert.alert('Rota não encontrada', 'OSRM não retornou rotas.');
        return null;
      }

      const route = json.routes[0];
      const geometry = route.geometry;

      const coords = geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));

      return {
        coords,
        distance: route.distance, // metros
        duration: route.duration, // segundos
      };
    } catch (err) {
      Alert.alert('Erro', `Falha ao buscar rota: ${err.message}`);
      return null;
    }
  };

  const calculateRoute = async () => {
    Keyboard.dismiss();
    const sLat = parseNumber(startLat);
    const sLng = parseNumber(startLng);
    const eLat = parseNumber(endLat);
    const eLng = parseNumber(endLng);

    if ([sLat, sLng, eLat, eLng].some((v) => Number.isNaN(v))) {
      Alert.alert('Entrada inválida', 'Verifique as coordenadas.');
      return;
    }

    setLoading(true);

    const result = await fetchRouteOSRM(sLat, sLng, eLat, eLng);
    setLoading(false);

    if (!result) return;

    setRouteCoords(result.coords);
    setDistance(result.distance);
    setDuration(result.duration);

    setTimeout(() => fitMapToRoute(result.coords), 300);
  };

  const startNavigation = async () => {
    if (watching) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Habilite o GPS para navegar.');
      return;
    }

    setWatching(true);

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      async (loc) => {
        const sLat = loc.coords.latitude;
        const sLng = loc.coords.longitude;
        const eLat = parseNumber(endLat);
        const eLng = parseNumber(endLng);

        setStartLat(String(sLat));
        setStartLng(String(sLng));

        const result = await fetchRouteOSRM(sLat, sLng, eLat, eLng);
        if (!result) return;

        setRouteCoords(result.coords);
        setDistance(result.distance);
        setDuration(result.duration);
      }
    );

    setLocationWatcher(sub);
  };

  const stopNavigation = () => {
    if (locationWatcher) {
      locationWatcher.remove();
    }
    setWatching(false);
  };

  const initialRegion = {
    latitude: parseNumber(startLat) || -26.0815,
    longitude: parseNumber(startLng) || -53.0511,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} />}

        {startLat && startLng && (
          <Marker coordinate={{ latitude: parseNumber(startLat), longitude: parseNumber(startLng) }} title="Início" />
        )}

        <Marker coordinate={{ latitude: parseNumber(endLat), longitude: parseNumber(endLng) }} title="Destino" />
      </MapView>

      <View style={styles.panel}>
        <TouchableOpacity style={styles.gpsBtn} onPress={useMyLocation}>
          <Text style={styles.gpsText}>Usar minha posição atual</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TextInput style={styles.input} value={endLat} onChangeText={setEndLat} keyboardType="numeric" placeholder="dest lat" />
          <TextInput style={styles.input} value={endLng} onChangeText={setEndLng} keyboardType="numeric" placeholder="dest lng" />
        </View>

        <TouchableOpacity style={styles.button} onPress={calculateRoute} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Calcular Rota</Text>}
        </TouchableOpacity>

        {distance != null && (
          <View style={{ marginTop: 8 }}>
            <Text>Distância: {(distance / 1000).toFixed(2)} km</Text>
            <Text>Duração: {(duration / 60).toFixed(0)} min</Text>
          </View>
        )}

        {!watching ? (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#008000' }]} onPress={startNavigation}>
            <Text style={styles.buttonText}>Começar rota</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, { backgroundColor: '#a00' }]} onPress={stopNavigation}>
            <Text style={styles.buttonText}>Parar rota</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderRadius: 10,
  },
  row: { flexDirection: 'row', marginTop: 6 },
  input: { flex: 1, marginHorizontal: 4, padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  button: {
    marginTop: 10,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#1976D2',
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '700' },
  gpsBtn: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  gpsText: { color: 'white', textAlign: 'center' },
});
