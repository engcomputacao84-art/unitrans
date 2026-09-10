(function () {

  var NAV = [
    {
      label: 'Minha operação',
      items: [
        {
          page: 'carga.html',
          text: 'Análise de carga',
          icon: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'
        },
        {
          page: 'rotas.html',
          text: 'Rotas',
          icon: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8 19h7a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4h-2"/>'
        }
      ]
    },
    {
      label: 'Conta',
      items: [
        {
          page: 'telegram.html',
          text: 'Telegram',
          icon: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>'
        }
      ]
    }
  ];

  var USER = Sidebar.usuarioDaSessao();

  Sidebar.mount({
    nav: NAV,
    defaultPage: 'carga.html',
    footer: { type: 'user', user: USER }
  });

})();
