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
  var analytics = window.playcoachAnalytics;
  var applicationCloseMethod = 'unknown';
  var privacyCloseMethod = 'unknown';
  function track(name, params) {
    if (analytics) analytics.emit(name, Object.assign(analytics.context(), params || {}));
  }

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
      if (!application.open) {
        application.showModal();
        applicationCloseMethod = 'unknown';
        if (analytics) analytics.openApplication(trigger);
      }
      document.getElementById('f-name').focus();
    });
    application.querySelector('.apply-close').addEventListener('click', function () { applicationCloseMethod = 'button'; application.close(); });
    application.addEventListener('cancel', function () { applicationCloseMethod = 'escape'; });
    application.addEventListener('click', function (e) {
      var box = application.getBoundingClientRect();
      if (e.target === application && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) { applicationCloseMethod = 'backdrop'; application.close(); }
    });
    application.addEventListener('close', function () {
      if (analytics) analytics.closeApplication(applicationCloseMethod);
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
    privacyCloseMethod = 'unknown';
    track('privacy_notice_open', {mode:mode});
    agree.focus();
  }

  function close(method) {
    privacyCloseMethod = method;
    modal.classList.remove('open');
    modal.close();
  }

  agree.addEventListener('change', function () { ok.disabled = !agree.checked; track('privacy_acknowledgement_change', {mode:mode,checked:agree.checked}); });
  cancel.addEventListener('click', function () { close('button'); });
  modal.addEventListener('cancel', function () { privacyCloseMethod = 'escape'; });
  modal.addEventListener('click', function (e) { if (e.target === modal) close('backdrop'); });
  modal.addEventListener('close', function () { modal.classList.remove('open'); track('privacy_notice_close', {mode:mode,close_method:privacyCloseMethod}); });

  ok.addEventListener('click', function () {
    if (!agree.checked) return;
    if (mode !== 'submit') { track('privacy_notice_acknowledge', {mode:mode}); close('acknowledge'); return; }
    var snapshot = analytics && Object.assign(analytics.context(), {sport:analytics.sport()});
    wipe();
    // 완료는 데모 신청 의향이며 실제 접수(generate_lead)가 아닙니다.
    function navigate() { location.replace('result.html'); }
    if (analytics) analytics.complete(snapshot, navigate);
    else navigate();
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
      track('application_submit_attempt');
      if (!form.checkValidity()) {
        var invalid = form.querySelector(':invalid');
        if (invalid) {
          var fieldNames = {'f-name':'name','f-contact':'contact','f-select':'sport'};
          var errorType = invalid.validity.valueMissing ? 'required' : invalid.validity.tooLong ? 'too_long' : 'format';
          track('form_validation_error', {field_name:fieldNames[invalid.id] || 'unknown',error_type:errorType});
        }
        form.reportValidity();
        return;
      }
      open('submit');
    });
  }

  // 검토 메모 패널 닫기 (검토용 빌드에만 있음)
  var rp = document.querySelector('.review-panel button');
  if (rp) rp.addEventListener('click', function () { rp.parentNode.remove(); });
})();
