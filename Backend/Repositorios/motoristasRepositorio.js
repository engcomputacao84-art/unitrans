/* =========================================================
   Repositório de MOTORISTAS
   ---------------------------------------------------------
   Igual ao de clientes: motorista também é usuarios + tabela
   de extensão. Aqui o endereço é texto livre (o form só tem
   1 campo), então gravamos tudo em enderecos.logradouro.
   ========================================================= */

const bcrypt = require('bcryptjs');
const { supabaseService } = require('../Banco/js/supabaseClient');

const SELECT_MOTORISTA = `
  usuario_id,
  cpf,
  cnh_numero,
  cnh_categorias,
  cnh_validade,
  status,
  observacoes,
  usuarios (
    id, nome, telefone, ativo,
    enderecos ( logradouro )
  )
`;

// O frontend chama o status "em andamento" de "viajando"; no banco
// (e no restante do sistema, como cargas/paradas) o valor é "em_rota".
// Fica só aqui essa tradução, pra não espalhar isso pelo código todo.
var STATUS_DB_PARA_API = { em_rota: 'viajando' };
var STATUS_API_PARA_DB = { viajando: 'em_rota' };

function paraApi(row) {
  const usuario = row.usuarios || {};
  const endereco = usuario.enderecos || {};
  return {
    id: row.usuario_id,
    nome: usuario.nome,
    cpf: row.cpf,
    telefone: usuario.telefone,
    endereco: endereco.logradouro || '',
    cnhNumero: row.cnh_numero,
    cnhCategorias: row.cnh_categorias || [],
    cnhValidade: row.cnh_validade,
    status: STATUS_DB_PARA_API[row.status] || row.status,
    observacoes: row.observacoes || ''
  };
}

async function listar() {
  const { data, error } = await supabaseService
    .from('motoristas')
    .select(SELECT_MOTORISTA)
    .order('usuario_id', { ascending: false });
  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(usuarioId) {
  const { data, error } = await supabaseService
    .from('motoristas')
    .select(SELECT_MOTORISTA)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data ? paraApi(data) : null;
}

async function criar(dados) {
  const { data: endereco, error: erroEndereco } = await supabaseService
    .from('enderecos')
    .insert({ logradouro: dados.endereco })
    .select('id')
    .single();
  if (erroEndereco) throw erroEndereco;

  // Motorista cadastrado pela equipe ainda não tem e-mail/login no
  // form atual — usamos um e-mail técnico único a partir do CPF até
  // o formulário coletar um e-mail de verdade.
  const emailTecnico = 'motorista.' + dados.cpf.replace(/\D/g, '') + '@unitrans.local';
  const senhaHash = bcrypt.hashSync(Math.random().toString(36).slice(-10), 10);

  const { data: usuario, error: erroUsuario } = await supabaseService
    .from('usuarios')
    .insert({
      tipo: 'M', nome: dados.nome, email: emailTecnico, senha_hash: senhaHash,
      telefone: dados.telefone, endereco_id: endereco.id, ativo: true
    })
    .select('id')
    .single();
  if (erroUsuario) {
    await supabaseService.from('enderecos').delete().eq('id', endereco.id);
    throw erroUsuario;
  }

  const { error: erroMotorista } = await supabaseService
    .from('motoristas')
    .insert({
      usuario_id: usuario.id, cpf: dados.cpf, cnh_numero: dados.cnhNumero,
      cnh_categorias: dados.cnhCategorias, cnh_validade: dados.cnhValidade,
      status: STATUS_API_PARA_DB[dados.status] || dados.status, observacoes: dados.observacoes || null
    });
  if (erroMotorista) {
    await supabaseService.from('usuarios').delete().eq('id', usuario.id);
    throw erroMotorista;
  }

  return buscarPorId(usuario.id);
}

async function atualizar(usuarioId, dados) {
  const { data: usuarioRow } = await supabaseService
    .from('usuarios').select('endereco_id').eq('id', usuarioId).single();
  if (!usuarioRow) return null;

  if (usuarioRow.endereco_id) {
    const { error: erroEndereco } = await supabaseService
      .from('enderecos').update({ logradouro: dados.endereco }).eq('id', usuarioRow.endereco_id);
    if (erroEndereco) throw erroEndereco;
  }

  const { error: erroUsuario } = await supabaseService
    .from('usuarios')
    .update({ nome: dados.nome, telefone: dados.telefone })
    .eq('id', usuarioId);
  if (erroUsuario) throw erroUsuario;

  const { error: erroMotorista } = await supabaseService
    .from('motoristas')
    .update({
      cpf: dados.cpf, cnh_numero: dados.cnhNumero, cnh_categorias: dados.cnhCategorias,
      cnh_validade: dados.cnhValidade, status: STATUS_API_PARA_DB[dados.status] || dados.status, observacoes: dados.observacoes || null
    })
    .eq('usuario_id', usuarioId);
  if (erroMotorista) throw erroMotorista;

  return buscarPorId(usuarioId);
}

async function excluir(usuarioId) {
  const { error } = await supabaseService.from('usuarios').delete().eq('id', usuarioId);
  if (error) throw error;
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir };
