import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { TEACHER_CODE_HASH } from '../config/teacher';
import { ATTEMPT_LIMIT, ATTEMPT_PAUSE_MS, matchesTeacherCode } from '../utils/teacherAccess.mjs';

export default function TeacherAccess({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const mounted = useRef(true);
  // Session storage contains attempts only, never a password or an unlock flag.
  const [attempts, setAttempts] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('js-lab-teacher-attempts') || 'null');
      return saved && Number.isInteger(saved.count) && saved.count >= 0 && Number.isFinite(saved.until)
        ? { count: Math.min(saved.count, ATTEMPT_LIMIT), until: saved.until }
        : { count: 0, until: 0 };
    } catch { return { count: 0, until: 0 }; }
  });
  const remaining = Math.max(0, Math.ceil((attempts.until - clock) / 1000));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!attempts.until) return;
    const interval = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(interval);
  }, [attempts.until]);
  function saveAttempts(next: typeof attempts) {
    setAttempts(next);
    try { sessionStorage.setItem('js-lab-teacher-attempts', JSON.stringify(next)); } catch { /* Memory-only fallback. */ }
  }
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (busy || Date.now() < attempts.until) return;
    if (!code.trim()) { setError('Enter the teacher access code.'); return; }
    setBusy(true); setError('');
    try {
      const valid = await matchesTeacherCode(code, TEACHER_CODE_HASH);
      if (!mounted.current) return;
      setCode('');
      if (valid) { saveAttempts({ count: 0, until: 0 }); onUnlock(); return; }
      const count = (attempts.until && Date.now() >= attempts.until ? 0 : attempts.count) + 1;
      saveAttempts(count >= ATTEMPT_LIMIT ? { count: 0, until: Date.now() + ATTEMPT_PAUSE_MS } : { count, until: 0 });
      setClock(Date.now());
      setError('That code did not match. Teacher tools remain locked.');
    } catch { if (mounted.current) setError('Verification is unavailable. Use the HTTPS website in an up-to-date browser.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal small-modal teacher-access" role="dialog" aria-modal="true" aria-label="Unlock teacher tools" onClick={event => event.stopPropagation()}>
      <div className="panel-heading"><span className="value-icon yellow"><LockKeyhole size={22}/></span><button type="button" className="icon-button" aria-label="Close teacher access" onClick={onClose}><X size={19}/></button></div>
      <span className="eyebrow">FOR THE INSTRUCTOR</span>
      <h2>Teacher tools are locked.</h2>
      <p>Enter your private classroom code to open teaching notes, the lesson plan, and presenter controls.</p>
      <form onSubmit={unlock}>
        <label htmlFor="teacher-access-code">Teacher access code</label>
        <input id="teacher-access-code" type="password" value={code} maxLength={200} onChange={event => { setCode(event.target.value); setError(''); }} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus disabled={busy || remaining > 0} aria-invalid={!!error} aria-describedby="teacher-code-feedback"/>
        <div id="teacher-code-feedback" aria-live="polite">{remaining > 0 ? <p className="access-error">Too many attempts. Try again in {remaining} seconds.</p> : error ? <p className="access-error" role="alert">{error}</p> : null}</div>
        <button type="submit" className="button primary" disabled={busy || remaining > 0 || !code.trim()}><LockKeyhole size={15}/>{busy ? 'Checking…' : 'Unlock teacher tools'}</button>
        <button type="button" className="button ghost" onClick={onClose}>Continue as a student</button>
      </form>
      <p className="teacher-access-footnote">Locks again on refresh, when you choose Student, or after 15 minutes without activity. This classroom code lock prevents casual access; it is not server-enforced authentication.</p>
    </section>
  </div>;
}
