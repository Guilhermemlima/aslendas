# Arquitetura

## Camadas

```
Server Component (página)
        │  lê
        ▼
services/*.ts  ──── 'server-only', consultas e agregações
        │
        ▼
Supabase (Postgres com RLS + Storage)
        ▲
        │  escreve
app/actions/*.ts ── 'use server', valida com Zod e revalida cache
        ▲
        │
features/*  ──────── componentes de UI (client), sem acesso ao banco
```

Regras que valem em todo o projeto:

- **Nenhum componente de UI conversa com o Supabase para escrever.** Toda escrita
  passa por uma Server Action, que valida com Zod antes de tocar no banco.
- **Services são `server-only`.** Se um import vazar para o cliente, o build quebra.
- **Páginas passam dados serializáveis para os componentes.** Isso mantém o
  componente burro, testável e livre de tipos do banco.
- Regra de negócio sensível (criar casal, aceitar convite, aprovar consentimento,
  pontuar) vive em função do Postgres, não no TypeScript. Assim ela vale mesmo se
  alguém chamar a API direto.

## Modelo de dados

O centro é `couples`. Duas linhas em `couple_members` ligam as pessoas ao casal.
Todo o resto carrega `couple_id`.

```
profiles ──< couple_members >── couples
                                   │
   ┌───────────────┬───────────────┼────────────────┬──────────────┐
   ▼               ▼               ▼                ▼              ▼
memories      timeline_events   letters       time_capsules    surprises
   │               │               │                │              │
   └── memory_media└── timeline_   └── letter_      └── time_      └── surprise_
       (→ media)       event_media     media            capsule_       media
                                                        contents
```

Tabelas de apoio: `albums`, `media`, `locations`, `songs`, `important_dates`,
`bucket_list`, `profile_sections`/`profile_items` (Sobre Ela), `couple_settings`,
`notifications`, `security_logs`.

Jogos: `games` e `achievements` são catálogos globais (sem `couple_id`, leitura
para qualquer autenticado). `game_questions` aceita os dois casos — `couple_id`
nulo é a pergunta que vem com o sistema, preenchido é a pergunta que o casal
criou. `game_sessions` e `game_answers` guardam o histórico.

Área íntima: `consent_categories` (catálogo), `intimate_settings` (por pessoa),
`consent_grants` (um por pessoa e categoria) e `consent_requests` (fluxo do
pedido).

## Por que tabelas-filhas para cápsula e surpresa

A RLS filtra **linhas**, não colunas. Se a mensagem da cápsula estivesse na mesma
tabela do título, esconder a mensagem esconderia também a contagem regressiva.
Separar em `time_capsule_contents` resolve: os dois veem que existe uma cápsula e
quando ela abre, mas o texto só aparece na data.

Na surpresa é o contrário: a existência também precisa ficar escondida, então a
política age na própria linha de `surprises`.

## Motor dos jogos

`GamePlayer` (client) cuida do andamento da rodada. O que muda entre jogos é
apenas o componente de resposta:

| Jogo | Componente |
| --- | --- |
| Você prefere, Quiz, Quem conhece melhor, Batalha, Desafio semanal, Complete a história | `QuestionCard` (opções ou texto livre) |
| Quem é mais provável | `QuestionCard` (escolha entre as duas pessoas) |
| Eu nunca | `QuestionCard` (confissão) |
| Verdade ou desafio | `QuestionCard` (cumpri/passei) |
| Roleta do casal, Roleta de encontros | `Wheel` |
| Adivinhe a foto | `PhotoGuess` |
| Adivinhe a memória | `MemoryGuess` |

A sessão nasce com a lista de perguntas já sorteada e travada em
`game_sessions.question_ids`, para os dois verem a mesma sequência no modo
secreto. A pontuação final é apurada em `finishSession()` e vira XP pela função
`register_game_progress()`.

## Estilo e temas

As cores vivem em CSS variables no `:root`, e `data-palette` no `<html>` troca a
paleta inteira. O valor vem de `couple_settings.palette` e é aplicado já na
renderização do servidor, sem flash. A tela de configurações troca o atributo na
hora, antes mesmo de salvar, para dar preview imediato.

`data-animations="off"` desliga toda animação, e o CSS também respeita
`prefers-reduced-motion`.

## Cache e revalidação

Todas as páginas são dinâmicas (dependem de cookie de sessão). As Server Actions
chamam `revalidatePath()` nas rotas afetadas, e os componentes chamam
`router.refresh()` depois de uma escrita bem-sucedida — assim a UI otimista
converge com o servidor sem recarregar a página inteira.

## Upload

1. O componente chama `createUploadTicket()` (Server Action), que valida tipo e
   tamanho e devolve um caminho + token assinado.
2. O browser envia o arquivo direto para o Supabase Storage.
3. O componente chama `registerMedia()` para gravar os metadados, conferindo de
   novo que o caminho começa pelo `couple_id`.

O arquivo nunca passa pelo servidor Next.
