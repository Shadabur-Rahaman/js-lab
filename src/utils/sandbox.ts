import { displayValue } from './displayValue.mjs';
export type RunResult = { logs: {kind: string; text: string}[]; preview: string; error?: string };
// The opaque-origin frame supplies an additional boundary around a disposable Worker.
// Its CSP denies network access. Only a bounded, validated result is accepted.
export function runCode(code: string, promptValue: string, signal?: AbortSignal): Promise<RunResult> {
  return new Promise(resolve => {
    const token = crypto.randomUUID();
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.title = 'Isolated JavaScript execution';
    iframe.setAttribute('sandbox', 'allow-scripts');
    const workerSource = `
      const send = self.postMessage.bind(self);
      const logs = []; let preview = 'Your message will appear here.'; let count = 0;
      const format = ${displayValue.toString()};
      const emit = (kind, args) => { if (count++ < 150) logs.push({kind, text:args.map(format).join(' ').slice(0, 2000)}); };
      const fakeConsole = {log:(...a)=>emit('log',a),info:(...a)=>emit('log',a),warn:(...a)=>emit('warn',a),error:(...a)=>emit('error',a),clear:()=>{logs.length=0;}};
      const message = {get textContent(){return preview}, set textContent(v){preview=String(v).slice(0,4000)}};
      const fakeDocument = {getElementById:id=>{if(id!=='message')throw new Error('This preview supports only the element with id "message".');return message;},write:v=>{preview=String(v).slice(0,4000)}};
      for (const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','importScripts','indexedDB','caches','BroadcastChannel']) { try {Object.defineProperty(self,name,{value:undefined,writable:false,configurable:false});}catch{} }
      self.onmessage = e => {
        try {
          const execute = new Function('console','document','alert','prompt', e.data.code);
          execute(fakeConsole,fakeDocument,(v)=>emit('alert',[v]),()=>e.data.promptValue);
          if(count>150) logs.push({kind:'warn',text:'Output capped at 150 messages. Use smaller loops.'});
          send({logs,preview});
        } catch (e) {send({logs,preview,error:e.name+': '+e.message});}
      };
    `;
    const frameScript = `
      const token = ${JSON.stringify(token)};
      let worker;
      addEventListener('message', e => {
        if(e.source!==parent || e.data?.token!==token) return;
        if(e.data.type==='stop'){worker?.terminate();return;}
        if(e.data.type!=='run'||worker) return;
        const url=URL.createObjectURL(new Blob([${JSON.stringify(workerSource)}],{type:'text/javascript'}));
        worker=new Worker(url);URL.revokeObjectURL(url);
        const timer=setTimeout(()=>{worker.terminate();parent.postMessage({token,type:'result',result:{logs:[],preview:'',error:'Execution stopped after 1 second. Check for an infinite loop.'}},'*')},1000);
        worker.onmessage=event=>{clearTimeout(timer);worker.terminate();parent.postMessage({token,type:'result',result:event.data},'*')};
        worker.onerror=()=>{clearTimeout(timer);worker.terminate();parent.postMessage({token,type:'result',result:{logs:[],preview:'',error:'The isolated runner could not start. Check browser support for sandboxed workers.'}},'*')};
        worker.postMessage({code:e.data.code,promptValue:e.data.promptValue});
      });
      parent.postMessage({token,type:'ready'},'*');
    `;
    iframe.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none';"><script>${frameScript.replace(/<\/script/gi,'<\\/script')}<\/script>`;
    let settled = false;
    const finish = (result: RunResult) => {
      if (settled) return; settled = true;
      iframe.contentWindow?.postMessage({token,type:'stop'}, '*');
      clearTimeout(timeout); window.removeEventListener('message', listener); signal?.removeEventListener('abort', abort);
      iframe.remove(); resolve(result);
    };
    const abort = () => finish({logs:[],preview:'',error:'Execution cancelled.'});
    const listener = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || event.data?.token !== token) return;
      if (event.data.type === 'ready') iframe.contentWindow?.postMessage({type:'run',token,code,promptValue}, '*');
      if (event.data.type === 'result') {
        const r = event.data.result;
        if (!r || !Array.isArray(r.logs)) return;
        finish({logs:r.logs.slice(0,151).filter((l:unknown): l is {kind:string;text:string} => !!l && typeof l==='object' && 'text' in l && typeof l.text==='string').map((l:{kind:string;text:string})=>({kind:['log','warn','error','alert'].includes(l.kind)?l.kind:'log',text:l.text.slice(0,2000)})), preview:typeof r.preview==='string'?r.preview.slice(0,4000):'',error:typeof r.error==='string'?r.error.slice(0,2000):undefined});
      }
    };
    window.addEventListener('message', listener);
    const timeout = setTimeout(()=>finish({logs:[],preview:'',error:'Runner timed out. The code may contain an infinite loop, or your browser may block sandboxed workers.'}),1800);
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) {abort();return;}
    document.body.append(iframe);
  });
}
