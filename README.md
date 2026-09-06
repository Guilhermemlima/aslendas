# Nosso Universo

Aplicativo web privado para um casal guardar a história do relacionamento:
memórias, linha do tempo, galeria, cartas, cápsulas do tempo, planos, calendário,
mapa, playlist, jogos, retrospectiva anual, área íntima com consentimento e um
painel administrativo completo.

**Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Supabase (Postgres + Auth + Storage)**

---

## 1. Subir o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** e rode os arquivos de `supabase/migrations/` **na ordem**:

   | Arquivo | O que faz |
   | --- | --- |
   | `0001_schema.sql` | tabelas, enums e índices |
   | `0002_functions.sql` | funções, triggers e a view de consentimento |
   | `0003_rls.sql` | Row Level Security de todas as tabelas |
   | `0004_storage.sql` | buckets privados e políticas de storage |
   | `0005_seed_catalog.sql` | catálogo de jogos, conquistas e categorias de consentimento |
   | `0006_seed_questions.sql` | banco global de perguntas |
   | `0007_corrige_convite.sql` | corrige `create_invite()` (só para bancos criados antes desta correção) |
   | `0008_registro_intimo.sql` | calendário de registro dentro da área íntima |

3. Em **Authentication → Providers**, deixe **Email** ligado. Para uso pessoal,
   desligar a confirmação por e-mail acelera o cadastro.
4. Em **Authentication → URL Configuration**, adicione a URL do site em
   *Redirect URLs* (`http://localhost:3000/auth/callback` e a de produção).

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar | Vai para o browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | **não** |
| `CRON_SECRET` | você inventa (string longa e aleatória) | não |
| `NEXT_PUBLIC_SITE_URL` | URL do app | sim |

A `service_role` ignora a RLS. Ela só é usada em `/api/cron/avisos`. Nunca a
prefixe com `NEXT_PUBLIC_`, nunca a cole em chat ou issue.

Para conferir se ficou tudo certo antes de subir o servidor:

```bash
npm run verificar
```

O script valida o formato das chaves, testa a conexão e confere se as
migrations foram aplicadas. Ele nunca imprime o valor de nenhuma chave.

## 3. Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`, crie a conta e monte o casal. No **Nosso perfil**
você gera um código de convite para a outra pessoa entrar no mesmo ambiente.

Outros comandos:

```bash
npm run typecheck
npm run build
npm run lint
```

## 4. Publicar

Vercel + Supabase:

1. Importe o repositório na Vercel.
2. Configure as mesmas variáveis de ambiente (`CRON_SECRET` incluída — a Vercel
   envia esse valor no header `Authorization` das execuções de cron).
3. O `vercel.json` já agenda o cron diário de avisos às 11h UTC.

## 5. Estrutura

```
src/
├── app/                    rotas (App Router)
│   ├── (app)/              área autenticada, com o AppShell
│   ├── actions/            Server Actions por domínio
│   ├── api/                backup e cron
│   ├── entrar|criar-conta|comecar/
│   └── layout.tsx          fontes, paleta e providers
├── components/
│   ├── ui/                 botão, card, campo, modal, toast
│   ├── motion/             reveal, confete, partículas, polaroid, envelope, contadores
│   └── layout/             AppShell, navegação, ícones
├── features/               uma pasta por área do produto
├── services/               leitura de dados (server-only)
├── lib/                    supabase, datas, validação, constantes, utilitários
└── types/                  tipos das tabelas
supabase/migrations/        schema, RLS, storage e seeds
docs/                       arquitetura e notas de segurança
```

Camadas: **página (Server Component) → service (leitura) / action (escrita) →
Supabase**. Componentes de UI não falam com o banco diretamente.

### Animação: duas bibliotecas, papéis separados

| | Usada para | Onde |
| --- | --- | --- |
| **Framer Motion** | entrada/saída de componentes, `layout`, gestos, modais | maior parte do app |
| **GSAP** + ScrollTrigger | coreografia amarrada ao scroll, linha que se desenha, parallax, contadores | linha do tempo, Home, retrospectiva, jogos |

Regra que evita bug silencioso: **nunca aplique as duas no mesmo elemento**. O
Framer Motion reescreve `style.transform` a cada frame e sobrescreve o GSAP.

`movimentoPermitido()` em `src/lib/gsap.ts` é o portão único: respeita a
configuração do casal (`data-animations` no `<html>`), o `prefers-reduced-motion`
do sistema e abas ocultas. Quando ele diz não, o conteúdo aparece pronto — nada
depende de uma animação rodar para ficar visível.

## 6. O que já está pronto

- Autenticação por e-mail, criação de casal e convite por código.
- Home com contador em tempo real, memória aleatória, carta surpresa, próximas
  datas, "Neste dia" e clima especial no aniversário de namoro.
- Linha do tempo filtrável, com mídia, lugar, música e destaques.
- Galeria com álbuns, anos, tags, favoritos, busca, Polaroid, aleatória e "Neste dia".
- Sobre Ela com seções personalizáveis.
- Cartas (comum, programada, "Abra quando...", privada) com envelope animado.
- Cápsulas do tempo com conteúdo escondido pela RLS até a data.
- Planos (lista de sonhos), calendário com contagem regressiva, mapa e playlist.
- 12 jogos abertos + 6 na área íntima, com modo resposta secreta, XP, pontos,
  sequência e conquistas.
- Área íntima isolada, com maioridade, PIN próprio e consentimento dos dois lados.
- Registro de intimidade em calendário, com estatísticas — fora do calendário
  comum, das notificações e da exportação de backup.
- Modo surpresa programado.
- Retrospectiva anual estilo "Wrapped".
- Painel administrativo com drag-and-drop e upload direto para o storage.
- Exportação completa em JSON.

## 7. Próximos passos sugeridos

- Push notifications (hoje os avisos ficam dentro do app).
- Basemap real no mapa (hoje é uma projeção estilizada).
- Realtime do Supabase nos jogos, para o modo secreto revelar sozinho.
