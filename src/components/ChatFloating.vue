<template>
    <div class="chat-floating-container">
      <!-- Botão flutuante -->
      <button 
        class="chat-toggle-btn" 
        @click="toggleChat"
        :class="{ active: isOpen }"
      >
        <span v-if="!isOpen" class="btn-icon">💬</span>
        <span v-else class="btn-icon">✕</span>
        <span class="btn-label">{{ isOpen ? 'Fechar' : 'Chat' }}</span>
        <span class="notification-dot" v-if="hasNewMessage"></span>
      </button>
  
      <!-- Janela do Chat -->
      <div v-if="isOpen" class="chat-window">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-avatar">🤖</div>
            <div>
              <h3>Assistente IA</h3>
              <span class="chat-status">🟢 Online</span>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="btn-add-conhecimento" @click="iniciarAdicao" title="Adicionar conhecimento">
              ➕
            </button>
            <button class="chat-minimize" @click="toggleChat">✕</button>
          </div>
        </div>
  
        <div class="chat-body" ref="chatBodyRef">
          <!-- Mensagens -->
          <div v-for="msg in messages" :key="msg.id" class="chat-message" :class="msg.tipo">
            <div class="message-avatar">
              {{ msg.tipo === 'ia' ? '🤖' : msg.tipo === 'sistema' ? '⚡' : '👤' }}
            </div>
            <div class="message-content">
              <!-- 🔥 REMOVIDO: texto com instrução de número -->
              <div class="message-text" v-html="msg.texto.replace(/\n/g, '<br>').replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>')"></div>
              
              <div v-if="msg.acoes && msg.acoes.length > 0" class="message-acoes">
                <button 
                  v-for="acao in msg.acoes" 
                  :key="acao"
                  class="btn-acao"
                  @click="executarAcao(acao)"
                >
                  {{ acao }}
                </button>
              </div>
              
              <!-- 🔥 REMOVIDO: horário das mensagens -->
            </div>
          </div>
  
          <!-- Indicador de digitação -->
          <div v-if="digitando" class="chat-message ia">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
  
        <!-- 🔥 HISTÓRICO DE TAGS (mantido) -->
        <div v-if="historicoTags.length > 0" class="chat-historico">
          <div class="historico-label">📜 Últimas buscas:</div>
          <div class="historico-tags">
            <button 
              v-for="tag in historicoTags" 
              :key="tag"
              class="tag-historico"
              @click="buscarPorTag(tag)"
            >
              🔍 {{ tag }}
            </button>
            <button class="tag-limpar" @click="limparHistorico" title="Limpar histórico">
              ✕
            </button>
          </div>
        </div>
  
        <!-- 🔥 SUGESTÕES (mantido) -->
        <div v-if="sugestoes.length > 0 && !aguardandoOpcao && !modoAdicao" class="chat-sugestoes">
          <button 
            v-for="sug in sugestoes" 
            :key="sug"
            class="sugestao-btn"
            @click="enviarSugestao(sug)"
          >
            {{ sug }}
          </button>
        </div>
  
        <!-- 🔥 OPÇÕES (mantido, mas sem a instrução de número) -->
        <div v-if="aguardandoOpcao && opcoesDisponiveis.length > 0" class="chat-opcoes">
          <div class="opcoes-list">
            <div v-for="(opcao, index) in opcoesDisponiveis" :key="opcao.id" class="opcao-item">
              <span class="opcao-numero">{{ index + 1 }}</span>
              <span class="opcao-texto">{{ opcao.pergunta }}</span>
            </div>
          </div>
        </div>
  
        <!-- Modo de adição -->
        <div v-if="modoAdicao" class="chat-adicao">
          <div class="adicao-label">📝 Adicionar novo conhecimento</div>
          <div class="adicao-campos">
            <input 
              v-model="novaPergunta" 
              type="text" 
              placeholder="Digite a pergunta..."
              class="adicao-input"
              @keydown.enter="confirmarAdicao"
            />
            <textarea 
              v-model="novaResposta" 
              rows="2" 
              placeholder="Digite a resposta..."
              class="adicao-textarea"
              @keydown.enter.ctrl="confirmarAdicao"
            ></textarea>
            <input 
              v-model="novasPalavras" 
              type="text" 
              placeholder="Palavras-chave (separadas por vírgula)..."
              class="adicao-input"
              @keydown.enter="confirmarAdicao"
            />
          </div>
          <div class="adicao-acoes">
            <button class="btn-adicao-confirmar" @click="confirmarAdicao">✅ Salvar</button>
            <button class="btn-adicao-cancelar" @click="cancelarAdicao">✕ Cancelar</button>
          </div>
        </div>
  
        <div class="chat-footer">
          <input 
            v-model="mensagem" 
            type="text" 
            :placeholder="modoAdicao ? 'Preencha os campos acima...' : aguardandoOpcao ? 'Digite o número da opção...' : 'Digite sua pergunta...'"
            @keydown.enter="enviarMensagem"
            class="chat-input"
            :class="{ 'input-opcao': aguardandoOpcao, 'input-adicao': modoAdicao }"
            :disabled="modoAdicao"
          />
          <button 
            class="chat-send-btn" 
            @click="enviarMensagem"
            :disabled="!mensagem.trim() || digitando || modoAdicao"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
  import { 
    collection, 
    addDoc, 
    onSnapshot,
    query,
    orderBy,
    Timestamp
  } from 'firebase/firestore'
  import { getAuth } from 'firebase/auth'
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
    acoes?: string[]
  }
  
  interface Conhecimento {
    id: string
    pergunta: string
    resposta: string
    palavrachave: string[]
    categoria?: string
  }
  
  interface HistoricoBusca {
    termo: string
    resultados: Conhecimento[]
    data: Date
  }
  
  
  /* =========================================================
     ESTADO - CHAT
  ========================================================= */
  
  const isOpen = ref(false)
  const mensagem = ref('')
  const digitando = ref(false)
  const hasNewMessage = ref(false)
  const chatBodyRef = ref<HTMLElement | null>(null)
  const aguardandoOpcao = ref(false)
  const opcoesDisponiveis = ref<Conhecimento[]>([])
  const ultimaBusca = ref('')
  
  const historicoBuscas = ref<HistoricoBusca[]>([])
  const MAX_HISTORICO = 10
  
  const modoAdicao = ref(false)
  const novaPergunta = ref('')
  const novaResposta = ref('')
  const novasPalavras = ref('')
  
  const messages = ref<Mensagem[]>([
    {
      id: '1',
      tipo: 'ia',
      texto: '👋 Olá! Como posso ajudar você hoje?',
      horario: obterHorario(),
      timestamp: Timestamp.now()
    }
  ])
  
  const sugestoes = ref<string[]>([
    'Como reativar um processo?',
    'Como cancelar um serviço?',
    'O que é Vue.js?',
    'Como funciona a busca?'
  ])
  
  const conhecimentos = ref<Conhecimento[]>([])
  const carregando = ref(true)
  const auth = getAuth()
  
  
  /* =========================================================
     🔥 COMPUTED - TAGS DO HISTÓRICO
  ========================================================= */
  
  const historicoTags = computed(() => {
    const vistos = new Set<string>()
    const termos: string[] = []
    
    for (const item of historicoBuscas.value) {
      if (!vistos.has(item.termo)) {
        vistos.add(item.termo)
        termos.push(item.termo)
      }
    }
    
    return termos.slice(0, MAX_HISTORICO)
  })
  
  
  /* =========================================================
     FIREBASE - CONFIGURAÇÃO
  ========================================================= */
  
  const collectionName = 'baseconhecimento'
  const conhecimentosCollection = collection(db, collectionName)
  let unsubscribe: (() => void) | null = null
  
  
  /* =========================================================
     FUNÇÕES AUXILIARES
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
    const normalizado = normalizarTexto(texto)
    const palavras = normalizado.split(' ').filter(p => p.length >= 2)
    
    const variacoes: string[] = []
    
    for (const palavra of palavras) {
      variacoes.push(palavra)
      
      if (palavra.length >= 3) {
        if (palavra.endsWith('iv') || palavra.endsWith('or') || palavra.endsWith('ar')) {
          variacoes.push(palavra + 'ação')
          variacoes.push(palavra + 'amento')
          variacoes.push(palavra + 'ado')
        }
        
        if (palavra.endsWith('ção')) {
          variacoes.push(palavra.replace('ção', 'r'))
          variacoes.push(palavra.replace('ção', 'do'))
        }
        
        if (palavra.endsWith('ar')) {
          variacoes.push(palavra.replace('ar', 'ação'))
          variacoes.push(palavra.replace('ar', 'amento'))
        }
      }
    }
    
    return [...new Set(variacoes)]
  }
  
  function palavraContida(palavraBusca: string, textoAlvo: string): boolean {
    const pBusca = normalizarTexto(palavraBusca)
    const pAlvo = normalizarTexto(textoAlvo)
    
    if (pBusca.length < 2) return false
    
    if (pAlvo === pBusca) return true
    if (pAlvo.includes(pBusca)) return true
    if (pBusca.includes(pAlvo) && pAlvo.length >= 3) return true
    
    return false
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
          if (snapshot.empty) {
            conhecimentos.value = []
            carregando.value = false
            return
          }
          
          conhecimentos.value = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              pergunta: data.pergunta || '',
              resposta: data.resposta || '',
              palavrachave: data.palavrachave || [],
              categoria: data.categoria || 'Geral'
            }
          })
          carregando.value = false
        },
        (error) => {
          console.error('❌ Erro ao carregar conhecimentos:', error)
          carregando.value = false
        }
      )
    } catch (error: any) {
      console.error('❌ Erro:', error)
      carregando.value = false
    }
  }
  
  
  /* =========================================================
     🔥 BUSCA MELHORADA
  ========================================================= */
  
  function buscarConhecimentos(termo: string): Conhecimento[] {
    const palavrasBusca = obterPalavras(termo)
    
    console.log('🔍 Buscando por:', palavrasBusca)
    console.log('📚 Total de conhecimentos:', conhecimentos.value.length)
    
    if (palavrasBusca.length === 0) {
      return []
    }
    
    const resultados: { item: Conhecimento; matches: number; detalhes: string[] }[] = []
    
    for (const item of conhecimentos.value) {
      let matches = 0
      const detalhes: string[] = []
      
      const textoPergunta = normalizarTexto(item.pergunta)
      const textoResposta = normalizarTexto(item.resposta)
      const textoPalavrasChave = item.palavrachave.map(p => normalizarTexto(p)).join(' ')
      
      for (const palavra of palavrasBusca) {
        if (palavraContida(palavra, textoPalavrasChave)) {
          matches += 5
          detalhes.push(`palavra-chave "${palavra}"`)
          continue
        }
        
        if (palavraContida(palavra, textoPergunta)) {
          matches += 3
          detalhes.push(`pergunta "${palavra}"`)
          continue
        }
        
        if (palavraContida(palavra, textoResposta)) {
          matches += 2
          detalhes.push(`resposta "${palavra}"`)
          continue
        }
      }
      
      if (matches > 0) {
        resultados.push({ 
          item, 
          matches,
          detalhes: [...new Set(detalhes)]
        })
      }
    }
    
    resultados.sort((a, b) => b.matches - a.matches)
    
    console.log('📊 Resultados encontrados:', resultados.length)
    resultados.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.matches} pontos - ${r.item.pergunta}`)
      console.log(`     🔑 ${r.detalhes.join(', ')}`)
    })
    
    return resultados.map(r => r.item).slice(0, 5)
  }
  
  /* =========================================================
     🔥 GERENCIAR HISTÓRICO
  ========================================================= */
  
  function adicionarHistorico(termo: string, resultados: Conhecimento[]) {
    historicoBuscas.value = historicoBuscas.value.filter(h => h.termo !== termo)
    
    historicoBuscas.value.unshift({
      termo: termo,
      resultados: resultados,
      data: new Date()
    })
    
    if (historicoBuscas.value.length > MAX_HISTORICO) {
      historicoBuscas.value = historicoBuscas.value.slice(0, MAX_HISTORICO)
    }
    
    try {
      localStorage.setItem('historico_buscas_chat', JSON.stringify(historicoBuscas.value))
    } catch (e) {
      // Ignora
    }
  }
  
  function carregarHistorico() {
    try {
      const saved = localStorage.getItem('historico_buscas_chat')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          historicoBuscas.value = parsed.map((h: any) => ({
            ...h,
            data: new Date(h.data)
          }))
          return
        }
      }
    } catch (e) {
      // Ignora
    }
    
    historicoBuscas.value = [
      { termo: 'reativar', resultados: [], data: new Date() },
      { termo: 'cancelar', resultados: [], data: new Date() }
    ]
  }
  
  function limparHistorico() {
    historicoBuscas.value = []
    try {
      localStorage.removeItem('historico_buscas_chat')
    } catch (e) {
      // Ignora
    }
  }
  
  function buscarPorTag(termo: string) {
    const historico = historicoBuscas.value.find(h => h.termo === termo)
    
    if (historico && historico.resultados.length > 0) {
      if (historico.resultados.length === 1) {
        const unico = historico.resultados[0]
        adicionarMensagem('usuario', `🔄 Re-buscando: "${termo}"`)
        adicionarMensagem('ia', `✅ **${unico.pergunta}**\n\n${unico.resposta}`)
      } else {
        opcoesDisponiveis.value = historico.resultados
        aguardandoOpcao.value = true
        
        let resposta = `🔍 Encontrei ${historico.resultados.length} opção(ões) para "${termo}":\n\n`
        historico.resultados.forEach((r, i) => {
          resposta += `${i + 1}. ${r.pergunta}\n`
        })
        
        adicionarMensagem('usuario', `🔄 Re-buscando: "${termo}"`)
        adicionarMensagem('ia', resposta)
      }
      
      rolarParaFinal()
      return
    }
    
    mensagem.value = termo
    enviarMensagem()
  }
  
  /* =========================================================
     CRUD - ADICIONAR CONHECIMENTO
  ========================================================= */
  
  async function adicionarConhecimento(pergunta: string, resposta: string, palavras: string[]) {
    try {
      const user = auth.currentUser
      
      const docRef = await addDoc(conhecimentosCollection, {
        pergunta: pergunta.trim(),
        resposta: resposta.trim(),
        palavrachave: palavras,
        categoria: 'Geral',
        criadorId: user?.uid || 'anonimo',
        criadorEmail: user?.email || 'anonimo',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      console.log('✅ Conhecimento adicionado:', docRef.id)
      return docRef.id
    } catch (error: any) {
      console.error('❌ Erro ao adicionar:', error)
      throw error
    }
  }
  
  /* =========================================================
     MODOS DO CHAT
  ========================================================= */
  
  function iniciarAdicao() {
    modoAdicao.value = true
    aguardandoOpcao.value = false
    novaPergunta.value = ''
    novaResposta.value = ''
    novasPalavras.value = ''
    
    adicionarMensagem('sistema', '📝 **Modo de adição ativado!**\n\nPreencha os campos abaixo para adicionar um novo conhecimento à base.')
  }
  
  function cancelarAdicao() {
    modoAdicao.value = false
    novaPergunta.value = ''
    novaResposta.value = ''
    novasPalavras.value = ''
    
    adicionarMensagem('sistema', '❌ Adição cancelada.')
    
    sugestoes.value = [
      'Como reativar um processo?',
      'Como cancelar um serviço?',
      'O que é Vue.js?',
      'Como funciona a busca?'
    ]
  }
  
  async function confirmarAdicao() {
    if (!novaPergunta.value.trim()) {
      adicionarMensagem('sistema', '⚠️ A pergunta é obrigatória!')
      return
    }
    
    if (!novaResposta.value.trim()) {
      adicionarMensagem('sistema', '⚠️ A resposta é obrigatória!')
      return
    }
    
    if (!novasPalavras.value.trim()) {
      adicionarMensagem('sistema', '⚠️ Pelo menos uma palavra-chave é obrigatória!')
      return
    }
    
    const palavras = novasPalavras.value
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)
    
    try {
      await adicionarConhecimento(novaPergunta.value, novaResposta.value, palavras)
      
      adicionarMensagem('sistema', '✅ **Conhecimento adicionado com sucesso!**\n\n📌 Pergunta: ' + novaPergunta.value)
      
      modoAdicao.value = false
      novaPergunta.value = ''
      novaResposta.value = ''
      novasPalavras.value = ''
      
      sugestoes.value = [
        'Como reativar um processo?',
        'Como cancelar um serviço?',
        'O que é Vue.js?',
        'Como funciona a busca?'
      ]
      
    } catch (error: any) {
      adicionarMensagem('sistema', '❌ Erro ao adicionar: ' + error.message)
    }
  }
  
  /* =========================================================
     PROCESSAR SELEÇÃO POR NÚMERO
  ========================================================= */
  
  function processarSelecaoNumero(texto: string): boolean {
    if (!aguardandoOpcao.value || opcoesDisponiveis.value.length === 0) {
      return false
    }
    
    const numero = parseInt(texto.trim())
    
    if (isNaN(numero) || numero < 1 || numero > opcoesDisponiveis.value.length) {
      return false
    }
    
    const opcaoSelecionada = opcoesDisponiveis.value[numero - 1]
    
    adicionarMensagem('usuario', `📌 ${opcaoSelecionada.pergunta}`)
    
    setTimeout(() => {
      adicionarMensagem('ia', `✅ **${opcaoSelecionada.pergunta}**\n\n${opcaoSelecionada.resposta}`)
      
      aguardandoOpcao.value = false
      opcoesDisponiveis.value = []
      
      sugestoes.value = [
        'Como reativar um processo?',
        'Como cancelar um serviço?',
        'O que é Vue.js?',
        'Como funciona a busca?'
      ]
    }, 300)
    
    return true
  }
  
  /* =========================================================
     AÇÕES DO CHAT
  ========================================================= */
  
  function adicionarMensagem(tipo: 'usuario' | 'ia' | 'sistema', texto: string, acoes?: string[]) {
    messages.value.push({
      id: Date.now().toString(),
      tipo,
      texto,
      horario: obterHorario(),
      timestamp: Timestamp.now(),
      acoes: acoes || []
    })
    
    if (!isOpen.value && tipo === 'ia') {
      hasNewMessage.value = true
    }
    
    rolarParaFinal()
  }
  
  function executarAcao(acao: string) {
    if (acao === 'Adicionar conhecimento') {
      iniciarAdicao()
    }
  }
  
  async function enviarMensagem() {
    const texto = mensagem.value.trim()
    if (!texto || digitando.value || carregando.value || modoAdicao.value) {
      return
    }
    
    if (processarSelecaoNumero(texto)) {
      mensagem.value = ''
      return
    }
    
    adicionarMensagem('usuario', texto)
    mensagem.value = ''
    
    digitando.value = true
    
    setTimeout(() => {
      const resultados = buscarConhecimentos(texto)
      
      adicionarHistorico(texto, resultados)
      
      if (resultados.length === 0) {
        adicionarMensagem('ia', '🤔 Não encontrei nenhum conhecimento relacionado a "' + texto + '".\n\n💡 Clique no botão ➕ para adicionar este conhecimento!', ['Adicionar conhecimento'])
        
        sugestoes.value = []
        aguardandoOpcao.value = false
        opcoesDisponiveis.value = []
        
      } else if (resultados.length === 1) {
        const unico = resultados[0]
        adicionarMensagem('ia', `✅ **${unico.pergunta}**\n\n${unico.resposta}`)
        
        sugestoes.value = [
          'Como reativar um processo?',
          'Como cancelar um serviço?',
          'O que é Vue.js?',
          'Como funciona a busca?'
        ]
        aguardandoOpcao.value = false
        opcoesDisponiveis.value = []
        
      } else {
        ultimaBusca.value = texto
        opcoesDisponiveis.value = resultados
        aguardandoOpcao.value = true
        
        let resposta = `🔍 Encontrei ${resultados.length} opção(ões) para "${texto}":\n\n`
        resultados.forEach((r, i) => {
          resposta += `${i + 1}. ${r.pergunta}\n`
        })
        
        adicionarMensagem('ia', resposta)
        sugestoes.value = []
      }
      
      digitando.value = false
    }, 700)
  }
  
  function enviarSugestao(sugestao: string) {
    mensagem.value = sugestao
    enviarMensagem()
  }
  
  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      hasNewMessage.value = false
      setTimeout(rolarParaFinal, 300)
    }
  }
  
  async function rolarParaFinal() {
    await nextTick()
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
    }
  }
  
  /* =========================================================
     LIFECYCLE
  ========================================================= */
  
  onMounted(() => {
    console.log('💬 Chat flutuante iniciado')
    carregarHistorico()
    carregarConhecimentos()
  })
  
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
  
  </script>
  
  <style scoped>
  /* ============================================================
     CONTAINER PRINCIPAL
  ============================================================ */
  
  .chat-floating-container {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  }
  
  /* ============================================================
     BOTÃO FLUTUANTE
  ============================================================ */
  
  .chat-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    margin: 20px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    transition: all 0.3s ease;
    position: relative;
  }
  
  .chat-toggle-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
  }
  
  .chat-toggle-btn.active {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
  }
  
  .chat-toggle-btn .btn-icon {
    font-size: 20px;
  }
  
  .chat-toggle-btn .btn-label {
    font-size: 13px;
  }
  
  .notification-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    border: 2px solid white;
    animation: pulse-dot 1.5s infinite;
  }
  
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }
  
  /* ============================================================
     JANELA DO CHAT
  ============================================================ */
  
  .chat-window {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 420px;
    max-width: 100vw;
    height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideIn 0.3s ease;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  /* ============================================================
     HEADER
  ============================================================ */
  
  .chat-header {
    padding: 14px 18px;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  
  .chat-header-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .chat-avatar {
    width: 36px;
    height: 36px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  
  .chat-header-info h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  
  .chat-status {
    font-size: 11px;
    color: #22c55e;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .chat-header-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  
  .btn-add-conhecimento {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: white;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-add-conhecimento:hover {
    background: rgba(99, 102, 241, 0.4);
    transform: scale(1.05);
  }
  
  .chat-minimize {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
  }
  
  .chat-minimize:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  /* ============================================================
     CORPO DO CHAT
  ============================================================ */
  
  .chat-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .chat-message {
    display: flex;
    gap: 10px;
    max-width: 90%;
    animation: messageIn 0.3s ease;
  }
  
  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .chat-message.usuario {
    margin-left: auto;
    flex-direction: row-reverse;
  }
  
  .chat-message.sistema {
    max-width: 100%;
    justify-content: center;
  }
  
  .chat-message.sistema .message-avatar {
    background: #fef3c7;
  }
  
  .message-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    background: #e2e8f0;
  }
  
  .chat-message.usuario .message-avatar {
    background: #dbeafe;
  }
  
  .message-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 100%;
  }
  
  .message-text {
    padding: 8px 14px;
    border-radius: 12px;
    background: white;
    color: #1e293b;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .chat-message.usuario .message-text {
    background: #6366f1;
    color: white;
    border-bottom-right-radius: 4px;
  }
  
  .chat-message.ia .message-text {
    border-bottom-left-radius: 4px;
  }
  
  .chat-message.sistema .message-text {
    background: #fef3c7;
    border-radius: 12px;
    text-align: center;
    max-width: 80%;
    margin: 0 auto;
  }
  
  .message-text strong {
    color: #6366f1;
  }
  
  .chat-message.usuario .message-text strong {
    color: #ffffff;
  }
  
  /* ============================================================
     AÇÕES
  ============================================================ */
  
  .message-acoes {
    margin-top: 6px;
    display: flex;
    gap: 6px;
  }
  
  .btn-acao {
    padding: 4px 12px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-acao:hover {
    background: #4f46e5;
    transform: scale(1.02);
  }
  
  /* ============================================================
     HISTÓRICO DE TAGS
  ============================================================ */
  
  .chat-historico {
    padding: 8px 16px;
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  
  .historico-label {
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .historico-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  
  .tag-historico {
    padding: 2px 10px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 14px;
    font-size: 11px;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tag-historico:hover {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  }
  
  .tag-limpar {
    padding: 2px 8px;
    background: transparent;
    border: none;
    font-size: 11px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tag-limpar:hover {
    color: #ef4444;
  }
  
  /* ============================================================
     DIGITANDO
  ============================================================ */
  
  .typing-indicator {
    padding: 8px 14px;
    background: white;
    border-radius: 12px;
    border-bottom-left-radius: 4px;
    display: flex;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 50%;
    animation: typingBounce 1.4s infinite;
  }
  
  .typing-indicator span:nth-child(2) {
    animation-delay: .2s;
  }
  
  .typing-indicator span:nth-child(3) {
    animation-delay: .4s;
  }
  
  @keyframes typingBounce {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: .4;
    }
    30% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }
  
  /* ============================================================
     SUGESTÕES
  ============================================================ */
  
  .chat-sugestoes {
    padding: 8px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    border-top: 1px solid #e2e8f0;
    background: white;
    flex-shrink: 0;
  }
  
  .sugestao-btn {
    padding: 4px 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    font-size: 11px;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .sugestao-btn:hover {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
    transform: translateY(-1px);
  }
  
  /* ============================================================
     OPÇÕES - SEM LABEL DE INSTRUÇÃO
  ============================================================ */
  
  .chat-opcoes {
    padding: 10px 16px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    flex-shrink: 0;
  }
  
  .opcoes-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .opcao-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-size: 12px;
  }
  
  .opcao-numero {
    font-weight: 700;
    color: #6366f1;
    min-width: 20px;
    text-align: center;
  }
  
  .opcao-texto {
    color: #1e293b;
    flex: 1;
  }
  
  /* ============================================================
     ADIÇÃO
  ============================================================ */
  
  .chat-adicao {
    padding: 12px 16px;
    border-top: 2px solid #6366f1;
    background: #f8fafc;
    flex-shrink: 0;
  }
  
  .adicao-label {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
  }
  
  .adicao-campos {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .adicao-input,
  .adicao-textarea {
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: all 0.2s;
  }
  
  .adicao-input:focus,
  .adicao-textarea:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .adicao-textarea {
    resize: vertical;
    min-height: 50px;
  }
  
  .adicao-acoes {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  
  .btn-adicao-confirmar {
    flex: 1;
    padding: 8px;
    background: #22c55e;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-adicao-confirmar:hover {
    background: #16a34a;
  }
  
  .btn-adicao-cancelar {
    flex: 0.5;
    padding: 8px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-adicao-cancelar:hover {
    background: #dc2626;
  }
  
  /* ============================================================
     FOOTER
  ============================================================ */
  
  .chat-footer {
    padding: 10px 14px;
    border-top: 1px solid #e2e8f0;
    background: white;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  
  .chat-input {
    flex: 1;
    padding: 8px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    font-size: 13px;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .chat-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .chat-input.input-opcao {
    border-color: #f59e0b;
    background: #fffbeb;
  }
  
  .chat-input.input-opcao:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  
  .chat-input.input-adicao {
    background: #f1f5f9;
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .chat-send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #6366f1;
    color: white;
    border: none;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .chat-send-btn:hover:not(:disabled) {
    background: #4f46e5;
    transform: scale(1.05);
  }
  
  .chat-send-btn:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
  
  /* ============================================================
     RESPONSIVO
  ============================================================ */
  
  @media (max-width: 600px) {
    .chat-window {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  
    .chat-toggle-btn {
      margin: 12px;
      padding: 10px 16px;
    }
  
    .chat-toggle-btn .btn-label {
      display: none;
    }
  
    .opcao-item {
      font-size: 11px;
    }
  
    .adicao-campos {
      gap: 4px;
    }
  
    .adicao-input,
    .adicao-textarea {
      font-size: 12px;
      padding: 6px 10px;
    }
  
    .btn-adicao-confirmar,
    .btn-adicao-cancelar {
      font-size: 12px;
      padding: 6px;
    }
  
    .historico-tags {
      gap: 3px;
    }
  
    .tag-historico {
      font-size: 10px;
      padding: 2px 8px;
    }
  }
  </style>