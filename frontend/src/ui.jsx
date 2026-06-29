import React, { useState } from 'react';

// Parse a CSS declaration string ("display:flex;gap:12px") into a React style
// object. Lets us port the original inline styles verbatim — same design, no
// manual camelCasing. Handles -webkit-* → Webkit*, custom kebab props, etc.
export function s(css) {
  const out = {};
  if (!css) return out;
  for (const part of css.split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const prop = part.slice(0, i).trim();
    if (!prop) continue;
    const val = part.slice(i + 1).trim();
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  }
  return out;
}

// A styled element that supports hover / active / focus variants as CSS
// strings — the React stand-in for the original's style-hover/active/focus.
export function Box({ as: Tag = 'div', css, hover, active, focus, style, children,
  onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, ...rest }) {
  const [h, setH] = useState(false);
  const [a, setA] = useState(false);
  const [f, setF] = useState(false);
  const merged = {
    ...s(css),
    ...(h && hover ? s(hover) : null),
    ...(a && active ? s(active) : null),
    ...(f && focus ? s(focus) : null),
    ...style,
  };
  return (
    <Tag
      {...rest}
      style={merged}
      onMouseEnter={(e) => { if (hover) setH(true); onMouseEnter && onMouseEnter(e); }}
      onMouseLeave={(e) => { setH(false); setA(false); onMouseLeave && onMouseLeave(e); }}
      onMouseDown={(e) => { if (active) setA(true); onMouseDown && onMouseDown(e); }}
      onMouseUp={(e) => { setA(false); onMouseUp && onMouseUp(e); }}
      onFocus={(e) => { if (focus) setF(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setF(false); onBlur && onBlur(e); }}
    >
      {children}
    </Tag>
  );
}
