-- =============================================================================
-- Nosso Universo — Banco global de perguntas (couple_id = null)
-- =============================================================================
-- Conteúdo de produto. O casal pode desativar qualquer pergunta e criar as suas
-- próprias pelo painel administrativo (essas ficam com couple_id preenchido).
-- =============================================================================

create unique index if not exists game_questions_global_unique_idx
  on public.game_questions (game_id, content) where couple_id is null;

-- Configuração da roleta do casal (segmentos ficam no próprio jogo).
update public.games set config = jsonb_build_object('segments', jsonb_build_array(
  jsonb_build_object('label','Filme','icon','🎬','detail','Quem girou escolhe o filme da noite.'),
  jsonb_build_object('label','Restaurante','icon','🍝','detail','O outro escolhe onde comer.'),
  jsonb_build_object('label','Atividade','icon','🎨','detail','Uma atividade nova para fazer juntos.'),
  jsonb_build_object('label','Desafio','icon','⚡','detail','Sorteia um desafio da lista.'),
  jsonb_build_object('label','Surpresa','icon','🎁','detail','Prepare uma surpresa pequena até amanhã.'),
  jsonb_build_object('label','Beijo','icon','💋','detail','Do jeito que a pessoa que girou pedir.'),
  jsonb_build_object('label','Pergunta','icon','💬','detail','Sorteia uma pergunta de conexão.'),
  jsonb_build_object('label','Quem escolhe','icon','👑','detail','Quem girou decide o próximo encontro.')
)) where slug = 'roleta-do-casal';

update public.games set config = jsonb_build_object('segments', jsonb_build_array(
  jsonb_build_object('label','Jantar em casa','icon','🕯️','detail','Cozinhar juntos, sem celular na mesa.'),
  jsonb_build_object('label','Cinema na cama','icon','🍿','detail','Filme escolhido por quem girou.'),
  jsonb_build_object('label','Passeio novo','icon','🚗','detail','Um lugar onde vocês nunca foram.'),
  jsonb_build_object('label','Noite de massagem','icon','💆','detail','Trinta minutos para cada um.'),
  jsonb_build_object('label','Encontro sem plano','icon','🎲','detail','Sair sem destino e decidir na hora.'),
  jsonb_build_object('label','Café da manhã na cama','icon','☕','detail','Quem perdeu a última partida prepara.'),
  jsonb_build_object('label','Playlist a dois','icon','🎧','detail','Cada um escolhe cinco músicas.'),
  jsonb_build_object('label','Carta relâmpago','icon','💌','detail','Dez minutos para escrever um bilhete.')
)) where slug = 'roleta-de-encontros';

-- ------------------------------------------------------------ Quiz do Casal --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, v.category, 'leve'::intensity_level
from public.games g, (values
  ('Qual foi o primeiro filme que assistimos juntos?','historia'),
  ('Onde foi o nosso primeiro encontro?','historia'),
  ('Qual música tocava quando nos beijamos pela primeira vez?','historia'),
  ('Quem mandou a primeira mensagem?','historia'),
  ('Qual foi a primeira comida que dividimos?','historia'),
  ('Que roupa eu estava usando no nosso primeiro encontro?','detalhe'),
  ('Qual apelido eu usei primeiro para te chamar?','detalhe'),
  ('Qual foi a nossa primeira briga boba?','historia'),
  ('Qual foi o primeiro presente que trocamos?','historia'),
  ('Em que dia da semana começamos a namorar?','detalhe'),
  ('Qual foi a primeira viagem que planejamos juntos?','historia'),
  ('Qual série nós dois maratonamos primeiro?','historia'),
  ('Qual foi a primeira foto que tiramos juntos?','detalhe'),
  ('Quem falou "eu te amo" primeiro?','historia'),
  ('Qual lugar virou o nosso lugar?','detalhe'),
  ('Qual foi o primeiro plano que fizemos para o futuro?','futuro'),
  ('Qual data nós dois nunca esquecemos?','detalhe'),
  ('Qual foi a maior surpresa que já preparamos um para o outro?','historia')
) as v(content, category)
where g.slug = 'quiz-do-casal'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------------ Quem Conhece Melhor --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, v.category, 'leve'::intensity_level
from public.games g, (values
  ('Qual é a minha comida favorita?','gostos'),
  ('Qual é o meu maior medo?','profundo'),
  ('Qual é a minha memória favorita da infância?','profundo'),
  ('Qual é a música que eu escuto quando estou triste?','gostos'),
  ('Como eu prefiro passar um domingo?','rotina'),
  ('Qual é o presente que eu queria ganhar e nunca falei?','desejos'),
  ('Qual mania minha te irrita um pouquinho?','rotina'),
  ('Qual é o meu maior sonho para os próximos cinco anos?','futuro'),
  ('O que me acalma quando eu estou nervoso ou nervosa?','profundo'),
  ('Qual é a minha bebida favorita?','gostos'),
  ('Que lugar do mundo eu mais quero conhecer?','desejos'),
  ('Qual elogio me deixa mais feliz?','profundo'),
  ('Qual é o meu jeito favorito de receber carinho?','conexao'),
  ('Qual é a coisa que eu mais odeio fazer em casa?','rotina'),
  ('Se eu pudesse mudar de profissão hoje, qual eu escolheria?','futuro'),
  ('Qual foi o dia mais difícil que eu já te contei?','profundo'),
  ('Qual é o meu filme para assistir mil vezes?','gostos'),
  ('O que me faz rir sem controle?','gostos'),
  ('Qual é a minha ordem no café da manhã perfeito?','rotina'),
  ('Como eu gosto de ser acordado ou acordada?','rotina')
) as v(content, category)
where g.slug = 'quem-conhece-melhor'
on conflict (game_id, content) where couple_id is null do nothing;

-- ----------------------------------------------------- Quem é Mais Provável --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, 'geral', 'leve'::intensity_level
from public.games g, (values
  ('Quem é mais provável de dormir no meio do filme?'),
  ('Quem é mais provável de esquecer onde deixou o celular?'),
  ('Quem é mais provável de chorar num comercial?'),
  ('Quem é mais provável de comer a última fatia sem perguntar?'),
  ('Quem é mais provável de se atrasar para um compromisso?'),
  ('Quem é mais provável de começar uma discussão sobre besteira?'),
  ('Quem é mais provável de pedir desculpa primeiro?'),
  ('Quem é mais provável de planejar uma viagem inteira em uma noite?'),
  ('Quem é mais provável de cantar alto no chuveiro?'),
  ('Quem é mais provável de gastar demais numa loja?'),
  ('Quem é mais provável de fazer amizade com um cachorro na rua?'),
  ('Quem é mais provável de esquecer um aniversário?'),
  ('Quem é mais provável de tirar 200 fotos do mesmo pôr do sol?'),
  ('Quem é mais provável de topar uma loucura de última hora?'),
  ('Quem é mais provável de ficar bravo com fome?'),
  ('Quem é mais provável de assumir o controle remoto?'),
  ('Quem é mais provável de mandar mensagem de madrugada?'),
  ('Quem é mais provável de ficar horas escolhendo o que assistir?')
) as v(content)
where g.slug = 'quem-e-mais-provavel'
on conflict (game_id, content) where couple_id is null do nothing;

-- -------------------------------------------------------------- Você Prefere --
insert into public.game_questions (game_id, content, options, category, intensity)
select g.id, v.content, v.options::jsonb, 'geral', 'leve'::intensity_level
from public.games g, (values
  ('Você prefere...','["Viajar para a praia","Viajar para a montanha"]'),
  ('Você prefere...','["Jantar fora","Cozinhar em casa"]'),
  ('Você prefere...','["Maratonar série","Assistir um filme longo"]'),
  ('Você prefere...','["Acordar cedo juntos","Dormir até tarde abraçados"]'),
  ('Você prefere...','["Um presente caro","Uma carta escrita à mão"]'),
  ('Você prefere...','["Festa com todo mundo","Noite só nós dois"]'),
  ('Você prefere...','["Morar perto do mar","Morar no meio do verde"]'),
  ('Você prefere...','["Viajar de carro","Viajar de avião"]'),
  ('Você prefere...','["Café da manhã na cama","Jantar à luz de velas"]'),
  ('Você prefere...','["Fotos impressas","Vídeos guardados"]'),
  ('Você prefere...','["Planejar tudo","Decidir na hora"]'),
  ('Você prefere...','["Ganhar flores toda semana","Ganhar uma viagem por ano"]'),
  ('Você prefere...','["Assistir ao pôr do sol","Ficar acordado até o nascer do sol"]'),
  ('Você prefere...','["Dançar na sala","Cantar no carro"]'),
  ('Você prefere...','["Uma casa cheia de bichos","Uma casa cheia de plantas"]'),
  ('Você prefere...','["Passar o Natal viajando","Passar o Natal em casa"]'),
  ('Você prefere...','["Ser surpreendido","Escolher a própria surpresa"]'),
  ('Você prefere...','["Sofá e cobertor","Bar com amigos"]')
) as v(content, options)
where g.slug = 'voce-prefere'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------------------------ Eu Nunca --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, 'geral', 'leve'::intensity_level
from public.games g, (values
  ('Eu nunca fingi gostar de um presente.'),
  ('Eu nunca stalkeei o perfil do outro antes de a gente se falar.'),
  ('Eu nunca inventei desculpa para sair mais cedo de um compromisso.'),
  ('Eu nunca chorei escondido depois de uma discussão nossa.'),
  ('Eu nunca comi algo que era do outro e menti sobre isso.'),
  ('Eu nunca dormi bravo sem falar o motivo.'),
  ('Eu nunca ensaiei uma conversa importante no espelho.'),
  ('Eu nunca guardei um print da nossa conversa.'),
  ('Eu nunca fiquei acordado só olhando o outro dormir.'),
  ('Eu nunca fiz uma playlist pensando em alguém.'),
  ('Eu nunca menti sobre estar chegando.'),
  ('Eu nunca escondi uma compra do outro.'),
  ('Eu nunca reli mensagens antigas nossas por saudade.'),
  ('Eu nunca fingi estar dormindo para não conversar.'),
  ('Eu nunca imaginei nosso futuro em detalhes antes de contar.'),
  ('Eu nunca falei do outro para todo mundo do trabalho.'),
  ('Eu nunca chorei de felicidade por causa da gente.'),
  ('Eu nunca escondi que estava com ciúme.')
) as v(content)
where g.slug = 'eu-nunca'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------------- Verdade ou Desafio --
insert into public.game_questions (game_id, content, category, tags, intensity)
select g.id, v.content, v.category, v.tags::text[], 'leve'::intensity_level
from public.games g, (values
  ('Qual foi a primeira coisa que você reparou em mim?','verdade','{fofo}'),
  ('Qual foi o momento em que você percebeu que estava apaixonado?','verdade','{romantico}'),
  ('Qual foi a mentira mais boba que você já me contou?','verdade','{engracado}'),
  ('O que você faria se eu sumisse por um dia inteiro?','verdade','{engracado}'),
  ('Qual foi a coisa mais fofa que eu já fiz por você?','verdade','{fofo}'),
  ('Se você pudesse reviver um dia nosso, qual seria?','verdade','{romantico}'),
  ('Qual hábito meu você secretamente adora?','verdade','{fofo}'),
  ('Qual foi a maior vergonha que você já passou perto de mim?','verdade','{engracado}'),
  ('O que você mais tem medo de perder na nossa relação?','verdade','{romantico}'),
  ('Mande uma mensagem de voz cantando a nossa música.','desafio','{engracado}'),
  ('Faça uma imitação minha por trinta segundos.','desafio','{engracado}'),
  ('Escreva um bilhete de amor em um minuto e leia em voz alta.','desafio','{romantico}'),
  ('Me dê um abraço de trinta segundos sem falar nada.','desafio','{fofo}'),
  ('Poste uma foto nossa antiga nos stories agora.','desafio','{engracado}'),
  ('Descreva o nosso primeiro encontro sem usar as mãos.','desafio','{engracado}'),
  ('Faça uma massagem de dois minutos nos ombros.','desafio','{romantico}'),
  ('Diga três coisas que você ama em mim olhando nos meus olhos.','desafio','{romantico}'),
  ('Dance comigo uma música lenta agora.','desafio','{romantico}')
) as v(content, category, tags)
where g.slug = 'verdade-ou-desafio'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------------ Complete a História --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, 'historia', 'leve'::intensity_level
from public.games g, (values
  ('Naquele dia a gente combinou de ir para ___ e acabou ___.'),
  ('A primeira vez que eu segurei sua mão foi em ___.'),
  ('Você chorou de rir quando eu ___.'),
  ('Nossa viagem mais engraçada foi para ___ porque ___.'),
  ('Eu soube que era sério quando você ___.'),
  ('A comida que a gente sempre repete é ___ do lugar ___.'),
  ('Se alguém perguntar como a gente se conheceu, a versão curta é ___.'),
  ('O apelido ___ nasceu porque ___.'),
  ('Na nossa primeira foto juntos a gente estava ___.'),
  ('O dia mais difícil que a gente atravessou junto foi ___.'),
  ('Nossa tradição favorita é ___ e começou em ___.'),
  ('O plano que ainda não realizamos é ___.')
) as v(content)
where g.slug = 'complete-nossa-historia'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------------ Batalha de Perguntas --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, 'batalha', 'leve'::intensity_level
from public.games g, (values
  ('Qual foi a última coisa que me deixou orgulhoso de você?'),
  ('Que promessa nossa você mais quer cumprir este ano?'),
  ('O que você mudaria na nossa rotina se pudesse?'),
  ('Qual foi a melhor decisão que tomamos juntos?'),
  ('O que eu faço que te acalma na hora?'),
  ('Qual conversa nossa você nunca esqueceu?'),
  ('O que você quer que eu peça mais vezes?'),
  ('Qual detalhe nosso ninguém mais entenderia?'),
  ('Qual foi a vez que você quis desistir e não desistiu?'),
  ('O que você espera que continue igual daqui a dez anos?')
) as v(content)
where g.slug = 'batalha-de-perguntas'
on conflict (game_id, content) where couple_id is null do nothing;

-- ----------------------------------------------------------- Desafio Semanal --
insert into public.game_questions (game_id, content, category, intensity)
select g.id, v.content, 'semanal', 'leve'::intensity_level
from public.games g, (values
  ('Esta semana: um encontro sem celular, do começo ao fim.'),
  ('Esta semana: cada um escreve um bilhete e esconde para o outro achar.'),
  ('Esta semana: cozinhar juntos uma receita que nenhum dos dois sabe fazer.'),
  ('Esta semana: revisitar o lugar do primeiro encontro.'),
  ('Esta semana: montar uma playlist com cinco músicas para o outro.'),
  ('Esta semana: elogiar algo diferente todo dia, sem repetir.'),
  ('Esta semana: assistir ao filme favorito da infância um do outro.'),
  ('Esta semana: um dia inteiro em que quem decide tudo é a outra pessoa.'),
  ('Esta semana: escrever juntos três planos para o próximo ano.'),
  ('Esta semana: imprimir uma foto e colocar em algum lugar da casa.')
) as v(content)
where g.slug = 'desafio-semanal'
on conflict (game_id, content) where couple_id is null do nothing;

-- =============================================================================
-- Área íntima — só fica acessível com maioridade confirmada, PIN e
-- consentimento ativo das DUAS pessoas na categoria correspondente.
-- Conteúdo mantido sugestivo, sem descrições gráficas.
-- =============================================================================

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'intima', v.intensity::intensity_level, true, v.consent
from public.games g, (values
  ('Qual carinho meu você mais sente falta quando estamos longe?','leve','perguntas_intimas'),
  ('O que te faz sentir mais desejado por mim?','leve','perguntas_intimas'),
  ('Qual foi o momento mais marcante que tivemos a dois?','intermediario','perguntas_intimas'),
  ('Existe algo que você gostaria de me pedir e ainda não pediu?','intermediario','perguntas_intimas'),
  ('O que faz você se sentir completamente à vontade comigo?','leve','perguntas_intimas'),
  ('Que tipo de clima te deixa mais conectado a mim?','leve','perguntas_intimas'),
  ('Tem algo que eu faço e você quer que eu faça mais vezes?','intermediario','perguntas_intimas'),
  ('Qual lembrança nossa você guarda só para você?','intermediario','perguntas_intimas'),
  ('O que você prefere: ser surpreendido ou combinar tudo antes?','leve','preferencias'),
  ('Qual limite seu você quer que eu sempre respeite?','leve','preferencias'),
  ('Como você prefere que eu perceba que você não está a fim?','leve','preferencias'),
  ('Qual palavra ou gesto funciona como "vamos parar" para você?','leve','preferencias')
) as v(content, intensity, consent)
where g.slug = 'perguntas-intimas'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'intima', v.intensity::intensity_level, true, 'eu_nunca_adulto'
from public.games g, (values
  ('Eu nunca pensei em você em um momento em que não devia.','intermediario'),
  ('Eu nunca guardei uma foto nossa só para mim.','intermediario'),
  ('Eu nunca inventei um motivo para a gente ficar em casa.','leve'),
  ('Eu nunca fiquei nervoso antes de um encontro nosso.','leve'),
  ('Eu nunca imaginei uma noite específica com você.','ousado'),
  ('Eu nunca deixei de contar um desejo por vergonha.','ousado'),
  ('Eu nunca me arrumei especialmente pensando na sua reação.','leve'),
  ('Eu nunca mandei uma mensagem e me arrependi de mandar.','intermediario')
) as v(content, intensity)
where g.slug = 'eu-nunca-adulto'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, v.category, v.intensity::intensity_level, true, 'verdade_desafio_adulto'
from public.games g, (values
  ('O que te atrai em mim que não tem nada a ver com aparência?','verdade','leve'),
  ('Qual foi a vez que você mais me quis por perto?','verdade','intermediario'),
  ('Tem alguma fantasia sua que é só sobre carinho?','verdade','intermediario'),
  ('O que você gostaria de tentar comigo um dia?','verdade','ousado'),
  ('Qual detalhe meu você repara e nunca comentou?','verdade','leve'),
  ('Me diga no ouvido três coisas que você adora em mim.','desafio','leve'),
  ('Escolha a próxima música e dance comigo do jeito que quiser.','desafio','intermediario'),
  ('Faça uma massagem de cinco minutos sem pressa.','desafio','intermediario'),
  ('Planeje a nossa próxima noite e não me conte nada até a hora.','desafio','ousado'),
  ('Escreva um bilhete com um pedido e me entregue dobrado.','desafio','ousado')
) as v(content, category, intensity)
where g.slug = 'verdade-ou-desafio-adulto'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'desejo', v.intensity::intensity_level, true, 'desejos'
from public.games g, (values
  ('Uma noite inteira só nossa, sem interrupção.','leve'),
  ('Um jantar em casa com clima preparado.','leve'),
  ('Um fim de semana fora, só nós dois.','leve'),
  ('Trocar massagens sem pressa nenhuma.','intermediario'),
  ('Um banho demorado juntos.','intermediario'),
  ('Dançar juntos sem ninguém olhando.','leve'),
  ('Passar um dia inteiro na cama.','intermediario'),
  ('Escrever um para o outro o que mais gostamos.','leve'),
  ('Combinar uma noite em que cada um comanda metade do tempo.','ousado'),
  ('Recriar o nosso primeiro encontro, do jeito de hoje.','leve')
) as v(content, intensity)
where g.slug = 'cartas-de-desejos'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'conexao', 'leve'::intensity_level, true, 'conexao'
from public.games g, (values
  ('O que faz você se sentir seguro comigo?'),
  ('Qual foi a última vez que você se sentiu realmente visto por mim?'),
  ('O que eu poderia fazer para te deixar mais confortável?'),
  ('Qual toque simples te acalma na hora?'),
  ('O que você quer que eu saiba e nunca perguntei?'),
  ('Como você percebe quando eu estou distante?'),
  ('Qual parte da nossa intimidade você mais valoriza?'),
  ('O que você gostaria de conversar mais abertamente?')
) as v(content)
where g.slug = 'conexao-intima'
on conflict (game_id, content) where couple_id is null do nothing;
