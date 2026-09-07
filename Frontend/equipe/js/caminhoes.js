(function () {
  // ============================================================
  // SERVIÇO DE DADOS DA FROTA (CAMINHÕES) - SIMULA UM BACKEND
  // Mock local só para exemplificação. Quando o banco entrar,
  // troca-se o corpo de cada função por um fetch().
  // ============================================================
  var FrotaService = (function () {
    var caminhoes = [
      { id: 'DVX-3A21', renavam: '01234567890', marca: 'Fiat', modelo: 'Fiorino', anoFabricacao: 2022, anoModelo: 2023, tipo: 'furgao', capacidade: 650, proprietario: 'Unitrans Logística', licenciamento: { situacao: 'regular', ano: 2026, ultimaVerificacao: '2026-01-15' }, ativo: true, observacoes: '', status: 'em_rota' },
      { id: 'DVX-8F02', renavam: '01122334455', marca: 'Volkswagen', modelo: 'Delivery', anoFabricacao: 2021, anoModelo: 2021, tipo: 'vuc', capacidade: 2500, proprietario: 'Unitrans Logística', licenciamento: { situacao: 'regular', ano: 2026, ultimaVerificacao: '2026-02-02' }, ativo: true, observacoes: '', status: 'em_rota' },
      { id: 'DVX-1C77', renavam: '02233445566', marca: 'Fiat', modelo: 'Fiorino', anoFabricacao: 2020, anoModelo: 2020, tipo: 'furgao', capacidade: 650, proprietario: 'Unitrans Logística', licenciamento: { situacao: 'pendente', ano: 2025, ultimaVerificacao: '2025-11-20' }, ativo: true, observacoes: '', status: 'disponivel' },
      { id: 'DVX-4B90', renavam: '03344556677', marca: 'Volkswagen', modelo: 'Delivery', anoFabricacao: 2019, anoModelo: 2019, tipo: 'vuc', capacidade: 2500, proprietario: 'Terceirizado — José Silva', licenciamento: { situacao: 'nao_verificado', ano: 2026, ultimaVerificacao: null }, ativo: true, observacoes: 'Aguardando revisão do câmbio.', status: 'manutencao' },
      { id: 'DVX-6D45', renavam: '04455667788', marca: 'Volkswagen', modelo: 'Delivery', anoFabricacao: 2023, anoModelo: 2024, tipo: 'vuc', capacidade: 2500, proprietario: 'Unitrans Logística', licenciamento: { situacao: 'regular', ano: 2026, ultimaVerificacao: '2026-03-10' }, ativo: true, observacoes: '', status: 'disponivel' }
    ];

    return {
      listarCaminhoes: function () {
        return Promise.resolve(caminhoes.slice());
      },
      adicionarCaminhao: function (dados) {
        var novo = Object.assign({}, dados, { id: (dados.id || '').toUpperCase().trim() });
        caminhoes.push(novo);
        return Promise.resolve(Object.assign({}, novo));
      },
      removerCaminhao: function (id) {
        var index = caminhoes.findIndex(function (c) { return c.id === id; });
        if (index === -1) return Promise.resolve(null);
        var removido = caminhoes.splice(index, 1)[0];
        return Promise.resolve(removido);
      },
      buscarCaminhao: function (id) {
        var encontrado = caminhoes.find(function (c) { return c.id === id; });
        return Promise.resolve(encontrado ? Object.assign({}, encontrado) : null);
      },
      atualizarCaminhao: function (id, dados) {
        var index = caminhoes.findIndex(function (c) { return c.id === id; });
        if (index === -1) return Promise.resolve(null);
        var atualizado = Object.assign({}, dados, { id: (dados.id || id).toUpperCase().trim() });
        caminhoes[index] = atualizado;
        return Promise.resolve(Object.assign({}, atualizado));
      }
    };
  })();

  var tabela = document.getElementById('tabelaCaminhoes');
  var overlay = document.getElementById('modalCaminhaoOverlay');
  var btnNovo = document.getElementById('btnNovoCaminhao');
  var btnFechar = document.getElementById('fecharModalCaminhao');
  var form = document.getElementById('formCaminhao');
  if (!tabela) return;

  var PENCIL_SVG = '<i class="fas fa-edit"></i>';
  var TRASH_SVG = '<i class="fas fa-trash-alt"></i>';

  /* ---------- Labels / badges auxiliares ---------- */
  var TIPO_LABEL = {
    furgao: 'Furgão / Utilitário',
    vuc: 'VUC (3/4)',
    toco: 'Toco',
    truck: 'Truck',
    carreta: 'Carreta',
    bitrem: 'Bitrem',
    outro: 'Outro'
  };

  var LICENC_LABEL = {
    regular: 'Regular',
    pendente: 'Pendente',
    nao_verificado: 'Não verificado'
  };
  var LICENC_BADGE = {
    regular: 'b-disponivel',
    pendente: 'b-manutencao',
    nao_verificado: 'b-pendente'
  };

  /* ---------- Máscaras (definidas em shared/js/utils.js) ---------- */
  var aplicarMascara = Utils.aplicarMascara;

  var placaInput = document.getElementById('placaCaminhao');
  var renavamInput = document.getElementById('renavamCaminhao');
  var anoFabInput = document.getElementById('anoFabricacaoCaminhao');
  var anoModInput = document.getElementById('anoModeloCaminhao');
  var capacidadeInput = document.getElementById('capacidadeCaminhao');
  var anoLicInput = document.getElementById('anoLicenciamentoCaminhao');

  aplicarMascara(placaInput, Utils.mascaras.placa);
  aplicarMascara(renavamInput, Utils.mascaras.somenteNumeros(11));
  aplicarMascara(anoFabInput, Utils.mascaras.somenteNumeros(4));
  aplicarMascara(anoModInput, Utils.mascaras.somenteNumeros(4));
  aplicarMascara(capacidadeInput, Utils.mascaras.numeroFormatado(6));
  aplicarMascara(anoLicInput, Utils.mascaras.somenteNumeros(4));

  /* ---------- Toggle: situação do licenciamento ---------- */
  var licencOpts = form.querySelectorAll('.licenc-opt');
  licencOpts.forEach(function (opt) {
    opt.addEventListener('click', function () {
      licencOpts.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
      var field = form.querySelector('[data-field="situacaoLicenciamento"]');
      if (field) field.classList.remove('invalid');
    });
  });

  /* ---------- Toggle: situação (Ativo / Inativo) ---------- */
  var optAtivo = document.getElementById('optCaminhaoAtivo');
  var optInativo = document.getElementById('optCaminhaoInativo');
  var radioAtivo = document.getElementById('situacaoCaminhaoAtivo');
  var radioInativo = document.getElementById('situacaoCaminhaoInativo');

  function atualizaSituacaoCaminhao() {
    optAtivo.classList.toggle('selected', radioAtivo.checked);
    optInativo.classList.toggle('selected', radioInativo.checked);
    optInativo.classList.toggle('inativo', radioInativo.checked);
  }
  optAtivo.addEventListener('click', function () { radioAtivo.checked = true; atualizaSituacaoCaminhao(); });
  optInativo.addEventListener('click', function () { radioInativo.checked = true; atualizaSituacaoCaminhao(); });

  /* ============================================================ */
  /* ---------- WIZARD: navegação entre etapas ---------- */
  /* ============================================================ */
  var currentStep = 1;
  var totalSteps = 3;
  var editandoId = null; // null = modo "novo caminhão"; string = editando o caminhão com esse id

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('#wizardCardCaminhao .wstep').forEach(function (el) {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    document.querySelectorAll('#wizardCardCaminhao .progress-step').forEach(function (el) {
      var n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
    var btnVoltar = document.getElementById('btnVoltarCaminhao');
    var btnAvancar = document.getElementById('btnAvancarCaminhao');
    var btnEnviar = document.getElementById('btnEnviarCaminhao');
    if (btnVoltar) btnVoltar.disabled = step === 1;
    if (btnAvancar) btnAvancar.style.display = step === totalSteps ? 'none' : 'inline-flex';
    if (btnEnviar) btnEnviar.style.display = step === totalSteps ? 'inline-flex' : 'none';
  }

  function validateStep(step) {
    var stepFields = {
      1: ['placaCaminhao', 'renavamCaminhao', 'marcaCaminhao', 'modeloCaminhao', 
          'anoFabricacaoCaminhao', 'anoModeloCaminhao', 'tipoCaminhao', 'capacidadeCaminhao', 'proprietarioCaminhao'],
      2: ['anoLicenciamentoCaminhao'],
      3: []
    };
    var ok = true;
    (stepFields[step] || []).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var field = input.closest('.field');
      var filled = input.value.trim().length > 0;
      if (input.tagName === 'SELECT') filled = input.value !== '';
      if (field) field.classList.toggle('invalid', !filled);
      if (!filled) ok = false;
    });

    if (step === 2) {
      var situacaoChecked = form.querySelector('input[name="situacaoLicenciamento"]:checked');
      var campoLic = form.querySelector('[data-field="situacaoLicenciamento"]');
      if (!situacaoChecked) {
        if (campoLic) campoLic.classList.add('invalid');
        ok = false;
      } else {
        if (campoLic) campoLic.classList.remove('invalid');
      }
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

  document.getElementById('btnAvancarCaminhao').addEventListener('click', nextStep);
  document.getElementById('btnVoltarCaminhao').addEventListener('click', prevStep);

  form.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var field = el.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  /* ---------- Render da tabela ---------- */
  function renderLinha(c) {
    var licBadge = LICENC_BADGE[c.licenciamento && c.licenciamento.situacao] || 'b-pendente';
    var licLabel = LICENC_LABEL[c.licenciamento && c.licenciamento.situacao] || '—';
    var situBadge = c.ativo === false ? 'b-manutencao' : 'b-disponivel';
    var situLabel = c.ativo === false ? 'Inativo' : 'Ativo';
    return '' +
      '<tr data-id="' + c.id + '">' +
        '<td class="mono cell-strong">' + c.id + '</td>' +
        '<td>' + c.marca + ' ' + c.modelo + '<div class="cell-sub">' + (TIPO_LABEL[c.tipo] || '') + '</div></td>' +
        '<td>' + Number(c.capacidade).toLocaleString('pt-BR') + ' kg</td>' +
        '<td>' + (c.proprietario || '—') + '</td>' +
        '<td><span class="badge ' + licBadge + '">' + licLabel + '</span></td>' +
        '<td><span class="badge ' + situBadge + '">' + situLabel + '</span></td>' +
        '<td>' +
          '<div class="row-actions">' +
            '<button class="icon-btn btn-editar-caminhao" data-id="' + c.id + '" title="Editar caminhão">' + PENCIL_SVG + '</button>' +
            '<button class="icon-btn reject btn-excluir-caminhao" data-id="' + c.id + '" title="Excluir caminhão">' + TRASH_SVG + '</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  }

  function carregar() {
    FrotaService.listarCaminhoes().then(function (lista) {
      if (!lista.length) {
        tabela.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-faint);">Nenhum caminhão cadastrado.</td></tr>';
        return;
      }
      tabela.innerHTML = lista.map(renderLinha).join('');
      
      // Event listeners para ações
      tabela.querySelectorAll('.btn-editar-caminhao').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = btn.dataset.id;
          FrotaService.buscarCaminhao(id).then(function (caminhao) {
            if (!caminhao) {
              UI.toast('Caminhão não encontrado.');
              return;
            }
            abrirModal(caminhao);
          });
        });
      });
      
      tabela.querySelectorAll('.btn-excluir-caminhao').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = btn.dataset.id;
          UI.confirmar({
            title: 'Excluir caminhão',
            message: 'Tem certeza que deseja excluir o caminhão ' + id + '?',
            confirmLabel: 'Excluir',
            tone: 'danger'
          }).then(function (ok) {
            if (!ok) return;
            FrotaService.removerCaminhao(id).then(function() {
              carregar();
              UI.toast('Caminhão ' + id + ' removido com sucesso!');
            });
          });
        });
      });
    });
  }

  /* ---------- Modal ---------- */
  var btnEnviarCaminhao = document.getElementById('btnEnviarCaminhao');

  function preencherFormulario(c) {
    document.getElementById('placaCaminhao').value = c.id || '';
    document.getElementById('renavamCaminhao').value = c.renavam || '';
    document.getElementById('marcaCaminhao').value = c.marca || '';
    document.getElementById('modeloCaminhao').value = c.modelo || '';
    document.getElementById('anoFabricacaoCaminhao').value = c.anoFabricacao || '';
    document.getElementById('anoModeloCaminhao').value = c.anoModelo || '';
    document.getElementById('tipoCaminhao').value = c.tipo || '';
    document.getElementById('capacidadeCaminhao').value = c.capacidade ? Number(c.capacidade).toLocaleString('pt-BR') : '';
    document.getElementById('proprietarioCaminhao').value = c.proprietario || '';

    var lic = c.licenciamento || {};
    document.getElementById('anoLicenciamentoCaminhao').value = lic.ano || '';
    document.getElementById('ultimaVerificacaoCaminhao').value = lic.ultimaVerificacao || '';

    licencOpts.forEach(function (o) {
      var marcado = o.dataset.val === lic.situacao;
      o.classList.toggle('selected', marcado);
      o.querySelector('input').checked = marcado;
    });

    radioAtivo.checked = c.ativo !== false;
    radioInativo.checked = c.ativo === false;
    atualizaSituacaoCaminhao();

    document.getElementById('obsCaminhao').value = c.observacoes || '';
  }

  function abrirModal(caminhao) {
    overlay.classList.add('open');
    form.reset();
    form.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    licencOpts.forEach(function (o) { o.classList.remove('selected'); });
    optAtivo.classList.remove('selected');
    optInativo.classList.remove('selected', 'inativo');
    radioAtivo.checked = true;
    atualizaSituacaoCaminhao();

    if (caminhao) {
      editandoId = caminhao.id;
      preencherFormulario(caminhao);
      if (btnEnviarCaminhao) btnEnviarCaminhao.innerHTML = '<i class="fas fa-save"></i> Salvar alterações';
    } else {
      editandoId = null;
      if (btnEnviarCaminhao) btnEnviarCaminhao.innerHTML = '<i class="fas fa-save"></i> Cadastrar caminhão';
    }

    goToStep(1);
  }

  function fecharModal() {
    overlay.classList.remove('open');
    editandoId = null;
  }

  if (btnNovo) btnNovo.addEventListener('click', function () { abrirModal(); });
  if (btnFechar) btnFechar.addEventListener('click', fecharModal);
  Utils.ligarFechamentoModal(overlay, fecharModal);

  /* ---------- Validação ---------- */
  function marcarInvalido(input, invalido) {
    var field = input.closest('.field');
    if (field) field.classList.toggle('invalid', invalido);
    return !invalido;
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

    var placa = document.getElementById('placaCaminhao');
    var renavam = document.getElementById('renavamCaminhao');
    var marca = document.getElementById('marcaCaminhao');
    var modelo = document.getElementById('modeloCaminhao');
    var anoFab = document.getElementById('anoFabricacaoCaminhao');
    var anoMod = document.getElementById('anoModeloCaminhao');
    var tipo = document.getElementById('tipoCaminhao');
    var capacidade = document.getElementById('capacidadeCaminhao');
    var proprietario = document.getElementById('proprietarioCaminhao');
    var anoLic = document.getElementById('anoLicenciamentoCaminhao');
    var ultimaVerificacao = document.getElementById('ultimaVerificacaoCaminhao');

    var valido = true;
    // Placa: por ora aceitamos qualquer valor preenchido (sem exigir o formato oficial),
    // só para facilitar inserir exemplos. Basta não estar vazia.
    valido = marcarInvalido(placa, placa.value.trim().length === 0) && valido;
    valido = marcarInvalido(renavam, renavam.value.replace(/\D/g, '').length !== 11) && valido;

    if (!valido) {
      goToStep(1);
      return;
    }

    var situacaoLicenciamentoInput = form.querySelector('input[name="situacaoLicenciamento"]:checked');

    var dadosCaminhao = {
      id: placa.value,
      renavam: renavam.value,
      marca: marca.value,
      modelo: modelo.value,
      anoFabricacao: anoFab.value,
      anoModelo: anoMod.value,
      tipo: tipo.value,
      capacidade: capacidade.value.replace(/\D/g, ''),
      proprietario: proprietario.value,
      licenciamento: {
        situacao: situacaoLicenciamentoInput ? situacaoLicenciamentoInput.value : 'nao_verificado',
        ano: anoLic.value,
        ultimaVerificacao: ultimaVerificacao.value || null
      },
      ativo: radioAtivo.checked,
      observacoes: document.getElementById('obsCaminhao').value.trim(),
      status: radioAtivo.checked ? 'disponivel' : 'manutencao'
    };

    var promessa = editandoId
      ? FrotaService.atualizarCaminhao(editandoId, dadosCaminhao)
      : FrotaService.adicionarCaminhao(dadosCaminhao);
    var mensagemSucesso = editandoId
      ? 'Caminhão ' + dadosCaminhao.id + ' atualizado com sucesso!'
      : 'Caminhão ' + dadosCaminhao.id + ' cadastrado com sucesso!';

    promessa.then(function () {
      fecharModal();
      carregar();
      if (window.UI && UI.toast) UI.toast(mensagemSucesso);
    });
  });

  carregar();
})();