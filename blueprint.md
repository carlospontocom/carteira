# Visão Geral do Projeto

Este é um aplicativo Vue.js com Firebase integrado. O objetivo é fornecer uma aplicação web com autenticação de usuário e funcionalidades de dashboard, incluindo gerenciamento de finanças pessoais.

## Funcionalidades Implementadas

*   **Autenticação e Segurança:** Sistema completo de login, cadastro, proteção de rotas e alteração de senha com Firebase Auth.
*   **Layout Persistente:** Estrutura de layout com menu de navegação para uma experiência de usuário consistente.
*   **Banco de Dados Real-Time:** Integração com Cloud Firestore para persistência e sincronização de dados em tempo real.
*   **Visualização de Dados:** Dashboard com resumos financeiros e gráfico de despesas por categoria com percentuais.
*   **Design Polido:** Interface com estilo moderno, incluindo gradientes, sombras e foco na experiência do usuário.
*   **CRUD Completo de Transações:** Funcionalidade para criar, ler, atualizar e excluir transações, incluindo um campo de data.
*   **Pesquisa, Paginação e Ordenação:** A lista de transações é totalmente interativa.
*   **UX Aprimorada:** Mensagens contextuais para listas vazias.
*   **Carregamento Reativo:** A busca de dados é acionada pelo status de autenticação do Firebase para maior robustez.

## Plano de Mudança Atual: Correção da Lógica de Carregamento de Dados (Abordagem Sequencial)

Após múltiplas tentativas, a não exibição dos dados persiste, indicando uma falha fundamental na lógica assíncrona. A hipótese principal é uma condição de corrida onde os `onSnapshot` listeners são ativados antes que o documento do usuário no Firestore seja garantidamente existente.

O plano é reestruturar o processo de carregamento para ser estritamente sequencial e à prova de falhas.

1.  **Refatorar o Fluxo de Carregamento de Dados (`CarteiraDigital.vue`):**
    *   No gatilho `onAuthStateChanged`, ao detectar um usuário autenticado, a primeira e única ação será chamar uma nova função, `initData(user)`.
    *   **Aguardar a Garantia do Documento:** Dentro de `initData(user)`, a primeira etapa será `await ensureUserDocument(user)`. Esta função irá verificar a existência do documento principal do usuário (`/carteiraDigital/{uid}`) e criá-lo com valores padrão caso não exista. A execução só prosseguirá após a conclusão desta etapa.
    *   **Ativar Listeners em Sequência:** Somente após `ensureUserDocument` ter sido resolvido, os listeners `onSnapshot` para `categorias` e `transacoes` serão configurados.
    *   **Gerenciamento de Estado de Carregamento:** A variável `isLoading` será setada para `true` no início do `initData` e para `false` somente após o *primeiro* carregamento do listener de `transacoes`.
    *   Esta abordagem sequencial e explícita (`await` -> `onSnapshot`) elimina a condição de corrida e garante que as consultas ao Firestore sempre operem sobre um caminho de documento válido.
