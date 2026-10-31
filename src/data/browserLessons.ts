import type { Lesson, Question } from "./lessons";
import { browserUnits, chapterInfo } from "../browser/curriculum.ts";
const checks: Record<number, [string, string[], number, string][]> = {
  10: [
    [
      "Which result is static for the original query?",
      [
        "querySelectorAll result",
        "getElementsByClassName result",
        "Every NodeList",
      ],
      0,
      "querySelectorAll returns a static NodeList; childNodes is a live NodeList.",
    ],
    [
      "Which value is rendered-text-aware?",
      ["textContent", "innerText", "innerHTML"],
      1,
      "innerText depends on rendering/layout; textContent follows DOM text nodes.",
    ],
    [
      "What does cloneNode(true) omit?",
      [
        "Descendants",
        "Listeners registered with addEventListener",
        "Attributes",
      ],
      1,
      "It copies markup/descendants, not addEventListener registrations. Review duplicate ids and attach/delegate behavior.",
    ],
  ],
  11: [
    [
      "Which field names the node running the listener now?",
      ["target", "currentTarget", "key"],
      1,
      "target identifies the origin, currentTarget identifies this listener’s node.",
    ],
    [
      "Which method stops later listeners on the same node as well as propagation?",
      ["preventDefault", "stopPropagation", "stopImmediatePropagation"],
      2,
      "stopImmediatePropagation stops later listeners on this node; preventDefault affects a default action.",
    ],
    [
      "Which focus events bubble?",
      ["focus and blur", "focusin and focusout", "No focus event ever bubbles"],
      1,
      "focusin/out bubble. focus/blur can be observed on ancestors with capture.",
    ],
  ],
  12: [
    [
      "Which API follows normal validation and submit-event behavior?",
      [
        "form.submit()",
        "form.requestSubmit()",
        "A generic click listener on any element",
      ],
      1,
      "requestSubmit follows the submission path; form.submit bypasses validation and submit handlers.",
    ],
    [
      "How should repeated FormData values be read?",
      [
        "getAll(name)",
        "Only Object.fromEntries",
        "Treat every checkbox as false",
      ],
      0,
      "getAll preserves repeated entries; Object.fromEntries retains only one value per key.",
    ],
    [
      "Can client validation enforce server trust?",
      [
        "Yes",
        "No, the service must validate independently",
        "Only if a password input is masked",
      ],
      1,
      "Client validation improves usability; requests can bypass it. Authentication and authorization need trusted infrastructure.",
    ],
  ],
  13: [
    [
      "What is a timer delay?",
      [
        "A guaranteed exact callback time",
        "A minimum scheduling request",
        "An instruction to interrupt synchronous code",
      ],
      1,
      "Callbacks wait for the stack/task scheduling and may be delayed/throttled.",
    ],
    [
      "Which pattern avoids overlapping async refresh work?",
      [
        "Schedule the next timeout after awaited work",
        "Start fetch in a frequent interval with no guard",
        "Never handle errors",
      ],
      0,
      "Scheduling after completion makes the sequence explicit and supports cancellation.",
    ],
    [
      "Why use a deadline for countdown display?",
      [
        "To correct for delayed callbacks",
        "To ensure all timers execute exactly",
        "To create secure sessions",
      ],
      0,
      "Timestamps measure actual elapsed time; nominal tick counts drift. A display countdown is not a security boundary.",
    ],
  ],
  14: [
    [
      "Which cookie flag cannot be controlled through document.cookie?",
      ["Path", "HttpOnly", "Max-Age"],
      1,
      "HttpOnly is controlled through an appropriate HTTP response and excludes script access.",
    ],
    [
      "What normally survives a same-tab native sessionStorage reload?",
      [
        "Its session data",
        "Nothing under any condition",
        "Only data copied into cookies",
      ],
      0,
      "A normal reload stays in the page session. Ending/restoring sessions and opener behavior have caveats.",
    ],
    [
      "When both are valid, which expiry instruction takes precedence?",
      ["Max-Age", "Expires", "The longest value always wins"],
      0,
      "Max-Age takes precedence over Expires; security/privacy policies may impose additional limits.",
    ],
  ],
};
export const browserLessons: Lesson[] = chapterInfo.map((meta) => {
  const units = browserUnits.filter((u) => u.chapter === meta.id),
    first = units[0],
    last = units.at(-1)!;
  const quiz = checks[meta.id].map(
    ([prompt, choices, answer, explanation], i) =>
      ({
        id: meta.id + "-" + String.fromCharCode(97 + i),
        kind: "Browser checkpoint",
        prompt,
        choices,
        answer,
        explanation,
      }) as Question,
  );
  return {
    ...meta,
    objective: units.map((u) => u.title).join("; ") + ".",
    why: first.why,
    real: "Build interactive browser applications with explicit input, state, errors and lifecycle management.",
    analogy: first.analogy,
    sections: units.map((u) => ({ title: u.title, text: u.what })),
    examples: units
      .slice(0, 3)
      .map((u) => ({ title: u.title, code: u.code, explanation: u.recap })),
    predict: { ...first.questions[0], id: meta.id + "-p" },
    debug: {
      prompt: first.hint,
      starter: first.broken,
      solution: first.code,
      hint: first.hint,
    },
    challenge: {
      prompt: last.task,
      starter:
        "// Build your independent browser exercise in the native experiment.",
      solution: last.code,
      hint: last.hint,
    },
    quiz,
    summary: units.map((u) => u.recap).join(" "),
    notes: {
      say: first.what,
      demo: first.how.join(" "),
      ask: first.questions[0].prompt,
      answer: first.questions[0].explanation,
      misconception: first.misconception,
      exercise: last.task,
      transition:
        "Use the next chapter or browser applications pathway to connect these skills.",
    },
  };
});
