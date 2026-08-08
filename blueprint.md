# Visão Geral do Projeto

Este é um aplicativo Vue.js com Firebase integrado. O objetivo é fornecer uma aplicação web com autenticação de usuário e funcionalidades de dashboard.

## Funcionalidades Implementadas

*   **Configuração do Firebase:** O projeto está configurado para usar o Firebase para autenticação.
*   **Página de Login:** Uma página de login básica que permite aos usuários existentes acessarem o sistema.
*   **Página de Dashboard:** Uma página de dashboard simples que é exibida após o login bem-sucedido.
*   **Roteamento:** O Vue Router está configurado para gerenciar a navegação entre as páginas.

## Plano de Mudança Atual: Implementar Cadastro de Usuário

O objetivo desta mudança é adicionar a funcionalidade de cadastro de novos usuários ao sistema.

1.  **Criar o Componente de Cadastro (`Register.vue`):**
    *   Um novo arquivo `Register.vue` será criado em `src/components`.
    *   Este componente conterá um formulário com os seguintes campos:
        *   Nome (input de texto)
        *   Email (input de email)
        *   Senha (input de senha)
    *   Um botão "Cadastrar" para submeter o formulário.

2.  **Atualizar o Roteador (`router.ts`):**
    *   Uma nova rota será adicionada para o caminho `/register`, que renderizará o componente `Register.vue`.

3.  **Atualizar a Página de Login (`Login.vue`):**
    *   Um link será adicionado à página de login com o texto "Não tem uma conta? Cadastre-se", que levará o usuário para a página `/register`.

4.  **Implementar a Lógica de Cadastro:**
    *   No `Register.vue`, a função `createUserWithEmailAndPassword` do Firebase Auth será usada para criar um novo usuário.
    *   Após a criação do usuário, as informações do usuário (nome e email) serão salvas em uma coleção chamada `usuarios` no Cloud Firestore.
    *   Após o cadastro bem-sucedido, o usuário será redirecionado para a página de dashboard.

5.  **Estilização:**
    *   A página de cadastro terá um design limpo e moderno, consistente com o restante da aplicação.
