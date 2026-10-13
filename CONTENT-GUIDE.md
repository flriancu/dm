# Content guide

How to write a module, a sheet or an interface string so that a cold reader can act on
it without asking anyone. Rule CR-07 in [REQUIREMENTS.md](REQUIREMENTS.md) is the
contract; this file is the how.

## The reader

An adult in the author's family, on a phone, who has never heard of the pilot, the
design documents, coaching, or psychology. Every screen is read cold. If a sentence
needs something the reader was not told on this screen, it is wrong.

## Six checks for every sentence

1. **Object in the sentence.** "Scrie în caiet trei visuri", never "scrie-le".
2. **Nothing from outside the course.** No pilot, sessions, slides, decks, colleagues,
   "ca înainte", "cum am zis". The sources page may name where the course comes from.
3. **Expand on first use, per screen.** "C · Clarificare", not "C". "Prietenul Visului
   (persoana care te însoțește la întâlniri)" the first time it appears on a screen.
4. **Inputs are self-describing.** Label says what to type; placeholder gives an
   example; the button says what happens ("Adaugă criteriu", not "Adaugă" when another
   "Adaugă" is on the page).
5. **Empty states point forward.** "Lista e goală. Scrie primul vis în caseta de mai
   sus." Labels describe the reader's action, not the author's purpose.
6. **Steps are startable now.** What, with what, where, how long, plus one example.

## Module template

```
---
id: NN            (two digits, as a string in code)
order: N
title: ...
subtitle: ...
letter: C         (COPIL letters this module covers; names are added by the app)
takeaway: one sentence
sources: [provenance for the author, never shown to the learner]
source_version: 1 (bump on every meaningful edit; translations track it)
duration: "1,5–2 ore cu Prietenul Visului"
---

## Învață {#learn}
Short reading. Define every term on first use. One idea per paragraph.

## Fă {#do}
1. Action + object + place + duration. De exemplu: ...
2. ...
### optional sub-section

## Cu Prietenul Visului {#friend}
One sentence that works for all configurations, then:
### Un Visător și Prietenul lui {#solo}
### Pereche de egali {#pair}
### Prieten al Visului și grup {#group}

## Până data viitoare {#next}
One practice, at most two. The app turns it into an if-then plan.

## De reținut {#takeaway}
The takeaway sentence, repeated.
```

## Exercise step shape

`<verb> <object> <where> <how long>. De exemplu: <concrete instance>.`

Good: "Scrie în Cartea Visurilor, în 10 minute, cinci visuri din zona „aventură”. De
exemplu: o noapte sub cerul liber, un drum cu trenul până la mare."

Bad: "Lucrează la listă." (no object detail, no place, no time, no example)

## Interface strings

- Key naming: `screen.element[.part]`; every input key has a sibling `.placeholder`.
- A string with a pronoun must have its noun on the same screen.
- Both locale files have exactly the same keys; the build fails otherwise.
- Romanian with diacritics (ă â î ș ț), informal "tu", no corporate words.

## Before handing content over

1. `npm run check:content` passes.
2. A stranger-read review (persona above, six checks) has run on every new or changed
   file and its findings are fixed.
3. The screen was looked at on a phone width.
