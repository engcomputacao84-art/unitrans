(function () {
  var tableBody = document.getElementById('rotasTableBody');
  var resumoEl = document.getElementById('rotasResumo');
  var tituloEl = document.getElementById('rotaDetalheTitulo');
  var subEl = document.getElementById('rotaDetalheSub');
  var stopListEl = document.getElementById('stopList');
  var btnEditar = document.getElementById('btnEditarRota');
  var btnCancelar = document.getElementById('btnCancelarEdicaoRota');
  var btnSalvar = document.getElementById('btnSalvarEdicaoRota');
  var editSaveBar = document.getElementById('editSaveBar');
  var rotaModalOverlay = document.getElementById('rotaModalOverlay');
  var fecharRotaModalBtn = document.getElementById('fecharRotaModal');
  
  // Referências dos filtros
  var filterChips = document.querySelectorAll('#filterToolbarRotas .chip');
  var filterDataInput = document.getElementById('filterDataRotas');
  var limparDataBtn = document.getElementById('limparDataRotas');
  
  if (!tableBody || !stopListEl) return;

  var PENCIL_SVG = '<i class="fas fa-edit"></i>';
  var TRASH_SVG = '<i class="fas fa-trash-alt"></i>';
  var EYE_SVG = '<i class="fas fa-eye"></i>';

  // ---------------------------------------------------------------
  // Modal: sequência de paradas (abre ao clicar no lápis da tabela)
  // ---------------------------------------------------------------
  function abrirRotaModal() {
    if (rotaModalOverlay) rotaModalOverlay.classList.add('open');
  }

  function fecharRotaModal() {
    if (editando) {
      UI.confirmar({
        title: 'Alterações não salvas',
        message: 'Você tem alterações não salvas nesta rota. Fechar e descartar?',
        confirmLabel: 'Descartar',
        tone: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        editando = false;
        modoVisualizacao = false;
        if (paradasAntesEdicao) paradasAtuais = paradasAntesEdicao;
        paradasAntesEdicao = null;
        horariosSlots = [];
        setEditUI(false);
        if (rotaModalOverlay) rotaModalOverlay.classList.remove('open');
      });
      return;
    }
    if (rotaModalOverlay) rotaModalOverlay.classList.remove('open');
  }

  if (fecharRotaModalBtn) fecharRotaModalBtn.addEventListener('click', fecharRotaModal);
  Utils.ligarFechamentoModal(rotaModalOverlay, fecharRotaModal);

  // =================================================================
  // CAMADA DE DADOS — RotasService
  // -----------------------------------------------------------------
  var RotasService = (function () {
    var ROTAS = [
      { id: 'RT-0512', motorista: 'Carlos Menezes', veiculo: 'Fiorino DVX-3A21', cargaId: 'C-0510', status: 'andamento', data: '2026-08-25' },
      { id: 'RT-0513', motorista: 'Josiane Ferreira', veiculo: 'DVX-8F02', cargaId: 'C-0508', status: 'concluida', data: '2026-08-24' },
      { id: 'RT-0514', motorista: 'Paulo Ricardo', veiculo: 'DVX-1C77', cargaId: 'C-0509', status: 'pendente', data: '2026-08-26' },
      { id: 'RT-0515', motorista: 'Carlos Menezes', veiculo: 'DVX-3A21', cargaId: 'C-0511', status: 'andamento', data: '2026-08-25' },
      { id: 'RT-0516', motorista: 'Josiane Ferreira', veiculo: 'DVX-8F02', cargaId: 'C-0512', status: 'pendente', data: '2026-08-27' }
    ];

    var STATUS_LABEL = {
      andamento: { cls: 'b-andamento', label: 'Em andamento' },
      concluida: { cls: 'b-concluida', label: 'Concluída' },
      pendente: { cls: 'b-pendente', label: 'Não iniciada' }
    };

    var PARADAS = {
      'RT-0512': [
        { id: 'p1', endereco: 'Av. Prestes Maia, 1840', cliente: 'Metalúrgica Rio Preto', tipo: 'Coleta', hora: '08:10', done: true },
        { id: 'p2', endereco: 'Rua Amazonas, 522', cliente: 'Farmácia Bem-Estar', tipo: 'Entrega', hora: '08:35', done: true },
        { id: 'p3', endereco: 'Av. Onze de Agosto, 2140', cliente: 'Clínica VidaPlus', tipo: 'Entrega', hora: '09:05', done: true },
        { id: 'p4', endereco: 'Rua Bahia, 355', cliente: 'Confecções Del Rio', tipo: 'Coleta', hora: '09:40', done: false },
        { id: 'p5', endereco: 'Av. Tancredo Neves, 980', cliente: 'Auto Peças Votupeças', tipo: 'Coleta', hora: '10:15', done: false },
        { id: 'p6', endereco: 'Rua Ceará, 88', cliente: 'Loja Casa & Cia', tipo: 'Entrega', hora: '10:50', done: false },
        { id: 'p7', endereco: 'Rod. Euclides da Cunha, km 431', cliente: 'Distribuidora Noroeste', tipo: 'Coleta', hora: '11:30', done: false },
        { id: 'p8', endereco: 'Rua Bahia, 300', cliente: 'Supermercado Compre Bem', tipo: 'Entrega', hora: '12:05', done: false }
      ],
      'RT-0513': [
        { id: 'p1', endereco: 'Av. Alberto Andaló, 3050', cliente: 'Auto Center Norte', tipo: 'Coleta', hora: '07:40', done: true },
        { id: 'p2', endereco: 'Rua Voluntário Salles, 900', cliente: 'Farmácia Popular', tipo: 'Entrega', hora: '08:10', done: true },
        { id: 'p3', endereco: 'Av. Sete de Setembro, 512', cliente: 'Distribuidora Sul', tipo: 'Entrega', hora: '08:45', done: true },
        { id: 'p4', endereco: 'Rua Piauí, 210', cliente: 'Padaria Trigo Dourado', tipo: 'Coleta', hora: '09:15', done: true },
        { id: 'p5', endereco: 'Rua Piratininga, 190', cliente: 'Mercado São José', tipo: 'Entrega', hora: '09:50', done: true },
        { id: 'p6', endereco: 'Av. Bady Bassitt, 1200', cliente: 'Ótica Visão Clara', tipo: 'Entrega', hora: '10:20', done: true }
      ],
      'RT-0514': [
        { id: 'p1', endereco: 'Rua Pernambuco, 77', cliente: 'Papelaria Escreva Bem', tipo: 'Coleta', hora: '08:00', done: false },
        { id: 'p2', endereco: 'Rod. Washington Luís, km 5', cliente: 'Depósito Constrular', tipo: 'Entrega', hora: '08:40', done: false },
        { id: 'p3', endereco: 'Rua Amazonas, 700', cliente: 'Loja Moda Jovem', tipo: 'Coleta', hora: '09:10', done: false },
        { id: 'p4', endereco: 'Av. Alberto Andaló, 4100', cliente: 'Distribuidora Rio Preto Alimentos', tipo: 'Coleta', hora: '09:45', done: false },
        { id: 'p5', endereco: 'Av. Bady Bassitt, 1500', cliente: 'Clínica Odontológica Sorriso', tipo: 'Entrega', hora: '10:20', done: false },
        { id: 'p6', endereco: 'Rua Ceará, 400', cliente: 'Livraria Página Um', tipo: 'Entrega', hora: '10:55', done: false },
        { id: 'p7', endereco: 'Av. Presidente Vargas, 88', cliente: 'Salão Beleza Rio', tipo: 'Entrega', hora: '11:30', done: false }
      ],
      'RT-0515': [
        { id: 'p1', endereco: 'Av. Juscelino Kubitschek, 220', cliente: 'Restaurante Sabor Caseiro', tipo: 'Coleta', hora: '08:05', done: true },
        { id: 'p2', endereco: 'Rua Marechal Deodoro, 640', cliente: 'Loja Utilidades Lar', tipo: 'Entrega', hora: '08:35', done: true },
        { id: 'p3', endereco: 'Av. Philadelpho Gouvêa Netto, 1900', cliente: 'Pet Shop Amigo Fiel', tipo: 'Entrega', hora: '09:10', done: false },
        { id: 'p4', endereco: 'Rua São Paulo, 310', cliente: 'Ótica Novo Olhar', tipo: 'Coleta', hora: '09:45', done: false },
        { id: 'p5', endereco: 'Av. Danilo Galeazzi, 1500', cliente: 'Mercearia Boa Vista', tipo: 'Entrega', hora: '10:15', done: false }
      ],
      'RT-0516': [
        { id: 'p1', endereco: 'Av. Alberto Andaló, 2900', cliente: 'Loja Modas Elegance', tipo: 'Coleta', hora: '08:00', done: false },
        { id: 'p2', endereco: 'Rua Bahia, 522', cliente: 'Distribuidora Center Norte', tipo: 'Coleta', hora: '08:35', done: false },
        { id: 'p3', endereco: 'Rua Amazonas, 970', cliente: 'Farmácia Vida', tipo: 'Entrega', hora: '09:05', done: false },
        { id: 'p4', endereco: 'Av. Philadelpho Gouvêa Netto, 700', cliente: 'Auto Peças Rio Preto', tipo: 'Coleta', hora: '09:40', done: false },
        { id: 'p5', endereco: 'Rua Ceará, 210', cliente: 'Confecções Bella', tipo: 'Entrega', hora: '10:15', done: false },
        { id: 'p6', endereco: 'Av. Tancredo Neves, 1500', cliente: 'Papelaria Central', tipo: 'Entrega', hora: '10:50', done: false },
        { id: 'p7', endereco: 'Rod. Euclides da Cunha, km 420', cliente: 'Transportadora Vale Verde', tipo: 'Coleta', hora: '11:25', done: false },
        { id: 'p8', endereco: 'Rua Piauí, 88', cliente: 'Mercadinho São Jorge', tipo: 'Entrega', hora: '12:00', done: false }
      ]
    };

    function delay(value, ms) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(value); }, ms || 200);
      });
    }

    function formatarData(dataStr) {
      if (!dataStr) return '—';
      var partes = dataStr.split('-');
      if (partes.length === 3) {
        return partes[2] + '/' + partes[1] + '/' + partes[0];
      }
      return dataStr;
    }

    return {
      listar: function () {
        return delay(ROTAS.map(function (r) {
          return {
            id: r.id, 
            motorista: r.motorista, 
            veiculo: r.veiculo, 
            cargaId: r.cargaId,
            status: r.status, 
            statusInfo: STATUS_LABEL[r.status], 
            data: r.data,
            dataFormatada: formatarData(r.data),
            paradas: (PARADAS[r.id] || []).length
          };
        }), 150);
      },

      listarParadas: function (rotaId) {
        return delay(JSON.parse(JSON.stringify(PARADAS[rotaId] || [])), 150);
      },

      salvarParadas: function (rotaId, novasParadas) {
        PARADAS[rotaId] = novasParadas;
        return delay({ ok: true }, 250);
      },

      excluir: function (rotaId) {
        var rota = null;
        for (var i = 0; i < ROTAS.length; i++) {
          if (ROTAS[i].id === rotaId) { rota = ROTAS[i]; ROTAS.splice(i, 1); break; }
        }
        delete PARADAS[rotaId];
        return delay({ ok: true, cargaId: rota ? rota.cargaId : null }, 250);
      }
    };
  })();

  // ---------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------
  var rotas = [];
  var rotaAtualId = null;
  var paradasAtuais = [];
  var paradasAntesEdicao = null;
  var editando = false;
  var draggedStopId = null;
  var modoVisualizacao = false;
  var rotaEditavelAtual = false;
  var currentFilter = 'all';
  var currentDataFilter = ''; // string vazia = sem filtro de data
  var horariosSlots = []; // horários "de posição": ao reordenar, a parada assume o horário da posição para onde foi movida

  function podeEditarRota(rota) {
    return !!rota && rota.status === 'pendente';
  }

  function rotaById(id) {
    for (var i = 0; i < rotas.length; i++) if (rotas[i].id === id) return rotas[i];
    return null;
  }

  // ---------------------------------------------------------------
  // Filtrar rotas
  // ---------------------------------------------------------------
  function filtrarRotas(rotasLista, filtroStatus, filtroData) {
    var resultado = rotasLista;
    
    // Filtro por status
    if (filtroStatus !== 'all') {
      resultado = resultado.filter(function(r) { return r.status === filtroStatus; });
    }
    
    // Filtro por data
    if (filtroData) {
      resultado = resultado.filter(function(r) { return r.data === filtroData; });
    }
    
    return resultado;
  }

  // ---------------------------------------------------------------
  // Carregamento inicial
  // ---------------------------------------------------------------
  function init() {
    RotasService.listar().then(function (lista) {
      rotas = lista;
      var params = new URLSearchParams(window.location.search);
      var pedida = params.get('rota');
      renderTabela();
      if (pedida && rotaById(pedida)) {
        selecionarRota(pedida);
        abrirRotaModal();
      }
    });
  }

  // ---------------------------------------------------------------
  // Tabela de rotas
  // ---------------------------------------------------------------
  function renderTabela() {
    var rotasFiltradas = filtrarRotas(rotas, currentFilter, currentDataFilter);
    
    atualizarContagens();
    
    if (resumoEl) {
      var hoje = new Date().toLocaleDateString('pt-BR');
      var filtroTexto = '';
      if (currentDataFilter) {
        var dataFormatada = currentDataFilter.split('-').reverse().join('/');
        filtroTexto = ' · Data: ' + dataFormatada;
      } else if (currentFilter !== 'all') {
        filtroTexto = ' (' + getFilterLabel() + ')';
      }
      resumoEl.textContent = hoje + ' — ' + rotasFiltradas.length + ' rotas' + filtroTexto;
    }

    tableBody.innerHTML = rotasFiltradas.map(function (r) {
      var selected = r.id === rotaAtualId ? ' style="background:#FAFAF8;"' : '';
      var editavel = podeEditarRota(r);
      return (
        '<tr' + selected + ' data-rota-row="' + r.id + '">' +
          '<td class="mono cell-strong">' + r.id + '</td>' +
          '<td>' + r.motorista + ' · <span class="mono">' + r.veiculo + '</span></td>' +
          '<td class="mono">' + r.cargaId + '</td>' +
          '<td class="mono">' + r.dataFormatada + '</td>' +
          '<td>' + r.paradas + '</td>' +
          '<td><span class="badge ' + r.statusInfo.cls + '">' + r.statusInfo.label + '</span></td>' +
          '<td>' +
            '<div class="row-actions">' +
              (editavel ?
                '<button class="icon-btn btn-editar-rota" data-rota="' + r.id + '" title="Editar rota">' + PENCIL_SVG + '</button>' +
                '<button class="icon-btn reject btn-excluir-rota" data-rota="' + r.id + '" title="Excluir rota">' + TRASH_SVG + '</button>'
                : '<button class="icon-btn btn-visualizar-rota" data-rota="' + r.id + '" title="Visualizar rota">' + EYE_SVG + '</button>') +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    tableBody.querySelectorAll('.btn-editar-rota').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var rotaId = btn.dataset.rota;
        selecionarRota(rotaId);
        abrirRotaModal();
      });
    });

    tableBody.querySelectorAll('.btn-excluir-rota').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var rotaId = btn.dataset.rota;
        excluirRota(rotaId);
      });
    });

    tableBody.querySelectorAll('.btn-visualizar-rota').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var rotaId = btn.dataset.rota;
        visualizarRota(rotaId);
        abrirRotaModal();
      });
    });
  }

  // ---------------------------------------------------------------
  // Atualizar contagens dos filtros
  // ---------------------------------------------------------------
  function atualizarContagens() {
    var total = rotas.length;
    var pendentes = rotas.filter(function(r) { return r.status === 'pendente'; }).length;
    var andamento = rotas.filter(function(r) { return r.status === 'andamento'; }).length;
    var concluidas = rotas.filter(function(r) { return r.status === 'concluida'; }).length;
    
    var countAll = document.getElementById('filterCountAllRotas');
    var countPendente = document.getElementById('filterCountPendenteRotas');
    var countAndamento = document.getElementById('filterCountAndamentoRotas');
    var countConcluida = document.getElementById('filterCountConcluidaRotas');
    
    if (countAll) countAll.textContent = total;
    if (countPendente) countPendente.textContent = pendentes;
    if (countAndamento) countAndamento.textContent = andamento;
    if (countConcluida) countConcluida.textContent = concluidas;
  }

  // ---------------------------------------------------------------
  // Obter label do filtro atual
  // ---------------------------------------------------------------
  function getFilterLabel() {
    var labels = {
      'all': 'Todas',
      'pendente': 'Não iniciadas',
      'andamento': 'Em andamento',
      'concluida': 'Concluídas'
    };
    return labels[currentFilter] || 'Todas';
  }

  // ---------------------------------------------------------------
  // Excluir rota
  // ---------------------------------------------------------------
  function excluirRota(rotaId) {
    var rota = rotaById(rotaId);
    var cargaId = rota ? rota.cargaId : null;
    UI.confirmar({
      title: 'Excluir rota',
      message: 'Excluir a rota ' + rotaId + '? A carga ' + (cargaId || '') + ' volta para a montagem, disponível para gerar uma nova rota.',
      confirmLabel: 'Excluir',
      tone: 'danger'
    }).then(function (ok) {
      if (!ok) return;

      RotasService.excluir(rotaId).then(function (res) {
        rotas = rotas.filter(function (r) { return r.id !== rotaId; });

        if (rotaAtualId === rotaId) {
          editando = false;
          modoVisualizacao = false;
          paradasAntesEdicao = null;
          rotaEditavelAtual = false;
          rotaAtualId = null;
          if (rotaModalOverlay) rotaModalOverlay.classList.remove('open');
        }

        renderTabela();
        UI.toast('Rota ' + rotaId + ' excluída. A carga ' + (res.cargaId || cargaId || '') + ' voltou para a montagem.');
      });
    });
  }

  // ---------------------------------------------------------------
  // Visualizar rota (modo "olho")
  // ---------------------------------------------------------------
  function visualizarRota(rotaId) {
    rotaAtualId = rotaId;
    editando = false;
    modoVisualizacao = true;
    paradasAntesEdicao = null;
    rotaEditavelAtual = false;
    setEditUI(false);
    renderTabela();

    var rota = rotaById(rotaId);
    if (tituloEl) tituloEl.innerHTML = '<i class="fas fa-eye"></i> ' + rotaId + ' · visualizando rota';
    if (subEl) subEl.textContent = rota ? (rota.motorista + ' · ' + rota.veiculo) : '';

    stopListEl.innerHTML = '<div class="pool-empty" style="padding:20px 0;">Carregando paradas…</div>';
    RotasService.listarParadas(rotaId).then(function (paradas) {
      paradasAtuais = paradas;
      renderParadasVisualizacao();
    });
  }

  // ---------------------------------------------------------------
  // Renderizar paradas em modo visualização (com setas)
  // ---------------------------------------------------------------
  function renderParadasVisualizacao() {
    if (!paradasAtuais.length) {
      stopListEl.innerHTML = '<div class="pool-empty" style="padding:20px 0;">Nenhuma parada nesta rota.</div>';
      return;
    }

    stopListEl.innerHTML = paradasAtuais.map(function (p, index) {
      var tipoIcon = p.tipo === 'Coleta' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';

      return (
        '<div class="stop stop-view-mode" data-stop="' + p.id + '" data-index="' + index + '">' +
          '<div class="stop-dot' + (p.done ? ' done' : '') + '"></div>' +
          '<div>' +
            '<div class="stop-addr">' + p.endereco + '</div>' +
            '<div class="stop-client">' + tipoIcon + ' ' + p.cliente + ' · ' + p.tipo + '</div>' +
          '</div>' +
          '<div class="stop-time">' +
            p.hora + (p.done ? ' <i class="fas fa-check" style="color:var(--success);margin-left:6px;"></i>' : ' <span style="color:var(--ink-faint);margin-left:6px;">prev.</span>') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // ---------------------------------------------------------------
  // Selecionar rota (modo normal)
  // ---------------------------------------------------------------
  function selecionarRota(rotaId) {
    rotaAtualId = rotaId;
    editando = false;
    modoVisualizacao = false;
    paradasAntesEdicao = null;

    var rota = rotaById(rotaId);
    rotaEditavelAtual = podeEditarRota(rota);
    setEditUI(false);
    renderTabela();

    if (tituloEl) tituloEl.textContent = rotaId + ' · sequência de paradas';
    if (subEl) {
      var baseSub = rota ? (rota.motorista + ' · ' + rota.veiculo) : '';
      subEl.textContent = rotaEditavelAtual
        ? baseSub
        : baseSub + ' · rota ' + (rota ? rota.statusInfo.label.toLowerCase() : '') + ', edição indisponível';
    }

    stopListEl.innerHTML = '<div class="pool-empty" style="padding:20px 0;">Carregando paradas…</div>';
    RotasService.listarParadas(rotaId).then(function (paradas) {
      paradasAtuais = paradas;
      renderParadas();
    });
  }

  // ---------------------------------------------------------------
  // Lista de paradas
  // ---------------------------------------------------------------
  function renderParadas() {
    if (!paradasAtuais.length) {
      stopListEl.innerHTML = '<div class="pool-empty" style="padding:20px 0;">Nenhuma parada nesta rota.</div>';
      return;
    }

    stopListEl.innerHTML = paradasAtuais.map(function (p, index) {
      var podeEditar = editando && !p.done;
      var tipoIcon = p.tipo === 'Coleta' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';

      // O horário exibido/editável segue a POSIÇÃO (slot), não a parada em si:
      // ao reordenar, a parada assume o horário da posição para onde foi movida.
      var horaAtual = (podeEditar && horariosSlots[index] !== undefined) ? horariosSlots[index] : p.hora;

      var horaHtml = podeEditar
        ? '<input type="time" class="stop-hora-input" draggable="false" data-hora-id="' + p.id + '" data-hora-index="' + index + '" value="' + horaAtual + '">'
        : (p.hora + (p.done ? ' <i class="fas fa-check" style="color:var(--success);margin-left:6px;"></i>' : ' <span style="color:var(--ink-faint);margin-left:6px;">prev.</span>'));

      var isFirst = index === 0;
      var isLast = index === paradasAtuais.length - 1;
      var prevDone = index > 0 && paradasAtuais[index - 1].done;
      var nextDone = index < paradasAtuais.length - 1 && paradasAtuais[index + 1].done;

      var arrowBtnStyle = 'background:none;border:none;padding:2px;margin:0;line-height:1;cursor:pointer;color:var(--ink-soft);';
      var arrowBtnStyleDisabled = 'background:none;border:none;padding:2px;margin:0;line-height:1;cursor:not-allowed;color:var(--ink-faint);opacity:.4;';
      var arrowsHtml = podeEditar
        ? '<div class="stop-arrows" style="display:flex;flex-direction:column;gap:2px;margin-left:12px;">' +
            '<button class="arrow-up" data-move-stop="' + p.id + '" data-dir="-1" ' + ((isFirst || prevDone) ? 'disabled' : '') + ' style="' + ((isFirst || prevDone) ? arrowBtnStyleDisabled : arrowBtnStyle) + '" title="Mover para cima"><i class="fas fa-chevron-up"></i></button>' +
            '<button class="arrow-down" data-move-stop="' + p.id + '" data-dir="1" ' + ((isLast || nextDone) ? 'disabled' : '') + ' style="' + ((isLast || nextDone) ? arrowBtnStyleDisabled : arrowBtnStyle) + '" title="Mover para baixo"><i class="fas fa-chevron-down"></i></button>' +
          '</div>'
        : '';

      return (
        '<div class="stop' + (podeEditar ? ' stop-editable' : '') + '" draggable="' + podeEditar + '" data-stop="' + p.id + '">' +
          '<div class="stop-dot' + (p.done ? ' done' : '') + '"></div>' +
          '<div><div class="stop-addr">' + p.endereco + '</div><div class="stop-client">' + tipoIcon + ' ' + p.cliente + ' · ' + p.tipo + '</div></div>' +
          '<div class="stop-time" style="display:flex;align-items:center;">' + horaHtml +
          arrowsHtml +
          (podeEditar ? '<button class="si-remove" data-remove-stop="' + p.id + '" title="Remover parada da rota" style="margin-left:14px;"><i class="fas fa-times"></i></button>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    if (editando) bindDragAndDrop();

    stopListEl.querySelectorAll('[data-move-stop]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.moveStop;
        var dir = parseInt(btn.dataset.dir, 10);
        moverParadaNaEdicao(id, dir);
      });
    });

    stopListEl.querySelectorAll('[data-remove-stop]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.removeStop;
        var idx = paradasAtuais.findIndex(function (p) { return p.id === id; });
        if (idx !== -1) horariosSlots.splice(idx, 1);
        paradasAtuais = paradasAtuais.filter(function (p) { return p.id !== id; });
        renderParadas();
      });
    });

    stopListEl.querySelectorAll('.stop-hora-input').forEach(function (input) {
      input.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      input.addEventListener('change', function () {
        var idx = parseInt(input.dataset.horaIndex, 10);
        if (input.value) horariosSlots[idx] = input.value;
      });
    });
  }

  // ---------------------------------------------------------------
  // Mover parada (modo edição) — troca de posição; o horário fica
  // atrelado ao slot/posição, então a parada assume o novo horário.
  // ---------------------------------------------------------------
  function moverParadaNaEdicao(id, direcao) {
    var index = paradasAtuais.findIndex(function (p) { return p.id === id; });
    if (index === -1) return;

    var novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= paradasAtuais.length) return;
    if (paradasAtuais[index].done || paradasAtuais[novoIndex].done) return;

    var item = paradasAtuais.splice(index, 1)[0];
    paradasAtuais.splice(novoIndex, 0, item);
    renderParadas();
  }

  function bindDragAndDrop() {
    stopListEl.querySelectorAll('.stop-editable').forEach(function (el) {
      el.addEventListener('dragstart', function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('stop-hora-input')) {
          e.preventDefault();
          return;
        }
        draggedStopId = el.dataset.stop;
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', function () {
        el.classList.remove('dragging');
        draggedStopId = null;
        stopListEl.querySelectorAll('.stop').forEach(function (s) { s.classList.remove('drag-over'); });
      });
      el.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!draggedStopId || draggedStopId === el.dataset.stop) return;
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', function () {
        el.classList.remove('drag-over');
      });
      el.addEventListener('drop', function (e) {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (!draggedStopId || draggedStopId === el.dataset.stop) return;
        reordenar(draggedStopId, el.dataset.stop);
      });
    });
  }

  function reordenar(idArrastado, idAlvo) {
    var origem = paradasAtuais.findIndex(function (p) { return p.id === idArrastado; });
    var destino = paradasAtuais.findIndex(function (p) { return p.id === idAlvo; });
    if (origem === -1 || destino === -1) return;
    var item = paradasAtuais.splice(origem, 1)[0];
    paradasAtuais.splice(destino, 0, item);
    renderParadas();
  }

  // ---------------------------------------------------------------
  // Alternar modo de edição
  // ---------------------------------------------------------------
  function setEditUI(isEditing) {
    if (btnEditar) btnEditar.style.display = isEditing ? 'none' : '';
    if (editSaveBar) editSaveBar.style.display = isEditing ? 'flex' : 'none';
    if ((modoVisualizacao || !rotaEditavelAtual) && btnEditar) btnEditar.style.display = 'none';
  }

  if (btnEditar) {
    btnEditar.addEventListener('click', function () {
      if (!rotaEditavelAtual) return;
      editando = true;
      modoVisualizacao = false;
      paradasAntesEdicao = JSON.parse(JSON.stringify(paradasAtuais));
      horariosSlots = paradasAtuais.map(function (p) { return p.hora; });
      setEditUI(true);
      renderParadas();
    });
  }

  if (btnCancelar) {
    btnCancelar.addEventListener('click', function () {
      editando = false;
      modoVisualizacao = false;
      if (paradasAntesEdicao) paradasAtuais = paradasAntesEdicao;
      paradasAntesEdicao = null;
      horariosSlots = [];
      setEditUI(false);
      renderParadas();
    });
  }

  if (btnSalvar) {
    btnSalvar.addEventListener('click', function () {
      var rotaId = rotaAtualId;
      // Antes de salvar, cada parada assume o horário da posição (slot) em que ficou.
      for (var i = 0; i < paradasAtuais.length; i++) {
        if (!paradasAtuais[i].done && horariosSlots[i] !== undefined) {
          paradasAtuais[i].hora = horariosSlots[i];
        }
      }
      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Salvando…';
      RotasService.salvarParadas(rotaId, paradasAtuais).then(function () {
        editando = false;
        modoVisualizacao = false;
        paradasAntesEdicao = null;
        horariosSlots = [];
        setEditUI(false);
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar alterações';
        var rota = rotaById(rotaId);
        if (rota) rota.paradas = paradasAtuais.length;
        renderTabela();
        renderParadas();
        UI.toast('Alterações salvas na rota ' + rotaId + '.');
      });
    });
  }

  // ---------------------------------------------------------------
  // Eventos dos filtros de status
  // ---------------------------------------------------------------
  filterChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      filterChips.forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTabela();
    });
  });

  // ---------------------------------------------------------------
  // Eventos do filtro de data
  // ---------------------------------------------------------------
  if (filterDataInput) {
    filterDataInput.addEventListener('change', function() {
      currentDataFilter = this.value;
      // Remove a classe active de todos os chips de status quando filtrar por data
      filterChips.forEach(function(c) { c.classList.remove('active'); });
      // Marca o chip "Todas" como ativo
      document.querySelector('#filterToolbarRotas .chip[data-filter="all"]').classList.add('active');
      currentFilter = 'all';
      renderTabela();
    });
  }

  if (limparDataBtn) {
    limparDataBtn.addEventListener('click', function() {
      if (filterDataInput) {
        filterDataInput.value = '';
        currentDataFilter = '';
        renderTabela();
      }
    });
  }

  // ---------------------------------------------------------------
  // Inicializar
  // ---------------------------------------------------------------
  init();
})();