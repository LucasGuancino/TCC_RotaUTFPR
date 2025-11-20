import { UserProvider } from "./context/UserContext";
import { Slot } from "expo-router";

export default function App() {
  return (
    <UserProvider>
      <Slot /> 
    </UserProvider>
  );
}
