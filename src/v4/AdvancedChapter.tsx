import BrowserChapter from "../browser/BrowserChapter";
import { advancedChapters, advancedUnits } from "./curriculum";
import { AdvancedTools } from "./Tools";
type Props = {
  id: number;
  teacher: boolean;
  completed: boolean;
  concepts: string[];
  onConcept: (id: string) => void;
  onAnswer: (id: string, correct: boolean) => void;
  onComplete: () => void;
};
export default function AdvancedChapter(props: Props) {
  return (
    <div className="v4-learning">
      <BrowserChapter
        {...props}
        extension={{
          chapters: advancedChapters,
          units: advancedUnits,
          renderTool: (u) => (
            <AdvancedTools
              key={"tool-" + u.id}
              unit={advancedUnits.find((x) => x.id === u.id)!}
            />
          ),
        }}
      />
    </div>
  );
}
