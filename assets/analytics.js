/* PLAYCOACH GA4: fixed identifiers only; never read name/contact values. */
(function () {
  'use strict';
  if (window.playcoachAnalytics) return;
  var pageType = document.getElementById('lead-form') ? 'landing' : 'result';
  var context = { entry_point: 'inline_form', form_placement: 'inline' };
  var started = false;
  var completed = false;
  var sports = { '러닝':'running', '야구':'baseball', '축구':'soccer', '테니스':'tennis', '골프':'golf', '헬스':'fitness', '배구':'volleyball', '배드민턴':'badminton', '기타':'other' };
  var allowedEvents = ['ui_click','section_view','content_view','application_open','application_close','application_start','sport_select','application_submit_attempt','form_validation_error','privacy_notice_open','privacy_notice_close','privacy_acknowledgement_change','privacy_notice_acknowledge','application_intent_complete','result_view'];
  var allowedParams = ['ui_location','element_id','action','intended_action','interest_sport','content_type','content_id','section_id','form_id','entry_point','form_placement','sport','field_name','error_type','mode','checked','close_method','form_started'];
  var targets = new WeakMap();
  function emit(name, params, callback) {
    if (allowedEvents.indexOf(name) < 0) return;
    var payload = { app_mode: 'demo', page_type: pageType, send_to: 'G-8981HN9P16' };
    Object.keys(params || {}).forEach(function (key) {
      if (allowedParams.indexOf(key) >= 0) payload[key] = params[key];
    });
    if (callback) {
      payload.event_callback = callback;
      payload.event_timeout = 800;
      payload.transport_type = 'beacon';
    }
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, payload);
      else if (callback) callback();
    } catch (e) { if (callback) callback(); }
  }
  function register(selector, ids, location, extras) {
    document.querySelectorAll(selector).forEach(function (el, i) {
      if (!ids[i]) return;
      targets.set(el, Object.assign({ element_id: ids[i], ui_location: location, action: 'open_application' }, (extras && extras[i]) || {}));
    });
  }
  register('.hd .logo', ['header_logo'], 'header', [{action:'home'}]);
  register('.hd .r a', ['header_how','header_faq','header_privacy','cta-top'], 'header', [
    {intended_action:'view_how'}, {intended_action:'view_faq'}, {intended_action:'view_privacy'}, {}
  ]);
  register('#cta-main', ['cta-main'], 'hero');
  var topics = ['batting_form','pitching_balance','fielding_footwork','amateur_baseball','beginner'];
  register('.chips a', topics.map(function (v) { return 'hero_chip_' + v; }), 'hero', topics.map(function (v) { return {content_type:'topic',content_id:v}; }));
  var categories = ['running','baseball','soccer','tennis','golf','fitness','volleyball','badminton','video_analysis','all'];
  register('.cats .cat', categories.map(function (v) { return 'category_' + v; }), 'category_nav', categories.map(function (v, i) { return i < 8 ? {interest_sport:v} : {content_id:v}; }));
  var coachSports = ['running','baseball','soccer'];
  register('.sport-section .section-title a', coachSports.map(function (v) { return 'coaches_all_' + v; }), 'popular_coaches', coachSports.map(function (v) { return {interest_sport:v}; }));
  register('.dark a', ['mid_feedback_cta'], 'mid_banner');
  register('.easy .more', ['how_more'], 'how', [{intended_action:'view_how'}]);
  register('.ft a', ['footer_how','footer_feedback_cta','footer_privacy'], 'footer', [{intended_action:'view_how'}, {}, {intended_action:'view_privacy'}]);
  register('.result a.btn', ['result_home'], 'result', [{action:'home'}]);
  document.addEventListener('click', function (event) {
    var el = event.target.closest && event.target.closest('a');
    var data = el && targets.get(el);
    if (data) emit('ui_click', data);
  });
  function formContext() {
    var form = document.getElementById('lead-form');
    if (!form || !form.closest('#apply-dialog')) context = {entry_point:'inline_form',form_placement:'inline'};
    return Object.assign({form_id:'lead-form'}, context);
  }
  function selectedSport() {
    var select = document.getElementById('f-select');
    return select && sports[select.value] || 'not_selected';
  }
  window.playcoachAnalytics = {
    emit: emit,
    context: formContext,
    sport: selectedSport,
    openApplication: function (trigger) {
      var data = targets.get(trigger);
      context = {entry_point:data ? data.element_id : 'unknown',form_placement:'modal'};
      completed = false;
      emit('application_open', formContext());
    },
    closeApplication: function (method) {
      emit('application_close', Object.assign(formContext(), {close_method:method,form_started:started}));
    },
    complete: function (snapshot, navigate) {
      if (completed) return;
      completed = true;
      var navigated = false;
      function finish() { if (!navigated) { navigated = true; navigate(); } }
      window.setTimeout(finish, 900);
      emit('application_intent_complete', snapshot, finish);
    }
  };
  var form = document.getElementById('lead-form');
  if (form) {
    function start(event) {
      if (event.isTrusted === false || !event.target.matches('#f-name, #f-contact, #f-select') || started) return;
      started = true;
      emit('application_start', formContext());
    }
    form.addEventListener('input', start);
    form.addEventListener('change', start);
    document.getElementById('f-select').addEventListener('change', function (event) {
      if (event.isTrusted === false) return;
      emit('sport_select', Object.assign(formContext(), {sport:selectedSport()}));
    });
  } else {
    emit('result_view', {});
  }
  if (!('IntersectionObserver' in window)) return;
  var pending = new Map(), visible = new Set(), viewed = new Set(), observations = new WeakMap();
  function schedule(el) {
    if (document.hidden || pending.has(el) || viewed.has(el)) return;
    pending.set(el, window.setTimeout(function () {
      pending.delete(el);
      if (!visible.has(el) || document.hidden) return;
      viewed.add(el);
      var data = observations.get(el);
      emit(data.event, data.params);
      observer.unobserve(el);
      visible.delete(el);
    }, 1000));
  }
  var observer = new window.IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) { visible.add(el); schedule(el); }
      else {
        visible.delete(el);
        window.clearTimeout(pending.get(el));
        pending.delete(el);
      }
    });
  }, {threshold:[0,0.5]});
  document.addEventListener('visibilitychange', function () {
    pending.forEach(function (timer) { window.clearTimeout(timer); });
    pending.clear();
    if (!document.hidden) visible.forEach(schedule);
  });
  function observe(el, event, params) {
    if (!el) return;
    observations.set(el, {event:event,params:params});
    observer.observe(el);
  }
  [['.hero h1','hero'],['#running h2','popular_running'],['#baseball h2','popular_baseball'],['#soccer h2','popular_soccer'],['.features h2','features'],['.concerns h2','concerns'],['.easy h2','how'],['.ent .pitch h2','apply'],['.ft b','footer']].forEach(function (pair) {
    observe(document.querySelector(pair[0]), 'section_view', {section_id:pair[1]});
  });
  var features = ['video_analysis','problem_based_matching','first_consultation'];
  var concerns = ['posture_correction','skill_plateau','injury_prevention','training_support','competition_preparation','fundamentals'];
  var coaches = ['running_form','running_injury_prevention','running_performance','running_beginner','baseball_batting','baseball_pitching','baseball_fielding','baseball_beginner','soccer_basics','soccer_dribbling','soccer_shooting','soccer_conditioning'];
  [['.feature',features,'feature'],['.concern',concerns,'concern'],['.coach-card',coaches,'coach']].forEach(function (group) {
    document.querySelectorAll(group[0]).forEach(function (el, i) {
      var params = {content_type:group[2],content_id:group[1][i]};
      if (!params.content_id) return;
      if (group[2] === 'coach') params.sport = coachSports[Math.floor(i/4)];
      observe(el, 'content_view', params);
    });
  });
})();
