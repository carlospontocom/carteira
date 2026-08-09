<template>
  <div class="register-container">
    <div class="register-card">
      <h2>Crie sua Conta</h2>

      <!-- Toast de Notificação -->
      <transition name="fade">
        <div v-if="toast.show" :class="['toast', toast.type]">
          {{ toast.message }}
        </div>
      </transition>

      <form @submit.prevent="register">
        <div class="input-group">
          <label for="name">Nome</label>
          <input 
            type="text" 
            id="name" 
            v-model="name" 
            placeholder="Digite seu nome completo" 
            required
          >
        </div>
        <div class="input-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="seuemail@exemplo.com" 
            required
          >
        </div>
        <div class="input-group">
          <label for="password">Senha</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Mínimo 6 caracteres" 
            required 
            minlength="6"
          >
        </div>
        <div class="input-group">
          <label for="confirmPassword">Confirmar Senha</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            placeholder="Digite a senha novamente" 
            required
          >
        </div>
        <button type="submit" class="register-button" :disabled="isLoading">
          {{ isLoading ? 'Cadastrando...' : 'Cadastrar' }}
        </button>
      </form>
      <p class="login-link">
        Já tem uma conta? <router-link to="/">Faça login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'vue-router';

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const router = useRouter();

// Estado do Toast
const toast = ref({
  show: false,
  message: '',
  type: 'error' // 'error' | 'success'
});

const showToast = (message: string, type: 'error' | 'success' = 'error') => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 4000);
};

// Tradutor de códigos do Firebase Auth
const translateFirebaseError = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está sendo utilizado por outra conta.';
    case 'auth/invalid-email':
      return 'O endereço de e-mail informado é inválido.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida. Entre em contato com o suporte.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
    default:
      return 'Ocorreu um erro ao realizar o cadastro. Tente novamente.';
  }
};

const register = async () => {
  if (password.value !== confirmPassword.value) {
    showToast('As senhas não coincidem. Por favor, tente novamente.', 'error');
    return;
  }

  isLoading.value = true;
  const auth = getAuth();
  const db = getFirestore();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;

    await setDoc(doc(db, 'usuarios', user.uid), {
      uid: user.uid,
      name: name.value,
      email: email.value,
      createdAt: new Date()
    });

    await signOut(auth);

    showToast('Conta criada com sucesso! Redirecionando...', 'success');
    
    setTimeout(() => {
      router.push('/');
    }, 2000);

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    const errorCode = error?.code || '';
    const translatedMessage = translateFirebaseError(errorCode);
    
    showToast(translatedMessage, 'error');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  position: relative;
}

.register-card {
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
  position: relative;
}

h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

/* Toast Styles */
.toast {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: left;
}

.toast.error {
  background-color: #fde8e8;
  color: #e53e3e;
  border: 1px solid #f8b4b4;
}

.toast.success {
  background-color: #def7ec;
  color: #0e9f6e;
  border: 1px solid #84e1bc;
}

/* Animação do Toast */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.input-group {
  margin-bottom: 1rem;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
}

input::placeholder {
  color: #aaa;
}

.register-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

.register-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.register-button:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.login-link {
  margin-top: 1.5rem;
  color: #666;
}

.login-link a {
  color: #007bff;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>