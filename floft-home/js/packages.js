/* Блок «Пакеты»: расчёт трёх вариантов конференции по числу гостей и дню недели.
   Слева — выбор варианта, справа — сумма и состав выбранного. */
(function(){
  // --- прайс F-LOFT 2026 (_context/floft_price_sheet_2026-09-30.md) ---
  var P = {rentWeek:200000, rentWeekend:280000, kit:115000, coffee:2500, series:5500,
           wardrobe:10000, cleaning:10000, tv85:15000, net500:20000, mic:5000, spk:15000};
  var guestsOpts=[50,100,150,200], dayOpts=[['week','Вс–Чт'],['weekend','Пт, Сб']];
  var st={guests:100, day:'week', tier:'rec'};

  function rub(n){return Math.round(n).toLocaleString('ru-RU')+' ₽'}
  function ceil100(n){return Math.ceil(n/100)}

  function L(name,sub,price,isNew){return {n:name,s:sub,p:price,isNew:!!isNew}}
  function lines(tier){
    var g=st.guests, rent=st.day==='week'?P.rentWeek:P.rentWeekend, out=[];
    out.push(L('Лофт целиком на сутки','07:00–03:00, администратор и клининг',rent));
    out.push(L('Мебель и 170 стульев','входят в аренду',0));
    out.push(L('Комплект техники','LED-экран, свет, звук, 4 микрофона, ноутбук',P.kit));
    if(tier==='base') out.push(L('Кофе-брейк','от '+P.coffee.toLocaleString('ru-RU')+' ₽ на гостя',P.coffee*g));
    else out.push(L('Серия кофе-брейков','от '+P.series.toLocaleString('ru-RU')+' ₽ на гостя',P.series*g,tier==='rec'));
    out.push(L('Гардероб','гардеробщик на каждые 100 гостей',P.wardrobe*ceil100(g)));
    if(g>200) out.push(L('Клининг','при гостях свыше 200',P.cleaning));
    if(tier==='max'){
      out.push(L('Второй экран 85″','плазма для презентера или зала',P.tv85,true));
      out.push(L('Интернет 500 Мбит/с','вместо стандартных 50',P.net500,true));
      out.push(L('2 доп. микрофона','для дискуссий и вопросов из зала',2*P.mic,true));
      out.push(L('Дополнительная колонка','Electro-Voice, активная',P.spk,true));
    }
    return out;
  }
  function total(tier){return lines(tier).reduce(function(a,x){return a+x.p},0)}

  var TIERS=[
    {id:'base',name:'Базовый',   forWho:'Всё нужное для одной конференции: зал, техника, кофе-брейк.',btn:'Хочу этот вариант'},
    {id:'rec', name:'Рекомендуем',forWho:'Полный день программы: серия кофе-брейков вместо одного.',btn:'Записаться на просмотр'},
    {id:'max', name:'Максимум',  forWho:'Для длинной программы и гибридного формата: второй экран, быстрый интернет, больше микрофонов.',btn:'Хочу этот вариант'}
  ];

  function $(id){return document.getElementById(id)}
  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

  var tabs=$('pk-tabs');
  if(!tabs) return;

  // варианты: кнопки создаются один раз, цены в них обновляются при каждом пересчёте
  TIERS.forEach(function(t){
    var b=el('button','tab'+(t.id==='rec'?' tab--rec':'')); b.type='button'; b.dataset.tier=t.id;
    b.appendChild(el('span','tab__name',t.name));
    b.appendChild(el('span','tab__price'));
    b.appendChild(el('span','tab__hint'));
    b.addEventListener('click',function(){st.tier=t.id; render()});
    tabs.appendChild(b);
  });

  function render(){
    Array.prototype.forEach.call(tabs.children,function(b){
      var sum=total(b.dataset.tier);
      b.setAttribute('aria-pressed',String(b.dataset.tier===st.tier));
      b.querySelector('.tab__price').textContent='от '+rub(sum);
      b.querySelector('.tab__hint').textContent='≈ '+rub(sum/st.guests)+' на гостя';
    });
    var t=TIERS.filter(function(x){return x.id===st.tier})[0], ls=lines(t.id), sum=total(t.id);
    $('pk-price').textContent=rub(sum);
    $('pk-per').textContent='≈ '+rub(sum/st.guests)+' на гостя · '+st.guests+' гостей';
    $('pk-for').textContent=t.forWho;
    var go=$('pk-go'); go.textContent=t.btn; go.setAttribute('data-tier',t.id);
    var ul=$('pk-list'); ul.innerHTML='';
    ls.forEach(function(x){
      var li=el('li',x.isNew?'li--new':'');
      li.appendChild(el('span','li__n',x.n));
      li.appendChild(el('span','li__p',x.p?rub(x.p):'включено'));
      li.appendChild(el('span','li__s',x.s));
      ul.appendChild(li);
    });
  }

  function seg(id,opts,key){
    var row=$(id);
    opts.forEach(function(o){
      var v=Array.isArray(o)?o[0]:o, lab=Array.isArray(o)?o[1]:o;
      var b=el('button','seg__btn',lab); b.type='button'; b.dataset.v=v;
      b.setAttribute('aria-pressed',String(String(st[key])===String(v)));
      b.addEventListener('click',function(){
        st[key]=(key==='guests')?+v:v;
        Array.prototype.forEach.call(row.children,function(c){c.setAttribute('aria-pressed',String(c===b))});
        render();
      });
      row.appendChild(b);
    });
  }
  seg('ctl-guests',guestsOpts,'guests'); seg('ctl-day',dayOpts,'day'); render();

  // телефон: состав раскрывается по кнопке
  var toggle=$('pk-toggle'), detail=$('pk-detail');
  toggle.addEventListener('click',function(){
    var open=toggle.getAttribute('aria-expanded')!=='true';
    toggle.setAttribute('aria-expanded',String(open));
    detail.classList.toggle('is-open',open);
  });
})();
