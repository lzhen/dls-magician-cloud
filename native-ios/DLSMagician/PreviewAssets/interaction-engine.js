/* Local prototype interactions. No network, persistent writes, or real navigation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DLSInteractions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function splitClauses(text){let start=0,quoted=false;const parts=[];for(let i=0;i<text.length;i++){if(text[i]==='"')quoted=!quoted;if(text[i]===';'&&!quoted){parts.push(text.slice(start,i));start=i+1;}}parts.push(text.slice(start));return parts.filter(t=>t.trim());}
const quote=text=>(String(text).match(/["“]([^"”]*)["”]|'([^']*)'/)||[]).slice(1).find(x=>x!==undefined);
const triggerRules=[
 ['dblclick',/double[ -]?click/i],['contextmenu',/right[ -]?click|contextmenu/i],
 ['pointerout',/pointer leave|mouse leave|hover ends|mouse out/i],['pointerover',/hover|mouse enter|pointer enter/i],
 ['focusout',/blur|loses? focus/i],['focusin',/focus/i],['keyup',/key up|key released/i],
 ['keydown',/press|key down|key pressed/i],['submit',/submit/i],['reset',/reset/i],
 ['dragstart',/drag start|start dragging/i],['dragover',/drag over|drag enter/i],['drop',/drop/i],
 ['scroll',/scroll/i],['load',/load/i],['change',/uncheck|check|toggle|change|select|choose/i],
 ['input',/\btyp(?:e|es|ing)\b|\binput\b/i],['click',/click|tap|activate/i]
];
const effects=[
 ['simulate',/^simulate\s+(save|delete|login|log in|logout|log out|upload|download|fetch|search|sort|filter|undo|redo)/i],
 ['navigate',/^(navigate|go|redirect)\b/i],['validate',/^validate\b/i],['reset',/^reset\b/i],
 ['focus',/^focus\b/i],['blur',/^blur\b/i],['clear',/^clear\b/i],
 ['disable',/^disable\b/i],['enable',/^enable\b/i],
 ['check',/^(check\b|set\b.*\b(?:on|checked)$)/i],['uncheck',/^(uncheck\b|set\b.*\b(?:off|unchecked)$)/i],
 ['value',/^(?:set|update|change)\b.*\bvalue\b/i],
 ['text',/^(?:set|update|change)\b.*\b(?:text|content|label)\b/i],
 ['progress',/^(?:set|update)\b.*\bprogress\b/i],
 ['loading',/^(?:start|stop)\s+loading/i],
 ['validation',/^(?:show|display)\b.*\bvalidation\b/i],
 ['feedback',/^(?:show|display)\b.*\b(?:toast|notification|success message|error message)\b/i],
 ['tooltip',/^(?:show|display)\b.*\btooltip\b/i],
 ['toggle',/^toggle\b/i],['show',/^(show|display|open|expand)\b/i],['hide',/^(hide|close|collapse)\b/i]
];
function compile(steps,nodes,registry){
 const rules=[],warnings=[];let serial=Math.max(0,...nodes.flatMap(function walk(n){return[Number(n.id.replace('component_',''))||0,...(n.children||[]).flatMap(walk)];}))+1;
 const all=()=>nodes.flatMap(function walk(n){return[n,...(n.children||[]).flatMap(walk)];});
 const kind=text=>Object.values(registry).find(e=>e.aliases.some(a=>new RegExp('\\b'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(text.replace(/["“][^"”]*["”]|'[^']*'/g,''))))?.type;
 function resolve(text,fallback){
  if(/\b(?:this|current) component\b/i.test(text))return fallback;
  const type=kind(text.replace(/^(?:toggle|show|hide|open|close|expand|collapse|set|update|change|enable|disable|focus|blur|clear|reset|validate|check|uncheck)\s+/i,'')),label=quote(text),candidates=all().filter(n=>(!type||n.type===type)&&(!label||n.props.label.toLowerCase()===label.toLowerCase()));
  return candidates.length===1?candidates[0]:undefined;
 }
 for(let i=0;i<steps.length;i++){
  if(steps[i].type!=='WHEN'||!steps[i].text)continue;
  const when=steps[i].text,trigger=triggerRules.find(([,re])=>re.test(when))?.[0];
  let source=resolve(when.replace(/\btoggles?\b/gi,'').replace(/(?:key|option|value)\s+["'][^"']*["']/gi,''));if(!source&&!kind(when)&&quote(when)===undefined&&all().length===1)source=all()[0];
  if(!trigger||!source){warnings.push('Interaction needs a supported trigger and an unambiguous component in WHEN.');continue;}
  const key=/\bEnter\b/i.test(when)?'Enter':/\b(?:Escape|Esc)\b/i.test(when)?'Escape':/key\s+["']([^"']+)["']/i.exec(when)?.[1];
  const condition=/\buncheck/i.test(when)?'unchecked':/\bcheck(?:s|ed)?\b/i.test(when)?'checked':undefined;
  for(let j=i+1;j<steps.length&&steps[j].type!=='WHEN';j++){
   if(!['THEN','AND'].includes(steps[j].type)||!steps[j].text)continue;
   if(steps[j].type==='AND'&&/^(?:a |an |the |add |include )/i.test(steps[j].text))continue;
   for(const clause of splitClauses(steps[j].text)){
   const text=clause.replace(/[.]$/,'').trim(),action=effects.find(([,re])=>re.test(text))?.[0];
   if(!action){warnings.push('Not executable yet: '+text);continue;}
   let target=source,value=quote(text);
   if(action==='tooltip'||action==='feedback'||action==='validation'){
    if(value===undefined){warnings.push('Add quoted content for '+action+'.');continue;}
   }else if(!['navigate','simulate','loading'].includes(action)){
    // Quoted parameters after "to" or "with" are values, not target labels.
    const targetText=text.split(/\s+(?:to|with content|with text)\s+/i)[0];
    target=resolve(targetText,source);
    const type=kind(targetText.replace(/^(?:toggle|show|hide|open|close|expand|collapse)\s+/i,''));
    if(!target&&action==='show'&&['Dialog','Alert','Menu'].includes(type)){
     target={id:'component_'+serial++,type,props:{label:quote(targetText)||type,content:quote(text.split(/with content/i)[1]||'')||'',options:[],variant:'primary',direction:'column',dismissible:type==='Dialog'},children:[],initialHidden:true};nodes.push(target);
    }
    if(!target){warnings.push('Specify a unique target for: '+text);continue;}
   }
   if(action==='show'&&target.id!==source.id&&target.type!=='Accordion'&&!JSON.stringify(target.children||[]).includes('\"'+source.id+'\"'))target.initialHidden=true;
   if(['value','text'].includes(action)){value=quote(text.split(/\s+to\s+/i).slice(1).join(' to '));if(value===undefined){warnings.push('Add a quoted value after "to".');continue;}}
   if(action==='navigate'&&(!value||!/^\/(?!\/)|^https?:\/\//i.test(value))){warnings.push('Navigation needs a quoted safe path or HTTP URL.');continue;}
   const capabilities={value:['Input','Textarea','Select','DatePicker','Slider'],clear:['Input','Textarea','Select','DatePicker'],check:['Checkbox','Switch','Radio'],uncheck:['Checkbox','Switch','Radio'],progress:['Progress'],reset:['Form'],validate:['Form','Input','Textarea','Select','DatePicker'],focus:['Button','Input','Textarea','Select','DatePicker','Upload','Checkbox','Switch','Radio','Slider'],blur:['Button','Input','Textarea','Select','DatePicker','Upload','Checkbox','Switch','Radio','Slider'],enable:['Button','Input','Textarea','Select','DatePicker','Upload','Checkbox','Switch','Radio','Slider'],disable:['Button','Input','Textarea','Select','DatePicker','Upload','Checkbox','Switch','Radio','Slider']};
   if(capabilities[action]&&!capabilities[action].includes(target.type)){warnings.push(action+' is not supported for '+target.type+'. Choose a compatible target.');continue;}
   if(trigger==='dragstart')source.draggable=true;
   if(trigger==='scroll')source.scrollable=true;
   rules.push({trigger,source:source.id,target:target.id,action,value,key,condition,amount:Number(/\b(\d+)\s*%?/.exec(text)?.[1]||0),stop:/^stop/i.test(text),operation:action==='simulate'?text.replace(/^simulate\s+/i,''):undefined});
   }
  }
 }
 return{rules,warnings};
}
function bind(doc){
 const resetting=new WeakSet();
 const events=[...new Set(triggerRules.map(([event])=>event))].filter(e=>e!=='load');
 function run(stage,rule){
  const target=stage.querySelector('[data-node-id="'+rule.target+'"]'),source=stage.querySelector('[data-node-id="'+rule.source+'"]');if(!target||!source)return;
  const control=target.matches('input,select,textarea,button')?target:target.querySelector('input,select,textarea,button');
  function feedback(text,role='status'){
   let box=stage.querySelector('.cp-runtime-feedback');if(!box){box=doc.createElement('div');box.className='cp-runtime-feedback cp-notice';stage.append(box);}box.setAttribute('role',role);box.textContent=text;
  }
  switch(rule.action){
   case 'show':case 'hide':case 'toggle':
    if(target.matches('details'))target.open=rule.action==='toggle'?!target.open:rule.action==='show';else target.hidden=rule.action==='toggle'?!target.hidden:rule.action==='hide';break;
   case 'enable':case 'disable':if(control)control.disabled=rule.action==='disable';break;
   case 'check':case 'uncheck':if(control&&'checked'in control)control.checked=rule.action==='check';break;
   case 'value':if(control)control.value=rule.value;break;
   case 'text':if(control?.matches('button'))control.textContent=rule.value;else if(target.matches('button,p,h2,span,a'))target.textContent=rule.value;else{const label=target.querySelector('label,h3,legend');if(label)label.textContent=rule.value;}break;
   case 'clear':if(control){control.value='';if('checked'in control)control.checked=false;}break;
   case 'focus':control?.focus();break;
   case 'blur':control?.blur();break;
   case 'reset':{const form=target.matches('form')?target:target.closest('form');if(form&&!resetting.has(form)){resetting.add(form);try{form.reset();}finally{resetting.delete(form);}}break;}
   case 'validate':{const form=target.matches('form')?target:target.closest('form');const fields=form?[...form.querySelectorAll('input,select,textarea')]:control?[control]:[];feedback(fields.length?fields.every(f=>f.checkValidity())?'Form is valid':'Please complete the required fields':'No fields to validate.');break;}
   case 'validation':if(control){control.setCustomValidity(rule.value);control.setAttribute('aria-invalid','true');}feedback(rule.value,'alert');break;
   case 'feedback':feedback(rule.value);break;
   case 'navigate':feedback('Preview destination: '+rule.value);break;
   case 'simulate':feedback('Simulated: '+rule.operation+' — no server request or persistent change.');break;
   case 'loading':target.setAttribute('aria-busy',String(!rule.stop));feedback(rule.stop?'Loading stopped':'Loading…');break;
   case 'progress':{const meter=target.matches('progress')?target:target.querySelector('progress');if(meter){meter.value=rule.amount;const label=target.querySelector('span');if(label)label.textContent=Math.round(rule.amount/Number(meter.max||100)*100)+'%';}break;}
   case 'tooltip':{
    let tip=source.querySelector('[data-runtime-tooltip]');if(!tip){tip=doc.createElement('span');tip.dataset.runtimeTooltip='';tip.setAttribute('role','tooltip');tip.id='outcome-tip-'+source.dataset.nodeId+'-'+Math.random().toString(36).slice(2);source.append(tip);(source.querySelector('button,input')||source).setAttribute('aria-describedby',tip.id);source.classList.add('cp-tooltip');}tip.textContent=rule.value;tip.hidden=false;break;
   }
  }
 }
 function handle(event){
  const stage=event.target.closest?.('[data-interactions]');if(!stage)return;
  if(event.type==='reset'&&resetting.has(event.target))return;
  let rules;try{rules=JSON.parse(stage.dataset.interactions);}catch{return;}
  const source=event.target.closest('[data-node-id]');
  if(['pointerout','focusout'].includes(event.type)&&source&&!source.contains(event.relatedTarget))source.querySelectorAll('[data-runtime-tooltip]').forEach(t=>t.hidden=true);
  if(event.type==='keydown'&&event.key==='Escape'){stage.querySelectorAll('[data-runtime-tooltip]').forEach(t=>t.hidden=true);}
  if(event.type==='dragover'&&rules.some(rule=>rule.trigger==='drop'&&rule.source===source?.dataset.nodeId))event.preventDefault();
  if(['pointerover','pointerout'].includes(event.type)&&source?.contains(event.relatedTarget))return;
  for(const rule of rules){
   if(rule.trigger!==event.type||!source||source.dataset.nodeId!==rule.source||rule.key&&rule.key!==event.key)continue;
   if(rule.condition&&event.target.checked!==(rule.condition==='checked'))continue;
   if(['submit','contextmenu','dragover','drop'].includes(event.type))event.preventDefault();
   run(stage,rule);
  }
 }
 events.forEach(event=>doc.addEventListener(event,handle,true));
 // New editor renders are new prototype instances: initialize load effects once per stage.
 const initialize=()=>doc.querySelectorAll('[data-interactions]:not([data-runtime-ready])').forEach(stage=>{stage.dataset.runtimeReady='';try{JSON.parse(stage.dataset.interactions).filter(r=>r.trigger==='load').forEach(r=>run(stage,r));}catch{}});
 if(typeof MutationObserver!=='undefined')new MutationObserver(initialize).observe(doc.body,{childList:true,subtree:true});initialize();
}
return{compile,bind,triggerRules,effects};
});
