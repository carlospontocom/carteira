<template>
  <div class="dashboard-container">
    <!-- Cabeçalho com Resumos Financeiros -->
    <header class="dashboard-header">
      <h1>Dashboard Financeiro</h1>
      
      <!-- Filtro por Mês -->
      <div class="filtro-mes">
        <label>📅 Período:</label>
        <select v-model="mesSelecionado" @change="atualizarDados">
          <option value="todos">Todos os meses</option>
          <option v-for="mes in mesesDisponiveis" :key="mes" :value="mes">
            {{ formatarMes(mes) }}
          </option>
        </select>
        
        <span v-if="mesSelecionado !== 'todos'" class="filtro-info">
          {{ formatarMes(mesSelecionado) }}
        </span>
      </div>

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

      <!-- Resumo Mensal -->
      <div v-if="mesSelecionado !== 'todos'" class="resumo-mensal">
        <div class="card-resumo-mini card-receita-mini">
          <span>📈 Receitas</span>
          <strong>+ R$ {{ totalReceitasMes.toFixed(2) }}</strong>
        </div>
        <div class="card-resumo-mini card-despesa-mini">
          <span>📉 Despesas</span>
          <strong>- R$ {{ totalDespesasMes.toFixed(2) }}</strong>
        </div>
        <div class="card-resumo-mini card-saldo-mini">
          <span>💰 Saldo do Mês</span>
          <strong>R$ {{ saldoMes.toFixed(2) }}</strong>
        </div>
        <div class="card-resumo-mini card-transacoes-mini">
          <span>📋 Transações</span>
          <strong>{{ transacoesFiltradas.length }}</strong>
        </div>
      </div>
    </header>

    <!-- Corpo Principal com Gráfico -->
    <main class="dashboard-main">
      <div class="grafico-container card">
        <h2>Despesas por Categoria</h2>
        <div v-if="carregando" class="loading">
          ⏳ Carregando dados...
        </div>
        <div v-else-if="temDespesas" class="chart-wrapper">
          <Pie :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="nenhuma-despesa">
          Nenhuma despesa registrada ainda. 
          <router-link to="/app/carteira">Adicione sua primeira despesa!</router-link>
        </p>
      </div>

      <!-- Top Despesas por Categoria -->
      <div v-if="temDespesas" class="top-categorias card">
        <h2>🏆 Top Categorias</h2>
        <div v-for="(item, index) in topCategorias" :key="item.nome" class="top-item">
          <div class="top-posicao">{{ index + 1 }}</div>
          <div class="top-info">
            <span class="top-nome">{{ item.nome }}</span>
            <span class="top-valor">R$ {{ item.valor.toFixed(2) }}</span>
          </div>
          <div class="top-bar">
            <div class="top-bar-fill" :style="{ width: item.porcentagem + '%' }"></div>
          </div>
          <span class="top-porcentagem">{{ item.porcentagem.toFixed(1) }}%</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  collection, query, onSnapshot, doc
} from 'firebase/firestore'
import { db, auth } from '../firebase'

// Registrar plugins do Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, ChartDataLabels)

// --- Estado ---
const transacoes = ref([])
const carregando = ref(true)
const mesSelecionado = ref('todos')
let unsubscribe = () => {}

// --- Meses Disponíveis ---
const mesesDisponiveis = computed(() => {
  const meses = new Set()
  transacoes.value.forEach(t => {
    if (t.data) {
      const mes = t.data.substring(0, 7) // YYYY-MM
      meses.add(mes)
    }
  })
  return Array.from(meses).sort()
})

// --- Filtro por Mês ---
const transacoesFiltradas = computed(() => {
  if (mesSelecionado.value === 'todos') {
    return transacoes.value
  }
  return transacoes.value.filter(t => {
    if (!t.data) return false
    const mes = t.data.substring(0, 7)
    return mes === mesSelecionado.value
  })
})

// --- Computadas para Cálculos Financeiros ---
const totalReceitas = computed(() => {
  return transacoesFiltradas.value
    .filter(t => t.tipo === 'receita' && t.valor)
    .reduce((acc, t) => acc + t.valor, 0)
})

const totalDespesas = computed(() => {
  return transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, t) => acc + t.valor, 0)
})

const saldo = computed(() => {
  return totalReceitas.value - totalDespesas.value
})

// --- Computadas para Resumo Mensal ---
const totalReceitasMes = computed(() => {
  if (mesSelecionado.value === 'todos') return 0
  return transacoesFiltradas.value
    .filter(t => t.tipo === 'receita' && t.valor)
    .reduce((acc, t) => acc + t.valor, 0)
})

const totalDespesasMes = computed(() => {
  if (mesSelecionado.value === 'todos') return 0
  return transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, t) => acc + t.valor, 0)
})

const saldoMes = computed(() => {
  return totalReceitasMes.value - totalDespesasMes.value
})

const temDespesas = computed(() => {
  return totalDespesas.value > 0
})

// --- Top Categorias ---
const topCategorias = computed(() => {
  const despesasPorCategoria = transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, transacao) => {
      acc[transacao.categoria] = (acc[transacao.categoria] || 0) + transacao.valor
      return acc
    }, {})

  const total = Object.values(despesasPorCategoria).reduce((acc, val) => acc + val, 0)
  
  return Object.entries(despesasPorCategoria)
    .map(([nome, valor]) => ({
      nome,
      valor,
      porcentagem: total > 0 ? (valor / total) * 100 : 0
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5) // Top 5
})

// --- Computadas para o Gráfico ---
const chartData = computed(() => {
  const despesasPorCategoria = transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, transacao) => {
      acc[transacao.categoria] = (acc[transacao.categoria] || 0) + transacao.valor
      return acc
    }, {})

  const cores = ['#2ecc71', '#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#e84393', '#00b894', '#fd79a8']

  return {
    labels: Object.keys(despesasPorCategoria),
    datasets: [
      {
        backgroundColor: cores.slice(0, Object.keys(despesasPorCategoria).length),
        data: Object.values(despesasPorCategoria)
      }
    ]
  }
})

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
      formatter: (value, ctx) => {
        const total = ctx.chart.data.datasets[0].data.reduce((acc, val) => acc + val, 0)
        const percentage = (value / total * 100).toFixed(1) + '%'
        return percentage
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
}

// --- Funções Auxiliares ---
const formatarMes = (mes) => {
  if (!mes || mes === 'todos') return 'Todos'
  const [ano, mesNum] = mes.split('-')
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${meses[parseInt(mesNum) - 1]} ${ano}`
}

const atualizarDados = () => {
  // Força a atualização dos dados filtrados
}

// --- Buscar Dados ---
const buscarTransacoes = (user) => {
  carregando.value = true
  
  try {
    const userDocRef = doc(db, 'carteiraDigital', user.uid)
    const transacoesColRef = collection(userDocRef, 'transacoes')
    const q = query(transacoesColRef)

    unsubscribe = onSnapshot(q, (querySnapshot) => {
      transacoes.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      carregando.value = false
    }, (error) => {
      console.error('❌ Erro ao carregar transações:', error)
      carregando.value = false
    })
  } catch (error) {
    console.error('❌ Erro ao buscar transações:', error)
    carregando.value = false
  }
}

// --- Ciclo de Vida ---
onMounted(() => {
  const user = auth.currentUser
  if (user) {
    buscarTransacoes(user)
  } else {
    carregando.value = false
    console.log('⚠️ Usuário não logado')
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// --- Watchers ---
watch(mesSelecionado, () => {
  // Atualiza quando o mês muda
})
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  animation: fadeIn 0.5s ease-in-out;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  padding: 2rem;
}

/* Cabeçalho */
.dashboard-header {
  margin-bottom: 2.5rem;
}

.dashboard-header h1 {
  font-size: 2.8rem;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

/* Filtro por Mês */
.filtro-mes {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  background: white;
  padding: 0.8rem 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.filtro-mes label {
  font-weight: 600;
  color: #555;
}

.filtro-mes select {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  min-width: 180px;
}

.filtro-mes select:focus {
  outline: none;
  border-color: #3498db;
}

.filtro-info {
  background: #e3f2fd;
  padding: 0.3rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  color: #1565c0;
  font-size: 0.9rem;
}

/* Cards de Resumo */
.resumo-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-resumo {
  padding: 1.5rem 2rem;
  color: white;
  border-radius: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-align: center;
}

.card-resumo:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 36px 0 rgba(31, 38, 135, 0.45);
}

.card-resumo h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.card-resumo p {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -1px;
}

.card-receita {
  background: linear-gradient(45deg, #2ecc71, #27ae60);
}

.card-despesa {
  background: linear-gradient(45deg, #e74c3c, #c0392b);
}

.card-saldo {
  background: linear-gradient(45deg, #3498db, #2980b9);
}

/* Resumo Mensal */
.resumo-mensal {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.card-resumo-mini {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.card-resumo-mini:hover {
  transform: translateY(-4px);
}

.card-resumo-mini span {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.3rem;
}

.card-resumo-mini strong {
  font-size: 1.5rem;
  font-weight: 700;
}

.card-receita-mini strong {
  color: #27ae60;
}

.card-despesa-mini strong {
  color: #e74c3c;
}

.card-saldo-mini strong {
  color: #3498db;
}

.card-transacoes-mini strong {
  color: #9b59b6;
}

/* Gráfico */
.grafico-container {
  padding: 2rem;
  margin-bottom: 2rem;
}

.grafico-container h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  text-align: center;
}

.chart-wrapper {
  height: 400px;
  position: relative;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.2rem;
}

.nenhuma-despesa {
  text-align: center;
  padding: 3rem 2rem;
  color: #777;
  font-size: 1.1rem;
}

.nenhuma-despesa a {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.nenhuma-despesa a:hover {
  color: #2980b9;
  text-decoration: underline;
}

/* Top Categorias */
.top-categorias {
  padding: 2rem;
}

.top-categorias h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  color: #333;
}

.top-item {
  display: grid;
  grid-template-columns: 40px 1fr 80px;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.top-item:last-child {
  border-bottom: none;
}

.top-posicao {
  font-size: 1.2rem;
  font-weight: 700;
  color: #999;
  text-align: center;
}

.top-item:nth-child(1) .top-posicao {
  color: #f1c40f;
}
.top-item:nth-child(2) .top-posicao {
  color: #bdc3c7;
}
.top-item:nth-child(3) .top-posicao {
  color: #e67e22;
}

.top-info {
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
}

.top-nome {
  font-weight: 600;
  color: #333;
}

.top-valor {
  color: #555;
}

.top-bar {
  grid-column: 1 / -1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.top-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.top-porcentagem {
  font-size: 0.85rem;
  color: #666;
  font-weight: 600;
  text-align: right;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsivo */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }

  .dashboard-header h1 {
    font-size: 2rem;
  }

  .resumo-cards {
    grid-template-columns: 1fr;
  }

  .card-resumo p {
    font-size: 1.8rem;
  }

  .chart-wrapper {
    height: 300px;
  }

  .grafico-container {
    padding: 1rem;
  }

  .filtro-mes {
    flex-direction: column;
    align-items: stretch;
  }

  .resumo-mensal {
    grid-template-columns: 1fr 1fr;
  }

  .top-item {
    grid-template-columns: 30px 1fr;
  }

  .top-bar {
    grid-column: 1 / -1;
  }

  .top-porcentagem {
    grid-column: 1 / -1;
    text-align: left;
  }
}

@media (max-width: 480px) {
  .resumo-mensal {
    grid-template-columns: 1fr;
  }
}
</style>