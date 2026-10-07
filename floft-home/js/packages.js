/* Блок «Стоимость»: три примера расчёта (конференция, фуршет, банкет) по числу гостей и дню недели.
   Сумма = аренда лофта на сутки + комплект техники + питание на гостя × число гостей. */
(function(){
  // --- прайс F-LOFT 2026 (_context/floft_price_sheet_2026-09-30.md) ---
  var P = {rentWeek:200000, rentWeekend:280000, kit:115000, coffee:2500, buffet:6500, banquet:10500};
  var guestsOpts=[50,100,150,200], dayOpts=[['week','Вс–Чт'],['weekend','Пт, Сб']];
  var st={guests:100, day:'week'};

  var FORMATS=[
    {id:'conf',    name:'Конференция', food:'Кофе-брейк', per:P.coffee},
    {id:'buffet',  name:'Фуршет',      food:'Фуршет',     per:P.buffet},
    {id:'banquet', name:'Банкет',      food:'Банкет',     per:P.banquet}
  ];

  function rub(n){return Math.round(n).toLocaleString('ru-RU')+' ₽'}
  function $(id){return document.getElementById(id)}
  function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}

  var grid=$('pk-grid');
  if(!grid) return;

  function render(){
    var g=st.guests, rent=st.day==='week'?P.rentWeek:P.rentWeekend;
    grid.innerHTML='';
    FORMATS.forEach(function(f){
      var food=f.per*g, sum=rent+P.kit+food;
      var a=el('a','fmt'); a.href='#visit'; a.setAttribute('data-format',f.id);
      a.appendChild(el('span','fmt__name',f.name));
      a.appendChild(el('span','fmt__sum','<small>от</small>'+rub(sum)));
      a.appendChild(el('span','fmt__per','≈ '+rub(sum/g)+' на гостя · '+g+' гостей'));
      a.appendChild(el('span','fmt__short','аренда, техника, '+f.food.toLowerCase()));          // телефон: состав одной строкой
      a.appendChild(el('span','fmt__pg','≈ '+rub(sum/g)+'/гость'));
      var ul=el('ul','fmt__list');
      [['Аренда лофта',rent],['Комплект техники',P.kit],[f.food+' на '+g+' гостей',food]].forEach(function(x){
        var li=el('li'); li.appendChild(el('span',null,x[0])); li.appendChild(el('span',null,rub(x[1]))); ul.appendChild(li);
      });
      a.appendChild(ul);
      a.appendChild(el('span','fmt__go','Обсудить расчёт <svg class="arr" viewBox="0 0 18 10" width="18" height="10" aria-hidden="true"><path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'));
      grid.appendChild(a);
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
})();
