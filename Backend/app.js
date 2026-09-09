// Entrypoint que o Vercel procura automaticamente para projetos Express
// (ele busca por "app.js" na raiz do projeto). Só repassa pro server.js
// que já existe, sem duplicar nada.
module.exports = require('./server');
