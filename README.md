# StorageFront

Front-end do **Storage**, gestão de estoque para mercado de bairro vendida como serviço. O
lojista abre no navegador, sem instalar nada.

A API vive em [Storage](https://github.com/rafaeldossanto/Storage).

- **React 19** em **JavaScript**, empacotado com **Vite 8**
- **i18next** para todo texto de tela, em português
- **Vitest** para testes

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

Base pronta: cliente da API com sessão e renovação automática, mensagens em português
para todos os códigos de erro da API, dinheiro, com testes. A tela inicial só mostra se o
servidor está no ar — as telas de verdade esperam a escolha da biblioteca visual.
