# 依頼 1回目: 見た目の試し（10枚）第2版

2026-10-13。第1版は指示があいまいで、試しに作った最初の1枚から違和感があり、3回作り直しても消えなかった。
そこで、1枚ずつの依頼文を、それだけで完結する細かい指示に書き直した。
画像を作る道具は英語の細かい指示のほうが正確に従うので、依頼文は英語にした（各見出しの下に、日本語で何の絵かを書いてある）。

## 使い方

1. ChatGPT で新しい会話を開く。前の「共通の指示」は貼らなくてよい（各依頼文に全部入っている）。
2. **まず 1. 大道具係 だけを作る。** 気に入るまで直す（下の「直し方の言い方」を使う）。これが全部の絵の「お手本」になる。
3. 2枚目からは、**お手本の大道具係の絵を添付して**、依頼文を貼る（依頼文の先頭に、お手本に合わせる指示が入っている）。
4. できた絵は、見出しにあるファイル名で、PCの `idle game/art/inbox/` に置く。
5. 何枚かたまったら「art-in」と送る。

同じ違和感が2回続いたら、その会話で直し続けず、**新しい会話を開いて依頼文を貼り直す**（同じ会話の中だと、前の絵の形に引っぱられやすい）。
2026-10-14: 大道具係で「盾を持つ両手が右端に寄る」が3回続いたので、盾を片腕に付け、もう片方の手に木槌を持たせる形に変えた。

## 直し方の言い方（そのまま貼れる）

- 頭身がずれたとき: `Make the proportions match the spec exactly: total height = 2.5 heads, the head is 40% of the full height, short arms and legs.`
- 線が黒い・細いとき: `All outlines must be dark brown #6A5242, never black. Outer outline thicker (about 6px at 1024px), inner lines thinner (about 3px).`
- 塗りが厚い・リアルなとき: `Use flat cel shading only: one flat shadow tone, no gradients, no texture, no painterly or 3D look.`
- 顔が違うとき: `Keep the face simple: large round eyes in the lower half of the head with two small white highlights, small pink blush ovals, tiny mouth, no nose line.`
- 背景が透明でないとき: `Make the background fully transparent (PNG with alpha). No floor, no shadow, no backdrop.`
- 全身が切れているとき: `Show the whole body from the top of the head to the soles of the feet, with empty margin around it.`
- 両手が同じ側に寄ったとき（大道具係の盾など）: `Fix the hands: the board is strapped to the forearm on the LEFT side of the image only, and that hand is hidden behind the board. The other hand, on the RIGHT side of the image, raises a wooden mallet at shoulder height. The two hands must be on opposite sides of the body. Never put both hands on the board or on the same side.`
- 持ち物が大きすぎるとき: `Make the prop smaller: no taller than his torso and no wider than his shoulders. His face and the center of his chest must stay fully visible.`
- お手本とずれたとき: `Match the attached reference image exactly in line color, line thickness, head-to-body ratio, eye style and shading. Only change the character design.`

---

## 1. 大道具係（お手本の1枚目） → `h_stagehand.png`

劇団の大道具の係。がっしりした青年。舞台の書き割りを盾にして、仲間を守る役。

```
Create ONE character illustration for a cute mobile idle RPG about a traveling theater troupe.

STYLE (follow exactly):
- Super-deformed chibi, total height = 2.5 heads; the head is 40% of the full height. Round, soft shapes; short arms and legs; small rounded hands and feet.
- Face: large round eyes placed in the lower half of the head, dark brown irises with two small white highlights, small pink blush ovals on the cheeks, tiny mouth, no nose line.
- Outlines: dark brown #6A5242 only (never black). Outer outline thicker (about 6px at 1024px), inner lines thinner (about 3px), little line-weight variation.
- Coloring: flat anime cel shading with ONE flat shadow tone (a slightly darker, warmer version of each base color); light from the upper left; at most a few tiny highlights on hair and eyes. No gradients, no texture, no rim light, no glow, no painterly or 3D look.
- Palette: high-brightness pastels — cream, beige, peach pink, blonde, soft navy, sky blue. Avoid pure black, saturated or dark colors, strong contrast.

CHARACTER: "Stagehand" — a sturdy, broad-shouldered young man in his early 20s, kind and dependable.
- Hair: short messy light-brown hair, a sky-blue bandana tied around the head.
- Clothes: cream long-sleeve work shirt with rolled sleeves, beige canvas work apron with a front pocket (a pencil sticking out), soft navy work pants, brown boots, light-brown leather work gloves.
- Prop 1 (shield): a small flat wooden stage-scenery board, painted with a simple green tree and blue sky, worn like a real round-cornered shield. It is strapped to ONE forearm only — the arm on the LEFT side of the image. That hand grips a handle on the back of the board, so this hand is hidden behind the board. The board is held upright, covering only the left side of his body (from the image's point of view); his face and the center of his chest stay visible. The board is about as tall as his torso and no wider than his shoulders.
- Prop 2 (mallet): his OTHER hand — the one on the RIGHT side of the image — is raised to about shoulder height and holds a small wooden mallet, clearly away from the board.
- Hands: the two hands are far apart, one on each side of the body. Only one hand touches the board. Do NOT put both hands on the board, and do NOT put both hands on the same side of the image.
- Expression and pose: confident warm grin, standing firmly with feet apart, body facing the viewer (front view), face toward the viewer.

FORMAT:
- Square 1024x1024 image, fully transparent background (PNG with alpha).
- Exactly one character, full body from the top of the head to the soles of the feet, centered, filling about 80% of the image height, with empty margin on all sides.
- No text, no logo, no frame, no floor, no cast shadow, no background objects.
```

## 2. 見習い役者 → `h_apprentice.png`

劇団に入ったばかりの元気な少年。木の剣で張り切って戦う攻撃役。

```
Use the attached image as the STYLE REFERENCE. Match it exactly in line color, line thickness, head-to-body ratio (2.5 heads), eye style, blush, and flat one-tone cel shading. Only the character design changes.

CHARACTER: "Apprentice Actor" — an energetic boy around 12 years old who just joined the theater troupe.
- Hair: fluffy blonde hair with a small cowlick.
- Clothes: a stage costume that is a little too big for him — peach-pink vest over a cream shirt with puffy sleeves, a short sky-blue cape, beige knee-length shorts, white socks, small brown shoes.
- Props: in his right hand he raises a small wooden practice sword above his head; in his left hand he holds a rolled-up paper script tied with a red string.
- Expression and pose: wide-open eager smile, eyebrows up, mid-step forward as if charging bravely, body in three-quarter view toward the viewer's right, face toward the viewer.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one character, full body with empty margin, about 80% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Pastel palette (cream, beige, peach pink, blonde, soft navy, sky blue).
```

## 3. 呼び込み → `h_barker.png`

お客を呼び込む明るい少女。大きな声で敵全体にダメージを与える攻撃役。

```
Use the attached image as the STYLE REFERENCE. Match it exactly in line color, line thickness, head-to-body ratio (2.5 heads), eye style, blush, and flat one-tone cel shading. Only the character design changes.

CHARACTER: "Barker" — a cheerful girl around 14 who calls in the audience for the theater troupe.
- Hair: peach-pink hair in two short pigtails, under a soft-navy newsboy cap.
- Clothes: cream blouse, a vest with a pattern of small ticket stubs (beige and sky blue), a short soft-navy skirt, striped knee socks, small brown shoes.
- Props: her right hand holds a cone-shaped paper megaphone up to her mouth; her left hand waves a small triangular troupe flag (peach pink with a simple white star, no letters).
- Expression and pose: mouth wide open shouting happily, eyes closed in a smile ("^ ^"), leaning forward a little on one foot, body in three-quarter view toward the viewer's right.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one character, full body with empty margin, about 80% of the image height. No text or letters anywhere, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Pastel palette (cream, beige, peach pink, blonde, soft navy, sky blue).
```

## 4. 花形役者（★3） → `h_star.png`

劇団の看板の若い男性役者。いちばん高いレア度らしく、華やかに。

```
Use the attached image as the STYLE REFERENCE. Match it exactly in line color, line thickness, head-to-body ratio (2.5 heads), eye style, blush, and flat one-tone cel shading. Only the character design changes.

CHARACTER: "Star Actor" — the troupe's leading young male actor, elegant and a little showy (this is a top-rarity character, so the costume is the most splendid of the set).
- Hair: neat blonde hair with a side part, one strand falling over the forehead.
- Clothes: a stage costume — soft-navy tailcoat jacket with gold buttons and gold trim, white cravat, white tights-like pants, soft-navy boots with gold cuffs, a long white cape with a sky-blue lining fluttering behind him.
- Prop: a slim rapier with a gold hand guard, held high in his right hand pointing up and forward.
- Expression and pose: confident smile with a playful wink (left eye closed), left hand on his chest, dramatic stage pose, body in three-quarter view toward the viewer's right.
- Effect: a few small four-pointed sparkles around him (pale gold), simple flat shapes, not glowing.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one character, full body including the whole cape and sword with empty margin, about 80% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Pastel palette (cream, beige, peach pink, blonde, soft navy, sky blue), gold only as small accents.
```

## 5. 衣装係（★2） → `h_costume.png`

劇団の衣装を作るやさしいお姉さん。針と糸で仲間を回復する役。

```
Use the attached image as the STYLE REFERENCE. Match it exactly in line color, line thickness, head-to-body ratio (2.5 heads), eye style, blush, and flat one-tone cel shading. Only the character design changes.

CHARACTER: "Costume Maker" — a gentle young woman in her early 20s who sews the troupe's costumes and heals her friends with her magic needle.
- Hair: long soft beige hair in a low side braid, a small pincushion shaped like a tomato pinned to her hair as an accessory.
- Clothes: sky-blue long-sleeve dress, a peach-pink apron with lace trim, a yellow tape measure hanging around her neck, a small wooden sewing box on a strap at her hip, brown flat shoes.
- Prop: in her right hand she holds a large sewing needle (as long as her forearm) with a pale-pink thread that curls in the air in a soft spiral and ends in a small heart shape (flat color, no glow).
- Expression and pose: warm gentle smile, head tilted slightly, left hand open at her chest, body in three-quarter view toward the viewer's right.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one character, full body with empty margin, about 80% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Pastel palette (cream, beige, peach pink, blonde, soft navy, sky blue).
```

## 6. かかし（敵） → `e_scarecrow.png`

畑の魔物。可愛いけれど、少し意地悪そうで得意げ。

```
Use the attached image as the STYLE REFERENCE for line color, line thickness, flat one-tone cel shading and overall cuteness. This is an ENEMY MONSTER, not a human.

MONSTER: "Scarecrow" — a cute but slightly mischievous living scarecrow.
- Body: a round burlap-sack head (beige) with simple stitched features: two button eyes (dark brown), a zigzag stitched grin. A big straw hat (blonde straw) with a small hole. Patched cream-and-sky-blue shirt, straw poking out of the sleeves and collar. It stands on a single wooden pole instead of legs, slightly bouncing.
- Proportions: chunky and short, head about 45% of the full height.
- Expression and pose: smug grin, arms (straw-filled sleeves) stretched out wide, leaning a little to the viewer's left (it faces the party), facing the viewer.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one monster, whole body with empty margin, about 75% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Soft pastel colors, no dark or scary details.
```

## 7. きのこ（敵） → `e_mushroom.png`

歩くきのこの魔物。怒っているが丸くて可愛い。

```
Use the attached image as the STYLE REFERENCE for line color, line thickness, flat one-tone cel shading and overall cuteness. This is an ENEMY MONSTER, not a human.

MONSTER: "Mushroom" — a chubby walking mushroom.
- Body: a big round cap that is soft coral red (#F08A7E) with large cream polka dots, a short plump cream stem body with a small face on the stem, two tiny stubby legs and two tiny nub arms.
- Proportions: the cap is about 55% of the full height; very round and squat.
- Face: small angry eyebrows, round eyes with white highlights, a little pouting mouth, pink blush — angry but cute.
- Pose: stomping forward with one foot raised, arms raised in a "grr" pose, leaning a little to the viewer's left.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one monster, whole body with empty margin, about 70% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Soft pastel colors.
```

## 8. おおねずみ（敵） → `e_rat.png`

大きなねずみの魔物。チーズを抱えた、いたずらっぽい顔。

```
Use the attached image as the STYLE REFERENCE for line color, line thickness, flat one-tone cel shading and overall cuteness. This is an ENEMY MONSTER, not a human.

MONSTER: "Big Rat" — a chubby oversized rat standing on its hind legs.
- Body: soft gray fur (#B9B4AE) with a cream belly, big round pink ears, puffy cheeks, a long thin pink tail curling behind, small pink paws.
- Prop: hugging a big wedge of yellow cheese with holes against its chest.
- Proportions: round pear-shaped body, head about 45% of the full height.
- Face: mischievous half-closed eyes, sly grin showing two front teeth, pink blush.
- Pose: standing, slightly turned and leaning to the viewer's left, tail visible.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one monster, whole body including the tail with empty margin, about 75% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Soft pastel colors.
```

## 9. もりのくま（1章のボス、あとで相棒） → `c_bear.png`

1章のボス。倒すと改心して劇団の相棒になる。少し怖いが憎めない。

```
Use the attached image as the STYLE REFERENCE for line color, line thickness, flat one-tone cel shading and overall cuteness. This is a BOSS MONSTER that later becomes a friendly companion.

MONSTER: "Forest Bear" — a big, fluffy brown bear.
- Body: warm brown fur (#B07A52) with a cream muzzle and a cream crescent-moon mark on the chest, small round ears, stubby legs, big soft paws.
- Prop: hugging a round clay honey pot (beige with a sky-blue band) with golden honey dripping a little from the rim.
- Proportions: chunky and heavy, head about 40% of the full height; it should feel bigger and more imposing than the other characters, but still cute.
- Face: furrowed eyebrows and a grumpy frown, but round eyes with white highlights and a small blush — trying to look scary but clearly lovable.
- Pose: standing tall on hind legs, chest puffed out, facing the viewer, slightly turned to the viewer's left.

FORMAT: square 1024x1024, fully transparent background (PNG with alpha), exactly one bear, whole body with empty margin, about 85% of the image height. No text, no frame, no floor, no shadow.
Outlines dark brown #6A5242 (never black). Soft pastel colors.
```

## 10. 1章の背景 → `bg_ch1.png`

1章の舞台。森の中の街道。下の部分にキャラクターが並ぶので、すっきりさせる。

```
Use the attached image as the STYLE REFERENCE for line color and flat cel shading, but this is a BACKGROUND, not a character.

SCENE: a peaceful forest road for chapter 1 of a cute idle RPG about a traveling theater troupe. Daytime, soft warm light.
- Layout (important): landscape 1536x1024. Top 40%: pale sky-blue sky with a few soft cream clouds and round pastel-green tree canopies. Middle: a winding beige dirt road leading into the distance; far away on the road, a small covered wagon (cream canvas, peach-pink trim) and a tiny striped circus-style theater tent (cream and sky blue). Bottom 35%: an open, flat, empty area of light beige dirt road and short grass — keep it plain with no objects, because characters will stand there.
- Style: simple flat shapes, soft dark-brown #6A5242 outlines only on major shapes (thinner than character outlines), one flat shadow tone, gentle pastel colors (cream, beige, pastel green, sky blue, peach pink). Low detail so that characters in front stand out.
- No characters, no animals, no text, no logo, no frame. The background must NOT be transparent.
```
