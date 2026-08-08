<template>
  <div class="dashboard-container">
    <div class="dashboard-card">
      <h2>Dashboard</h2>
      <p>Bem-vindo ao seu painel!</p>
      <div v-if="userEmail" class="user-info">
        <p>Logado como: <strong>{{ userEmail }}</strong></p>
      </div>
      <button @click="logout" class="logout-button">Sair</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const userEmail = ref<string | null>(null);
const auth = getAuth();

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userEmail.value = user.email;
    } else {
      // User is signed out
      userEmail.value = null;
    }
  });
});

const logout = () => {
  signOut(auth)
    .then(() => {
      router.push('/');
    })
    .catch(error => {
      alert(error.message);
    });
};
</script>

<style scoped>
.dashboard-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}

.dashboard-card {
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  text-align: center;
}

h2 {
  margin-bottom: 1rem;
  color: #333;
}

.user-info {
  margin: 1.5rem 0;
  color: #555;
}

.user-info strong {
  color: #333;
}

.logout-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #dc3545;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

.logout-button:hover {
  background-color: #c82333;
}
</style>
