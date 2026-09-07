
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    'Supabase não configurado. Defina SUPABASE_URL no arquivo .env ' +
    '(veja Backend/.env.example).'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Falta a SUPABASE_ANON_KEY no .env (chave "anon public" em ' +
    'Settings > API Keys no Supabase).'
  );
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Falta a SUPABASE_SERVICE_KEY no .env (chave "service_role secret" em ' +
    'Settings > API Keys no Supabase). Nunca exponha essa chave no frontend.'
  );
}

// Cliente para uso público (frontend, páginas, respeita RLS)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente para uso só no backend (ignora RLS, acesso total)
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = { supabaseAnon, supabaseService };