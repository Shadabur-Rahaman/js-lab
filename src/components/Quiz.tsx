import { useState } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import type { Question } from '../data/lessons';
import { Code } from './Playground';
export default function Quiz({question,onAnswer}:{question:Question;onAnswer:(id:string,correct:boolean)=>void}) {
 const [selected,setSelected]=useState<number|null>(null),[submitted,setSubmitted]=useState(false);
 const correct=selected===question.answer;
 return <section className="quiz-card"><span className="eyebrow"><Lightbulb size={13}/>{question.kind.toUpperCase()}</span><h3>{question.prompt}</h3>{question.code&&<Code>{question.code}</Code>}<div className="quiz-choices">{question.choices.map((choice,i)=><button key={choice} className={'quiz-choice '+(selected===i?'selected ':'')+(submitted&&selected===i?(correct?'correct':'incorrect'):'')} onClick={()=>{setSelected(i);setSubmitted(false)}} aria-pressed={selected===i}><span>{String.fromCharCode(65+i)}</span>{choice}{submitted&&selected===i&&correct&&<CheckCircle2 size={17}/>}</button>)}</div><button className="button small secondary" disabled={selected===null||submitted} onClick={()=>{setSubmitted(true);onAnswer(question.id,correct)}}>Check answer <ArrowRight size={14}/></button>{submitted&&<div className={'feedback '+(correct?'success':'retry')} role="status"><strong>{correct?'You’ve got it.':'Good experiment. Let’s reason it through.'}</strong><p>{question.explanation}</p>{!correct&&<p>Choose again, then check your answer.</p>}</div>}</section>
}
