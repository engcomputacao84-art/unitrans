(function () {
  var gridEl = document.getElementById('cargasGrid');
  if (!gridEl) return;

  // ============================================================
  // SERVIÇO DE DADOS DA FROTA (CAMINHÕES + MOTORISTAS) - MOCK
  // Mock local só para exemplificação. Quando o banco entrar,
  // troca-se o corpo de cada função por um fetch().
  // ============================================================
  var FrotaService = (function () {
    var caminhoes = [
      { id: 'DVX-3A21', modelo: 'Fiorino', capacidade: 650, status: 'em_rota' },
      { id: 'DVX-8F02', modelo: 'Delivery', capacidade: 2500, status: 'em_rota' },
      { id: 'DVX-1C77', modelo: 'Fiorino', capacidade: 650, status: 'disponivel' },
      { id: 'DVX-4B90', modelo: 'Delivery', capacidade: 2500, status: 'manutencao' },
      { id: 'DVX-6D45', modelo: 'Delivery', capacidade: 2500, status: 'disponivel' },
      { id: 'DVX-7E19', modelo: 'Fiorino', capacidade: 650, status: 'disponivel' }
    ];

    var motoristas = [
      { id: 'MOT-001', nome: 'Carlos Menezes', status: 'em_rota' },
      { id: 'MOT-002', nome: 'Josiane Ferreira', status: 'em_rota' },
      { id: 'MOT-003', nome: 'Paulo Ricardo', status: 'disponivel' },
      { id: 'MOT-004', nome: 'Fernanda Oliveira', status: 'disponivel' },
      { id: 'MOT-005', nome: 'Roberto Santos', status: 'folga' }
    ];

    var STATUS_LABEL = {
      disponivel: 'Disponível',
      em_rota: 'Em rota',
      manutencao: 'Manutenção',
      folga: 'Folga',
      inativo: 'Inativo'
    };

    return {
      statusLabel: function (status) {
        return STATUS_LABEL[status] || status;
      },
      listarCaminhoes: function () {
        return Promise.resolve(caminhoes.slice());
      },
      listarMotoristasDisponiveis: function () {
        return Promise.resolve(motoristas.filter(function (m) { return m.status === 'disponivel'; }));
      },
      atualizarStatusCaminhao: function (id, status) {
        var c = caminhoes.find(function (x) { return x.id === id; });
        if (c) c.status = status;
        return Promise.resolve(c || null);
      },
      atualizarStatusMotorista: function (id, status) {
        var m = motoristas.find(function (x) { return x.id === id; });
        if (m) m.status = status;
        return Promise.resolve(m || null);
      }
    };
  })();

  var TRASH_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';

  var DAYS = ['25/08', '26/08', '27/08'];

  // Referências dos filtros
  var filterChips = document.querySelectorAll('#filterToolbarCargas .chip');
  var filterDataSelect = document.getElementById('filterDataCargas');
  var limparDataBtn = document.getElementById('limparDataCargas');
  var resumoEl = document.getElementById('cargasResumo');

  // Estado dos filtros
  var currentFilter = 'all';
  var currentDataFilter = 'all';

  // =================================================================
  // Solicitações pendentes (mock)
  // =================================================================
  var MOCK_SOLICITACOES = [
    // ---- 25/08 ----
    { id: 'SL-2201', cliente: 'Metalúrgica Rio Preto Ltda', tipo: 'coleta', zona: 'Centro', endereco: 'Av. Prestes Maia, 1840', periodo: 'manha', peso: 120, dia: '25/08' },
    { id: 'SL-2202', cliente: 'Farmácia Bem-Estar', tipo: 'entrega', zona: 'Vila Marin', endereco: 'Rua Amazonas, 522', periodo: 'tarde', peso: 18, dia: '25/08' },
    { id: 'SL-2203', cliente: 'Distribuidora Noroeste', tipo: 'coleta', zona: 'Distrito Industrial', endereco: 'Rod. Euclides da Cunha, km 431', periodo: 'manha', peso: 480, dia: '25/08' },
    { id: 'SL-2205', cliente: 'Auto Peças Votupeças', tipo: 'coleta', zona: 'Centro', endereco: 'Av. Tancredo Neves, 980', periodo: 'tarde', peso: 95, dia: '25/08' },
    { id: 'SL-2207', cliente: 'Clínica VidaPlus', tipo: 'entrega', zona: 'Centro', endereco: 'Av. Onze de Agosto, 2140', periodo: 'manha', peso: 40, dia: '25/08' },
    { id: 'SL-2209', cliente: 'Transportadora Bandeirantes', tipo: 'coleta', zona: 'Distrito Industrial', endereco: 'Rod. Euclides da Cunha, km 428', periodo: 'manha', peso: 210, dia: '25/08' },
    { id: 'SL-2211', cliente: 'Loja Casa & Cia', tipo: 'entrega', zona: 'Vila Marin', endereco: 'Rua Ceará, 88', periodo: 'tarde', peso: 65, dia: '25/08' },
    { id: 'SL-2215', cliente: 'Supermercado Compre Bem', tipo: 'entrega', zona: 'Centro', endereco: 'Rua Bahia, 300', periodo: 'manha', peso: 150, dia: '25/08' },

    // ---- 26/08 ----
    { id: 'SL-2204', cliente: 'Mercado São José', tipo: 'entrega', zona: 'Jd. Redentor', endereco: 'Rua Piratininga, 190', periodo: 'manha', peso: 88, dia: '26/08' },
    { id: 'SL-2206', cliente: 'Confecções Del Rio', tipo: 'coleta', zona: 'Centro', endereco: 'Rua Bahia, 355', periodo: 'manha', peso: 60, dia: '26/08' },
    { id: 'SL-2212', cliente: 'Distribuidora Sul', tipo: 'entrega', zona: 'Jd. Redentor', endereco: 'Av. Sete de Setembro, 512', periodo: 'tarde', peso: 140, dia: '26/08' },
    { id: 'SL-2213', cliente: 'Padaria Trigo Dourado', tipo: 'coleta', zona: 'Vila Marin', endereco: 'Rua Piauí, 210', periodo: 'tarde', peso: 35, dia: '26/08' },
    { id: 'SL-2216', cliente: 'Auto Center Norte', tipo: 'coleta', zona: 'Zona Sul', endereco: 'Av. Alberto Andaló, 3050', periodo: 'manha', peso: 320, dia: '26/08' },
    { id: 'SL-2217', cliente: 'Farmácia Popular', tipo: 'entrega', zona: 'Zona Sul', endereco: 'Rua Voluntário Salles, 900', periodo: 'tarde', peso: 22, dia: '26/08' },

    // ---- 27/08 ----
    { id: 'SL-2208', cliente: 'Papelaria Escreva Bem', tipo: 'coleta', zona: 'Centro', endereco: 'Rua Pernambuco, 77', periodo: 'tarde', peso: 25, dia: '27/08' },
    { id: 'SL-2214', cliente: 'Depósito Constrular', tipo: 'entrega', zona: 'Distrito Industrial', endereco: 'Rod. Washington Luís, km 5', periodo: 'manha', peso: 410, dia: '27/08' },
    { id: 'SL-2218', cliente: 'Loja Moda Jovem', tipo: 'coleta', zona: 'Vila Marin', endereco: 'Rua Amazonas, 700', periodo: 'manha', peso: 48, dia: '27/08' },
    { id: 'SL-2219', cliente: 'Distribuidora Rio Preto Alimentos', tipo: 'coleta', zona: 'Zona Sul', endereco: 'Av. Alberto Andaló, 4100', periodo: 'tarde', peso: 260, dia: '27/08' },
    { id: 'SL-2220', cliente: 'Clínica Odontológica Sorriso', tipo: 'entrega', zona: 'Centro', endereco: 'Av. Bady Bassitt, 1500', periodo: 'manha', peso: 15, dia: '27/08' }
  ];

  function solById(id) {
    for (var i = 0; i < MOCK_SOLICITACOES.length; i++) if (MOCK_SOLICITACOES[i].id === id) return MOCK_SOLICITACOES[i];
    return null;
  }

  // =================================================================
  // CargasStore
  // =================================================================
  var CargasStore = (function () {
    var seq = 514;

    var cargas = [
      {
        id: 'C-0512', dia: '25/08', status: 'montagem',
        caminhaoId: 'DVX-1C77', caminhaoLabel: 'DVX-1C77 — Fiat Fiorino',
        itemIds: ['SL-2201', 'SL-2205', 'SL-2207', 'SL-2202', 'SL-2211']
      },
      {
        id: 'C-0513', dia: '26/08', status: 'montagem',
        caminhaoId: 'DVX-6D45', caminhaoLabel: 'DVX-6D45 — VUC 3/4 — Volkswagen Delivery',
        itemIds: ['SL-2204', 'SL-2212', 'SL-2217', 'SL-2216']
      },
      {
        id: 'C-0510', dia: '24/08', status: 'rota',
        caminhaoId: 'DVX-3A21', caminhaoLabel: 'DVX-3A21 — Fiat Fiorino',
        motoristaId: 'MOT-01', motoristaLabel: 'Carlos Menezes',
        rotaId: 'RT-0512', itemIds: [],
        legacySummary: { regiao: 'Rodovia / Distrito Industrial', solicitacoes: 8, peso: 610, coletas: 5, entregas: 3 }
      }
    ];

    function caminhoesEmUsoMontagem(excludeCargaId) {
      var uso = {};
      cargas.forEach(function (c) {
        if (c.status === 'montagem' && c.id !== excludeCargaId) uso[c.caminhaoId] = true;
      });
      return uso;
    }

    function itensEmUso(excludeCargaId) {
      var uso = {};
      cargas.forEach(function (c) {
        if (c.id === excludeCargaId) return;
        (c.itemIds || []).forEach(function (id) { uso[id] = true; });
      });
      return uso;
    }

    return {
      listar: function () { return cargas.slice(); },
      obter: function (id) {
        var res = null;
        cargas.forEach(function (c) { if (c.id === id) res = c; });
        return res;
      },
      caminhoesEmUsoMontagem: caminhoesEmUsoMontagem,

      solicitacoesDisponiveis: function (dia, excludeCargaId) {
        var uso = itensEmUso(excludeCargaId);
        return MOCK_SOLICITACOES.filter(function (s) { return s.dia === dia && !uso[s.id]; });
      },

      criar: function (dados) {
        var novo = {
          id: 'C-0' + (seq++), dia: dados.dia, status: 'montagem',
          caminhaoId: dados.caminhaoId, caminhaoLabel: dados.caminhaoLabel,
          itemIds: dados.itemIds.slice()
        };
        cargas.push(novo);
        return novo;
      },

      atualizar: function (id, dados) {
        var carga = this.obter(id);
        if (!carga) return null;
        if (dados.caminhaoId) { carga.caminhaoId = dados.caminhaoId; carga.caminhaoLabel = dados.caminhaoLabel; }
        if (dados.itemIds) carga.itemIds = dados.itemIds.slice();
        return carga;
      },

      excluir: function (id) {
        cargas = cargas.filter(function (c) { return c.id !== id; });
      },

      marcarEmRota: function (id, motoristaId, motoristaLabel, rotaId) {
        var carga = this.obter(id);
        if (!carga) return null;
        carga.status = 'rota';
        carga.motoristaId = motoristaId;
        carga.motoristaLabel = motoristaLabel;
        carga.rotaId = rotaId;
        return carga;
      }
    };
  })();

  // =================================================================
  // Grid de cargas (tela principal)
  // =================================================================
  function computeResumo(carga) {
    if (carga.legacySummary) return carga.legacySummary;
    var itens = carga.itemIds.map(solById).filter(Boolean);
    var zonas = {};
    itens.forEach(function (it) { zonas[it.zona] = true; });
    return {
      regiao: Object.keys(zonas).join(' / ') || '—',
      solicitacoes: itens.length,
      peso: itens.reduce(function (s, it) { return s + it.peso; }, 0),
      coletas: itens.filter(function (it) { return it.tipo === 'coleta'; }).length,
      entregas: itens.filter(function (it) { return it.tipo === 'entrega'; }).length,
      itens: itens
    };
  }

  function renderCard(carga) {
    var resumo = computeResumo(carga);

    if (carga.status === 'rota') {
      return '' +
        '<div class="carga-card" data-carga="' + carga.id + '">' +
          '<div class="carga-card-top">' +
            '<div><div class="cell-strong">Carga ' + carga.id + '</div><div class="carga-region">' + resumo.regiao + '</div></div>' +
            '<span class="badge b-rota">Em rota</span>' +
          '</div>' +
          '<div class="carga-meta">' +
            '<div><div class="num">' + resumo.solicitacoes + '</div><div class="lbl">solicitações</div></div>' +
            '<div><div class="num">' + resumo.peso + 'kg</div><div class="lbl">peso total</div></div>' +
            '<div><div class="num">' + resumo.coletas + '/' + resumo.entregas + '</div><div class="lbl">col./entr.</div></div>' +
          '</div>' +
          '<ul class="carga-list">' +
            '<li><span>' + carga.rotaId + '</span><span>vinculada</span></li>' +
            '<li><span>' + resumo.solicitacoes + ' solicitações</span><span>fechada</span></li>' +
            '<li><span>' + carga.motoristaLabel + '</span><span class="mono">' + carga.caminhaoId + '</span></li>' +
          '</ul>' +
          '<div class="carga-card-foot"><button class="btn btn-ghost" style="flex:1;" data-verrota="' + carga.rotaId + '">Ver rota vinculada</button></div>' +
        '</div>';
    }

    var preview = resumo.itens.slice(0, 3).map(function (it) {
      return '<li><span>' + it.id + '</span><span>' + (it.tipo === 'coleta' ? 'Coleta' : 'Entrega') + '</span></li>';
    }).join('');
    if (resumo.itens.length > 3) preview += '<li><span>+' + (resumo.itens.length - 3) + ' solicitações</span><span></span></li>';
    if (!resumo.itens.length) preview = '<li><span>Nenhuma solicitação ainda</span><span></span></li>';

    return '' +
      '<div class="carga-card" data-carga="' + carga.id + '">' +
        '<div class="carga-card-top">' +
          '<div><div class="cell-strong">Carga ' + carga.id + '</div><div class="carga-region">' + resumo.regiao + ' · ' + carga.caminhaoId + '</div></div>' +
          '<span class="badge b-carga">Em montagem</span>' +
        '</div>' +
        '<div class="carga-meta">' +
          '<div><div class="num">' + resumo.solicitacoes + '</div><div class="lbl">solicitações</div></div>' +
          '<div><div class="num">' + resumo.peso + 'kg</div><div class="lbl">peso total</div></div>' +
          '<div><div class="num">' + resumo.coletas + '/' + resumo.entregas + '</div><div class="lbl">col./entr.</div></div>' +
        '</div>' +
        '<ul class="carga-list">' + preview + '</ul>' +
        '<div class="carga-card-foot">' +
          '<button class="btn btn-primary" data-rota="' + carga.id + '"' + (resumo.itens.length ? '' : ' disabled') + '>Gerar rota</button>' +
          '<button class="btn btn-ghost" data-editar="' + carga.id + '">Editar</button>' +
          '<button class="btn btn-ghost btn-icon-danger" data-excluir-carga="' + carga.id + '" title="Excluir carga">' + TRASH_SVG + '</button>' +
        '</div>' +
      '</div>';
  }

  function atualizarContagens(cargas) {
    var total = cargas.length;
    var montagem = cargas.filter(function(c) { return c.status === 'montagem'; }).length;
    var rota = cargas.filter(function(c) { return c.status === 'rota'; }).length;
    
    var countAll = document.getElementById('filterCountAllCargas');
    var countMontagem = document.getElementById('filterCountMontagemCargas');
    var countRota = document.getElementById('filterCountRotaCargas');
    
    if (countAll) countAll.textContent = total;
    if (countMontagem) countMontagem.textContent = montagem;
    if (countRota) countRota.textContent = rota;
  }

  function renderGrid() {
    var cargas = CargasStore.listar();
    
    // Aplicar filtros
    var cargasFiltradas = cargas.filter(function(carga) {
      // Filtro por status
      if (currentFilter === 'montagem' && carga.status !== 'montagem') return false;
      if (currentFilter === 'rota' && carga.status !== 'rota') return false;
      
      // Filtro por data
      if (currentDataFilter !== 'all' && carga.dia !== currentDataFilter) return false;
      
      return true;
    });
    
    // Atualizar contagens
    atualizarContagens(cargas);
    
    // Atualizar resumo
    if (resumoEl) {
      var filtroTexto = '';
      if (currentDataFilter !== 'all') {
        filtroTexto = ' · Data: ' + currentDataFilter;
      } else if (currentFilter !== 'all') {
        var labels = { 'montagem': 'Em montagem', 'rota': 'Em rota' };
        filtroTexto = ' (' + labels[currentFilter] + ')';
      }
      resumoEl.textContent = cargasFiltradas.length + ' cargas' + filtroTexto;
    }
    
    gridEl.innerHTML = cargasFiltradas.length 
      ? cargasFiltradas.map(renderCard).join('') 
      : '<div class="truck-empty">Nenhuma carga encontrada com os filtros selecionados.</div>';
    bindGridEvents();
  }

  function bindGridEvents() {
    gridEl.querySelectorAll('[data-verrota]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.location.href = 'rotas.html?rota=' + encodeURIComponent(btn.dataset.verrota);
      });
    });

    gridEl.querySelectorAll('[data-editar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var carga = CargasStore.obter(btn.dataset.editar);
        if (carga) abrirEdicao(carga);
      });
    });

    gridEl.querySelectorAll('[data-excluir-carga]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cargaId = btn.dataset.excluirCarga;
        UI.confirmar({
          title: 'Excluir carga',
          message: 'Excluir a carga ' + cargaId + '? As solicitações voltam a ficar disponíveis para entrar em outra carga.',
          confirmLabel: 'Excluir',
          tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          CargasStore.excluir(cargaId);
          renderGrid();
          UI.toast('Carga ' + cargaId + ' excluída com sucesso!');
        });
      });
    });

    gridEl.querySelectorAll('[data-rota]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var carga = CargasStore.obter(btn.dataset.rota);
        if (!carga) return;
        abrirModalAtribuicao(carga, function (motoristaId, motoristaLabel) {
          var rotaId = 'RT-' + Math.floor(1000 + Math.random() * 9000);
          CargasStore.marcarEmRota(carga.id, motoristaId, motoristaLabel, rotaId);
          FrotaService.atualizarStatusCaminhao(carga.caminhaoId, 'em_rota');
          FrotaService.atualizarStatusMotorista(motoristaId, 'em_rota');
          UI.toast('Rota ' + rotaId + ' gerada a partir da carga ' + carga.id + ', com ' + motoristaLabel + ' (' + carga.caminhaoLabel + '). Ela já pode ser ajustada na tela de Rotas.');
          renderGrid();
        });
      });
    });
  }

  // =================================================================
  // Modal: Gerar rota
  // =================================================================
  var modalAtribuirOverlay = document.getElementById('modalAtribuirOverlay');
  var formAtribuir = document.getElementById('formAtribuir');
  var fecharModalAtribuirBtn = document.getElementById('fecharModalAtribuir');
  var atribuirCaminhaoLabelEl = document.getElementById('atribuirCaminhaoLabel');
  var selectMotorista = document.getElementById('selectMotorista');
  var onConfirmarAtribuicao = null;

  function abrirModalAtribuicao(carga, onConfirm) {
    if (!modalAtribuirOverlay) { onConfirm(null, null); return; }
    onConfirmarAtribuicao = onConfirm;
    atribuirCaminhaoLabelEl.textContent = carga.caminhaoLabel || carga.caminhaoId;
    FrotaService.listarMotoristasDisponiveis().then(function (lista) {
      selectMotorista.innerHTML = '<option value="">Selecione…</option>' + lista.map(function (m) {
        return '<option value="' + m.id + '" data-label="' + m.nome + '">' + m.nome + '</option>';
      }).join('');
      if (!lista.length) selectMotorista.innerHTML = '<option value="">Nenhum motorista disponível</option>';
    });
    modalAtribuirOverlay.classList.add('open');
  }

  function fecharAtribuicaoModal() {
    if (modalAtribuirOverlay) modalAtribuirOverlay.classList.remove('open');
    onConfirmarAtribuicao = null;
  }

  if (fecharModalAtribuirBtn) fecharModalAtribuirBtn.addEventListener('click', fecharAtribuicaoModal);
  Utils.ligarFechamentoModal(modalAtribuirOverlay, fecharAtribuicaoModal);
  if (formAtribuir) {
    formAtribuir.addEventListener('submit', function (e) {
      e.preventDefault();
      var field = selectMotorista.closest('.field');
      if (!selectMotorista.value) { field.classList.add('invalid'); return; }
      field.classList.remove('invalid');
      var opt = selectMotorista.options[selectMotorista.selectedIndex];
      var callback = onConfirmarAtribuicao;
      var motoristaId = selectMotorista.value;
      var motoristaLabel = opt ? opt.dataset.label : '';
      fecharAtribuicaoModal();
      if (callback) callback(motoristaId, motoristaLabel);
    });
  }

  // =================================================================
  // Modal: Montar / editar carga (wizard de 2 passos)
  // =================================================================
  var modalMontarOverlay = document.getElementById('modalMontarOverlay');
  var btnMontarCarga = document.getElementById('btnMontarCarga');
  var fecharModalMontarBtn = document.getElementById('fecharModalMontar');
  var montarDayTabsEl = document.getElementById('montarDayTabs');
  var truckSelectGridEl = document.getElementById('truckSelectGrid');
  var btnAvancarMontar = document.getElementById('btnAvancarMontar');
  var btnVoltarMontar = document.getElementById('btnVoltarMontar');
  var btnConcluirMontar = document.getElementById('btnConcluirMontar');
  var montarStep2SubEl = document.getElementById('montarStep2Sub');
  var montarSummaryEl = document.getElementById('montarSummary');
  var montarWarningsEl = document.getElementById('montarWarnings');
  var montarPoolColetaEl = document.getElementById('montarPoolColeta');
  var montarPoolEntregaEl = document.getElementById('montarPoolEntrega');
  var montarCountColetaEl = document.getElementById('montarCountColeta');
  var montarCountEntregaEl = document.getElementById('montarCountEntrega');

  var wizard = { step: 1, dia: DAYS[0], caminhaoId: null, caminhaoLabel: null, capacidade: 0, selected: {}, editingId: null, trucksCache: [] };

  function abrirWizard(cargaParaEditar) {
    wizard = {
      step: 1,
      dia: cargaParaEditar ? cargaParaEditar.dia : DAYS[0],
      caminhaoId: cargaParaEditar ? cargaParaEditar.caminhaoId : null,
      caminhaoLabel: cargaParaEditar ? cargaParaEditar.caminhaoLabel : null,
      capacidade: 0,
      selected: {},
      editingId: cargaParaEditar ? cargaParaEditar.id : null,
      trucksCache: []
    };
    if (cargaParaEditar) {
      cargaParaEditar.itemIds.forEach(function (id) { wizard.selected[id] = true; });
    }
    if (modalMontarOverlay) modalMontarOverlay.classList.add('open');
    renderStep1();
    goToStep(1);
  }

  function fecharWizard() {
    if (modalMontarOverlay) modalMontarOverlay.classList.remove('open');
  }

  function goToStep(n) {
    wizard.step = n;
    document.querySelectorAll('.wstep').forEach(function (el) {
      el.classList.toggle('active', Number(el.dataset.step) === n);
    });
    document.querySelectorAll('[data-progress-step]').forEach(function (el) {
      var s = Number(el.dataset.progressStep);
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
    if (n === 2) renderStep2();
  }

  // ---------------- Passo 1: dia + caminhão ----------------
  function renderStep1() {
    if (montarDayTabsEl) {
      montarDayTabsEl.innerHTML = DAYS.map(function (d) {
        var pendentes = CargasStore.solicitacoesDisponiveis(d, wizard.editingId).length;
        return '<div class="day-tab' + (d === wizard.dia ? ' active' : '') + '" data-day="' + d + '">' + d + ' <span class="n">' + pendentes + '</span></div>';
      }).join('');
      montarDayTabsEl.querySelectorAll('[data-day]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          wizard.dia = tab.dataset.day;
          wizard.selected = {};
          renderStep1();
        });
      });
    }

    FrotaService.listarCaminhoes().then(function (lista) {
      wizard.trucksCache = lista;
      var emUso = CargasStore.caminhoesEmUsoMontagem(wizard.editingId);

      if (!lista.length) {
        truckSelectGridEl.innerHTML = '<div class="truck-empty">Nenhum caminhão cadastrado. Cadastre um em "Caminhões".</div>';
        return;
      }

      truckSelectGridEl.innerHTML = lista.map(function (c) {
        var indisponivel = c.status !== 'disponivel' || emUso[c.id];
        var selected = wizard.caminhaoId === c.id;
        var classes = 'truck-card' + (selected ? ' selected' : '') + ((indisponivel && !selected) ? ' disabled' : '');
        var statusTxt = selected ? 'Selecionado' : (emUso[c.id] ? 'Em uso em outra carga' : FrotaService.statusLabel(c.status));
        return '' +
          '<div class="' + classes + '" data-caminhao="' + c.id + '" data-label="' + c.id + ' — ' + c.modelo + '" data-capacidade="' + c.capacidade + '">' +
            '<div class="tc-id">' + c.id + '</div>' +
            '<div class="tc-modelo">' + c.modelo + '</div>' +
            '<div class="tc-cap">' + c.capacidade.toLocaleString('pt-BR') + ' kg · ' + statusTxt + '</div>' +
          '</div>';
      }).join('');

      truckSelectGridEl.querySelectorAll('.truck-card').forEach(function (card) {
        card.addEventListener('click', function () {
          if (card.classList.contains('disabled')) return;
          wizard.caminhaoId = card.dataset.caminhao;
          wizard.caminhaoLabel = card.dataset.label;
          wizard.capacidade = Number(card.dataset.capacidade);
          renderStep1();
          if (btnAvancarMontar) btnAvancarMontar.disabled = false;
        });
      });

      if (btnAvancarMontar) btnAvancarMontar.disabled = !wizard.caminhaoId;
    });
  }

  if (btnAvancarMontar) {
    btnAvancarMontar.addEventListener('click', function () {
      if (!wizard.caminhaoId) return;
      goToStep(2);
    });
  }
  if (btnVoltarMontar) btnVoltarMontar.addEventListener('click', function () { goToStep(1); });

  // ---------------- Passo 2: solicitações ----------------
  function preSelecionarPorRegiao(itens) {
    if (Object.keys(wizard.selected).length) return;
    if (!itens.length) return;

    var pesoPorZona = {};
    itens.forEach(function (it) { pesoPorZona[it.zona] = (pesoPorZona[it.zona] || 0) + 1; });
    var zonaDominante = Object.keys(pesoPorZona).sort(function (a, b) { return pesoPorZona[b] - pesoPorZona[a]; })[0];

    var candidatos = itens.filter(function (it) { return it.zona === zonaDominante; })
      .sort(function (a, b) { return a.peso - b.peso; });

    var pesoAtual = 0;
    candidatos.forEach(function (it) {
      if (pesoAtual + it.peso <= wizard.capacidade) {
        wizard.selected[it.id] = true;
        pesoAtual += it.peso;
      }
    });
  }

  function renderMontarItem(it) {
    var checked = !!wizard.selected[it.id];
    return '' +
      '<label class="montar-item' + (checked ? ' checked' : '') + '" data-item="' + it.id + '">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') + '>' +
        '<div class="mi-left">' +
          '<div class="mi-cliente">' + it.cliente + '</div>' +
          '<div class="mi-id">' + it.id + ' · <span class="mi-zona">' + it.zona + '</span></div>' +
        '</div>' +
        '<div class="mi-peso">' + it.peso + 'kg</div>' +
      '</label>';
  }

  function renderStep2() {
    if (montarStep2SubEl) {
      montarStep2SubEl.textContent = 'Dia ' + wizard.dia + ' · ' + wizard.caminhaoLabel + ' (' + wizard.capacidade.toLocaleString('pt-BR') + ' kg). Itens da mesma região são pré-selecionados.';
    }

    var itens = CargasStore.solicitacoesDisponiveis(wizard.dia, wizard.editingId);
    preSelecionarPorRegiao(itens);

    var coletas = itens.filter(function (it) { return it.tipo === 'coleta'; });
    var entregas = itens.filter(function (it) { return it.tipo === 'entrega'; });

    montarPoolColetaEl.innerHTML = coletas.length ? coletas.map(renderMontarItem).join('') : '<div class="montar-pool-empty">Nenhuma coleta livre neste dia.</div>';
    montarPoolEntregaEl.innerHTML = entregas.length ? entregas.map(renderMontarItem).join('') : '<div class="montar-pool-empty">Nenhuma entrega livre neste dia.</div>';
    montarCountColetaEl.textContent = coletas.length;
    montarCountEntregaEl.textContent = entregas.length;

    document.querySelectorAll('#modalMontarOverlay .montar-item').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var id = row.dataset.item;
        wizard.selected[id] = !wizard.selected[id];
        renderStep2();
      });
    });

    atualizarResumoMontagem(itens);
  }

  function atualizarResumoMontagem(itens) {
    var selecionados = itens.filter(function (it) { return wizard.selected[it.id]; });
    var peso = selecionados.reduce(function (s, it) { return s + it.peso; }, 0);
    var over = peso > wizard.capacidade;

    montarSummaryEl.classList.toggle('over', over);
    montarSummaryEl.innerHTML = '' +
      '<span><strong>' + selecionados.length + '</strong> solicitações selecionadas</span>' +
      '<span><strong>' + peso + 'kg</strong> de ' + wizard.capacidade.toLocaleString('pt-BR') + 'kg de capacidade' + (over ? ' — acima do limite' : '') + '</span>';

    if (montarWarningsEl) {
      var zonas = {};
      selecionados.forEach(function (it) { zonas[it.zona] = true; });
      var zonasList = Object.keys(zonas);
      var mixedZones = zonasList.length > 1;

      montarWarningsEl.innerHTML = mixedZones
        ? '<div class="sugg-warning">⚠ Zonas diferentes nesta carga: ' + zonasList.join(', ') + '. Confirme antes de gerar a rota.</div>'
        : '';
    }

    if (btnConcluirMontar) btnConcluirMontar.disabled = !selecionados.length;
  }

  if (btnConcluirMontar) {
    btnConcluirMontar.addEventListener('click', function () {
      var ids = Object.keys(wizard.selected).filter(function (id) { return wizard.selected[id]; });
      if (!ids.length) return;

      var peso = ids.map(solById).filter(Boolean).reduce(function (s, it) { return s + it.peso; }, 0);

      function concluir() {
        if (wizard.editingId) {
          CargasStore.atualizar(wizard.editingId, { caminhaoId: wizard.caminhaoId, caminhaoLabel: wizard.caminhaoLabel, itemIds: ids });
        } else {
          CargasStore.criar({ dia: wizard.dia, caminhaoId: wizard.caminhaoId, caminhaoLabel: wizard.caminhaoLabel, itemIds: ids });
        }

        fecharWizard();
        renderGrid();
        UI.toast('Carga montada com sucesso!');
      }

      if (peso > wizard.capacidade) {
        UI.confirmar({
          title: 'Peso acima da capacidade',
          message: 'O peso selecionado (' + peso + 'kg) está acima da capacidade do caminhão (' + wizard.capacidade + 'kg). Concluir mesmo assim?',
          confirmLabel: 'Concluir mesmo assim',
          tone: 'danger'
        }).then(function (ok) {
          if (ok) concluir();
        });
      } else {
        concluir();
      }
    });
  }

  if (btnMontarCarga) btnMontarCarga.addEventListener('click', function () { abrirWizard(null); });
  if (fecharModalMontarBtn) fecharModalMontarBtn.addEventListener('click', fecharWizard);
  Utils.ligarFechamentoModal(modalMontarOverlay, fecharWizard);

  // =================================================================
  // Modal: Editar carga
  // =================================================================
  var modalEditarOverlay = document.getElementById('modalEditarOverlay');
  var fecharModalEditarBtn = document.getElementById('fecharModalEditar');
  var btnCancelarEditar = document.getElementById('btnCancelarEditar');
  var btnSalvarEditar = document.getElementById('btnSalvarEditar');
  var editarTituloEl = document.getElementById('editarTitulo');
  var editarSubEl = document.getElementById('editarSub');
  var editarCaminhaoSelectEl = document.getElementById('editarCaminhaoSelect');
  var editarSummaryEl = document.getElementById('editarSummary');
  var editarWarningsEl = document.getElementById('editarWarnings');
  var editarPoolColetaEl = document.getElementById('editarPoolColeta');
  var editarPoolEntregaEl = document.getElementById('editarPoolEntrega');
  var editarCountColetaEl = document.getElementById('editarCountColeta');
  var editarCountEntregaEl = document.getElementById('editarCountEntrega');

  var editState = { cargaId: null, dia: null, caminhaoId: null, caminhaoLabel: null, capacidade: 0, selected: {} };

  function abrirEdicao(carga) {
    editState = {
      cargaId: carga.id,
      dia: carga.dia,
      caminhaoId: carga.caminhaoId,
      caminhaoLabel: carga.caminhaoLabel,
      capacidade: 0,
      selected: {}
    };
    carga.itemIds.forEach(function (id) { editState.selected[id] = true; });

    if (editarTituloEl) editarTituloEl.textContent = 'Editar carga ' + carga.id;
    if (editarSubEl) editarSubEl.textContent = 'Dia ' + carga.dia + ' · ajuste o caminhão ou as solicitações desta carga.';

    if (modalEditarOverlay) modalEditarOverlay.classList.add('open');
    renderEditarCaminhaoSelect();
  }

  function fecharEdicao() {
    if (modalEditarOverlay) modalEditarOverlay.classList.remove('open');
  }

  function renderEditarCaminhaoSelect() {
    if (!editarCaminhaoSelectEl) return;
    FrotaService.listarCaminhoes().then(function (lista) {
      var emUso = CargasStore.caminhoesEmUsoMontagem(editState.cargaId);

      editarCaminhaoSelectEl.innerHTML = lista.map(function (c) {
        var indisponivel = c.status !== 'disponivel' || emUso[c.id];
        var ehAtual = c.id === editState.caminhaoId;
        var statusTxt = ehAtual ? 'atual' : (indisponivel ? 'indisponível' : FrotaService.statusLabel(c.status));
        return '<option value="' + c.id + '" data-label="' + c.id + ' — ' + c.modelo + '" data-capacidade="' + c.capacidade + '"' +
          ((indisponivel && !ehAtual) ? ' disabled' : '') +
          (ehAtual ? ' selected' : '') + '>' +
          c.id + ' — ' + c.modelo + ' · ' + c.capacidade.toLocaleString('pt-BR') + ' kg (' + statusTxt + ')' +
        '</option>';
      }).join('');

      var opt = editarCaminhaoSelectEl.options[editarCaminhaoSelectEl.selectedIndex];
      if (opt) {
        editState.caminhaoId = opt.value;
        editState.caminhaoLabel = opt.dataset.label;
        editState.capacidade = Number(opt.dataset.capacidade);
      }
      renderEditarItens();
    });
  }

  if (editarCaminhaoSelectEl) {
    editarCaminhaoSelectEl.addEventListener('change', function () {
      var opt = editarCaminhaoSelectEl.options[editarCaminhaoSelectEl.selectedIndex];
      if (!opt) return;
      editState.caminhaoId = opt.value;
      editState.caminhaoLabel = opt.dataset.label;
      editState.capacidade = Number(opt.dataset.capacidade);
      renderEditarItens();
    });
  }

  function renderEditarItens() {
    var itens = CargasStore.solicitacoesDisponiveis(editState.dia, editState.cargaId);
    var coletas = itens.filter(function (it) { return it.tipo === 'coleta'; });
    var entregas = itens.filter(function (it) { return it.tipo === 'entrega'; });

    if (editarPoolColetaEl) editarPoolColetaEl.innerHTML = coletas.length ? coletas.map(renderMontarItemEditar).join('') : '<div class="montar-pool-empty">Nenhuma coleta livre neste dia.</div>';
    if (editarPoolEntregaEl) editarPoolEntregaEl.innerHTML = entregas.length ? entregas.map(renderMontarItemEditar).join('') : '<div class="montar-pool-empty">Nenhuma entrega livre neste dia.</div>';
    if (editarCountColetaEl) editarCountColetaEl.textContent = coletas.length;
    if (editarCountEntregaEl) editarCountEntregaEl.textContent = entregas.length;

    document.querySelectorAll('#modalEditarOverlay .montar-item').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var id = row.dataset.item;
        editState.selected[id] = !editState.selected[id];
        renderEditarItens();
      });
    });

    atualizarResumoEditar(itens);
  }

  function renderMontarItemEditar(it) {
    var checked = !!editState.selected[it.id];
    return '' +
      '<label class="montar-item' + (checked ? ' checked' : '') + '" data-item="' + it.id + '">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') + '>' +
        '<div class="mi-left">' +
          '<div class="mi-cliente">' + it.cliente + '</div>' +
          '<div class="mi-id">' + it.id + ' · <span class="mi-zona">' + it.zona + '</span></div>' +
        '</div>' +
        '<div class="mi-peso">' + it.peso + 'kg</div>' +
      '</label>';
  }

  function atualizarResumoEditar(itens) {
    var selecionados = itens.filter(function (it) { return editState.selected[it.id]; });
    var peso = selecionados.reduce(function (s, it) { return s + it.peso; }, 0);
    var over = peso > editState.capacidade;

    if (editarSummaryEl) {
      editarSummaryEl.classList.toggle('over', over);
      editarSummaryEl.innerHTML = '' +
        '<span><strong>' + selecionados.length + '</strong> solicitações selecionadas</span>' +
        '<span><strong>' + peso + 'kg</strong> de ' + editState.capacidade.toLocaleString('pt-BR') + 'kg de capacidade' + (over ? ' — acima do limite' : '') + '</span>';
    }

    if (editarWarningsEl) {
      var zonas = {};
      selecionados.forEach(function (it) { zonas[it.zona] = true; });
      var zonasList = Object.keys(zonas);
      editarWarningsEl.innerHTML = zonasList.length > 1
        ? '<div class="sugg-warning">⚠ Zonas diferentes nesta carga: ' + zonasList.join(', ') + '. Confirme antes de gerar a rota.</div>'
        : '';
    }

    if (btnSalvarEditar) btnSalvarEditar.disabled = !selecionados.length;
  }

  if (btnSalvarEditar) {
    btnSalvarEditar.addEventListener('click', function () {
      var ids = Object.keys(editState.selected).filter(function (id) { return editState.selected[id]; });
      if (!ids.length) return;

      var peso = ids.map(solById).filter(Boolean).reduce(function (s, it) { return s + it.peso; }, 0);

      function salvar() {
        CargasStore.atualizar(editState.cargaId, { caminhaoId: editState.caminhaoId, caminhaoLabel: editState.caminhaoLabel, itemIds: ids });
        fecharEdicao();
        renderGrid();
        UI.toast('Carga atualizada com sucesso!');
      }

      if (peso > editState.capacidade) {
        UI.confirmar({
          title: 'Peso acima da capacidade',
          message: 'O peso selecionado (' + peso + 'kg) está acima da capacidade do caminhão (' + editState.capacidade + 'kg). Salvar mesmo assim?',
          confirmLabel: 'Salvar mesmo assim',
          tone: 'danger'
        }).then(function (ok) {
          if (ok) salvar();
        });
      } else {
        salvar();
      }
    });
  }

  if (fecharModalEditarBtn) fecharModalEditarBtn.addEventListener('click', fecharEdicao);
  if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', fecharEdicao);
  Utils.ligarFechamentoModal(modalEditarOverlay, fecharEdicao);

  // =================================================================
  // Eventos dos filtros
  // =================================================================
  filterChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      filterChips.forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderGrid();
    });
  });

  if (filterDataSelect) {
    filterDataSelect.addEventListener('change', function() {
      currentDataFilter = this.value;
      if (currentDataFilter !== 'all') {
        filterChips.forEach(function(c) { c.classList.remove('active'); });
        document.querySelector('#filterToolbarCargas .chip[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
      }
      renderGrid();
    });
  }

  if (limparDataBtn) {
    limparDataBtn.addEventListener('click', function() {
      if (filterDataSelect) {
        filterDataSelect.value = 'all';
        currentDataFilter = 'all';
        renderGrid();
      }
    });
  }

  // =================================================================
  // Inicializar
  // =================================================================
  renderGrid();
})();