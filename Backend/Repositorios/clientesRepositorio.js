/* =========================================================
   Repositório de CLIENTES
   ---------------------------------------------------------
   Único lugar que sabe como o "cliente" está espalhado em 3
   tabelas (usuarios + clientes + enderecos). As Rotas/ não
   conhecem essa estrutura — só chamam estas funções e recebem
   um objeto já no formato que o frontend espera.
   ========================================================= */

const bcrypt = require('bcryptjs');
const { supabaseService } = require('../Banco/js/supabaseClient');

// Campos trazidos do banco numa única consulta (join implícito
// pelo nome das FKs — é assim que o PostgREST/Supabase faz join).
const SELECT_CLIENTE = `
  usuario_id,
  tipo_pessoa,
  documento,
  razao_social,
  observacoes,
  usuarios (
    id, nome, email, telefone, ativo, criado_em,
    endereco_id,
    enderecos ( id, cep, logradouro, numero, complemento, bairro, cidade, estado )
  ),
  solicitacoes ( count )
`;

// Converte a linha "crua" do Supabase (join aninhado) no formato
// plano que o frontend (clientes.js) já sabe renderizar.
function paraApi(row) {
  const usuario = row.usuarios || {};
  const endereco = usuario.enderecos || {};
  const isPJ = row.tipo_pessoa === 'PJ';

  return {
    id: row.usuario_id,
    tipo: row.tipo_pessoa,
    nome: isPJ ? (row.razao_social || usuario.nome) : usuario.nome,
    fantasia: isPJ ? usuario.nome : '',
    documento: row.documento,
    telefone: usuario.telefone,
    email: usuario.email,
    endereco: endereco.logradouro || '',
    numero: endereco.numero || '',
    complemento: endereco.complemento || '',
    bairro: endereco.bairro || '',
    cidade: endereco.cidade || '',
    uf: endereco.estado || '',
    cep: endereco.cep || '',
    situacao: usuario.ativo ? 'Ativo' : 'Inativo',
    observacoes: row.observacoes || '',
    solicitacoes: Array.isArray(row.solicitacoes) && row.solicitacoes[0]
      ? row.solicitacoes[0].count
      : 0,
    criado_em: usuario.criado_em
  };
}

async function listar() {
  const { data, error } = await supabaseService
    .from('clientes')
    .select(SELECT_CLIENTE)
    .order('usuario_id', { ascending: false });

  if (error) throw error;
  return data.map(paraApi);
}

async function buscarPorId(usuarioId) {
  const { data, error } = await supabaseService
    .from('clientes')
    .select(SELECT_CLIENTE)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw error;
  return data ? paraApi(data) : null;
}

async function criar(dados) {
  // 1) endereço
  const { data: endereco, error: erroEndereco } = await supabaseService
    .from('enderecos')
    .insert({
      cep: dados.cep, logradouro: dados.endereco, numero: dados.numero,
      complemento: dados.complemento || null, bairro: dados.bairro || null,
      cidade: dados.cidade, estado: dados.uf
    })
    .select('id')
    .single();
  if (erroEndereco) throw erroEndereco;

  // 2) usuário (login ainda não existe pra cliente cadastrado pela
  //    equipe — gera uma senha temporária; o cliente troca no
  //    primeiro acesso via "esqueci minha senha")
  const senhaTemporaria = Math.random().toString(36).slice(-10);
  const senhaHash = bcrypt.hashSync(senhaTemporaria, 10);
  const nomeUsuario = dados.tipo === 'PJ' ? (dados.fantasia || dados.nome) : dados.nome;

  const { data: usuario, error: erroUsuario } = await supabaseService
    .from('usuarios')
    .insert({
      tipo: 'C', nome: nomeUsuario, email: dados.email, senha_hash: senhaHash,
      telefone: dados.telefone, endereco_id: endereco.id,
      ativo: dados.situacao !== 'Inativo'
    })
    .select('id')
    .single();
  if (erroUsuario) {
    // desfaz o endereço órfão, já que o usuário não foi criado
    await supabaseService.from('enderecos').delete().eq('id', endereco.id);
    throw erroUsuario;
  }

  // 3) extensão cliente
  const { error: erroCliente } = await supabaseService
    .from('clientes')
    .insert({
      usuario_id: usuario.id, tipo_pessoa: dados.tipo,
      documento: dados.documento,
      razao_social: dados.tipo === 'PJ' ? dados.nome : null,
      observacoes: dados.observacoes || null
    });
  if (erroCliente) {
    await supabaseService.from('usuarios').delete().eq('id', usuario.id); // cascade apaga endereço? não; endereço fica órfão, ver nota abaixo
    throw erroCliente;
  }

  return buscarPorId(usuario.id);
}

async function atualizar(usuarioId, dados) {
  const atual = await buscarPorId(usuarioId);
  if (!atual) return null;

  const { data: usuarioRow } = await supabaseService
    .from('usuarios').select('endereco_id').eq('id', usuarioId).single();

  if (usuarioRow && usuarioRow.endereco_id) {
    const { error: erroEndereco } = await supabaseService
      .from('enderecos')
      .update({
        cep: dados.cep, logradouro: dados.endereco, numero: dados.numero,
        complemento: dados.complemento || null, bairro: dados.bairro || null,
        cidade: dados.cidade, estado: dados.uf
      })
      .eq('id', usuarioRow.endereco_id);
    if (erroEndereco) throw erroEndereco;
  }

  const nomeUsuario = dados.tipo === 'PJ' ? (dados.fantasia || dados.nome) : dados.nome;
  const { error: erroUsuario } = await supabaseService
    .from('usuarios')
    .update({
      nome: nomeUsuario, email: dados.email, telefone: dados.telefone,
      ativo: dados.situacao !== 'Inativo'
    })
    .eq('id', usuarioId);
  if (erroUsuario) throw erroUsuario;

  const { error: erroCliente } = await supabaseService
    .from('clientes')
    .update({
      documento: dados.documento,
      razao_social: dados.tipo === 'PJ' ? dados.nome : null,
      observacoes: dados.observacoes || null
    })
    .eq('usuario_id', usuarioId);
  if (erroCliente) throw erroCliente;

  return buscarPorId(usuarioId);
}

async function excluir(usuarioId) {
  // ON DELETE CASCADE em clientes.usuario_id remove a linha de
  // "clientes" junto. O endereço não é apagado (fica reutilizável/
  // órfão) — schema.sql não amarra isso, é decisão de produto.
  const { error } = await supabaseService.from('usuarios').delete().eq('id', usuarioId);
  if (error) throw error;
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir };
