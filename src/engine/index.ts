export { analyzeWord, normalizeSpoken, splitGroups, stripMarks, tokenize, type Unit, type WordForm } from './normalize';
export { levenshtein, unitDistance, alignUnits } from './editDistance';
export { similarity, CORRECT_THRESHOLD, MATCH_THRESHOLD, MIN_WORD_LENGTH } from './similarity';
export { collapseMuqattaat, muqattaatAt, MUQATTAAT_FORMS } from './muqattaat';
export { letterGroups, letterRuns, hasLetterSlip, worstStatus, type LetterGroup, type LetterRun, type LetterStatus } from './letters';
export {
  createState,
  ingest,
  finalize,
  currentIndex,
  LOOKAHEAD,
  type ExpectedWord,
  type ExtraWord,
  type Heard,
  type MatchState,
  type WordMatch,
  type WordStatus,
} from './matcher';
export { summarize, type Mistake, type MistakeKind, type Summary } from './score';
