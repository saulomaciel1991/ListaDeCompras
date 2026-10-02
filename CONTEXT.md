# CONTEXT.md - Especificação Técnica e de Negócio: Aplicativo de Compras (Ionic)

Documento mestre de especificação técnica, modelo de dados, regras de negócio, fluxos de interface e arquitetura de navegação para guiar o desenvolvimento e manutenção do aplicativo de listas de compras.

---

## 1. Visão Geral da Arquitetura & Stack Tecnológica

* **Framework Frontend:** Ionic Framework com Angular (Standalone Components) e Capacitor.
* **Armazenamento Primário:** SQLite nativo via plugin Capacitor (`@capacitor-community/sqlite`).
* **Suporte a Desenvolvimento Web (`ionic serve`):** Em ambiente de navegador/desenvolvimento web, o plugin utiliza o componente WebAssembly `jeep-sqlite` para emular o banco SQLite em memória/IndexedDB, permitindo ciclo completo de desenvolvimento e testes sem necessidade de emulador móvel permanente.
* **Paradigma de Dados:** Local-First. Todo o ciclo de CRUD opera diretamente no banco de dados SQLite local, garantindo funcionamento offline contínuo e responsivo.
* **Sincronização & Backup:**
  * **Google Drive API:** Backup e sincronismo de snapshots estruturados utilizando a pasta oculta `drive.appdata` (inacessível diretamente ao usuário no Drive para evitar corrupção acidental de arquivos).
  * **Exportação/Importação Manual:** Exportação e restauração manual via arquivo `.json`, além de rotina de ingestão em lote de múltiplos arquivos históricos legados.
* **Ambiente de Build iOS:** Compilação nativa de pacotes `.ipa` requer macOS/Xcode. Contêineres Docker puros (base Linux) são inviáveis devido à exigência das ferramentas proprietárias da Apple. A esteira deve utilizar CI/CD baseada em runners macOS (ex.: GitHub Actions `macos-latest` com Fastlane/Capacitor CLI) ou Ionic Appflow.

---

## 2. Modelo de Dados Relacional (SQLite)

```sql
-- 1. Categorias de produtos com ordenação personalizada
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0
);
CREATE INDEX idx_categories_order ON categories(order_index);

-- 2. Produtos globais cadastrados (Catálogo Geral)
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,                   -- Ex: 'Feijão Preto', 'Leite Integral'
    category_id TEXT,
    unit_primary TEXT NOT NULL,                  -- Ex: 'pct', 'cx', 'kg', 'l', 'un'
    conversion_type TEXT NOT NULL,               -- 'MULTIPLY' ou 'DIVIDE'
    conversion_factor REAL NOT NULL DEFAULT 1.0, -- Valor numérico estritamente > 0
    unit_secondary TEXT NOT NULL,                -- Ex: 'un', 'g', 'ml'
    created_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);

-- 3. Listas de compras (histórico completo de listas salvas)
CREATE TABLE lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- Ex: 'Supermercado 02/Out', 'Feira Semanal'
    status TEXT NOT NULL DEFAULT 'active',       -- 'active', 'completed', 'archived'
    is_reference_price INTEGER NOT NULL DEFAULT 0, -- 1 para a lista base de comparação, 0 para as demais
    completed_at TEXT,                           -- Data/hora de conclusão
    last_accessed_at TEXT,                       -- Data/hora do último acesso
    created_at TEXT NOT NULL
);
CREATE INDEX idx_lists_status ON lists(status);
CREATE INDEX idx_lists_reference ON lists(is_reference_price);

-- 4. Itens vinculados a uma lista específica
CREATE TABLE list_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    brand TEXT DEFAULT '',                       -- Snapshot da marca adquirida (para comparação justa)
    purchase_quantity REAL NOT NULL,             -- Quantidade na unidade primária (ex: 2 caixas)
    unit_primary TEXT NOT NULL,                  -- Snapshot da unidade no momento da compra
    conversion_type TEXT NOT NULL,               -- 'MULTIPLY' ou 'DIVIDE'
    conversion_factor REAL NOT NULL,             -- Fator > 0
    unit_secondary TEXT NOT NULL,                -- Snapshot da unidade secundária
    unit_price_primary REAL NOT NULL DEFAULT 0.00,        -- Preço unitário primário (2 decimais)
    price_per_secondary_unit REAL NOT NULL DEFAULT 0.0000, -- Preço unitário secundário (até 4 decimais)
    total_price REAL NOT NULL DEFAULT 0.00,                -- Preço total pago pelo lote (soberano, 2 decimais)
    is_checked INTEGER NOT NULL DEFAULT 0,                 -- 0 = pendente, 1 = no carrinho/comprado
    created_at TEXT NOT NULL,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
CREATE INDEX idx_list_items_list ON list_items(list_id);
CREATE INDEX idx_list_items_product ON list_items(product_id);
CREATE INDEX idx_list_items_brand ON list_items(brand);

-- 5. Configurações e preferências de preenchimento padrão
CREATE TABLE user_defaults (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_unit_primary TEXT DEFAULT 'un',
    default_conversion_type TEXT DEFAULT 'MULTIPLY',
    default_conversion_factor REAL DEFAULT 1.0,
    default_unit_secondary TEXT DEFAULT 'un',
    default_quantity REAL DEFAULT 1.0,
    auto_focus_field TEXT DEFAULT 'price',        -- 'price', 'quantity', 'name'
    default_view_mode TEXT DEFAULT 'basic'        -- 'basic' ou 'complete'
);
```

---

## 3. Gestão de Múltiplas Listas & Lista de Referência de Preço

### 3.1 Lista de Referência (`is_reference_price`)
* O aplicativo mantém múltiplas listas salvas de forma persistente.
* Exatamente **uma** lista na tabela `lists` deve possuir `is_reference_price = 1`. Ela é a fonte oficial dos preços da "última compra" para comparação em tempo real.
* **Promoção Automática:** Ao finalizar qualquer lista (`status = 'completed'`):
  1. Remove o marcador de referência das outras listas:
     ```sql
     UPDATE lists SET is_reference_price = 0;
     ```
  2. Promove a lista recém-finalizada a referência de mercado:
     ```sql
     UPDATE lists SET is_reference_price = 1, completed_at = CURRENT_TIMESTAMP WHERE id = :list_id;
     ```
* **Seleção Manual:** No Gerenciador de Listas, o usuário pode definir explicitamente qualquer lista anterior como a referência ativa, executando a transação de desmarcar a anterior e marcar a selecionada.

### 3.2 Consulta do Preço Histórico
Ao adicionar ou exibir itens na lista de compras ativa, o último preço registrado é obtido por:
```sql
SELECT 
    li.price_per_secondary_unit, 
    li.unit_price_primary, 
    li.total_price, 
    li.purchase_quantity, 
    li.unit_primary, 
    li.unit_secondary,
    li.brand
FROM list_items li
JOIN lists l ON li.list_id = l.id
WHERE l.is_reference_price = 1 
  AND li.product_id = :product_id
  AND li.total_price > 0
ORDER BY 
  (CASE WHEN LOWER(li.brand) = LOWER(:brand) THEN 0 ELSE 1 END),
  li.created_at DESC
LIMIT 1;
```

*Se o usuário informou uma marca, o sistema prioriza o preço histórico daquela mesma marca para uma comparação justa de mercado. Caso a marca informada não tenha histórico, utiliza o preço registrado para o produto em outra marca. Se o produto não constar na lista de referência ou seu `total_price` for zero, o item é tratado como sem histórico prévio.*

---

## 4. Regras de Conversão, Precisão e Motor Reativo

### 4.1 Equações de Conversão entre Unidades
A quantidade total na unidade secundária ($Q_s$) é derivada da quantidade na unidade primária ($Q_p$) utilizando o fator de conversão ($F > 0$):

$$Q_s = \begin{cases} Q_p \times F, & \text{se } \text{conversion\_type} = \text{'MULTIPLY'} \\ \dfrac{Q_p}{F}, & \text{se } \text{conversion\_type} = \text{'DIVIDE'} \end{cases}$$

### 4.2 Precisão Numérica e Regras Monetárias
* **Preço Total ($P_t$) e Preço Unitário Primário ($U_p$):** 2 casas decimais (arredondamento bancário standard `ROUND(val, 2)`).
* **Preço Unitário Secundário ($U_s$):** Até **4 casas decimais** (`DECIMAL(10,4)` armazenado como `REAL`).
  * *Motivação:* Fracionamentos finos (ex.: pó de café por grama, leite por ml, especiarias) geram valores menores que R$ 0,01 por unidade secundária. Se truncado a 2 casas, resultaria em R$ 0,00, inviabilizando comparações de gôndola.
  * *Exibição:* A interface pode exibir na listagem ou comparativo o valor por escala visual amigável (ex.: R$ por 100g ou R$ por 1kg) ou exibir as 4 casas decimais quando apropriado.

### 4.3 Princípio Soberano do Preço Final
* O cálculo do montante total do item sempre obedece à primeira unidade de medida (unidade de compra):
  $$P_t = U_p \times Q_p$$
* A segunda unidade de medida atua na conferência de frações, comparação de custo por menor unidade e conferência em gôndola.

### 4.4 Motor Reativo por Origem do Evento (`Source of Truth`)
Para recalcular campos inconsistentes ou incorretos sem disparar loops de referência circular, o campo tocado pelo usuário dita a verdade absoluta e atualiza os demais campos programaticamente de forma silenciosa (ex.: `emitEvent: false` no Angular):

| Campo Editado pelo Usuário | Impacto em $U_p$ | Impacto em $U_s$ (até 4 dec) | Impacto em $P_t$ (2 dec) |
| :--- | :--- | :--- | :--- |
| **Unitário Primário ($U_p$)** | Mantém valor digitado | Recalcula:<br>$\text{MULTIPLY} \implies U_s = U_p / F$<br>$\text{DIVIDE} \implies U_s = U_p \times F$ | Recalcula:<br>$P_t = \text{round}(U_p \times Q_p, 2)$ |
| **Unitário Secundário ($U_s$)** | Recalcula:<br>$\text{MULTIPLY} \implies U_p = U_s \times F$<br>$\text{DIVIDE} \implies U_p = U_s / F$ | Mantém valor digitado | Recalcula:<br>$P_t = \text{round}(U_p \times Q_p, 2)$ |
| **Preço Total ($P_t$)** | Recalcula:<br>$U_p = P_t / Q_p$ | Recalcula via novo $U_p$:<br>$\text{MULTIPLY} \implies U_s = U_p / F$<br>$\text{DIVIDE} \implies U_s = U_p \times F$ | Mantém valor digitado |
| **Quantidade Primária ($Q_p$)** | Mantém fixo | Mantém fixo | Recalcula:<br>$P_t = \text{round}(U_p \times Q_p, 2)$ |
| **Fator ($F$) / Tipo ($T$)** | Mantém $U_p$ como âncora | Recalcula $U_s$ aplicando novo $F$ e $T$ | Mantém fixo |

---

## 5. Especificação de Telas, Rotas e Interface (UI/UX)

### 5.1 Arquitetura de Navegação & Menu Lateral (`ion-menu`)
O menu lateral fornece acesso direto e unificado a todos os módulos do aplicativo:
* 📋 **Listas de Compras** (`/lists` - Tela Inicial)
* 📦 **Catálogo de Produtos** (`/products` - Manutenção Geral de Produtos)
* 🏷️ **Categorias** (`/categories` - Manutenção e Reordenação de Categorias)
* ⚙️ **Configurações & Backup** (`/settings` - Preferências padrão, Google Drive, JSON)

---

### 5.2 Tela Inicial: Gerenciador de Listas de Compra (`/lists`)
* **Rota Inicial Padrão:** Carregada na abertura do aplicativo.
* **Lista de Cards:** Exibe todas as listas registradas (`active`, `completed`, `archived`).
* **Identificadores Visuais:**
  * Tag/Badge colorida indicando status.
  * Destaque exclusivo: **⭐ Lista de Referência** para a lista com `is_reference_price = 1`.
  * Total já gasto no carrinho e total estimado da lista.
  * Data de criação ou conclusão.
* **Ações por Lista (Menu de Contexto / Swipe):**
  * **Abrir Lista:** Navega para `/lists/:id`.
  * **Concluir Lista:** Altera status para `'completed'`, preenche `completed_at` e promove automaticamente a lista a Referência de Preços.
  * **Definir como Referência:** Permite fixar manualmente uma lista como referência sem precisar concluí-la novamente.
  * **Duplicar Lista:** Clona a lista e seus itens (com quantidades preservadas, checks desmarcados e preços copiados como base).
  * **Excluir Lista:** Remove a lista e seus itens em cascata (com diálogo de confirmação).
* **Botão Flutuante (FAB `+`):** Criação rápida de nova lista via modal simples (Nome da lista e data).

---

### 5.3 Tela de Itens da Lista de Compras (`/lists/:id`)
* **Objetivo:** Experiência de compra em tempo real no ponto de venda.
* **Cabeçalho:** Nome da lista, badge de status e menu de ações rápidas (limpar carrinho, alternar ordenação, concluir lista).
* **Listagem Agrupada:** Itens agrupados por **Categoria**, ordenados pelo `order_index` das categorias (reproduzindo o percurso físico dos corredores do supermercado).
* **Card/Linha do Item:**
  * Checkbox (`is_checked`): Ao marcar, aplica estilo visual de comprado (riscado) e move para o fim do grupo ou lista.
  * Nome do Produto e Quantidade ($Q_p$ e $U_p$).
  * Preço Total Pago ($P_t$).
  * **Comparativo com a Referência:**
    * Comparação do $U_s$ atual com o $U_s$ da lista de referência.
    * **Verde:** Preço menor que a referência (com tag de economia percentual, ex.: `▼ -8%`).
    * **Vermelho:** Preço maior que a referência (com tag de aumento percentual, ex.: `▲ +12%`).
    * **Oculto/Neutro:** Preço idêntico ou produto sem histórico prévio.
* **Barra de Totais Fixa (Footer):**
  * Total no Carrinho: Somatório de $P_t$ dos itens marcados com `is_checked = 1`.
  * Total Pendente: Somatório dos itens não marcados.
  * Total Geral da Lista.
* **FAB `+`:** Abre o Modal de Inclusão de Itens.

---

### 5.4 Tela/Modal de Inclusão de Itens
* **Controle de Visualização (Switch/Toggle Básico vs. Completo):**
  * **Modo Básico:** Exibe apenas seleção de Produto, Quantidade ($Q_p$) e Preço Total ($P_t$). Fatores e unidades secundárias operam em segundo plano herdados do produto.
  * **Modo Completo:** Exibe Unidade Primária, Tipo de Conversão, Fator de Conversão, Unidade Secundária, $U_p$, $U_s$ e $P_t$.
  * O estado do switch é persistido em `user_defaults` para preservar a preferência do usuário.
* **Fluxo de Cadastro Rápido Inline (Fast-Track):**
  * O campo de seleção de produto possui busca rápida com auto-complete.
  * Se o produto digitado **não existir no catálogo**, exibe a opção em destaque:  
    👉 *"+ Cadastrar '[Nome Digitado]' e adicionar à lista"*.
  * Ao selecionar essa opção:
    1. O produto é criado instantaneamente na tabela `products` com categoria "OUTROS" (ou categoria selecionada no contexto) e unidades padrão de `user_defaults`.
    2. O item é associado à lista de compras ativa imediatamente, sem obrigar o usuário a interromper a compra para navegar até a tela de produtos.
* **Preço Não Obrigatório:**
  * Pode ser salvo com valor zerado (`total_price = 0.00`).

---

### 5.5 Tela de Manutenção de Produtos (Catálogo Geral - `/products`)
* **Objetivo:** Gestão global do portfólio de produtos cadastrados.
* **Listagem:**
  * Barra de busca rápida por nome.
  * Filtro por categoria.
  * Exibição de Nome, Categoria, Unidades padrão e Fator de Conversão.
* **CRUD Completo:**
  * Criação e Edição de produtos: Nome, Categoria, $U_p$, Tipo de Conversão (`MULTIPLY`/`DIVIDE`), Fator ($F$) e $U_s$.
  * Exclusão: Protegida com integridade referencial (`ON DELETE RESTRICT`). Se o produto já foi utilizado em alguma lista de compras do histórico, a exclusão é bloqueada com aviso orientando a renomear ou manter o cadastro.

---

### 5.6 Tela de Manutenção de Categorias (`/categories`)
* **Objetivo:** Gestão dos agrupamentos e corredores de compras.
* **Reordenação Visual:**
  * Utilização do componente `ion-reorder-group` para permitir arrastar e soltar as categorias.
  * A ordem visual atualiza imediatamente o campo `order_index` de cada categoria, refletindo instantaneamente na organização da lista de compras.
* **CRUD de Categorias:**
  * Adicionar categoria com nome único.
  * Editar nome da categoria.
  * Exclusão: Caso uma categoria excluída possua produtos associados, a chave estrangeira em `products` é ajustada para `NULL` (`ON DELETE SET NULL`), migrando os produtos para a classificação padrão "OUTROS".

---

### 5.7 Tela de Configurações & Backup (`/settings`)
* **Preferências de Preenchimento Padrão (`user_defaults`):**
  * Configuração da unidade primária padrão, secundária, fator, quantidade inicial e modo de exibição preferido.
* **Backup e Sincronização Google Drive:**
  * Autenticação e conexão com a conta Google.
  * Sincronização de snapshot estruturado com a pasta de dados do aplicativo (`drive.appdata`).
  * Indicador de data/hora do último backup na nuvem.
* **Importação e Exportação Local (JSON):**
  * Exportar base completa para arquivo `.json`.
  * Restaurar base a partir de arquivo `.json`.
  * Botão utilitário para importar arquivos legados adicionais.

---

## 6. Estratégia de Migração de Dados Legados e Importação em Lote

### 6.1 Migração Automática do Legado (`localStorage`)
O aplicativo anterior mantinha uma lista simples em `localStorage` sob a chave `'itens'` com o formato:
```typescript
interface Item {
    id: string;
    qtd: number;
    valor: number;
    descricao: string;
    noCarrinho: boolean;
    categoria: string;
}
```

No primeiro boot da nova versão, uma rotina de migração executará a transação atômica:
1. Cria a categoria padrão para cada `categoria` única encontrada (em maiúsculas), inserindo em `categories` com `order_index` incremental.
2. Para cada item distinto por `descricao`:
   * Insere em `products` com nome padronizado, categoria mapeada, `unit_primary = 'un'`, `unit_secondary = 'un'`, `conversion_type = 'MULTIPLY'`, `conversion_factor = 1.0`.
3. Cria uma lista inicial em `lists`:
   * Nome: `"Lista Migrada"` (ou `"Lista Atual"`).
   * Status: `'active'`.
   * `is_reference_price = 1`.
4. Insere cada item em `list_items` vinculado à lista criada, com suas respectivas quantidades, valores e status de carrinho (`noCarrinho` $\rightarrow$ `is_checked`).
5. Registra a flag `legacy_migrated_v1 = true` no storage para garantir idempotência.

### 6.2 Ingestão de Múltiplos Arquivos Históricos (`.json`)
* O aplicativo disponibiliza rotina de importação cumulativa para consolidar backups passados.
* Ao importar arquivos adicionais:
  * **Categorias e Produtos:** São unificados via `INSERT OR IGNORE` (ou verificação de unicidade por nome), reaproveitando cadastros já existentes.
  * **Listas:** São inseridas como novas listas arquivadas (`status = 'archived'`) preservando as datas originais registradas nos arquivos de backup.

---

## 7. Suporte ao Ambiente de Desenvolvimento Web (`jeep-sqlite`)

Para garantir que o comando `npm start` ou `ionic serve` continue executando de forma ágil no navegador de desenvolvimento:
* O pacote `@capacitor-community/sqlite` é inicializado em conjunto com o custom element `jeep-sqlite`.
* O `index.html` deve conter o script e a tag `<jeep-sqlite>` para inicialização do motor WebAssembly / IndexedDB.
* O `DatabaseService` encapsula a checagem de plataforma:
  * Em **Capacitor Nativo (Android/iOS):** Conecta diretamente ao driver nativo de SQLite do dispositivo móvel.
  * Em **Web / Electron:** Inicializa o store do `jeep-sqlite` e salva o banco local no IndexedDB do navegador.
