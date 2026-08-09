<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Acesse<br/> Carteira Digital</h2>
      <form @submit.prevent="login">
        <div class="input-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required placeholder="E-mail cadastrado">
        </div>
        <div class="input-group">
          <label for="password">Senha</label>
          <input type="password" id="password" v-model="password" required placeholder="Senha de acesso">
        </div>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button type="submit" class="login-button">Entrar</button>
      </form>
      <p class="register-link">
        Não tem uma conta? <router-link to="/register">Cadastre-se</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const router = useRouter();

const login = () => {
  const auth = getAuth();
  errorMessage.value = ''; // Limpa a mensagem de erro anterior
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then(() => {
      // CORREÇÃO: Redireciona para a nova rota aninhada
      router.push('/app/dashboard');
    })
    .catch(error => {
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage.value = 'Usuário não encontrado.';
          break;
        case 'auth/wrong-password':
          errorMessage.value = 'Senha incorreta.';
          break;
        default:
          errorMessage.value = 'Ocorreu um erro ao fazer login.';
          break;
      }
    });
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}

.login-card {
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 { margin-bottom: 2.5rem; color: #333; }
.input-group { margin-bottom: 1rem; text-align: left; }
label { display: block; margin-bottom: 0.5rem; color: #666; }
input { width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 5px; }

.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #3498db;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}
.login-button:hover { background-color: #2980b9; }

.error-message {
  color: #e74c3c;
  margin-top: 1rem;
}

.register-link { margin-top: 1.5rem; color: #666; }
.register-link a { color: #3498db; text-decoration: none; }
.register-link a:hover { text-decoration: underline; }
</style>
