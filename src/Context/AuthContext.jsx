import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('amardokan_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('amardokan_admin_auth') === 'true';
  });

  const [adminRole, setAdminRole] = useState('ADMIN');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loginUser = (user) => {
    try {
      localStorage.setItem('amardokan_user_session', JSON.stringify(user));
    } catch {}
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const logoutUser = () => {
    localStorage.removeItem('amardokan_user_session');
    setCurrentUser(null);
  };

  const loginAdmin = (role = 'ADMIN') => {
    sessionStorage.setItem('amardokan_admin_auth', 'true');
    setIsAdminAuthenticated(true);
    setAdminRole(role);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('amardokan_admin_auth');
    setIsAdminAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loginUser,
        logoutUser,
        isAdminAuthenticated,
        setIsAdminAuthenticated,
        adminRole,
        setAdminRole,
        loginAdmin,
        logoutAdmin,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
