# Segurança e privacidade

Este projeto guarda fotos, vídeos, cartas e conteúdo íntimo de duas pessoas. As
decisões abaixo partem de uma premissa: **o banco de dados é a fronteira de
segurança, não o frontend.**

## Isolamento por casal

Toda tabela de conteúdo tem `couple_id` e uma política de RLS
`is_couple_member(couple_id)`. Mesmo que alguém obtenha a `anon key` (ela é
pública por natureza) e monte requisições à mão, o Postgres devolve zero linhas
fora do casal da sessão.

`is_couple_member()` é `SECURITY DEFINER` para poder consultar `couple_members`
sem recursão infinita nas próprias políticas.

## Conteúdo que precisa ficar escondido do parceiro

Três casos em que "pertencer ao casal" não basta:

| Caso | Como resolve |
| --- | --- |
| Cápsula do tempo antes da data | Metadados em `time_capsules` (visíveis, para a contagem regressiva) e a mensagem em `time_capsule_contents`, cuja política exige `unlock_at <= now()` ou ser quem criou |
| Carta programada | Política de `letters` exige `author_id = auth.uid()` ou `deliver_at <= now()` |
| Surpresa agendada | Política de `surprises` esconde a linha inteira: quem vai receber não vê nem que existe |

Nada disso depende do frontend "não mostrar".

## Resposta secreta nos jogos

A política de `game_answers` só libera a resposta da outra pessoa quando a
sessão não é secreta ou quando `secret_answers_ready()` confirma que as duas
responderam. Não dá para espiar pelo devtools.

## Storage

Três buckets privados: `couple-media`, `letters-media`, `private-media`.

- O caminho sempre começa pelo `couple_id`: `couple-media/<couple_id>/<ano>/<uuid>.<ext>`.
- As políticas de `storage.objects` leem a primeira pasta do caminho e conferem
  se quem pede é do casal.
- Nenhuma URL pública é gerada. O app usa **signed URLs de 30 minutos**,
  assinadas em lote no servidor.
- Tipo MIME e tamanho são validados duas vezes: no bucket (Postgres) e na
  Server Action que emite o ticket de upload.
- O upload vai direto do browser para o storage por URL assinada — o arquivo
  não passa pelo servidor Next, o que evita o limite de payload da Vercel.

## Área íntima

Quatro camadas, todas obrigatórias:

1. **Maioridade**: confirmação explícita, gravada em `intimate_settings.adult_confirmed_at`.
2. **PIN próprio**, separado da senha da conta. Guardado como `scrypt` com salt
   por usuário; a comparação usa `timingSafeEqual`. A sessão desbloqueada vive
   em cookie `httpOnly` + `sameSite=strict` de 30 minutos, e o cookie só diz
   "esta pessoa digitou o PIN", nunca carrega conteúdo.
3. **Consentimento mútuo**: uma categoria só fica ativa com grant vigente das
   **duas** pessoas (`consent_grants`, conferido por `getActiveConsents`). Um sim
   sozinho não libera nada. Aprovar um pedido em nome do outro é bloqueado dentro
   de `respond_consent_request()`, no Postgres.
4. **Preferências individuais**: nível máximo de intensidade e bloqueio de
   categorias valem só para quem configurou, e são aplicados no filtro de
   perguntas antes de qualquer coisa chegar à tela.

Retirar o consentimento tem efeito imediato: revoga o grant, cancela pedidos
pendentes e a categoria some da listagem na próxima consulta.

Notificações da área íntima nunca contêm conteúdo — o texto é neutro
("existe um pedido esperando sua resposta"). O layout da área usa título de aba
genérico e `noindex/nosnippet`.

## Indexação e vazamento por link

- `robots.txt` bloqueia tudo.
- `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex` em todas as respostas.
- `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`.
- Sem Open Graph e sem preview de link.
- O middleware redireciona qualquer rota não pública para `/entrar`, e valida a
  sessão com `getUser()` (revalida o token no servidor) em vez de confiar no cookie.

## Entrada de dados

- Todo formulário passa por um schema Zod (`src/lib/validation.ts`), usado tanto
  no cliente quanto na Server Action.
- `sanitizeText()` remove caracteres de controle e limita tamanho antes de gravar.
- Textos são renderizados como texto (React escapa por padrão) — não há
  `dangerouslySetInnerHTML` em lugar nenhum.

## Auditoria

`security_logs` guarda login, falha de login, PIN incorreto, ativação e
desativação da área íntima, mudanças de consentimento e exportações. O registro
é best-effort: uma falha no log nunca interrompe a ação do usuário.

## Limites conhecidos

- Não há rate limiting nas tentativas de PIN além do log. Para uso de duas
  pessoas é aceitável; se isso mudar, o lugar de resolver é uma Edge Function.
- A exportação gera links de mídia com 30 minutos de validade; quem exportar
  precisa baixar os arquivos logo em seguida.
- O `CRON_SECRET` é a única proteção do endpoint de avisos. Ele não devolve
  conteúdo, apenas cria notificações neutras.
