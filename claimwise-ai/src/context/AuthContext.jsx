import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = sessionStorage.getItem("claimwise_auth");
      return stored ? JSON.parse(stored) : { role: null, team: null };
    } catch {
      return { role: null, team: null };
    }
  });

  const login = (role, team = null) => {
    const next = { role, team };
    setAuth(next);
    sessionStorage.setItem("claimwise_auth", JSON.stringify(next));
  };

  const logout = () => {
    const cleared = { role: null, team: null };
    setAuth(cleared);
    sessionStorage.removeItem("claimwise_auth");
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
