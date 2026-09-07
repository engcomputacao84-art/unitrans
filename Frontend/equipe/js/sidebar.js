(function () {

  var NAV = [
    {
      label: 'Operação',
      items: [
        {
          page: 'dashboard.html',
          text: 'Painel',
          icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'
        },
        {
          page: 'solicitacoes.html',
          text: 'Solicitações',
          count: '14',
          icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>'
        },
        {
          page: 'cargas.html',
          text: 'Cargas',
          count: '3',
          icon: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'
        },
        {
          page: 'rotas.html',
          text: 'Rotas',
          count: '5',
          icon: '<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8 19h7a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4h-2"/>'
        },
        {
          page: 'entregas.html',
          text: 'Entregas & Coletas',
          icon: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'
        }
      ]
    },
    {
      label: 'Cadastros',
      items: [
        {
          page: 'clientes.html',
          text: 'Clientes',
          icon: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 19c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="18" cy="8.5" r="2.4"/><path d="M16.2 13.2c2.6.3 4.8 2.5 4.8 5.8"/>'
        },
        {
          page: 'caminhoes.html',
          text: 'Caminhões',
          icon: '<rect x="1" y="8" width="14" height="8" rx="1.5"/><path d="M15 11h4l3 3v2h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>'
        },
        {
          page: 'motoristas.html',
          text: 'Motoristas',
          icon: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3.1-7 7-7s7 3 7 7"/>'
        }
      ]
    }
  ];

  var USER = {
    initials: 'RC',
    name: 'Renata Campos',
    role: 'Analista de operações'
  };

  Sidebar.mount({
    nav: NAV,
    defaultPage: 'dashboard.html',
    footer: { type: 'user', user: USER }
  });

})();
