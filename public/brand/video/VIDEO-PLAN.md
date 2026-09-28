# sow.fun promo video - Veo production plan

Goal: a ~40s hero promo for X (@sowfunhq) plus a 15s teaser, stitched from
8-second Veo clips. Tone: warm, earnest, a little magical - NOT crypto-bro.
The brand's hand-drawn ink style carries the whole video so the clips feel
like one piece even though they are generated separately.

## Tooling

- Google Veo 3.1 via **Flow** (labs.google/flow) or the Gemini app. Needs
  Google AI Pro (or Ultra for more generations). Veo 3.1 makes 8s 1080p
  clips WITH native audio.
- In Flow, use **Ingredients / reference images** and feed it our existing
  brand art so every clip inherits the style:
  - public/brand/tweets/tw2-coinflight.png (coin with wings)
  - public/brand/tweets/tw4-cycle.png (sow-grow-harvest-repeat loop)
  - public/brand/tweets/tw5-receipt.png (receipt trail)
  - public/brand/tweets/tw9-seedpacket.png ($SOW seed packet)
  - public/brand/tweets/tw10-sunrise.png (sunrise field)
  - public/brand/x-avatar.png (logo)
- Generate 2-3 takes per scene, keep the best. Same seed style string every
  time (below), or the clips will drift and the stitch will look cheap.
- Veo renders on-screen TEXT unreliably. Do NOT ask it for captions or the
  logo. Add all text in post (CapCut or ffmpeg drawtext). The only safe
  in-scene text is a single short word baked into the art (e.g. "SOW" on
  the seed packet, which comes from the reference image anyway).

## Master style string (paste at the end of EVERY prompt, verbatim)

> Hand-drawn 2D animation, black wobbly ink outlines, flat green (#2AA967)
> fills slightly offset and misregistered like vintage print, warm cream
> paper background (#F8F2E6), gentle paper grain, small gold (#F8CD69)
> accents, loose organic linework that wobbles frame to frame like a
> hand-inked boiling line, cozy and optimistic, no photorealism, no 3D,
> no gradients, no neon.

## Storyboard - main cut (6 clips x 8s, trimmed to ~40s)

### Clip 1 - THE SEED (hook)
Post text overlay: "Launch a coin."
Prompt:
> A single gold coin falls gently from the top of frame like a seed and
> lands in dark hand-drawn soil. The soil closes over it. A beat of quiet.
> Then a tiny green sprout pushes up through the soil and unfurls two
> leaves. Slow, intimate close-up, camera slowly pushing in. Soft morning
> light. Audio: one soft thud, quiet birdsong, a gentle single piano note
> as the sprout appears. [style string]

### Clip 2 - THE FEES (mechanic)
Post text overlay: "Every trade feeds the pledge. 45% locked for a real loan."
Prompt:
> The sprout has grown into a small leafy plant. With every gentle pulse of
> the plant, small gold coins bloom on its stems like fruit. Coins detach
> one by one and drift left along a drawn dotted line into a glass jar
> labeled with a simple hand-drawn padlock icon. The jar slowly fills.
> Side view, static camera with a slow subtle zoom. Audio: soft chimes as
> each coin drops into the jar, warm ambient hum. [style string]

### Clip 3 - THE BORROWER (heart)
Post text overlay: "It funds someone real."
Prompt:
> A hand-drawn market stall in a warm village scene. A woman in an apron
> arranges vegetables; a hand-drawn sewing machine and a small solar panel
> sit beside the stall. Above her, a horizontal progress bar drawn in ink
> fills with green from left to right. When it fills completely, tiny gold
> confetti leaves flutter down and she smiles and looks up. Camera: slow
> dolly from left to right across the stall. Audio: distant market chatter,
> a warm string swell as the bar completes. [style string]

### Clip 4 - THE RECEIPTS (trust)
Post text overlay: "Every hop has a receipt. Audit it, don't trust it."
Prompt:
> A chain of hand-drawn paper receipts unfurls across the frame one after
> another, each stamped with a green check mark as it appears, connected by
> a dotted ink line: a coin, then an arrow, a receipt, an arrow, a jar, an
> arrow, a receipt, an arrow, a small house with a heart above it. The
> dotted line draws itself as the camera tracks right. Clean, diagrammatic,
> playful. Audio: soft paper rustles and a satisfying stamp sound for each
> check mark. [style string]

### Clip 5 - THE CYCLE (loop)
Post text overlay: "Sow. Grow. Harvest. Repeat."
Prompt:
> Four small hand-drawn icons arranged in a circle: a hand dropping a seed,
> a growing sprout, a bundle of wheat with a gold coin, and a curved arrow.
> A green dotted line animates around the circle connecting them, and each
> icon comes alive with a tiny animation as the line passes it. The circle
> completes and begins again, seamless loop. Centered, static camera.
> Audio: a light rhythmic acoustic loop that resolves each time the circle
> completes. [style string]

### Clip 6 - THE SUNRISE (close + CTA)
Post text overlay: "sow.fun - Sow a coin. Grow a life." (add logo in post)
Prompt:
> A wide hand-drawn field at sunrise. Rows of small plants stretch to the
> horizon, and each plant carries one glowing gold coin that gleams softly
> in the morning light. The sun rises slowly behind low hills, gold rays
> drawn as simple ink lines sweeping across the field. Camera slowly cranes
> up to reveal how far the rows go. Hopeful and vast. Audio: swelling warm
> score with the birdsong from the opening returning, resolving to calm.
> [style string]

## Teaser cut (15s, for pinned tweet / replies)

Clip 1 (trim to 6s) + Clip 6 (trim to 7s) + 2s end card (static image of
x-avatar.png on cream with the URL, made in post). One overlay only:
"Sow a coin. Grow a life."

## Stitching (ffmpeg, run from this folder)

Put the picked takes here as c1.mp4 ... c6.mp4 first.

Simple hard cuts (safe default - the paper-grain style hides cuts well):

    ffmpeg -f concat -safe 0 -i <(for f in c1 c2 c3 c4 c5 c6; do echo "file '$PWD/$f.mp4'"; done) -c copy main-raw.mp4

PowerShell version (Windows):

    "file 'c1.mp4'","file 'c2.mp4'","file 'c3.mp4'","file 'c4.mp4'","file 'c5.mp4'","file 'c6.mp4'" | Out-File -Encoding ascii list.txt
    ffmpeg -f concat -safe 0 -i list.txt -c copy main-raw.mp4

0.5s crossfades between all six clips (nicer, re-encodes; assumes each
clip is exactly 8.0s - check with ffprobe and adjust offsets = cumulative
duration minus fades):

    ffmpeg -i c1.mp4 -i c2.mp4 -i c3.mp4 -i c4.mp4 -i c5.mp4 -i c6.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=7.5[v1];[v1][2:v]xfade=transition=fade:duration=0.5:offset=15[v2];[v2][3:v]xfade=transition=fade:duration=0.5:offset=22.5[v3];[v3][4:v]xfade=transition=fade:duration=0.5:offset=30[v4];[v4][5:v]xfade=transition=fade:duration=0.5:offset=37.5[v5];[0:a][1:a]acrossfade=d=0.5[a1];[a1][2:a]acrossfade=d=0.5[a2];[a2][3:a]acrossfade=d=0.5[a3];[a3][4:a]acrossfade=d=0.5[a4];[a4][5:a]acrossfade=d=0.5[a5]" -map "[v5]" -map "[a5]" -c:v libx264 -crf 18 -preset slow -c:a aac -b:a 192k main.mp4

Text overlays: easier in CapCut (drag main.mp4 in, add the five overlay
lines in Figtree Bold or the closest match, white or #223829 depending on
scene). If staying in ffmpeg, use drawtext per time range.

## Export specs for X

- 16:9, 1920x1080, H.264 + AAC, under 60s, under 512MB (we'll be ~30MB).
- Upload natively to X (never a link), pin it, and pair it with tweet #1
  from TWEETS.md.
- First 3 seconds must work with sound OFF - that is why clip 1 opens with
  pure visual (coin-seed falling), no talking.

## Consistency checklist before stitching

- [ ] Same style string on every prompt, unedited
- [ ] Same cream background tone in every take (regenerate if Veo drifts
      to white or gray)
- [ ] No accidental text/gibberish rendered in-scene (regenerate if so)
- [ ] Audio levels roughly matched (ffmpeg loudnorm or CapCut auto)
- [ ] Coin design roughly consistent (feed tw2-coinflight.png as reference
      in every generation that shows coins)
