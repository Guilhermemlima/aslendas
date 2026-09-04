-- =============================================================================
-- Nosso Universo — Catálogo base (conteúdo de produto, não é dado fictício)
-- =============================================================================
-- Este arquivo popula:
--   * o catálogo de jogos;
--   * as conquistas;
--   * as categorias de consentimento da área íntima;
--   * o banco global de perguntas (couple_id = null).
-- Nenhuma linha aqui pertence a um casal específico.
-- =============================================================================

-- ------------------------------------------------------------------ jogos ---
insert into public.games (slug, name, tagline, description, icon, category, modes, is_intimate, sort_order) values
  ('quiz-do-casal','Quiz do Casal','O quanto vocês lembram?','Perguntas sobre a história de vocês dois, com pontuação por acerto.','sparkles','classico','{juntos,individual}',false,1),
  ('quem-conhece-melhor','Quem Conhece Melhor','Um responde pelo outro','Uma pessoa responde como acha que a outra responderia. Depois compara.','users','conexao','{secreto,juntos}',false,2),
  ('quem-e-mais-provavel','Quem é Mais Provável','Aponte para o culpado','Cada pessoa escolhe quem representa melhor a situação. Empate é diversão.','hand','classico','{juntos,secreto}',false,3),
  ('voce-prefere','Você Prefere','Duas opções impossíveis','Escolham entre duas alternativas e vejam o quanto combinam.','split','classico','{juntos,secreto}',false,4),
  ('eu-nunca','Eu Nunca','Confessa aí','Cartas de confissão leves e engraçadas.','flame','classico','{juntos}',false,5),
  ('verdade-ou-desafio','Verdade ou Desafio','Fofo, engraçado ou romântico','Categorias configuráveis de verdades e desafios para o casal.','dice','classico','{juntos}',false,6),
  ('roleta-do-casal','Roleta do Casal','Deixa a sorte decidir','Gira e descobre o que fazer agora: filme, beijo, desafio, surpresa.','disc','sorte','{juntos}',false,7),
  ('adivinhe-a-memoria','Adivinhe a Memória','Que dia foi esse?','Uma memória aparece com pistas e vocês tentam lembrar qual é.','brain','memoria','{juntos,secreto}',false,8),
  ('adivinhe-a-foto','Adivinhe a Foto','Revelação progressiva','A foto começa borrada e vai ficando nítida. Quem acerta primeiro?','image','memoria','{juntos}',false,9),
  ('complete-nossa-historia','Complete Nossa História','Preencha as lacunas','Um acontecimento aparece incompleto e você completa os detalhes.','pen','memoria','{juntos,secreto}',false,10),
  ('batalha-de-perguntas','Batalha de Perguntas','Rodada contra rodada','Vocês se enfrentam respondendo perguntas um sobre o outro.','swords','conexao','{secreto}',false,11),
  ('desafio-semanal','Desafio Semanal','Um por semana','Um desafio de casal por semana para manter a chama e a rotina leve.','calendar','conexao','{juntos}',false,12),
  ('perguntas-intimas','Perguntas Íntimas','Conversa de dois','Perguntas para aproximar, com níveis de intensidade configuráveis.','heart','intimo','{juntos,secreto}',true,20),
  ('eu-nunca-adulto','Eu Nunca (adulto)','Versão sem plateia','Confissões adultas com controle de intensidade.','flame','intimo','{juntos}',true,21),
  ('verdade-ou-desafio-adulto','Verdade ou Desafio (adulto)','Só entre vocês','Verdades e desafios adultos liberados por consentimento mútuo.','dice','intimo','{juntos}',true,22),
  ('roleta-de-encontros','Roleta de Encontros','Sorteia a noite','Sorteia clima, lugar e proposta para um encontro a dois.','disc','intimo','{juntos}',true,23),
  ('cartas-de-desejos','Cartas de Desejos','O que a gente quer','Cada pessoa marca desejos em segredo; só o que coincide aparece.','mail','intimo','{secreto}',true,24),
  ('conexao-intima','Conexão','Perguntas de intimidade','Perguntas sobre carinho, presença e conexão — não sobre desempenho.','link','intimo','{juntos,secreto}',true,25)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  icon = excluded.icon, category = excluded.category, modes = excluded.modes,
  is_intimate = excluded.is_intimate, sort_order = excluded.sort_order;

-- ------------------------------------------------------------- conquistas ---
insert into public.achievements (code, name, description, icon, xp, criteria, sort_order) values
  ('primeira_memoria','Primeiro registro','Vocês guardaram a primeira memória.','🌱',30,'{"metric":"memories","target":1}',1),
  ('memorias_50','Arquivo do amor','50 memórias guardadas.','📚',200,'{"metric":"memories","target":50}',2),
  ('primeira_carta','Correspondência','A primeira carta foi escrita.','💌',40,'{"metric":"letters","target":1}',3),
  ('carta_aberta','Envelope aberto','Uma carta programada foi aberta na data certa.','✉️',60,'{"metric":"letters_opened","target":1}',4),
  ('primeira_capsula','Mensagem ao futuro','A primeira cápsula do tempo foi selada.','⏳',50,'{"metric":"capsules","target":1}',5),
  ('capsula_aberta','Encontro com o passado','Uma cápsula foi aberta.','🔓',120,'{"metric":"capsules_opened","target":1}',6),
  ('jogos_10','Dupla competitiva','10 jogos completos.','🎲',150,'{"metric":"games_played","target":10}',7),
  ('perguntas_100','Cem perguntas','100 perguntas respondidas.','💬',180,'{"metric":"questions_answered","target":100}',8),
  ('sequencia_7','Uma semana seguida','7 dias jogando sem falhar.','🔥',150,'{"metric":"streak_days","target":7}',9),
  ('primeiro_sonho','Sonho realizado','Um item da lista de sonhos foi concluído.','⭐',80,'{"metric":"dreams_done","target":1}',10),
  ('mapa_5','Viajantes','5 lugares no mapa do casal.','🗺️',120,'{"metric":"places","target":5}',11),
  ('um_ano','Um ano de universo','1 ano usando o Nosso Universo.','🎂',300,'{"metric":"days_using","target":365}',12)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, icon = excluded.icon,
  xp = excluded.xp, criteria = excluded.criteria, sort_order = excluded.sort_order;

-- ---------------------------------------- categorias de consentimento (18+) --
insert into public.consent_categories (code, name, description, intensity, sort_order) values
  ('conexao','Conexão e carinho','Perguntas sobre afeto, presença e intimidade emocional.','leve',1),
  ('preferencias','Preferências','Gostos, limites e o que faz bem para cada um.','leve',2),
  ('perguntas_intimas','Perguntas íntimas','Conversas mais pessoais sobre intimidade.','intermediario',3),
  ('eu_nunca_adulto','Eu Nunca adulto','Confissões adultas em tom leve.','intermediario',4),
  ('verdade_desafio_adulto','Verdade ou Desafio adulto','Verdades e desafios com clima adulto.','ousado',5),
  ('desejos','Cartas de desejos','Lista de desejos revelada só quando os dois marcam o mesmo.','ousado',6),
  ('encontros','Roleta de encontros','Propostas de encontro a dois.','intermediario',7)
on conflict (code) do update set
  name = excluded.name, description = excluded.description,
  intensity = excluded.intensity, sort_order = excluded.sort_order;
