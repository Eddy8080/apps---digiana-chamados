# 📱 Digiana Chamados — Mobile App

Aplicativo móvel multiplataforma (**Android**, **iOS** e **Web**) desenvolvido em **React Native** e **Expo** para gestão, abertura e acompanhamento de chamados e suporte técnico do ecossistema **Digiana**.

---

## 🔗 Relação com o Sistema Principal

Este aplicativo é a interface móvel oficial integrada diretamente ao ecossistema de chamados da Digiana:

- **Sistema Base / Backend:** `/media/ed/Dados1/projetos/Digiana-Chamados`
  - Desenvolvido em **Python / Django**
  - Fornece a **API REST** nativa (Django REST Framework)
  - Porta/URL padrão da API: `http://localhost:8009/api/v1` (ou `http://10.0.2.2:8009/api/v1` no emulador Android)
- **Propósito:** Oferecer aos usuários, gestores e desenvolvedores uma experiência nativa, ágil e segura conectada aos endpoints Django do sistema principal.

---

## ✨ Funcionalidades Principais

- 🔐 **Autenticação Segura:** Login via JWT autenticado diretamente no backend Django, com armazenamento seguro de credenciais e tokens (`expo-secure-store`), fluxo de primeiro acesso e alteração de senha obrigatória.
- 📊 **Dashboard & Métricas:** Visão geral de chamados em aberto, em andamento e concluídos, sincronizados com a base de dados Django.
- 📋 **Gestão de Chamados:** Listagem paginada consumindo os endpoints REST com busca por texto e filtros por status e prioridade (Baixa, Média, Alta, Urgente).
- 🎫 **Detalhes e Linha do Tempo:** Visualização detalhada do chamado, histórico de interações, respostas e alteração de status por perfil de acesso.
- ➕ **Abertura de Chamados:** Formulário intuitivo para cadastro de novos tickets com suporte a envio de anexos/fotos para o backend (`expo-image-picker`).
- 👤 **Perfil do Usuário:** Dados cadastrais retornados pela API Django, identificação por perfil/papel (`admin`, `gestor`, `dev`, `usuario`), alteração de senha e encerramento de sessão.
- 🎨 **Interface Moderna:** Suporte automático e manual a temas Claro e Escuro, tipografia acessível e componentes com feedback tátil.

---

## 🛠️ Tecnologias e Bibliotecas

- **Frontend Mobile:** [Expo](https://expo.dev/) (SDK 58)
- **Core:** [React Native](https://reactnative.dev/) 0.88 & React 19
- **Roteamento:** [Expo Router](https://docs.expo.dev/router/introduction/) (Navegação baseada em arquivos com TypeScript)
- **Backend Integrado:** Python / Django (Django REST Framework)
- **Armazenamento Seguro:** `expo-secure-store`
- **Mídia:** `expo-image-picker`, `expo-image`
- **Animações e Gestos:** `react-native-reanimated`, `react-native-gesture-handler`
- **Ícones e Estilo:** `@expo/vector-icons`, temas adaptáveis

---

## 📂 Estrutura de Pastas

```
chamados/
├── assets/                     # Logos, splash screens e ícones adaptativos
├── src/
│   ├── app/                    # Rotas do Expo Router
│   │   ├── (tabs)/             # Abas principais
│   │   │   ├── index.tsx       # Início / Dashboard
│   │   │   ├── chamados.tsx    # Listagem geral e filtros
│   │   │   ├── novo.tsx        # Criação de chamado
│   │   │   └── perfil.tsx      # Perfil do usuário
│   │   ├── chamado/
│   │   │   └── [id].tsx        # Detalhes do chamado e interações
│   │   ├── login.tsx           # Tela de autenticação
│   │   ├── alterar-senha.tsx   # Redefinição/troca de senha
│   │   └── _layout.tsx         # Configuração de navegação raiz e Guards
│   ├── components/             # Componentes modulares (StatusBadge, PriorityBadge, etc.)
│   ├── contexts/               # Autenticação e estado global (AuthContext)
│   ├── services/               # Camada de comunicação com a API REST Django (api.ts)
│   └── constants/              # Paleta de cores, tipografia e temas
├── app.json                    # Configurações do app Expo
└── package.json                # Dependências e scripts
```

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js instalado (v18+)
- Backend Django do [Digiana-Chamados](/media/ed/Dados1/projetos/Digiana-Chamados) ativo (porta `8009` por padrão)
- App **Expo Go** no celular (iOS/Android) ou emulador configurado

### 2. Instalação
```bash
npm install
```

### 3. Configuração de Ambiente (Opcional)
Se precisar apontar para um endereço de API diferente do padrão (`localhost:8009`):
Crie um arquivo `.env` na raiz do projeto:
```env
EXPO_PUBLIC_API_URL=http://<SEU_IP_LOCAL>:8009/api/v1
```

### 4. Inicializar o App
```bash
npx expo start
```

No terminal interativo do Expo:
- Pressione `a` para abrir no emulador Android
- Pressione `i` para abrir no simulador iOS
- Pressione `w` para abrir no navegador web
- Ou escaneie o QR Code no app **Expo Go** pelo celular conectado na mesma rede Wi-Fi

---

## 🧪 Verificação e Qualidade de Código

Para checar tipos e integridade do projeto:

```bash
# Verificação de tipos TypeScript
npx tsc --noEmit

# Verificação de linting
npx expo lint
```

---

## 📦 Repositório Oficial

- **GitHub:** [https://github.com/Eddy8080/apps---digiana-chamados](https://github.com/Eddy8080/apps---digiana-chamados)
