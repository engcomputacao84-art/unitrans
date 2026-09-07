(function () {

  // =================================================================
  // CAMADA DE DADOS — AcompanhamentoService (mock local)
  // Quando o backend entrar, troca-se "listar()" por um fetch() que
  // devolva todas as solicitações do cliente logado (ex.: GET /minhas-solicitacoes).
  // =================================================================
  var AcompanhamentoService = (function () {
    // Alguns exemplos cobrindo cada status possível — é só o que o
    // histórico do cliente logado mostraria.
    var SOLICITACOES = [
      { id: 'SL-2201', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Av. Prestes Maia, 1840 — Centro', enderecoEntrega: 'Rua Amazonas, 522 — Vila Marin', dataColeta: '25/08/2026 · manhã', dataEntrega: '25/08/2026 · tarde', status: 'pendente', criadoEm: '22/08/2026 09:35', tipoCarga: 'Peças' },
      { id: 'SL-2196', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Rua Bahia, 355 — Centro', enderecoEntrega: 'Av. Tancredo Neves, 980', dataColeta: '20/08/2026 · manhã', dataEntrega: '20/08/2026 · tarde', status: 'aprovado', criadoEm: '18/08/2026 10:12', tipoCarga: 'Materiais' },
      { id: 'SL-2183', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Av. Onze de Agosto, 2140', enderecoEntrega: 'Rua Ceará, 88', dataColeta: '17/08/2026 · manhã', dataEntrega: '17/08/2026 · manhã', status: 'em_carga', criadoEm: '15/08/2026 08:40', tipoCarga: 'Peças' },
      { id: 'SL-2170', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Rua Piauí, 210', enderecoEntrega: 'Av. Bady Bassitt, 1500', dataColeta: '12/08/2026 · tarde', dataEntrega: '12/08/2026 · tarde', status: 'em_rota', criadoEm: '10/08/2026 14:05', tipoCarga: 'Peças' },
      { id: 'SL-2154', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Rua Amazonas, 700', enderecoEntrega: 'Rua Bahia, 300', dataColeta: '05/08/2026 · manhã', dataEntrega: '05/08/2026 · manhã', status: 'concluido', criadoEm: '03/08/2026 09:20', tipoCarga: 'Documentos' },
      { id: 'SL-2140', cliente: 'Metalúrgica Rio Preto Ltda', documento: '12.345.678/0001-90', enderecoColeta: 'Rod. Euclides da Cunha, km 431', enderecoEntrega: 'Av. Sete de Setembro, 512', dataColeta: '29/07/2026 · tarde', dataEntrega: '29/07/2026 · tarde', status: 'recusado', criadoEm: '27/07/2026 11:00', tipoCarga: 'Materiais', motivoRecusa: 'O peso excede o limite de carga dos nossos caminhões disponíveis.' }
    ];

    function delay(value, ms) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(value); }, ms || 200);
      });
    }

    return {
      // Lista o histórico inteiro do cliente logado (sem precisar buscar nada).
      listar: function () {
        return delay(SOLICITACOES.slice());
      }
    };
  })();

  var STATUS_LABEL = {
    pendente: 'Pendente', aprovado: 'Aprovada', em_carga: 'Em carga',
    em_rota: 'Em rota de entrega', concluido: 'Entregue', recusado: 'Recusada'
  };
  var STATUS_BADGE = {
    pendente: 'b-pendente', aprovado: 'b-aprovado', em_carga: 'b-carga',
    em_rota: 'b-rota', concluido: 'b-concluida', recusado: 'b-recusado'
  };
  // Agrupa os status "internos" nos filtros mostrados nos botões.
  var GRUPO_STATUS = {
    pendente: 'pendente',
    aprovado: 'andamento',
    em_carga: 'andamento',
    em_rota: 'andamento',
    concluido: 'concluido',
    recusado: 'recusado'
  };

  var FILTROS = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'andamento', label: 'Em andamento' },
    { key: 'concluido', label: 'Entregues' },
    { key: 'recusado', label: 'Recusadas' }
  ];

  var STEPS = [
    { key: 'recebida', label: 'Recebida' },
    { key: 'aprovado', label: 'Aprovada' },
    { key: 'em_carga', label: 'Em carga' },
    { key: 'em_rota', label: 'Em rota' },
    { key: 'concluido', label: 'Entregue' }
  ];
  var ORDEM = ['recebida', 'aprovado', 'em_carga', 'em_rota', 'concluido'];

  function statusIndex(status) {
    if (status === 'pendente') return 0;
    return ORDEM.indexOf(status);
  }

  function normalizar(str) {
    return (str || '').toLowerCase().replace(/[^\w]/g, '');
  }

  // ---------- Estado ----------
  var TODAS = [];              // tudo que veio do serviço
  var filtroAtivo = 'todas';   // botão selecionado
  var termoBusca = '';         // texto do campo de filtro
  var abertaId = null;         // protocolo com a linha de detalhe expandida

  var pillsEl = document.getElementById('filterPills');
  var wrapEl = document.getElementById('tabelaWrap');
  var buscaInput = document.getElementById('buscaInput');

  function listaFiltrada() {
    var alvo = normalizar(termoBusca);
    return TODAS.filter(function (s) {
      var passaFiltro = filtroAtivo === 'todas' || GRUPO_STATUS[s.status] === filtroAtivo;
      if (!passaFiltro) return false;
      if (!alvo) return true;
      return normalizar(s.id).indexOf(alvo) !== -1 || normalizar(s.tipoCarga).indexOf(alvo) !== -1;
    });
  }

  function renderPills() {
    var contagem = { todas: TODAS.length, pendente: 0, andamento: 0, concluido: 0, recusado: 0 };
    TODAS.forEach(function (s) {
      contagem[GRUPO_STATUS[s.status]]++;
    });

    pillsEl.innerHTML = FILTROS.map(function (f) {
      var ativo = f.key === filtroAtivo ? ' active' : '';
      return '' +
        '<button type="button" class="filter-pill' + ativo + '" data-filter="' + f.key + '">' +
          f.label + '<span class="count">' + contagem[f.key] + '</span>' +
        '</button>';
    }).join('');

    pillsEl.querySelectorAll('.filter-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filtroAtivo = btn.dataset.filter;
        renderPills();
        renderTabela();
      });
    });
  }

  function renderStepper(s) {
    if (s.status === 'recusado') {
      return '<div class="recusado-box"><b>Solicitação recusada</b>' +
        (s.motivoRecusa || 'Entre em contato para mais informações.') + '</div>';
    }
    var idx = statusIndex(s.status);
    var stepsHtml = STEPS.map(function (step, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'current' : '');
      var icon = i < idx ? '<i class="fas fa-check"></i>' : (i + 1);
      return '' +
        '<div class="progress-step ' + cls + '"><div class="bar"></div><div class="circle">' + icon + '</div><div class="label">' + step.label + '</div></div>';
    }).join('');
    return '<div class="progress">' + stepsHtml + '</div>';
  }

  function renderDetalhe(s) {
    return '' +
      '<div class="detalhe-grid">' +
        '<div class="detalhe-item"><span class="lbl">Coleta</span><span class="val">' + s.enderecoColeta + '</span></div>' +
        '<div class="detalhe-item"><span class="lbl">Entrega</span><span class="val">' + s.enderecoEntrega + '</span></div>' +
        '<div class="detalhe-item"><span class="lbl">Data de coleta</span><span class="val">' + s.dataColeta + '</span></div>' +
        '<div class="detalhe-item"><span class="lbl">Data de entrega</span><span class="val">' + s.dataEntrega + '</span></div>' +
        '<div class="detalhe-item"><span class="lbl">Documento</span><span class="val">' + s.documento + '</span></div>' +
        '<div class="detalhe-item"><span class="lbl">Aberta em</span><span class="val">' + s.criadoEm + '</span></div>' +
      '</div>' +
      renderStepper(s);
  }

  function renderLinha(s) {
    var badgeCls = STATUS_BADGE[s.status] || 'b-pendente';
    var aberta = s.id === abertaId;
    return '' +
      '<tr class="linha-solicitacao' + (aberta ? ' aberta' : '') + '" data-id="' + s.id + '">' +
        '<td class="col-proto">' + s.id + '<span class="data-abertura">' + s.criadoEm + '</span></td>' +
        '<td class="col-carga"><span class="tipo">' + s.tipoCarga + '</span><span class="rota">' + s.enderecoColeta + ' → ' + s.enderecoEntrega + '</span></td>' +
        '<td><span class="badge ' + badgeCls + '">' + STATUS_LABEL[s.status] + '</span></td>' +
        '<td class="col-chevron"><i class="fas fa-chevron-down"></i></td>' +
      '</tr>' +
      '<tr class="linha-detalhe' + (aberta ? ' open' : '') + '" data-detalhe-de="' + s.id + '">' +
        '<td colspan="4"><div class="detalhe-inner">' + renderDetalhe(s) + '</div></td>' +
      '</tr>';
  }

  function renderTabela() {
    var lista = listaFiltrada();

    if (!lista.length) {
      wrapEl.innerHTML =
        '<div class="empty-state">' +
          '<i class="fas fa-inbox"></i>' +
          '<p>Nenhuma solicitação encontrada' + (termoBusca ? ' para "' + termoBusca + '"' : '') + '.</p>' +
        '</div>';
      return;
    }

    wrapEl.innerHTML =
      '<div class="table-scroll">' +
        '<table>' +
          '<thead><tr>' +
            '<th>Nº solicitação</th><th>Carga</th><th>Status</th><th></th>' +
          '</tr></thead>' +
          '<tbody>' + lista.map(renderLinha).join('') + '</tbody>' +
        '</table>' +
      '</div>';

    wrapEl.querySelectorAll('.linha-solicitacao').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.dataset.id;
        abertaId = abertaId === id ? null : id;
        renderTabela();
      });
    });
  }

  var debounceTimer = null;
  buscaInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var valor = buscaInput.value.trim();
    debounceTimer = setTimeout(function () {
      termoBusca = valor;
      renderTabela();
    }, 150);
  });

  // ---------- Carrega o histórico do cliente logado ----------
  wrapEl.innerHTML = '<div class="empty-state"><i class="fas fa-circle-notch fa-spin"></i><p>Carregando histórico…</p></div>';
  AcompanhamentoService.listar().then(function (lista) {
    TODAS = lista;
    renderPills();
    renderTabela();
  });

})();
