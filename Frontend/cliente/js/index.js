(function() {
    // ---------- API real (Supabase) ----------
    // TODO: ainda não existe login/sessão no backend. Enquanto isso não
    // for implementado, o id do cliente logado fica salvo em localStorage
    // (é o "usuario_id" dele nas tabelas usuarios/clientes) — mesmo
    // mecanismo usado no restante do painel do cliente e no app do motorista.
    var API_BASE = '/api';
    var clienteId = localStorage.getItem('unitrans_cliente_id') ||
      new URLSearchParams(location.search).get('clienteId');

    // ---------- ABRIR/FECHAR MODAL ----------
    const overlay = document.getElementById('modalOverlay');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');

    function openModal() {
      overlay.classList.add('open');
      const confirmView = document.getElementById('confirmView');
      const wizardCard = document.getElementById('wizardCard');
      if (confirmView.classList.contains('active')) {
        confirmView.classList.remove('active');
        wizardCard.classList.remove('hidden');
      }
      goToStep(1);
    }
    function closeModal() {
      overlay.classList.remove('open');
    }
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    Utils.ligarFechamentoModal(overlay, closeModal);

    // ---------- WIZARD LOGIC ----------
    const totalSteps = 4;
    let currentStep = 1;
    const stepFields = {
      1: ['nome', 'documento', 'telefone', 'email'],
      2: ['cepColeta', 'enderecoColeta', 'numeroColeta', 'cidadeColeta', 'ufColeta', 'dataColeta', 'periodoColeta'],
      3: ['cepEntrega', 'enderecoEntrega', 'numeroEntrega', 'cidadeEntrega', 'ufEntrega', 'dataEntrega', 'periodoEntrega', 'tipoCarga'],
      4: []
    };

    function $(id) { return document.getElementById(id); }

    function goToStep(step) {
      document.querySelectorAll('.step').forEach(el => {
        el.classList.toggle('active', Number(el.dataset.step) === step);
      });
      document.querySelectorAll('.progress-step').forEach(el => {
        const n = Number(el.dataset.step);
        el.classList.toggle('active', n === step);
        el.classList.toggle('done', n < step);
      });
      if (step === totalSteps) buildReview();
      currentStep = step;
      const btnVoltar = document.getElementById('btnVoltar');
      const btnAvancar = document.getElementById('btnAvancar');
      const btnEnviar = document.getElementById('btnEnviar');
      if (btnVoltar) btnVoltar.disabled = step === 1;
      if (btnAvancar) btnAvancar.style.display = step === 4 ? 'none' : 'inline-flex';
      if (btnEnviar) btnEnviar.style.display = step === 4 ? 'inline-flex' : 'none';
    }

    function validateStep(step) {
      let ok = true;
      (stepFields[step] || []).forEach(id => {
        const input = $(id);
        if (!input) return;
        const field = input.closest('.field');
        let filled = input.value.trim().length > 0;
        // Para selects, verifica se não é a opção vazia
        if (input.tagName === 'SELECT') {
          filled = input.value !== '';
        }
        if (field) field.classList.toggle('invalid', !filled);
        if (!filled) ok = false;
      });
      return ok;
    }

    function next() {
      if (!validateStep(currentStep)) {
        const firstInvalid = document.querySelector('.step.active .field.invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (currentStep < totalSteps) goToStep(currentStep + 1);
    }

    function prev() {
      if (currentStep > 1) goToStep(currentStep - 1);
    }

    document.querySelectorAll('[data-next]').forEach(btn => btn.addEventListener('click', next));
    document.querySelectorAll('[data-prev]').forEach(btn => btn.addEventListener('click', prev));

    // remover erro ao digitar
    document.querySelectorAll('#requestForm input, #requestForm select, #requestForm textarea').forEach(el => {
      el.addEventListener('input', function() {
        const field = el.closest('.field');
        if (field) field.classList.remove('invalid');
      });
      el.addEventListener('change', function() {
        const field = el.closest('.field');
        if (field) field.classList.remove('invalid');
      });
    });

    // ---------- CEP lookup ----------
    function setupCepLookup(prefix) {
      const cepInput = $('cep' + prefix);
      const status = $('cepStatus' + prefix);
      if (!cepInput) return;
      cepInput.addEventListener('blur', function() {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        if (status) { status.textContent = 'Buscando endereço…'; status.className = 'cep-status loading'; }
        Utils.buscarCep(cep)
          .then(data => {
            const endereco = $('endereco' + prefix);
            const cidade = $('cidade' + prefix);
            const uf = $('uf' + prefix);
            if (endereco) endereco.value = [data.logradouro, data.bairro].filter(Boolean).join(', ');
            if (cidade) cidade.value = data.localidade || '';
            if (uf) uf.value = data.uf || '';
            if (status) { status.textContent = 'Endereço preenchido automaticamente.'; status.className = 'cep-status'; }
            [endereco, cidade, uf].forEach(f => { if (f) { const field = f.closest('.field'); if (field) field.classList.remove('invalid'); } });
          })
          .catch(err => {
            if (status) {
              status.textContent = err && err.message === 'CEP não encontrado'
                ? 'CEP não encontrado. Preencha manualmente.'
                : 'Erro ao buscar CEP. Preencha manualmente.';
              status.className = 'cep-status error';
            }
          });
      });
    }
    setupCepLookup('Coleta');
    setupCepLookup('Entrega');

    // ---------- MÁSCARAS (definidas em shared/js/utils.js) ----------
    const tel = $('telefone');
    if (tel) Utils.aplicarMascara(tel, Utils.mascaras.telefone);
    const doc = $('documento');
    if (doc) Utils.aplicarMascara(doc, Utils.mascaras.documento);
    const cep1 = $('cepColeta');
    const cep2 = $('cepEntrega');
    [cep1, cep2].forEach(inp => {
      if (inp) Utils.aplicarMascara(inp, Utils.mascaras.cep);
    });

    // ---------- REVISÃO ----------
    const fmtData = Utils.formatarData;
    function val(id) { const el = $(id); return el ? el.value : ''; }
    function row(label, value) {
      return '<div><span>' + label + '</span><span>' + (value || '—') + '</span></div>';
    }

    function getPeriodLabel(value) {
      const map = {
        'manha': 'Manhã (7h às 12h)',
        'tarde': 'Tarde (13h às 18h)',
        'sem_preferencia': 'Sem preferência'
      };
      return map[value] || value || '—';
    }

    function buildReview() {
      const solicitante = $('reviewSolicitante');
      const coleta = $('reviewColeta');
      const entrega = $('reviewEntrega');
      if (solicitante) {
        solicitante.innerHTML =
          row('Nome / razão social', val('nome')) +
          row('CPF/CNPJ', val('documento')) +
          row('Telefone', val('telefone')) +
          row('E-mail', val('email'));
      }
      if (coleta) {
        coleta.innerHTML =
          row('Endereço', val('enderecoColeta') + ', ' + val('numeroColeta')) +
          row('Cidade/UF', val('cidadeColeta') + '/' + val('ufColeta')) +
          row('Data desejada', fmtData(val('dataColeta'))) +
          row('Período', getPeriodLabel(val('periodoColeta')));
      }
      if (entrega) {
        const tipoCargaEl = $('tipoCarga');
        const tipoCargaLabel = tipoCargaEl ? tipoCargaEl.options[tipoCargaEl.selectedIndex].text : '';
        entrega.innerHTML =
          row('Endereço', val('enderecoEntrega') + ', ' + val('numeroEntrega')) +
          row('Cidade/UF', val('cidadeEntrega') + '/' + val('ufEntrega')) +
          row('Data desejada', fmtData(val('dataEntrega'))) +
          row('Período', getPeriodLabel(val('periodoEntrega'))) +
          row('Tipo de carga', tipoCargaLabel) +
          (val('peso') ? row('Peso aprox.', val('peso') + ' kg') : '') +
          (val('volume') ? row('Volume', val('volume') + ' m³') : '') +
          (val('valorDeclarado') ? row('Valor declarado', 'R$ ' + val('valorDeclarado')) : '');
      }
    }

    // ---------- ENVIO ----------
    const form = $('requestForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateStep(4)) return;
        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

        if (!clienteId) {
          UI.toast('Não foi possível identificar seu cadastro. Faça login novamente.', 'error');
          return;
        }

        var dados = {
          clienteId: clienteId,
          coleta: {
            cep: val('cepColeta'), logradouro: val('enderecoColeta'), numero: val('numeroColeta'),
            cidade: val('cidadeColeta'), estado: val('ufColeta')
          },
          entrega: {
            cep: val('cepEntrega'), logradouro: val('enderecoEntrega'), numero: val('numeroEntrega'),
            cidade: val('cidadeEntrega'), estado: val('ufEntrega')
          },
          // O schema tem uma única data desejada (coleta e entrega no
          // mesmo dia, cada uma com seu período) — usamos a data de coleta.
          dataDesejo: val('dataColeta'),
          periodoColeta: val('periodoColeta'),
          periodoEntrega: val('periodoEntrega'),
          tipoCarga: (function () { var el = $('tipoCarga'); return el ? el.options[el.selectedIndex].text : ''; })(),
          peso: val('peso') ? Number(val('peso')) : null,
          volume: val('volume') ? Number(val('volume')) : null,
          valorDeclarado: val('valorDeclarado') ? Number(val('valorDeclarado')) : null,
          observacoes: val('observacoes') || null
        };

        var btnEnviar = $('btnEnviar');
        if (btnEnviar) { btnEnviar.disabled = true; btnEnviar.textContent = 'Enviando...'; }

        fetch(API_BASE + '/solicitacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        })
          .then(function (res) {
            return res.json().then(function (corpo) {
              if (!res.ok) throw new Error(corpo.erro || 'Não foi possível registrar a solicitação.');
              return corpo;
            });
          })
          .then(function (solicitacao) {
            var protocolo = 'SL-' + String(solicitacao.id).padStart(4, '0');
            $('protocolNum').textContent = protocolo;
            $('summaryList').innerHTML =
              row('Solicitante', val('nome')) +
              row('Coleta', val('enderecoColeta') + ', ' + val('numeroColeta')) +
              row('Entrega', val('enderecoEntrega') + ', ' + val('numeroEntrega')) +
              row('Data de coleta', fmtData(val('dataColeta')));
            $('wizardCard').classList.add('hidden');
            $('confirmView').classList.add('active');
            const modal = document.querySelector('.modal');
            if (modal) modal.scrollTop = 0;
          })
          .catch(function (err) {
            console.error(err);
            UI.toast(err.message || 'Não foi possível registrar a solicitação.', 'error');
          })
          .finally(function () {
            if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.innerHTML = 'Enviar solicitação'; }
          });
      });
    }

    window.resetForm = function() {
      form.reset();
      $('wizardCard').classList.remove('hidden');
      $('confirmView').classList.remove('active');
      document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
      document.querySelectorAll('.cep-status').forEach(s => { s.textContent = ''; s.className = 'cep-status'; });
      goToStep(1);
    };

    goToStep(1);
  })();
