/* =========================================================
   Repositório de NOTIFICAÇÕES
   ---------------------------------------------------------
   Fila única (outbox) usada pelo bot do Telegram e por um
   futuro sino de notificações no painel da equipe. Não tem
   tela própria ainda — por isso é só leitura + marcar como
   enviada, sem formulário de criar/editar na mão.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

function paraApi(row) {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    referenciaTipo: row.referencia_tipo,
    referenciaId: row.referencia_id,
    canal: row.canal,
    enviado: row.enviado,
    enviadoEm: row.enviado_em,
    erro: row.erro,
    criadoEm: row.criado_em
  };
}

async function listarPendentes() {
  const { data, error } = await supabaseService
    .from('notificacoes').select('*').eq('enviado', false).order('criado_em');
  if (error) throw error;
  return data.map(paraApi);
}

async function listarPorUsuario(usuarioId) {
  const { data, error } = await supabaseService
    .from('notificacoes').select('*').eq('usuario_id', usuarioId).order('criado_em', { ascending: false });
  if (error) throw error;
  return data.map(paraApi);
}

async function marcarEnviada(id, erro) {
  const { error } = await supabaseService
    .from('notificacoes')
    .update({ enviado: !erro, enviado_em: erro ? null : new Date().toISOString(), erro: erro || null })
    .eq('id', id);
  if (error) throw error;
}

module.exports = { listarPendentes, listarPorUsuario, marcarEnviada };
