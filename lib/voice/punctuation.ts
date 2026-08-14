const punctuationMap: Array<[RegExp, string]> = [
  [/\bperiod\b|\bfull stop\b/gi, '.'],
  [/\bcomma\b/gi, ','],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation mark\b/gi, '!'],
  [/\bcolon\b/gi, ':'],
  [/\bsemicolon\b/gi, ';'],
  [/\bopen quote\b|\bclose quote\b/gi, '"'],
  [/\bopen parenthesis\b/gi, '('],
  [/\bclose parenthesis\b/gi, ')'],
  [/\bem dash\b/gi, '—'],
  [/\bhyphen\b/gi, '-'],
  [/\bnew line\b/gi, '\n'],
  [/\bnew paragraph\b/gi, '\n\n'],
];

export function normalizeSpokenPunctuation(text: string) {
  return punctuationMap.reduce((acc, [pattern, replacement]) => {
    return acc.replace(pattern, replacement);
  }, text);
}
