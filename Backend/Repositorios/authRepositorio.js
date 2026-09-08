/* =========================================================
   Repositório de AUTENTICAÇÃO
   ---------------------------------------------------------
   Login simples: busca o usuário pelo e-mail e confere a senha
   com bcrypt contra usuarios.senha_hash. Não emite JWT nem cria
   sessão de verdade — devolve os dados que o frontend precisa
   pra saber "quem é" e guardar em localStorage (mesmo mecanismo
   já usado em carga.js, rotas.js, acompanhamento.js etc.).
   Trocar por JWT/sessão de verdade é o próximo passo natural.
   ========================================================= */

const bcrypt = require('bcryptjs');
const { supabaseService } = require('../Banco/js/supabaseClient');

async function login(email, senha) {
  const { data: usuario, error } = await supabaseService
    .from('usuarios')
    .select('id, tipo, nome, email, senha_hash, ativo')
    .ilike('email', email.trim())
    .maybeSingle();
  if (error) throw error;

  // Mesma mensagem de erro tanto pra "e-mail não existe" quanto pra
  // "senha errada" — não dar pista de qual dos dois está incorreto.
  if (!usuario || !usuario.ativo || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return null;
  }

  const base = { id: usuario.id, tipo: usuario.tipo, nome: usuario.nome, email: usuario.email };

  // Cada tela usa um id diferente em localStorage (cliente/motorista/
  // analista) — como usuario_id É o próprio id de usuarios, devolver
  // "id" já bastaria, mas deixamos explícito por tipo pra o frontend
  // não ter que adivinhar qual chave usar.
  if (usuario.tipo === 'C') {
    return Object.assign({}, base, { clienteId: usuario.id, redirect: 'cliente/index.html' });
  }
  if (usuario.tipo === 'M') {
    return Object.assign({}, base, { motoristaId: usuario.id, redirect: 'motorista/carga.html' });
  }
  return Object.assign({}, base, { analistaId: usuario.id, redirect: 'equipe/dashboard.html' });
}

module.exports = { login };
