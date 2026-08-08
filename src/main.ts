import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './firebase'; // Import for side effects

const app = createApp(App);

app.use(router);

app.mount('#app');
