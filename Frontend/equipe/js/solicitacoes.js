(function () {
  // ---------- API real (Supabase) ----------
  var API_BASE = 'http://localhost:3000/api';
  // TODO: sem login/sessão ainda — id do analista fica em localStorage.
  var analistaId = localStorage.getItem('unitrans_analista_id') || null;

  var PERIODO_LABEL = { manha: 'Manhã', tarde: 'Tarde' };

  function tratar(res) {
    return res.json().then(function (corpo) {
      if (!res.ok) throw new Error(corpo.erro || 'Erro ao comunicar com a API.');
      return corpo;
    });
  }

  function formatarDataCurta(dataISO) {
    if (!dataISO) return '—';
    var p = dataISO.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] : dataISO;
  }
  function formatarDataLonga(dataISO) {
    if (!dataISO) return '—';
    var p = dataISO.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : dataISO;
  }
  function formatarDataHora(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString('pt-BR');
  }

  // Converte o formato da API pro formato que esta tela já sabia renderizar.
  function paraTela(s) {
    return {
      numId: s.id,
      id: 'SL-' + String(s.id).padStart(4, '0'),
      cliente: s.cliente,
      enderecoColeta: s.enderecoColeta,
      enderecoEntrega: s.enderecoEntrega,
      dataDesejo: formatarDataCurta(s.dataDesejo) + ' · ' + (PERIODO_LABEL[s.periodoColeta] || s.periodoColeta || '—').toLowerCase(),
      status: s.status,
      criadoEm: formatarDataHora(s.criadoEm),
      documento: s.documento,
      telefone: s.telefone,
      email: s.email,
      cidadeColeta: '—',
      cidadeEntrega: '—',
      dataDesejoLonga: formatarDataLonga(s.dataDesejo),
      periodoColeta: PERIODO_LABEL[s.periodoColeta] || s.periodoColeta,
      periodoEntrega: PERIODO_LABEL[s.periodoEntrega] || s.periodoEntrega,
      tipoCarga: s.tipoCarga,
      peso: s.peso != null ? s.peso + 'kg' : '—',
      volume: s.volume != null ? s.volume + 'm³' : '—',
      valorDeclarado: s.valorDeclarado != null ? 'R$ ' + Number(s.valorDeclarado).toLocaleString('pt-BR') : '—',
      observacoes: s.observacoes,
      motivoRecusa: s.motivoRecusa
    };
  }

  var solicitacoes = [];

  function carregarSolicitacoes() {
    return fetch(API_BASE + '/solicitacoes')
      .then(tratar)
      .then(function (lista) {
        solicitacoes = lista.map(paraTela);
      })
      .catch(function (err) {
        console.error(err);
        UI.toast('Não foi possível carregar as solicitações.', 'error');
        solicitacoes = [];
      });
  }

  // ---------- REFERÊNCIAS ----------
  const tbody = document.getElementById('tableBody');
  const filterChips = document.querySelectorAll('#filterToolbar .chip');
  const rejectModal = document.getElementById('rejectModal');
  const closeRejectBtn = document.getElementById('closeRejectBtn');
  const cancelRejectBtn = document.getElementById('cancelRejectBtn');
  const confirmRejectBtn = document.getElementById('confirmRejectBtn');
  const motivoRecusa = document.getElementById('motivoRecusa');
  const detalheOverlay = document.getElementById('detalheModalOverlay');
  const closeDetalheBtn = document.getElementById('closeDetalheBtn');
  const detalheFechar = document.getElementById('detalheFechar');

  let currentFilter = 'all';
  let currentRejectId = null;

  // ---------- FUNÇÕES AUXILIARES ----------
  function $(id) { return document.getElementById(id); }

  // ---------- RENDER TABELA ----------
  function renderTable(filter = 'all') {
    const filtered = filter === 'all' ? solicitacoes : solicitacoes.filter(s => s.status === filter);
    
    // Atualiza contagens
    document.getElementById('filterCountAll').textContent = solicitacoes.length;
    document.getElementById('filterCountPendente').textContent = solicitacoes.filter(s => s.status === 'pendente').length;
    document.getElementById('filterCountAprovado').textContent = solicitacoes.filter(s => s.status === 'aprovado').length;
    document.getElementById('filterCountEmCarga').textContent = solicitacoes.filter(s => s.status === 'em_carga').length;
    document.getElementById('filterCountEmRota').textContent = solicitacoes.filter(s => s.status === 'em_rota').length;
    document.getElementById('filterCountConcluido').textContent = solicitacoes.filter(s => s.status === 'concluido').length;
    document.getElementById('filterCountRecusado').textContent = solicitacoes.filter(s => s.status === 'recusado').length;

    tbody.innerHTML = '';
    filtered.forEach(s => {
      const statusMap = { pendente: 'Pendente', aprovado: 'Aprovado', em_carga: 'Em carga', em_rota: 'Em rota de entrega', concluido: 'Concluído', recusado: 'Recusado' };
      const badgeClass = { pendente: 'b-pendente', aprovado: 'b-aprovado', em_carga: 'b-carga', em_rota: 'b-rota', concluido: 'b-concluida', recusado: 'b-recusado' }[s.status] || 'b-pendente';

      // Apenas solicitações pendentes têm ações de aprovar/recusar.
      // Qualquer outro status mostra somente o ícone de detalhamento (⋯)
      const actionsHtml = s.status === 'pendente' ? `
          <span class="icon-btn approve" data-id="${s.id}" data-action="approve" title="Aprovar"><i class="fas fa-check"></i></span>
          <span class="icon-btn reject" data-id="${s.id}" data-action="reject" title="Recusar"><i class="fas fa-times"></i></span>
        ` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${s.id}</td>
        <td class="cell-strong">${s.cliente}</td>
        <td>${s.enderecoColeta}</td>
        <td>${s.enderecoEntrega}</td>
        <td>${s.dataDesejo}</td>
        <td><span class="badge ${badgeClass}">${statusMap[s.status]}</span></td>
        <td>
          <div class="row-actions">
            ${actionsHtml}
            <span class="icon-btn" data-id="${s.id}" data-action="detail" title="Detalhes"><i class="fas fa-ellipsis-h"></i></span>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos dos botões
    document.querySelectorAll('#tableBody .icon-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        const action = this.dataset.action;
        if (action === 'detail') {
          const data = solicitacoes.find(s => s.id === id);
          if (data) openDetalhe(data);
        } else if (action === 'approve') {
          UI.confirmar({
            title: 'Aprovar solicitação',
            message: 'Aprovar solicitação ' + id + '?',
            confirmLabel: 'Aprovar'
          }).then(function (ok) {
            if (!ok) return;
            var item = solicitacoes.find(s => s.id === id);
            if (!item) return;
            fetch(API_BASE + '/solicitacoes/' + item.numId + '/aprovar', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ analistaId: analistaId })
            }).then(tratar).then(function () {
              return carregarSolicitacoes();
            }).then(function () {
              renderTable(currentFilter);
              UI.toast('Solicitação ' + id + ' aprovada com sucesso!');
            }).catch(function (err) {
              console.error(err);
              UI.toast(err.message || 'Não foi possível aprovar a solicitação.', 'error');
            });
          });
        } else if (action === 'reject') {
          currentRejectId = id;
          motivoRecusa.value = '';
          rejectModal.classList.add('open');
        }
      });
    });
  }

  // ---------- MODAL RECUSA ----------
  function closeRejectModal() { 
    rejectModal.classList.remove('open'); 
    currentRejectId = null; 
  }
  closeRejectBtn.addEventListener('click', closeRejectModal);
  cancelRejectBtn.addEventListener('click', closeRejectModal);
  Utils.ligarFechamentoModal(rejectModal, closeRejectModal);
  confirmRejectBtn.addEventListener('click', function() {
    if (!currentRejectId) return;
    const motivo = motivoRecusa.value.trim() || 'Motivo não informado';
    const item = solicitacoes.find(s => s.id === currentRejectId);
    if (!item) return;
    fetch(API_BASE + '/solicitacoes/' + item.numId + '/recusar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analistaId: analistaId, motivo: motivo })
    }).then(tratar).then(function () {
      return carregarSolicitacoes();
    }).then(function () {
      renderTable(currentFilter);
      UI.toast('Solicitação ' + currentRejectId + ' recusada.', 'error');
    }).catch(function (err) {
      console.error(err);
      UI.toast(err.message || 'Não foi possível recusar a solicitação.', 'error');
    }).finally(function () {
      closeRejectModal();
    });
  });

  // ---------- MODAL DETALHE (leitura) ----------
  function openDetalhe(data) {
    $('detalheId').textContent = data.id;
    const statusMap = { pendente: 'Pendente', aprovado: 'Aprovado', em_carga: 'Em carga', em_rota: 'Em rota de entrega', concluido: 'Concluído', recusado: 'Recusado' };
    const el = $('detalheStatus');
    el.textContent = statusMap[data.status] || 'Pendente';
    el.className = 'detalhe-status ' + data.status;

    $('detalheCriado').textContent = data.criadoEm || '—';
    
    $('detalheSolicitante').innerHTML = `
      <div><span>Nome</span><span>${data.cliente}</span></div>
      <div><span>Documento</span><span>${data.documento || '—'}</span></div>
      <div><span>Telefone</span><span>${data.telefone || '—'}</span></div>
      <div><span>E-mail</span><span>${data.email || '—'}</span></div>
    `;
    $('detalheColeta').innerHTML = `
      <div><span>Endereço</span><span>${data.enderecoColeta}</span></div>
      <div><span>Cidade/UF</span><span>${data.cidadeColeta || '—'}</span></div>
      <div><span>Data desejo</span><span>${data.dataDesejo}</span></div>
      <div><span>Período</span><span>${data.periodoColeta || '—'}</span></div>
    `;
    $('detalheEntrega').innerHTML = `
      <div><span>Endereço</span><span>${data.enderecoEntrega}</span></div>
      <div><span>Cidade/UF</span><span>${data.cidadeEntrega || '—'}</span></div>
      <div><span>Data desejo</span><span>${data.dataDesejo}</span></div>
      <div><span>Período</span><span>${data.periodoEntrega || '—'}</span></div>
    `;
    $('detalheCarga').innerHTML = `
      <div><span>Tipo</span><span>${data.tipoCarga || '—'}</span></div>
      <div><span>Peso</span><span>${data.peso || '—'}</span></div>
      <div><span>Volume</span><span>${data.volume || '—'}</span></div>
      <div><span>Valor declarado</span><span>${data.valorDeclarado || '—'}</span></div>
    `;
    
    let obsText = data.observacoes || 'Nenhuma observação';
    if (data.status === 'recusado' && data.motivoRecusa) {
      obsText = 'Motivo da recusa: ' + data.motivoRecusa;
    }
    $('detalheObs').textContent = obsText;
    
    detalheOverlay.classList.add('open');
  }

  function closeDetalhe() { 
    detalheOverlay.classList.remove('open'); 
  }
  closeDetalheBtn.addEventListener('click', closeDetalhe);
  detalheFechar.addEventListener('click', closeDetalhe);
  Utils.ligarFechamentoModal(detalheOverlay, closeDetalhe);

  // ---------- FILTROS ----------
  filterChips.forEach(chip => {
    chip.addEventListener('click', function() {
      filterChips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTable(currentFilter);
    });
  });

  // ---------- WIZARD (NOVA SOLICITAÇÃO) ----------
  const overlay = document.getElementById('modalOverlay');
  const openBtn = document.getElementById('openModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const btnNovaOutra = document.getElementById('btnNovaOutra');

  function openModal() {
    overlay.classList.add('open');
    const confirmView = $('confirmView');
    const wizardCard = $('wizardCard');
    if (confirmView.classList.contains('active')) {
      confirmView.classList.remove('active');
      wizardCard.classList.remove('hidden');
    }
    goToStep(1);
  }
  function closeModal() { overlay.classList.remove('open'); }
  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  Utils.ligarFechamentoModal(overlay, closeModal);

  // Wizard steps
  let currentStep = 1;
  const totalSteps = 5;
  function goToStep(step) {
    document.querySelectorAll('.wstep').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    document.querySelectorAll('.progress-step').forEach(el => {
      const n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
    if (step === totalSteps) buildReview();
    currentStep = step;
    const btnVoltar = $('btnVoltar');
    const btnAvancar = $('btnAvancar');
    const btnEnviar = $('btnEnviar');
    if (btnVoltar) btnVoltar.disabled = step === 1;
    if (btnAvancar) btnAvancar.style.display = step === totalSteps ? 'none' : 'inline-flex';
    if (btnEnviar) btnEnviar.style.display = step === totalSteps ? 'inline-flex' : 'none';
  }

  function validateStep(step) {
    const stepFields = {
      1: ['nome', 'documento', 'telefone', 'email'],
      2: ['cepColeta', 'enderecoColeta', 'numeroColeta', 'cidadeColeta', 'ufColeta', 'dataColeta', 'periodoColeta'],
      3: ['cepEntrega', 'enderecoEntrega', 'numeroEntrega', 'cidadeEntrega', 'ufEntrega', 'dataEntrega', 'periodoEntrega'],
      4: ['tipoCarga'],
      5: []
    };
    let ok = true;
    (stepFields[step] || []).forEach(id => {
      const input = $(id);
      if (!input) return;
      const field = input.closest('.field');
      let filled = input.value.trim().length > 0;
      if (input.tagName === 'SELECT') filled = input.value !== '';
      if (field) field.classList.toggle('invalid', !filled);
      if (!filled) ok = false;
    });
    return ok;
  }

  function next() {
    if (!validateStep(currentStep)) {
      const firstInvalid = document.querySelector('.wstep.active .field.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (currentStep < totalSteps) goToStep(currentStep + 1);
  }
  function prev() { if (currentStep > 1) goToStep(currentStep - 1); }

  document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', next));
  document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', prev));

  // Remover erro ao digitar
  document.querySelectorAll('#requestForm input, #requestForm select, #requestForm textarea').forEach(el => {
    el.addEventListener('input', function() {
      const field = el.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  // CEP lookup (simplificado)
  function setupCepLookup(prefix) {
    const cepInput = $('cep' + prefix);
    if (!cepInput) return;
    cepInput.addEventListener('blur', function() {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length !== 8) return;
      Utils.buscarCep(cep)
        .then(data => {
          const endereco = $('endereco' + prefix);
          const cidade = $('cidade' + prefix);
          const uf = $('uf' + prefix);
          if (endereco) endereco.value = [data.logradouro, data.bairro].filter(Boolean).join(', ');
          if (cidade) cidade.value = data.localidade || '';
          if (uf) uf.value = data.uf || '';
        })
        .catch(() => {});
    });
  }
  setupCepLookup('Coleta');
  setupCepLookup('Entrega');

  // Máscaras (definidas em shared/js/utils.js)
  const tel = $('telefone');
  if (tel) Utils.aplicarMascara(tel, Utils.mascaras.telefone);
  const doc = $('documento');
  if (doc) Utils.aplicarMascara(doc, Utils.mascaras.documento);
  const cep1 = $('cepColeta');
  const cep2 = $('cepEntrega');
  [cep1, cep2].forEach(inp => {
    if (inp) Utils.aplicarMascara(inp, Utils.mascaras.cep);
  });

  const fmtData = Utils.formatarData;
  function val(id) { const el = $(id); return el ? el.value : ''; }
  function row(label, value) { return '<div><span>' + label + '</span><span>' + (value || '—') + '</span></div>'; }
  function getPeriodLabel(value) {
    const map = { manha: 'Manhã (7h às 12h)', tarde: 'Tarde (13h às 18h)', sem_preferencia: 'Sem preferência' };
    return map[value] || value || '—';
  }

  function buildReview() {
    const solicitante = $('reviewSolicitante');
    const coleta = $('reviewColeta');
    const entrega = $('reviewEntrega');
    const carga = $('reviewCarga');
    if (solicitante) {
      solicitante.innerHTML = row('Nome / razão social', val('nome')) + row('CPF/CNPJ', val('documento')) + row('Telefone', val('telefone')) + row('E-mail', val('email'));
    }
    if (coleta) {
      coleta.innerHTML = row('Endereço', val('enderecoColeta') + ', ' + val('numeroColeta')) + row('Cidade/UF', val('cidadeColeta') + '/' + val('ufColeta')) + row('Data desejada', fmtData(val('dataColeta'))) + row('Período', getPeriodLabel(val('periodoColeta')));
    }
    if (entrega) {
      entrega.innerHTML = row('Endereço', val('enderecoEntrega') + ', ' + val('numeroEntrega')) + row('Cidade/UF', val('cidadeEntrega') + '/' + val('ufEntrega')) + row('Data desejada', fmtData(val('dataEntrega'))) + row('Período', getPeriodLabel(val('periodoEntrega')));
    }
    if (carga) {
      const tipoCargaEl = $('tipoCarga');
      const tipoCargaLabel = tipoCargaEl ? tipoCargaEl.options[tipoCargaEl.selectedIndex].text : '';
      carga.innerHTML = row('Tipo de carga', tipoCargaLabel) + (val('peso') ? row('Peso aprox.', val('peso') + ' kg') : '') + (val('volume') ? row('Volume', val('volume') + ' m³') : '') + (val('valorDeclarado') ? row('Valor declarado', 'R$ ' + val('valorDeclarado')) : '');
    }
  }

  const form = $('requestForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!validateStep(5)) return;
      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) return;

      // ATENÇÃO: no banco, toda solicitação pertence a um cliente já
      // cadastrado (solicitacoes.cliente_id). Este wizard hoje coleta
      // nome/documento/telefone/email como se fosse um cliente novo,
      // então ainda NÃO está ligado à API — falta um passo de "buscar
      // cliente existente" (ex.: reaproveitando a busca da tela de
      // Clientes) antes de dar POST em /api/solicitacoes.
      UI.toast('Cadastro de solicitação pela equipe ainda não está ligado ao banco — falta escolher o cliente já cadastrado.', 'error');
    });
  }

  function resetForm() {
    if (form) {
      form.reset();
      $('wizardCard').classList.remove('hidden');
      $('confirmView').classList.remove('active');
      document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
      document.querySelectorAll('.cep-status').forEach(s => { s.textContent = ''; s.className = 'cep-status'; });
      goToStep(1);
    }
  }
  if (btnNovaOutra) btnNovaOutra.addEventListener('click', resetForm);

  // ---------- INICIALIZAR ----------
  goToStep(1);
  carregarSolicitacoes().then(function () { renderTable('all'); });
})();