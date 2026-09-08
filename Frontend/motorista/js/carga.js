(function () {
  var historicoBody = document.getElementById('cargaHistoricoBody');
  var toolbarSemana = document.getElementById('filterToolbarSemana');
  var semanaSub = document.getElementById('cargaSemanaSub');

  if (!historicoBody || !toolbarSemana) return;

  // =================================================================
  // CAMADA DE DADOS — CargaService — API real (Supabase)
  // =================================================================
  var CargaService = (function () {
    var API_BASE = 'http://localhost:3000/api';

    // TODO: ainda não existe login/sessão no backend. Enquanto isso não
    // for implementado, o id do motorista logado fica salvo aqui (é o
    // "usuario_id" dele na tabela usuarios/motoristas).
    var motoristaId = localStorage.getItem('unitrans_motorista_id') ||
      new URLSearchParams(location.search).get('motoristaId');

    var DIAS_SEMANA_JS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    var STATUS_CARGA_API_PARA_APP = { pendente: 'agendada', andamento: 'em_andamento', concluida: 'concluida' };

    function tratar(res) {
      return res.json().then(function (corpo) {
        if (!res.ok) throw new Error(corpo.erro || 'Erro ao comunicar com a API.');
        return corpo;
      });
    }

    function paradaParaItem(p) {
      return { tipo: p.tipo, cliente: p.cliente, endereco: p.endereco, peso: p.pesoKg || 0 };
    }

    return {
      // Traz as cargas do motorista logado (todas — o agrupamento por
      // dia da semana é feito aqui mesmo, no cliente) já com os itens
      // (paradas) de cada uma.
      cargasSemana: function () {
        if (!motoristaId) {
          return Promise.reject(new Error('Motorista não identificado (login ainda não implementado).'));
        }
        var hojeISO = new Date().toISOString().slice(0, 10);

        return fetch(API_BASE + '/cargas?motoristaId=' + encodeURIComponent(motoristaId))
          .then(tratar)
          .then(function (cargas) {
            return Promise.all(cargas.map(function (c) {
              return fetch(API_BASE + '/paradas?cargaId=' + c.id).then(tratar).then(function (paradas) {
                return {
                  id: 'C-' + String(c.id).padStart(4, '0'),
                  diaKey: DIAS_SEMANA_JS[new Date(c.data + 'T00:00:00').getDay()],
                  data: c.data.split('-').reverse().slice(0, 2).join('/'),
                  caminhao: c.caminhaoId,
                  status: STATUS_CARGA_API_PARA_APP[c.status] || c.status,
                  hoje: c.data === hojeISO,
                  itens: paradas.map(paradaParaItem)
                };
              });
            }));
          });
      }
    };
  })();

  var DIAS_SEMANA = [
    { key: 'seg', label: 'Seg' },
    { key: 'ter', label: 'Ter' },
    { key: 'qua', label: 'Qua' },
    { key: 'qui', label: 'Qui' },
    { key: 'sex', label: 'Sex' }
  ];

  var STATUS_HIST = {
    concluida: { cls: 'success', label: 'Concluída' },
    cancelada: { cls: 'danger', label: 'Cancelada' },
    em_andamento: { cls: 'warning', label: 'Em andamento' },
    agendada: { cls: 'info', label: 'Agendada' }
  };

  function pesoTotal(c) {
    return c.itens.reduce(function (s, it) { return s + it.peso; }, 0);
  }

  // ---------- Estado: cargas da semana + filtro de dia + linha aberta ----------
  var CARGAS_SEMANA_TODAS = [];
  var diaAtivo = null;     // key do chip selecionado (seg/ter/.../dom)
  var cargaAberta = null;  // id da carga com a linha de detalhe expandida

  function renderToolbarSemana() {
    var contagem = {};
    DIAS_SEMANA.forEach(function (d) { contagem[d.key] = 0; });
    CARGAS_SEMANA_TODAS.forEach(function (c) { contagem[c.diaKey] = (contagem[c.diaKey] || 0) + 1; });

    var diaDeHoje = CARGAS_SEMANA_TODAS.filter(function (c) { return c.hoje; })[0];
    diaDeHoje = diaDeHoje ? diaDeHoje.diaKey : null;

    toolbarSemana.innerHTML = DIAS_SEMANA.map(function (d) {
      var classes = 'chip' + (d.key === diaAtivo ? ' active' : '') + (d.key === diaDeHoje ? ' today' : '');
      var label = d.label + ' · ' + contagem[d.key] + (d.key === diaDeHoje ? ' · Hoje' : '');
      return '<span class="' + classes + '" data-dia="' + d.key + '">' + label + '</span>';
    }).join('');

    toolbarSemana.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        diaAtivo = chip.dataset.dia;
        cargaAberta = null;
        renderToolbarSemana();
        renderCargasSemana();
      });
    });
  }

  function renderItemMini(it) {
    var tagClasse = it.tipo === 'coleta' ? 'tag-coleta' : 'tag-entrega';
    var tagIcon = it.tipo === 'coleta' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
    var tagLabel = it.tipo === 'coleta' ? 'Coleta' : 'Entrega';
    return '' +
      '<tr>' +
        '<td><span class="' + tagClasse + '">' + tagIcon + ' ' + tagLabel + '</span></td>' +
        '<td>' + it.cliente + '</td>' +
        '<td class="col-endereco-cell">' + it.endereco + '</td>' +
        '<td class="mono col-peso-cell">' + it.peso + ' kg</td>' +
      '</tr>';
  }

  function renderDetalheCarga(c) {
    var diaTag = DIAS_SEMANA.filter(function (d) { return d.key === c.diaKey; })[0];
    var tabela = c.itens.length
      ? '<div class="mini-table-wrap"><table class="mini-table">' +
          '<colgroup><col class="col-tipo"><col class="col-cliente"><col class="col-endereco"><col class="col-peso"></colgroup>' +
          '<thead><tr><th>Tipo</th><th>Cliente</th><th>Endereço</th><th>Peso</th></tr></thead>' +
          '<tbody>' + c.itens.map(renderItemMini).join('') + '</tbody>' +
        '</table></div>'
      : '<div class="mono">Nenhum item registrado nesta carga.</div>';
    return '' +
      '<div class="detalhe-meta mono">' +
        '<i class="fas fa-calendar-day"></i>' +
        '<span>' + (diaTag ? diaTag.label : '') + ' · ' + c.data + '</span>' +
        '<span style="opacity:.4;">|</span>' +
        '<i class="fas fa-truck"></i>' +
        '<span>' + c.caminhao + '</span>' +
      '</div>' +
      tabela;
  }

  function renderLinhaCarga(c) {
    var st = STATUS_HIST[c.status] || { cls: 'default', label: c.status };
    var aberta = c.id === cargaAberta;
    return '' +
      '<tr class="linha-carga' + (aberta ? ' aberta' : '') + '" data-id="' + c.id + '">' +
        '<td class="mono">' + c.id + '</td>' +
        '<td>' + c.data + '</td>' +
        '<td class="mono">' + c.caminhao + '</td>' +
        '<td>' + c.itens.length + ' itens</td>' +
        '<td class="mono">' + pesoTotal(c) + ' kg</td>' +
        '<td><span class="badge ' + st.cls + '">' + st.label + '</span></td>' +
        '<td class="col-chevron"><i class="fas fa-chevron-down"></i></td>' +
      '</tr>' +
      '<tr class="linha-detalhe' + (aberta ? ' open' : '') + '" data-detalhe-de="' + c.id + '">' +
        '<td colspan="7"><div class="detalhe-inner">' + renderDetalheCarga(c) + '</div></td>' +
      '</tr>';
  }

  function renderCargasSemana() {
    var lista = CARGAS_SEMANA_TODAS.filter(function (c) { return c.diaKey === diaAtivo; });
    var diaTag = DIAS_SEMANA.filter(function (d) { return d.key === diaAtivo; })[0];
    var ehHoje = lista.some(function (c) { return c.hoje; });
    semanaSub.textContent = ehHoje
      ? 'Cargas de hoje (' + (diaTag ? diaTag.label : '') + ') — clique em uma linha para ver os itens'
      : 'Cargas de ' + (diaTag ? diaTag.label : '') + '-feira — clique em uma linha para ver os itens';

    if (!lista.length) {
      historicoBody.innerHTML = '<tr><td colspan="7" class="mono">Nenhuma carga nesse dia.</td></tr>';
      return;
    }

    historicoBody.innerHTML = lista.map(renderLinhaCarga).join('');

    historicoBody.querySelectorAll('.linha-carga').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var id = tr.dataset.id;
        cargaAberta = cargaAberta === id ? null : id;
        renderCargasSemana();
      });
    });
  }

  function init() {
    CargaService.cargasSemana().then(function (lista) {
      CARGAS_SEMANA_TODAS = lista;
      var hojeItem = lista.filter(function (c) { return c.hoje; })[0];
      diaAtivo = hojeItem ? hojeItem.diaKey : (lista[0] ? lista[0].diaKey : 'seg');
      renderToolbarSemana();
      renderCargasSemana();
    });
  }

  init();
})();