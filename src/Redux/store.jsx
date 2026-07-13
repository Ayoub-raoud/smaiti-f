import { configureStore, createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import axios from "axios";
import languageReducer from './languageSlice';
import notificationReducer from './notificationSlice';
import permissionReducer from './permissionSlice';

// Configuration d'Axios avec baseURL
const api = axios.create({
  baseURL: "https://smaiti-b-production.up.railway.app//api",
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

// Add token to requests automatically for authenticated routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses only (not 403 - forbidden)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 Unauthorized (token expired/invalid)
    // Don't handle 403 Forbidden (inactive user) - let the component handle it
    if (error.response?.status === 401) {
      // Only clear auth data if we're on an admin route
      if (window.location.pathname.includes('/admin')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

// Cache configuration
const CACHE_CONFIG = {
  accidents: { ttl: 5 * 60 * 1000 },
  cars: { ttl: 5 * 60 * 1000 },
  clients: { ttl: 10 * 60 * 1000 },
  matricules: { ttl: 5 * 60 * 1000 },
  reservations: { ttl: 2 * 60 * 1000 },
  contacts: { ttl: 10 * 60 * 1000 },
  utilisateurs: { ttl: 10 * 60 * 1000 }
};

// Cache manager
const cacheManager = {
  set: (key, data) => {
    try {
      localStorage.setItem(`${key}_cache`, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      }));
    } catch (error) {
      console.warn(`Could not save ${key} to cache:`, error);
    }
  },

  get: (key) => {
    try {
      const cached = localStorage.getItem(`${key}_cache`);
      if (cached) {
        const { data, timestamp, version } = JSON.parse(cached);
        const ttl = CACHE_CONFIG[key]?.ttl || 5 * 60 * 1000;
        
        if (Date.now() - timestamp < ttl) {
          return data;
        } else {
          localStorage.removeItem(`${key}_cache`);
        }
      }
    } catch (error) {
      console.warn(`Error loading cached ${key}:`, error);
      localStorage.removeItem(`${key}_cache`);
    }
    return null;
  },

  invalidate: (key) => {
    try {
      localStorage.removeItem(`${key}_cache`);
    } catch (error) {
      console.warn(`Error invalidating cache for ${key}:`, error);
    }
  },

  invalidateAll: () => {
    Object.keys(CACHE_CONFIG).forEach(key => {
      localStorage.removeItem(`${key}_cache`);
    });
  }
};

// Helper pour gérer les erreurs API
const handleApiError = (error, thunkAPI) => {
  console.error('API Error:', error);
  
  let message = 'An unexpected error occurred';
  
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    message = Object.values(errors).flat().join(', ');
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }
  
  return thunkAPI.rejectWithValue(message);
};

// ==============================================
// 🚗 Async Actions for Car Rental System
// ==============================================

// Accidents
export const fetchAccidents = createAsyncThunk(
  "accidents/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('accidents');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/accidents");
      const accidentsData = response.data;
      
      cacheManager.set('accidents', accidentsData);
      
      return accidentsData;
    } catch (error) {
      const cachedData = cacheManager.get('accidents');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createAccident = createAsyncThunk(
  "accidents/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/accidents", data);
      cacheManager.invalidate('accidents');
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateAccident = createAsyncThunk(
  "accidents/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/accidents/${id}`, data);
      cacheManager.invalidate('accidents');
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteAccident = createAsyncThunk(
  "accidents/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/accidents/${id}`);
      cacheManager.invalidate('accidents');
      cacheManager.invalidate('matricules');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const getAccidentNextStatuses = createAsyncThunk(
  "accidents/getNextStatuses",
  async (accidentId, thunkAPI) => {
    try {
      const response = await api.get(`/accidents/${accidentId}/next-statuses`);
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);
export const fetchGarages = createAsyncThunk(
  "garages/fetchAll",
  async (forceRefresh = false, thunkAPI) => {
    try {
      const response = await api.get("/garages");
      return response.data.garages || response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);
// Cars
export const fetchCars = createAsyncThunk(
  "cars/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('cars');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/cars");
      const carsData = response.data;
      cacheManager.set('cars', carsData);
      return carsData;
    } catch (error) {
      const cachedData = cacheManager.get('cars');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createCar = createAsyncThunk(
  "cars/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/cars", data);
      cacheManager.invalidate('cars');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateCar = createAsyncThunk(
  "cars/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/cars/${id}`, data);
      cacheManager.invalidate('cars');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteCar = createAsyncThunk(
  "cars/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/cars/${id}`);
      cacheManager.invalidate('cars');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const assignMatriculeToCar = createAsyncThunk(
  "cars/assignMatricule", 
  async ({ carId, matriculeId }, thunkAPI) => {
    try {
      const response = await api.post(`/cars/${carId}/assign-matricule`, {
        matricule_id: matriculeId
      });
      cacheManager.invalidate('cars');
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const getCarCurrentMatricule = createAsyncThunk(
  "cars/getCurrentMatricule", 
  async (carId, thunkAPI) => {
    try {
      const response = await api.get(`/cars/${carId}/current-matricule`);
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// Clients
export const fetchClients = createAsyncThunk(
  "clients/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('clients');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/clients");
      const clientsData = response.data;
      cacheManager.set('clients', clientsData);
      return clientsData;
    } catch (error) {
      const cachedData = cacheManager.get('clients');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createClient = createAsyncThunk(
  "clients/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/clients", data);
      cacheManager.invalidate('clients');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateClient = createAsyncThunk(
  "clients/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/clients/${id}`, data);
      cacheManager.invalidate('clients');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteClient = createAsyncThunk(
  "clients/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/clients/${id}`);
      cacheManager.invalidate('clients');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// Matricules
export const fetchMatricules = createAsyncThunk(
  "matricules/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('matricules');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/matricules");
      const matriculesData = response.data;
      cacheManager.set('matricules', matriculesData);
      return matriculesData;
    } catch (error) {
      const cachedData = cacheManager.get('matricules');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const refreshMatricules = createAsyncThunk(
  "matricules/refresh",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/matricules");
      const matriculesData = response.data;
      cacheManager.set('matricules', matriculesData);
      return matriculesData;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createMatricule = createAsyncThunk(
  "matricules/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/matricules", data);
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateMatricule = createAsyncThunk(
  "matricules/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/matricules/${id}`, data);
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateMatriculeStatus = createAsyncThunk(
  "matricules/updateStatus",
  async ({ id, status }, thunkAPI) => {
    try {
      const response = await api.put(`/matricules/${id}`, { status });
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteMatricule = createAsyncThunk(
  "matricules/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/matricules/${id}`);
      cacheManager.invalidate('matricules');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const getMatriculesByCar = createAsyncThunk(
  "matricules/getByCar", 
  async (carId, thunkAPI) => {
    try {
      const response = await api.get(`/matricules/car/${carId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateMatriculeKilometrage = createAsyncThunk(
  "matricules/updateKilometrage", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/matricules/${id}/kilometrage`, data);
      cacheManager.invalidate('matricules');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// Reservations
export const fetchReservations = createAsyncThunk(
  "reservations/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('reservations');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/reservations");
      const reservationsData = response.data;
      cacheManager.set('reservations', reservationsData);
      return reservationsData;
    } catch (error) {
      const cachedData = cacheManager.get('reservations');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

// Replace the existing checkLateReservations thunk with this version
export const checkLateReservations = createAsyncThunk(
  "reservations/checkLate",
  async (silent = false, thunkAPI) => {
    try {
      const response = await api.get("/reservations/check-late");
      return { data: response.data, silent };
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const addPaymentToReservation = createAsyncThunk(
  "reservations/addPayment",
  async ({ reservationId, paymentData }, thunkAPI) => {
    try {
      const response = await api.post(`/reservations/${reservationId}/add-payment`, paymentData);
      cacheManager.invalidate('reservations');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const removePaymentFromReservation = createAsyncThunk(
  "reservations/removePayment",
  async ({ reservationId, paymentId }, thunkAPI) => {
    try {
      const response = await api.post(`/reservations/${reservationId}/remove-payment`, {
        payment_id: paymentId
      });
      cacheManager.invalidate('reservations');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createReservation = createAsyncThunk(
  "reservations/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/reservations", data);
      cacheManager.invalidate('reservations');
      cacheManager.invalidate('cars');
      cacheManager.invalidate('clients');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateReservation = createAsyncThunk(
  "reservations/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/reservations/${id}`, data);
      
      if (data.matricule_id) {
        cacheManager.invalidate('matricules');
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      }
      
      cacheManager.invalidate('reservations');
      cacheManager.invalidate('cars');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const generateReservationContract = createAsyncThunk(
  "reservations/generateContract",
  async (reservationId, thunkAPI) => {
    try {
      const response = await api.get(`/reservations/${reservationId}/contract`);
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const searchClients = createAsyncThunk(
  "clients/search",
  async (query, thunkAPI) => {
    try {
      const response = await api.get(`/clients/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteReservation = createAsyncThunk(
  "reservations/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/reservations/${id}`);
      cacheManager.invalidate('reservations');
      cacheManager.invalidate('cars');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// Contacts
export const fetchContacts = createAsyncThunk(
  "contacts/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('contacts');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/contacts");
      const contactsData = response.data;
      cacheManager.set('contacts', contactsData);
      return contactsData;
    } catch (error) {
      const cachedData = cacheManager.get('contacts');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createContact = createAsyncThunk(
  "contacts/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/contacts", data);
      cacheManager.invalidate('contacts');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateContact = createAsyncThunk(
  "contacts/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/contacts/${id}`, data);
      cacheManager.invalidate('contacts');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteContact = createAsyncThunk(
  "contacts/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/contacts/${id}`);
      cacheManager.invalidate('contacts');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const fetchContactsCount = createAsyncThunk(
  "contacts/fetchCount", 
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/contacts/count");
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const fetchRecentContacts = createAsyncThunk(
  "contacts/fetchRecent", 
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/contacts/recent");
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// ==============================================
// 🔐 Authentication Async Actions
// ==============================================

export const loginUtilisateur = createAsyncThunk(
  "auth/login",
  async (credentials, thunkAPI) => {
    try {
      const response = await api.post("/admin/login", credentials);
      const { access_token, utilisateur } = response.data;

      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(utilisateur));

      return { token: access_token, user: utilisateur };
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const logoutUtilisateur = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      try {
        await api.post("/admin/logout");
      } catch (error) {
        console.warn('Logout API error:', error);
      }
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      cacheManager.invalidateAll();
      thunkAPI.dispatch(clearAuth());
      return null;
    }
  }
);

export const getCurrentUtilisateur = createAsyncThunk(
  "auth/me",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/admin/profile");
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// Utilisateurs
export const fetchUtilisateurs = createAsyncThunk(
  "utilisateurs/fetchAll", 
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('utilisateurs');
        if (cachedData) {
          return cachedData;
        }
      }

      const response = await api.get("/utilisateurs");
      const utilisateursData = response.data;
      cacheManager.set('utilisateurs', utilisateursData);
      return utilisateursData;
    } catch (error) {
      const cachedData = cacheManager.get('utilisateurs');
      if (cachedData) {
        return cachedData;
      }
      return handleApiError(error, thunkAPI);
    }
  }
);

export const createUtilisateur = createAsyncThunk(
  "utilisateurs/create", 
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/utilisateurs", data);
      cacheManager.invalidate('utilisateurs');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateUtilisateur = createAsyncThunk(
  "utilisateurs/update", 
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/utilisateurs/${id}`, data);
      cacheManager.invalidate('utilisateurs');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const deleteUtilisateur = createAsyncThunk(
  "utilisateurs/delete", 
  async (id, thunkAPI) => {
    try {
      await api.delete(`/utilisateurs/${id}`);
      cacheManager.invalidate('utilisateurs');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const toggleUtilisateurStatus = createAsyncThunk(
  "utilisateurs/toggleStatus",
  async (utilisateurId, thunkAPI) => {
    try {
      const response = await api.post(`/utilisateurs/${utilisateurId}/toggle-status`);
      cacheManager.invalidate('utilisateurs');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

export const updateUtilisateurStatus = createAsyncThunk(
  "utilisateurs/updateStatus",
  async ({ utilisateurId, status }, thunkAPI) => {
    try {
      const response = await api.put(`/utilisateurs/${utilisateurId}/status`, { status });
      cacheManager.invalidate('utilisateurs');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);
export const updateProfile = createAsyncThunk(
    "auth/updateProfile",
    async (data, thunkAPI) => {
        try {
            const response = await api.put("/admin/profile", data);
            const user = response.data.user;
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        } catch (error) {
            return handleApiError(error, thunkAPI);
        }
    }
);
// ==================== Financings Slice ====================
export const fetchFinancings = createAsyncThunk(
  "financings/fetchAll",
  async (forceRefresh = false, thunkAPI) => {
    try {
      if (!forceRefresh) {
        const cachedData = cacheManager.get('financings');
        if (cachedData) return cachedData;
      }
      const response = await api.get("/payments");
      const data = response.data;
      cacheManager.set('financings', data);
      return data;
    } catch (error) {
      const cachedData = cacheManager.get('financings');
      if (cachedData) return cachedData;
      return handleApiError(error, thunkAPI);
    }
  }
);

const financingsSlice = createSlice({
  name: "financings",
  initialState: {
    list: cacheManager.get('financings')?.financings || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('financings')?.timestamp || null
  },
  reducers: {
    clearFinancingError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinancings.fulfilled, (state, action) => {
        state.loading = false;
        // The API returns { financings: [...], stats: {...} }
        state.list = action.payload.financings || action.payload || [];
        state.lastUpdated = Date.now();
      })
      .addCase(fetchFinancings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearFinancingError } = financingsSlice.actions;
export const selectFinancings = (state) => state.financings.list;
export const selectFinancingsLoading = (state) => state.financings.loading;
// In store.js

// === CREATE GARAGE ===
export const createGarage = createAsyncThunk(
  "garages/create",
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/garages", data);
      cacheManager.invalidate('garages');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// === UPDATE GARAGE ===
export const updateGarage = createAsyncThunk(
  "garages/update",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await api.put(`/garages/${id}`, data);
      cacheManager.invalidate('garages');
      return response.data;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);

// === DELETE GARAGE ===
export const deleteGarage = createAsyncThunk(
  "garages/delete",
  async (id, thunkAPI) => {
    try {
      await api.delete(`/garages/${id}`);
      cacheManager.invalidate('garages');
      return id;
    } catch (error) {
      return handleApiError(error, thunkAPI);
    }
  }
);
// ==============================================
// 🏪 Enhanced Slices with Cache-First Initialization
// ==============================================

// Authentication Slice
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('authToken') || null,
    isAuthenticated: !!localStorage.getItem('authToken'),
    loading: false,
    error: null
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUtilisateur.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUtilisateur.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUtilisateur.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Logout
      .addCase(logoutUtilisateur.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      // Get Current User
      .addCase(getCurrentUtilisateur.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUtilisateur.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
    state.user = action.payload;
    state.isAuthenticated = true;
});
  }
});

// Utilisateurs Slice
const utilisateursSlice = createSlice({
  name: "utilisateurs",
  initialState: {
    list: cacheManager.get('utilisateurs')?.utilisateurs || cacheManager.get('utilisateurs')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('utilisateurs')?.timestamp || null
  },
  reducers: {
    clearUtilisateurError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUtilisateurs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUtilisateurs.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.utilisateurs || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchUtilisateurs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createUtilisateur.fulfilled, (state, action) => {
        state.list.push(action.payload.utilisateur || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(updateUtilisateur.fulfilled, (state, action) => {
        const updatedUtilisateur = action.payload.utilisateur || action.payload.data || action.payload;
        const index = state.list.findIndex(u => u.id === updatedUtilisateur.id);
        if (index !== -1) state.list[index] = updatedUtilisateur;
        state.lastUpdated = Date.now();
      })
      .addCase(deleteUtilisateur.fulfilled, (state, action) => {
        state.list = state.list.filter(u => u.id !== action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(toggleUtilisateurStatus.fulfilled, (state, action) => {
        const updatedUtilisateur = action.payload.utilisateur || action.payload.data || action.payload;
        const index = state.list.findIndex(u => u.id === updatedUtilisateur.id);
        if (index !== -1) state.list[index] = updatedUtilisateur;
        state.lastUpdated = Date.now();
      })
      .addCase(updateUtilisateurStatus.fulfilled, (state, action) => {
        const updatedUtilisateur = action.payload.utilisateur || action.payload.data || action.payload;
        const index = state.list.findIndex(u => u.id === updatedUtilisateur.id);
        if (index !== -1) state.list[index] = updatedUtilisateur;
        state.lastUpdated = Date.now();
      });
  }
});

// Accidents Slice
const accidentsSlice = createSlice({
  name: "accidents",
  initialState: {
    list: cacheManager.get('accidents')?.accidents || cacheManager.get('accidents')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('accidents')?.timestamp || null
  },
  reducers: {
    clearAccidentError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccidents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccidents.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.accidents || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchAccidents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAccident.fulfilled, (state, action) => {
        state.list.push(action.payload.accident || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
        
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      })
      .addCase(updateAccident.fulfilled, (state, action) => {
        const updatedAccident = action.payload.accident || action.payload.data || action.payload;
        const index = state.list.findIndex(a => a.id === updatedAccident.id);
        if (index !== -1) state.list[index] = updatedAccident;
        state.lastUpdated = Date.now();
        
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      })
      .addCase(deleteAccident.fulfilled, (state, action) => {
        state.list = state.list.filter(a => a.id !== action.payload);
        state.lastUpdated = Date.now();
        
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      });
  }
});

// Cars Slice
const carsSlice = createSlice({
  name: "cars",
  initialState: {
    list: cacheManager.get('cars')?.cars || cacheManager.get('cars')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('cars')?.timestamp || null,
    currentMatricule: null
  },
  reducers: {
    clearCarError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCars.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCars.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.cars || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCars.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCar.fulfilled, (state, action) => {
        state.list.push(action.payload.car || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(updateCar.fulfilled, (state, action) => {
        const updatedCar = action.payload.car || action.payload.data || action.payload;
        const index = state.list.findIndex(c => c.id === updatedCar.id);
        if (index !== -1) state.list[index] = updatedCar;
        state.lastUpdated = Date.now();
      })
      .addCase(deleteCar.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(getCarCurrentMatricule.fulfilled, (state, action) => {
        state.currentMatricule = action.payload.current_matricule || action.payload.data;
      });
  }
});

// Clients Slice
const clientsSlice = createSlice({
  name: "clients",
  initialState: {
    list: cacheManager.get('clients')?.clients || cacheManager.get('clients')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('clients')?.timestamp || null
  },
  reducers: {
    clearClientError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.clients || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.list.push(action.payload.client || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        const updatedClient = action.payload.client || action.payload.data || action.payload;
        const index = state.list.findIndex(c => c.id === updatedClient.id);
        if (index !== -1) state.list[index] = updatedClient;
        state.lastUpdated = Date.now();
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
        state.lastUpdated = Date.now();
      });
  }
});

// Matricules Slice
const matriculesSlice = createSlice({
  name: "matricules",
  initialState: {
    list: cacheManager.get('matricules')?.matricules || cacheManager.get('matricules')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('matricules')?.timestamp || null,
    byCar: {}
  },
  reducers: {
    clearMatriculeError: (state) => {
      state.error = null;
    },
    updateMatriculesImmediate: (state, action) => {
      state.list = action.payload;
      state.lastUpdated = Date.now();
    },
    updateMatriculeImmediate: (state, action) => {
      const updatedMatricule = action.payload;
      const index = state.list.findIndex(m => m.id === updatedMatricule.id);
      if (index !== -1) {
        state.list[index] = updatedMatricule;
      }
      state.lastUpdated = Date.now();
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatricules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMatricules.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.matricules || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchMatricules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refreshMatricules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshMatricules.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.matricules || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(refreshMatricules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createMatricule.fulfilled, (state, action) => {
        state.list.push(action.payload.matricule || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(updateMatricule.fulfilled, (state, action) => {
        const updatedMatricule = action.payload.matricule || action.payload.data || action.payload;
        const index = state.list.findIndex(m => m.id === updatedMatricule.id);
        if (index !== -1) state.list[index] = updatedMatricule;
        state.lastUpdated = Date.now();
      })
      .addCase(updateMatriculeStatus.fulfilled, (state, action) => {
        const updatedMatricule = action.payload.matricule || action.payload.data || action.payload;
        const index = state.list.findIndex(m => m.id === updatedMatricule.id);
        if (index !== -1) state.list[index] = updatedMatricule;
        state.lastUpdated = Date.now();
      })
      .addCase(deleteMatricule.fulfilled, (state, action) => {
        state.list = state.list.filter(m => m.id !== action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(getMatriculesByCar.fulfilled, (state, action) => {
        const carId = action.meta.arg;
        state.byCar[carId] = action.payload.matricules || action.payload.data || action.payload;
      })
      .addCase(updateAccident.fulfilled, (state) => {
        cacheManager.invalidate('matricules');
      })
      .addCase(createAccident.fulfilled, (state) => {
        cacheManager.invalidate('matricules');
      })
      .addCase(deleteAccident.fulfilled, (state) => {
        cacheManager.invalidate('matricules');
      });
  }
});

// Reservations Slice
const reservationsSlice = createSlice({
  name: "reservations",
  initialState: {
    list: cacheManager.get('reservations')?.reservations || cacheManager.get('reservations')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('reservations')?.timestamp || null
  },
  reducers: {
    clearReservationError: (state) => {
      state.error = null;
    },
    addPaymentImmediate: (state, action) => {
      const { reservationId, payment } = action.payload;
      const reservation = state.list.find(r => r.id === reservationId);
      if (reservation) {
        if (!reservation.payment_history) {
          reservation.payment_history = [];
        }
        reservation.payment_history.push(payment);
        reservation.amount_paid = (reservation.amount_paid || 0) + payment.amount;
        reservation.remaining_amount = (reservation.total_price || 0) - reservation.amount_paid;
      }
    },
    removePaymentImmediate: (state, action) => {
      const { reservationId, paymentId } = action.payload;
      const reservation = state.list.find(r => r.id === reservationId);
      if (reservation && reservation.payment_history) {
        const payment = reservation.payment_history.find(p => p.id === paymentId);
        if (payment) {
          reservation.payment_history = reservation.payment_history.filter(p => p.id !== paymentId);
          reservation.amount_paid = (reservation.amount_paid || 0) - payment.amount;
          reservation.remaining_amount = (reservation.total_price || 0) - reservation.amount_paid;
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.reservations || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createReservation.fulfilled, (state, action) => {
        const newReservation = action.payload.reservation || action.payload.data || action.payload;
        state.list.push(newReservation);
        state.lastUpdated = Date.now();
        
        if (newReservation.status === 'confirmed' && newReservation.matricule_id) {
          setTimeout(() => {
            store.dispatch(refreshMatricules());
          }, 100);
        }
      })
      .addCase(updateReservation.fulfilled, (state, action) => {
        const updatedReservation = action.payload.reservation || action.payload.data || action.payload;
        const index = state.list.findIndex(r => r.id === updatedReservation.id);
        if (index !== -1) state.list[index] = updatedReservation;
        state.lastUpdated = Date.now();
        
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      })
      .addCase(deleteReservation.fulfilled, (state, action) => {
        state.list = state.list.filter(r => r.id !== action.payload);
        state.lastUpdated = Date.now();
        
        setTimeout(() => {
          store.dispatch(refreshMatricules());
        }, 100);
      })
      .addCase(addPaymentToReservation.fulfilled, (state, action) => {
        const updatedReservation = action.payload.reservation || action.payload.data || action.payload;
        const index = state.list.findIndex(r => r.id === updatedReservation.id);
        if (index !== -1) state.list[index] = updatedReservation;
        state.lastUpdated = Date.now();
      })
      .addCase(removePaymentFromReservation.fulfilled, (state, action) => {
        const updatedReservation = action.payload.reservation || action.payload.data || action.payload;
        const index = state.list.findIndex(r => r.id === updatedReservation.id);
        if (index !== -1) state.list[index] = updatedReservation;
        state.lastUpdated = Date.now();
      })
      // Find the checkLateReservations case in extraReducers and update it:
.addCase(checkLateReservations.fulfilled, (state, action) => {
  // Only update loading state if not silent
  if (!action.payload?.silent) {
    state.loading = false;
  }
  // Always update the data silently
  if (action.payload?.data) {
    // Update any late status flags on reservations
    // This doesn't trigger a full re-render
  }
  state.lastUpdated = Date.now();
});
  }
});

// Contacts Slice
const contactsSlice = createSlice({
  name: "contacts",
  initialState: {
    list: cacheManager.get('contacts')?.contacts || cacheManager.get('contacts')?.data || [],
    loading: false,
    error: null,
    lastUpdated: cacheManager.get('contacts')?.timestamp || null,
    count: 0,
    recent: []
  },
  reducers: {
    clearContactError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.contacts || action.payload.data || action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.list.unshift(action.payload.contact || action.payload.data || action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        const updatedContact = action.payload.contact || action.payload.data || action.payload;
        const index = state.list.findIndex(c => c.id === updatedContact.id);
        if (index !== -1) state.list[index] = updatedContact;
        state.lastUpdated = Date.now();
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(fetchContactsCount.fulfilled, (state, action) => {
        state.count = action.payload.count || action.payload.data;
      })
      .addCase(fetchRecentContacts.fulfilled, (state, action) => {
        state.recent = action.payload.recent_contacts || action.payload.data || action.payload;
      });
  }
});
// Garages slice
const garagesSlice = createSlice({
  name: "garages",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGarageError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGarages.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGarages.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.garages || action.payload || [];
      })
      .addCase(fetchGarages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createGarage.fulfilled, (state, action) => {
  state.list.push(action.payload.garage || action.payload.data || action.payload);
  state.lastUpdated = Date.now();
})
.addCase(updateGarage.fulfilled, (state, action) => {
  const updated = action.payload.garage || action.payload.data || action.payload;
  const idx = state.list.findIndex(g => g.id === updated.id);
  if (idx !== -1) state.list[idx] = updated;
  state.lastUpdated = Date.now();
})
.addCase(deleteGarage.fulfilled, (state, action) => {
  state.list = state.list.filter(g => g.id !== action.payload);
  state.lastUpdated = Date.now();
});
  }
});
export const selectGarages = (state) => state.garages.list;
export const selectGaragesLoading = (state) => state.garages.loading;
// ==============================================
// 🏪 Configuration du store Redux
// ==============================================

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    utilisateurs: utilisateursSlice.reducer,
    accidents: accidentsSlice.reducer,
    cars: carsSlice.reducer,
    clients: clientsSlice.reducer,
    matricules: matriculesSlice.reducer,
    reservations: reservationsSlice.reducer,
    contacts: contactsSlice.reducer,
    language: languageReducer,
    notifications: notificationReducer,
    permissions: permissionReducer,
    garages: garagesSlice.reducer,
    financings: financingsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

// ==============================================
// 🏗 Export des sélecteurs et utilitaires
// ==============================================
export { api };

// Authentication Selectors - MEMOIZED to prevent infinite loops
export const selectAuth = (state) => state.auth;
export const selectUser = createSelector(
  [selectAuth],
  (auth) => auth.user
);
export const selectToken = createSelector(
  [selectAuth],
  (auth) => auth.token
);
export const selectIsAuthenticated = createSelector(
  [selectAuth],
  (auth) => auth.isAuthenticated
);
export const selectAuthLoading = createSelector(
  [selectAuth],
  (auth) => auth.loading
);
export const selectAuthError = createSelector(
  [selectAuth],
  (auth) => auth.error
);

// Utilisateurs Selectors
export const selectUtilisateurs = createSelector(
  [(state) => state.utilisateurs.list],
  (list) => list.filter(user => !user.is_system)
);export const selectUtilisateursLoading = (state) => state.utilisateurs.loading;
export const selectUtilisateursError = (state) => state.utilisateurs.error;
export const selectUtilisateursLastUpdated = (state) => state.utilisateurs.lastUpdated;
export const selectActiveUtilisateurs = (state) => state.utilisateurs.list.filter(u => u.status === 'active');
export const selectInactiveUtilisateurs = (state) => state.utilisateurs.list.filter(u => u.status === 'inactive');

// Accidents Selectors
export const selectAccidents = (state) => state.accidents.list;
export const selectAccidentsLoading = (state) => state.accidents.loading;
export const selectAccidentsError = (state) => state.accidents.error;
export const selectAccidentsLastUpdated = (state) => state.accidents.lastUpdated;

// Cars Selectors
export const selectCars = (state) => state.cars.list;
export const selectCarsLoading = (state) => state.cars.loading;
export const selectCarsError = (state) => state.cars.error;
export const selectCarsLastUpdated = (state) => state.cars.lastUpdated;
export const selectCarCurrentMatricule = (state) => state.cars.currentMatricule;

// Clients Selectors
export const selectClients = (state) => state.clients.list;
export const selectClientsLoading = (state) => state.clients.loading;
export const selectClientsError = (state) => state.clients.error;
export const selectClientsLastUpdated = (state) => state.clients.lastUpdated;

// Matricules Selectors
export const selectMatricules = (state) => state.matricules.list;
export const selectMatriculesLoading = (state) => state.matricules.loading;
export const selectMatriculesError = (state) => state.matricules.error;
export const selectMatriculesLastUpdated = (state) => state.matricules.lastUpdated;
export const selectMatriculesByCar = (carId) => (state) => state.matricules.byCar[carId] || [];
export const selectReservedMatricules = (state) => {
  const matricules = state.matricules.list;
  const reservations = state.reservations.list;
  
  const activeReservationMatriculeIds = reservations
    .filter(reservation => 
      reservation.status === 'confirmed' || 
      reservation.status === 'retard' || 
      reservation.status === 'pending'
    )
    .map(reservation => reservation.matricule_id)
    .filter(Boolean);
  
  return matricules.filter(matricule => 
    activeReservationMatriculeIds.includes(matricule.id)
  );
};

export const selectLateMatricules = (state) => {
  const matricules = state.matricules.list;
  const reservations = state.reservations.list;
  
  const lateReservationMatriculeIds = reservations
    .filter(reservation => reservation.status === 'retard')
    .map(reservation => reservation.matricule_id)
    .filter(Boolean);
  
  return matricules.filter(matricule => 
    lateReservationMatriculeIds.includes(matricule.id)
  );
};

// Reservations Selectors
export const selectReservations = (state) => state.reservations.list;
export const selectReservationsLoading = (state) => state.reservations.loading;
export const selectReservationsError = (state) => state.reservations.error;
export const selectReservationsLastUpdated = (state) => state.reservations.lastUpdated;

// Contacts Selectors
export const selectContacts = (state) => state.contacts.list;
export const selectContactsLoading = (state) => state.contacts.loading;
export const selectContactsError = (state) => state.contacts.error;
export const selectContactsLastUpdated = (state) => state.contacts.lastUpdated;
export const selectContactsCount = (state) => state.contacts.count;
export const selectRecentContacts = (state) => state.contacts.recent;

// Export des actions
export const { clearAuthError, setCredentials, clearAuth } = authSlice.actions;
export const { clearUtilisateurError } = utilisateursSlice.actions;
export const { clearAccidentError } = accidentsSlice.actions;
export const { clearCarError } = carsSlice.actions;
export const { clearClientError } = clientsSlice.actions;
export const { clearMatriculeError, updateMatriculesImmediate, updateMatriculeImmediate } = matriculesSlice.actions;
export const { clearReservationError, addPaymentImmediate, removePaymentImmediate } = reservationsSlice.actions;
export const { clearContactError } = contactsSlice.actions;
export const selectContractData = (state) => state.reservations.contractData;
export const selectClientSearchResults = (state) => state.clients.searchResults;
export const { clearGarageError } = garagesSlice.actions;
// Cache utilities
export const cacheUtils = {
  refreshAll: () => {
    cacheManager.invalidateAll();
    return Promise.all([
      store.dispatch(fetchAccidents(true)),
      store.dispatch(fetchCars(true)),
      store.dispatch(fetchClients(true)),
      store.dispatch(fetchMatricules(true)),
      store.dispatch(fetchReservations(true)),
      store.dispatch(fetchContacts(true)),
      store.dispatch(fetchUtilisateurs(true))
    ]);
  },

  refresh: (dataType) => {
    cacheManager.invalidate(`${dataType}_cache`);
    switch (dataType) {
      case 'auth':
        return store.dispatch(getCurrentUtilisateur());
      case 'utilisateurs':
        return store.dispatch(fetchUtilisateurs(true));
      case 'accidents':
        return store.dispatch(fetchAccidents(true));
      case 'cars':
        return store.dispatch(fetchCars(true));
      case 'clients':
        return store.dispatch(fetchClients(true));
      case 'matricules':
        return store.dispatch(refreshMatricules());
      case 'reservations':
        return store.dispatch(fetchReservations(true));
      case 'contacts':
        return store.dispatch(fetchContacts(true));
      default:
        return Promise.resolve();
    }
  },

  getCacheStatus: () => {
    const status = {};
    Object.keys(CACHE_CONFIG).forEach(key => {
      const cached = cacheManager.get(`${key}_cache`);
      status[key] = {
        hasCache: !!cached,
        timestamp: cached?.timestamp || null,
        ttl: CACHE_CONFIG[key].ttl
      };
    });
    return status;
  },

  clearAllCache: () => {
    cacheManager.invalidateAll();
  }
};

export default store;