(function () {
  var cargaRows = document.querySelectorAll('.carga-row[data-carga-row]');

  function atualizarStatusCarga(row, detalhes) {
    var iconeCell = row.querySelector('.carga-status-icon');
    if (!iconeCell) return;

    var linhas = detalhes.querySelectorAll('table tbody tr[data-status]');
    var temOcorrencia = false;
    linhas.forEach(function (tr) {
      if (tr.dataset.status === 'ocorrencia') temOcorrencia = true;
    });

    if (temOcorrencia) {
      iconeCell.classList.add('status-warn');
      iconeCell.classList.remove('status-ok');
      iconeCell.innerHTML = '<i class="fas fa-check-circle" title="Carga concluída com ocorrência em ao menos uma parada"></i>';
    } else {
      iconeCell.classList.add('status-ok');
      iconeCell.classList.remove('status-warn');
      iconeCell.innerHTML = '<i class="fas fa-check-circle" title="Carga concluída sem ocorrências"></i>';
    }
  }

  function fecharTodasMenosEssa(cargaAtual) {
    cargaRows.forEach(function (row) {
      if (row === cargaAtual) return;
      var codigo = row.dataset.cargaRow;
      var detalhes = document.querySelector('.carga-details-row[data-carga-details="' + codigo + '"]');
      row.classList.remove('open');
      if (detalhes) detalhes.hidden = true;
    });
  }

  cargaRows.forEach(function (row) {
    var codigo = row.dataset.cargaRow;
    var detalhes = document.querySelector('.carga-details-row[data-carga-details="' + codigo + '"]');
    if (!detalhes) return;

    atualizarStatusCarga(row, detalhes);

    row.addEventListener('click', function () {
      var estaAberta = row.classList.contains('open');

      // fecha as outras cargas abertas (accordion: só uma por vez)
      fecharTodasMenosEssa(row);

      if (estaAberta) {
        row.classList.remove('open');
        detalhes.hidden = true;
      } else {
        row.classList.add('open');
        detalhes.hidden = false;
      }
    });
  });

  // ===== Busca (fora do dropdown) escopada em todas as cargas =====
  var buscaInput = document.getElementById('buscaParadas');
  var buscaVazia = document.getElementById('buscaVazia');

  function normalizar(txt) {
    return (txt || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function textoDaLinha(tr) {
    return normalizar(tr.textContent);
  }

  function aplicarBusca() {
    var termo = normalizar(buscaInput ? buscaInput.value.trim() : '');
    var algumaCargaVisivel = false;

    cargaRows.forEach(function (row) {
      var codigo = row.dataset.cargaRow;
      var detalhes = document.querySelector('.carga-details-row[data-carga-details="' + codigo + '"]');
      if (!detalhes) return;

      var linhas = detalhes.querySelectorAll('table tbody tr[data-status]');
      var algumaLinhaVisivel = false;

      if (termo === '') {
        linhas.forEach(function (tr) { tr.style.display = ''; });
        row.style.display = '';
        algumaCargaVisivel = true;
        // sem busca ativa: não força abrir/fechar, mantém como está
        return;
      }

      linhas.forEach(function (tr) {
        var bate = textoDaLinha(tr).indexOf(termo) !== -1;
        tr.style.display = bate ? '' : 'none';
        if (bate) algumaLinhaVisivel = true;
      });

      if (algumaLinhaVisivel) {
        row.style.display = '';
        row.classList.add('open');
        detalhes.hidden = false;
        algumaCargaVisivel = true;
      } else {
        row.style.display = 'none';
        row.classList.remove('open');
        detalhes.hidden = true;
      }
    });

    if (buscaVazia) buscaVazia.classList.toggle('show', termo !== '' && !algumaCargaVisivel);
  }

  if (buscaInput) {
    buscaInput.addEventListener('input', aplicarBusca);
  }
})();

(function () {
  var overlay = document.getElementById('ocorrenciaModalOverlay');
  var fecharBtn = document.getElementById('fecharOcorrenciaModal');
  var tituloEl = document.getElementById('ocorrenciaTitulo');
  var subEl = document.getElementById('ocorrenciaSub');
  var gridEl = document.getElementById('ocorrenciaGrid');
  var obsEl = document.getElementById('ocorrenciaObsTexto');
  if (!overlay || !gridEl) return;

  function campo(label, value) {
    return (
      '<div class="ocorrencia-item">' +
        '<div class="label">' + label + '</div>' +
        '<div class="value">' + value + '</div>' +
      '</div>'
    );
  }

  function abrirOcorrencia(btn) {
    var d = btn.dataset;

    tituloEl.textContent = d.parada + ' · ocorrência na parada';
    subEl.textContent = d.rota + ' · ' + d.motorista + ' · ' + d.veiculo;

    gridEl.innerHTML =
      campo('Parada', d.parada) +
      campo('Solicitação', d.solicitacao) +
      campo('Carga', d.carga) +
      campo('Rota', d.rota) +
      campo('Motorista / Veículo', d.motorista + ' · ' + d.veiculo) +
      campo('Cliente', d.cliente) +
      campo('Endereço', d.endereco) +
      campo('Horário previsto', d.horario);

    obsEl.textContent = d.observacao || 'Nenhuma observação registrada.';

    overlay.classList.add('open');
  }

  function fecharOcorrencia() {
    overlay.classList.remove('open');
  }

  document.querySelectorAll('.btn-ver-ocorrencia').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); // não deixa o clique borbulhar pro accordion nem pro filtro
      abrirOcorrencia(btn);
    });
  });

  if (fecharBtn) fecharBtn.addEventListener('click', fecharOcorrencia);
  Utils.ligarFechamentoModal(overlay, fecharOcorrencia);
})();