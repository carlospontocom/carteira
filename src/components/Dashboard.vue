<template>
  <div>
    <h2>Dashboard</h2>
    <p>Welcome to your dashboard!</p>
    <button @click="logout">Logout</button>
  </div>
</template>

<script setup>
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = () => {
  const auth = getAuth();
  signOut(auth)
    .then(() => {
      router.push('/');
    })
    .catch(error => {
      alert(error.message);
    });
};
</script>
