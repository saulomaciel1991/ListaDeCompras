# Diretrizes de Desenvolvimento: Aplicativo de Lista de Compras (Ionic / Angular)

- **Referência Canônica Obrigatória:** Antes de propor ou implementar modelos de dados, serviços de persistência, cálculos ou novas telas, consulte e siga as especificações do arquivo [CONTEXT.md](CONTEXT.md).
- **Armazenamento e Estado:** O aplicativo adota o paradigma Local-First com SQLite nativo via `@capacitor-community/sqlite` (e `jeep-sqlite` no ambiente web/desenvolvimento). Não utilize `localStorage` para armazenamento das novas entidades de negócio.
- **Motor de Conversão e Precificação Reativa:**
  - O Preço Total ($P_t$) do item é soberano ($P_t = U_p \times Q_p$).
  - O Preço Unitário Secundário ($U_s$) opera com precisão de até **4 casas decimais** (`DECIMAL(10,4)` / `REAL`) para suportar fracionamentos finos (gramas, ml).
  - Respeite a matriz de reatividade e origem do evento (*Source of Truth*) documentada no `CONTEXT.md` para evitar ciclos infinitos ou perda de precisão.
- **Estrutura de Telas e Navegação:**
  - **Tela Inicial (`/lists`):** Gerenciador de Listas de Compra (cards com status, totais e destaque da lista de referência ⭐).
  - **Tela de Itens da Lista (`/lists/:id`):** Compras em tempo real com itens agrupados por categoria e ordenados por `order_index`.
  - **Catálogo de Produtos (`/products`):** CRUD global de produtos com unidades primária/secundária e fatores de conversão.
  - **Gestão de Categorias (`/categories`):** CRUD e reordenação visual via `ion-reorder-group`.
  - **Configurações & Backup (`/settings`):** Preferências padrão (`user_defaults`), Google Drive API (`drive.appdata`) e exportador/importador `.json`.
  - **Menu Lateral (`ion-menu`):** Navegação fluida entre os módulos do app.
- **Migração do Legado:** Respeite a rotina de transição transparente do `localStorage` antigo para a nova base relacional no primeiro boot.
