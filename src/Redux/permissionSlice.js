// Redux/permissionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const api = axios.create({ baseURL: 'https://smaiti-b-production.up.railway.app//api' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const fetchPages = createAsyncThunk('permissions/fetchPages', async () => {
    const res = await api.get('/admin/permissions/pages');
    return res.data.pages;
});

export const fetchUserPermissions = createAsyncThunk('permissions/fetchUserPermissions', async (userId) => {
    const res = await api.get(`/admin/permissions/user/${userId}`);
    return { userId, permissions: res.data.permissions };
});

export const assignPermission = createAsyncThunk('permissions/assign', async ({ userId, pageSlug, durationMinutes }) => {
    const res = await api.post('/admin/permissions/assign', { 
        user_id: userId, 
        page_slug: pageSlug, 
        duration_minutes: durationMinutes 
    });
    // Notify other tabs (for the target user) that permissions have changed
    localStorage.setItem('permissionsChanged', Date.now().toString());
    return { userId, permission: res.data.permission };
});

export const revokePermission = createAsyncThunk('permissions/revoke', async ({ userId, pageSlug }) => {
    await api.delete('/admin/permissions/revoke', { data: { user_id: userId, page_slug: pageSlug } });
    localStorage.setItem('permissionsChanged', Date.now().toString());
    return { userId, pageSlug };
});

export const fetchMyPermissions = createAsyncThunk('permissions/fetchMyPermissions', async () => {
    const res = await api.get('/admin/permissions/me');
    return res.data.permissions;
});

const permissionSlice = createSlice({
    name: 'permissions',
    initialState: {
        pages: {},
        userPermissions: {},
        myPermissions: [],
        loading: false,
    },
    reducers: {
        updateMyPermissions: (state, action) => {
            state.myPermissions = action.payload;
        },
        addMyPermission: (state, action) => {
            const newPerm = action.payload;
            const index = state.myPermissions.findIndex(p => p.page_slug === newPerm.page_slug);
            if (index !== -1) {
                state.myPermissions[index] = newPerm;
            } else {
                state.myPermissions.push(newPerm);
            }
        },
        removeMyPermission: (state, action) => {
            const pageSlug = action.payload;
            state.myPermissions = state.myPermissions.filter(p => p.page_slug !== pageSlug);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPages.fulfilled, (state, action) => {
                state.pages = action.payload;
            })
            .addCase(fetchUserPermissions.fulfilled, (state, action) => {
                state.userPermissions[action.payload.userId] = action.payload.permissions;
            })
            .addCase(assignPermission.fulfilled, (state, action) => {
                const { userId, permission } = action.payload;
                if (!state.userPermissions[userId]) state.userPermissions[userId] = [];
                const existing = state.userPermissions[userId].find(p => p.page_slug === permission.page_slug);
                if (existing) {
                    Object.assign(existing, permission);
                } else {
                    state.userPermissions[userId].push(permission);
                }
                // If the permission was assigned to the current user, update myPermissions
                const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
                if (currentUserId && currentUserId === userId) {
                    const permIndex = state.myPermissions.findIndex(p => p.page_slug === permission.page_slug);
                    if (permIndex !== -1) {
                        state.myPermissions[permIndex] = permission;
                    } else {
                        state.myPermissions.push(permission);
                    }
                }
            })
            .addCase(revokePermission.fulfilled, (state, action) => {
                const { userId, pageSlug } = action.payload;
                if (state.userPermissions[userId]) {
                    state.userPermissions[userId] = state.userPermissions[userId].filter(p => p.page_slug !== pageSlug);
                }
                const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
                if (currentUserId && currentUserId === userId) {
                    state.myPermissions = state.myPermissions.filter(p => p.page_slug !== pageSlug);
                }
            })
            .addCase(fetchMyPermissions.fulfilled, (state, action) => {
                state.myPermissions = action.payload;
            });
    },
});

export const { updateMyPermissions, addMyPermission, removeMyPermission } = permissionSlice.actions;
export default permissionSlice.reducer;