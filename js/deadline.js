const form = document.querySelector('#deadline-form');
const answer = document.querySelector('#answer');
const monthField = form.elements.month;
const now = new Date();
const monthIndex = now.getFullYear()*12 + now.getMonth();
function monthString(offset) {
  const date = new Date(now.getFullYear(), now.getMonth()+offset, 1);
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
}
monthField.min = monthString(1);
monthField.max = monthString(1200);
monthField.value = monthString(12);
const currency = n => n.toLocaleString('uk-UA',{maximumFractionDigits:2})+' ₴';
function payment(gap,months) { return Math.ceil(gap/months)/100; }
function calculate() {
  const target = form.elements.target.valueAsNumber;
  const saved = form.elements.saved.valueAsNumber;
  const [year,month] = monthField.value.split('-').map(Number);
  const months = year*12+month-1-monthIndex;
  const gap = Math.max(0,Math.round(target*100)-Math.round(saved*100));
  const due = payment(gap,months);
  document.querySelector('#payment').textContent = gap ? currency(due)+' на місяць' : 'Суму вже зібрано';
  document.querySelector('#explain').textContent = gap ? 'Залишилося зібрати '+currency(gap/100)+' за '+months+' міс.' : 'Наявних заощаджень достатньо для цієї покупки.';
  const variants = document.querySelector('#variants');
  variants.replaceChildren();
  if(gap) for(const extra of [0,3,6]) {
    const group=document.createElement('div'), label=document.createElement('dt'), value=document.createElement('dd');
    label.textContent=extra ? 'На '+extra+' міс. пізніше' : 'На обрану дату';
    value.textContent=currency(payment(gap,months+extra))+' / міс.';
    group.append(label,value); variants.append(group);
  }
  const link=document.querySelector('#transfer');
  link.hidden=!gap;
  link.style.display=gap?'':'none';
  link.href='result.html?'+new URLSearchParams({goalAmount:target,savedAmount:saved,monthlyContribution:due,annualReturn:0,title:'План до '+monthField.value});
  answer.hidden=false;
}
form.addEventListener('input',()=>{answer.hidden=true;});
form.addEventListener('submit',event=>{event.preventDefault();calculate();answer.scrollIntoView({block:'center'});});
calculate();
