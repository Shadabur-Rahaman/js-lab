import { coreConcepts } from './concepts.ts';
import { controlConcepts } from './controlConcepts.ts';
import { advancedConcepts } from './advancedConcepts.ts';
export const concepts=[...coreConcepts,...controlConcepts,...advancedConcepts];
export const conceptsFor=(lesson:number)=>concepts.filter(c=>c.lesson===lesson);
