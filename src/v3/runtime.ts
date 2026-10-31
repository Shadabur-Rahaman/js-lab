import workerSource from "virtual:v3-worker-source";
export type RuntimeMessage = {
  type: string;
  html?: string;
  text?: string;
  kind?: string;
  storage?: Record<string, string>;
};
function boundedStorage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const entries = Object.entries(value);
  if (entries.length > 100) return undefined;
  let length = 0;
  const safe: Record<string, string> = Object.create(null);
  for (const [key, item] of entries) {
    if (typeof item !== "string" || key.length > 200) return undefined;
    length += key.length + item.length;
    if (length > 24000) return undefined;
    safe[key] = item;
  }
  return safe;
}
// Neither frame receives allow-same-origin. Only the opaque host creates the worker.
export function startRuntime(
  html: string,
  code: string,
  storage: Record<string, string>,
  scenario: string,
  onMessage: (m: RuntimeMessage) => void,
) {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "Disposable browser-programming worker host";
  frame.sandbox.add("allow-scripts");
  const token = crypto.randomUUID();
  let stopped = false;
  const bridge = `const token=${JSON.stringify(token)};let worker,last=Date.now();const tell=m=>parent.postMessage({token,message:m},'*');addEventListener('message',e=>{if(e.source!==parent||e.data?.token!==token)return;if(e.data.type==='start'&&!worker){const url=URL.createObjectURL(new Blob([${JSON.stringify(workerSource)}],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);worker.onmessage=e=>{last=Date.now();tell(e.data)};worker.onerror=e=>tell({type:'error',text:e.message||'Worker failed'});worker.postMessage(e.data.payload)}else if(e.data.type==='event'){last=Date.now();worker?.postMessage(e.data.payload)}else if(e.data.type==='stop'){worker?.terminate();worker=null;}});setInterval(()=>{if(worker&&Date.now()-last>1400){worker.terminate();worker=null;tell({type:'stopped',text:'Execution stopped: the worker was unresponsive for 1.4 seconds. Check loops or excessive work.'})}},200);setTimeout(()=>{worker?.terminate();tell({type:'stopped',text:'Session ended after 60 seconds. Run again to continue.'})},60000);tell({type:'ready'});`;
  frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; worker-src blob:; connect-src 'none';"><script>${bridge.replace(/<\/script/gi, "<\\/script")}</script>`;
  const receive = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.data?.token !== token) return;
    const m = e.data.message;
    if (!m || typeof m.type !== "string") return;
    if (m.type === "ready") {
      frame.contentWindow?.postMessage(
        {
          token,
          type: "start",
          payload: { type: "start", html, code, storage, scenario },
        },
        "*",
      );
      return;
    }
    if (
      m.type === "snapshot" &&
      (typeof m.html !== "string" || m.html.length > 120000)
    )
      return;
    if (
      m.type === "log" &&
      (typeof m.text !== "string" || m.text.length > 2000)
    )
      return;
    if (m.type === "heartbeat") return;
    onMessage({
      type: m.type,
      html: typeof m.html === "string" ? m.html : undefined,
      text: typeof m.text === "string" ? m.text.slice(0, 3000) : undefined,
      kind: ["log", "info", "warn", "error", "alert", "table"].includes(m.kind)
        ? m.kind
        : "log",
      storage: boundedStorage(m.storage),
    });
  };
  window.addEventListener("message", receive);
  document.body.append(frame);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    frame.contentWindow?.postMessage({ token, type: "stop" }, "*");
    frame.remove();
    window.removeEventListener("message", receive);
  };
  const safety = setTimeout(stop, 62000);
  return {
    event: (payload: unknown) =>
      frame.contentWindow?.postMessage({ token, type: "event", payload }, "*"),
    stop: () => {
      clearTimeout(safety);
      stop();
    },
  };
}

export function renderSnapshot(html: string, css: string, token: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll(
      "script,iframe,object,embed,base,meta[http-equiv],link,svg,math,audio,video,source",
    )
    .forEach((e) => e.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes])
      if (
        /^on/i.test(a.name) ||
        [
          "nonce",
          "srcdoc",
          "srcset",
          "ping",
          "action",
          "formaction",
          "target",
        ].includes(a.name)
      )
        el.removeAttribute(a.name);
    if (
      el.tagName === "IMG" &&
      !el.getAttribute("src")?.startsWith("data:image/")
    )
      el.removeAttribute("src");
    if (el.tagName === "A") el.setAttribute("href", "#");
  });
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = `default-src 'none'; script-src 'nonce-${token}'; script-src-attr 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`;
  doc.head.prepend(policy);
  const style = doc.createElement("style");
  style.textContent = css.replace(/<\/style/gi, "<\\/style");
  doc.head.append(style);
  const script = doc.createElement("script");
  script.setAttribute("nonce", token);
  script.textContent = `const token=${JSON.stringify(token)};let locked=false;for(const name of ['click','input','change','submit','keydown','keyup','mouseover'])document.addEventListener(name,event=>{if(name==='submit'||name==='click'&&event.target.closest('a'))event.preventDefault();const target=event.target.closest('[data-lab-node]');if(!target)return;const fields=[...document.querySelectorAll('input,select,textarea')].slice(0,100).map(el=>({id:el.getAttribute('data-lab-node'),value:el.value.slice(0,4000),checked:!!el.checked}));parent.postMessage({type:'v3-preview-event',token,event:name,id:target.getAttribute('data-lab-node'),key:event.key||'',code:event.code||'',fields},'*')},true);`;
  script.textContent += `addEventListener('message',e=>{if(e.source!==parent||e.data?.token!==token||e.data?.type!=='render'||typeof e.data.html!=='string')return;const active=document.activeElement,id=active?.getAttribute('data-lab-node'),start=active?.selectionStart,end=active?.selectionEnd;const d=new DOMParser().parseFromString(e.data.html,'text/html');d.querySelectorAll('script').forEach(s=>s.remove());document.head.querySelectorAll('style').forEach(s=>s.remove());for(const s of d.head.querySelectorAll('style'))document.head.append(s);for(const a of [...document.body.attributes])document.body.removeAttribute(a.name);for(const a of [...d.body.attributes])document.body.setAttribute(a.name,a.value);document.body.replaceChildren(...d.body.childNodes);if(id){const node=document.querySelector('[data-lab-node="'+id+'"]');node?.focus();try{node?.setSelectionRange(start,end)}catch{}}});parent.postMessage({type:'v3-preview-ready',token},'*');`;
  doc.head.append(script);
  return "<!doctype html>" + doc.documentElement.outerHTML;
}
