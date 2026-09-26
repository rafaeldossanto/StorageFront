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

`src/api/client.js` é o único lugar que fala HTTP com a API, escrito sobre o `fetch` do
próprio navegador, sem biblioteca. As telas chamam `api.get`, `api.post`... e recebem os
dados, ou um `ApiError`.

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

**404 no código de barras é caminho normal.** Buscar um código que não existe é a deixa
para abrir o cadastro já preenchido, não um erro.

**Dinheiro em centavos inteiros**, como na API. O número do JavaScript é um `double`, que
não guarda 8,99 exato; 899 ele guarda. `src/lib/money.js` formata e lê valores digitados
sem nunca passar por `parseFloat`.

## Estado

Base pronta: cliente da API, traduções, tratamento de erro e dinheiro, com testes. A tela
inicial só mostra se o servidor está no ar — as telas de verdade esperam a escolha da
biblioteca visual.
