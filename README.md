# StorageFront

Front-end do **Storage**, gestão de estoque para mercado de bairro vendida como serviço. O
lojista abre no navegador, sem instalar nada.

A API vive em [Storage](https://github.com/rafaeldossanto/Storage).

- **React 19** em **JavaScript**, empacotado com **Vite 8**
- **Tailwind CSS 4** + **shadcn/ui** (Radix por baixo, ícones Lucide, fontes Geist)
- **i18next** para todo texto de tela, em português
- **Vitest** + **Testing Library** para testes

## Visual

A referência é o Med Organizer: sidebar verde-floresta, página off-white, cards brancos,
valores em fonte mono verde, âmbar na marca. E, mais que a cor, o jeito de usar:

- **Um toque registra.** Bipar um código já age: código novo abre o cadastro preenchido,
  código conhecido abre a edição.
- **"Desfazer" em vez de "Tem certeza?"** — o toast da confirmação traz o botão, por 10 s.
- **Edição no lugar.** O painel "Nesta sessão" deixa ajustar o preço ali mesmo, e salva
  sozinho ao sair do campo.

Todas as cores são variáveis em `src/index.css` (`--primary`, `--sidebar`, `--money`...),
com um segundo conjunto para o modo escuro. Componente nenhum escreve uma cor direto.

Os componentes em `src/components/ui/` vêm do shadcn (`npx shadcn@latest add <nome>`) e
são código do projeto: dá para ler e mudar. Eles importam `cn` do pacote `cn`, do próprio
shadcn, que junta classes do Tailwind.

JavaScript e não TypeScript, por escolha: este front é onde o JavaScript está sendo
aprendido. Os comentários do código explicam os conceitos da linguagem nos pontos em que
eles aparecem (Promises e `async`/`await`, closures, `this`, `??` e `?.`, desestruturação).

## Como rodar

Precisa da API rodando (veja o README do repositório `Storage`). Depois:

```bash
npm install
npm run dev
```

O endereço da API vem de `VITE_API_URL` em `.env.development`. Para apontar para outro
lugar sem mexer no arquivo versionado, crie um `.env.development.local`. Use só a origem
(`http://localhost:5067`), sem caminho no final.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes |
| `npm run build` | Build de produção |
| `npm run lint` | Lint |

## Cliente da API

As telas chamam `api.get`, `api.post`... de `src/api/client.js` e recebem os dados, ou um
`ApiError`. Por baixo são três arquivos, todos sobre o `fetch` do próprio navegador, sem
biblioteca:

| Arquivo | Papel |
| --- | --- |
| `src/api/http.js` | A viagem crua: monta o endereço, envia, lê a resposta, transforma recusa em `ApiError` |
| `src/api/session.js` | Quem está logado: entrar, sair, cadastrar loja, restaurar a sessão, renovar o token |
| `src/api/client.js` | O que as telas usam: assina cada requisição com o token e renova quando ele expira |

## Sessão

- **O access token fica só na memória**, numa variável do módulo — nunca em
  `localStorage`, que qualquer script na página consegue ler. O refresh token nem chega
  ao JavaScript: a API o guarda num cookie `HttpOnly`.
- **Ao abrir a página**, chame `restoreSession()`: troca o cookie por um token novo.
  Devolve a conta, ou `null` quando não há sessão (hora de mostrar o login). Sem
  internet ele lança erro — estar offline não é estar deslogado.
- **Token expirado no meio do uso** (dura 15 minutos): o cliente renova sozinho e repete a
  requisição uma vez. A pessoa não percebe.
- **Uma renovação por vez, sempre.** A API aposenta o refresh token no instante em que ele
  é usado, e vê-lo de novo é tratado como roubo: todas as sessões da pessoa caem. Por
  isso, requisições que expiram juntas esperam a mesma renovação, e abas diferentes se
  revezam pela Web Locks API (`navigator.locks`).
- **`onSessionChange(listener)`** avisa a cada entrada, saída ou expiração — é por ali que
  o app vai trocar para a tela de login.

Sem tipos, nada avisa em tempo de build quando a API muda um campo. O contrato fica em
`Storage/openapi/storage-api.json`, versionado no backend: confira ali antes de usar uma
rota nova, e cubra com teste o que depender do formato da resposta.

## Convenções

**Idioma.** Código, nomes de arquivo e commits em inglês. Todo texto que o lojista lê fica
em `src/i18n/pt-BR.json` — nunca escrito direto no componente.

**Igualdade estrita.** Sempre `===` e `!==`, que nunca convertem tipos. A única exceção é
`value != null`, que testa `null` e `undefined` de uma vez; o lint barra o resto.

**Erros.** A API recusa com um `code` estável (`barcode.taken`,
`category.move_into_own_branch`...). A tela mostra a mensagem em português daquele código;
o `detail` que vem junto é texto técnico em inglês e não vai para a tela. Código ainda
desconhecido cai na mensagem genérica, nunca aparece cru.

**Leitor USB é um teclado rápido.** O leitor "digita" o código e aperta Enter, cada tecla
a poucos milissegundos da anterior. `src/lib/scanner.js` separa essa rajada (menos de
20 ms entre teclas, pelo menos 8 caracteres, terminando em Enter) da digitação de uma
pessoa, para a tela agir na hora quando foi o leitor. Use sempre o `event.timeStamp` do
evento, não `Date.now()`.

**404 no código de barras é caminho normal.** Buscar um código que não existe é a deixa
para abrir o cadastro já preenchido, não um erro.

**Dinheiro em centavos inteiros**, como na API. O número do JavaScript é um `double`, que
não guarda 8,99 exato; 899 ele guarda. `src/lib/money.js` formata e lê valores digitados
sem nunca passar por `parseFloat`.

## Estado

Prontas, cada uma no seu endereço:

- **`/produtos`**: cadastro por bipagem, busca por nome, categorias, paginação, edição,
  exclusão com "Desfazer" e o painel da sessão.
- **`/vender`**: caixa simples. O fardo bipado conta as unidades dele, o preço já vem com
  desconto, "Concluir venda" baixa o estoque, e a venda pode ser desfeita por 10 minutos.
- **`/vendas`**: trancada por PIN, como o de um computador. O dono cria o PIN, digitado
  duas vezes; qualquer um da equipe abre com ele por 15 minutos. Mostra vendido, custo,
  líquido e margem do dia, mês ou ano, um gráfico (colunas para o vendido, linha para o
  líquido, com tabela equivalente) e os produtos vendidos.

As cores do gráfico (`--chart-revenue` e `--chart-net`, em `src/index.css`) foram
validadas como par contra o fundo do card nos dois temas: faixa de luminosidade, croma,
contraste e separação para daltônicos.

Os testes das telas rodam num navegador simulado (jsdom): o arquivo pede isso com
`// @vitest-environment jsdom` no topo.

Próximas telas, na ordem do plano: categorias (arrastar para mover), regras de desconto,
painel de vencimento, contagem pelo celular.
