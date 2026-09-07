require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Faltou configurar o .env (SUPABASE_URL).');
  process.exit(1);
}

const TABELA_FANTASMA = '_teste_conexao_unitrans_9999';

async function testarChave(nome, key) {
  if (!key) {
    console.log(`⏭️  ${nome}: não configurada no .env, pulando.`);
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABELA_FANTASMA}?select=*&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key
        }
      }
    );

    if (res.status === 401 || res.status === 403) {
      console.log(`⚠️  ${nome}: chave rejeitada (status ${res.status}). Confira se copiou certo no .env.`);
    } else if (res.status === 404 || res.status === 400) {
      // Relation "não existe" = autenticou certinho, só não tem tabela ainda.
      console.log(`✅ ${nome}: conectada com sucesso (autenticação ok, ainda sem tabelas).`);
    } else if (res.status === 200) {
      console.log(`✅ ${nome}: conectada com sucesso (e essa tabela de teste já existe, aparentemente).`);
    } else {
      console.log(`⚠️  ${nome}: o servidor respondeu com status ${res.status} — confira a URL/chave.`);
    }
  } catch (err) {
    console.error(`❌ ${nome}: não deu pra conectar. Confira se a SUPABASE_URL está certa.`);
    console.error('   Detalhe do erro:', err.message);
  }
}

async function testar() {
  await testarChave('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);
  await testarChave('SUPABASE_SERVICE_KEY', SUPABASE_SERVICE_KEY);
}

testar();