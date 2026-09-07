/* =========================================================
   Sidebar — motor de renderização compartilhado por
   cliente/, equipe/ e motorista/.

   Cada módulo mantém seu próprio js/sidebar.js só com os
   DADOS (menu, usuário) e chama:

     Sidebar.mount({
       nav: NAV,                 // itens de menu (obrigatório)
       defaultPage: 'x.html',    // página assumida na raiz ('/')
       footer: {                 // rodapé do menu lateral
         type: 'user',           // avatar + nome + cargo
         user: { initials, name, role }
       },
       // OU
       footer: {
         type: 'help',           // bloco de ajuda/whatsapp
         title: 'Precisa de ajuda?',
         text: '...',
         phone: '5517997324060',
         phoneLabel: '(17) 99732-4060'
       },
       // OU (os dois juntos — ex: identidade do cliente + ajuda)
       footer: [
         { type: 'user', user: { initials, name, role } },
         { type: 'help', title: '...', text: '...', phone: '...', phoneLabel: '...' }
       ],
       mobileNav: true           // também renderiza <div id="mobile-nav-mount">
     });

   Requer os elementos `#sidebar-mount` (e `#mobile-nav-mount`
   quando mobileNav: true) já presentes no HTML da página.
   ========================================================= */
window.Sidebar = (function () {

  function currentPage(defaultPage) {
    var path = window.location.pathname.split('/').pop();
    return path === '' ? defaultPage : path;
  }

  function icon(paths) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + paths + '</svg>';
  }

  function renderNavItem(item, active) {
    var classes = 'nav-item' + (active ? ' active' : '');
    var count = item.count ? '<span class="nav-count">' + item.count + '</span>' : '';
    return '' +
      '<a class="' + classes + '" href="' + item.page + '">' +
        icon(item.icon) +
        item.text +
        count +
      '</a>';
  }

  function renderGroup(group, active) {
    var itemsHtml = group.items.map(function (item) {
      return renderNavItem(item, item.page === active);
    }).join('');
    return '' +
      '<div class="nav-group">' +
        '<div class="nav-label">' + group.label + '</div>' +
        itemsHtml +
      '</div>';
  }

  /* ---------- Rodapés ---------- */
  var LOGOUT_ICON_PATHS = '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>';

  function renderFooterUser(user) {
    return '' +
      '<div class="sidebar-foot">' +
        '<div class="avatar">' + user.initials + '</div>' +
        '<div class="sidebar-foot-info">' +
          '<div class="user-name">' + user.name + '</div>' +
          '<div class="user-role">' + user.role + '</div>' +
        '</div>' +
        '<button type="button" class="sidebar-logout" data-sidebar-logout title="Encerrar sessão" aria-label="Encerrar sessão">' +
          icon(LOGOUT_ICON_PATHS) +
        '</button>' +
      '</div>';
  }

  function renderFooterHelp(help, skipLogout) {
    var waHref = 'https://wa.me/' + help.phone + '?text=' + encodeURIComponent(help.message || 'Olá! Preciso de ajuda sobre coletas, entregas ou prazos.');
    return '' +
      '<div class="sidebar-help">' +
        '<div class="sh-title">' + (help.title || 'Precisa de ajuda?') + '</div>' +
        '<div class="sh-text">' + help.text + '</div>' +
        '<a class="sh-contact" href="' + waHref + '" target="_blank" rel="noopener">' +
          icon('<path d="M3 5c0 9 7 16 16 16l3-4-6-3-2 2c-3-1.5-5-3.5-6.5-6.5l2-2-3-6z"/>') +
          help.phoneLabel +
        '</a>' +
      '</div>' +
      (skipLogout ? '' :
        '<button type="button" class="sidebar-exit" data-sidebar-logout>' +
          icon(LOGOUT_ICON_PATHS) +
          'Encerrar sessão' +
        '</button>');
  }

  // `footer` aceita um único bloco ({type:'user',...} ou {type:'help',...})
  // ou uma lista de blocos, pra sidebars que precisam mostrar os dois juntos
  // (ex: identidade do cliente + caixa de ajuda). O botão de sair só aparece
  // uma vez: preferindo o bloco de identidade, quando ele existir.
  function renderFooter(footer) {
    if (!footer) return '';
    var blocks = Array.isArray(footer) ? footer : [footer];
    var temIdentidade = blocks.some(function (f) { return f.type !== 'help'; });

    var html = blocks.map(function (f) {
      return f.type === 'help' ? renderFooterHelp(f, temIdentidade) : renderFooterUser(f.user);
    }).join('');

    return '<div class="sidebar-foot-stack">' + html + '</div>';
  }

  /* ---------- Montagem ---------- */
  function renderSidebar(opts) {
    var active = currentPage(opts.defaultPage);
    var groupsHtml = opts.nav.map(function (group) {
      return renderGroup(group, active);
    }).join('');

    return '' +
      '<aside class="sidebar">' +
        '<div class="brand">' +
          '<img class="brand-logo" src="../img/logo.png" alt="Unitrans">' +
        '</div>' +
        '<nav>' + groupsHtml + '</nav>' +
        renderFooter(opts.footer) +
      '</aside>';
  }

  function renderMobileNav(opts) {
    var active = currentPage(opts.defaultPage);
    var links = opts.nav[0].items.map(function (item) {
      var cls = item.page === active ? ' class="active"' : '';
      return '<a href="' + item.page + '"' + cls + '>' + item.text + '</a>';
    }).join('');
    return '<div class="mobile-nav">' + links + '</div>';
  }

  function logout() {
    try {
      sessionStorage.removeItem('unitrans_role');
      sessionStorage.removeItem('unitrans_email');
    } catch (e) {}
    // Sidebar sempre fica um nível abaixo da raiz do Frontend
    // (cliente/, equipe/, motorista/), então o login está sempre em "../".
    window.location.href = '../login.html';
  }

  function ligarLogout() {
    var botoes = document.querySelectorAll('[data-sidebar-logout]');
    botoes.forEach(function (btn) {
      btn.addEventListener('click', logout);
    });
  }

  function mount(opts) {
    function run() {
      var el = document.getElementById('sidebar-mount');
      if (el) el.outerHTML = renderSidebar(opts);
      if (opts.mobileNav) {
        var mobEl = document.getElementById('mobile-nav-mount');
        if (mobEl) mobEl.outerHTML = renderMobileNav(opts);
      }
      ligarLogout();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  return { mount: mount };
})();
