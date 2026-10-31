import { advancedFixtures, advancedResponse } from "../v4/api.mjs";
import { parse } from "acorn";
import { displayValue } from "../utils/displayValue.mjs";
import { fixtures, mockResponse } from "../v3/mock.mjs";

// Cooperative execution budgets are for ordinary classroom snippets, not hostile code.
export function guardSource(source, name = "__classroomGuard") {
  const ast = parse(source, {
    ecmaVersion: "latest",
    sourceType: "script",
    allowReturnOutsideFunction: true,
  });
  const edits = [];
  function block(node, directives = false) {
    let at = node.start + 1;
    if (directives)
      for (const statement of node.body) {
        if (!statement.directive) break;
        at = statement.end;
      }
    edits.push({ at, text: `;${name}();` });
  }
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (
      [
        "WhileStatement",
        "DoWhileStatement",
        "ForStatement",
        "ForInStatement",
        "ForOfStatement",
      ].includes(node.type)
    ) {
      if (node.body.type === "BlockStatement") block(node.body);
      else {
        edits.push({ at: node.body.start, text: `{${name}();` });
        edits.push({ at: node.body.end, text: "}" });
      }
    }
    if (
      [
        "FunctionDeclaration",
        "FunctionExpression",
        "ArrowFunctionExpression",
      ].includes(node.type) &&
      node.body.type === "BlockStatement"
    )
      block(node.body, true);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
  let output = source;
  for (const e of edits.sort((a, b) => b.at - a.at))
    output = output.slice(0, e.at) + e.text + output.slice(e.at);
  return output;
}
export function nativeDocument(
  html,
  css,
  code,
  token,
  storage = {},
  scenario = "success",
  apiVersion = "v3",
) {
  if (html.length + css.length + code.length > 130000)
    throw Error("Keep this classroom example under 130,000 characters.");
  const guard = "__guard_" + token.replace(/[^a-z0-9]/gi, "");
  const instrumented = guardSource(code, guard);
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,iframe,object,embed,base,meta[http-equiv],link")
    .forEach((n) => n.remove());
  for (const element of doc.querySelectorAll("*"))
    for (const a of [...element.attributes])
      if (
        /^on/i.test(a.name) ||
        ["srcdoc", "nonce", "ping", "target", "action", "formaction"].includes(
          a.name,
        )
      )
        element.removeAttribute(a.name);
  const meta = doc.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = `default-src 'none'; script-src 'nonce-${token}'; script-src-attr 'none'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'`;
  doc.head.prepend(meta);
  const style = doc.createElement("style");
  style.textContent = css.replace(/<\/style/gi, "<\\/style");
  doc.head.append(style);
  const bootstrap = `(()=>{
 const token=${JSON.stringify(token)},tell=parent.postMessage.bind(parent),send=(type,extra={})=>tell({token,type,...extra},'*');
 const nativeTimeout=window.setTimeout.bind(window),nativeInterval=window.setInterval.bind(window),clear=window.clearTimeout.bind(window),clock=performance.now.bind(performance),stringify=JSON.stringify.bind(JSON);
 const timers=new Set(),nodeIds=new WeakMap(),nodesById=new Map();let serial=0,lines=0,last='',selected='',stopped=false,deadline=clock()+500;
 const ${guard}=()=>{if(stopped||clock()>deadline)throw new RangeError('Classroom execution budget exceeded. Check a loop or recursion; stop and run again.');};
 const renew=()=>{deadline=clock()+500};const format=${displayValue.toString()};
 const consoleModel=Object.fromEntries(['log','info','warn','error','table'].map(kind=>[kind,(...args)=>{if(lines++<150)send('native-log',{kind,text:args.map(format).join(' ').slice(0,2000)})}]));consoleModel.clear=()=>send('native-clear');
 const data=Object.assign(Object.create(null),${JSON.stringify(storage)}),session=Object.create(null);const makeStore=map=>({getItem:key=>Object.hasOwn(map,String(key))?map[String(key)]:null,setItem:(key,value)=>{if(String(key).length>200||stringify(map).length+String(value).length>24000)throw new DOMException('Learning storage quota exceeded','QuotaExceededError');Object.defineProperty(map,String(key),{value:String(value),writable:true,enumerable:true,configurable:true});},removeItem:key=>{delete map[String(key)]},clear:()=>{for(const k of Object.keys(map))delete map[k]},key:index=>Object.keys(map)[index]??null,get length(){return Object.keys(map).length}});
 Object.defineProperty(window,'localStorage',{value:makeStore(data)});Object.defineProperty(window,'sessionStorage',{value:makeStore(session)});
 const schedule=(fn,delay,repeat,args)=>{if(typeof fn!=='function')throw new TypeError('Use a function callback, not source text.');if(timers.size>=100)throw new RangeError('At most 100 pending timers.');const wrapped=()=>{renew();if(!repeat)timers.delete(id);try{fn(...args)}catch(e){report(e)}snapshot()};const id=(repeat?nativeInterval:nativeTimeout)(wrapped,Math.max(repeat?20:0,Math.min(60000,Number(delay)||0)));timers.add(id);return id};
 const cancel=id=>{clear(id);timers.delete(id)};Object.defineProperty(window,'setTimeout',{value:(fn,delay,...args)=>schedule(fn,delay,false,args)});Object.defineProperty(window,'setInterval',{value:(fn,delay,...args)=>schedule(fn,delay,true,args)});Object.defineProperty(window,'clearTimeout',{value:cancel});Object.defineProperty(window,'clearInterval',{value:cancel});
 const fixtures=${JSON.stringify(apiVersion === "v4" ? advancedFixtures : fixtures)},advancedFixtures=fixtures,database=structuredClone(fixtures),mockResponse=${(apiVersion === "v4" ? advancedResponse : mockResponse).toString()};
 Object.defineProperty(window,'fetch',{value:(url,options={})=>new Promise((resolve,reject)=>{if(options.signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return}const id=nativeTimeout(()=>{renew();try{const r=mockResponse(String(url),options,${JSON.stringify(scenario)},database);const response=new Response(r.status===204?null:(${JSON.stringify(scenario)}==='invalid'?'bad JSON':stringify(r.body)),{status:r.status,headers:r.headers});resolve(response)}catch(error){reject(error)}},${scenario === "slow" ? 1800 : apiVersion === "v4" ? 'Math.min(2000,Math.max(20,Number(new URL(String(url),"https://mock.invalid").searchParams.get("delay"))||200))' : 200});options.signal?.addEventListener('abort',()=>{clear(id);reject(new DOMException('Cancelled','AbortError'))},{once:true})})});
 function report(error){send('native-error',{text:String(error?.name||'Error')+': '+String(error?.message||error).slice(0,2000)})}
 function snapshot(){if(stopped)return;const elements=[...document.querySelectorAll('body *')].filter(e=>e.tagName!=='SCRIPT');if(elements.length>600){report(new RangeError('Preview limit: 600 elements'));stop();return}nodesById.clear();for(const e of elements){if(!nodeIds.has(e))nodeIds.set(e,String(++serial));nodesById.set(nodeIds.get(e),e)}const clone=document.documentElement.cloneNode(true);[...clone.querySelectorAll('body *')].filter(e=>e.tagName!=='SCRIPT').forEach((e,i)=>e.setAttribute('data-lab-native',nodeIds.get(elements[i])));clone.querySelectorAll('script,meta[http-equiv]').forEach(n=>n.remove());const html=clone.outerHTML;if(html.length>120000){report(new RangeError('Preview snapshot exceeds 120,000 characters'));stop();return}const state=html+stringify(data);if(state!==last){last=state;send('native-snapshot',{html,storage:data,selected})}}
 function stop(){if(stopped)return;stopped=true;for(const id of timers)clear(id);timers.clear();clear(heartbeat);observer.disconnect();send('native-stopped',{text:'Native session stopped. Run again for a fresh document.'})}
 const observer=new MutationObserver(()=>nativeTimeout(snapshot,0));observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
 const heartbeat=nativeInterval(()=>{renew();snapshot()},200);nativeTimeout(stop,60000);
 for(const type of ['click','dblclick','input','change','submit','keydown','keyup','pointerdown','pointerup','focus','blur','focusin','focusout','mouseover','mouseout','mouseenter','mouseleave'])document.addEventListener(type,()=>renew(),true);
 document.addEventListener('click',e=>{const node=e.target.closest?.('*');if(node&&nodeIds.has(node)){selected=nodeIds.get(node);send('native-select',{selected});}if(e.target.closest?.('a'))e.preventDefault()},true);
 addEventListener('message',e=>{if(e.source!==parent||e.data?.token!==token)return;if(e.data.type==='native-stop')stop();if(e.data.type==='native-select'){const node=nodesById.get(String(e.data.selected).replace(/[^0-9]/g,''));if(node){node.style.outline='3px solid #b89810';node.scrollIntoView({block:'nearest'});selected=nodeIds.get(node);snapshot()}}});
 addEventListener('error',e=>{report(e.error||e.message);e.preventDefault()});addEventListener('unhandledrejection',e=>{report(e.reason);e.preventDefault()});
 try {renew();(function(console){${instrumented}\n}).call(window,consoleModel)}catch(error){report(error)}snapshot();document.addEventListener('DOMContentLoaded',snapshot,{once:true});
})();`;
  const script = doc.createElement("script");
  script.setAttribute("nonce", token);
  script.textContent = bootstrap.replace(/<\/script/gi, "<\\/script");
  doc.body.append(script);
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
