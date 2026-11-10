# NexStock — Sistema de Gestão de Estoque, Vendas e Manutenção

O **NexStock** — apresentado como **NextStock** em parte da interface — é uma aplicação web de gestão comercial criada em JavaScript puro. O sistema foi desenvolvido para centralizar o controle de produtos, estoque, clientes, fornecedores, pedidos, recebimentos e produtos em manutenção ou garantia.

A aplicação funciona diretamente no navegador, possui armazenamento local com `localStorage` e pode sincronizar dados com o Firebase/Cloud Firestore quando o usuário entra com uma conta Google.

> **Projeto publicado:** [https://nextstock-25dbd.web.app](https://nextstock-25dbd.web.app)

---

## Visão geral

O NexStock foi construído para apoiar uma rotina de vendas com controle de estoque e acompanhamento financeiro básico. A partir de um painel único, é possível:

- cadastrar produtos e controlar suas quantidades em estoque;
- registrar clientes, seus contatos e documentos;
- cadastrar fornecedores e consultar os produtos associados a cada um;
- criar pedidos relacionando cliente e produto;
- registrar pedidos pagos ou pendentes;
- trabalhar com parcelamento de pedidos pendentes;
- registrar pagamentos parciais ou totais;
- acompanhar quanto cada cliente já comprou e quanto ainda deve;
- registrar produtos enviados para manutenção ou garantia;
- acompanhar prazos de devolução e garantias vencidas;
- consultar indicadores de vendas, recebimentos, estoque e inadimplência;
- pesquisar e filtrar registros por texto, período e status;
- usar leitor de código de barras pela câmera para preencher o código de um produto;
- alternar entre tema claro e escuro.

O sistema não é apenas um cadastro de produtos: ele relaciona clientes, produtos e pedidos, calcula saldos devedores, controla recebimentos e apresenta alertas operacionais no painel inicial.

---

## Funcionalidades detalhadas

### 1. Painel inicial

A tela inicial apresenta uma visão resumida da operação:

- total de clientes cadastrados;
- total de pedidos registrados;
- quantidade total de unidades em estoque;
- receita real recebida, calculada a partir do histórico de pagamentos;
- alerta de pedidos com pagamentos pendentes;
- alerta de produtos em manutenção, garantias expiradas e garantias próximas do vencimento;
- atalhos para criar pedido, cadastrar cliente, cadastrar produto e abrir o Analytics.

O painel não utiliza apenas o valor total das vendas para calcular o caixa. A receita real considera os valores efetivamente registrados no histórico de pagamentos dos pedidos.

### 2. Clientes

O módulo de clientes permite:

- cadastrar nome e telefone, que são obrigatórios;
- cadastrar CPF/CNPJ opcional;
- cadastrar endereço;
- editar dados existentes;
- excluir clientes mediante confirmação;
- pesquisar por nome, telefone ou CPF;
- filtrar clientes entre **Todos**, **Em Dia** e **Devendo**;
- visualizar o total comprado por cliente;
- visualizar o saldo devedor acumulado;
- consultar a quantidade de pedidos do cliente;
- abrir o histórico de pedidos do cliente;
- iniciar um novo pedido já com o cliente selecionado.

O CPF/CNPJ é verificado para evitar duplicidade entre clientes. A situação financeira do cliente é calculada a partir da soma dos valores restantes de seus pedidos.

No histórico de cada cliente, o sistema permite filtrar os pedidos por mês e por status — pagos ou pendentes — e exibe também a posição do cliente no ranking de maiores compradores.

### 3. Produtos e estoque

O módulo **Produtos & Estoque** permite:

- cadastrar nome do produto;
- cadastrar código ou referência;
- informar preço;
- informar quantidade inicial em estoque;
- vincular o produto a um fornecedor;
- editar produtos;
- excluir produtos mediante confirmação;
- adicionar estoque rapidamente sem abrir o formulário completo;
- pesquisar por nome ou código;
- filtrar produtos por dia, mês e ano de entrada;
- identificar visualmente produtos sem estoque;
- visualizar data e hora de entrada do produto.

O sistema impede o cadastro de dois produtos com o mesmo nome ou com o mesmo código. Produtos com estoque igual a zero ou menor são destacados como **FORA DE ESTOQUE** e não podem ser selecionados para novos pedidos.

Ao registrar um pedido, uma unidade do produto selecionado é retirada automaticamente do estoque. O preço utilizado no pedido é o preço atual do produto no momento do registro.

### 4. Leitura de código de barras

No formulário de produto existe um botão para abrir o scanner da câmera. A implementação atualmente carregada pelo `index.html` utiliza a biblioteca **Quagga**, via CDN, e tenta reconhecer os seguintes tipos de código:

- Code 128;
- EAN;
- EAN-8;
- Code 39;
- UPC.

Após a leitura, o código detectado é preenchido automaticamente no campo **Código/Referência**.

O scanner depende de:

- navegador compatível com acesso à câmera;
- permissão do usuário;
- conexão segura via HTTPS ou execução em `localhost`;
- disponibilidade da biblioteca carregada pela CDN.

### 5. Fornecedores

O módulo de fornecedores permite:

- cadastrar fornecedor;
- cadastrar nome e contato/telefone;
- editar fornecedor;
- excluir fornecedor mediante confirmação;
- pesquisar pelo nome ou contato;
- visualizar quantos produtos estão vinculados a cada fornecedor;
- abrir uma lista dos produtos, códigos e preços de um fornecedor;
- iniciar uma ligação pelo telefone cadastrado em dispositivos compatíveis.

Para preservar os vínculos existentes, o sistema impede a exclusão de um fornecedor enquanto houver produtos associados a ele.

### 6. Pedidos e vendas

O módulo de pedidos é o centro da operação de vendas. Para criar um pedido, o usuário seleciona:

1. um cliente, pesquisando por nome, telefone ou CPF;
2. um produto, pesquisando por nome ou código;
3. a forma de pagamento;
4. a quantidade de parcelas, quando o pagamento estiver pendente.

O sistema oferece os status:

- **Pago Total**: registra o pedido como quitado e cria automaticamente um pagamento no valor total;
- **Pendente (Devendo)**: registra o pedido com saldo restante e permite definir de 1 a 6 parcelas.

Cada pedido armazena:

- cliente relacionado;
- produto relacionado;
- data e hora;
- valor total;
- quantidade de parcelas;
- valor estimado de cada parcela;
- saldo restante;
- histórico de pagamentos;
- status calculado a partir do saldo restante.

Na tela de pedidos é possível:

- filtrar por dia, mês e ano;
- filtrar entre todos, pagos e pendentes;
- pesquisar pelo nome do cliente ou do produto;
- consultar detalhes do pedido;
- visualizar o histórico de pagamentos;
- registrar novos pagamentos;
- excluir um pedido mediante confirmação.

O registro de pagamentos aceita pagamentos parciais. A cada pagamento, o sistema recalcula o saldo restante. Quando o saldo chega a zero, o pedido passa para o status **PAGO**.

### 7. Manutenção e garantia

O módulo **Manutenção / Garantia** permite registrar produtos que foram recebidos para conserto, análise ou atendimento de garantia. Cada registro pode conter:

- cliente;
- produto;
- descrição do problema;
- prazo em dias para devolução;
- foto do produto;
- data de registro;
- prazo calculado de garantia;
- status do atendimento.

Os registros podem ser filtrados por:

- todos;
- pendentes;
- expirados;
- devolvidos.

Também é possível:

- pesquisar por cliente ou produto;
- visualizar a foto ampliada;
- marcar o produto como devolvido;
- estender o prazo de garantia informando dias adicionais;
- excluir o registro mediante confirmação.

O painel inicial cria alertas para:

- garantias expiradas;
- garantias que vencem nos próximos três dias;
- produtos ainda em conserto.

A foto é convertida para Data URL/Base64 e armazenada junto ao registro. O projeto não utiliza, atualmente, o Firebase Storage para armazenar imagens.

### 8. Analytics e fechamento

O módulo **Analytics & Fechamento** permite selecionar mês e ano e apresenta:

- valor total das vendas realizadas no período;
- quantidade de pedidos do período;
- dinheiro efetivamente recebido no mês, com base nos pagamentos registrados;
- quantidade de clientes com saldo devedor;
- calendário visual de vendas por dia;
- indicação de dias sem venda, dias com vendas pagas e dias com pedidos pendentes;
- resumo do total de unidades em estoque;
- quantidade de produtos esgotados;
- lista dos produtos mais vendidos no mês;
- ranking dos cinco clientes que mais compraram;
- ranking dos cinco maiores devedores;
- relação detalhada de clientes devedores;
- relação de vendas realizadas no mês.

A área de Analytics diferencia **vendas realizadas** de **dinheiro em caixa**. Uma venda pendente entra no valor vendido, mas só entra no caixa quando há pagamento registrado.

### 9. Tema, interface e responsividade

A interface utiliza Bootstrap, Font Awesome e estilos CSS próprios. O usuário pode alternar entre tema claro e escuro, e a preferência fica salva no navegador.

Em telas menores:

- a barra lateral passa para a parte superior;
- o menu pode ser rolado horizontalmente;
- os cartões de indicadores passam a ocupar uma coluna;
- as tabelas ficam dentro de áreas com rolagem horizontal quando necessário.

---

## Como o sistema funciona internamente

O projeto é uma aplicação front-end sem framework, organizada em arquivos JavaScript por domínio funcional. A página `public/index.html` cria o ponto de entrada da aplicação e carrega os módulos em sequência.

A navegação é feita sem troca de páginas. A função `renderApp()` renderiza novamente o conteúdo do elemento `#root` conforme a página ativa:

- `home`;
- `pedidos`;
- `clientes`;
- `produtos`;
- `fornecedores`;
- `manutencao`;
- `analytics`.

A página ativa fica salva no `localStorage`, permitindo que o navegador retome a última seção aberta.

### Organização dos arquivos

```text
.
├── firebase.json
├── README.md
├── img/
│   └── logobela.jpeg
└── public/
    ├── index.html
    ├── css/
    │   ├── base.css
    │   ├── components.css
    │   ├── pages.css
    │   ├── responsive.css
    │   ├── style.css
    │   └── variables.css
    └── js/
        ├── analytics.js
        ├── app.js
        ├── auth.js
        ├── clientes.js
        ├── data.js
        ├── firebase-config.js
        ├── fornecedores.js
        ├── manutencao.js
        ├── pedidos.js
        ├── produtos.js
        ├── scanner.js
        └── utils.js
```

### Responsabilidade dos módulos

| Arquivo | Responsabilidade |
|---|---|
| `app.js` | Renderização da aplicação, painel inicial, navegação e eventos de pesquisa. |
| `data.js` | Estado local, persistência, cálculos financeiros, relacionamentos e migração de dados antigos. |
| `auth.js` | Login com Google, logout, persistência da sessão e sincronização com Firestore. |
| `clientes.js` | Cadastro, edição, exclusão, pesquisa e filtros de clientes. |
| `produtos.js` | Cadastro de produtos, estoque, validações e scanner Quagga. |
| `pedidos.js` | Criação de pedidos, parcelamento, pagamentos e histórico de compras. |
| `fornecedores.js` | Cadastro de fornecedores e consulta dos produtos vinculados. |
| `manutencao.js` | Garantias, manutenção, prazos, fotos e devoluções. |
| `analytics.js` | Indicadores, rankings, calendário de vendas e resumo do estoque. |
| `utils.js` | Tema, filtros globais, modais e cálculo de receita. |
| `scanner.js` | Implementação alternativa baseada em ZXing; não é carregada atualmente pelo `index.html`. |
| `firebase-config.js` | Configuração pública do projeto Firebase. |

---

## Armazenamento e sincronização

### Armazenamento local

Sem login, os dados são mantidos no navegador usando as seguintes chaves:

- `nextsock-clientes`;
- `nextsock-produtos`;
- `nextsock-fornecedores`;
- `nextsock-pedidos`;
- `nextsock-manutencao`;
- `nextsock-active-page`;
- `nextsock-theme`.

Isso permite usar o sistema localmente no mesmo navegador, mas também significa que os dados podem ser perdidos se o armazenamento do site for apagado ou se o usuário mudar de dispositivo/navegador.

### Login com Google e Firestore

O login é realizado com o Firebase Authentication usando o provedor Google. Quando autenticado, o sistema:

- mantém a sessão com persistência local, de sessão ou em memória, conforme a capacidade do navegador;
- cria um documento do usuário em `users/{uid}`;
- grava itens em subcoleções por usuário;
- sincroniza alterações individuais para o Firestore;
- escuta alterações em tempo real de clientes, produtos e fornecedores.

As coleções utilizadas pelo código são:

```text
users/{uid}/clientes
users/{uid}/produtos
users/{uid}/fornecedores
users/{uid}/pedidos
users/{uid}/manutencao
```

A sincronização em tempo real implementada no `auth.js` acompanha diretamente clientes, produtos e fornecedores. Pedidos e manutenções são enviados ao Firestore nas operações de criação ou alteração, mas não possuem listeners equivalentes nesse módulo para atualização em tempo real entre várias abas ou dispositivos.

---

## Requisitos

Para executar o projeto, é necessário:

- navegador moderno com suporte a JavaScript ES Modules;
- conexão com a internet para carregar Bootstrap, Font Awesome, Google Fonts, Quagga e Firebase via CDN;
- servidor HTTP local — não é recomendado abrir o `index.html` diretamente com `file://`;
- HTTPS ou `localhost` para utilizar a câmera do scanner;
- projeto Firebase configurado, caso o login e a sincronização em nuvem sejam utilizados.

Não há `package.json`, processo de build ou dependências instaladas localmente. As bibliotecas externas são carregadas diretamente no `index.html` por CDN.

---

## Execução local

Entre na pasta do projeto e inicie um servidor HTTP simples:

```bash
cd NewNextStock
python3 -m http.server 8000 --directory public
```

Depois, abra:

```text
http://localhost:8000
```

Também é possível utilizar qualquer servidor estático, como Live Server, Nginx, Apache ou outro servidor compatível.

---

## Publicação no Firebase Hosting

O arquivo `firebase.json` já está configurado para publicar a pasta `public`:

```json
{
  "hosting": {
    "public": "public"
  }
}
```

Com a Firebase CLI instalada e autenticada, o fluxo básico é:

```bash
firebase login
firebase use SEU_PROJECT_ID
firebase deploy --only hosting
```

Antes da publicação, confira:

1. se o `projectId` de `firebase-config.js` corresponde ao projeto correto;
2. se o domínio do Authentication está autorizado no Firebase;
3. se o provedor Google está habilitado em **Authentication > Sign-in method**;
4. se as regras do Firestore permitem somente o acesso autorizado ao usuário correto;
5. se o site está sendo servido por HTTPS.

---

## Regras de negócio implementadas

- Nome de produto não pode ser repetido, ignorando diferenças entre maiúsculas e minúsculas.
- Código de produto não pode ser repetido.
- CPF/CNPJ duplicado não é aceito para clientes.
- Um produto fora de estoque não pode ser escolhido em um novo pedido.
- Cada novo pedido reduz uma unidade do estoque.
- Pedido pago registra automaticamente um pagamento integral.
- Pedido pendente pode receber vários pagamentos parciais.
- O saldo devedor é a soma dos saldos restantes dos pedidos do cliente.
- Fornecedor vinculado a produtos não pode ser excluído.
- Produto usado em registros antigos de cliente não pode ser excluído pela validação existente.
- Garantia vencida é identificada automaticamente pela data atual.
- Garantias com vencimento em até três dias aparecem como alerta no painel.

---

## Limitações e observações técnicas

As observações abaixo refletem o comportamento atual do código e são importantes para entender exatamente a capacidade do projeto:

1. **Persistência local por navegador:** sem login, os dados não são uma base centralizada. Eles ficam no `localStorage` do navegador e não são compartilhados automaticamente entre dispositivos.

2. **Sincronização parcial em nuvem:** o Firestore é utilizado, mas o listener em tempo real está implementado para clientes, produtos e fornecedores. Pedidos e manutenções são sincronizados nas operações realizadas, porém não têm a mesma escuta em tempo real no código de autenticação.

3. **Exclusão de pedido não devolve estoque:** ao excluir um pedido, o código remove o registro, mas não repõe automaticamente a unidade anteriormente retirada do estoque. Essa é uma regra que deve ser considerada antes de usar a exclusão como correção de venda.

4. **Validação de pagamento:** o sistema impede valores vazios ou menores/iguais a zero, mas não bloqueia explicitamente um pagamento maior que o saldo restante. O saldo exibido continua limitado a zero pelo cálculo de `valorRestante`.

5. **Fotos de manutenção:** imagens são armazenadas como Base64/Data URL. Fotos grandes podem aumentar bastante o tamanho do `localStorage` e dos documentos do Firestore.

6. **Scanner alternativo não ativo:** `scanner.js` contém uma implementação baseada em `ZXingWASM`, mas essa biblioteca não é carregada pelo `index.html` e o arquivo não é incluído como script na página. O scanner ativo atualmente é o código baseado em Quagga dentro de `produtos.js`.

7. **Chart.js carregado sem gráfico configurado:** o `index.html` carrega Chart.js, mas os indicadores atuais são renderizados com cartões, tabelas e um calendário visual em HTML/CSS; não há criação de gráficos Chart.js no código analisado.

8. **Anos disponíveis nos filtros:** alguns filtros apresentam os anos 2024, 2025, 2026 e 2027 fixamente. Para trabalhar com outros anos, essa lista precisa ser atualizada no código.

9. **Regras de segurança do Firestore não estão no repositório:** é necessário configurar e revisar as regras no Firebase para garantir que cada usuário acesse apenas seus próprios documentos.

10. **Credenciais do Firebase no front-end:** a configuração web do Firebase aparece no código do cliente, como é comum em aplicações Firebase. A proteção real depende das regras do Authentication, Firestore e demais serviços; a chave pública não deve ser tratada como mecanismo de autorização.

11. **Sem controle de usuários e perfis:** o código possui login com Google, mas não implementa níveis de acesso, administradores, funcionários ou permissões por módulo.

12. **Sem emissão fiscal ou integração de pagamento:** o sistema registra vendas e recebimentos internamente, mas não emite nota fiscal, não processa cartão/Pix e não se conecta a gateways de pagamento.

13. **Sem relatórios exportáveis:** os dados são exibidos na interface, mas não existe no código analisado exportação para PDF, Excel ou CSV.

---

## Tecnologias utilizadas

- HTML5;
- CSS3;
- JavaScript moderno;
- Bootstrap 5.3;
- Font Awesome 6.4;
- Google Fonts — Poppins;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Hosting;
- Quagga 0.12.1 para leitura de código de barras;
- Chart.js carregado como dependência disponível, embora não utilizado nos componentes atuais.

---

## Resumo da capacidade do trabalho

O NexStock é um sistema de gestão de estoque e vendas com uma proposta ampla para pequenos negócios. Sua principal capacidade está na integração entre os cadastros: um produto pode ser associado a um fornecedor, vendido para um cliente por meio de um pedido, gerar parcelas e pagamentos, influenciar o saldo devedor do cliente e aparecer nos indicadores de vendas e caixa. O mesmo produto também pode ser encaminhado para manutenção, ter um prazo de garantia acompanhado e gerar alertas na tela inicial.

Em termos de organização, o projeto já possui uma separação clara por módulos e reúne recursos de cadastro, controle operacional, acompanhamento financeiro, manutenção e análise. A arquitetura atual é adequada para uma aplicação front-end de pequeno ou médio porte, especialmente quando utilizada com Firebase para autenticação e persistência em nuvem.

Para transformar o projeto em uma solução ainda mais robusta para uso comercial, os próximos avanços mais importantes seriam: regras completas de segurança do Firestore, sincronização em tempo real para todas as coleções, reposição de estoque ao estornar/excluir pedidos, validações financeiras mais rígidas, armazenamento de imagens no Firebase Storage, exportação de relatórios e controle de permissões por usuário.
