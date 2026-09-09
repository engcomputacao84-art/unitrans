(function () {

  var API_BASE = '/api';
  var motoristaId = localStorage.getItem('unitrans_motorista_id');

  var elCarregando = document.getElementById('telegramCarregando');
  var elBadge = document.getElementById('telegramBadge');
  var elNaoVinculado = document.getElementById('blocoNaoVinculado');
  var elVinculado = document.getElementById('blocoVinculado');
  var elBlocoCodigo = document.getElementById('blocoCodigo');
  var elInputCodigo = document.getElementById('inputCodigo');
  var btnGerarCodigo = document.getElementById('btnGerarCodigo');
  var btnDesvincular = document.getElementById('btnDesvincular');

  function setBadge(vinculado) {
    elBadge.textContent = vinculado ? 'Conectado' : 'Não conectado';
    elBadge.className = 'badge ' + (vinculado ? 'success' : 'default');
  }

  function mostrarEstado(vinculado) {
    elCarregando.style.display = 'none';
    setBadge(vinculado);
    elNaoVinculado.style.display = vinculado ? 'none' : 'block';
    elVinculado.style.display = vinculado ? 'block' : 'none';
  }

  function carregarStatus() {
    if (!motoristaId) {
      elCarregando.textContent = 'Não foi possível identificar sua conta. Faça login novamente.';
      return;
    }
    fetch(API_BASE + '/telegram/status/' + encodeURIComponent(motoristaId))
      .then(function (res) {
        if (!res.ok) throw new Error('Não foi possível consultar o status.');
        return res.json();
      })
      .then(function (dados) {
        mostrarEstado(!!dados.vinculado);
      })
      .catch(function () {
        elCarregando.textContent = 'Não foi possível consultar o status agora. Tente recarregar a página.';
      });
  }

  function gerarCodigo() {
    btnGerarCodigo.disabled = true;
    btnGerarCodigo.textContent = 'Gerando...';

    fetch(API_BASE + '/telegram/codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: motoristaId })
    })
      .then(function (res) {
        return res.json().then(function (corpo) {
          if (!res.ok) throw new Error(corpo.erro || 'Não foi possível gerar o código.');
          return corpo;
        });
      })
      .then(function (dados) {
        elInputCodigo.value = '/vincular ' + dados.codigo;
        elBlocoCodigo.style.display = 'block';
        if (UI && UI.toast) UI.toast('Código gerado! Envie a mensagem para o bot no Telegram.', 'success');
      })
      .catch(function (err) {
        if (UI && UI.toast) UI.toast(err.message || 'Não foi possível gerar o código.', 'error');
      })
      .finally(function () {
        btnGerarCodigo.disabled = false;
        btnGerarCodigo.textContent = 'Gerar código de vinculação';
      });
  }

  function desvincular() {
    var prosseguir = UI && UI.confirmar
      ? UI.confirmar({
          title: 'Desvincular Telegram',
          message: 'Tem certeza que deseja desvincular sua conta do Telegram? Você deixará de receber avisos por lá.',
          tone: 'danger',
          confirmLabel: 'Desvincular'
        })
      : Promise.resolve(window.confirm('Desvincular sua conta do Telegram?'));

    prosseguir.then(function (ok) {
      if (!ok) return;

      fetch(API_BASE + '/telegram/desvincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: motoristaId })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Não foi possível desvincular.');
          if (UI && UI.toast) UI.toast('Telegram desvinculado.', 'success');
          elBlocoCodigo.style.display = 'none';
          elInputCodigo.value = '';
          mostrarEstado(false);
        })
        .catch(function (err) {
          if (UI && UI.toast) UI.toast(err.message || 'Não foi possível desvincular.', 'error');
        });
    });
  }

  btnGerarCodigo.addEventListener('click', gerarCodigo);
  btnDesvincular.addEventListener('click', desvincular);

  carregarStatus();

})();
