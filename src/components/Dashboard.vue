<template>
  <div class="dashboard-container">
    <!-- Cabeçalho com Resumos Financeiros -->
    <header class="dashboard-header">
      <h1>Dashboard Financeiro</h1>
      <div class="resumo-cards">
        <div class="card-resumo card-receita">
          <h3>Total de Receitas</h3>
          <p>+ R$ {{ totalReceitas.toFixed(2) }}</p>
        </div>
        <div class="card-resumo card-despesa">
          <h3>Total de Despesas</h3>
          <p>- R$ {{ totalDespesas.toFixed(2) }}</p>
        </div>
        <div class="card-resumo card-saldo">
          <h3>Saldo Atual</h3>
          <p>R$ {{ saldo.toFixed(2) }}</p>
        </div>
      </div>
    </header>

    <!-- Corpo Principal com Gráfico -->
    <main class="dashboard-main">
      <div class="grafico-container card">
        <h2>Despesas por Categoria</h2>
        <div v-if="temDespesas" class="chart-wrapper">
          <Pie :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="nenhuma-despesa">
          Nenhuma despesa registrada ainda. Vá para a <router-link to="/app/carteira">Carteira Digital</router-link> para adicionar sua primeira despesa!
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  collection, query, onSnapshot, doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, ChartDataLabels);

// --- Interfaces ---
interface Transacao {
  id: string;
  valor: number | null;
  tipo: 'receita' | 'despesa';
  categoria: string;
}

// --- Estado Reativo ---
const transacoes = ref<Transacao[]>([]);
let unsubscribeTransacoes: () => void = () => {};

// --- Ciclo de Vida ---
onMounted(() => {
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, 'carteiraDigital', user.uid);
    const transacoesColRef = collection(userDocRef, 'transacoes');
    const q = query(transacoesColRef);

    unsubscribeTransacoes = onSnapshot(q, (querySnapshot) => {
      transacoes.value = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Transacao));
    });
  }
});

onUnmounted(() => {
  unsubscribeTransacoes();
});

// --- Computadas para Cálculos Financeiros ---
const totalReceitas = computed(() => 
  transacoes.value
    .filter(t => t.tipo === 'receita' && t.valor)
    .reduce((acc, t) => acc + t.valor!, 0)
);

const totalDespesas = computed(() =>
  transacoes.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, t) => acc + t.valor!, 0)
);

const saldo = computed(() => totalReceitas.value - totalDespesas.value);

// --- Computadas para o Gráfico ---
const temDespesas = computed(() => totalDespesas.value > 0);

const chartData = computed(() => {
  const despesasPorCategoria = transacoes.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, transacao) => {
      acc[transacao.categoria] = (acc[transacao.categoria] || 0) + transacao.valor!;
      return acc;
    }, {} as Record<string, number>);

  return {
    labels: Object.keys(despesasPorCategoria),
    datasets: [
      {
        backgroundColor: ['#2ecc71', '#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c'],
        data: Object.values(despesasPorCategoria)
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#333',
        font: {
          size: 14
        }
      }
    },
    datalabels: {
      formatter: (value: number, ctx: any) => {
        const total = ctx.chart.data.datasets[0].data.reduce((acc: number, val: number) => acc + val, 0);
        const percentage = (value / total * 100).toFixed(1) + '%';
        return percentage;
      },
      color: '#fff',
      font: {
        weight: 'bold',
        size: 14,
      },
      textShadow: {
        color: 'rgba(0, 0, 0, 0.75)',
        strokeWidth: 2
      }
    }
  }
};
</script>

<style scoped>
/* Fundo com textura sutil */
.dashboard-container {
  padding: 2rem;
  animation: fadeIn 0.5s ease-in-out;
}

.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  /* Sombra "levantada" mais pronunciada */
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

/* Cabeçalho */
.dashboard-header { margin-bottom: 2.5rem; }
.dashboard-header h1 {
  font-size: 3em;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 2rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

/* Cards de Resumo */
.resumo-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.card-resumo {
  padding: 1.5rem;
  color: white;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-resumo:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 36px 0 rgba(31, 38, 135, 0.45);
}

.card-resumo h3 {
  font-size: 1.2em;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.card-resumo p {
  font-size: 2.5em;
  font-weight: 700;
  margin: 0;
  letter-spacing: -1px;
}

/* Cores vibrantes com gradientes */
.card-receita { background: linear-gradient(45deg, #2ecc71, #27ae60); }
.card-despesa { background: linear-gradient(45deg, #e74c3c, #c0392b); }
.card-saldo { background: linear-gradient(45deg, #3498db, #2980b9); }

/* Gráfico */
.grafico-container {
  padding: 2rem;
}

.grafico-container h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 1.8em;
  font-weight: 700;
  color: #333;
  text-align: center;
}

.chart-wrapper {
  height: 400px; /* Mais espaço para o gráfico */
  position: relative;
}

.nenhuma-despesa {
  text-align: center;
  padding: 40px 20px;
  color: #777;
  font-size: 1.2em;
}

.nenhuma-despesa a {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.nenhuma-despesa a:hover { color: #2980b9; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>