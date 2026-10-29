import { Microscope, DeclarationLab, ScopeExplorer, HoistingLab, TypeLab, CoercionLab, ReferenceLab, PrefixLab, LogicalLab, TernaryLab, SwitchLab, DecisionProjects, ReturnLab } from './FoundationLabs';
import { ArrayLab, TransformLab, SortLab, DestructureLab, ReferenceCopyLab, ObjectLab } from './CollectionLabs';
import { ClosureLab, FunctionMachine, ThisLab } from './FunctionLabs';
import { IterationLab, LoopWorkshop } from './IterationLab';
export default function ConceptVisual({kind}:{kind:string}){switch(kind){
 case'microscope':return <Microscope/>;case'declarations':return <DeclarationLab/>;case'scope':return <ScopeExplorer/>;case'hoisting':return <HoistingLab/>;case'tdz':return <HoistingLab timeline/>;case'types':return <TypeLab/>;case'coercion':return <CoercionLab/>;case'truthiness':return <TypeLab truthiness/>;case'references':return <ReferenceLab/>;
 case'prefix':return <PrefixLab/>;case'logical':return <LogicalLab/>;case'ternary':return <TernaryLab/>;case'switch':return <SwitchLab/>;case'rps':return <DecisionProjects/>;case'early-return':case'returns':return <ReturnLab/>;case'iteration':return <IterationLab/>;case'loop-workshop':return <LoopWorkshop/>;
 case'function':return <FunctionMachine/>;case'function-forms':return <FunctionMachine forms/>;case'parameters':return <FunctionMachine parameters/>;case'this':return <ThisLab/>;case'closure':return <ClosureLab/>;
 case'array':return <ArrayLab/>;case'array-methods':return <ArrayLab methods/>;case'transform':return <TransformLab/>;case'sort':return <SortLab/>;case'destructure':return <DestructureLab/>;case'copy':return <ReferenceCopyLab/>;case'object':return <ObjectLab/>;case'object-iteration':return <ObjectLab iteration/>;case'properties':return <ObjectLab optional/>;
 default:return null;
}}
