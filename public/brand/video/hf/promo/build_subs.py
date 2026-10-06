# Phrase captions for the host-B promo, authored words timed from whisper word stamps.
O1, O2, O3A, O3B, O4 = 0.0, 15.072, 30.144, 37.164, 43.736
CUT = 8.5  # clip 3 resumes here (glitch "pronounced Kiva" removed)
p = []
def add(off, s, e, t): p.append((off + s, off + e, t))
for s, e, t in [(0.0, 1.2, "Okay,"), (1.28, 2.5, "what if every memecoin"), (2.56, 3.9, "trade actually helped"),
                (3.96, 5.3, "someone real?"), (5.88, 7.6, "This is sow.fun."), (7.94, 9.3, "You pick a real borrower"),
                (9.38, 10.1, "on Kiva,"), (10.16, 11.75, "like a weaver, a farmer,"), (11.8, 12.7, "or a baker,"),
                (12.76, 13.6, "and you launch a coin"), (13.64, 15.0, "for them on Solana.")]: add(O1, s, e, t)
for s, e, t in [(0.0, 2.6, "Every trade has a small fee."), (3.6, 5.2, "45% of it is locked"),
                (5.24, 8.2, "to that person’s Kiva loan, forever."), (8.58, 10.0, "Another 45 goes"),
                (10.06, 11.85, "to whoever launched the coin,"), (11.9, 13.7, "and 10%"), (13.74, 15.0, "keeps the lights on.")]: add(O2, s, e, t)
for s, e, t in [(0.0, 1.55, "And honestly,"), (1.62, 3.8, "you don’t have to trust anyone."),
                (4.04, 5.95, "The fees are claimed on-chain,"), (6.0, 7.0, "sent to Kiva,")]: add(O3A, s, e, t)
for s, e, t in [(8.6, 9.8, "and every single hop"), (9.82, 11.45, "gets a public receipt"),
                (11.5, 13.3, "that you can check yourself."), (13.84, 15.0, "Nothing’s hidden.")]: add(O3B - CUT, s, e, t)
for s, e, t in [(0.0, 2.35, "When that loan is fully funded,"), (2.42, 3.85, "the coin doesn’t stop."),
                (3.9, 5.1, "It moves on to the next"), (5.16, 6.6, "borrower in line."),
                (6.76, 9.2, "So the leaderboard isn’t market cap,"), (9.3, 11.0, "it’s lives lifted."),
                (11.18, 13.8, "Sow a coin, grow a life."), (13.92, 15.0, "sow.fun")]: add(O4, s, e, t)
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Segoe UI Black,68,&H00FFFFFF,&H00FFFFFF,&H00222222,&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,90,90,330,1
Style: Tag,Segoe UI,30,&H99FFFFFF,&H99FFFFFF,&H66000000,&H00000000,0,0,0,0,100,100,0,0,1,1.5,0,7,44,44,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open("subs.ass", "w", encoding="utf-8") as f:
    f.write(hdr)
    for s, e, t in p:
        f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Cap,,0,0,0,,{t}\n")
print(len(p), "captions")
