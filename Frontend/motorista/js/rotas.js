(function () {
  var tableBody = document.getElementById('rotasTableBody');
  var tituloEl = document.getElementById('rotaDetalheTitulo');
  var subEl = document.getElementById('rotaDetalheSub');
  var stopListEl = document.getElementById('stopList');
  var rotaModalOverlay = document.getElementById('rotaModalOverlay');
  var fecharRotaModalBtn = document.getElementById('fecharRotaModal');
  var filterChips = document.querySelectorAll('#filterToolbarRotas .chip');

  if (!tableBody || !stopListEl) return;

  // =================================================================
  // CAMADA DE DADOS — RotasService (mock local, escopo do motorista logado)
  // Quando o backend entrar, troca-se o corpo de cada função por um
  // fetch() filtrado pelo motorista autenticado.
  // =================================================================
  var RotasService = (function () {
    var ROTAS = [
      { id: 'RT-0512', veiculo: 'Fiorino · DVX-3A21', cargaId: 'C-0510', status: 'andamento', data: '2026-08-25' },
      { id: 'RT-0515', veiculo: 'Fiorino · DVX-3A21', cargaId: 'C-0511', status: 'andamento', data: '2026-08-25' },
      { id: 'RT-0509', veiculo: 'Fiorino · DVX-3A21', cargaId: 'C-0507', status: 'concluida', data: '2026-08-24' },
      { id: 'RT-0521', veiculo: 'Fiorino · DVX-3A21', cargaId: 'C-0518', status: 'pendente', data: '2026-08-26' }
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
      'RT-0515': [
        { id: 'p1', endereco: 'Av. Juscelino Kubitschek, 220', cliente: 'Restaurante Sabor Caseiro', tipo: 'Coleta', hora: '08:05', done: true },
        { id: 'p2', endereco: 'Rua Marechal Deodoro, 640', cliente: 'Loja Utilidades Lar', tipo: 'Entrega', hora: '08:35', done: true },
        { id: 'p3', endereco: 'Av. Philadelpho Gouvêa Netto, 1900', cliente: 'Pet Shop Amigo Fiel', tipo: 'Entrega', hora: '09:10', done: false },
        { id: 'p4', endereco: 'Rua São Paulo, 310', cliente: 'Ótica Novo Olhar', tipo: 'Coleta', hora: '09:45', done: false },
        { id: 'p5', endereco: 'Av. Danilo Galeazzi, 1500', cliente: 'Mercearia Boa Vista', tipo: 'Entrega', hora: '10:15', done: false }
      ],
      'RT-0509': [
        { id: 'p1', endereco: 'Av. Alberto Andaló, 2900', cliente: 'Loja Modas Elegance', tipo: 'Coleta', hora: '08:00', done: true },
        { id: 'p2', endereco: 'Rua Bahia, 522', cliente: 'Distribuidora Center Norte', tipo: 'Coleta', hora: '08:35', done: true },
        { id: 'p3', endereco: 'Rua Amazonas, 970', cliente: 'Farmácia Vida', tipo: 'Entrega', hora: '09:05', done: true },
        { id: 'p4', endereco: 'Av. Philadelpho Gouvêa Netto, 700', cliente: 'Auto Peças Rio Preto', tipo: 'Coleta', hora: '09:40', done: true }
      ],
      'RT-0521': [
        { id: 'p1', endereco: 'Rua Pernambuco, 77', cliente: 'Papelaria Escreva Bem', tipo: 'Coleta', hora: '08:00', done: false },
        { id: 'p2', endereco: 'Rod. Washington Luís, km 5', cliente: 'Depósito Constrular', tipo: 'Entrega', hora: '08:40', done: false },
        { id: 'p3', endereco: 'Rua Amazonas, 700', cliente: 'Loja Moda Jovem', tipo: 'Coleta', hora: '09:10', done: false }
      ]
    };

    function delay(value, ms) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(value); }, ms || 150);
      });
    }

    function formatarData(dataStr) {
      if (!dataStr) return '—';
      var partes = dataStr.split('-');
      if (partes.length === 3) return partes[2] + '/' + partes[1] + '/' + partes[0];
      return dataStr;
    }

    function recalcularStatus(rotaId) {
      var rota = ROTAS.find(function (r) { return r.id === rotaId; });
      var paradas = PARADAS[rotaId] || [];
      if (!rota || !paradas.length) return;
      var concluidas = paradas.filter(function (p) { return p.done; }).length;
      if (concluidas === 0) rota.status = rota.status === 'concluida' ? 'concluida' : 'pendente';
      else if (concluidas === paradas.length) rota.status = 'concluida';
      else rota.status = 'andamento';
    }

    return {
      listar: function () {
        return delay(ROTAS.map(function (r) {
          return {
            id: r.id,
            veiculo: r.veiculo,
            cargaId: r.cargaId,
            status: r.status,
            statusInfo: STATUS_LABEL[r.status],
            data: r.data,
            dataFormatada: formatarData(r.data),
            paradas: (PARADAS[r.id] || []).length,
            concluidas: (PARADAS[r.id] || []).filter(function (p) { return p.done; }).length
          };
        }));
      },

      listarParadas: function (rotaId) {
        return delay(JSON.parse(JSON.stringify(PARADAS[rotaId] || [])));
      },

      alternarParada: function (rotaId, paradaId) {
        var paradas = PARADAS[rotaId] || [];
        var parada = paradas.find(function (p) { return p.id === paradaId; });
        if (parada) parada.done = !parada.done;
        recalcularStatus(rotaId);
        return delay({ ok: true }, 120);
      }
    };
  })();

  var currentFilter = 'all';
  var rotasCache = [];
  var rotaAtualId = null;

  function rotaById(id) {
    return rotasCache.find(function (r) { return r.id === id; });
  }

  function renderTabela() {
    RotasService.listar().then(function (rotas) {
      rotasCache = rotas;

      document.getElementById('filterCountAllRotas').textContent = rotas.length;
      document.getElementById('filterCountPendenteRotas').textContent = rotas.filter(function (r) { return r.status === 'pendente'; }).length;
      document.getElementById('filterCountAndamentoRotas').textContent = rotas.filter(function (r) { return r.status === 'andamento'; }).length;
      document.getElementById('filterCountConcluidaRotas').textContent = rotas.filter(function (r) { return r.status === 'concluida'; }).length;

      var filtradas = currentFilter === 'all' ? rotas : rotas.filter(function (r) { return r.status === currentFilter; });

      if (!filtradas.length) {
        tableBody.innerHTML = '<tr><td colspan="7" class="mono">Nenhuma rota encontrada.</td></tr>';
        return;
      }

      tableBody.innerHTML = filtradas.map(function (r) {
        return '' +
          '<tr>' +
            '<td class="mono">' + r.id + '</td>' +
            '<td>' + r.veiculo + '</td>' +
            '<td class="mono">' + r.dataFormatada + '</td>' +
            '<td>' + r.paradas + ' paradas</td>' +
            '<td>' + r.concluidas + ' / ' + r.paradas + '</td>' +
            '<td><span class="badge ' + r.statusInfo.cls + '">' + r.statusInfo.label + '</span></td>' +
            '<td><button class="btn btn-ghost btn-sm" data-ver-rota="' + r.id + '"><i class="fas fa-eye"></i> Ver paradas</button></td>' +
          '</tr>';
      }).join('');

      tableBody.querySelectorAll('[data-ver-rota]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          abrirRota(btn.dataset.verRota);
        });
      });
    });
  }

  function abrirRota(rotaId) {
    rotaAtualId = rotaId;
    var rota = rotaById(rotaId);
    tituloEl.textContent = 'Sequência de paradas · ' + rotaId;
    subEl.textContent = rota ? (rota.veiculo + ' · ' + rota.dataFormatada) : '';
    renderParadas();
    if (rotaModalOverlay) rotaModalOverlay.classList.add('open');
  }

  function fecharRotaModal() {
    if (rotaModalOverlay) rotaModalOverlay.classList.remove('open');
  }

  if (fecharRotaModalBtn) fecharRotaModalBtn.addEventListener('click', fecharRotaModal);
  Utils.ligarFechamentoModal(rotaModalOverlay, fecharRotaModal);

  function renderParadas() {
    RotasService.listarParadas(rotaAtualId).then(function (paradas) {
      if (!paradas.length) {
        stopListEl.innerHTML = '<div class="sub" style="padding:14px 0;">Nenhuma parada cadastrada nesta rota.</div>';
        return;
      }
      stopListEl.innerHTML = paradas.map(function (p) {
        var tipoIcon = p.tipo === 'Coleta' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
        return '' +
          '<div class="stop" data-stop="' + p.id + '" style="cursor:pointer;">' +
            '<div class="stop-dot' + (p.done ? ' done' : '') + '"></div>' +
            '<div><div class="stop-addr">' + p.endereco + '</div><div class="stop-client">' + tipoIcon + ' ' + p.cliente + ' · ' + p.tipo + '</div></div>' +
            '<div class="stop-time">' + p.hora + '</div>' +
          '</div>';
      }).join('');

      stopListEl.querySelectorAll('[data-stop]').forEach(function (el) {
        el.addEventListener('click', function () {
          var paradaId = el.dataset.stop;
          RotasService.alternarParada(rotaAtualId, paradaId).then(function () {
            renderParadas();
          });
        });
      });
    });
  }

  filterChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      filterChips.forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTabela();
    });
  });

  renderTabela();
})();
