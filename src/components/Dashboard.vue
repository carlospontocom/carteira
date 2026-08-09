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

      <!-- 🩺 SAÚDE FINANCEIRA -->
      <div class="saude-financeira card">
        <div class="saude-header">
          <div>
            <h2>🩺 Saúde Financeira</h2>
            <p class="saude-subtitulo">Análise inteligente dos seus hábitos financeiros</p>
          </div>
          
          <div class="saude-score">
            <div v-if="temDadosSuficientes" class="score-circle" :class="classeScore">
              <span class="score-number">{{ scoreFinanceiro }}</span>
              <span class="score-label">/100</span>
            </div>
            <div v-else class="score-circle score-indisponivel">
              <span class="score-number">?</span>
              <span class="score-label">/100</span>
            </div>
            <span class="score-status">{{ statusScore }}</span>
          </div>
        </div>

        <!-- ⭐ MENSAGEM QUANDO NÃO HÁ DADOS -->
        <div v-if="!temDadosSuficientes" class="perfil-risco-container sem-dados">
          <div class="sem-dados-content">
            <div class="sem-dados-icon">📊</div>
            <h3 class="sem-dados-titulo">Risco financeiro não gerado</h3>
            <p class="sem-dados-texto">
              O cliente não registrou suas finanças ou não há dados suficientes para análise.
            </p>
            <p class="sem-dados-subtexto">
              Para gerar o perfil de risco, é necessário ter pelo menos:
            </p>
            <ul class="sem-dados-lista">
              <li>✅ 1 transação de receita</li>
              <li>✅ 1 transação de despesa</li>
              <li>✅ Categorias definidas</li>
            </ul>
            <router-link to="/app/carteira" class="sem-dados-botao">
              ➕ Adicionar transações
            </router-link>
          </div>
        </div>

        <!-- Cards de Indicadores (só aparece se tiver dados) -->
        <div v-if="temDadosSuficientes" class="indicadores-grid">
          <div class="indicador-card">
            <div class="indicador-icon">💰</div>
            <div class="indicador-info">
              <span class="indicador-label">Capacidade de Economia</span>
              <div class="indicador-bar">
                <div class="indicador-bar-fill" :style="{ width: indicadores.economia + '%' }"></div>
              </div>
              <span class="indicador-valor">{{ indicadores.economia }}%</span>
              <span class="indicador-detalhe">{{ indicadores.economiaTexto }}</span>
            </div>
          </div>

          <div class="indicador-card">
            <div class="indicador-icon">🏠</div>
            <div class="indicador-info">
              <span class="indicador-label">Gastos com Moradia</span>
              <div class="indicador-bar">
                <div class="indicador-bar-fill" :style="{ width: Math.min(indicadores.moradia, 100) + '%', background: indicadores.moradia > 50 ? '#e74c3c' : '#2ecc71' }"></div>
              </div>
              <span class="indicador-valor">{{ indicadores.moradia }}%</span>
              <span class="indicador-detalhe">{{ indicadores.moradiaTexto }}</span>
            </div>
          </div>

          <div class="indicador-card">
            <div class="indicador-icon">📊</div>
            <div class="indicador-info">
              <span class="indicador-label">Diversificação de Gastos</span>
              <div class="indicador-bar">
                <div class="indicador-bar-fill" :style="{ width: indicadores.diversificacao + '%', background: indicadores.diversificacao > 60 ? '#2ecc71' : '#e67e22' }"></div>
              </div>
              <span class="indicador-valor">{{ indicadores.diversificacao }}%</span>
              <span class="indicador-detalhe">{{ indicadores.diversificacaoTexto }}</span>
            </div>
          </div>

          <div class="indicador-card">
            <div class="indicador-icon">🛡️</div>
            <div class="indicador-info">
              <span class="indicador-label">Reserva de Emergência</span>
              <div class="indicador-bar">
                <div class="indicador-bar-fill" :style="{ width: Math.min(indicadores.reserva * 10, 100) + '%', background: indicadores.reserva >= 6 ? '#2ecc71' : '#e74c3c' }"></div>
              </div>
              <span class="indicador-valor">{{ indicadores.reserva }} meses</span>
              <span class="indicador-detalhe">{{ indicadores.reservaTexto }}</span>
            </div>
          </div>
        </div>

        <!-- Insights e Recomendações (só aparece se tiver dados) -->
        <div v-if="temDadosSuficientes" class="insights-container">
          <div class="insights-header">
            <span>💡 Insights e Recomendações</span>
            <span class="insights-count">{{ insights.length }} insights</span>
          </div>
          
          <div v-if="insights.length === 0" class="nenhum-insight">
            🎉 Parabéns! Sua saúde financeira está excelente!
          </div>
          
          <div v-for="(insight, index) in insights" :key="index" class="insight-item" :class="insight.tipo">
            <div class="insight-icon">{{ insight.icone }}</div>
            <div class="insight-content">
              <p class="insight-texto">{{ insight.texto }}</p>
              <p v-if="insight.dica" class="insight-dica">💡 {{ insight.dica }}</p>
            </div>
          </div>
        </div>

        <!-- Previsão de Saldo (só aparece se tiver dados) -->
        <div v-if="temDadosSuficientes" class="previsao-container">
          <div class="previsao-header">
            <span>🔮 Previsão de Saldo</span>
            <span class="previsao-periodo">Próximos 6 meses</span>
          </div>
          
          <div class="previsao-grafico">
            <div v-for="(item, index) in previsao" :key="index" class="previsao-bar-container">
              <div class="previsao-label">{{ item.mes }}</div>
              <div class="previsao-bar-wrapper">
                <div class="previsao-bar" :style="{ height: item.altura + '%', background: item.cor }">
                  <span class="previsao-valor">R$ {{ item.valor }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="previsao-resumo">
            <div class="previsao-cenario">
              <span class="cenario-label">📈 Cenário Atual</span>
              <span class="cenario-valor">R$ {{ previsao[previsao.length - 1]?.valor || '0' }}</span>
            </div>
            <div class="previsao-cenario">
              <span class="cenario-label">🎯 Meta (R$ 10.000)</span>
              <span class="cenario-valor">{{ tempoParaMeta }}</span>
            </div>
            <div class="previsao-cenario">
              <span class="cenario-label">⚡ Economia Mensal</span>
              <span class="cenario-valor">R$ {{ economiaMensal.toFixed(2) }}</span>
            </div>
          </div>
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

// --- ⭐ VERIFICA SE HÁ DADOS SUFICIENTES ---
const temDadosSuficientes = computed(() => {
  const receitas = transacoesFiltradas.value.filter(t => t.tipo === 'receita' && t.valor > 0)
  const despesas = transacoesFiltradas.value.filter(t => t.tipo === 'despesa' && t.valor > 0)
  const categorias = new Set(transacoesFiltradas.value.map(t => t.categoria))
  
  return receitas.length > 0 && despesas.length > 0 && categorias.size > 0
})

// --- Meses Disponíveis ---
const mesesDisponiveis = computed(() => {
  const meses = new Set()
  transacoes.value.forEach(t => {
    if (t.data) {
      const mes = t.data.substring(0, 7)
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
    .slice(0, 5)
})

// --- 🩺 SAÚDE FINANCEIRA - Cálculos ---

// 1. Score Financeiro (0-100)
const scoreFinanceiro = computed(() => {
  if (!temDadosSuficientes.value) return 0
  
  let score = 0
  
  const economiaPercent = totalReceitas.value > 0 
    ? (saldo.value / totalReceitas.value) * 100 
    : 0
  if (economiaPercent >= 20) score += 25
  else if (economiaPercent >= 10) score += 18
  else if (economiaPercent >= 5) score += 10
  else if (economiaPercent > 0) score += 5
  
  const moradiaPercent = totalReceitas.value > 0
    ? (despesasMoradia.value / totalReceitas.value) * 100
    : 0
  if (moradiaPercent <= 30) score += 20
  else if (moradiaPercent <= 40) score += 15
  else if (moradiaPercent <= 50) score += 10
  else if (moradiaPercent <= 60) score += 5
  
  const numCategorias = Object.keys(despesasPorCategoria.value).length
  if (numCategorias >= 6) score += 20
  else if (numCategorias >= 4) score += 15
  else if (numCategorias >= 3) score += 10
  else if (numCategorias >= 2) score += 5
  
  const mesesReserva = calcularMesesReserva()
  if (mesesReserva >= 6) score += 20
  else if (mesesReserva >= 4) score += 15
  else if (mesesReserva >= 2) score += 10
  else if (mesesReserva >= 1) score += 5
  
  const regularidade = calcularRegularidade()
  if (regularidade >= 0.9) score += 15
  else if (regularidade >= 0.7) score += 10
  else if (regularidade >= 0.5) score += 5
  
  return Math.min(Math.round(score), 100)
})

// 2. Status do Score
const statusScore = computed(() => {
  if (!temDadosSuficientes.value) return '📊 Sem dados'
  
  const score = scoreFinanceiro.value
  if (score >= 80) return '🌟 Excelente!'
  if (score >= 60) return '👍 Bom'
  if (score >= 40) return '📊 Regular'
  if (score >= 20) return '⚠️ Atenção'
  return '🚨 Crítico'
})

const classeScore = computed(() => {
  if (!temDadosSuficientes.value) return 'score-indisponivel'
  
  const score = scoreFinanceiro.value
  if (score >= 80) return 'score-excelente'
  if (score >= 60) return 'score-bom'
  if (score >= 40) return 'score-regular'
  if (score >= 20) return 'score-atencao'
  return 'score-critico'
})

// 3. Indicadores
const despesasPorCategoria = computed(() => {
  return transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor
      return acc
    }, {})
})

const despesasMoradia = computed(() => {
  const moradia = transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && 
           (t.categoria === 'Moradia' || t.categoria === 'Aluguel' || t.categoria === 'Financiamento'))
    .reduce((acc, t) => acc + t.valor, 0)
  return moradia
})

const indicadores = computed(() => {
  if (!temDadosSuficientes.value) {
    return {
      economia: 0,
      economiaTexto: '📊 Sem dados suficientes',
      moradia: 0,
      moradiaTexto: '📊 Sem dados suficientes',
      diversificacao: 0,
      diversificacaoTexto: '📊 Sem dados suficientes',
      reserva: 0,
      reservaTexto: '📊 Sem dados suficientes'
    }
  }
  
  const receita = totalReceitas.value
  const despesa = totalDespesas.value
  const economia = receita > 0 ? ((receita - despesa) / receita) * 100 : 0
  const moradia = receita > 0 ? (despesasMoradia.value / receita) * 100 : 0
  
  const categorias = Object.keys(despesasPorCategoria.value)
  const diversificacao = categorias.length > 0 ? Math.min((categorias.length / 8) * 100, 100) : 0
  
  const mesesReserva = calcularMesesReserva()
  
  return {
    economia: Math.min(Math.round(economia), 100),
    economiaTexto: economia >= 20 ? '✅ Ótimo! Você economiza mais de 20%' :
                   economia >= 10 ? '👍 Bom, mas pode melhorar' :
                   economia >= 5 ? '📊 Economia básica' :
                   economia > 0 ? '⚠️ Economia muito baixa' : '🚨 Você não está economizando',
    moradia: Math.round(moradia),
    moradiaTexto: moradia <= 30 ? '✅ Dentro do recomendado (≤30%)' :
                  moradia <= 40 ? '👍 Um pouco acima do ideal' :
                  moradia <= 50 ? '📊 Atenção: está alto' :
                  moradia <= 60 ? '⚠️ Muito alto: reavalie' : '🚨 Crítico: moradia consome demais',
    diversificacao: Math.min(Math.round(diversificacao), 100),
    diversificacaoTexto: diversificacao >= 70 ? '✅ Ótima diversificação!' :
                         diversificacao >= 50 ? '👍 Diversificação regular' :
                         diversificacao >= 30 ? '📊 Pouca diversificação' : '⚠️ Gastos concentrados em poucas categorias',
    reserva: Math.round(mesesReserva * 10) / 10,
    reservaTexto: mesesReserva >= 6 ? '✅ Reserva confortável (6+ meses)' :
                  mesesReserva >= 4 ? '👍 Reserva razoável' :
                  mesesReserva >= 2 ? '📊 Reserva mínima' :
                  mesesReserva >= 1 ? '⚠️ Reserva muito baixa' : '🚨 Sem reserva de emergência'
  }
})

// 4. Calcular meses de reserva
function calcularMesesReserva() {
  const despesaMedia = transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.valor)
    .reduce((acc, t) => acc + t.valor, 0) / Math.max(1, transacoesFiltradas.value.length)
  
  if (despesaMedia === 0) return 0
  return saldo.value / despesaMedia
}

// 5. Regularidade de entradas
function calcularRegularidade() {
  const receitas = transacoesFiltradas.value
    .filter(t => t.tipo === 'receita' && t.valor)
  
  if (receitas.length < 2) return 0
  
  const valores = receitas.map(t => t.valor)
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  const desvio = Math.sqrt(valores.reduce((a, b) => a + Math.pow(b - media, 2), 0) / valores.length)
  const variacao = media > 0 ? desvio / media : 0
  
  return Math.max(0, 1 - variacao)
}

// 6. Insights
const insights = computed(() => {
  if (!temDadosSuficientes.value) return []
  
  const lista = []
  const score = scoreFinanceiro.value
  const economia = indicadores.value.economia
  const moradia = indicadores.value.moradia
  const reserva = indicadores.value.reserva
  
  if (economia < 10 && score > 0) {
    lista.push({
      icone: '💰',
      tipo: 'alerta',
      texto: `Sua capacidade de economia está em ${economia}%, abaixo do ideal (20%)`,
      dica: 'Que tal cortar gastos supérfluos e aumentar sua economia?'
    })
  } else if (economia >= 20) {
    lista.push({
      icone: '🌟',
      tipo: 'sucesso',
      texto: `Excelente! Você economiza ${economia}% da sua renda`,
      dica: 'Continue assim! Considere investir esse dinheiro'
    })
  }
  
  if (moradia > 50) {
    lista.push({
      icone: '🏠',
      tipo: 'alerta',
      texto: `Moradia consome ${moradia}% da sua renda, muito acima do ideal (30%)`,
      dica: 'Reavalie seu aluguel/financiamento ou considere dividir moradia'
    })
  } else if (moradia > 30 && moradia <= 50) {
    lista.push({
      icone: '📊',
      tipo: 'atencao',
      texto: `Moradia consome ${moradia}% da sua renda, um pouco acima do ideal`,
      dica: 'Tente negociar o aluguel ou reduzir gastos com contas'
    })
  }
  
  if (reserva < 3) {
    lista.push({
      icone: '🛡️',
      tipo: 'alerta',
      texto: `Sua reserva de emergência é de apenas ${reserva} meses`,
      dica: 'Comece a guardar R$ 100/mês para construir sua reserva'
    })
  } else if (reserva >= 6) {
    lista.push({
      icone: '🛡️',
      tipo: 'sucesso',
      texto: `Excelente! Você tem ${reserva} meses de reserva de emergência`,
      dica: 'Considere investir parte dessa reserva'
    })
  }
  
  const numCategorias = Object.keys(despesasPorCategoria.value).length
  if (numCategorias < 3 && totalDespesas.value > 0) {
    lista.push({
      icone: '📊',
      tipo: 'atencao',
      texto: `Seus gastos estão concentrados em apenas ${numCategorias} categorias`,
      dica: 'Tente diversificar seus gastos para melhor controle'
    })
  }
  
  if (score < 40 && score > 0) {
    lista.push({
      icone: '📉',
      tipo: 'alerta',
      texto: `Sua saúde financeira está em ${score}/100, precisa de atenção`,
      dica: 'Siga as recomendações acima para melhorar sua situação'
    })
  }
  
  const lazerTotal = transacoesFiltradas.value
    .filter(t => t.tipo === 'despesa' && t.categoria === 'Lazer')
    .reduce((acc, t) => acc + t.valor, 0)
  
  if (lazerTotal > 0 && totalDespesas.value > 0) {
    const lazerPercent = (lazerTotal / totalDespesas.value) * 100
    if (lazerPercent > 30) {
      lista.push({
        icone: '🎮',
        tipo: 'atencao',
        texto: `Lazer representa ${lazerPercent.toFixed(1)}% das suas despesas`,
        dica: 'Tente reduzir gastos com lazer e redirecionar para investimentos'
      })
    }
  }
  
  return lista.slice(0, 5)
})

// 7. Previsão de Saldo (6 meses)
const previsao = computed(() => {
  if (!temDadosSuficientes.value) {
    return Array(6).fill({ mes: '---', valor: '0.00', altura: 5, cor: '#ccc' })
  }
  
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
  const economiarMensal = economiaMensal.value
  const saldoAtual = saldo.value
  
  return meses.map((mes, index) => {
    const valor = saldoAtual + (economiarMensal * (index + 1))
    const maxValor = Math.max(saldoAtual + (economiarMensal * 6), 1000)
    const altura = Math.max((valor / maxValor) * 100, 5)
    
    let cor = '#2ecc71'
    if (valor < 0) cor = '#e74c3c'
    else if (valor < 500) cor = '#f39c12'
    
    return {
      mes,
      valor: valor.toFixed(2),
      altura: Math.min(altura, 100),
      cor
    }
  })
})

// 8. Economia Mensal
const economiaMensal = computed(() => {
  if (!temDadosSuficientes.value || transacoesFiltradas.value.length === 0) return 0
  return saldo.value / Math.max(1, transacoesFiltradas.value.length)
})

// 9. Tempo para Meta (R$ 10.000)
const tempoParaMeta = computed(() => {
  if (!temDadosSuficientes.value) return '📊 Sem dados'
  
  const economia = economiaMensal.value
  if (economia <= 0) return '🚨 Sem economia'
  
  const meta = 10000
  const saldoAtual = saldo.value
  if (saldoAtual >= meta) return '🎯 Meta atingida!'
  
  const meses = (meta - saldoAtual) / economia
  if (meses < 1) return `${Math.round(meses * 30)} dias`
  if (meses < 12) return `${Math.round(meses)} meses`
  return `${Math.round(meses / 12)} anos e ${Math.round(meses % 12)} meses`
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

const atualizarDados = () => {}

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

watch(mesSelecionado, () => {})
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

.saude-financeira {
  margin-top: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.saude-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.saude-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.saude-subtitulo {
  color: #666;
  margin: 0.3rem 0 0 0;
  font-size: 0.95rem;
}

.saude-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.score-number {
  font-size: 1.8rem;
  line-height: 1;
}

.score-label {
  font-size: 0.7rem;
  opacity: 0.7;
}

.score-excelente {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.score-bom {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.score-regular {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
}

.score-atencao {
  background: linear-gradient(135deg, #e67e22, #d35400);
  color: white;
}

.score-critico {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.score-indisponivel {
  background: linear-gradient(135deg, #95a5a6, #7f8c8d);
  color: white;
}

.score-status {
  margin-top: 0.3rem;
  font-weight: 600;
  color: #333;
}

/* ⭐ SEM DADOS */
.sem-dados {
  border-color: #f1c40f;
  background: #fffef5;
}

.sem-dados-content {
  text-align: center;
  padding: 1.5rem;
}

.sem-dados-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.sem-dados-titulo {
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.sem-dados-texto {
  color: #666;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.sem-dados-subtexto {
  color: #888;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.sem-dados-lista {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 1.5rem 0;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.sem-dados-lista li {
  color: #555;
  font-size: 0.9rem;
}

.sem-dados-botao {
  display: inline-block;
  background: linear-gradient(45deg, #3498db, #2980b9);
  color: white;
  padding: 0.8rem 2rem;
  border-radius: 0.8rem;
  text-decoration: none;
  font-weight: 600;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.sem-dados-botao:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
}

/* Indicadores Grid */
.indicadores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.indicador-card {
  background: white;
  padding: 1.2rem;
  border-radius: 0.8rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.3s ease;
}

.indicador-card:hover {
  transform: translateY(-4px);
}

.indicador-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  flex-shrink: 0;
}

.indicador-info {
  flex: 1;
}

.indicador-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.3rem;
}

.indicador-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.indicador-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.6s ease;
}

.indicador-valor {
  font-weight: 700;
  font-size: 0.9rem;
  color: #333;
  margin-right: 0.5rem;
}

.indicador-detalhe {
  font-size: 0.75rem;
  color: #888;
}

/* Insights */
.insights-container {
  background: white;
  border-radius: 0.8rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.insights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #333;
}

.insights-count {
  background: #e9ecef;
  padding: 0.2rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #666;
}

.nenhum-insight {
  text-align: center;
  padding: 1rem;
  color: #2ecc71;
  font-weight: 600;
}

.insight-item {
  display: flex;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: flex-start;
}

.insight-item:last-child {
  margin-bottom: 0;
}

.insight-item.sucesso {
  background: #d4edda;
  border-left: 4px solid #28a745;
}

.insight-item.atencao {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
}

.insight-item.alerta {
  background: #f8d7da;
  border-left: 4px solid #dc3545;
}

.insight-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.insight-content {
  flex: 1;
}

.insight-texto {
  margin: 0 0 0.2rem 0;
  font-weight: 500;
  color: #333;
}

.insight-dica {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

/* Previsão */
.previsao-container {
  background: white;
  border-radius: 0.8rem;
  padding: 1.5rem;
}

.previsao-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-weight: 600;
  color: #333;
}

.previsao-periodo {
  font-size: 0.8rem;
  color: #888;
  font-weight: 400;
}

.previsao-grafico {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
  gap: 0.5rem;
}

.previsao-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}

.previsao-label {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
}

.previsao-bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 50px;
}

.previsao-bar {
  width: 80%;
  min-height: 20px;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: height 0.6s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.previsao-valor {
  font-size: 0.65rem;
  color: white;
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  position: absolute;
  top: -18px;
  white-space: nowrap;
}

.previsao-resumo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.previsao-cenario {
  display: flex;
  flex-direction: column;
}

.cenario-label {
  font-size: 0.8rem;
  color: #888;
}

.cenario-valor {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
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

  .saude-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .indicadores-grid {
    grid-template-columns: 1fr;
  }

  .previsao-grafico {
    height: 150px;
  }

  .previsao-resumo {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .previsao-valor {
    font-size: 0.5rem;
    top: -14px;
  }

  .sem-dados-lista {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .resumo-mensal {
    grid-template-columns: 1fr;
  }

  .score-circle {
    width: 60px;
    height: 60px;
  }

  .score-number {
    font-size: 1.4rem;
  }

  .saude-financeira {
    padding: 1rem;
  }

  .insight-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>