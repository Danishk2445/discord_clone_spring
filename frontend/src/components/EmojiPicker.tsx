"use client";

import { useMemo, useState } from "react";

type Category = { name: string; emojis: string[] };

const CATEGORIES: Category[] = [
  {
    name: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨",
      "😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕",
      "🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","😮",
      "😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓",
      "😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","💩","🤡","👹","👺","👻","👽","🤖",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚",
      "🖐️","🖖","👋","🤝","🙏","💪","🦾","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴",
      "👀","👁️","👅","👄","💋","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️",
      "💕","💞","💓","💗","💖","💘","💝",
    ],
  },
  {
    name: "Animals",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵",
      "🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴",
      "🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🦗","🕷️","🦂","🐢","🐍","🦎","🦖",
      "🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦓","🦍","🦧","🐘",
    ],
  },
  {
    name: "Food",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠",
      "🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔",
      "🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🍲","🍜","🍝","🍣","🍱","🍤","🍙",
      "🍚","🍘","🍥","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪",
    ],
  },
  {
    name: "Activities",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🥅","🏒","🏑",
      "🥍","🏏","🪃","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️",
      "🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆",
      "🥇","🥈","🥉","🏅","🎖️","🎯","🎮","🕹️","🎲","🎳","🎰","🧩","🎨","🎭","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻",
    ],
  },
  {
    name: "Travel",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍️",
      "🛺","🚲","🛴","🚂","✈️","🚀","🛸","🚁","⛵","🚤","🛥️","🛳️","⛴️","🚢","🗽","🗼",
      "🏰","🏯","🏟️","🎡","🎢","🎠","⛲","⛱️","🏖️","🏝️","🏜️","🌋","⛰️","🏔️","🗻","🏕️",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🕹️","🗜️","💾","💿","📀","📷","📸","📹","🎥",
      "📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳",
      "🔋","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","💰","💳","💎",
      "🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🗡️","⚔️","🔫","🪃","🏹","🛡️","🪚","🔧","🪛","🔩","⚙️",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "✅","☑️","✔️","❌","❎","⭕","🚫","⛔","📛","🔞","💯","💢","💥","💫","💦","💨",
      "🕳️","💣","💬","👁️‍🗨️","🗨️","🗯️","💭","💤","🔔","🔕","📢","📣","📯","🔊","🔉","🔈","🔇",
      "♻️","✨","⭐","🌟","💫","⚡","🔥","🌈","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄",
    ],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const cat of CATEGORIES) {
      if (cat.name.toLowerCase().includes(q)) {
        for (const e of cat.emojis) {
          if (!seen.has(e)) {
            seen.add(e);
            out.push(e);
          }
        }
      }
    }
    return out;
  }, [query]);

  const visibleEmojis = results ?? CATEGORIES[activeCat].emojis;

  return (
    <div className="w-72 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
      <div className="border-b border-border p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji"
          className="w-full rounded bg-surface px-2 py-1 text-xs text-text outline-none placeholder:text-text-muted"
          autoFocus
        />
      </div>
      {results === null ? (
        <div className="flex gap-1 border-b border-border px-2 py-1 text-[11px] text-text-muted">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setActiveCat(i)}
              className={
                i === activeCat
                  ? "rounded px-1.5 py-0.5 bg-accent/20 text-accent"
                  : "rounded px-1.5 py-0.5 hover:bg-surface hover:text-text"
              }
            >
              {c.emojis[0]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="max-h-56 overflow-y-auto p-1">
        {visibleEmojis.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-text-muted">
            No matches.
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {visibleEmojis.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => onSelect(e)}
                className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-surface"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
