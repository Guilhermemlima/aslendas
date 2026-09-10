-- =============================================================================
-- Área íntima: jogos sexuais de verdade, não só temas adultos
-- =============================================================================
-- Continua valendo tudo o que já protege esta área: maioridade confirmada, PIN
-- próprio, nível de intensidade por pessoa e consentimento das DUAS pessoas por
-- categoria. Nada aqui aparece sem esses portões.
--
-- Seguro rodar mais de uma vez.
-- =============================================================================

-- ------------------------------------------------------ novos jogos ---------
insert into public.games (slug, name, tagline, description, icon, category, modes, is_intimate, sort_order, config) values
  ('sim-nao-talvez','Sim, Não ou Talvez','A lista que abre conversa',
   'Cada um responde sozinho o que topa, o que não topa e o que talvez. Só o que os dois marcaram aparece — o resto ninguém vê.',
   'link','intimo','{secreto}',true,26,'{"consent_category":"desejos","revela_coincidencias":true}'::jsonb),
  ('mapa-do-corpo','Mapa do Corpo','Onde e como',
   'Percorre o corpo por partes e cada um diz o quanto gosta. No fim vocês veem onde as respostas se encontram.',
   'heart','intimo','{secreto,juntos}',true,27,'{"consent_category":"preferencias","revela_coincidencias":true}'::jsonb),
  ('termometro','Termômetro da Noite','Um degrau por vez',
   'Uma escala do mais leve ao mais intenso. Vocês sobem junto e param onde quiserem — a régua é de vocês.',
   'flame','intimo','{juntos}',true,28,'{"consent_category":"verdade_desafio_adulto"}'::jsonb)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  icon = excluded.icon, category = excluded.category, modes = excluded.modes,
  is_intimate = excluded.is_intimate, sort_order = excluded.sort_order, config = excluded.config;

-- ----------------------------------------- Sim, Não ou Talvez ---------------
-- Lista de práticas nomeadas com clareza. A intensidade controla o que aparece
-- para quem escolheu um nível mais baixo.
insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'lista', v.intensity::intensity_level, true, 'desejos'
from public.games g, (values
  ('Preliminares longas, sem pressa nenhuma','leve'),
  ('Massagem com óleo antes de qualquer outra coisa','leve'),
  ('Banho junto','leve'),
  ('Sexo oral (dar)','intermediario'),
  ('Sexo oral (receber)','intermediario'),
  ('Sexo oral ao mesmo tempo','intermediario'),
  ('Masturbação um na frente do outro','intermediario'),
  ('Masturbação mútua','intermediario'),
  ('Trocar mensagens quentes durante o dia','leve'),
  ('Mandar foto sensual (só entre nós)','intermediario'),
  ('Falar sacanagem durante o sexo','intermediario'),
  ('Dizer em voz alta o que quer no momento','leve'),
  ('Sexo com a luz acesa','leve'),
  ('Sexo em frente ao espelho','intermediario'),
  ('Vendar os olhos','intermediario'),
  ('Amarrar as mãos (algo macio, fácil de soltar)','ousado'),
  ('Um comanda e o outro obedece por um tempo combinado','ousado'),
  ('Tapas leves','ousado'),
  ('Puxar o cabelo','intermediario'),
  ('Usar vibrador junto','intermediario'),
  ('Usar plug ou outro brinquedo','ousado'),
  ('Lingerie ou roupa escolhida pelo outro','leve'),
  ('Encenar um personagem ou situação','ousado'),
  ('Sexo no chuveiro','intermediario'),
  ('Sexo em outro cômodo que não o quarto','intermediario'),
  ('Sexo em local com risco de ouvirem','ousado'),
  ('Passar a noite inteira, com intervalos','intermediario'),
  ('Sexo pela manhã, antes de tudo','leve'),
  ('Um assiste enquanto o outro se toca','ousado'),
  ('Gravar só para nós dois (e apagar depois)','ousado'),
  ('Provocar durante horas antes','intermediario'),
  ('Sexo mais bruto','ousado'),
  ('Sexo bem devagar, olhando nos olhos','leve'),
  ('Sexo anal','ousado'),
  ('Brincar com gelo ou algo gelado','intermediario'),
  ('Brincar com cera morna','ousado'),
  ('Escolher uma posição nova a cada vez','intermediario'),
  ('Combinar uma noite em que um decide tudo','ousado')
) as v(content, intensity)
where g.slug = 'sim-nao-talvez'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------------------------------- Mapa do Corpo ------------
insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'corpo', v.intensity::intensity_level, true, 'preferencias'
from public.games g, (values
  ('Beijo na boca, demorado','leve'),
  ('Pescoço','leve'),
  ('Orelha e atrás da orelha','leve'),
  ('Nuca','leve'),
  ('Ombros e costas','leve'),
  ('Seios e mamilos','intermediario'),
  ('Barriga e cintura','leve'),
  ('Parte interna das coxas','intermediario'),
  ('Bumbum','intermediario'),
  ('Pés e tornozelos','leve'),
  ('Mãos e dedos','leve'),
  ('Virilha','intermediario'),
  ('Genitais, com a mão','intermediario'),
  ('Genitais, com a boca','ousado'),
  ('Arranhar de leve','intermediario'),
  ('Morder de leve','intermediario'),
  ('Soprar','leve'),
  ('Toque bem leve, quase sem encostar','leve'),
  ('Pressão firme','intermediario')
) as v(content, intensity)
where g.slug = 'mapa-do-corpo'
on conflict (game_id, content) where couple_id is null do nothing;

-- -------------------------------------------- Termômetro da Noite -----------
-- Ordem importa: a escala sobe. O sort vem do próprio texto numerado.
insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'escala', v.intensity::intensity_level, true, 'verdade_desafio_adulto'
from public.games g, (values
  ('1. Um beijo de trinta segundos, sem usar as mãos','leve'),
  ('2. Digam um para o outro o que mais querem hoje','leve'),
  ('3. Massagem nas costas por cinco minutos','leve'),
  ('4. Tirem uma peça de roupa um do outro','leve'),
  ('5. Beijos em três lugares do corpo que não a boca','intermediario'),
  ('6. Um venda os olhos do outro e conduz por dois minutos','intermediario'),
  ('7. Quem estiver vendado precisa adivinhar onde vai ser tocado','intermediario'),
  ('8. Cinco minutos só de preliminares, sem passar disso','intermediario'),
  ('9. Um se toca enquanto o outro assiste','ousado'),
  ('10. O outro assume e continua','ousado'),
  ('11. Escolham juntos a posição da vez','ousado'),
  ('12. Um comanda o ritmo do começo ao fim','ousado')
) as v(content, intensity)
where g.slug = 'termometro'
on conflict (game_id, content) where couple_id is null do nothing;

-- ------------------------- Ampliação dos jogos íntimos já existentes --------
insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, v.category, v.intensity::intensity_level, true, 'verdade_desafio_adulto'
from public.games g, (values
  ('O que você quer que eu faça mais devagar?','verdade','intermediario'),
  ('Qual parte do meu corpo você olha primeiro?','verdade','leve'),
  ('Prefere comandar ou ser comandado?','verdade','ousado'),
  ('Tem alguma fantasia que você nunca contou para ninguém?','verdade','ousado'),
  ('O que te excita antes mesmo de qualquer toque?','verdade','intermediario'),
  ('Qual foi a vez que você mais gostou, e por quê?','verdade','ousado'),
  ('Tem algo que você fingiu gostar e não gosta?','verdade','ousado'),
  ('O que você quer ouvir na hora?','verdade','intermediario'),
  ('Tire uma peça de roupa da escolha do outro','desafio','intermediario'),
  ('Beije o outro sem usar as mãos por um minuto','desafio','leve'),
  ('Descreva em voz alta o que quer fazer agora','desafio','ousado'),
  ('Guie a mão do outro para onde você quer','desafio','ousado'),
  ('Fique dois minutos só provocando, sem avançar','desafio','ousado'),
  ('Sussurre no ouvido a sua fantasia mais recente','desafio','ousado')
) as v(content, category, intensity)
where g.slug = 'verdade-ou-desafio-adulto'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'intima', v.intensity::intensity_level, true, 'perguntas_intimas'
from public.games g, (values
  ('Qual ritmo funciona melhor para você: começar devagar ou já intenso?','intermediario'),
  ('Você prefere ser provocado por muito tempo ou ir direto?','intermediario'),
  ('Tem alguma palavra ou frase que te desliga na hora?','leve'),
  ('O que faz você relaxar o suficiente para se soltar?','leve'),
  ('Prefere sexo planejado ou de repente?','leve'),
  ('Tem algo que você gostaria de tentar mas tem vergonha de pedir?','ousado'),
  ('Como você prefere terminar: junto ou um de cada vez?','ousado'),
  ('Depois, você prefere conversar, dormir ou tomar banho?','leve'),
  ('Qual foi a coisa mais gostosa que eu já fiz sem perceber?','intermediario'),
  ('Tem alguma parte do seu corpo que você queria que eu desse mais atenção?','intermediario')
) as v(content, intensity)
where g.slug = 'perguntas-intimas'
on conflict (game_id, content) where couple_id is null do nothing;

insert into public.game_questions (game_id, content, category, intensity, is_intimate, consent_category)
select g.id, v.content, 'desejo', v.intensity::intensity_level, true, 'desejos'
from public.games g, (values
  ('Uma noite em que eu faço tudo o que você pedir','ousado'),
  ('Uma noite em que você faz tudo o que eu pedir','ousado'),
  ('Sexo em um hotel, só por sair de casa','intermediario'),
  ('Comprar um brinquedo juntos','ousado'),
  ('Escolher a lingerie um do outro','leve'),
  ('Uma tarde inteira na cama, sem hora para acabar','intermediario'),
  ('Você me provocando o dia todo por mensagem','intermediario'),
  ('Uma vez só com preliminares, sem chegar ao fim','ousado'),
  ('Tentar uma posição que a gente nunca fez','intermediario'),
  ('Contar um para o outro uma fantasia inteira, em detalhe','ousado')
) as v(content, intensity)
where g.slug = 'cartas-de-desejos'
on conflict (game_id, content) where couple_id is null do nothing;
