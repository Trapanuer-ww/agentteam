/* Блок «Пакеты»: расчёт трёх вариантов конференции по числу гостей и дню недели. */
(function(){
  // --- прайс F-LOFT 2026 (_context/floft_price_sheet_2026-09-30.md) ---
  var P = {rentWeek:200000, rentWeekend:280000, kit:115000, coffee:2500, series:5500,
           wardrobe:10000, cleaning:10000, tv85:15000, net500:20000, mic:5000, spk:15000};
  var guestsOpts=[50,100,150,200], dayOpts=[['week','Вс–Чт'],['weekend','Пт, Сб']];
  var st={guests:100, day:'week'};

  function rub(n){return Math.round(n).toLocaleString('ru-RU')+' ₽'}
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
  var TIERS=[
    {id:'base',name:'Базовый',   forWho:'Всё нужное для одной конференции: зал, техника, кофе-брейк.',btn:'Хочу этот вариант'},
    {id:'rec', name:'Рекомендуем',forWho:'Полный день программы: серия кофе-брейков вместо одного.',btn:'Записаться на просмотр',tag:'Рекомендуем'},
    {id:'max', name:'Максимум',  forWho:'Для длинной программы и гибридного формата: второй экран, быстрый интернет, больше микрофонов.',btn:'Хочу этот вариант'}
  ];

  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

  function render(){
    var grid=document.getElementById('pk-grid'); grid.innerHTML='';
    TIERS.forEach(function(t){
      var ls=lines(t.id), total=ls.reduce(function(a,x){return a+x.p},0);
      var card=el('article','tier'+(t.id==='rec'?' tier--rec':''));
      if(t.tag) card.appendChild(el('span','tier__tag',t.tag));
      card.appendChild(el('h3','tier__name',t.name));
      card.appendChild(el('p','tier__for',t.forWho));
      var sum=el('div','tier__sum');
      sum.appendChild(el('span','tier__from','от'));
      sum.appendChild(el('span','tier__price',rub(total)));
      sum.appendChild(el('p','tier__per','≈ '+rub(total/st.guests)+' на гостя · '+st.guests+' гостей'));
      card.appendChild(sum);
      var ul=el('ul','tier__list');
      ls.forEach(function(x){
        var li=el('li',x.isNew?'li--new':'');
        li.appendChild(el('span','li__n',x.n));
        li.appendChild(el('span','li__p',x.p?rub(x.p):'включено'));
        li.appendChild(el('span','li__s',x.s));
        ul.appendChild(li);
      });
      card.appendChild(ul);
      var go=el('div','tier__go');
      var a=el('a','btn '+(t.id==='rec'?'btn--accent':'btn--line'),t.btn);
      a.href='#visit'; a.setAttribute('data-tier',t.id);
      go.appendChild(a); card.appendChild(go);
      grid.appendChild(card);
    });
  }
  function seg(id,opts,key){
    var row=document.getElementById(id);
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
})();
