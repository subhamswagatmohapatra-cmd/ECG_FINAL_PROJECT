import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { api } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  quickDemoLogin: (email: string, password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('cardiopulse_token'),
    patientId: localStorage.getItem('cardiopulse_patient_id') ? Number(localStorage.getItem('cardiopulse_patient_id')) : undefined,
    doctorId: localStorage.getItem('cardiopulse_doctor_id') ? Number(localStorage.getItem('cardiopulse_doctor_id')) : undefined,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = async () => {
    const token = localStorage.getItem('cardiopulse_token');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false, user: null }));
      return;
    }

    try {
      const user = await api.getMe();
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (e) {
      localStorage.removeItem('cardiopulse_token');
      localStorage.removeItem('cardiopulse_patient_id');
      localStorage.removeItem('cardiopulse_doctor_id');
      setState(prev => ({
        ...prev,
        token: null,
        user: null,
        patientId: undefined,
        doctorId: undefined,
        isAuthenticated: false,
        isLoading: false,
      }));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('cardiopulse_token', res.access_token);
    if (res.patient_id) localStorage.setItem('cardiopulse_patient_id', String(res.patient_id));
    if (res.doctor_id) localStorage.setItem('cardiopulse_doctor_id', String(res.doctor_id));

    setState({
      user: {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        role: res.role,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      token: res.access_token,
      patientId: res.patient_id,
      doctorId: res.doctor_id,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    localStorage.setItem('cardiopulse_token', res.access_token);
    if (res.patient_id) localStorage.setItem('cardiopulse_patient_id', String(res.patient_id));
    if (res.doctor_id) localStorage.setItem('cardiopulse_doctor_id', String(res.doctor_id));

    setState({
      user: {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        role: res.role,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      token: res.access_token,
      patientId: res.patient_id,
      doctorId: res.doctor_id,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('cardiopulse_token');
    localStorage.removeItem('cardiopulse_patient_id');
    localStorage.removeItem('cardiopulse_doctor_id');
    setState({
      user: null,
      token: null,
      patientId: undefined,
      doctorId: undefined,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const quickDemoLogin = async (email: string, password?: string) => {
    const pwd = password || (email.startsWith('doc') ? 'DoctorPass123!' : (email.startsWith('admin') ? 'AdminPass123!' : 'PatientPass123!'));
    await login(email, pwd);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, quickDemoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
