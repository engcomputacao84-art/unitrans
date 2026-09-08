(function () {
  // ============================================================
  // SERVIÇO DE DADOS DE MOTORISTAS — API real (Supabase)
  // ============================================================
  var FrotaService = (function () {
    var API_BASE = 'http://localhost:3000/api';

    function tratar(res) {
      return res.json().then(function (corpo) {
        if (!res.ok) throw new Error(corpo.erro || 'Erro ao comunicar com a API.');
        return corpo;
      });
    }

    return {
      listarMotoristas: function () {
        return fetch(API_BASE + '/motoristas').then(tratar);
      },

      buscarMotorista: function (id) {
        return fetch(API_BASE + '/motoristas/' + id).then(function (res) {
          if (res.status === 404) return null;
          return tratar(res);
        });
      },

      adicionarMotorista: function (dados) {
        return fetch(API_BASE + '/motoristas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        }).then(tratar);
      },

      atualizarMotorista: function (dados) {
        return fetch(API_BASE + '/motoristas/' + dados.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados)
        }).then(tratar);
      },

      removerMotorista: function (id) {
        return fetch(API_BASE + '/motoristas/' + id, { method: 'DELETE' }).then(function (res) {
          if (!res.ok && res.status !== 204) throw new Error('Erro ao excluir motorista.');
        });
      },

      // Utilitários de Status (o rótulo "viajando" já vem pronto da API,
      // que traduz o "em_rota" do banco)
      statusBadgeClass: function (status) {
        var map = {
          'disponivel': 'success',
          'viajando': 'info',
          'pendente': 'warning',
          'folga': 'warning',
          'inativo': 'danger'
        };
        return map[status] || 'default';
      },

      statusLabel: function (status) {
        var map = {
          'disponivel': 'Disponível',
          'viajando': 'Em rota',
          'pendente': 'Pendente',
          'folga': 'Folga',
          'inativo': 'Inativo'
        };
        return map[status] || status;
      }
    };
  })();

  // ============================================================
  // VARIÁVEIS E REFERÊNCIAS DO DOM
  // ============================================================
  var tabela = document.getElementById('tabelaMotoristas');
  var overlay = document.getElementById('modalMotoristaOverlay');
  var btnNovo = document.getElementById('btnNovoMotorista');
  var btnFechar = document.getElementById('fecharModalMotorista');
  var form = document.getElementById('formMotorista');
  var motoristaEditandoId = null;

  if (!tabela) return;

  // Ícones para ações
  var PENCIL_SVG = '<i class="fas fa-edit"></i>';
  var TRASH_SVG = '<i class="fas fa-trash-alt"></i>';

  // ============================================================
  // RENDERIZA LINHA NA TABELA
  // ============================================================
  function renderLinha(m) {
    var badge = FrotaService.statusBadgeClass(m.status);
    var label = FrotaService.statusLabel(m.status);
    var categorias = Array.isArray(m.cnhCategorias) ? m.cnhCategorias.join(' + ') : (m.cnh || '-');
    
    // Formatar a data de validade da CNH
    var dtValidade = '-';
    if (m.cnhValidade) {
      var data = new Date(m.cnhValidade);
      dtValidade = data.toLocaleDateString('pt-BR');
    } else if (m.dtValidadeCNH) {
      dtValidade = m.dtValidadeCNH;
    }
    
    return '' +
      '<tr data-id="' + m.id + '">' +
        '<td class="cell-strong">' + escapeHtml(m.nome) + '</td>' +
        '<td class="mono">' + (m.cpf || '-') + '</td>' +
        '<td class="mono">' + (m.telefone || '-') + '</td>' +
        '<td class="mono" style="font-size:11px;">' + escapeHtml(categorias) + '</td>' +
        '<td class="mono" style="font-size:12px;">' + dtValidade + '</td>' +
        '<td><span class="badge ' + badge + '">' + label + '</span></td>' +
        '<td>' +
          '<div class="row-actions">' +
            '<button class="icon-btn btn-editar-motorista" data-id="' + m.id + '" title="Editar motorista">' + PENCIL_SVG + '</button>' +
            '<button class="icon-btn reject btn-excluir-motorista" data-id="' + m.id + '" title="Excluir motorista" style="color:var(--signal-red);">' + TRASH_SVG + '</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
  }

  // Helper: escape HTML (definido em shared/js/utils.js)
  var escapeHtml = Utils.escapeHtml;

  // ============================================================
  // CARREGA LISTA DE MOTORISTAS
  // ============================================================
  function carregar() {
    tabela.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-faint);padding:32px 0;">Carregando...</td></tr>';
    FrotaService.listarMotoristas().then(function (lista) {
      if (!lista || !lista.length) {
        tabela.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-faint);padding:32px 0;">Nenhum motorista cadastrado.</td></tr>';
        return;
      }
      tabela.innerHTML = lista.map(renderLinha).join('');
      
      // Event listeners para editar
      tabela.querySelectorAll('.btn-editar-motorista').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = Number(btn.dataset.id);
          editarMotorista(id);
        });
      });

      // Event listeners para excluir
      tabela.querySelectorAll('.btn-excluir-motorista').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = Number(btn.dataset.id);
          removerMotorista(id);
        });
      });
    }).catch(function (err) {
      console.error(err);
      tabela.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--signal-red);padding:32px 0;">Não foi possível carregar os motoristas.</td></tr>';
    });
  }

  // ============================================================
  // WIZARD: NAVEGAÇÃO ENTRE ETAPAS
  // ============================================================
  var currentStep = 1;
  var totalSteps = 3;

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('#wizardCardMotorista .wstep').forEach(function (el) {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    document.querySelectorAll('#wizardCardMotorista .progress-step').forEach(function (el) {
      var n = Number(el.dataset.step);
      el.classList.toggle('active', n === step);
      el.classList.toggle('done', n < step);
    });
    var btnVoltar = document.getElementById('btnVoltarMotorista');
    var btnAvancar = document.getElementById('btnAvancarMotorista');
    var btnEnviar = document.getElementById('btnEnviarMotorista');
    if (btnVoltar) btnVoltar.disabled = step === 1;
    if (btnAvancar) btnAvancar.style.display = step === totalSteps ? 'none' : 'inline-flex';
    if (btnEnviar) btnEnviar.style.display = step === totalSteps ? 'inline-flex' : 'none';
  }

  function validateStep(step) {
    var stepFields = {
      1: ['nomeMotorista', 'cpfMotorista', 'telefoneMotorista', 'enderecoMotorista'],
      2: ['cnhNumeroMotorista', 'cnhValidadeMotorista'],
      3: []
    };
    var ok = true;
    (stepFields[step] || []).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var field = input.closest('.field');
      var filled = input.value.trim().length > 0;
      if (field) field.classList.toggle('invalid', !filled);
      if (!filled) ok = false;
    });

    // Validação específica do CPF e Telefone
    if (step === 1) {
      var cpfInput = document.getElementById('cpfMotorista');
      if (cpfInput && cpfInput.value.replace(/\D/g, '').length !== 11) {
        var cpfField = cpfInput.closest('.field');
        if (cpfField) cpfField.classList.add('invalid');
        ok = false;
      }
      var telefoneInput = document.getElementById('telefoneMotorista');
      if (telefoneInput) {
        var n = telefoneInput.value.replace(/\D/g, '').length;
        if (n !== 10 && n !== 11) {
          var telField = telefoneInput.closest('.field');
          if (telField) telField.classList.add('invalid');
          ok = false;
        }
      }
    }

    // Validação categorias da CNH
    if (step === 2) {
      var categoriasSelecionadas = [];
      document.querySelectorAll('#cnhCategoriasContainer input[type="checkbox"]').forEach(function (cb) {
        if (cb.checked) categoriasSelecionadas.push(cb.value);
      });
      var catField = document.querySelector('[data-field="cnhCategorias"]');
      if (categoriasSelecionadas.length === 0) {
        if (catField) catField.classList.add('invalid');
        ok = false;
      } else {
        if (catField) catField.classList.remove('invalid');
      }
    }

    // Validação Step 3 - Status
    if (step === 3) {
      var statusRadio = document.querySelector('input[name="statusMotorista"]:checked');
      
      if (!statusRadio) {
        document.querySelector('[data-field="statusMotorista"]').classList.add('invalid');
        ok = false;
      } else {
        document.querySelector('[data-field="statusMotorista"]').classList.remove('invalid');
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

  document.getElementById('btnAvancarMotorista').addEventListener('click', nextStep);
  document.getElementById('btnVoltarMotorista').addEventListener('click', prevStep);

  form.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      var field = el.closest('.field');
      if (field) field.classList.remove('invalid');
    });
  });

  // ============================================================
  // ABRIR / FECHAR MODAL
  // ============================================================
  function abrirModal(editarId) {
    overlay.classList.add('open');
    resetForm();
    
    if (editarId) {
      motoristaEditandoId = Number(editarId);
      FrotaService.buscarMotorista(motoristaEditandoId).then(function(motorista) {
        if (motorista) {
          preencherFormulario(motorista);
          document.querySelector('#btnEnviarMotorista').innerHTML = '<i class="fas fa-save"></i> Atualizar motorista';
          goToStep(1);
        } else {
          UI.toast('Motorista não encontrado.', 'error');
          fecharModal();
        }
      });
    } else {
      motoristaEditandoId = null;
      document.querySelector('#btnEnviarMotorista').innerHTML = '<i class="fas fa-save"></i> Cadastrar motorista';
      goToStep(1);
    }
  }

  function fecharModal() {
    overlay.classList.remove('open');
    motoristaEditandoId = null;
  }

  function resetForm() {
    form.reset();
    form.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    
    document.querySelectorAll('#cnhCategoriasContainer input[type="checkbox"]').forEach(function (cb) {
      cb.checked = false;
    });
    document.getElementById('categoriasSelecionadasDisplay').textContent = 'Nenhuma';
    document.getElementById('categoriasSelecionadasDisplay').className = 'resultado-valor vazio';
    document.querySelector('[data-field="cnhCategorias"]').classList.remove('invalid');
    
    // Reset Status - Disponível por padrão
    document.querySelectorAll('#statusToggleMotorista .status-opt').forEach(function (opt) {
      opt.classList.remove('selected');
    });
    var disponivelOpt = document.querySelector('#statusToggleMotorista .status-opt[data-value="disponivel"]');
    if (disponivelOpt) {
      disponivelOpt.classList.add('selected');
      var radio = disponivelOpt.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    }
    
    document.getElementById('observacoesMotorista').value = '';
  }

  function preencherFormulario(motorista) {
    document.getElementById('nomeMotorista').value = motorista.nome || '';
    document.getElementById('cpfMotorista').value = motorista.cpf || '';
    document.getElementById('telefoneMotorista').value = motorista.telefone || '';
    document.getElementById('enderecoMotorista').value = motorista.endereco || '';
    document.getElementById('cnhNumeroMotorista').value = motorista.cnhNumero || '';
    document.getElementById('cnhValidadeMotorista').value = motorista.cnhValidade || '';
    document.getElementById('observacoesMotorista').value = motorista.observacoes || '';
    
    // Categorias
    if (motorista.cnhCategorias) {
      document.querySelectorAll('#cnhCategoriasContainer input[type="checkbox"]').forEach(function (cb) {
        cb.checked = motorista.cnhCategorias.includes(cb.value);
      });
      atualizarCategorias();
    }
    
    // Status
    var status = motorista.status || 'disponivel';
    document.querySelectorAll('#statusToggleMotorista .status-opt').forEach(function (opt) {
      opt.classList.toggle('selected', opt.dataset.value === status);
      var radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = opt.dataset.value === status;
    });
  }

  if (btnNovo) btnNovo.addEventListener('click', function() { abrirModal(); });
  if (btnFechar) btnFechar.addEventListener('click', fecharModal);
  Utils.ligarFechamentoModal(overlay, fecharModal);

  // ============================================================
  // MÁSCARAS (definidas em shared/js/utils.js)
  // ============================================================
  Utils.aplicarMascara(document.getElementById('cpfMotorista'), Utils.mascaras.cpf);
  Utils.aplicarMascara(document.getElementById('telefoneMotorista'), Utils.mascaras.telefone);
  Utils.aplicarMascara(document.getElementById('cnhNumeroMotorista'), Utils.mascaras.cnh);

  // ============================================================
  // CATEGORIAS CNH
  // ============================================================
  var checkboxes = document.querySelectorAll('#cnhCategoriasContainer input[type="checkbox"]');
  var displayEl = document.getElementById('categoriasSelecionadasDisplay');

  function atualizarCategorias() {
    var selecionadas = [];
    checkboxes.forEach(function (cb) {
      if (cb.checked) selecionadas.push(cb.value);
    });
    if (selecionadas.length === 0) {
      displayEl.textContent = 'Nenhuma';
      displayEl.className = 'resultado-valor vazio';
    } else {
      displayEl.textContent = selecionadas.join(' + ');
      displayEl.className = 'resultado-valor';
    }
    var field = document.querySelector('[data-field="cnhCategorias"]');
    if (selecionadas.length > 0) {
      field.classList.remove('invalid');
    }
  }

  checkboxes.forEach(function (cb) {
    cb.addEventListener('change', atualizarCategorias);
  });

  // ============================================================
  // STATUS TOGGLE
  // ============================================================
  var statusOpts = document.querySelectorAll('#statusToggleMotorista .status-opt');
  statusOpts.forEach(function (opt) {
    opt.addEventListener('click', function () {
      statusOpts.forEach(function (o) { o.classList.remove('selected'); });
      this.classList.add('selected');
      var radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // ============================================================
  // (EAR removido)
  // ============================================================

  // ============================================================
  // VALIDAÇÃO E ENVIO
  // ============================================================
  function marcarInvalido(input, invalido) {
    var field = input ? input.closest('.field') : null;
    if (field) field.classList.toggle('invalid', invalido);
  }

  var validarCpf = Utils.validadores.cpf;
  var validarTelefone = Utils.validadores.telefone;
  var validarCnh = Utils.validadores.cnh;
  var validarObrigatorio = Utils.validadores.obrigatorio;
  var validarDataFutura = Utils.validadores.dataFutura;

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

    var nome = document.getElementById('nomeMotorista');
    var cpf = document.getElementById('cpfMotorista');
    var telefone = document.getElementById('telefoneMotorista');
    var endereco = document.getElementById('enderecoMotorista');
    var cnhNumero = document.getElementById('cnhNumeroMotorista');
    var cnhValidade = document.getElementById('cnhValidadeMotorista');
    var statusRadio = document.querySelector('input[name="statusMotorista"]:checked');
    var observacoes = document.getElementById('observacoesMotorista');

    var valido = true;

    var campos = [
      { el: nome, valid: validarObrigatorio },
      { el: cpf, valid: validarCpf },
      { el: telefone, valid: validarTelefone },
      { el: endereco, valid: validarObrigatorio },
      { el: cnhNumero, valid: validarCnh },
      { el: cnhValidade, valid: validarDataFutura }
    ];

    campos.forEach(function (campo) {
      var invalido = !campo.valid(campo.el.value);
      marcarInvalido(campo.el, invalido);
      if (invalido) valido = false;
    });

    var categoriasSelecionadas = [];
    checkboxes.forEach(function (cb) {
      if (cb.checked) categoriasSelecionadas.push(cb.value);
    });
    if (categoriasSelecionadas.length === 0) {
      document.querySelector('[data-field="cnhCategorias"]').classList.add('invalid');
      valido = false;
    }

    if (!statusRadio) {
      document.querySelector('[data-field="statusMotorista"]').classList.add('invalid');
      valido = false;
    }

    if (!valido) {
      var primeiroInvalido = form.querySelector('.field.invalid');
      if (primeiroInvalido) {
        primeiroInvalido.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }

    var isEdit = motoristaEditandoId !== null;

    var dados = {
      nome: nome.value.trim(),
      cpf: cpf.value,
      telefone: telefone.value,
      endereco: endereco.value.trim(),
      cnhNumero: cnhNumero.value.replace(/\D/g, ''),
      cnhCategorias: categoriasSelecionadas,
      cnhValidade: cnhValidade.value,
      status: statusRadio.value,
      observacoes: observacoes.value.trim()
    };

    if (isEdit) {
      dados.id = motoristaEditandoId;
    }

    var submitBtn = form.querySelector('#btnEnviarMotorista');
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Atualizando...' : 'Cadastrando...';

    var promise = isEdit ? 
      FrotaService.atualizarMotorista(dados) : 
      FrotaService.adicionarMotorista(dados);

    promise
      .then(function (motorista) {
        fecharModal();
        carregar();
        UI.toast('Motorista ' + motorista.nome + ' ' + (isEdit ? 'atualizado' : 'cadastrado') + ' com sucesso!');
      })
      .catch(function (err) {
        console.error('Erro ao ' + (isEdit ? 'atualizar' : 'cadastrar') + ' motorista:', err);
        UI.toast('Erro ao ' + (isEdit ? 'atualizar' : 'cadastrar') + ' motorista. Tente novamente.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEdit ? '<i class="fas fa-save"></i> Atualizar motorista' : '<i class="fas fa-save"></i> Cadastrar motorista';
      });
  });

  // ============================================================
  // FUNÇÕES PARA AÇÕES NA TABELA
  // ============================================================
  function editarMotorista(id) {
    abrirModal(id);
  }

  function removerMotorista(id) {
    UI.confirmar({
      title: 'Remover motorista',
      message: 'Tem certeza que deseja remover este motorista?',
      confirmLabel: 'Remover',
      tone: 'danger'
    }).then(function (ok) {
      if (!ok) return;
      FrotaService.removerMotorista(id)
        .then(function () {
          carregar();
          UI.toast('Motorista removido com sucesso!');
        })
        .catch(function (err) {
          UI.toast('Erro ao remover motorista.', 'error');
        });
    });
  }

  // ============================================================
  // INICIALIZA
  // ============================================================
  carregar();
})();