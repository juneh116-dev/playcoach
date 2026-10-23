/*
  신청 폼 처리. 입력값은 어디로도 보내지 않습니다.
  - 폼 입력칸에는 name 속성이 없어서, 스크립트가 꺼져 있어도 값이 주소창·서버로 넘어가지 않습니다.
  - 제출 → 개인정보 안내 팝업 → 동의 → 입력값 즉시 삭제 → result.html 이동.
  - 나중에 폼을 Make·구글시트 등에 연결하면 팝업 문구(index.html의 #privacy-modal)를 반드시 고쳐야 합니다.
*/
(function () {
  var form = document.getElementById('lead-form');
  var modal = document.getElementById('privacy-modal');
  if (!modal) return;
  var agree = document.getElementById('privacy-agree');
  var ok = document.getElementById('privacy-ok');
  var cancel = document.getElementById('privacy-cancel');
  var mode = 'info';
  var application = document.getElementById('apply-dialog');
  var formHome = form && form.parentNode;
  var formNext = form && form.nextSibling;
  var applicationTrigger;

  if (application && form) {
    // 홈페이지의 링크와 버튼은 기본적으로 동일한 신청 팝업을 엽니다.
    // 로고, 폼 내부 동작, 대화상자 내부 동작은 기존 기능을 유지합니다.
    function isApplicationTrigger(trigger) {
      return trigger && !trigger.matches('.logo') && !trigger.closest('form, dialog');
    }
    document.querySelectorAll('a, button').forEach(function (trigger) {
      if (!isApplicationTrigger(trigger)) return;
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'apply-dialog');
    });
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('a, button');
      if (!isApplicationTrigger(trigger)) return;
      e.preventDefault();
      applicationTrigger = trigger;
      document.getElementById('apply-form-slot').appendChild(form);
      if (!application.open) application.showModal();
      document.getElementById('f-name').focus();
    });
    application.querySelector('.apply-close').addEventListener('click', function () { application.close(); });
    application.addEventListener('click', function (e) {
      var box = application.getBoundingClientRect();
      if (e.target === application && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) application.close();
    });
    application.addEventListener('close', function () {
      formHome.insertBefore(form, formNext);
      if (applicationTrigger) applicationTrigger.focus({ preventScroll: true });
    });
  }

  function wipe() {
    if (!form) return;
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else el.value = '';
    });
    form.reset();
  }

  function open(m) {
    mode = m;
    agree.checked = false;
    ok.disabled = true;
    ok.textContent = m === 'submit' ? '동의하고 완료하기' : '확인했습니다';
    modal.classList.add('open');
    modal.showModal();
    agree.focus();
  }

  function close() {
    modal.classList.remove('open');
    modal.close();
  }

  agree.addEventListener('change', function () { ok.disabled = !agree.checked; });
  cancel.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  modal.addEventListener('close', function () { modal.classList.remove('open'); });

  ok.addEventListener('click', function () {
    if (mode !== 'submit') { close(); return; }
    wipe();
    // 이 데모는 연락처를 저장하지 않으므로 실제 리드 전환 이벤트를 보내지 않습니다.
    location.replace('result.html');
  });

  document.querySelectorAll('[data-privacy-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (application && form && !b.closest('form, dialog')) return;
      e.preventDefault();
      open('info');
    });
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      open('submit');
    });
  }

  // 검토 메모 패널 닫기 (검토용 빌드에만 있음)
  var rp = document.querySelector('.review-panel button');
  if (rp) rp.addEventListener('click', function () { rp.parentNode.remove(); });
})();
