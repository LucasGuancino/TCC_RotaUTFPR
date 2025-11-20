import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter } from "expo-router";

const { width } = Dimensions.get('window');

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 45 : StatusBar.currentHeight || 0;

const NavBar = () => {
  const router = useRouter();
  
  const handleIconPress = (screenName) => {
    console.log(`Navegar para ${screenName}`);
  };

  return (
    <View style={styles.navbar}>
      <TouchableOpacity 
        style={styles.logoContainer}
        onPress={() => router.push("/MenuScreen")}
      >
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
        />
      </TouchableOpacity>

      <View style={styles.iconsContainer}>
        <TouchableOpacity onPress={() => router.push("/MinhasCaronas")}>
          <Image
            source={require('../assets/nav1.png')}
            style={styles.icon}
          />
        </TouchableOpacity>
      
        <TouchableOpacity onPress={() => handleIconPress('Tela2')}>
          <Image
            source={require('../assets/nav2.png')}
            style={styles.icon}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/Profile")}>
          <Image
            source={require('../assets/nav3.png')}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    backgroundColor: '#FECC00', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    
    paddingTop: STATUSBAR_HEIGHT + 10, 
    paddingBottom: 10, 
    paddingHorizontal: width * 0.05, 
    
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoContainer: {
    justifyContent: 'center',
  },
  logo: {
    width: 120, 
    height: 40,
    resizeMode: 'contain',
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  icon: {
    width: 28, 
    height: 28,
    resizeMode: 'contain',
    tintColor: '#000',
  },
});

export default NavBar;