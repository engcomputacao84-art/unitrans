(function () {
  var tabelaEl = document.getElementById('cargasTabela');
  if (!tabelaEl) return;

  var API_BASE = 'http://localhost:3000/api';

  function tratar(res) {
    return res.json().then(function (corpo) {
      if (!res.ok) throw new Error(corpo.erro || 'Erro ao comunicar com a API.');
      return corpo;
    });
  }

  // ============================================================
  // FrotaService — API real (Supabase)
  // ============================================================
  var FrotaService = (function () {
    var STATUS_LABEL = {
      disponivel: 'Disponível',
      em_rota: 'Em rota',
      manutencao: 'Manutenção',
      folga: 'Folga',
      inativo: 'Inativo',
      viajando: 'Em rota'
    };

    return {
      statusLabel: function (status) {
        return STATUS_LABEL[status] || status;
      },
      listarCaminhoes: function () {
        return fetch(API_BASE + '/caminhoes').then(tratar);
      },
      listarMotoristasDisponiveis: function () {
        return fetch(API_BASE + '/motoristas').then(tratar).then(function (lista) {
          return lista.filter(function (m) { return m.status === 'disponivel'; });
        });
      }
    };
  })();

  // ============================================================
  // SolicitacoesService — API real (Supabase)
  // "dia" aqui é a data_desejo (YYYY-MM-DD) formatada como DD/MM.
  // ============================================================
  var SolicitacoesService = (function () {
    function formatarDia(iso) {
      if (!iso) return '—';
      var p = iso.split('-');
      return p.length === 3 ? p[2] + '/' + p[1] : iso;
    }

    // Extrai a cidade de um endereço já formatado pelo backend
    // ("Rua X, 10 — Bairro (Cidade/UF)") só pra dar um resumo de
    // região na listagem — não existe campo "zona" no banco.
    function extrairCidade(enderecoFormatado) {
      if (!enderecoFormatado) return null;
      var m = enderecoFormatado.match(/\(([^/)]+)/);
      return m ? m[1].trim() : null;
    }

    function paraItem(s) {
      return {
        id: s.id,
        cliente: s.cliente,
        enderecoColeta: s.enderecoColeta,
        enderecoEntrega: s.enderecoEntrega,
        cidade: extrairCidade(s.enderecoColeta) || extrairCidade(s.enderecoEntrega),
        peso: Number(s.peso) || 0,
        dataDesejo: s.dataDesejo,
        dia: formatarDia(s.dataDesejo),
        status: s.status
      };
    }

    return {
      // busca TODAS (não só 'aprovado'), pra também conseguir montar o
      // resumo das cargas que já têm solicitações vinculadas ('em_carga').
      listarTodas: function () {
        return fetch(API_BASE + '/solicitacoes').then(tratar).then(function (lista) {
          return lista.map(paraItem);
        });
      }
    };
  })();

  var PENCIL_ICON = '<i class="fas fa-edit"></i>';
  var TRASH_ICON = '<i class="fas fa-trash-alt"></i>';
  var ROUTE_ICON = '<i class="fas fa-route"></i>';
  var VIEW_ICON = '<i class="fas fa-external-link-alt"></i>';
  var CHEVRON_ICON = '<i class="fas fa-chevron-right"></i>';

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

  // ------------------------------------------------------------
  // Cache local (recarregado a cada ação) — evita ficar buscando
  // tudo de novo a cada re-render da tabela.
  // ------------------------------------------------------------
  var cargasCache = [];
  var solicitacoesCache = []; // todas, qualquer status
  var solicitacoesPorId = {};

  function solById(id) {
    return solicitacoesPorId[id] || null;
  }

  function formatarCargaId(id) {
    return 'C-' + String(id).padStart(4, '0');
  }

  function diasDisponiveis() {
    var dias = {};
    solicitacoesCache.forEach(function (s) { if (s.status === 'aprovado') dias[s.dia] = s.dataDesejo; });
    cargasCache.forEach(function (c) { if (c.dia) dias[c.dia] = c.dataDesejo; });
    return Object.keys(dias).sort().map(function (dia) { return { dia: dia, iso: dias[dia] }; });
  }

  function carregarTudo() {
    return Promise.all([
      fetch(API_BASE + '/cargas').then(tratar),
      SolicitacoesService.listarTodas()
    ]).then(function (resultados) {
      var cargasApi = resultados[0];
      solicitacoesCache = resultados[1];
      solicitacoesPorId = {};
      solicitacoesCache.forEach(function (s) { solicitacoesPorId[s.id] = s; });

      cargasCache = cargasApi.map(function (c) {
        var p = c.data.split('-');
        return {
          id: formatarCargaId(c.id),
          rawId: c.id,
          dia: p.length === 3 ? p[2] + '/' + p[1] : c.data,
          dataDesejo: c.data,
          status: c.status, // 'montagem' | 'pendente' | 'andamento' | 'concluida'
          caminhaoId: c.caminhaoId,
          caminhaoLabel: c.caminhaoLabel,
          capacidade: c.capacidadeCaminhao,
          motoristaId: c.motoristaId,
          motoristaLabel: c.motoristaLabel,
          solicitacaoIds: c.solicitacaoIds
        };
      });
    });
  }

  // =================================================================
  // Listagem (tabela com dropdown)
  // =================================================================
  function computeResumo(carga) {
    var itens = (carga.solicitacaoIds || []).map(solById).filter(Boolean);
    var cidades = {};
    itens.forEach(function (it) { if (it.cidade) cidades[it.cidade] = true; });

    return {
      regiao: Object.keys(cidades).join(' / ') || '—',
      solicitacoes: itens.length,
      peso: itens.reduce(function (s, it) { return s + it.peso; }, 0),
      itens: itens
    };
  }

  function formatUso(peso, capacidade) {
    var pesoTxt = peso.toLocaleString('pt-BR') + ' kg';
    if (!capacidade) return pesoTxt;
    return pesoTxt + ' / ' + Number(capacidade).toLocaleString('pt-BR') + ' kg';
  }

  function renderLinhaCarga(carga) {
    var resumo = computeResumo(carga);
    var over = carga.capacidade ? resumo.peso > carga.capacidade : false;
    var usoTxt = formatUso(resumo.peso, carga.capacidade);
    var emMontagem = carga.status === 'montagem';
    var isOpen = !!openRows[carga.id];

    var statusBadge = emMontagem
      ? '<span class="badge b-carga">Em montagem</span>'
      : '<span class="badge b-rota">' + (carga.status === 'concluida' ? 'Concluída' : carga.status === 'andamento' ? 'Em andamento' : 'Em rota') + '</span>';

    var acoes = '<div class="row-actions">';
    if (emMontagem && resumo.solicitacoes) {
      acoes += '<button class="icon-btn approve btn-rota-carga" data-id="' + carga.id + '" title="Gerar rota">' + ROUTE_ICON + '</button>';
    }
    if (!emMontagem) {
      acoes += '<button class="icon-btn btn-ver-rota" data-rota="' + carga.id + '" title="Ver rota vinculada">' + VIEW_ICON + '</button>';
    }
    acoes += '<button class="icon-btn btn-editar-carga' + (emMontagem ? '' : ' disabled') + '" data-id="' + carga.id + '" title="' + (emMontagem ? 'Editar carga' : 'Carga já está em rota') + '">' + PENCIL_ICON + '</button>';
    acoes += '<button class="icon-btn reject btn-excluir-carga' + (emMontagem ? '' : ' disabled') + '" data-id="' + carga.id + '" title="' + (emMontagem ? 'Excluir carga' : 'Carga já está em rota') + '">' + TRASH_ICON + '</button>';
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
          '<div class="sub-table-wrap">' + renderSubTabela(carga, resumo) + '</div>' +
        '</td>' +
      '</tr>';

    return linhaPrincipal + linhaDropdown;
  }

  function renderSubTabela(carga, resumo) {
    if (!resumo.itens.length) {
      return '<div class="sub-table-empty">Nenhuma solicitação detalhada para esta carga.</div>';
    }

    var linhas = resumo.itens.map(function (it) {
      return '' +
        '<tr>' +
          '<td class="mono">SL-' + String(it.id).padStart(4, '0') + '</td>' +
          '<td>' + it.cliente + '</td>' +
          '<td>' + (carga.motoristaLabel || '<span class="cell-sub">A definir</span>') + '</td>' +
          '<td><span class="tag-coleta"><i class="fas fa-arrow-up"></i> ' + it.enderecoColeta + '</span></td>' +
          '<td><span class="tag-entrega"><i class="fas fa-arrow-down"></i> ' + it.enderecoEntrega + '</span></td>' +
        '</tr>';
    }).join('');

    return '' +
      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>Solicitação</th>' +
            '<th>Cliente</th>' +
            '<th>Motorista</th>' +
            '<th>Coleta</th>' +
            '<th>Entrega</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + linhas + '</tbody>' +
      '</table>';
  }

  function atualizarContagens(cargas) {
    var total = cargas.length;
    var montagem = cargas.filter(function (c) { return c.status === 'montagem'; }).length;
    var rota = cargas.filter(function (c) { return c.status !== 'montagem'; }).length;

    var countAll = document.getElementById('filterCountAllCargas');
    var countMontagem = document.getElementById('filterCountMontagemCargas');
    var countRota = document.getElementById('filterCountRotaCargas');

    if (countAll) countAll.textContent = total;
    if (countMontagem) countMontagem.textContent = montagem;
    if (countRota) countRota.textContent = rota;
  }

  function atualizarFiltroData() {
    if (!filterDataSelect) return;
    var atual = filterDataSelect.value;
    var opcoes = diasDisponiveis();
    filterDataSelect.innerHTML = '<option value="all">Todas as datas</option>' +
      opcoes.map(function (o) { return '<option value="' + o.dia + '">' + o.dia + '</option>'; }).join('');
    if (opcoes.some(function (o) { return o.dia === atual; })) filterDataSelect.value = atual;
  }

  function renderTabela() {
    var cargas = cargasCache;

    var cargasFiltradas = cargas.filter(function (carga) {
      if (currentFilter === 'montagem' && carga.status !== 'montagem') return false;
      if (currentFilter === 'rota' && carga.status === 'montagem') return false;
      if (currentDataFilter !== 'all' && carga.dia !== currentDataFilter) return false;
      return true;
    });

    atualizarContagens(cargas);
    atualizarFiltroData();

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

  function recarregarERenderizar() {
    return carregarTudo().then(renderTabela);
  }

  function bindTabelaEvents() {
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
        var carga = cargasCache.filter(function (c) { return c.id === btn.dataset.id; })[0];
        if (carga) abrirEdicao(carga);
      });
    });

    tabelaEl.querySelectorAll('.btn-excluir-carga').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.classList.contains('disabled')) return;
        var cargaId = btn.dataset.id;
        var carga = cargasCache.filter(function (c) { return c.id === cargaId; })[0];
        if (!carga) return;
        UI.confirmar({
          title: 'Excluir carga',
          message: 'Excluir a carga ' + cargaId + '? As solicitações voltam a ficar disponíveis para entrar em outra carga.',
          confirmLabel: 'Excluir',
          tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          fetch(API_BASE + '/cargas/' + carga.rawId, { method: 'DELETE' }).then(function (res) {
            if (!res.ok && res.status !== 204) throw new Error('Não foi possível excluir a carga.');
            delete openRows[cargaId];
            return recarregarERenderizar();
          }).then(function () {
            UI.toast('Carga ' + cargaId + ' excluída com sucesso!');
          }).catch(function (err) {
            UI.toast(err.message || 'Não foi possível excluir a carga.');
          });
        });
      });
    });

    tabelaEl.querySelectorAll('.btn-rota-carga').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var carga = cargasCache.filter(function (c) { return c.id === btn.dataset.id; })[0];
        if (!carga) return;
        abrirModalAtribuicao(carga, function (motoristaId) {
          fetch(API_BASE + '/cargas/' + carga.rawId + '/gerar-rota', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motoristaId: motoristaId })
          }).then(tratar).then(function () {
            return recarregarERenderizar();
          }).then(function () {
            UI.toast('Rota gerada a partir da carga ' + carga.id + '. Ela já pode ser ajustada na tela de Rotas.');
          }).catch(function (err) {
            UI.toast(err.message || 'Não foi possível gerar a rota.');
          });
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
    if (!modalAtribuirOverlay) { onConfirm(null); return; }
    onConfirmarAtribuicao = onConfirm;
    atribuirCaminhaoLabelEl.textContent = carga.caminhaoLabel || carga.caminhaoId;
    FrotaService.listarMotoristasDisponiveis().then(function (lista) {
      selectMotorista.innerHTML = '<option value="">Selecione…</option>' + lista.map(function (m) {
        return '<option value="' + m.id + '">' + m.nome + '</option>';
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
      var callback = onConfirmarAtribuicao;
      var motoristaId = selectMotorista.value;
      fecharAtribuicaoModal();
      if (callback) callback(motoristaId);
    });
  }

  // =================================================================
  // Modal: Montar carga (wizard de 2 passos)
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
  var montarPoolEl = document.getElementById('montarPoolSolicitacoes');
  var montarCountEl = document.getElementById('montarCountSolicitacoes');

  var wizard = { step: 1, dia: null, dataDesejo: null, caminhaoId: null, caminhaoLabel: null, capacidade: 0, selected: {}, trucksCache: [] };

  function solicitacoesLivresNoDia(dia) {
    var usadas = {};
    cargasCache.forEach(function (c) { (c.solicitacaoIds || []).forEach(function (id) { usadas[id] = true; }); });
    return solicitacoesCache.filter(function (s) { return s.status === 'aprovado' && s.dia === dia && !usadas[s.id]; });
  }

  function abrirWizard() {
    var opcoes = diasDisponiveis();
    wizard = {
      step: 1,
      dia: opcoes.length ? opcoes[0].dia : null,
      dataDesejo: opcoes.length ? opcoes[0].iso : null,
      caminhaoId: null, caminhaoLabel: null, capacidade: 0,
      selected: {}, trucksCache: []
    };
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
  function caminhoesEmUsoMontagem(dia, excludeCargaId) {
    var uso = {};
    cargasCache.forEach(function (c) {
      if (c.status === 'montagem' && c.dia === dia && c.id !== excludeCargaId) uso[c.caminhaoId] = true;
    });
    return uso;
  }

  function renderStep1() {
    var opcoes = diasDisponiveis();

    if (montarDayTabsEl) {
      if (!opcoes.length) {
        montarDayTabsEl.innerHTML = '<div class="montar-pool-empty">Nenhuma solicitação aprovada pendente de carga.</div>';
      } else {
        montarDayTabsEl.innerHTML = opcoes.map(function (o) {
          var pendentes = solicitacoesLivresNoDia(o.dia).length;
          return '<div class="day-tab' + (o.dia === wizard.dia ? ' active' : '') + '" data-day="' + o.dia + '" data-iso="' + o.iso + '">' + o.dia + ' <span class="n">' + pendentes + '</span></div>';
        }).join('');
        montarDayTabsEl.querySelectorAll('[data-day]').forEach(function (tab) {
          tab.addEventListener('click', function () {
            wizard.dia = tab.dataset.day;
            wizard.dataDesejo = tab.dataset.iso;
            wizard.selected = {};
            renderStep1();
          });
        });
      }
    }

    FrotaService.listarCaminhoes().then(function (lista) {
      wizard.trucksCache = lista;
      var emUso = caminhoesEmUsoMontagem(wizard.dia, null);

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
            '<div class="tc-cap">' + Number(c.capacidade).toLocaleString('pt-BR') + ' kg · ' + statusTxt + '</div>' +
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

      if (btnAvancarMontar) btnAvancarMontar.disabled = !wizard.caminhaoId || !wizard.dia;
    });
  }

  if (btnAvancarMontar) {
    btnAvancarMontar.addEventListener('click', function () {
      if (!wizard.caminhaoId || !wizard.dia) return;
      goToStep(2);
    });
  }
  if (btnVoltarMontar) btnVoltarMontar.addEventListener('click', function () { goToStep(1); });

  // ---------------- Passo 2: solicitações ----------------
  function renderMontarItem(it) {
    var checked = !!wizard.selected[it.id];
    return '' +
      '<label class="montar-item' + (checked ? ' checked' : '') + '" data-item="' + it.id + '">' +
        '<input type="checkbox"' + (checked ? ' checked' : '') + '>' +
        '<div class="mi-left">' +
          '<div class="mi-cliente">' + it.cliente + '</div>' +
          '<div class="mi-id">SL-' + String(it.id).padStart(4, '0') + (it.cidade ? ' · <span class="mi-zona">' + it.cidade + '</span>' : '') + '</div>' +
        '</div>' +
        '<div class="mi-peso">' + it.peso + 'kg</div>' +
      '</label>';
  }

  function renderStep2() {
    if (montarStep2SubEl) {
      montarStep2SubEl.textContent = 'Dia ' + wizard.dia + ' · ' + wizard.caminhaoLabel + ' (' + wizard.capacidade.toLocaleString('pt-BR') + ' kg).';
    }

    var itens = solicitacoesLivresNoDia(wizard.dia);

    montarPoolEl.innerHTML = itens.length ? itens.map(renderMontarItem).join('') : '<div class="montar-pool-empty">Nenhuma solicitação aprovada livre neste dia.</div>';
    montarCountEl.textContent = itens.length;

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

    if (montarWarningsEl) montarWarningsEl.innerHTML = '';
    if (btnConcluirMontar) btnConcluirMontar.disabled = !selecionados.length;
  }

  function salvarNovaCarga(ids, peso) {
    return fetch(API_BASE + '/cargas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminhaoId: wizard.caminhaoId, data: wizard.dataDesejo })
    }).then(tratar).then(function (carga) {
      return fetch(API_BASE + '/cargas/' + carga.id + '/itens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitacaoIds: ids.map(Number) })
      }).then(tratar);
    }).then(function () {
      fecharWizard();
      return recarregarERenderizar();
    }).then(function () {
      UI.toast('Carga montada com sucesso!');
    }).catch(function (err) {
      UI.toast(err.message || 'Não foi possível montar a carga.');
    });
  }

  if (btnConcluirMontar) {
    btnConcluirMontar.addEventListener('click', function () {
      var ids = Object.keys(wizard.selected).filter(function (id) { return wizard.selected[id]; });
      if (!ids.length) return;

      var peso = ids.map(solById).filter(Boolean).reduce(function (s, it) { return s + it.peso; }, 0);

      if (peso > wizard.capacidade) {
        UI.confirmar({
          title: 'Peso acima da capacidade',
          message: 'O peso selecionado (' + peso + 'kg) está acima da capacidade do caminhão (' + wizard.capacidade + 'kg). Concluir mesmo assim?',
          confirmLabel: 'Concluir mesmo assim',
          tone: 'danger'
        }).then(function (ok) { if (ok) salvarNovaCarga(ids, peso); });
      } else {
        salvarNovaCarga(ids, peso);
      }
    });
  }

  if (btnMontarCarga) btnMontarCarga.addEventListener('click', abrirWizard);
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
  var editarPoolEl = document.getElementById('editarPoolSolicitacoes');
  var editarCountEl = document.getElementById('editarCountSolicitacoes');

  var editState = { cargaId: null, rawId: null, dia: null, caminhaoId: null, caminhaoLabel: null, capacidade: 0, selected: {} };

  function abrirEdicao(carga) {
    editState = {
      cargaId: carga.id,
      rawId: carga.rawId,
      dia: carga.dia,
      caminhaoId: carga.caminhaoId,
      caminhaoLabel: carga.caminhaoLabel,
      capacidade: carga.capacidade || 0,
      selected: {}
    };
    (carga.solicitacaoIds || []).forEach(function (id) { editState.selected[id] = true; });

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
      var emUso = caminhoesEmUsoMontagem(editState.dia, editState.cargaId);

      editarCaminhaoSelectEl.innerHTML = lista.map(function (c) {
        var indisponivel = c.status !== 'disponivel' || emUso[c.id];
        var ehAtual = c.id === editState.caminhaoId;
        var statusTxt = ehAtual ? 'atual' : (indisponivel ? 'indisponível' : FrotaService.statusLabel(c.status));
        return '<option value="' + c.id + '" data-label="' + c.id + ' — ' + c.modelo + '" data-capacidade="' + c.capacidade + '"' +
          ((indisponivel && !ehAtual) ? ' disabled' : '') +
          (ehAtual ? ' selected' : '') + '>' +
          c.id + ' — ' + c.modelo + ' · ' + Number(c.capacidade).toLocaleString('pt-BR') + ' kg (' + statusTxt + ')' +
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

  function solicitacoesLivresParaEdicao() {
    var usadas = {};
    cargasCache.forEach(function (c) {
      if (c.id === editState.cargaId) return;
      (c.solicitacaoIds || []).forEach(function (id) { usadas[id] = true; });
    });
    return solicitacoesCache.filter(function (s) {
      return s.dia === editState.dia && (s.status === 'aprovado' || editState.selected[s.id]) && !usadas[s.id];
    });
  }

  function renderEditarItens() {
    var itens = solicitacoesLivresParaEdicao();

    editarPoolEl.innerHTML = itens.length ? itens.map(renderMontarItemEditar).join('') : '<div class="montar-pool-empty">Nenhuma solicitação livre neste dia.</div>';
    editarCountEl.textContent = itens.length;

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
          '<div class="mi-id">SL-' + String(it.id).padStart(4, '0') + (it.cidade ? ' · <span class="mi-zona">' + it.cidade + '</span>' : '') + '</div>' +
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
    if (editarWarningsEl) editarWarningsEl.innerHTML = '';
    if (btnSalvarEditar) btnSalvarEditar.disabled = !selecionados.length;
  }

  function salvarEdicao(ids, peso) {
    return fetch(API_BASE + '/cargas/' + editState.rawId + '/caminhao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminhaoId: editState.caminhaoId })
    }).then(tratar).then(function () {
      return fetch(API_BASE + '/cargas/' + editState.rawId + '/itens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitacaoIds: ids.map(Number) })
      }).then(tratar);
    }).then(function () {
      fecharEdicao();
      return recarregarERenderizar();
    }).then(function () {
      UI.toast('Carga atualizada com sucesso!');
    }).catch(function (err) {
      UI.toast(err.message || 'Não foi possível atualizar a carga.');
    });
  }

  if (btnSalvarEditar) {
    btnSalvarEditar.addEventListener('click', function () {
      var ids = Object.keys(editState.selected).filter(function (id) { return editState.selected[id]; });
      if (!ids.length) return;

      var peso = ids.map(solById).filter(Boolean).reduce(function (s, it) { return s + it.peso; }, 0);

      if (peso > editState.capacidade) {
        UI.confirmar({
          title: 'Peso acima da capacidade',
          message: 'O peso selecionado (' + peso + 'kg) está acima da capacidade do caminhão (' + editState.capacidade + 'kg). Salvar mesmo assim?',
          confirmLabel: 'Salvar mesmo assim',
          tone: 'danger'
        }).then(function (ok) { if (ok) salvarEdicao(ids, peso); });
      } else {
        salvarEdicao(ids, peso);
      }
    });
  }

  if (fecharModalEditarBtn) fecharModalEditarBtn.addEventListener('click', fecharEdicao);
  if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', fecharEdicao);
  Utils.ligarFechamentoModal(modalEditarOverlay, fecharEdicao);

  // =================================================================
  // Eventos dos filtros
  // =================================================================
  filterChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      filterChips.forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTabela();
    });
  });

  if (filterDataSelect) {
    filterDataSelect.addEventListener('change', function () {
      currentDataFilter = this.value;
      if (currentDataFilter !== 'all') {
        filterChips.forEach(function (c) { c.classList.remove('active'); });
        document.querySelector('#filterToolbarCargas .chip[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
      }
      renderTabela();
    });
  }

  if (limparDataBtn) {
    limparDataBtn.addEventListener('click', function () {
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
  recarregarERenderizar();
})();
