/* =========================================================
   UI — componentes compartilhados da área "equipe"
   - UI.confirmar(opcoes): abre um modal de confirmação e
     retorna uma Promise<boolean> (true = confirmou).
   - UI.toast(mensagem, tipo): mostra um aviso de sucesso
     ("success", padrão) ou erro ("error") no canto da tela.
   Os elementos são criados uma única vez e reaproveitados
   por todas as páginas que incluírem este arquivo.
   ========================================================= */
window.UI = (function () {

  /* ---------- Modal de confirmação ---------- */
  var confirmOverlay = null;

  function criarConfirmOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'ui-confirm-overlay';
    overlay.id = 'uiConfirmOverlay';
    overlay.innerHTML =
      '<div class="ui-confirm" role="alertdialog" aria-modal="true">' +
        '<div class="ui-confirm-icon"><i class="fas fa-circle-question"></i></div>' +
        '<h3 class="ui-confirm-title"></h3>' +
        '<p class="ui-confirm-message"></p>' +
        '<div class="ui-confirm-actions">' +
          '<button type="button" class="btn btn-ghost ui-confirm-cancel"></button>' +
          '<button type="button" class="btn ui-confirm-ok"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmar(opcoes) {
    if (typeof opcoes === 'string') opcoes = { message: opcoes };
    opcoes = opcoes || {};

    var titulo = opcoes.title || 'Confirmar ação';
    var mensagem = opcoes.message || 'Tem certeza que deseja continuar?';
    var labelConfirmar = opcoes.confirmLabel || 'Confirmar';
    var labelCancelar = opcoes.cancelLabel || 'Cancelar';
    var perigo = opcoes.tone === 'danger';

    if (!confirmOverlay) confirmOverlay = criarConfirmOverlay();

    var tituloEl = confirmOverlay.querySelector('.ui-confirm-title');
    var mensagemEl = confirmOverlay.querySelector('.ui-confirm-message');
    var okBtn = confirmOverlay.querySelector('.ui-confirm-ok');
    var cancelBtn = confirmOverlay.querySelector('.ui-confirm-cancel');
    var iconEl = confirmOverlay.querySelector('.ui-confirm-icon');

    tituloEl.textContent = titulo;
    mensagemEl.textContent = mensagem;
    okBtn.textContent = labelConfirmar;
    cancelBtn.textContent = labelCancelar;
    okBtn.className = 'btn ui-confirm-ok ' + (perigo ? 'btn-danger' : 'btn-primary');
    confirmOverlay.classList.toggle('danger', perigo);
    iconEl.innerHTML = perigo ? '<i class="fas fa-trash-alt"></i>' : '<i class="fas fa-circle-question"></i>';

    return new Promise(function (resolve) {
      function fechar(resultado) {
        confirmOverlay.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        confirmOverlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKeyDown);
        resolve(resultado);
      }
      function onOk() { fechar(true); }
      function onCancel() { fechar(false); }
      function onOverlayClick(e) { if (e.target === confirmOverlay) fechar(false); }
      function onKeyDown(e) { if (e.key === 'Escape') fechar(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      confirmOverlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKeyDown);

      confirmOverlay.classList.add('open');
      okBtn.focus();
    });
  }

  /* ---------- Toast de sucesso / erro ---------- */
  var toastEl = null;

  function criarToastEl() {
    var el = document.createElement('div');
    el.className = 'ui-toast';
    el.id = 'uiToast';
    el.innerHTML =
      '<span class="ui-toast-icon"><i class="fas fa-check"></i></span>' +
      '<span class="ui-toast-msg"></span>';
    document.body.appendChild(el);
    return el;
  }

  function toast(mensagem, tipo) {
    var isError = tipo === 'error';
    if (!toastEl) toastEl = criarToastEl();

    var iconEl = toastEl.querySelector('.ui-toast-icon');
    var msgEl = toastEl.querySelector('.ui-toast-msg');

    msgEl.textContent = mensagem;
    iconEl.innerHTML = isError ? '<i class="fas fa-times"></i>' : '<i class="fas fa-check"></i>';
    toastEl.classList.remove('error');
    if (isError) toastEl.classList.add('error');

    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 3200);
  }

  return {
    confirmar: confirmar,
    toast: toast
  };
})();
