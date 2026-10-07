/* Блок «Стоимость»: три тарифа аренды. Каждый следующий включает предыдущий и добавляет своё —
   добавленное выделено мягким красным. Питание в сумму не входит (считается на гостя, см. строку под карточками). */
(function(){
  // --- прайс F-LOFT 2026 (_context/floft_price_sheet_2026-09-30.md) ---
  var P = {rentWeek:200000, rentWeekend:280000, kit:115000, tv85:15000, net500:20000, mic:5000, spk:15000};
  var dayOpts=[['week','Вс–Чт'],['weekend','Пт, Сб']];
  var st={day:'week'};

  // f: [полный текст, короткий для телефона, это добавка тарифа?]
  var TIERS=[
    {id:'base', name:'Базовый', forWho:'Зал целиком на сутки: мебель, бар и администратор площадки.', btn:'Хочу этот вариант', add:0,
     f:[['Весь лофт на сутки, 07:00–03:00','лофт на сутки'],
        ['Администратор и клининг','администратор, клининг'],
        ['Мебель и 170 стульев','мебель, 170 стульев'],
        ['Бар с оборудованием','бар']]},
    {id:'opt', name:'Оптимальный', best:true, forWho:'Зал и техника площадки: экран, свет и звук готовы к вашей программе.', btn:'Записаться на просмотр', add:P.kit,
     f:[['Всё из «Базового»','всё из «Базового»'],
        ['LED-экран и архитектурный свет','LED-экран и свет',1],
        ['Комплект звука','звук',1],
        ['4 радиомикрофона и ноутбук','4 микрофона, ноутбук',1]]},
    {id:'max', name:'Максимум', forWho:'Для большой программы и трансляций: второй экран, быстрый интернет, больше звука.', btn:'Хочу этот вариант',
     add:P.kit+P.tv85+P.net500+2*P.mic+P.spk,
     f:[['Всё из «Оптимального»','всё из «Оптимального»'],
        ['Второй экран 85″','экран 85″',1],
        ['Интернет 500 Мбит/с','интернет 500 Мбит',1],
        ['Ещё 2 микрофона','+2 микрофона',1],
        ['Дополнительная колонка','колонка',1]]}
  ];

  var CHECK='<svg class="ck" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 6.300l2.700 2.700L10 3.200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ARR='<svg class="arr" viewBox="0 0 18 10" width="18" height="10" aria-hidden="true"><path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  function rub(n){return Math.round(n).toLocaleString('ru-RU')+' ₽'}
  function $(id){return document.getElementById(id)}
  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

  var grid=$('pk-grid');
  if(!grid) return;

  function render(){
    var rent=st.day==='week'?P.rentWeek:P.rentWeekend;
    grid.innerHTML='';
    TIERS.forEach(function(t){
      var a=el('a','tier'+(t.best?' tier--best':'')); a.href='#visit'; a.setAttribute('data-tier',t.id);
      var name=el('span','tier__name',t.name);
      if(t.best) name.insertAdjacentHTML('beforeend','<span class="tier__mark" role="img" aria-label="Советуем этот тариф">'+CHECK+'</span>');
      a.appendChild(name);
      a.appendChild(el('span','tier__price','<small>от</small>'+rub(rent+t.add)));
      a.appendChild(el('span','tier__for',t.forWho));
      var ul=el('ul','tier__list');
      t.f.forEach(function(x){
        var li=el('li',x[2]?'is-plus':'');
        li.innerHTML=CHECK+'<span class="f-full">'+x[0]+'</span><span class="f-short">'+x[1]+'</span>';
        ul.appendChild(li);
      });
      a.appendChild(ul);
      a.appendChild(el('span','btn '+(t.best?'btn--accent':'btn--line')+' tier__go',t.btn));
      grid.appendChild(a);
    });
  }

  var row=$('ctl-day');
  dayOpts.forEach(function(o){
    var b=el('button','seg__btn',o[1]); b.type='button';
    b.setAttribute('aria-pressed',String(st.day===o[0]));
    b.addEventListener('click',function(){
      st.day=o[0];
      Array.prototype.forEach.call(row.children,function(c){c.setAttribute('aria-pressed',String(c===b))});
      render();
    });
    row.appendChild(b);
  });
  render();
})();
