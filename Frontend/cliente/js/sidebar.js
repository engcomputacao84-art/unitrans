(function () {

  var NAV = [
    {
      label: 'Portal do cliente',
      items: [
        {
          page: 'index.html',
          text: 'Nova solicitação',
          icon: '<path d="M12 5v14M5 12h14"/>'
        },
        {
          page: 'acompanhamento.html',
          text: 'Acompanhar solicitações',
          icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'
        }
      ]
    }
  ];

  var USER = {
    initials: 'MD',
    name: 'Marina Duarte',
    role: 'Cliente · Metalúrgica Rio Preto'
  };

  Sidebar.mount({
    nav: NAV,
    defaultPage: 'index.html',
    mobileNav: true,
    footer: [
      {
        type: 'help',
        title: 'Precisa de ajuda?',
        text: 'Nossa equipe pode tirar dúvidas sobre coletas, entregas e prazos.',
        phone: '5517997324060',
        phoneLabel: '(17) 99732-4060',
        message: 'Olá! Preciso de ajuda sobre coletas, entregas ou prazos.'
      },
      { type: 'user', user: USER }
    ]
  });

})();
