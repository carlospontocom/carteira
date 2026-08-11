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
const isChatOpen = ref(true) // Começa aberto por padrão
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
   🔥 COMANDOS ESPECIAIS
========================================================= */

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

function processarComando(comando: string): { texto: string; tags: string[] } | null {
  const cmd = comando.toLowerCase().trim()
  if (Object.prototype.hasOwnProperty.call(comandos, cmd)) {
    return comandos[cmd].acao()
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
    } else {
      usuarioAtual.value = null
      statusConexao.value = '👤 Visitante'
    }
  })
}


/* =========================================================
   CARREGAR CONHECIMENTOS
========================================================= */

function carregarConhecimentos() {
  carregando.value = true
  try {
    const q = query(conhecimentosCollection, orderBy('createdAt', 'desc'))
    unsubscribe = onSnapshot(q, 
      (snapshot) => {
        if (snapshot.empty) {
          conhecimentos.value = []
          adicionarConhecimentosPadrao()
        } else {
          conhecimentos.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conhecimento))
        }
        carregando.value = false
      },
      (err) => {
        erro.value = `Erro: ${err.message}`
        carregando.value = false
      }
    )
  } catch (err: any) {
    erro.value = `Erro: ${err.message}`
    carregando.value = false
  }
}

async function adicionarConhecimentosPadrao() {
  const conhecimentosPadrao = [
    { pergunta: 'Como reativar um processo?', resposta: 'Para reativar um processo, acesse o sistema, busque pelo número do processo e clique em "Reativar".', palavrachave: ['reativar', 'processo'], categoria: 'Processos' },
    { pergunta: 'Como cancelar um serviço?', resposta: 'Acesse sua conta, vá em "Meus Serviços", selecione o serviço e clique em "Cancelar".', palavrachave: ['cancelar', 'serviço'], categoria: 'Serviços' }
  ]
  for (const item of conhecimentosPadrao) {
    await addDoc(conhecimentosCollection, { ...item, criadorId: 'sistema', createdAt: Timestamp.now() })
  }
}


/* =========================================================
   SISTEMA DE BUSCA
========================================================= */

function obterHorario(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function buscarConhecimentos(perguntaUsuario: string): Conhecimento[] {
  // Lógica de busca simplificada para o exemplo
  const termo = perguntaUsuario.toLowerCase()
  return conhecimentos.value.filter(c => 
    c.pergunta.toLowerCase().includes(termo) || 
    c.resposta.toLowerCase().includes(termo) || 
    c.palavrachave.some(p => p.toLowerCase().includes(termo))
  )
}


/* =========================================================
   AÇÕES DO CHAT
========================================================= */

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

function adicionarMensagem(tipo: Mensagem['tipo'], texto: string, opcoes?: Conhecimento[], tags?: string[]) {
  mensagens.value.push({ id: Date.now().toString(), tipo, texto, horario: obterHorario(), timestamp: Timestamp.now(), opcoes, tags })
  rolarParaFinal()
}

async function enviarMensagem() {
  const texto = mensagem.value.trim()
  if (!texto || digitando.value) return

  adicionarMensagem('usuario', texto)
  
  const comandoResult = processarComando(texto)
  if (comandoResult) {
    mensagem.value = ''
    digitando.value = true
    setTimeout(() => {
      adicionarMensagem('ia', comandoResult.texto, [], comandoResult.tags)
      digitando.value = false
    }, 500)
    return
  }

  adicionarTermoBuscado(texto)
  mensagem.value = ''
  digitando.value = true

  setTimeout(() => {
    const resultados = buscarConhecimentos(texto)
    if (resultados.length > 0) {
      adicionarMensagem('ia', `Encontrei ${resultados.length} resultado(s):`, resultados)
    } else {
      adicionarMensagem('ia', 'Não encontrei informações sobre isso.')
    }
    digitando.value = false
  }, 700)
}

function selecionarOpcao(conhecimento: Conhecimento) {
  adicionarMensagem('usuario', conhecimento.pergunta)
  digitando.value = true
  setTimeout(() => {
    adicionarMensagem('ia', conhecimento.resposta)
    digitando.value = false
  }, 500)
}

async function rolarParaFinal() {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}


/* =========================================================
   GERENCIAR TERMOS
========================================================= */

function adicionarTermoBuscado(termo: string) {
  if (!termosBuscados.value.find(t => t.termo === termo)) {
    termosBuscados.value.unshift({ termo, data: Timestamp.now() })
    if (termosBuscados.value.length > MAX_TERMOS) termosBuscados.value.pop()
    localStorage.setItem('termos_buscados', JSON.stringify(termosBuscados.value))
  }
}

function carregarTermosBuscados() {
  const salvos = localStorage.getItem('termos_buscados')
  if (salvos) {
    termosBuscados.value = JSON.parse(salvos).map((t: any) => ({...t, data: new Timestamp(t.data.seconds, t.data.nanoseconds)}))
  }
}


/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {
  carregarTermosBuscados()
  initAuth()
  carregarConhecimentos()
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (unsubscribeAuth) unsubscribeAuth()
})

</script>

<template>
  <div>
    <transition name="fade">
      <button v-if="!isChatOpen" class="chat-toggle-button" @click="toggleChat">
        <span class="chat-toggle-icon">💬</span>
      </button>
    </transition>

    <transition name="slide-up">
      <div v-if="isChatOpen" class="chat-app">
        <!-- HEADER -->
        <header class="header">
          <div class="header-content">
            <div class="logo">
              <div class="logo-icon">🤖</div>
              <h1>Assistente IA</h1>
            </div>
            <div class="header-actions">
              <button class="btn-icon" @click="toggleChat" title="Fechar chat">
                ✕
              </button>
            </div>
          </div>
        </header>

        <!-- CHAT AREA -->
        <main ref="chatContainer" class="chat-area">
          <div v-for="item in mensagens" :key="item.id" class="message-row" :class="`message-${item.tipo}`">
            <div class="message-content">
              <div class="message-text" v-html="item.texto.replace(/\n/g, '<br>')"></div>
              <div v-if="item.opcoes" class="opcoes-grid">
                <button v-for="opcao in item.opcoes" :key="opcao.id" class="btn-opcao" @click="selecionarOpcao(opcao)">
                  {{ opcao.pergunta }}
                </button>
              </div>
              <div class="time">{{ item.horario }}</div>
            </div>
          </div>
          <div v-if="digitando" class="message-row message-ia">
             <div class="message-content">
                <div class="typing"><span></span><span></span><span></span></div>
             </div>
          </div>
        </main>

        <!-- INPUT -->
        <footer class="footer">
          <div class="input-area">
            <textarea v-model="mensagem" @keydown.enter.prevent="enviarMensagem" placeholder="Digite sua pergunta..."></textarea>
            <button class="send-button" @click="enviarMensagem" :disabled="!mensagem.trim()">➤</button>
          </div>
        </footer>
      </div>
    </transition>
  </div>
</template>


<style scoped>
/* ============================================================
   ANIMAÇÕES
============================================================ */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease-out;
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.98);
}

/* ============================================================
   BOTÃO FLUTUANTE
============================================================ */
.chat-toggle-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 2001;
}
.chat-toggle-button:hover {
  background: #1d4ed8;
  transform: scale(1.1) rotate(10deg);
}
.chat-toggle-icon {
  font-size: 32px;
  transition: transform 0.2s ease-in-out;
}
.chat-toggle-button:hover .chat-toggle-icon{
    transform: scale(1.2);
}

/* ============================================================
   ESTRUTURA CHAT
============================================================ */
.chat-app {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 400px;
  height: 85vh;
  max-height: 650px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.1), 0 15px 35px rgba(0,0,0,0.1);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

/* ============================================================
   HEADER
============================================================ */
.header {
  padding: 1rem 1.5rem;
  background: #0f172a;
  color: white;
  flex-shrink: 0;
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-icon {
  font-size: 24px;
}
.logo h1 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}
.header-actions .btn-icon {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}
.header-actions .btn-icon:hover {
  color: white;
}

/* ============================================================
   CHAT AREA
============================================================ */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.message-row {
  display: flex;
  margin-bottom: 1rem;
  max-width: 85%;
}
.message-content {
  display: flex;
  flex-direction: column;
}
.message-text {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-ia {
  justify-content: flex-start;
}
.message-ia .message-text {
  background: #f1f5f9;
  color: #0f172a;
  border-bottom-left-radius: 4px;
}

.message-usuario {
  margin-left: auto;
  flex-direction: row-reverse;
}
.message-usuario .message-text {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}

.time {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 0.25rem;
  padding: 0 0.5rem;
}
.message-usuario .time {
  text-align: right;
}

.opcoes-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-opcao {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
}
.btn-opcao:hover {
  border-color: #2563eb;
  background: #f8fafc;
  color: #2563eb;
}

.typing {
    display: flex; gap: 5px; padding: 12px 16px;
    background: #f1f5f9; border-radius: 18px; border-bottom-left-radius: 4px;
}
.typing span { 
    width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: typing 1.4s infinite;
}
.typing span:nth-child(2) { animation-delay: .2s; }
.typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-6px); opacity: 1; } }

/* ============================================================
   FOOTER
============================================================ */
.footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}
.input-area {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 0.25rem 0.5rem;
}
.input-area textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 0.75rem;
  font-size: 14px;
  background: transparent;
  font-family: inherit;
  height: 48px; 
  max-height: 100px;
}
.send-button {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  border: none;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.send-button:hover:not(:disabled) { background: #1d4ed8; }
.send-button:disabled { opacity: .5; cursor: not-allowed; }


/* ============================================================
   RESPONSIVIDADE
============================================================ */
@media (max-width: 480px) {
  .chat-app {
    width: 100vw;
    height: 100%;
    max-height: 100%;
    bottom: 0;
    right: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .chat-toggle-button {
    bottom: 1rem;
    right: 1rem;
    width: 56px;
    height: 56px;
  }
  .chat-toggle-icon {
    font-size: 28px;
  }
}
</style>
