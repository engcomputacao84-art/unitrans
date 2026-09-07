/* =========================================================
   Utils — máscaras e funções utilitárias compartilhadas
   Usado por cliente/, equipe/ e motorista/. Inclua este
   arquivo ANTES dos scripts de cada página:

     <script src="../shared/js/utils.js"></script>

   - Utils.aplicarMascara(input, formatter): liga um listener
     de "input" que formata o valor a cada tecla digitada,
     preservando a posição do cursor.
   - Utils.mascaras.*: funções puras de formatação (recebem a
     string atual e devolvem a string formatada).
   - Utils.escapeHtml(texto): escapa texto antes de inserir em
     innerHTML.
   - Utils.formatarData(v): converte 'AAAA-MM-DD' para 'DD/MM/AAAA'.
   - Utils.buscarCep(cep): consulta o ViaCEP e devolve uma
     Promise com os dados do endereço.
   ========================================================= */
window.Utils = (function () {

  /* ---------- Aplicação de máscara em inputs ---------- */
  function aplicarMascara(input, formatter) {
    if (!input) return;
    input.addEventListener('input', function () {
      var pos = this.selectionStart || 0;
      var oldVal = this.value;
      var newVal = formatter(this.value);
      this.value = newVal;
      if (pos === oldVal.length) {
        this.setSelectionRange(newVal.length, newVal.length);
      } else {
        var diff = newVal.length - oldVal.length;
        this.setSelectionRange(pos + diff, pos + diff);
      }
    });
  }

  /* ---------- Máscaras ---------- */
  function maskCpf(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})$/, '$1.$2');
    }
    return v;
  }

  function maskCnpj(v) {
    v = v.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) {
      v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
    } else if (v.length > 8) {
      v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
    } else if (v.length > 5) {
      v = v.replace(/(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{1,3})$/, '$1.$2');
    }
    return v;
  }

  // CPF ou CNPJ automaticamente, conforme a quantidade de dígitos
  // (até 11 dígitos = CPF, mais que isso = CNPJ).
  function maskDocumento(v) {
    var digits = v.replace(/\D/g, '');
    return digits.length > 11 ? maskCnpj(v) : maskCpf(v);
  }

  function maskTelefone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{1,4})$/, '($1) $2');
    }
    return v;
  }

  function maskCep(v) {
    v = v.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) {
      v = v.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
    }
    return v;
  }

  function maskPlaca(v) {
    // Sem validação de padrão oficial (ABC-1D23): aceita qualquer
    // texto, só deixa em maiúsculas para manter o padrão visual.
    return v.toUpperCase();
  }

  // Gera uma máscara que aceita apenas dígitos, até `max` caracteres.
  // Ex.: Utils.mascaras.somenteNumeros(11) -> function(v){...}
  function somenteNumeros(max) {
    return function (v) {
      return v.replace(/\D/g, '').slice(0, max);
    };
  }

  function maskCnh(v) {
    return v.replace(/\D/g, '').slice(0, 11);
  }

  // Formata um número inteiro digitado como milhar em pt-BR
  // (ex.: capacidade de carga em kg).
  function maskNumeroFormatado(max) {
    max = max || 6;
    return function (v) {
      var digits = v.replace(/\D/g, '').slice(0, max);
      if (!digits) return '';
      return Number(digits).toLocaleString('pt-BR');
    };
  }

  // Máscara genérica baseada em padrão com '#' representando
  // cada dígito. Ex.: maskPattern('(##) #####-####')('11987654321')
  function maskPattern(pattern) {
    return function (v) {
      var digits = v.replace(/\D/g, '');
      var out = '', di = 0;
      for (var i = 0; i < pattern.length && di < digits.length; i++) {
        if (pattern[i] === '#') { out += digits[di]; di++; }
        else { out += pattern[i]; }
      }
      return out;
    };
  }

  /* ---------- Outras funções de uso comum ---------- */

  // Escapa texto antes de inserir via innerHTML (evita XSS e
  // quebra de layout com caracteres especiais).
  function escapeHtml(text) {
    if (!text) return '-';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Converte 'AAAA-MM-DD' (formato de <input type="date">) em
  // 'DD/MM/AAAA' para exibição.
  function formatarData(v) {
    if (!v) return '—';
    var p = v.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : v;
  }

  // Consulta o ViaCEP. Devolve uma Promise que resolve com os
  // dados do endereço ou rejeita se o CEP for inválido/não existir.
  function buscarCep(cep) {
    var digits = String(cep || '').replace(/\D/g, '');
    if (digits.length !== 8) {
      return Promise.reject(new Error('CEP inválido'));
    }
    return fetch('https://viacep.com.br/ws/' + digits + '/json/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.erro) throw new Error('CEP não encontrado');
        return data;
      });
  }

  /* ---------- Validações comuns de formulário ---------- */
  // Validações simplificadas: verificam apenas a quantidade de
  // dígitos/formato, sem checar dígitos verificadores reais — o
  // suficiente para os formulários deste projeto (permite dados
  // de exemplo/teste).
  function validarObrigatorio(v) {
    return !!(v && String(v).trim() !== '');
  }

  function validarEmail(v) {
    return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function validarCpf(v) {
    return v.replace(/\D/g, '').length === 11;
  }

  function validarCnpj(v) {
    return v.replace(/\D/g, '').length === 14;
  }

  function validarDocumento(v) {
    var n = v.replace(/\D/g, '').length;
    return n === 11 || n === 14;
  }

  function validarTelefone(v) {
    var n = v.replace(/\D/g, '').length;
    return n === 10 || n === 11;
  }

  function validarCnh(v) {
    var n = v.replace(/\D/g, '').length;
    return n >= 9 && n <= 11;
  }

  function validarDataFutura(v) {
    if (!v) return false;
    var data = new Date(v);
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return data > hoje;
  }

  /* ---------- Modal: fechar com Esc / clique fora ---------- */
  // Liga os dois comportamentos comuns de fechamento de modal a um
  // overlay que usa a classe "open" para controlar visibilidade.
  // `fecharFn` é chamada quando o usuário clica fora do card ou
  // aperta Esc (só enquanto o overlay estiver com a classe "open").
  function ligarFechamentoModal(overlay, fecharFn) {
    if (!overlay) return;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) fecharFn();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) fecharFn();
    });
  }

  return {
    aplicarMascara: aplicarMascara,
    mascaras: {
      cpf: maskCpf,
      cnpj: maskCnpj,
      documento: maskDocumento,
      telefone: maskTelefone,
      cep: maskCep,
      placa: maskPlaca,
      cnh: maskCnh,
      somenteNumeros: somenteNumeros,
      numeroFormatado: maskNumeroFormatado,
      pattern: maskPattern
    },
    escapeHtml: escapeHtml,
    formatarData: formatarData,
    buscarCep: buscarCep,
    validadores: {
      obrigatorio: validarObrigatorio,
      email: validarEmail,
      cpf: validarCpf,
      cnpj: validarCnpj,
      documento: validarDocumento,
      telefone: validarTelefone,
      cnh: validarCnh,
      dataFutura: validarDataFutura
    },
    ligarFechamentoModal: ligarFechamentoModal
  };
})();
