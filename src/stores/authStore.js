import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'
import { auth } from '../utils/firebase'
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('dynamite_admin_user')) || null)
  const token = ref(localStorage.getItem('dynamite_admin_token') || null)

  const isAuthenticated = computed(() => !!token.value)

  const login = async (email, password) => {
    try {
      // Hardcoded Admin Access
      if (email === 'admin@weardynamite.com' && password === 'Admin@123') {
        user.value = { email: 'admin@weardynamite.com', role: 'admin', name: 'Master Administrator' }
        token.value = 'admin-bypass-token-2026'
        
        localStorage.setItem('dynamite_admin_user', JSON.stringify(user.value))
        localStorage.setItem('dynamite_admin_token', token.value)
        return user.value
      }

      // Standard Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const jwt = await userCredential.user.getIdToken(true);
      
      // Temporarily set token for Axios interceptor
      token.value = jwt
      localStorage.setItem('dynamite_admin_token', token.value)

      // Hit Backend Sync endpoint to fetch our DynamoDB Admin mapping Profile
      const response = await api.post('/auth/sync');
      
      // Check if user is actually an admin
      if (response.data.profile.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      user.value = response.data.profile
      localStorage.setItem('dynamite_admin_user', JSON.stringify(user.value))
      
      return user.value
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const jwt = await userCredential.user.getIdToken(true);
      
      token.value = jwt
      localStorage.setItem('dynamite_admin_token', token.value)

      const response = await api.post('/auth/sync');
      
      if (response.data.profile.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      user.value = response.data.profile
      localStorage.setItem('dynamite_admin_user', JSON.stringify(user.value))
      
      return user.value
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  const logout = async () => {
    try { await signOut(auth); } catch(e){}
    user.value = null
    token.value = null
    localStorage.removeItem('dynamite_admin_user')
    localStorage.removeItem('dynamite_admin_token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout
  }
})
