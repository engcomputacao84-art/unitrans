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
  // CAMADA DE DADOS — RotasService — API real (Supabase)
  // Cada "rota" na tela do motorista é uma carga (cargas) com suas
  // paradas (paradas). Como ainda não existe login, o id do motorista
  // logado é lido de localStorage — o mesmo mecanismo usado em carga.js.
  // =================================================================
  var RotasService = (function () {
    var API_BASE = '/api';
    var motoristaId = localStorage.getItem('unitrans_motorista_id') ||
      new URLSearchParams(location.search).get('motoristaId');

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
      if (partes.length === 3) return partes[2] + '/' + partes[1] + '/' + partes[0];
      return dataStr;
    }

    return {
      listar: function () {
        if (!motoristaId) {
          return Promise.reject(new Error('Motorista não identificado (login ainda não implementado).'));
        }
        return fetch(API_BASE + '/cargas?motoristaId=' + encodeURIComponent(motoristaId))
          .then(tratar)
          .then(function (cargas) {
            return Promise.all(cargas.map(function (c) {
              return fetch(API_BASE + '/paradas?cargaId=' + c.id).then(tratar).then(function (paradas) {
                return {
                  id: c.id,
                  veiculo: c.caminhaoLabel,
                  cargaId: c.id,
                  status: c.status,
                  statusInfo: STATUS_LABEL[c.status] || { cls: 'b-pendente', label: c.status },
                  data: c.data,
                  dataFormatada: formatarData(c.data),
                  paradas: paradas.length,
                  concluidas: paradas.filter(function (p) { return p.status === 'concluida'; }).length
                };
              });
            }));
          });
      },

      listarParadas: function (rotaId) {
        return fetch(API_BASE + '/paradas?cargaId=' + rotaId).then(tratar).then(function (paradas) {
          return paradas.map(function (p) {
            return {
              id: p.id,
              endereco: p.endereco,
              cliente: p.cliente,
              tipo: p.tipo === 'coleta' ? 'Coleta' : 'Entrega',
              hora: p.horaPrevista,
              done: p.status === 'concluida'
            };
          });
        });
      },

      // Só é possível marcar como concluída (a API não tem "desfazer
      // entrega" — clicar numa parada já concluída não faz nada).
      alternarParada: function (rotaId, paradaId, jaConcluida) {
        if (jaConcluida) return Promise.resolve({ ok: true });
        return fetch(API_BASE + '/paradas/' + paradaId + '/concluir', { method: 'PATCH' }).then(tratar);
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
    }).catch(function (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="7" class="mono">Não foi possível carregar as rotas.</td></tr>';
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
          var paradaAtual = paradas.find(function (p) { return String(p.id) === String(paradaId); });
          RotasService.alternarParada(rotaAtualId, paradaId, paradaAtual && paradaAtual.done).then(function () {
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
