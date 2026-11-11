# Especificação - Document Management System

## 1. Objetivo

Definir um sistema web mínimo para enviar, listar e baixar documentos por usuário, mantendo os arquivos no filesystem local e seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo por requisição usando `multipart/form-data`.
- Listar os documentos associados ao usuário da requisição.
- Baixar um documento pelo identificador, somente quando associado ao usuário da requisição.
- Identificar o usuário por um cabeçalho HTTP nesta fase inicial, sem autenticação.
- Gravar os arquivos localmente em `backend/storage` com Multer `diskStorage`.
- Manter os metadados dos documentos em memória durante a execução do processo.
- Disponibilizar os fluxos de upload, listagem e download pela aplicação React, consumindo a API via `fetch`.

### Fora do escopo

- Autenticação, autorização baseada em credenciais ou cadastro/persistência de usuários.
- Persistência de metadados em banco de dados ou recuperação automática dos metadados após reinício.
- Armazenamento em nuvem, serviços de upload de terceiros ou qualquer storage externo.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Paginação, filtros e ordenação configurável.
- Restrição por extensão ou tipo MIME declarado pelo cliente.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | A API deve exigir o cabeçalho `X-User-Id` não vazio nas três operações de documentos. O valor identifica o proprietário nesta fase e não representa autenticação segura. |
| RF-02 | O usuário pode enviar exatamente um arquivo no campo multipart `file` de `POST /upload`. |
| RF-03 | O upload deve aceitar qualquer tipo de arquivo, até 10 MiB (10.485.760 bytes). Arquivo ausente ou sem conteúdo deve ser rejeitado. |
| RF-04 | Após um upload válido, a API deve gravar o conteúdo em `backend/storage`, criar metadados com identificador único e associar o documento ao valor de `X-User-Id`. |
| RF-05 | O nome recebido do cliente deve ser preservado somente como `originalName` nos metadados. O nome físico no storage deve ser gerado pela aplicação, ser único e não depender de caminho ou nome de arquivo fornecido pelo cliente. |
| RF-06 | O usuário pode listar somente os documentos cujo `owner` corresponde exatamente ao seu `X-User-Id`. Uma lista sem documentos deve retornar sucesso com uma coleção vazia. |
| RF-07 | A listagem deve estar ordenada por `uploadedAt` decrescente. Em caso de empate, a ordem deve ser determinística pelo `id` em ordem crescente. |
| RF-08 | O usuário pode baixar um documento pelo `id` somente quando o documento pertence ao seu `X-User-Id`. IDs inexistentes e documentos de outro usuário devem produzir a mesma resposta externa. |
| RF-09 | O download deve retornar o conteúdo binário original como anexo, usando `originalName` no cabeçalho `Content-Disposition`. |
| RF-10 | Se o arquivo associado a metadados não existir no disco, o download deve retornar não encontrado e não deve expor caminhos locais. |
| RF-11 | Respostas de erro da API devem usar o formato JSON definido na seção 6, exceto quando a resposta de sucesso do download já tiver iniciado o envio binário. |
| RF-12 | A interface deve permitir selecionar e enviar um arquivo, apresentar os documentos listados e solicitar o download de um documento. Deve apresentar erros da API sem interromper a aplicação. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local, em `backend/storage`, usando Multer com `diskStorage`. Não utilizar storage externo. |
| RNF-02 | Os metadados permanecem em memória e não precisam sobreviver ao reinício do processo. O sistema não deve tentar reconstruí-los varrendo o diretório de storage. |
| RNF-03 | Como arquivos locais sobrevivem ao processo e os metadados não, um reinício pode deixar arquivos órfãos em `backend/storage`; a limpeza desses arquivos é manual e está fora do escopo. |
| RNF-04 | O limite máximo do arquivo é 10 MiB (10.485.760 bytes), aplicado no recebimento pelo Multer. Upload acima do limite deve ser rejeitado com `413`. |
| RNF-05 | O tamanho (`size`) deve ser expresso em bytes e representar o tamanho gravado do arquivo. O horário deve ser serializado em ISO 8601 UTC. |
| RNF-06 | O caminho físico e o nome interno do arquivo nunca devem ser retornados pela API ou exibidos na interface. O caminho de destino deve ser construído pela aplicação, sem concatenar entrada do usuário. |
| RNF-07 | O servidor deve tratar erros de validação, upload e filesystem nos limites da aplicação, sem retornar stack trace, conteúdo de caminhos locais ou detalhes internos ao cliente. |
| RNF-08 | A configuração de porta deve usar a variável de ambiente `PORT`, com padrão `3000`, conforme o seed atual. O diretório de storage permanece fixo em `backend/storage` por restrição do projeto. |
| RNF-09 | A implementação deve usar JavaScript, Node.js, Express, React e Vite já definidos pelo projeto; testes backend devem usar `node:test`. |

## 5. Modelo de dados (metadados do documento)

### Representação pública

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, UUID v4 gerado pelo servidor. |
| `originalName` | string | Nome original fornecido no upload; usado como nome de download, nunca como caminho físico. |
| `size` | number | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601 UTC, por exemplo `2026-11-11T12:00:00.000Z`. |
| `owner` | string | Valor de `X-User-Id` usado na criação. |

Este é o único formato de metadados exposto em respostas JSON. A API não deve expor propriedades internas de armazenamento.

### Dados internos de persistência

O repositório mantém em memória os campos públicos e uma referência interna ao nome físico gerado pelo servidor (por exemplo, o próprio UUID sem extensão). A referência interna é usada para localizar o arquivo dentro de `backend/storage`; não é fornecida pelo cliente e não integra o DTO público. A extensão original não deve ser necessária para resolver o caminho físico.

Cada entrada em memória corresponde a um arquivo gravado no disco. Se o processo reiniciar, as entradas em memória são perdidas e os arquivos podem permanecer no diretório. Não há garantia de recuperação ou listagem desses arquivos órfãos.

## 6. Contratos de API

### Convenções

- As rotas abaixo são caminhos do backend. No desenvolvimento, o frontend chama `/api` seguido do caminho, e o proxy do Vite remove `/api` antes de encaminhar a requisição.
- Todas as operações de documentos exigem `X-User-Id` com valor não vazio. O valor é tratado como identificador opaco; não há autenticação nesta versão.
- Os nomes de campos JSON seguem exatamente o modelo público da seção 5.
- Formato comum de erro:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição breve do erro."
  }
}
```

### `POST /upload`

Envia um arquivo e cria os metadados correspondentes.

**Cabeçalhos**

- `X-User-Id`: obrigatório.
- `Content-Type`: `multipart/form-data`, definido pelo cliente HTTP com o boundary apropriado.

**Corpo**

- Um campo de arquivo chamado `file`.
- Exatamente um arquivo, com tamanho maior que zero e menor ou igual a 10.485.760 bytes.
- Qualquer tipo de arquivo é aceito; o tipo MIME declarado pelo cliente não é usado para autorizar o upload.

**Sucesso: `201 Created`**

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "user-123"
  }
}
```

**Erros**

| HTTP | `code` | Condição |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` está ausente ou vazio. |
| `400 Bad Request` | `MISSING_FILE` | O campo `file` está ausente ou o arquivo está vazio. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | O arquivo excede 10.485.760 bytes. |
| `500 Internal Server Error` | `UPLOAD_FAILED` | Falha inesperada ao gravar o arquivo ou criar seus metadados. |

### `GET /documents`

Lista os documentos do usuário identificado no cabeçalho, mais recentes primeiro.

**Cabeçalhos**

- `X-User-Id`: obrigatório.

**Sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-11-11T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Sem documentos, retornar `200 OK` com `{"documents": []}`. Não há paginação.

**Erro**

| HTTP | `code` | Condição |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` está ausente ou vazio. |
| `500 Internal Server Error` | `LIST_FAILED` | Falha inesperada ao consultar os metadados em memória. |

### `GET /documents/:id/download`

Retorna os bytes do arquivo associado ao identificador, somente se o documento pertencer ao usuário do cabeçalho.

**Cabeçalhos**

- `X-User-Id`: obrigatório.

**Sucesso: `200 OK`**

- Corpo binário idêntico ao arquivo enviado.
- `Content-Type: application/octet-stream`.
- `Content-Disposition: attachment` com o nome de download `originalName` devidamente codificado pelo mecanismo HTTP usado.
- Não retornar metadados JSON no corpo do download.

**Erros**

| HTTP | `code` | Condição |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` está ausente ou vazio. |
| `404 Not Found` | `DOCUMENT_NOT_FOUND` | O ID não existe, pertence a outro usuário ou seu arquivo não está disponível no disco. A resposta deve ser igual nesses casos. |
| `500 Internal Server Error` | `DOWNLOAD_FAILED` | Falha inesperada de leitura que não seja arquivo ausente. |

## 7. Decisões arquiteturais

- **Backend:** Node.js e Express em CommonJS. O fluxo de dependência é `routes -> controllers -> services -> repositories`.
- **Routes:** declaram os caminhos e encaminham a requisição aos controllers. O middleware Multer da rota de upload usa `diskStorage` com destino `backend/storage` e limite de 10.485.760 bytes.
- **Controllers:** validam os dados de entrada e traduzem resultados/erros de aplicação para status HTTP, cabeçalhos e corpos definidos nesta especificação.
- **Services:** concentram as regras de negócio, incluindo associação ao proprietário e verificação de acesso ao download.
- **Repositories:** mantêm metadados em memória e resolvem os arquivos gravados localmente. Camadas internas não dependem de Express ou de detalhes HTTP.
- **Identificadores e nomes de arquivo:** o servidor gera um UUID v4 e um nome físico opaco e único. O nome original não é usado para compor o caminho no filesystem.
- **Frontend:** React com componentes funcionais e Hooks, organizado em `components/`, `pages/` e `services/`. A comunicação com o backend usa `fetch` pelo prefixo `/api` do proxy Vite.
- **Configuração:** a porta usa `PORT` com padrão `3000`; o diretório de storage é fixado pela restrição em `backend/storage`.
- **Health check:** o endpoint `GET /health` existente permanece independente dos fluxos de documentos.
- **Segurança e limites:** `X-User-Id` é apenas um identificador fornecido pelo cliente. Esta especificação não oferece autenticação nem proteção adequada para exposição pública; o sistema deve ser tratado como aplicação local/de desenvolvimento até existir uma camada de identidade confiável.

## 8. Plano de execução

As etapas abaixo são propostas para uma implementação futura. Esta especificação não executa nem inclui alterações nos arquivos de backend ou frontend.

1. Implementar no backend o middleware Multer com `diskStorage`, limite de tamanho, geração de nome interno único, repositório em memória e serviço/controlador/rota de upload.
2. Implementar listagem por proprietário, ordenação definida e download autorizado pelo proprietário, incluindo tratamento de arquivo ausente e erros HTTP padronizados.
3. Adicionar testes backend com `node:test` para contratos, validação, isolamento entre usuários, limite de upload e leitura local de arquivos.
4. Implementar no frontend os serviços `fetch` para upload, listagem e download, além das telas/componentes necessários para esses fluxos e apresentação de erros.
5. Integrar frontend e backend via proxy `/api`, executar os testes e o build do frontend e validar manualmente os fluxos ponta a ponta.
