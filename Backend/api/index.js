// Entry point que o Vercel usa para rodar o backend como serverless
// function. O Vercel importa este arquivo, chama o "app" do Express
// exportado por ../server.js e cuida de subir/derrubar a função a
// cada requisição — não precisamos (nem podemos) chamar app.listen aqui.
const app = require('../server');

module.exports = app;
