<template>
  <div class="app-layout">
    <!-- Botão para abrir a sidebar -->
    <button @click="toggleSidebar" class="sidebar-toggle-btn">
      <span class="material-icons">menu</span>
    </button>

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'is-open': isSidebarOpen }]">
      <div class="sidebar-header">
        <h3>Olá,</h3>
        <p>{{ userEmail }}</p>
      </div>
      <div class="sidebar-content">
        <!-- CORREÇÃO: Links atualizados para as novas rotas aninhadas -->
        <router-link to="/app/dashboard" class="sidebar-btn">
          <span class="material-icons">dashboard</span>
          Dashboard
        </router-link>
        <router-link to="/app/carteira" class="sidebar-btn">
          <span class="material-icons">account_balance_wallet</span>
          Carteira Digital
        </router-link>
        <button @click="openPasswordModal" class="sidebar-btn">
          <span class="material-icons">security</span>
          Alterar Senha
        </button>
      </div>
      <div class="sidebar-footer">
        <button @click="handleLogout" class="sidebar-btn logout-btn">
          <span class="material-icons">logout</span>
          Sair
        </button>
      </div>
    </aside>

    <!-- Modal de Alteração de Senha -->
    <Modal v-if="isPasswordModalOpen" @close="closePasswordModal">
      <template v-slot:header><h2>Alterar Senha</h2></template>
      <template v-slot:body>
        <p>Para o usuário: <strong>{{ userEmail }}</strong></p>
        <div class="password-form">
          <input type="password" v-model="newPassword" placeholder="Nova senha" />
          <input type="password" v-model="confirmPassword" placeholder="Confirmar nova senha" />
          <p v-if="updateMessage" :class="['update-message', messageType]">{{ updateMessage }}</p>
        </div>
      </template>
      <template v-slot:footer>
        <button @click="closePasswordModal" class="modal-btn-secondary">Cancelar</button>
        <button @click="updateUserPassword" class="modal-btn-primary">Confirmar</button>
      </template>
    </Modal>

    <!-- Conteúdo da Página -->
    <main class="main-content" :class="{ 'sidebar-open': isSidebarOpen }">
      <div class="content-overlay" v-if="isSidebarOpen" @click="toggleSidebar"></div>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getAuth, updatePassword, signOut } from "firebase/auth";
import { useRouter, useRoute } from 'vue-router';
import Modal from './Modal.vue';

const router = useRouter();
const route = useRoute();

const isSidebarOpen = ref(false);
const isPasswordModalOpen = ref(false);

const newPassword = ref('');
const confirmPassword = ref('');
const updateMessage = ref('');
const messageType = ref(''); // 'success' or 'error'
const userEmail = ref('');

const auth = getAuth();

onMounted(() => {
  const user = auth.currentUser;
  if (user) {
    userEmail.value = user.email || 'Usuário';
  }
});

// Fecha a sidebar ao navegar para uma nova página em telas menores
watch(route, () => {
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false;
  }
});

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const openPasswordModal = () => {
  isPasswordModalOpen.value = true;
  isSidebarOpen.value = false;
};

const closePasswordModal = () => {
  isPasswordModalOpen.value = false;
  updateMessage.value = '';
};

const updateUserPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    updateMessage.value = 'As senhas não coincidem.';
    messageType.value = 'error';
    return;
  }
  if (newPassword.value.length < 6) {
    updateMessage.value = 'A senha deve ter pelo menos 6 caracteres.';
    messageType.value = 'error';
    return;
  }

  const user = auth.currentUser;
  if (user) {
    try {
      await updatePassword(user, newPassword.value);
      updateMessage.value = 'Senha atualizada com sucesso!';
      messageType.value = 'success';
      newPassword.value = '';
      confirmPassword.value = '';
      setTimeout(() => closePasswordModal(), 2000);
    } catch (error: any) {
      updateMessage.value = `Erro: ${error.message}`;
      messageType.value = 'error';
    }
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push('/login'); // Redireciona para /login ao sair
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
};
</script>

<style scoped>
/* Estilos identicos ao Dashboard.vue anterior, para manter a consistência visual */
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

.app-layout {
  position: relative;
  min-height: 100vh;
  background-color: #f4f7f6;
  overflow-x: hidden;
}

.sidebar-toggle-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1100;
  background: #fff;
  color: #1a1a1a;
  border: none;
  padding: 10px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100%;
  background-color: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  transition: left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  z-index: 1000;
  box-shadow: 0 0 25px rgba(0,0,0,0.5);
}

.sidebar.is-open { left: 0; }
.sidebar-header { padding: 40px 25px 20px; text-align: left; border-bottom: 1px solid #333; }
.sidebar-header p { word-wrap: break-word; color: #ccc; }
.sidebar-content { flex-grow: 1; padding: 20px 25px; }
.sidebar-footer { padding: 20px 25px; border-top: 1px solid #333; }

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  padding: 15px;
  background: transparent;
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-size: 1em;
  margin-bottom: 10px;
  transition: background-color 0.3s, border-color 0.3s;
  text-decoration: none;
}

.sidebar-btn.router-link-exact-active {
  background-color: #222;
  border-color: #3498db;
}

.sidebar-btn:hover { background-color: #222; border-color: #666; }
.logout-btn { border-color: #e74c3c; color: #e74c3c; }
.logout-btn:hover { background-color: #e74c3c; color: white; }

.password-form input { width: 100%; padding: 12px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #555; background-color: #333; color: white; }
.update-message { margin-top: 10px; padding: 10px; border-radius: 5px; font-size: 0.9em; text-align: center; }
.update-message.success { background-color: #27ae60; color: white; }
.update-message.error { background-color: #e74c3c; color: white; }

.modal-btn-primary, .modal-btn-secondary { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.3s; }
.modal-btn-primary { background-color: #3498db; color: white; }
.modal-btn-primary:hover { background-color: #2980b9; }
.modal-btn-secondary { background-color: #7f8c8d; color: white; margin-right: 10px; }
.modal-btn-secondary:hover { background-color: #95a5a6; }

.main-content { transition: padding-left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); padding: 80px 40px 40px; }

@media (min-width: 768px) {
  .main-content.sidebar-open {
    padding-left: 340px; /* 300px sidebar + 40px padding */
  }
}

.content-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: none;
}

@media (max-width: 767px) {
  .sidebar.is-open ~ .main-content .content-overlay { display: block; }
}

</style>