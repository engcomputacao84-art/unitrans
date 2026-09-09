/* =========================================================
   Repositório de TELEGRAM (vínculo de conta)
   ---------------------------------------------------------
   Cada usuário (cliente ou motorista) gera, na própria conta,
   um código temporário (usuarios.telegram_link_token) e manda
   `/vincular <código>` para o bot. O bot confirma o código e
   grava o chat_id real em usuarios.telegram_chat_id — ver
   Bot/Comandos.js.
   ========================================================= */

const { supabaseService } = require('../Banco/js/supabaseClient');

const VALIDADE_MINUTOS = 15;
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I, pra não confundir

function gerarToken(tamanho) {
  let token = '';
  for (let i = 0; i < tamanho; i++) {
    token += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return token;
}

// POST /api/telegram/codigo — gera (ou substitui) o código de vinculação
async function gerarCodigo(usuarioId) {
  const token = gerarToken(6);
  const expira = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000).toISOString();

  const { data, error } = await supabaseService
    .from('usuarios')
    .update({ telegram_link_token: token, telegram_link_expira: expira })
    .eq('id', usuarioId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null; // usuário não existe

  return { codigo: token, expiraEm: expira, validadeMinutos: VALIDADE_MINUTOS };
}

// GET /api/telegram/status/:usuarioId — estado atual do vínculo
async function status(usuarioId) {
  const { data, error } = await supabaseService
    .from('usuarios')
    .select('telegram_chat_id, telegram_vinculado_em')
    .eq('id', usuarioId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    vinculado: !!data.telegram_chat_id,
    vinculadoEm: data.telegram_vinculado_em
  };
}

// POST /api/telegram/desvincular — remove o vínculo (e qualquer código pendente)
async function desvincular(usuarioId) {
  const { data, error } = await supabaseService
    .from('usuarios')
    .update({
      telegram_chat_id: null,
      telegram_link_token: null,
      telegram_link_expira: null,
      telegram_vinculado_em: null
    })
    .eq('id', usuarioId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

module.exports = { gerarCodigo, status, desvincular };
