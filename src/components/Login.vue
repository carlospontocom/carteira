<template>
  <div class="login-container">
    <!-- Lado Esquerdo - Hero com Imagem e Overlay -->
    <div class="login-hero">
      <div class="hero-overlay">
        <div class="hero-content">
          <h1>Acesse suas contas</h1>
          <div class="hero-cards">
            <div class="card-item">
              <span class="card-icone">📊</span>
              <div>
                <h2>Gerenciar</h2>
                <p>Controle suas finanças em um só lugar</p>
              </div>
            </div>

            <div class="card-item">
              <span class="card-icone">📈</span>
              <div>
                <h2>Analisar</h2>
                <p>Insights inteligentes dos seus gastos</p>
              </div>
            </div>

            <div class="card-item">
              <span class="card-icone">💰</span>
              <div>
                <h2>Economizar</h2>
                <p>Metas e planejamento financeiro</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lado Direito - Formulário de Login -->
    <div class="login-form-wrapper">
      <div class="login-card">
        <div class="login-header">
          <h2>Acesse sua<br />Carteira Digital</h2>
          <p class="login-subtitle">Faça login para começar</p>
        </div>

        <form @submit.prevent="login">
          <div class="input-group">
            <label for="email">📧 EMAIL</label>
            <input
              type="email"
              id="email"
              v-model="email"
              required
              placeholder="seu@email.com"
            />
          </div>

          <div class="input-group">
            <label for="password">🔒 SENHA</label>
            <input
              type="password"
              id="password"
              v-model="password"
              required
              placeholder="••••••••"
            />
          </div>

          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

          <button type="submit" class="login-button">
            <span>Entrar</span>
            <svg class="arrow-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
          </button>
        </form>

        <p class="register-link">
          Não tem uma conta? <router-link to="/register">Cadastre-se</router-link>
        </p>
      </div>
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

const login = async () => {
  const auth = getAuth();
  errorMessage.value = '';

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/app/dashboard');
  } catch (error: any) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorMessage.value = 'E-mail ou senha incorretos.';
        break;
      case 'auth/too-many-requests':
        errorMessage.value = 'Muitas tentativas sem sucesso. Tente novamente mais tarde.';
        break;
      default:
        errorMessage.value = 'Ocorreu um erro ao fazer login. Tente novamente.';
        break;
    }
  }
};
</script>

<style lang="scss" scoped>
.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  width: 100%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.login-hero {
  background-image: url("https://images.unsplash.com/photo-1773332598413-a6d5279d1ae8?q=80&w=1000&auto=format&fit=crop");
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;

  @media (max-width: 900px) {
    display: none; // Esconde o lado do hero em telas mobile
  }
}

.hero-overlay {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75));
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  padding: 3rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.hero-content {
  color: #ffffff;
  max-width: 420px;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 2rem;
    line-height: 1.2;
    font-weight: 700;
  }
}

.hero-cards {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  color: #ffffff;

  .card-icone {
    font-size: 2rem;
    line-height: 1;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
    opacity: 0.85;
  }
}

.login-form-wrapper {
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8fafc;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background-color: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
  padding: 2.5rem 2rem;
  border: 1px solid #e2e8f0;
}

.login-header {
  margin-bottom: 2rem;

  h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 0.5rem 0;
  }

  .login-subtitle {
    color: #64748b;
    font-size: 0.95rem;
    margin: 0;
  }
}

form {
  display: flex;
  flex-direction: column;

  .input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.25rem;

    label {
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      color: #475569;
    }

    input {
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      }
    }
  }
}

.login-button {
  border: none;
  border-radius: 8px;
  background-color: #6366f1;
  color: #ffffff;
  padding: 0.875rem;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: 0.5rem;

  &:hover {
    background-color: #4f46e5;
  }

  .arrow-icon {
    transition: transform 0.2s ease;
  }

  &:hover .arrow-icon {
    transform: translateX(4px);
  }
}

.error-message {
  text-align: center;
  margin-bottom: 1rem;
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #64748b;

  a {
    color: #6366f1;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>