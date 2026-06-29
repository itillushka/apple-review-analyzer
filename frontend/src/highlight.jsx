import React from 'react';

// Light syntax tint — keys Bone, strings Lichen, numbers/bool Plum, punctuation Smoke.
// Ported from the original highlight() helper. Returns an array of <span> nodes.
export function highlight(src, isJson) {
  const out = [];
  let key = 0;
  if (!isJson) {
    // cURL: tint flags and the quoted strings
    const re = /("[^"]*"|'[^']*'|\s-[A-Za-z]+|https?:\/\/[^\s"']+)/g;
    let last = 0, m;
    while ((m = re.exec(src))) {
      if (m.index > last) out.push(React.createElement('span', { key: key++, style: { color: '#9a9a9a' } }, src.slice(last, m.index)));
      const tok = m[0];
      let color = '#15846e';
      if (/^\s-/.test(tok)) color = '#8052ff';
      else if (/^https?:/.test(tok)) color = '#bdbdbd';
      out.push(React.createElement('span', { key: key++, style: { color } }, tok));
      last = m.index + tok.length;
    }
    if (last < src.length) out.push(React.createElement('span', { key: key++, style: { color: '#9a9a9a' } }, src.slice(last)));
    return out;
  }
  // JSON: keys (before colon) Bone, string values Lichen, numbers/bool Plum, punctuation Smoke
  const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b-?\d+\.?\d*\b|\btrue\b|\bfalse\b|\bnull\b)|([{}\[\],:])/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(React.createElement('span', { key: key++, style: { color: '#9a9a9a' } }, src.slice(last, m.index)));
    let color = '#9a9a9a';
    if (m[1]) color = '#ffffff';
    else if (m[2]) color = '#15846e';
    else if (m[3]) color = '#8052ff';
    else if (m[4]) color = '#9a9a9a';
    out.push(React.createElement('span', { key: key++, style: { color } }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(React.createElement('span', { key: key++, style: { color: '#9a9a9a' } }, src.slice(last)));
  return out;
}
