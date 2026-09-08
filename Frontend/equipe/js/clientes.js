(function () {
  var API_BASE = 'http://localhost:3000/api';

  var modal = document.getElementById('modalCliente');
  var tabela = document.getElementById('tabelaClientes');
  if (!modal || !tabela) return;

  var btnAbrir = document.getElementById('btnNovoCliente');
  var btnFechar = document.getElementById('btnFecharModalCliente');
  var form = document.getElementById('formCliente');

  var cardPF = document.getElementById('cardPF');
  var cardPJ = document.getElementById('cardPJ');
  var radioPF = document.getElementById('tipoPF');
  var radioPJ = document.getElementById('tipoPJ');

  var fieldsPF = document.getElementById('fieldsPF');
  var fieldsPJ = document.getElementById('fieldsPJ');
  var fieldsPFContato = document.getElementById('fieldsPFContato');
  var fieldsPJContato = document.getElementById('fieldsPJContato');
  var fieldsPFEndereco = document.getElementById('fieldsPFEndereco');
  var fieldsPJEndereco = document.getElementById('fieldsPJEndereco');
  var fieldsPFControle = document.getElementById('fieldsPFControle');
  var fieldsPJControle = document.getElementById('fieldsPJControle');

  var erroTipoPessoa = document.getElementById('erroTipoPessoa');

  // Ícones para ações
  var PENCIL_SVG = '<i class="fas fa-edit"></i>';
  var TRASH_SVG = '<i class="fas fa-trash-alt"></i>';

  var currentStep = 1;
  var totalSteps = 5;
  var tipoSelecionado = null;
  var clientes = [];
  var editandoId = null;

  /* ---------- Funções auxiliares ---------- */
  function $(id) { return document.getElementById(id); }

  function getTipo() {
    return radioPF.checked ? 'PF' : (radioPJ.checked ? 'PJ' : null);
  }

  function isPF() { return getTipo() === 'PF'; }
  function isPJ() { return getTipo() === 'PJ'; }

  var escapeHtml = Utils.escapeHtml;

  function gerarId() {
    return 'CLI-' + String(Date.now()).slice(-6);
  }

  /* ---------- Abrir / Fechar modal ---------- */
  function abrirModal(editarId) {
    modal.classList.add('open');
    resetForm();
    editandoId = editarId || null;
    
    if (editarId) {
      var cliente = clientes.find(function(c) { return String(c.id) === String(editarId); });
      if (cliente) {
        var tipo = cliente.tipo;
        selecionarTipo(tipo);
        
        var prefixo = tipo === 'PF' ? 'pf' : 'pj';
        
        if (tipo === 'PF') {
          document.getElementById('pfNome').value = cliente.nome || '';
          document.getElementById('pfCpf').value = cliente.documento || '';
          document.getElementById('pfTelefone').value = cliente.telefone || '';
          document.getElementById('pfWhatsapp').value = cliente.whatsapp || '';
          document.getElementById('pfEmail').value = cliente.email || '';
          document.getElementById('pfEndereco').value = cliente.endereco || '';
          document.getElementById('pfNumero').value = cliente.numero || '';
          document.getElementById('pfComplemento').value = cliente.complemento || '';
          document.getElementById('pfBairro').value = cliente.bairro || '';
          document.getElementById('pfCidade').value = cliente.cidade || '';
          document.getElementById('pfUf').value = cliente.uf || '';
          document.getElementById('pfCep').value = cliente.cep || '';
          document.getElementById('pfObs').value = cliente.observacoes || '';
          
          var situacaoOpt = document.querySelector('#situacaoTogglePF .situacao-opt[data-value="' + (cliente.situacao || 'Ativo') + '"]');
          if (situacaoOpt) {
            document.querySelectorAll('#situacaoTogglePF .situacao-opt').forEach(function(o) { o.classList.remove('selected'); });
            situacaoOpt.classList.add('selected');
            situacaoOpt.querySelector('input').checked = true;
          }
        } else {
          document.getElementById('pjRazao').value = cliente.nome || '';
          document.getElementById('pjFantasia').value = cliente.fantasia || '';
          document.getElementById('pjCnpj').value = cliente.documento || '';
          document.getElementById('pjTelefone').value = cliente.telefone || '';
          document.getElementById('pjWhatsapp').value = cliente.whatsapp || '';
          document.getElementById('pjEmail').value = cliente.email || '';
          document.getElementById('pjEndereco').value = cliente.endereco || '';
          document.getElementById('pjNumero').value = cliente.numero || '';
          document.getElementById('pjComplemento').value = cliente.complemento || '';
          document.getElementById('pjBairro').value = cliente.bairro || '';
          document.getElementById('pjCidade').value = cliente.cidade || '';
          document.getElementById('pjUf').value = cliente.uf || '';
          document.getElementById('pjCep').value = cliente.cep || '';
          document.getElementById('pjObs').value = cliente.observacoes || '';
          
          var situacaoOptPJ = document.querySelector('#situacaoTogglePJ .situacao-opt[data-value="' + (cliente.situacao || 'Ativo') + '"]');
          if (situacaoOptPJ) {
            document.querySelectorAll('#situacaoTogglePJ .situacao-opt').forEach(function(o) { o.classList.remove('selected'); });
            situacaoOptPJ.classList.add('selected');
            situacaoOptPJ.querySelector('input').checked = true;
          }
        }
        
        goToStep(5);
        document.querySelector('#btnEnviarCliente').textContent = 'Atualizar cliente';
      }
    } else {
      document.querySelector('#btnEnviarCliente').innerHTML = '<i class="fas fa-save"></i> Salvar cliente';
    }
    
    goToStep(1);
  }

  function fecharModal() {
    modal.classList.remove('open');
    editandoId = null;
  }

  if (btnAbrir) btnAbrir.addEventListener('click', function() { abrirModal(); });
  if (btnFechar) btnFechar.addEventListener('click', fecharModal);
  Utils.ligarFechamentoModal(modal, fecharModal);

  /* ---------- Alternância Pessoa Física / Jurídica ---------- */
  function selecionarTipo(tipo) {
    var isPF = tipo === 'PF';
    radioPF.checked = isPF;
    radioPJ.checked = !isPF;
    cardPF.classList.toggle('selected', isPF);
    cardPJ.classList.toggle('selected', !isPF);
    tipoSelecionado = tipo;

    var pfFields = [fieldsPF, fieldsPFContato, fieldsPFEndereco, fieldsPFControle];
    var pjFields = [fieldsPJ, fieldsPJContato, fieldsPJEndereco, fieldsPJControle];

    pfFields.forEach(function (el) { el.classList.toggle('active', isPF); });
    pjFields.forEach(function (el) { el.classList.toggle('active', !isPF); });

    erroTipoPessoa.style.display = 'none';
  }

  cardPF.addEventListener('click', function () { selecionarTipo('PF'); });
  cardPJ.addEventListener('click', function () { selecionarTipo('PJ'); });

  /* ============================================================ */
  /* ---------- WIZARD: navegação entre etapas ---------- */
  /* ============================================================ */

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('#wizardCardCliente .wstep').forEach(function (el) {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    document.querySelectorAll('#wizardCardCliente .progress-step').forEach(function (el) {
      var n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
    var btnVoltar = document.getElementById('btnVoltarCliente');
    var btnAvancar = document.getElementById('btnAvancarCliente');
    var btnEnviar = document.getElementById('btnEnviarCliente');
    if (btnVoltar) btnVoltar.disabled = step === 1;
    if (btnAvancar) btnAvancar.style.display = step === totalSteps ? 'none' : 'inline-flex';
    if (btnEnviar) btnEnviar.style.display = step === totalSteps ? 'inline-flex' : 'none';
  }

  function validateStep(step) {
    var ok = true;

    if (step === 1) {
      var tipo = getTipo();
      if (!tipo) {
        erroTipoPessoa.style.display = 'block';
        ok = false;
      } else {
        erroTipoPessoa.style.display = 'none';
      }
      return ok;
    }

    var tipoAtual = getTipo();
    if (!tipoAtual) {
      erroTipoPessoa.style.display = 'block';
      return false;
    }

    var prefixo = tipoAtual === 'PF' ? 'pf' : 'pj';

    if (step === 2) {
      var nomeId = tipoAtual === 'PF' ? 'pfNome' : 'pjRazao';
      var docId = tipoAtual === 'PF' ? 'pfCpf' : 'pjCnpj';
      var nomeInput = $(nomeId);
      var docInput = $(docId);

      if (nomeInput) {
        var nomeValido = nomeInput.value.trim() !== '';
        marcarInvalido(nomeInput, !nomeValido);
        if (!nomeValido) ok = false;
      }

      if (docInput) {
        var docValido = tipoAtual === 'PF' 
          ? validarCpf(docInput.value) 
          : validarCnpj(docInput.value);
        marcarInvalido(docInput, !docValido);
        if (!docValido) ok = false;
      }

      return ok;
    }

    if (step === 3) {
      var telId = prefixo + 'Telefone';
      var emailId = prefixo + 'Email';
      var telInput = $(telId);
      var emailInput = $(emailId);

      if (telInput) {
        var telValido = validarTelefone(telInput.value);
        marcarInvalido(telInput, !telValido);
        if (!telValido) ok = false;
      }

      if (emailInput && emailInput.value.trim() !== '') {
        var emailValido = validarEmail(emailInput.value);
        marcarInvalido(emailInput, !emailValido);
        if (!emailValido) ok = false;
      }

      return ok;
    }

    if (step === 4) {
      var camposEndereco = ['Endereco', 'Numero', 'Cidade', 'Uf'];
      camposEndereco.forEach(function (campo) {
        var el = $(prefixo + campo);
        if (el) {
          var valido = el.value.trim() !== '';
          marcarInvalido(el, !valido);
          if (!valido) ok = false;
        }
      });
      return ok;
    }

    return ok;
  }

  function nextStep() {
    if (!validateStep(currentStep)) {
      var firstInvalid = document.querySelector('.wstep.active .field.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (currentStep < totalSteps) goToStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep > 1) goToStep(currentStep - 1);
  }

  document.getElementById('btnAvancarCliente').addEventListener('click', nextStep);
  document.getElementById('btnVoltarCliente').addEventListener('click', prevStep);

  form.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var field = el.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  /* ---------- Máscaras (definidas em shared/js/utils.js) ---------- */
  var aplicarMascara = Utils.aplicarMascara;

  aplicarMascara(document.getElementById('pfCpf'), Utils.mascaras.cpf);
  aplicarMascara(document.getElementById('pjCnpj'), Utils.mascaras.cnpj);
  aplicarMascara(document.getElementById('pfTelefone'), Utils.mascaras.telefone);
  aplicarMascara(document.getElementById('pfWhatsapp'), Utils.mascaras.telefone);
  aplicarMascara(document.getElementById('pjTelefone'), Utils.mascaras.telefone);
  aplicarMascara(document.getElementById('pjWhatsapp'), Utils.mascaras.telefone);
  aplicarMascara(document.getElementById('pfCep'), Utils.mascaras.cep);
  aplicarMascara(document.getElementById('pjCep'), Utils.mascaras.cep);

  ['pfUf', 'pjUf'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () {
        el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
      });
    }
  });

  /* ---------- Busca de CEP (ViaCEP) ---------- */
  function ligarBuscaCep(prefixo) {
    var cepInput = document.getElementById(prefixo + 'Cep');
    if (!cepInput) return;
    var statusEl = document.getElementById(prefixo + 'CepStatus');

    cepInput.addEventListener('blur', function () {
      var cep = cepInput.value.replace(/\D/g, '');
      if (cep.length !== 8) {
        if (statusEl) {
          statusEl.textContent = '';
          statusEl.className = 'cep-status';
        }
        return;
      }
      if (statusEl) {
        statusEl.textContent = 'Buscando endereço...';
        statusEl.className = 'cep-status loading';
      }

      Utils.buscarCep(cep)
        .then(function (data) {
          var enderecoEl = document.getElementById(prefixo + 'Endereco');
          var bairroEl = document.getElementById(prefixo + 'Bairro');
          var cidadeEl = document.getElementById(prefixo + 'Cidade');
          var ufEl = document.getElementById(prefixo + 'Uf');
          if (enderecoEl) enderecoEl.value = data.logradouro || '';
          if (bairroEl) bairroEl.value = data.bairro || '';
          if (cidadeEl) cidadeEl.value = data.localidade || '';
          if (ufEl) ufEl.value = data.uf || '';
          if (statusEl) {
            statusEl.textContent = 'Endereço preenchido automaticamente.';
            statusEl.className = 'cep-status';
          }
          var numeroEl = document.getElementById(prefixo + 'Numero');
          if (numeroEl) numeroEl.focus();
        })
        .catch(function (err) {
          if (statusEl) {
            statusEl.textContent = err && err.message === 'CEP não encontrado'
              ? 'CEP não encontrado.'
              : 'Não foi possível consultar o CEP.';
            statusEl.className = 'cep-status error';
          }
        });
    });
  }

  ligarBuscaCep('pf');
  ligarBuscaCep('pj');

  /* ---------- Validação ---------- */
  function marcarInvalido(input, invalido) {
    if (!input) return;
    var field = input.closest('.field');
    if (field) field.classList.toggle('invalid', invalido);
  }

  var validarEmail = Utils.validadores.email;
  var validarCpf = Utils.validadores.cpf;
  var validarCnpj = Utils.validadores.cnpj;
  var validarTelefone = Utils.validadores.telefone;

  /* ---------- Situação Toggle ---------- */
  function setupSituacaoToggle(prefixo) {
    var opts = document.querySelectorAll('#situacaoToggle' + prefixo.toUpperCase() + ' .situacao-opt');
    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o) { o.classList.remove('selected'); });
        this.classList.add('selected');
        var radio = this.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  setupSituacaoToggle('pf');
  setupSituacaoToggle('pj');

  /* ---------- Reset do formulário ---------- */
  function resetForm() {
    form.reset();
    radioPF.checked = false;
    radioPJ.checked = false;
    cardPF.classList.remove('selected');
    cardPJ.classList.remove('selected');
    tipoSelecionado = null;

    var allFields = [
      fieldsPF, fieldsPJ, fieldsPFContato, fieldsPJContato,
      fieldsPFEndereco, fieldsPJEndereco, fieldsPFControle, fieldsPJControle
    ];
    allFields.forEach(function (el) { el.classList.remove('active'); });

    ['PF', 'PJ'].forEach(function (tipo) {
      var opts = document.querySelectorAll('#situacaoToggle' + tipo + ' .situacao-opt');
      opts.forEach(function (opt) { opt.classList.remove('selected'); });
      var ativoOpt = document.querySelector('#situacaoToggle' + tipo + ' .situacao-opt[data-value="Ativo"]');
      if (ativoOpt) {
        ativoOpt.classList.add('selected');
        var radio = ativoOpt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      }
    });

    form.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    erroTipoPessoa.style.display = 'none';

    ['pfCepStatus', 'pjCepStatus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.className = 'cep-status';
      }
    });
    
    editandoId = null;
  }

  /* ---------- Renderizar tabela ---------- */
  function renderTabela() {
    if (!clientes.length) {
      tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-faint);padding:32px 0;">Nenhum cliente cadastrado.</td></tr>';
      return;
    }

    tabela.innerHTML = clientes.map(function(c) {
      var doc = c.tipo === 'PF' ? c.documento : c.documento;
      var enderecoCompleto = [c.endereco, c.numero].filter(Boolean).join(', ');
      if (c.bairro) enderecoCompleto += ' — ' + c.bairro;
      
      // Para PJ, exibe o nome fantasia ao lado se existir
      var nomeExibido = c.nome;
      if (c.tipo === 'PJ' && c.fantasia && c.fantasia !== c.nome) {
        nomeExibido = c.nome + ' <span style="color:var(--ink-faint);font-size:12px;">(' + escapeHtml(c.fantasia) + ')</span>';
      }
      
      return '' +
        '<tr data-id="' + c.id + '">' +
          '<td class="cell-strong">' + nomeExibido + '</td>' +
          '<td class="mono">' + escapeHtml(doc) + '</td>' +
          '<td class="mono">' + escapeHtml(c.telefone) + '</td>' +
          '<td>' + escapeHtml(enderecoCompleto) + '</td>' +
          '<td>' + (c.solicitacoes || 0) + '</td>' +
          '<td>' +
            '<div class="row-actions">' +
              '<button class="icon-btn btn-editar-cliente" data-id="' + c.id + '" title="Editar cliente">' + PENCIL_SVG + '</button>' +
              '<button class="icon-btn reject btn-excluir-cliente" data-id="' + c.id + '" title="Excluir cliente" style="color:var(--signal-red);">' + TRASH_SVG + '</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    }).join('');

    tabela.querySelectorAll('.btn-editar-cliente').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        abrirModal(id);
      });
    });

    tabela.querySelectorAll('.btn-excluir-cliente').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        UI.confirmar({
          title: 'Excluir cliente',
          message: 'Tem certeza que deseja excluir este cliente?',
          confirmLabel: 'Excluir',
          tone: 'danger'
        }).then(function (ok) {
          if (!ok) return;
          fetch(API_BASE + '/clientes/' + id, { method: 'DELETE' })
            .then(function (res) {
              if (!res.ok) throw new Error('Falha ao excluir (HTTP ' + res.status + ')');
              return carregarClientes();
            })
            .then(function () { UI.toast('Cliente removido com sucesso!'); })
            .catch(function (err) {
              console.error(err);
              UI.toast('Não foi possível excluir o cliente.');
            });
        });
      });
    });
  }

  /* ---------- Carregar clientes do banco (via API) ---------- */
  function carregarClientes() {
    tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-faint);padding:32px 0;">Carregando...</td></tr>';

    return fetch(API_BASE + '/clientes')
      .then(function (res) {
        if (!res.ok) throw new Error('Falha ao carregar clientes (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function (dados) {
        clientes = dados;
        renderTabela();
      })
      .catch(function (err) {
        console.error(err);
        tabela.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--signal-red);padding:32px 0;">Não foi possível carregar os clientes.</td></tr>';
      });
  }

  /* ---------- Envio do formulário ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var todasValidas = true;
    for (var s = 1; s <= totalSteps; s++) {
      if (!validateStep(s)) {
        todasValidas = false;
        if (s === currentStep) {
          var firstInvalid = document.querySelector('.wstep.active .field.invalid');
          if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          goToStep(s);
          setTimeout(function () {
            var firstInvalid2 = document.querySelector('.wstep.active .field.invalid');
            if (firstInvalid2) firstInvalid2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
        break;
      }
    }
    if (!todasValidas) return;

    var tipo = getTipo();
    if (!tipo) {
      erroTipoPessoa.style.display = 'block';
      return;
    }

    var isPF = tipo === 'PF';
    var prefixo = isPF ? 'pf' : 'pj';

    var dados = {
      tipo: tipo,
      nome: isPF ? document.getElementById('pfNome').value.trim() : document.getElementById('pjRazao').value.trim(),
      fantasia: isPF ? '' : document.getElementById('pjFantasia').value.trim(),
      documento: isPF ? document.getElementById('pfCpf').value : document.getElementById('pjCnpj').value,
      telefone: document.getElementById(prefixo + 'Telefone').value,
      whatsapp: document.getElementById(prefixo + 'Whatsapp').value || '',
      email: document.getElementById(prefixo + 'Email').value || '',
      endereco: document.getElementById(prefixo + 'Endereco').value.trim(),
      numero: document.getElementById(prefixo + 'Numero').value.trim(),
      complemento: document.getElementById(prefixo + 'Complemento').value || '',
      bairro: document.getElementById(prefixo + 'Bairro').value || '',
      cidade: document.getElementById(prefixo + 'Cidade').value.trim(),
      uf: document.getElementById(prefixo + 'Uf').value.trim().toUpperCase(),
      cep: document.getElementById(prefixo + 'Cep').value || '',
      situacao: document.querySelector('input[name="' + prefixo + 'Situacao"]:checked')?.value || 'Ativo',
      observacoes: document.getElementById(prefixo + 'Obs').value.trim() || '',
      solicitacoes: 0
    };

    var submitBtn = document.getElementById('btnEnviarCliente');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    var url = API_BASE + '/clientes' + (editandoId ? '/' + editandoId : '');
    var metodo = editandoId ? 'PUT' : 'POST';

    fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function (res) {
        return res.json().then(function (corpo) {
          if (!res.ok) throw new Error(corpo.erro || 'Falha ao salvar cliente.');
          return corpo;
        });
      })
      .then(function () {
        UI.toast(editandoId
          ? 'Cliente atualizado com sucesso!'
          : (isPF ? 'Pessoa física' : 'Pessoa jurídica') + ' cadastrada com sucesso!');
        fecharModal();
        return carregarClientes();
      })
      .catch(function (err) {
        console.error(err);
        UI.toast(err.message || 'Não foi possível salvar o cliente.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar cliente';
      });
  });

  // Inicializa
  carregarClientes();
  goToStep(1);
})();