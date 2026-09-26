# StorageFront

Front-end do **Storage**, gestão de estoque para mercado de bairro vendida como serviço. O
lojista abre no navegador, sem instalar nada.

A API vive em [Storage](https://github.com/rafaeldossanto/Storage).

- **React 19 + TypeScript 6**, empacotado com **Vite 8**
- **i18next** para todo texto de tela, em português
- **openapi-fetch** com tipos gerados do contrato da API
- **Vitest** para testes

## Como rodar

Precisa da API rodando (veja o README do repositório `Storage`). Depois:

```bash
npm install
npm run dev
```

O endereço da API vem de `VITE_API_URL` em `.env.development`. Para apontar para outro
lugar sem mexer no arquivo versionado, crie um `.env.development.local`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes |
| `npm run build` | Checagem de tipos e build de produção |
| `npm run lint` | Lint |
| `npm run api:types` | Regenera os tipos da API a partir do contrato |

## Cliente da API

Os tipos em `src/api/schema.d.ts` são **gerados**, não escritos à mão. A API escreve o
contrato em `Storage/openapi/storage-api.json` a cada build; depois que ela mudar, rode
`npm run api:types` com os dois repositórios lado a lado na mesma pasta. Uma rota ou um
campo que deixou de existir passa a quebrar a compilação aqui, em vez de quebrar na tela
do lojista.

O gerador roda isolado via `npx`, com versão fixada: o `openapi-typescript` ainda exige
TypeScript 5, e o projeto está no 6. O arquivo gerado é só declaração de tipos e funciona
nos dois.

## Convenções

**Idioma.** Código, nomes de arquivo e commits em inglês. Todo texto que o lojista lê fica
em `src/i18n/pt-BR.json` — nunca escrito direto no componente.

**Erros.** A API recusa com um `code` estável (`barcode.taken`,
`category.move_into_own_branch`...). A tela mostra a mensagem em português daquele código;
o `detail` que vem junto é texto técnico em inglês e não vai para a tela. Código ainda
desconhecido cai na mensagem genérica, nunca aparece cru.

**404 no código de barras é caminho normal.** Buscar um código que não existe é a deixa
para abrir o cadastro já preenchido, não um erro.

**Dinheiro em centavos inteiros**, como na API. O `number` do navegador é `double`, que não
guarda 8,99 exato; 899 ele guarda. `src/lib/money.ts` formata e lê valores digitados sem
nunca passar por `parseFloat`.

## Estado

Base pronta: cliente tipado, traduções, tratamento de erro e dinheiro, com testes. A tela
inicial só mostra se o servidor está no ar — as telas de verdade esperam a escolha da
biblioteca visual.
