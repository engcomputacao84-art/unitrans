(function () {
  var historicoBody = document.getElementById('cargaHistoricoBody');
  var toolbarSemana = document.getElementById('filterToolbarSemana');
  var semanaSub = document.getElementById('cargaSemanaSub');

  if (!historicoBody || !toolbarSemana) return;

  // =================================================================
  // CAMADA DE DADOS — CargaService (mock local, escopo do motorista logado)
  // Quando o backend entrar, troca-se "cargasSemana()" por um fetch()
  // filtrado pelo motorista autenticado, trazendo as cargas da semana.
  // =================================================================
  var CargaService = (function () {

    // 2 a 3 cargas de exemplo por dia da semana. "hoje: true" marca a
    // carga em andamento no dia atual, que já vem selecionada no filtro.
    var CARGAS_SEMANA = [
      // ---- Segunda, 24/08 ----
      { id: 'C-0501', diaKey: 'seg', data: '24/08', caminhao: 'DVX-3A21', status: 'concluida', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Metalúrgica Rio Preto Ltda', endereco: 'Av. Prestes Maia, 1840', peso: 120 },
        { tipo: 'entrega', cliente: 'Farmácia Bem-Estar', endereco: 'Rua Amazonas, 522', peso: 18 }
      ] },
      { id: 'C-0502', diaKey: 'seg', data: '24/08', caminhao: 'DVX-3A21', status: 'concluida', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Confecções Del Rio', endereco: 'Rua Bahia, 355', peso: 60 },
        { tipo: 'entrega', cliente: 'Loja Casa & Cia', endereco: 'Rua Ceará, 88', peso: 65 },
        { tipo: 'entrega', cliente: 'Supermercado Compre Bem', endereco: 'Rua Bahia, 300', peso: 2 }
      ] },

      // ---- Terça, 25/08 (hoje) ----
      { id: 'C-0505', diaKey: 'ter', data: '25/08', caminhao: 'DVX-3A21', status: 'concluida', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Auto Peças Votupeças', endereco: 'Av. Tancredo Neves, 980', peso: 95 },
        { tipo: 'entrega', cliente: 'Clínica VidaPlus', endereco: 'Av. Onze de Agosto, 2140', peso: 40 }
      ] },
      { id: 'C-0506', diaKey: 'ter', data: '25/08', caminhao: 'DVX-3A21', status: 'em_andamento', hoje: true, itens: [
        { tipo: 'coleta', cliente: 'Metalúrgica Rio Preto Ltda', endereco: 'Av. Prestes Maia, 1840', peso: 120 },
        { tipo: 'entrega', cliente: 'Farmácia Bem-Estar', endereco: 'Rua Amazonas, 522', peso: 18 },
        { tipo: 'entrega', cliente: 'Clínica VidaPlus', endereco: 'Av. Onze de Agosto, 2140', peso: 40 }
      ] },
      { id: 'C-0507', diaKey: 'ter', data: '25/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Transportadora Bandeirantes', endereco: 'Rod. Euclides da Cunha, km 428', peso: 210 }
      ] },

      // ---- Quarta, 26/08 ----
      { id: 'C-0510', diaKey: 'qua', data: '26/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Transportadora Bandeirantes', endereco: 'Rod. Euclides da Cunha, km 428', peso: 210 },
        { tipo: 'entrega', cliente: 'Farmácia Bem-Estar', endereco: 'Rua Amazonas, 522', peso: 18 }
      ] },
      { id: 'C-0511', diaKey: 'qua', data: '26/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Auto Peças Votupeças', endereco: 'Av. Tancredo Neves, 980', peso: 95 },
        { tipo: 'entrega', cliente: 'Loja Casa & Cia', endereco: 'Rua Ceará, 88', peso: 65 }
      ] },

      // ---- Quinta, 27/08 ----
      { id: 'C-0514', diaKey: 'qui', data: '27/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Confecções Del Rio', endereco: 'Rua Bahia, 355', peso: 60 },
        { tipo: 'entrega', cliente: 'Supermercado Compre Bem', endereco: 'Rua Bahia, 300', peso: 2 }
      ] },
      { id: 'C-0515', diaKey: 'qui', data: '27/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Metalúrgica Rio Preto Ltda', endereco: 'Av. Prestes Maia, 1840', peso: 120 }
      ] },
      { id: 'C-0516', diaKey: 'qui', data: '27/08', caminhao: 'DVX-3A21', status: 'cancelada', hoje: false, itens: [
        { tipo: 'entrega', cliente: 'Clínica VidaPlus', endereco: 'Av. Onze de Agosto, 2140', peso: 40 }
      ] },

      // ---- Sexta, 28/08 ----
      { id: 'C-0519', diaKey: 'sex', data: '28/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Auto Peças Votupeças', endereco: 'Av. Tancredo Neves, 980', peso: 95 },
        { tipo: 'entrega', cliente: 'Loja Casa & Cia', endereco: 'Rua Ceará, 88', peso: 65 }
      ] },
      { id: 'C-0520', diaKey: 'sex', data: '28/08', caminhao: 'DVX-3A21', status: 'agendada', hoje: false, itens: [
        { tipo: 'coleta', cliente: 'Transportadora Bandeirantes', endereco: 'Rod. Euclides da Cunha, km 428', peso: 210 },
        { tipo: 'entrega', cliente: 'Farmácia Bem-Estar', endereco: 'Rua Amazonas, 522', peso: 18 }
      ] }
    ];

    function delay(value, ms) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(value); }, ms || 150);
      });
    }

    return {
      // Quando o backend entrar, isso vira um fetch() filtrado pelo
      // motorista logado, trazendo as cargas da semana corrente.
      cargasSemana: function () {
        return delay(JSON.parse(JSON.stringify(CARGAS_SEMANA)));
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