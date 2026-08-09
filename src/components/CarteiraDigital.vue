<template>
  <div class="container">
    <h1>Gerenciar Carteira</h1>

    <!-- FORMULÁRIO PARA ADICIONAR/EDITAR -->
    <div class="card">
      <h2>{{ isEditing ? '✏️ Editar Transação' : '➕ Adicionar Transação' }}</h2>
      <form @submit.prevent="salvarTransacao">
        <div class="form-row">
          <div class="form-group">
            <label>Descrição</label>
            <input 
              type="text" 
              v-model="form.descricao" 
              placeholder="Ex: Supermercado" 
              required
            >
          </div>

          <div class="form-group">
            <label>Valor (R$)</label>
            <input 
              type="number" 
              v-model.number="form.valor" 
              placeholder="0,00" 
              required
              min="0.01"
              step="0.01"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Data</label>
            <input 
              type="date" 
              v-model="form.data" 
              required
            >
          </div>

          <div class="form-group">
            <label>Tipo</label>
            <select v-model="form.tipo" required>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>

          <div class="form-group">
            <label>Categoria</label>
            <select v-model="form.categoria" required>
              <option disabled value="">Selecione</option>
              <option v-for="cat in categorias" :key="cat">{{ cat }}</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="salvando">
            {{ salvando ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Transação' }}
          </button>
          <button 
            v-if="isEditing" 
            @click="cancelarEdicao" 
            type="button" 
            class="btn-secondary"
          >
            Cancelar
          </button>
        </div>

        <div v-if="mensagem" :class="['mensagem', tipoMensagem]">
          {{ mensagem }}
        </div>
      </form>
    </div>

    <!-- LISTA DE TRANSAÇÕES COM PAGINAÇÃO E PESQUISA -->
    <div class="card">
      <div class="lista-header">
        <h2>📋 Transações</h2>
        
        <!-- CONTROLES: PESQUISA + ITENS POR PÁGINA -->
        <div class="controls-wrapper">
          <!-- BARRA DE PESQUISA -->
          <div class="search-box">
            <input 
              type="text" 
              v-model="termoBusca" 
              placeholder="🔍 Buscar transação..."
              class="search-input"
            >
            <button 
              v-if="termoBusca" 
              @click="limparBusca" 
              class="clear-search"
              title="Limpar busca"
            >
              ✕
            </button>
          </div>

          <div class="pagination-controls">
            <div class="items-per-page">
              <label>Itens por página:</label>
              <select v-model="itensPorPagina" @change="paginaAtual = 1">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- INFO DE PAGINAÇÃO COM RESULTADOS DA BUSCA -->
      <div class="pagination-info">
        <span>
          <span v-if="termoBusca" class="busca-info">
            🔍 Resultados para "<strong>{{ termoBusca }}</strong>": 
          </span>
          Mostrando {{ inicio }} - {{ fim }} de {{ transacoesFiltradas.length }} transações
          <span v-if="termoBusca && transacoesFiltradas.length === 0" class="sem-resultados">
            (Nenhum resultado encontrado)
          </span>
        </span>
        <span v-if="transacoesFiltradas.length > 0">
          Página {{ paginaAtual }} de {{ totalPaginas }}
        </span>
      </div>

      <div v-if="carregando" class="loading">
        ⏳ Carregando transações...
      </div>

      <div v-else>
        <!-- MENSAGEM QUANDO NÃO TEM NENHUMA TRANSAÇÃO -->
        <div v-if="transacoes.length === 0" class="vazio">
          📭 Nenhuma transação cadastrada.
        </div>

        <!-- MENSAGEM QUANDO A BUSCA NÃO ENCONTRA NADA -->
        <div v-else-if="transacoesFiltradas.length === 0" class="vazio">
          🔍 Nenhuma transação encontrada para "<strong>{{ termoBusca }}</strong>"
        </div>
        
        <!-- LISTA DE TRANSAÇÕES -->
        <ul v-else class="lista">
          <li v-for="item in transacoesPaginadas" :key="item.id" class="item">
            <div class="info">
              <!-- DESTACA O TEXTO DA BUSCA -->
              <p class="text-show-item" v-html="destacarTexto(item.descricao)"></p>
              <span class="categoria">{{ item.categoria }}</span>
              <span class="data">{{ formatarData(item.data) }}</span>
            </div>
            <div class="valor">
              <span :style="{ color: item.tipo === 'receita' ? '#27ae60' : '#e74c3c', fontWeight: 'bold', fontSize:'12px'}">
                {{ item.tipo === 'receita' ? '+' : '-' }} R$ {{ item.valor?.toFixed(2) }}
              </span>
            </div>
            <div class="acoes">
              <button @click="iniciarEdicao(item)" class="btn-edit" title="Editar">✏️</button>
              <button @click="excluirTransacao(item.id, item.descricao)" class="btn-delete" title="Excluir">🗑️</button>
            </div>
          </li>
        </ul>

        <!-- BOTÕES DE PAGINAÇÃO -->
        <div v-if="totalPaginas > 1" class="pagination-buttons">
          <button 
            @click="paginaAtual = 1" 
            :disabled="paginaAtual === 1"
            class="page-btn"
          >
            ⏮
          </button>
          <button 
            @click="paginaAtual--" 
            :disabled="paginaAtual === 1"
            class="page-btn"
          >
            ◀
          </button>
          
          <span class="page-info">{{ paginaAtual }} / {{ totalPaginas }}</span>
          
          <button 
            @click="paginaAtual++" 
            :disabled="paginaAtual === totalPaginas"
            class="page-btn"
          >
            ▶
          </button>
          <button 
            @click="paginaAtual = totalPaginas" 
            :disabled="paginaAtual === totalPaginas"
            class="page-btn"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  collection, addDoc, onSnapshot, 
  doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

// --- ESTADO ---
const transacoes = ref([])
const categorias = ref(['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Salário'])
const carregando = ref(true)
const userLogado = ref(false)
const salvando = ref(false)
const mensagem = ref('')
const tipoMensagem = ref('')
const editingId = ref(null)

// --- PAGINAÇÃO ---
const itensPorPagina = ref(5)
const paginaAtual = ref(1)

// --- PESQUISA ---
const termoBusca = ref('')

// Formulário
const form = reactive({
  descricao: '',
  valor: null,
  data: new Date().toISOString().split('T')[0],
  tipo: 'despesa',
  categoria: ''
})

// Computed
const isEditing = computed(() => editingId.value !== null)

// --- COMPUTEDS DE FILTRO E PAGINAÇÃO ---
const transacoesFiltradas = computed(() => {
  if (!termoBusca.value) {
    return transacoes.value
  }
  
  const termo = termoBusca.value.toLowerCase().trim()
  return transacoes.value.filter(t => 
    t.descricao.toLowerCase().includes(termo)
  )
})

const totalPaginas = computed(() => {
  return Math.ceil(transacoesFiltradas.value.length / itensPorPagina.value)
})

const inicio = computed(() => {
  return transacoesFiltradas.value.length === 0 ? 0 : (paginaAtual.value - 1) * itensPorPagina.value + 1
})

const fim = computed(() => {
  const fimCalculado = paginaAtual.value * itensPorPagina.value
  return Math.min(fimCalculado, transacoesFiltradas.value.length)
})

const transacoesPaginadas = computed(() => {
  const inicioSlice = (paginaAtual.value - 1) * itensPorPagina.value
  const fimSlice = inicioSlice + itensPorPagina.value
  return transacoesFiltradas.value.slice(inicioSlice, fimSlice)
})

// --- WATCH PARA RESETAR PÁGINA ---
watch(itensPorPagina, () => {
  paginaAtual.value = 1
})

watch(termoBusca, () => {
  paginaAtual.value = 1
})

// --- FUNÇÕES ---
const formatarData = (data) => {
  if (!data) return ''
  const partes = data.split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const limparBusca = () => {
  termoBusca.value = ''
}

const destacarTexto = (texto) => {
  if (!termoBusca.value || !texto) return texto
  
  const termo = termoBusca.value.toLowerCase().trim()
  const textoLower = texto.toLowerCase()
  
  if (!textoLower.includes(termo)) return texto
  
  const index = textoLower.indexOf(termo)
  const antes = texto.substring(0, index)
  const encontrado = texto.substring(index, index + termo.length)
  const depois = texto.substring(index + termo.length)
  
  return `${antes}<span class="destaque">${encontrado}</span>${depois}`
}

const mostrarMensagem = (texto, tipo) => {
  mensagem.value = texto
  tipoMensagem.value = tipo
  setTimeout(() => {
    mensagem.value = ''
    tipoMensagem.value = ''
  }, 4000)
}

const resetForm = () => {
  form.descricao = ''
  form.valor = null
  form.data = new Date().toISOString().split('T')[0]
  form.tipo = 'despesa'
  form.categoria = ''
  editingId.value = null
}

const cancelarEdicao = resetForm

// --- SALVAR (ADICIONAR/EDITAR) ---
const salvarTransacao = async () => {
  if (!form.descricao || !form.valor || !form.categoria || !form.data) {
    mostrarMensagem('❌ Preencha todos os campos!', 'erro')
    return
  }

  if (form.valor <= 0) {
    mostrarMensagem('❌ Valor deve ser maior que zero!', 'erro')
    return
  }

  const user = auth.currentUser
  if (!user) {
    mostrarMensagem('❌ Faça login!', 'erro')
    return
  }

  salvando.value = true

  try {
    const dados = {
      descricao: form.descricao,
      valor: form.valor,
      data: form.data,
      tipo: form.tipo,
      categoria: form.categoria
    }

    if (isEditing.value) {
      const transacaoRef = doc(db, 'carteiraDigital', user.uid, 'transacoes', editingId.value)
      await updateDoc(transacaoRef, dados)
      mostrarMensagem('✅ Transação editada com sucesso!', 'sucesso')
    } else {
      const transacoesRef = collection(db, 'carteiraDigital', user.uid, 'transacoes')
      await addDoc(transacoesRef, { ...dados, createdAt: serverTimestamp() })
      mostrarMensagem('✅ Transação adicionada com sucesso!', 'sucesso')
    }

    resetForm()
  } catch (error) {
    console.error('Erro ao salvar:', error)
    mostrarMensagem('❌ Erro: ' + error.message, 'erro')
  } finally {
    salvando.value = false
  }
}

// --- INICIAR EDIÇÃO ---
const iniciarEdicao = (transacao) => {
  editingId.value = transacao.id
  form.descricao = transacao.descricao
  form.valor = transacao.valor
  form.data = transacao.data
  form.tipo = transacao.tipo
  form.categoria = transacao.categoria
  
  document.querySelector('.card')?.scrollIntoView({ 
    behavior: 'smooth' 
  })
}

// --- EXCLUIR TRANSAÇÃO ---
const excluirTransacao = async (id, descricao) => {
  if (!confirm(`⚠️ Tem certeza que deseja excluir a transação "${descricao}"?`)) {
    return
  }

  const user = auth.currentUser
  if (!user) {
    mostrarMensagem('❌ Faça login!', 'erro')
    return
  }

  try {
    const transacaoRef = doc(db, 'carteiraDigital', user.uid, 'transacoes', id)
    await deleteDoc(transacaoRef)
    mostrarMensagem('✅ Transação excluída com sucesso!', 'sucesso')
  } catch (error) {
    console.error('Erro ao excluir:', error)
    mostrarMensagem('❌ Erro ao excluir: ' + error.message, 'erro')
  }
}

// --- BUSCAR TRANSAÇÕES ---
const buscarTransacoes = async (user) => {
  console.log('🔵 Buscando transações...')
  carregando.value = true
  
  try {
    const userRef = doc(db, 'carteiraDigital', user.uid)
    const docSnap = await getDoc(userRef)
    
    if (docSnap.exists() && docSnap.data().categorias) {
      categorias.value = docSnap.data().categorias
    }

    const transacoesRef = collection(db, 'carteiraDigital', user.uid, 'transacoes')
    
    onSnapshot(transacoesRef, (snapshot) => {
      console.log('🔵 Transações atualizadas:', snapshot.docs.length)
      transacoes.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      carregando.value = false
    }, (error) => {
      console.error('❌ Erro no listener:', error)
      carregando.value = false
    })

  } catch (error) {
    console.error('❌ Erro ao buscar:', error)
    carregando.value = false
  }
}

// --- CICLO DE VIDA ---
let unsubscribe = () => {}

onMounted(() => {
  console.log('🟢 Componente montado')
  
  unsubscribe = onAuthStateChanged(auth, (user) => {
    console.log('🟢 Auth:', user ? 'logado' : 'deslogado')
    
    if (user) {
      userLogado.value = true
      buscarTransacoes(user)
    } else {
      userLogado.value = false
      transacoes.value = []
      carregando.value = false
    }
  })
})

onUnmounted(() => {
  console.log('🔴 Desmontado')
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 500px){
  .container{
    padding:2rem .9rem;
  }
}

h1 {
  color: #1a1a1a;
  margin-bottom: 2rem;
  font-size: 2.5rem;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

@media (max-width:475px){
  .card{
        padding: 20px 6px;
  }
}

.card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  color: #333;
}

/* Formulário */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 0.3rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-primary {
  flex: 1;
  padding: 0.75rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.mensagem {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
}

.mensagem.sucesso {
  background: #d4edda;
  color: #155724;
}

.mensagem.erro {
  background: #f8d7da;
  color: #721c24;
}

/* Lista */
.lista-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.controls-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* BARRA DE PESQUISA */
.search-box {
  display: flex;
  align-items: center;
  position: relative;
}

.search-input {
  padding: 0.5rem 2.2rem 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  min-width: 220px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.clear-search {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #999;
  padding: 0.2rem 0.4rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.clear-search:hover {
  color: #e74c3c;
  background: #fde8e8;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.items-per-page label {
  font-size: 0.9rem;
  color: #555;
}

.items-per-page select {
  padding: 0.3rem 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.busca-info {
  color: #3498db;
}

.sem-resultados {
  color: #e74c3c;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.vazio {
  text-align: center;
  padding: 2rem;
  color: #999;
  font-size: 1.1rem;
}

.lista {
  list-style: none;
  padding: 0;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  gap: 1rem;
  transition: background 0.2s;
}

@media (max-width:475px){
  .item{
    display:grid;
    grid-template-columns: 1fr 1fr;
  }
}

.item:hover {
  background: #f8f9fa;
  border-radius: 8px;
}

.info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

/* DESTAQUE DA BUSCA */

.text-show-item{
  text-transform: uppercase;
  font-weight:bold;
}


@media (max-width:500px){
  .text-show-item{
    font-size:12px;
  }
}

.destaque {
  background: #ffeb3b;
  padding: 0.1rem 0.2rem;
  border-radius: 2px;
  font-weight: bold;
}

.categoria {
  background: #f0f4f8;
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #555;
}

.data {
  color: #999;
  font-size: 0.85rem;
}

.valor {
  font-size: 1.05rem;
}



.acoes {
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

@media (max-width:500px){
  .btn-edit, .btn-delete{
    font-size:0.9rem;
}
}

.btn-edit:hover {
  background: #e3f2fd;
  transform: scale(1.1);
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #fde8e8;
  transform: scale(1.1);
}

/* Paginação */
.pagination-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.page-btn {
  padding: 0.4rem 0.8rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

@media (max-width:475px){
  .page-btn{
     padding: .4rem .6rem;
  }
}

.page-btn:hover:not(:disabled) {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  padding: 0.4rem 1rem;
  font-weight: 600;
  color: #333;
  min-width: 60px;
  text-align: center;
}

/* Responsivo */


@media (max-width:475px){
  .page-info{ 
    font-size:15px;
  }
}

@media (max-width: 768px) {
  .controls-wrapper {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .search-input {
    width: 100%;
    min-width: unset;
  }

  .pagination-controls {
    justify-content: space-between;
  }

  .pagination-info {
    flex-direction: column;
    align-items: center;
  }
}
</style>