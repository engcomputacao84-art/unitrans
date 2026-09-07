document.querySelectorAll('.toolbar .chip').forEach(function (chip) {
  chip.addEventListener('click', function () {
    this.parentElement.querySelectorAll('.chip').forEach(function (c) {
      c.classList.remove('active');
    });
    this.classList.add('active');
  });
});

