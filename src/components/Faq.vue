<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from '../firebase'

/* =========================================================
   TIPOS
========================================================= */

interface Mensagem {
  id: string
  tipo: 'usuario' | 'ia' | 'sistema'
  texto: string
  horario: string
  timestamp: Timestamp
  opcoes?: Conhecimento[]
  tags?: string[]
}

interface Conhecimento {
  id: string
  pergunta: string
  resposta: string
  palavrachave: string[]
  categoria?: string
  criadorId?: string
  criadorEmail?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

interface ResultadoRelevancia {
  conhecimento: Conhecimento
  percentual: number
}

interface TermoBusca {
  termo: string
  data: Timestamp
}

// 🔥 TIPO PARA O OBJETO DE COMANDOS
interface Comando {
  descricao: string
  acao: () => { texto: string; tags: string[] } | null
}


/* =========================================================
   ESTADO - CHAT
========================================================= */

const mensagens = ref<Mensagem[]>([
  {
    id: '1',
    tipo: 'sistema',
    texto: '👋 Olá! Como posso ajudar você hoje?',
    horario: obterHorario(),
    timestamp: Timestamp.now()
  }
])

const mensagem = ref('')
const digitando = ref(false)
const chatContainer = ref<HTMLElement | null>(null)


/* =========================================================
   ESTADO - CONHECIMENTOS
========================================================= */

const conhecimentos = ref<Conhecimento[]>([])
const carregando = ref(true)
const erro = ref<string | null>(null)
const usuarioAtual = ref<any>(null)
const statusConexao = ref('Conectando...')


/* =========================================================
   ESTADO - TERMOS MAIS BUSCADOS
========================================================= */

const termosBuscados = ref<TermoBusca[]>([])
const MAX_TERMOS = 10


/* =========================================================
   ESTADO - MODAL CRUD
========================================================= */

const mostrarModal = ref(false)
const editandoId = ref<string | null>(null)
const formPergunta = ref('')
const formResposta = ref('')
const formPalavrachave = ref('')
const formCategoria = ref('')


/* =========================================================
   FIREBASE - CONFIGURAÇÃO
========================================================= */

const collectionName = 'baseconhecimento'
const conhecimentosCollection = collection(db, collectionName)
const auth = getAuth()
let unsubscribe: (() => void) | null = null
let unsubscribeAuth: (() => void) | null = null


/* =========================================================
   🔥 COMANDOS ESPECIAIS - CORRIGIDO
========================================================= */

// 🔥 Usando Record<string, Comando> para permitir indexação com string
const comandos: Record<string, Comando> = {
  'kkk': {
    descricao: 'Mostra o histórico de buscas como tags',
    acao: mostrarHistoricoTags
  },
  'historico': {
    descricao: 'Mostra o histórico de buscas como tags',
    acao: mostrarHistoricoTags
  },
  'help': {
    descricao: 'Mostra os comandos disponíveis',
    acao: mostrarAjuda
  },
  'ajuda': {
    descricao: 'Mostra os comandos disponíveis',
    acao: mostrarAjuda
  },
  'limpar': {
    descricao: 'Limpa o histórico de buscas',
    acao: limparHistoricoComando
  },
  'clear': {
    descricao: 'Limpa o histórico de buscas',
    acao: limparHistoricoComando
  }
}

// 🔥 FUNÇÕES DOS COMANDOS
function mostrarHistoricoTags(): { texto: string; tags: string[] } | null {
  if (termosBuscados.value.length === 0) {
    return {
      texto: '📭 Nenhuma busca realizada ainda.\n\nDigite algo para começar a buscar!',
      tags: []
    }
  }
  
  const termos = termosBuscados.value.map(item => item.termo)
  const termosUnicos = [...new Set(termos)]
  const tags = termosUnicos.slice(0, 10)
  
  let texto = '📜 **HISTÓRICO DE BUSCAS**\n\n'
  texto += `Encontrei ${termosBuscados.value.length} busca(s) realizadas.\n\n`
  texto += '🔽 **Clique nos termos abaixo para buscar novamente:**'
  
  return { texto, tags }
}

function mostrarAjuda(): { texto: string; tags: string[] } | null {
  let texto = '📚 **COMANDOS DISPONÍVEIS**\n\n'
  texto += 'Digite um dos comandos abaixo:\n\n'
  
  for (const [comando, info] of Object.entries(comandos)) {
    texto += `🔹 **${comando}** - ${info.descricao}\n`
  }
  
  texto += '\n💡 Dica: Digite "kkk" para ver seu histórico rapidamente!'
  
  return { texto, tags: [] }
}

function limparHistoricoComando(): { texto: string; tags: string[] } | null {
  termosBuscados.value = []
  try {
    localStorage.removeItem('termos_buscados')
  } catch (e) {
    // Ignora
  }
  return { texto: '🧹 Histórico de buscas limpo com sucesso!', tags: [] }
}

// 🔥 PROCESSADOR DE COMANDO - CORRIGIDO
function processarComando(comando: string): { texto: string; tags: string[] } | null {
  const cmd = comando.toLowerCase().trim()
  
  // 🔥 Usa 'in' para verificar se a chave existe no objeto
  if (cmd in comandos) {
    const comandoEncontrado = comandos[cmd]
    return comandoEncontrado.acao()
  }
  
  return null
}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function initAuth() {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      usuarioAtual.value = user
      statusConexao.value = `👤 ${user.email}`
      console.log('✅ Usuário autenticado:', user.email)
    } else {
      usuarioAtual.value = null
      statusConexao.value = '👤 Visitante'
      console.log('⚠️ Usuário não autenticado')
    }
  })
}


/* =========================================================
   CARREGAR CONHECIMENTOS
========================================================= */

function carregarConhecimentos() {
  carregando.value = true
  
  try {
    const conhecimentosQuery = query(conhecimentosCollection, orderBy('createdAt', 'desc'))
    
    unsubscribe = onSnapshot(conhecimentosQuery, 
      (snapshot) => {
        console.log('📦 Conhecimentos carregados:', snapshot.size)
        
        if (snapshot.empty) {
          conhecimentos.value = []
          carregando.value = false
          adicionarConhecimentosPadrao()
          return
        }
        
        conhecimentos.value = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            pergunta: data.pergunta || '',
            resposta: data.resposta || '',
            palavrachave: data.palavrachave || [],
            categoria: data.categoria || 'Geral',
            criadorId: data.criadorId,
            criadorEmail: data.criadorEmail,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          }
        })
        carregando.value = false
        erro.value = null
      },
      (error) => {
        console.error('❌ Erro ao carregar conhecimentos:', error)
        erro.value = `Erro: ${error.message}`
        carregando.value = false
      }
    )
  } catch (error: any) {
    console.error('❌ Erro:', error)
    erro.value = `Erro: ${error.message}`
    carregando.value = false
  }
}

async function adicionarConhecimentosPadrao() {
  const conhecimentosPadrao = [
    {
      pergunta: 'Como reativar um processo?',
      resposta: 'Para reativar um processo, siga os passos:\n\n1. Acesse o sistema\n2. Busque o processo pelo número\n3. Clique em "Reativar"\n4. Informe o motivo\n5. Confirme a reativação',
      palavrachave: ['reativar', 'reativação', 'processo', 'suspenso', 'arquivado'],
      categoria: 'Processos'
    },
    {
      pergunta: 'Como cancelar um serviço?',
      resposta: 'Para cancelar um serviço:\n\n1. Acesse sua conta\n2. Vá em "Meus Serviços"\n3. Selecione o serviço\n4. Clique em "Cancelar"\n5. Confirme o cancelamento',
      palavrachave: ['cancelar', 'cancelamento', 'serviço', 'contrato'],
      categoria: 'Serviços'
    },
    {
      pergunta: 'O que é Vue.js?',
      resposta: 'Vue.js é um framework JavaScript progressivo para construir interfaces de usuário.',
      palavrachave: ['vue', 'vuejs', 'framework', 'javascript', 'frontend'],
      categoria: 'Programação'
    },
    {
      pergunta: 'Como funciona a busca?',
      resposta: 'A busca analisa 3 campos: Pergunta, Resposta e Palavras-chave.',
      palavrachave: ['busca', 'pesquisa', 'relevância'],
      categoria: 'Sistema'
    }
  ]
  
  for (const item of conhecimentosPadrao) {
    try {
      await addDoc(conhecimentosCollection, {
        ...item,
        criadorId: 'sistema',
        criadorEmail: 'sistema@assistente.com',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Erro ao adicionar conhecimento padrão:', error)
    }
  }
}


/* =========================================================
   CRUD - CONHECIMENTOS
========================================================= */

async function adicionarConhecimento(pergunta: string, resposta: string, palavras: string[], categoria?: string) {
  try {
    const docRef = await addDoc(conhecimentosCollection, {
      pergunta,
      resposta,
      palavrachave: palavras,
      categoria: categoria || 'Geral',
      criadorId: usuarioAtual.value?.uid || 'anonimo',
      criadorEmail: usuarioAtual.value?.email || 'anonimo',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    return docRef.id
  } catch (error: any) {
    console.error('❌ Erro ao adicionar:', error)
    throw error
  }
}

async function atualizarConhecimento(id: string, pergunta: string, resposta: string, palavras: string[], categoria?: string) {
  try {
    const docRef = doc(db, collectionName, id)
    await updateDoc(docRef, {
      pergunta,
      resposta,
      palavrachave: palavras,
      categoria: categoria || 'Geral',
      updatedAt: Timestamp.now()
    })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar:', error)
    throw error
  }
}

async function deletarConhecimento(id: string) {
  try {
    const docRef = doc(db, collectionName, id)
    await deleteDoc(docRef)
  } catch (error: any) {
    console.error('❌ Erro ao deletar:', error)
    throw error
  }
}


/* =========================================================
   SISTEMA DE BUSCA
========================================================= */

function obterHorario(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;:()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function obterPalavras(texto: string): string[] {
  return normalizarTexto(texto)
    .split(' ')
    .filter(palavra => palavra.length >= 2)
}

function obterPartesPalavras(texto: string): string[] {
  const palavras = obterPalavras(texto)
  const partes: string[] = []
  
  palavras.forEach(palavra => {
    for (let i = 3; i <= palavra.length; i++) {
      partes.push(palavra.substring(0, i))
    }
  })
  
  return [...new Set(partes)]
}

function buscarConhecimentos(perguntaUsuario: string): Conhecimento[] {
  const palavrasUsuario = obterPalavras(perguntaUsuario)
  const partesUsuario = obterPartesPalavras(perguntaUsuario)
  const perguntaNormalizada = normalizarTexto(perguntaUsuario)
  
  const resultados: ResultadoRelevancia[] = []
  
  conhecimentos.value.forEach(conhecimento => {
    const palavrasPergunta = obterPalavras(conhecimento.pergunta)
    const palavrasResposta = obterPalavras(conhecimento.resposta)
    const palavrasChave = conhecimento.palavrachave.flatMap(p => obterPalavras(p))
    
    const perguntaConhecimentoNormalizada = normalizarTexto(conhecimento.pergunta)
    
    let matchPergunta = 0
    let matchResposta = 0
    let matchPalavrasChave = 0
    let totalPergunta = 0
    let totalResposta = 0
    let totalPalavrasChave = 0
    
    // BUSCA NA PERGUNTA (Peso 3)
    if (perguntaNormalizada === perguntaConhecimentoNormalizada) {
      matchPergunta = 30
      totalPergunta = 30
    } else {
      palavrasPergunta.forEach(palavraPergunta => {
        totalPergunta += 3
        const encontrou = palavrasUsuario.some(palavraUsuario => 
          palavraUsuario === palavraPergunta
        )
        if (encontrou) {
          matchPergunta += 3
        }
      })
      
      palavrasPergunta.forEach(palavraPergunta => {
        partesUsuario.forEach(parte => {
          if (palavraPergunta.startsWith(parte) || parte.startsWith(palavraPergunta)) {
            matchPergunta += 2
            totalPergunta += 2
          }
        })
      })
    }
    
    // BUSCA NA RESPOSTA (Peso 2)
    palavrasResposta.forEach(palavraResposta => {
      totalResposta += 2
      const encontrou = palavrasUsuario.some(palavraUsuario => 
        palavraUsuario === palavraResposta
      )
      if (encontrou) {
        matchResposta += 2
      }
    })
    
    palavrasResposta.forEach(palavraResposta => {
      partesUsuario.forEach(parte => {
        if (palavraResposta.startsWith(parte) || parte.startsWith(palavraResposta)) {
          matchResposta += 1
          totalResposta += 1
        }
      })
    })
    
    // BUSCA NAS PALAVRAS-CHAVE (Peso 5)
    palavrasChave.forEach(palavraChave => {
      totalPalavrasChave += 5
      const encontrou = palavrasUsuario.some(palavraUsuario => 
        palavraUsuario === palavraChave
      )
      if (encontrou) {
        matchPalavrasChave += 5
      }
    })
    
    palavrasChave.forEach(palavraChave => {
      partesUsuario.forEach(parte => {
        if (palavraChave.startsWith(parte) || parte.startsWith(palavraChave)) {
          matchPalavrasChave += 3
          totalPalavrasChave += 3
        }
      })
    })
    
    // CALCULA PERCENTUAIS
    const pPergunta = totalPergunta > 0 ? Math.round((matchPergunta / totalPergunta) * 100) : 0
    const pResposta = totalResposta > 0 ? Math.round((matchResposta / totalResposta) * 100) : 0
    const pPalavrasChave = totalPalavrasChave > 0 ? Math.round((matchPalavrasChave / totalPalavrasChave) * 100) : 0
    
    const total = (pPergunta * 3 + pResposta * 2 + pPalavrasChave * 5) / 10
    
    if (total > 0) {
      resultados.push({
        conhecimento,
        percentual: Math.round(total)
      })
    }
  })
  
  resultados.sort((a, b) => b.percentual - a.percentual)
  
  return resultados.slice(0, 5).map(r => r.conhecimento)
}


/* =========================================================
   GERENCIAR TERMOS MAIS BUSCADOS
========================================================= */

function adicionarTermoBuscado(termo: string) {
  termosBuscados.value = termosBuscados.value.filter(t => t.termo !== termo)
  
  termosBuscados.value.unshift({
    termo: termo,
    data: Timestamp.now()
  })
  
  if (termosBuscados.value.length > MAX_TERMOS) {
    termosBuscados.value = termosBuscados.value.slice(0, MAX_TERMOS)
  }
  
  try {
    localStorage.setItem('termos_buscados', JSON.stringify(termosBuscados.value))
  } catch (e) {
    // Ignora
  }
}

function carregarTermosBuscados() {
  try {
    const saved = localStorage.getItem('termos_buscados')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        termosBuscados.value = parsed
        return
      }
    }
  } catch (e) {
    // Ignora
  }
  
  termosBuscados.value = [
    { termo: 'reativar', data: Timestamp.now() },
    { termo: 'cancelar', data: Timestamp.now() },
    { termo: 'vue', data: Timestamp.now() },
    { termo: 'processo', data: Timestamp.now() }
  ]
}

function buscarPorTermo(termo: string) {
  mensagem.value = termo
  enviarMensagem()
}

function limparTermosBuscados() {
  if (!confirm('Limpar histórico de termos buscados?')) return
  termosBuscados.value = []
  try {
    localStorage.removeItem('termos_buscados')
  } catch (e) {
    // Ignora
  }
}


/* =========================================================
   AÇÕES DO CHAT
========================================================= */

function adicionarMensagem(tipo: 'usuario' | 'ia' | 'sistema', texto: string, opcoes?: Conhecimento[], tags?: string[]) {
  const mensagem: Mensagem = {
    id: Date.now().toString(),
    tipo,
    texto,
    horario: obterHorario(),
    timestamp: Timestamp.now(),
    opcoes: opcoes || [],
    tags: tags || []
  }
  
  mensagens.value.push(mensagem)
}

async function enviarMensagem() {
  const texto = mensagem.value.trim()
  if (!texto || digitando.value || carregando.value) {
    return
  }
  
  // 🔥 VERIFICA SE É UM COMANDO
  const resultadoComando = processarComando(texto)
  
  if (resultadoComando) {
    adicionarMensagem('usuario', texto)
    mensagem.value = ''
    await rolarParaFinal()
    
    digitando.value = true
    setTimeout(async () => {
      adicionarMensagem('ia', resultadoComando.texto, [], resultadoComando.tags)
      digitando.value = false
      await rolarParaFinal()
    }, 500)
    return
  }
  
  // Não é comando, faz a busca normal
  adicionarTermoBuscado(texto)
  adicionarMensagem('usuario', texto)
  mensagem.value = ''
  await rolarParaFinal()
  
  digitando.value = true
  setTimeout(async () => {
    const resultados = buscarConhecimentos(texto)
    
    if (resultados.length === 0) {
      adicionarMensagem('ia', '🤔 Não encontrei nenhum conhecimento relacionado a "' + texto + '".\n\nTente reformular ou adicione este conhecimento clicando em 🧠 Gerenciar.')
    } else {
      const textoResposta = `🔍 Encontrei ${resultados.length} opção(ões) para "${texto}":`
      adicionarMensagem('ia', textoResposta, resultados)
    }
    
    digitando.value = false
    await rolarParaFinal()
  }, 700)
}

async function selecionarOpcao(conhecimento: Conhecimento) {
  adicionarMensagem('usuario', `📌 ${conhecimento.pergunta}`)
  await rolarParaFinal()
  
  digitando.value = true
  setTimeout(async () => {
    adicionarMensagem('ia', conhecimento.resposta)
    digitando.value = false
    await rolarParaFinal()
  }, 500)
}

function enviarComEnter(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    enviarMensagem()
  }
}

async function rolarParaFinal() {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

function limparChat() {
  if (!confirm('Limpar todas as mensagens?')) return
  
  mensagens.value = [
    {
      id: Date.now().toString(),
      tipo: 'sistema',
      texto: '🧹 Chat limpo! Como posso ajudar?',
      horario: obterHorario(),
      timestamp: Timestamp.now()
    }
  ]
}


/* =========================================================
   MODAL CRUD
========================================================= */

function abrirModal() {
  editandoId.value = null
  formPergunta.value = ''
  formResposta.value = ''
  formPalavrachave.value = ''
  formCategoria.value = ''
  mostrarModal.value = true
}

function editarConhecimento(conhecimento: Conhecimento) {
  if (!usuarioAtual.value) {
    alert('⚠️ Faça login para editar.')
    return
  }

  editandoId.value = conhecimento.id
  formPergunta.value = conhecimento.pergunta
  formResposta.value = conhecimento.resposta
  formPalavrachave.value = conhecimento.palavrachave.join(', ')
  formCategoria.value = conhecimento.categoria || 'Geral'
  mostrarModal.value = true
}

async function salvarConhecimento() {
  if (!formPergunta.value.trim()) {
    alert('⚠️ Pergunta obrigatória.')
    return
  }
  if (!formResposta.value.trim()) {
    alert('⚠️ Resposta obrigatória.')
    return
  }
  if (!formPalavrachave.value.trim()) {
    alert('⚠️ Palavra-chave obrigatória.')
    return
  }

  const palavras = formPalavrachave.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  try {
    if (editandoId.value) {
      await atualizarConhecimento(
        editandoId.value, 
        formPergunta.value.trim(), 
        formResposta.value.trim(), 
        palavras,
        formCategoria.value.trim() || 'Geral'
      )
      alert('✅ Conhecimento atualizado!')
    } else {
      await adicionarConhecimento(
        formPergunta.value.trim(), 
        formResposta.value.trim(), 
        palavras,
        formCategoria.value.trim() || 'Geral'
      )
      alert('✅ Conhecimento adicionado!')
    }
    fecharModal()
  } catch (error: any) {
    alert(`❌ Erro: ${error.message}`)
  }
}

async function excluirConhecimento(id: string) {
  const conhecimento = conhecimentos.value.find(item => item.id === id)
  if (!conhecimento) return

  if (!usuarioAtual.value) {
    alert('⚠️ Faça login para excluir.')
    return
  }

  const confirmar = confirm(`Excluir "${conhecimento.pergunta}"?`)
  if (!confirmar) return

  try {
    await deletarConhecimento(id)
    alert('🗑️ Excluído!')
  } catch (error: any) {
    alert(`❌ Erro: ${error.message}`)
  }
}

function fecharModal() {
  mostrarModal.value = false
  editandoId.value = null
  formPergunta.value = ''
  formResposta.value = ''
  formPalavrachave.value = ''
  formCategoria.value = ''
}


/* =========================================================
   COMPUTEDS
========================================================= */

const totalConhecimentos = computed(() => conhecimentos.value.length)
const totalPalavrasChave = computed(() => {
  const palavras = formPalavrachave.value
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)
  return palavras.length
})

const termosUnicos = computed(() => {
  const vistos = new Set()
  return termosBuscados.value.filter(item => {
    if (vistos.has(item.termo)) return false
    vistos.add(item.termo)
    return true
  })
})


/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {
  console.log('🚀 Iniciando Assistente com Firebase...')
  console.log('📁 Coleção:', collectionName)
  console.log('🔍 Busca: palavras com 3+ caracteres')
  carregarTermosBuscados()
  initAuth()
  carregarConhecimentos()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }
})

</script>

<template>
  <div class="chat-app">

    <!-- HEADER -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">🤖</div>
          <div>
            <h1>Assistente IA</h1>
            <div class="status-bar">
              <span class="status-dot" :class="{ connected: !erro }"></span>
              <span>{{ erro ? '⚠️ Erro' : '🔥 Firebase' }}</span>
              <span class="badge">{{ totalConhecimentos }} conhecimentos</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-icon" @click="limparChat" title="Limpar chat">
            🗑️
          </button>
          <button class="btn-primary" @click="abrirModal">
            🧠 Gerenciar
          </button>
        </div>
      </div>
    </header>

    <!-- CHAT -->
    <main ref="chatContainer" class="chat-area">
      
      <!-- Welcome -->
      <div v-if="mensagens.length === 1 && mensagens[0].tipo === 'sistema'" class="welcome">
        <div class="welcome-icon">🤖</div>
        <h2>Como posso ajudar?</h2>
        <p>Faça uma pergunta para consultar a base de conhecimento.</p>
        
        <!-- TERMOS MAIS BUSCADOS -->
        <div v-if="termosUnicos.length > 0" class="termos-container">
          <div class="termos-header">
            <span class="termos-titulo">🔥 Termos mais buscados</span>
            <button class="btn-limpar-termos" @click="limparTermosBuscados" title="Limpar histórico">
              ✕
            </button>
          </div>
          <div class="termos-grid">
            <button 
              v-for="item in termosUnicos" 
              :key="item.termo"
              class="btn-termo"
              @click="buscarPorTermo(item.termo)"
            >
              {{ item.termo }}
            </button>
          </div>
        </div>

        <div class="search-info-badge">
          🔍 Busca nos dados do Firebase: 
          <strong>Pergunta</strong> · <strong>Resposta</strong> · <strong>Palavras-chave</strong>
        </div>
        <div class="suggestions">
          <button @click="mensagem = 'reativar'">🔄 Reativar</button>
          <button @click="mensagem = 'cancelar'">📋 Cancelar</button>
          <button @click="mensagem = 'vue'">💻 Vue</button>
          <button @click="mensagem = 'processo'">📜 Processo</button>
        </div>
        <div class="exemplo-busca">
          💡 Digite "kkk" para ver seu histórico de buscas como tags clicáveis!
        </div>
      </div>

      <!-- Loading -->
      <div v-if="carregando" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando base de conhecimento...</p>
      </div>

      <!-- Mensagens -->
      <div v-for="item in mensagens" :key="item.id" class="message-row" :class="item.tipo">
        <div class="avatar">
          {{ item.tipo === 'ia' ? '🤖' : item.tipo === 'sistema' ? '⚡' : '👤' }}
        </div>
        <div class="message-content">
          <div class="message-name">
            {{ item.tipo === 'ia' ? 'Assistente IA' : item.tipo === 'sistema' ? 'Sistema' : 'Você' }}
          </div>
          
          <div class="message" v-html="item.texto.replace(/\n/g, '<br>').replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>')"></div>
          
          <!-- TAGS DO HISTÓRICO -->
          <div v-if="item.tags && item.tags.length > 0" class="tags-container">
            <div class="tags-grid">
              <button 
                v-for="tag in item.tags" 
                :key="tag"
                class="btn-tag-historico"
                @click="buscarPorTermo(tag)"
              >
                🔍 {{ tag }}
              </button>
            </div>
          </div>
          
          <!-- OPÇÕES -->
          <div v-if="item.opcoes && item.opcoes.length > 0" class="opcoes-container">
            <div class="opcoes-grid">
              <button 
                v-for="(opcao, index) in item.opcoes" 
                :key="opcao.id"
                class="btn-opcao"
                @click="selecionarOpcao(opcao)"
              >
                <span class="opcao-numero">{{ index + 1 }}</span>
                <span class="opcao-texto">{{ opcao.pergunta }}</span>
                <span class="opcao-seta">→</span>
              </button>
            </div>
          </div>
          
          <div class="time">{{ item.horario }}</div>
        </div>
      </div>

      <!-- Digitando -->
      <div v-if="digitando" class="message-row ia">
        <div class="avatar">🤖</div>
        <div class="message-content">
          <div class="message-name">Assistente IA</div>
          <div class="typing"><span></span><span></span><span></span></div>
        </div>
      </div>

    </main>

    <!-- INPUT -->
    <footer class="footer">
      <div class="input-area">
        <textarea 
          v-model="mensagem" 
          rows="1" 
          placeholder="Digite sua pergunta..." 
          @keydown="enviarComEnter"
          :disabled="carregando"
        ></textarea>
        <button 
          class="send-button" 
          :disabled="!mensagem.trim() || digitando || carregando" 
          @click="enviarMensagem"
        >
          ➤
        </button>
      </div>
      <div class="footer-info">
        <span>💡 Digite Enter para enviar</span>
        <span v-if="erro" class="error-text">⚠️ {{ erro }}</span>
        <span v-if="termosUnicos.length > 0" class="termos-count">🔥 {{ termosUnicos.length }} termos</span>
      </div>
    </footer>

    <!-- MODAL CRUD -->
    <div v-if="mostrarModal" class="modal-overlay" @click.self="fecharModal">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h2>{{ editandoId ? '✏️ Editar' : '🧠 Novo Conhecimento' }}</h2>
            <p>{{ editandoId ? 'Altere o conhecimento existente.' : 'Adicione uma nova pergunta e resposta.' }}</p>
            <small style="color: #94a3b8; font-size: 12px;">🔥 Dados salvos no Firebase</small>
          </div>
          <button class="close-button" @click="fecharModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Pergunta *</label>
            <input v-model="formPergunta" type="text" placeholder="Digite a pergunta..." class="form-input" />
          </div>

          <div class="form-group">
            <label>Resposta *</label>
            <textarea v-model="formResposta" rows="4" placeholder="Digite a resposta..." class="form-input"></textarea>
          </div>

          <div class="form-group">
            <label>Palavras-chave *</label>
            <input v-model="formPalavrachave" type="text" placeholder="ex: reativar, processo, suspenso" class="form-input" />
            <small>🔑 Separe por vírgula. <span class="tag-count">{{ totalPalavrasChave }} palavras</span></small>
          </div>

          <div class="form-group">
            <label>Categoria</label>
            <input v-model="formCategoria" type="text" placeholder="Ex: Processos, Serviços, Programação" class="form-input" />
          </div>

          <button class="btn-primary full" @click="salvarConhecimento">
            {{ editandoId ? '💾 Atualizar' : '➕ Adicionar' }}
          </button>
        </div>

        <div class="modal-footer">
          <div class="list-header">
            <h3>📚 Conhecimentos cadastrados ({{ conhecimentos.length }})</h3>
          </div>
          
          <div v-if="conhecimentos.length === 0" class="empty-list">
            <p>Nenhum conhecimento cadastrado.</p>
          </div>
          
          <div v-for="item in conhecimentos" :key="item.id" class="knowledge-item">
            <div class="knowledge-info">
              <strong>❓ {{ item.pergunta }}</strong>
              <span class="categoria-badge">{{ item.categoria || 'Geral' }}</span>
              <p>{{ item.resposta }}</p>
              <div class="tags">
                <span v-for="palavra in item.palavrachave" :key="palavra" class="tag">#{{ palavra }}</span>
              </div>
              <div class="meta">
                <span v-if="item.criadorEmail">👤 {{ item.criadorEmail }}</span>
                <span v-if="item.createdAt">📅 {{ new Date(item.createdAt.seconds * 1000).toLocaleDateString('pt-BR') }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-edit" @click="editarConhecimento(item)" title="Editar">✏️</button>
              <button class="btn-delete" @click="excluirConhecimento(item.id)" title="Excluir">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ============================================================
   ESTILOS GERAIS
============================================================ */

* {
  box-sizing: border-box;
}

.chat-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

/* ============================================================
   HEADER
============================================================ */

.header {
  padding: 14px 24px;
  background: #0f172a;
  color: white;
  flex-shrink: 0;
}

.header-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #2563eb;
  font-size: 24px;
}

.logo h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  display: inline-block;
}

.status-dot.connected {
  background: #22c55e;
}

.badge {
  background: #1e293b;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 38px;
  height: 38px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #1e293b;
  color: white;
}

.btn-primary {
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-primary.full {
  width: 100%;
  padding: 12px;
}

/* ============================================================
   CHAT AREA
============================================================ */

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* WELCOME */
.welcome {
  text-align: center;
  padding: 40px 20px;
}

.welcome-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: #dbeafe;
  font-size: 35px;
}

.welcome h2 {
  color: #0f172a;
  font-size: 24px;
  margin: 0;
}

.welcome p {
  color: #64748b;
  margin: 4px 0 16px;
}

/* TERMOS MAIS BUSCADOS */
.termos-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  margin: 12px auto;
  max-width: 600px;
  text-align: left;
}

.termos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.termos-titulo {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.btn-limpar-termos {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-limpar-termos:hover {
  background: #f1f5f9;
  color: #ef4444;
}

.termos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btn-termo {
  padding: 4px 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-termo:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.btn-termo:active {
  transform: scale(0.95);
}

.search-info-badge {
  margin-top: 12px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
  display: inline-block;
}

.search-info-badge strong {
  color: #2563eb;
}

.exemplo-busca {
  margin-top: 8px;
  padding: 8px 16px;
  background: #fef3c7;
  border-radius: 20px;
  font-size: 13px;
  color: #92400e;
  display: inline-block;
}

.suggestions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.suggestions button {
  padding: 8px 16px;
  border-radius: 20px;
  background: white;
  color: #334155;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestions button:hover {
  background: #eff6ff;
  border-color: #60a5fa;
}

/* LOADING */
.loading-state {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #94a3b8;
}

/* MENSAGENS */
.message-row {
  display: flex;
  gap: 12px;
  max-width: 85%;
  margin-bottom: 20px;
}

.message-row.usuario {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-row.sistema {
  max-width: 100%;
  justify-content: center;
}

.message-row.sistema .avatar {
  background: #fef3c7;
}

.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #e2e8f0;
  font-size: 18px;
}

.usuario .avatar {
  background: #dbeafe;
}

.message-content {
  min-width: 0;
  max-width: 100%;
}

.message-name {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.usuario .message-name {
  text-align: right;
}

.message {
  padding: 12px 16px;
  border-radius: 14px;
  background: #f1f5f9;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.usuario .message {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}

.ia .message {
  border-bottom-left-radius: 4px;
}

.sistema .message {
  background: #fef3c7;
  border-radius: 12px;
  text-align: center;
  max-width: 80%;
  margin: 0 auto;
}

.time {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
}

.usuario .time {
  text-align: right;
}

/* TAGS DO HISTÓRICO */
.tags-container {
  margin-top: 10px;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-tag-historico {
  padding: 6px 14px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-tag-historico:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.btn-tag-historico:active {
  transform: scale(0.95);
}

/* OPÇÕES */
.opcoes-container {
  margin-top: 10px;
}

.opcoes-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.btn-opcao {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.btn-opcao:hover {
  transform: translateX(4px);
  border-color: #2563eb;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.opcao-numero {
  font-weight: 700;
  color: #2563eb;
  font-size: 14px;
  min-width: 24px;
}

.opcao-texto {
  color: #0f172a;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.opcao-seta {
  color: #94a3b8;
  font-size: 18px;
  transition: all 0.2s;
}

.btn-opcao:hover .opcao-seta {
  color: #2563eb;
  transform: translateX(4px);
}

/* DIGITANDO */
.typing {
  display: flex;
  gap: 5px;
  padding: 12px 16px;
  background: #f1f5f9;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
}

.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
  animation: typing 1.4s infinite;
}

.typing span:nth-child(2) {
  animation-delay: .2s;
}

.typing span:nth-child(3) {
  animation-delay: .4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: .4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* FOOTER */
.footer {
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background: white;
  flex-shrink: 0;
}

.input-area {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 6px 8px 6px 12px;
  border: 2px solid #cbd5e1;
  border-radius: 14px;
  transition: border-color 0.2s;
}

.input-area:focus-within {
  border-color: #2563eb;
}

.input-area textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 8px 0;
  font-size: 14px;
  background: transparent;
  font-family: inherit;
}

.send-button {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #2563eb;
  color: white;
  border: none;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  background: #1d4ed8;
  transform: scale(1.05);
}

.send-button:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.footer-info {
  max-width: 900px;
  margin: 6px auto 0;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  flex-wrap: wrap;
  gap: 4px;
}

.error-text {
  color: #ef4444;
}

.termos-count {
  color: #f59e0b;
  font-weight: 600;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .6);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 18px;
  background: white;
  box-shadow: 0 25px 50px rgba(0,0,0,.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 28px;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.modal-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.close-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-button:hover {
  background: #e2e8f0;
}

.modal-body {
  padding: 24px 28px;
}

.modal-footer {
  padding: 0 28px 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
  margin-bottom: 4px;
}

.form-group small {
  color: #94a3b8;
  font-size: 12px;
  display: block;
  margin-top: 4px;
}

.tag-count {
  color: #2563eb;
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* LISTA DE CONHECIMENTOS NO MODAL */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.list-header h3 {
  margin: 0;
  color: #334155;
  font-size: 15px;
}

.list-header span {
  padding: 2px 10px;
  border-radius: 12px;
  background: #e2e8f0;
  color: #475569;
  font-size: 12px;
}

.empty-list {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
}

.knowledge-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.knowledge-item:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.knowledge-info {
  flex: 1;
  min-width: 0;
}

.knowledge-info strong {
  display: inline;
  color: #0f172a;
  font-size: 14px;
}

.categoria-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 10px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
}

.knowledge-info p {
  margin: 4px 0;
  color: #475569;
  font-size: 13px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-edit,
.btn-delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  background: transparent;
}

.btn-edit:hover {
  background: #dbeafe;
}

.btn-delete:hover {
  background: #fee2e2;
}

/* RESPONSIVO */
@media (max-width: 768px) {
  .header {
    padding: 12px;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 10px;
  }

  .logo h1 {
    font-size: 16px;
  }

  .chat-area {
    padding: 16px;
  }

  .message-row {
    max-width: 95%;
  }

  .opcoes-grid {
    gap: 4px;
  }

  .btn-opcao {
    padding: 8px 12px;
  }

  .opcao-texto {
    font-size: 13px;
  }

  .termos-container {
    margin: 8px 4px;
    padding: 10px 12px;
  }

  .btn-termo {
    font-size: 12px;
    padding: 3px 10px;
  }

  .modal {
    max-height: 95vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }

  .knowledge-item {
    flex-direction: column;
  }

  .item-actions {
    margin-top: 8px;
    align-self: flex-end;
  }

  .footer-info {
    flex-direction: column;
    align-items: center;
  }
}
</style>