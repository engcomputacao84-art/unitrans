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
  // CAMADA DE DADOS — RotasService — API real (Supabase)
  // -----------------------------------------------------------------
  // Nesta tela, "rota" e "carga" são a mesma coisa no banco (uma
  // carga = um caminhão + um motorista numa data; as "paradas" são
  // as coletas/entregas dela). O id exibido (ex.: C-0512) é o id
  // numérico da carga formatado.
  // =================================================================
  var RotasService = (function () {
    var API_BASE = '/api';

    var STATUS_LABEL = {
      andamento: { cls: 'b-andamento', label: 'Em andamento' },
      concluida: { cls: 'b-concluida', label: 'Concluída' },
      pendente: { cls: 'b-pendente', label: 'Não iniciada' }
    };

    function tratar(res) {
      return res.json().then(function (corpo) {
        if (!res.ok) throw new Error(corpo.erro || 'Erro ao comunicar com a API.');
        return corpo;
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

    function formatarRotaId(cargaId) {
      return 'C-' + String(cargaId).padStart(4, '0');
    }

    // 'C-0512' -> 512
    function numeroDaCarga(rotaId) {
      return parseInt(String(rotaId).replace(/\D/g, ''), 10);
    }

    // 'HH:MM:SS' (ou null) -> 'HH:MM' pro <input type="time">
    function formatarHora(horaStr) {
      return horaStr ? horaStr.slice(0, 5) : '';
    }

    return {
      listar: function () {
        return fetch(API_BASE + '/cargas')
          .then(tratar)
          .then(function (cargas) {
            // Cargas ainda em 'montagem' (sem motorista) não são uma
            // rota de verdade ainda — elas aparecem na tela de Cargas,
            // não aqui. Só chegam aqui depois de "Gerar rota".
            return cargas.filter(function (c) { return c.status !== 'montagem'; }).map(function (c) {
              var rotaId = formatarRotaId(c.id);
              return {
                id: rotaId,
                motorista: c.motoristaLabel || ('Motorista #' + c.motoristaId),
                veiculo: c.caminhaoLabel || c.caminhaoId,
                cargaId: rotaId,
                status: c.status,
                statusInfo: STATUS_LABEL[c.status] || STATUS_LABEL.pendente,
                data: c.data,
                dataFormatada: formatarData(c.data),
                paradas: (c.paradas || []).length
              };
            });
          });
      },

      listarParadas: function (rotaId) {
        var cargaId = numeroDaCarga(rotaId);
        return fetch(API_BASE + '/paradas?cargaId=' + cargaId)
          .then(tratar)
          .then(function (paradas) {
            return paradas.map(function (p) {
              return {
                id: p.id,
                endereco: p.endereco,
                cliente: p.cliente,
                tipo: p.tipo === 'coleta' ? 'Coleta' : 'Entrega',
                hora: formatarHora(p.horaPrevista),
                done: p.status === 'concluida'
              };
            });
          });
      },

      // novasParadas: lista final (nova ordem) das paradas que ficaram
      // na rota. paradasRemovidas: ids das paradas tiradas da rota
      // durante a edição (voltam pro pool de solicitações).
      salvarParadas: function (rotaId, novasParadas, paradasRemovidas) {
        var atualizacoes = novasParadas.map(function (p, index) {
          return fetch(API_BASE + '/paradas/' + p.id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordem: index + 1, horaPrevista: p.hora ? p.hora + ':00' : null })
          }).then(tratar);
        });

        var remocoes = (paradasRemovidas || []).map(function (id) {
          return fetch(API_BASE + '/paradas/' + id, { method: 'DELETE' }).then(tratar);
        });

        return Promise.all(atualizacoes.concat(remocoes)).then(function () {
          return { ok: true };
        });
      },

      excluir: function (rotaId) {
        var cargaId = numeroDaCarga(rotaId);
        return fetch(API_BASE + '/cargas/' + cargaId, { method: 'DELETE' })
          .then(function (res) {
            if (!res.ok) throw new Error('Não foi possível excluir a rota.');
            return { ok: true, cargaId: rotaId };
          });
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