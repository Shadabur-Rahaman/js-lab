import React from 'react';
import { createRoot } from 'react-dom/client';
import {privateAccess} from './access/session';
import PrivateGate from './access/PrivateGate';
const App=React.lazy(()=>import('./App'));
function LearningApp(){return <React.Suspense fallback={<p role="status">Opening JS Lab…</p>}><App/></React.Suspense>;}

import './styles.css';
import './styles-v2.css';
import './v3/styles.css';
import './v4/styles.css';
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: boolean}> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <main className="recovery"><h1>Let’s get the lab running again.</h1><p>Your completed lessons are saved on this device.</p><button onClick={() => location.reload()}>Reload the lab</button></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary>{privateAccess?<PrivateGate><LearningApp/></PrivateGate>:<LearningApp/>}</ErrorBoundary></React.StrictMode>);
