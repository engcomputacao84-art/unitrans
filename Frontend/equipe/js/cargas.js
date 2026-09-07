(function () {
  var tabelaEl = document.getElementById('cargasTabela');
  if (!tabelaEl) return;

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

  var PENCIL_ICON = '<i class="fas fa-edit"></i>';
  var TRASH_ICON = '<i class="fas fa-trash-alt"></i>';
  var ROUTE_ICON = '<i class="fas fa-route"></i>';
  var VIEW_ICON = '<i class="fas fa-external-link-alt"></i>';
  var CHEVRON_ICON = '<i class="fas fa-chevron-right"></i>';

  var DAYS = ['25/08', '26/08', '27/08'];

  // Referências dos filtros
  var filterChips = document.querySelectorAll('#filterToolbarCargas .chip');
  var filterDataSelect = document.getElementById('filterDataCargas');
  var limparDataBtn = document.getElementById('limparDataCargas');
  var resumoEl = document.getElementById('cargasResumo');

  // Estado dos filtros
  var currentFilter = 'all';
  var currentDataFilter = 'all';

  // Estado das linhas expandidas (dropdown) da listagem
  var openRows = {};

  // Cache de capacidade dos caminhões (para a coluna Usado/Capacidade)
  var caminhoesCache = {};
  function carregarCaminhoesCache() {
    return FrotaService.listarCaminhoes().then(function (lista) {
      lista.forEach(function (c) { caminhoesCache[c.id] = c; });
    });
  }

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
  // Listagem (tabela com dropdown)
  // =================================================================
  function computeResumo(carga) {
    var itens = (carga.itemIds || []).map(solById).filter(Boolean);
    var zonas = {};
    itens.forEach(function (it) { zonas[it.zona] = true; });

    var resumo = {
      regiao: Object.keys(zonas).join(' / ') || '—',
      solicitacoes: itens.length,
      peso: itens.reduce(function (s, it) { return s + it.peso; }, 0),
      coletas: itens.filter(function (it) { return it.tipo === 'coleta'; }).length,
      entregas: itens.filter(function (it) { return it.tipo === 'entrega'; }).length,
      itens: itens
    };

    // Cargas antigas (já em rota) que só têm um resumo legado, sem itens detalhados
    if (carga.legacySummary && !itens.length) {
      resumo.regiao = carga.legacySummary.regiao;
      resumo.solicitacoes = carga.legacySummary.solicitacoes;
      resumo.peso = carga.legacySummary.peso;
      resumo.coletas = carga.legacySummary.coletas;
      resumo.entregas = carga.legacySummary.entregas;
    }

    return resumo;
  }

  function capacidadeDoCaminhao(caminhaoId) {
    var c = caminhoesCache[caminhaoId];
    return c ? c.capacidade : null;
  }

  function formatUso(peso, capacidade) {
    var pesoTxt = peso.toLocaleString('pt-BR') + ' kg';
    if (!capacidade) return pesoTxt;
    return pesoTxt + ' / ' + capacidade.toLocaleString('pt-BR') + ' kg';
  }

  function renderLinhaCarga(carga) {
    var resumo = computeResumo(carga);
    var capacidade = capacidadeDoCaminhao(carga.caminhaoId);
    var over = capacidade ? resumo.peso > capacidade : false;
    var usoTxt = formatUso(resumo.peso, capacidade);
    var isRota = carga.status === 'rota';
    var isOpen = !!openRows[carga.id];

    var statusBadge = isRota
      ? '<span class="badge b-rota">Em rota</span>'
      : '<span class="badge b-carga">Em montagem</span>';

    var acoes = '<div class="row-actions">';
    if (!isRota && resumo.solicitacoes) {
      acoes += '<button class="icon-btn approve btn-rota-carga" data-id="' + carga.id + '" title="Gerar rota">' + ROUTE_ICON + '</button>';
    }
    if (isRota) {
      acoes += '<button class="icon-btn btn-ver-rota" data-rota="' + carga.rotaId + '" title="Ver rota vinculada">' + VIEW_ICON + '</button>';
    }
    acoes += '<button class="icon-btn btn-editar-carga' + (isRota ? ' disabled' : '') + '" data-id="' + carga.id + '" title="' + (isRota ? 'Carga já está em rota' : 'Editar carga') + '">' + PENCIL_ICON + '</button>';
    acoes += '<button class="icon-btn reject btn-excluir-carga' + (isRota ? ' disabled' : '') + '" data-id="' + carga.id + '" title="' + (isRota ? 'Carga já está em rota' : 'Excluir carga') + '">' + TRASH_ICON + '</button>';
    acoes += '</div>';

    var linhaPrincipal = '' +
      '<tr class="carga-row" data-carga="' + carga.id + '">' +
        '<td><button class="icon-btn btn-toggle-carga' + (isOpen ? ' open' : '') + '" data-toggle="' + carga.id + '" title="Ver solicitações">' + CHEVRON_ICON + '</button></td>' +
        '<td class="cell-strong">Carga ' + carga.id + '<div class="cell-sub">' + resumo.regiao + '</div></td>' +
        '<td>' + carga.dia + '</td>' +
        '<td class="mono">' + carga.caminhaoId + '</td>' +
        '<td>' + (carga.motoristaLabel || '<span class="cell-sub">A definir</span>') + '</td>' +
        '<td><span class="badge uso-pill ' + (over ? 'b-manutencao' : 'b-disponivel') + '">' + usoTxt + '</span></td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + acoes + '</td>' +
      '</tr>';

    var linhaDropdown = '' +
      '<tr class="carga-sub-row' + (isOpen ? '' : ' hidden') + '" data-sub="' + carga.id + '">' +
        '<td colspan="9">' +
          '<div class="sub-table-wrap">' + renderSubTabela(carga, resumo, usoTxt) + '</div>' +
        '</td>' +
      '</tr>';

    return linhaPrincipal + linhaDropdown;
  }

  function renderSubTabela(carga, resumo, usoTxt) {
    if (!resumo.itens.length) {
      return '<div class="sub-table-empty">Nenhuma solicitação detalhada para esta carga.</div>';
    }

    var linhas = resumo.itens.map(function (it) {
      var tipoTxt = it.tipo === 'coleta'
        ? '<span class="tag-coleta"><i class="fas fa-arrow-up"></i> Coleta</span>'
        : '<span class="tag-entrega"><i class="fas fa-arrow-down"></i> Entrega</span>';
      return '' +
        '<tr>' +
          '<td class="mono">' + it.id + '</td>' +
          '<td>' + it.cliente + '</td>' +
          '<td>' + (carga.motoristaLabel || '<span class="cell-sub">A definir</span>') + '</td>' +
          '<td>' + it.endereco + '</td>' +
          '<td>' + tipoTxt + '</td>' +
        '</tr>';
    }).join('');

    return '' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>Solicitação</th>' +
            '<th>Cliente</th>' +
            '<th>Motorista</th>' +
            '<th>Endereço</th>' +
            '<th>Tipo</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + linhas + '</tbody>' +
      '</table>';
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

  function renderTabela() {
    var cargas = CargasStore.listar();

    // Aplicar filtros
    var cargasFiltradas = cargas.filter(function(carga) {
      if (currentFilter === 'montagem' && carga.status !== 'montagem') return false;
      if (currentFilter === 'rota' && carga.status !== 'rota') return false;
      if (currentDataFilter !== 'all' && carga.dia !== currentDataFilter) return false;
      return true;
    });

    atualizarContagens(cargas);

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

    tabelaEl.innerHTML = cargasFiltradas.length
      ? cargasFiltradas.map(renderLinhaCarga).join('')
      : '<tr><td colspan="9" style="text-align:center;color:var(--ink-faint);">Nenhuma carga encontrada com os filtros selecionados.</td></tr>';

    bindTabelaEvents();
  }

  function bindTabelaEvents() {
    // Dropdown: expandir/recolher solicitações da carga
    tabelaEl.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.toggle;
        openRows[id] = !openRows[id];
        renderTabela();
      });
    });

    tabelaEl.querySelectorAll('.carga-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        var id = row.dataset.carga;
        openRows[id] = !openRows[id];
        renderTabela();
      });
    });

    tabelaEl.querySelectorAll('[data-rota]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = 'rotas.html?rota=' + encodeURIComponent(btn.dataset.rota);
      });
    });

    tabelaEl.querySelectorAll('.btn-editar-carga').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.classList.contains('disabled')) return;
        var carga = CargasStore.obter(btn.dataset.id);
        if (carga) abrirEdicao(carga);
      });
    });

    tabelaEl.querySelectorAll('.btn-excluir-carga').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.classList.contains('disabled')) return;
        var cargaId = btn.dataset.id;
        UI.confirmar({
          title: 'Excluir carga',
          message: 'Excluir a carga ' + cargaId + '? As solicitações voltam a ficar disponíveis para entrar em outra carga.',
          confirmLabel: 'Excluir',
          tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          CargasStore.excluir(cargaId);
          delete openRows[cargaId];
          renderTabela();
          UI.toast('Carga ' + cargaId + ' excluída com sucesso!');
        });
      });
    });

    tabelaEl.querySelectorAll('.btn-rota-carga').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var carga = CargasStore.obter(btn.dataset.id);
        if (!carga) return;
        abrirModalAtribuicao(carga, function (motoristaId, motoristaLabel) {
          var rotaId = 'RT-' + Math.floor(1000 + Math.random() * 9000);
          CargasStore.marcarEmRota(carga.id, motoristaId, motoristaLabel, rotaId);
          FrotaService.atualizarStatusCaminhao(carga.caminhaoId, 'em_rota');
          FrotaService.atualizarStatusMotorista(motoristaId, 'em_rota');
          UI.toast('Rota ' + rotaId + ' gerada a partir da carga ' + carga.id + ', com ' + motoristaLabel + ' (' + carga.caminhaoLabel + '). Ela já pode ser ajustada na tela de Rotas.');
          renderTabela();
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
        renderTabela();
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
        renderTabela();
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
      renderTabela();
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
      renderTabela();
    });
  }

  if (limparDataBtn) {
    limparDataBtn.addEventListener('click', function() {
      if (filterDataSelect) {
        filterDataSelect.value = 'all';
        currentDataFilter = 'all';
        renderTabela();
      }
    });
  }

  // =================================================================
  // Inicializar
  // =================================================================
  carregarCaminhoesCache().then(renderTabela);
})();