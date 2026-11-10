# 📱 Android Phone Farm & Agentic Harness

Orquestrador e Executor open-source para fazendas de celulares Android físicos e virtuais. Conta com streaming de tela em tempo real **H.264 a 60 FPS**, isolamento de rede por aparelho (suporte a proxies dedicados), fila singleton por serial e o motor **Phone-Harness** integrado com suporte nativo ao **Model Context Protocol (FastMCP 4)** para controle por agentes de IA autônomos.

Inspirado no conceito do *Kevs-IOS-Agents*, porém 100% esculpido para o ecossistema Android (ADB), com banco de dados **SQLite WAL local** (zero dependência de Docker ou Postgres externo).

---

## ✨ Principais Recursos

- **Mural em Tempo Real 60 FPS (Hardware H.264):** Transmissão de vídeo de ultra-baixa latência decodificada via Media Source Extensions (MSE) e montagem atômica de unidades de acesso (Access Unit Assembly), permitindo controle tátil fluido diretamente pelo mouse.
- **Camada Agêntica Phone-Harness (FastMCP 4):**
  - Servidor MCP integrado (`npm run mcp`) compatível com Antigravity, Claude Code, Cursor, Codex e Gemini CLI.
  - Árvore de elementos compacta (`farm_get_ui_tree`) com coordenadas centrais calculadas, economizando mais de 80% dos tokens de visão do LLM.
  - Ferramentas completas de visão e ação: clique em coordenadas ou elementos por texto (`farm_tap`), digitação sanitizada (`farm_type`), rolagem (`farm_swipe`), botões físicos (`farm_key`) e gestão de apps (`farm_app`).
- **Arbitrador de Concorrência (`DeviceLockManager`):**
  - Gerenciamento de 4 estados (`idle`, `script_running`, `agent_active`, `manual_override`).
  - Previne colisões entre toques manuais no painel, rotinas agendadas em fila (`script@1`) e agentes de IA autônomos (`agent@1`).
  - Botão de intervenção manual no painel para pausar ou assumir o controle a qualquer momento.
- **Isolamento de Rede por Aparelho (Proxies):**
  - Cadastro de proxies HTTP/HTTPS e SOCKS5 via interface web.
  - Atribuição individual com suporte a autenticação (`user:password`) via relay reverso local.
  - Auditoria de IP público diretamente pelo terminal do celular.
- **Fila e Agendador Recorrente:**
  - Singleton lock por serial de aparelho.
  - Agendamentos por intervalo (minutos), horário diário fixo ou disparo sob demanda.

---

## 🚀 Instalação Rápida

### Pré-requisitos
1. **Node.js** (v20 ou superior)
2. **ADB (Android Debug Bridge)** habilitado no sistema (ou na pasta `bin/`)
3. Um ou mais aparelhos Android com **Depuração USB** ativada

### Iniciar o Painel Web
```bash
# Entrar na pasta do projeto
cd phone-farm

# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run dev
```

Acesse o painel em: **`http://localhost:3300`**

### Iniciar o Servidor MCP (Phone-Harness para IA)
```bash
npm run mcp
```

Para conectar em clientes de IA (ex: Claude Code, Cursor, Gemini):
```json
{
  "mcpServers": {
    "phone-farm": {
      "command": "node",
      "args": ["--import", "tsx", "src/harness/cli.ts"]
    }
  }
}
```

---

## 📁 Estrutura do Projeto

```text
phone-farm/
├── .github/workflows/       # CI (TypeCheck & Build) e Release automáticos
│   ├── ci.yml
│   └── release.yml
├── src/
│   ├── api/                 # Servidor Fastify e Dashboard Web
│   │   ├── server.ts
│   │   └── views/dashboard.ts
│   ├── database/            # SQLite WAL e inicialização de schemas
│   │   └── client.ts
│   ├── devices/             # Driver ADB, streaming H.264 e proxies
│   │   ├── adb.ts
│   │   ├── discovery.ts
│   │   ├── h264-stream.ts
│   │   └── proxy.ts
│   ├── harness/             # Engine Phone-Harness & FastMCP 4
│   │   ├── android-harness.ts
│   │   ├── lock-manager.ts
│   │   ├── mcp-server.ts
│   │   └── cli.ts
│   ├── plugins/             # Plugins determinísticos (ex: TikTok)
│   ├── scheduler/           # Fila de execução e worker singleton
│   └── index.ts             # Ponto de entrada
├── scripts/                 # Scripts de exemplo de automação
└── package.json
```

---

## 🏷️ Gestão de Releases & Versionamento

O projeto segue [Semantic Versioning (SemVer)](https://semver.org/):
- `v1.0.0` — Lançamento estável com streaming H.264 60 FPS, FastMCP 4 e Lock Manager.
- Para gerar uma nova release no GitHub automaticamente:
  ```bash
  # Criar e enviar a tag de versão
  git tag v1.0.0
  git push origin v1.0.0
  ```
  O GitHub Actions executará o build, validará a tipagem TypeScript e publicará o **GitHub Release** com changelog automático e arquivo `.zip`.

---

## 📄 Licença

MIT License. Livre para uso pessoal e comercial.
