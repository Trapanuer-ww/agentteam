/* F-LOFT — главная. Без библиотек.
   Блоки: шапка · выпадающее меню · мобильное меню · попап и форма · отзывы · появление блоков · плавающая кнопка · cookie */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка: прозрачная над фото, плотная после прокрутки ---------- */
  var hdr = $('#hdr');
  function onScroll() { hdr.classList.toggle('is-solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Выпадающее меню «Форматы» ---------- */
  $$('.has-sub').forEach(function (item) {
    var btn = $('.nav__toggle', item);
    var timer;
    function set(open) {
      clearTimeout(timer);
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    if (window.matchMedia('(hover: hover)').matches) {
      item.addEventListener('mouseenter', function () { set(true); });
      item.addEventListener('mouseleave', function () { timer = setTimeout(function () { set(false); }, 140); });
    }
    item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget)) set(false); });
    item.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!item.contains(e.target)) set(false); });
  });

  /* ---------- Мобильное меню ---------- */
  var burger = $('.burger');
  var mnav = $('#mnav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('menu-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      mnav.hidden = false;
      requestAnimationFrame(function () { mnav.classList.add('is-open'); });
    } else {
      mnav.classList.remove('is-open');
      setTimeout(function () { if (burger.getAttribute('aria-expanded') !== 'true') mnav.hidden = true; }, reduced ? 0 : 250);
    }
    updateFab();
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* ---------- Попап с формой ----------
     Одна форма (CF7), три входа. Заголовок совпадает с кнопкой, по которой нажали;
     в скрытое поле «Сообщение» (textarea-900) пишется источник — поле уже есть в форме, интеграция не меняется. */
  var INTENTS = {
    viewing: { title: 'Записаться на просмотр', sub: 'Покажем зал, расскажем о цене и особенностях.', note: 'Запись на просмотр площадки' },
    price:   { title: 'Узнать цену и особенности зала', sub: 'Перезвоним и ответим на вопросы.', note: 'Запрос цены и особенностей зала' },
    request: { title: 'Узнать цену и особенности зала', sub: 'Перезвоним и ответим на вопросы.', note: 'Заявка с плавающей кнопки (моб.)' }
  };
  var modal = $('#lead');
  var form = $('#lead-form');
  var formBox = $('.modal__form', modal);
  var okBox = $('#lead-ok');
  var errBox = $('#lead-err');
  var lastTrigger = null;

  function openModal(intent, trigger) {
    var cfg = INTENTS[intent] || INTENTS.price;
    lastTrigger = trigger || null;
    $('#lead-title').textContent = cfg.title;
    $('#lead-sub').textContent = cfg.sub;
    var note = $('[name="textarea-900"]', modal);
    if (note) note.value = cfg.note;
    okBox.hidden = true;
    formBox.hidden = false;
    if (burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
    updateFab();
  }
  function closeModal() {
    if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open');
  }
  modal.addEventListener('close', function () {
    document.documentElement.style.overflow = '';
    updateFab();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal();   // клик по подложке или «Закрыть»
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-form]');
    if (t) { e.preventDefault(); openModal(t.getAttribute('data-intent'), t); }
  });

  /* Маска телефона: +7 (XXX) XXX-XX-XX. Поле пустое, пока человек не начал ввод (без «+7 (___)» в value). */
  var phone = $('[name="your-phone"]', modal);
  function digits(v) {
    var d = v.replace(/\D/g, '');
    if (/^\s*(\+?7|8)/.test(v)) d = d.slice(1);       // «+7», «7» или «8» в начале — код страны, не часть номера
    return d.slice(0, 10);
  }
  function fmt(d, started) {
    if (!d) return started ? '+7 (' : '';
    var s = '+7 (' + d.slice(0, 3);
    if (d.length >= 3) s += ') ' + d.slice(3, 6);
    if (d.length >= 6) s += '-' + d.slice(6, 8);
    if (d.length >= 8) s += '-' + d.slice(8, 10);
    return s;
  }
  if (phone) {
    phone.addEventListener('input', function () {
      phone.value = fmt(digits(phone.value), /\d/.test(phone.value));
    });
    phone.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && /\D$/.test(phone.value)) {             // стираем разделитель вместе с цифрой перед ним
        e.preventDefault();
        phone.value = fmt(digits(phone.value).slice(0, -1));
      }
    });
  }

  /* Антиспам-заглушка в стиле плагина сайта: выбрать нужную иконку из трёх */
  var ICONS = {
    'ключ':   '<circle cx="7" cy="12" r="3.500"/><path d="M10.500 12H20M17 12v3M14 12v2"/>',
    'сердце': '<path d="M12 19s-7-4.300-7-9a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 4.700-7 9-7 9z"/>',
    'звезду': '<path d="M12 4l2.400 5 5.400.700-4 3.800 1 5.400L12 16.300 7.200 18.900l1-5.400-4-3.800 5.400-.700z"/>'
  };
  var captchaWord = '';
  function buildCaptcha() {
    var keys = Object.keys(ICONS).sort(function () { return Math.random() - .5; });
    captchaWord = keys[Math.floor(Math.random() * keys.length)];
    $('#captcha-word').textContent = captchaWord;
    $('#captcha-opts').innerHTML = keys.map(function (k, i) {
      return '<label><input type="radio" name="kc_captcha" value="' + (k === captchaWord ? 'kc_human' : 'bot') + '" aria-label="Вариант ' + (i + 1) + '">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + ICONS[k] + '</svg></label>';
    }).join('');
  }
  buildCaptcha();

  function showError(msg, field) {
    errBox.textContent = msg;
    errBox.hidden = false;
    if (field && field.focus) field.focus();
  }
  function validate() {
    var name = $('[name="your-name"]', form);
    var agree = $$('[data-agree]', form);
    var human = $('[name="kc_captcha"]:checked', form);
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    $('.agree', form).classList.remove('is-invalid');
    $('.captcha', form).classList.remove('is-invalid');
    errBox.hidden = true;

    if (name.value.trim().length < 2) { name.setAttribute('aria-invalid', 'true'); showError('Напишите, как к вам обращаться.', name); return false; }
    if (digits(phone.value).length < 10) { phone.setAttribute('aria-invalid', 'true'); showError('Укажите телефон полностью — 10 цифр после +7.', phone); return false; }
    if (!agree.every(function (c) { return c.checked; })) {
      $('.agree', form).classList.add('is-invalid');
      showError('Отметьте оба согласия — без них мы не можем принять заявку.', agree.filter(function (c) { return !c.checked; })[0]);
      return false;
    }
    if (!human || human.value !== 'kc_human') {
      $('.captcha', form).classList.add('is-invalid');
      showError('Выберите картинку: ' + captchaWord + '.', $('[name="kc_captcha"]', form));
      return false;
    }
    return true;
  }
  function showSuccess() {
    formBox.hidden = true;
    okBox.hidden = false;
    var h = $('.modal__title', okBox);
    if (h) h.focus();
    form.reset();
    buildCaptcha();
  }

  if (form.hasAttribute('data-demo')) {
    /* ПРОТОТИП: заявка никуда не отправляется. На сайте этот блок не нужен — отправкой занимается Contact Form 7. */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('[name="kc_honeypot"]', form).value) return;
      if (validate()) showSuccess();
    });
  }
  /* На сайте: события Contact Form 7. Экран «Заявка отправлена» показываем по штатному событию плагина,
     цели Метрики (cf7_success и автоцель формы) продолжают срабатывать как раньше. */
  document.addEventListener('wpcf7mailsent', function (e) {
    if (modal.contains(e.target)) showSuccess();
  });

  /* ---------- Отзывы: стрелки на десктопе, свайп на телефоне ---------- */
  var track = $('#rv-track');
  var prev = $('[data-rv-prev]');
  var next = $('[data-rv-next]');
  if (track && prev && next) {
    var step = function () {
      var q = $('.quote', track);
      return q ? q.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth * .8;
    };
    var sync = function () {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
    };
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---------- Появление блоков ---------- */
  var rv = $$('[data-rv]');
  if (reduced || !('IntersectionObserver' in window)) {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Плавающая кнопка (mobile) ----------
     Появляется, когда кнопка первого экрана ушла из виду; прячется у финального блока с такой же кнопкой,
     при открытом меню и попапе — чтобы на экране не было двух одинаковых призывов. */
  var fab = $('#fab');
  var heroCta = $('#hero-cta');
  var visit = $('#visit');
  var state = { hero: true, visit: false };
  function updateFab() {
    if (!fab) return;
    var on = !state.hero && !state.visit && !modal.open && burger.getAttribute('aria-expanded') !== 'true';
    fab.classList.toggle('is-on', on);
    fab.setAttribute('aria-hidden', String(!on));
    $$('a,button', fab).forEach(function (el) { el.tabIndex = on ? 0 : -1; });
  }
  if (fab && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { state.hero = en[0].isIntersecting; updateFab(); }).observe(heroCta);
    new IntersectionObserver(function (en) { state.visit = en[0].isIntersecting; updateFab(); }, { threshold: .25 }).observe($('.visit__cta', visit));
  }

  /* ---------- Cookie ---------- */
  var cookie = $('#cookie');
  function setCookieH() {
    var mobile = window.matchMedia('(max-width: 760px)').matches;
    var h = cookie && !cookie.hidden && mobile ? cookie.offsetHeight : 0;
    document.documentElement.style.setProperty('--cookie-h', h + 'px');
  }
  var accepted = false;
  try { accepted = localStorage.getItem('fl_cookie_ok') === '1'; } catch (e) {}
  if (/[?&]cookie=0/.test(location.search)) accepted = true;      // для скриншотов
  if (cookie && !accepted) {
    cookie.hidden = false;
    setCookieH();
    window.addEventListener('resize', setCookieH);
    $('#cookie-ok').addEventListener('click', function () {
      cookie.hidden = true;
      try { localStorage.setItem('fl_cookie_ok', '1'); } catch (e) {}
      setCookieH();
    });
  }

  /* ---------- Тестовый хостинг ----------
     Netlify добавляет в правый нижний угол свою плашку, она перекрывает плавающую кнопку и кнопку cookie на телефоне.
     Плашку не трогаем — поднимаем над ней свои элементы. На f-loft.ru плашки нет, отступ остаётся нулевым. */
  function hostBadge() {
    var b = document.getElementById('nl-badge-frame');
    if (!b) return false;
    document.documentElement.style.setProperty('--host-pad', '58px');   // видимая высота плашки с отступом
    setCookieH();
    return true;
  }
  if (!hostBadge() && 'MutationObserver' in window) {
    var mo = new MutationObserver(function () { if (hostBadge()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 8000);
  }
})();
