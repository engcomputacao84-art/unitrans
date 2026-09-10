/* =========================================================
   pendente.js — rastreia a operação assíncrona disparada por
   um handler do bot (onText / callback_query), pra dar pra
   "esperar" ela terminar antes de responder o webhook.
   ---------------------------------------------------------
   Por quê isso existe: bot.processUpdate() do node-telegram-
   bot-api é "fire and forget" — ele dispara o evento e volta
   na hora, sem esperar nosso handler (que é async e faz
   consulta no Supabase) terminar. Em ambiente serverless
   (Vercel), se a gente responder 200 pro webhook antes disso
   terminar, o processo pode ser encerrado no meio do caminho
   e a mensagem nunca chega a ser enviada pro usuário.

   Uso: cada handler chama marcar(promessaDoTrabalho) logo ao
   iniciar; a rota do webhook chama aguardar() depois de
   bot.processUpdate(), antes de responder 200.
   ========================================================= */
let pendente = null;

function marcar(promise) {
  pendente = promise.catch((err) => {
    console.error('Erro numa operação pendente do bot:', err.message);
  });
}

async function aguardar() {
  const p = pendente;
  pendente = null;
  if (p) await p;
}

module.exports = { marcar, aguardar };
