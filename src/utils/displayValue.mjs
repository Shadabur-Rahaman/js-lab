// Snapshot values at log time: preserve undefined, BigInt, symbols, NaN and cycles.
// This function is self-contained so the same serializer runs inside the Worker.
export function displayValue(value) {
  const seen = new WeakSet();
  function visit(v, depth, nested) {
    if (v === null) return 'null';
    if (typeof v === 'string') return nested ? JSON.stringify(v.slice(0,2000)) : v.slice(0,2000);
    if (typeof v === 'bigint') return v.toString()+'n';
    if (typeof v === 'symbol') return String(v);
    if (typeof v === 'function') return '[Function'+(v.name?': '+v.name:'')+']';
    if (typeof v !== 'object') return Object.is(v,-0)?'-0':String(v);
    if (seen.has(v)) return '[Circular]';
    if (depth >= 4) return '[…]';
    seen.add(v);
    let result;
    if (Array.isArray(v)) result='['+Array.from({length:Math.min(v.length,30)},(_,i)=>i in v?visit(v[i],depth+1,true):'<empty>').join(', ')+(v.length>30?', …':'')+']';
    else result='{'+Object.keys(v).slice(0,30).map(k=>JSON.stringify(k)+': '+visit(v[k],depth+1,true)).join(', ')+'}';
    seen.delete(v);
    return result;
  }
  try { return visit(value,0,false); } catch { return '[unprintable value]'; }
}
