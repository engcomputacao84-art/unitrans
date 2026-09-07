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
    }
  ];

  var USER = {
    initials: 'CM',
    name: 'Carlos Menezes',
    role: 'Motorista · Fiorino DVX-3A21'
  };

  Sidebar.mount({
    nav: NAV,
    defaultPage: 'carga.html',
    footer: { type: 'user', user: USER }
  });

})();
