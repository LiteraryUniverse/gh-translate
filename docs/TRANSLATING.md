# Translator guide

How to translate with Formatted Translator. No git knowledge needed — if you
can fill in a text box, you can translate.

## Signing in

Click **Sign in with GitHub** (a free github.com account is all you need — no
special permissions; the app never gets access to your repositories). Signed
out, you can browse everything read-only.

Every translation you save is recorded under your GitHub name in the project's
public history — that's how the project credits you.

## Finding work

**Locale list → module list → editor.** The module list shows a progress bar
and the number of untranslated strings per module. In the editor, the
**Untranslated** tab shows only strings that still need work, and the search box
matches both message keys and English source text.

Each string shows:

- the **key** (technical id — never translate this),
- the **English source** text,
- a text box with the current translation (empty = untranslated),
- badges: `untranslated`, or `draft` when you have unsaved edits.

## Placeholders and ICU messages

Text in curly braces is a **placeholder** — it gets replaced with a real value
and must survive translation *exactly as spelled*:

```
Hi {name}!            →  Ahoj {name}!        ✓ keep {name} as-is
```

Messages can branch on numbers (`plural`) or values (`select`):

```
{total, plural,
  one {is one post}
  other {are # posts}
}
```

Translate only the text **inside the branch braces**; keep the keywords
(`plural`, `select`, `one`, `other`, …) and the `#` (which becomes the number).
Your language may need more or fewer plural branches than English — that's fine
(e.g. Czech adds `few`, many languages need only `other`).

Use the **Preview** link under a string to try your translation with sample
values — change the number/selection and watch the output. The editor also
validates as you type: broken ICU syntax, a dropped placeholder, or an unknown
placeholder shows a red error, and such strings cannot be saved.

## Context

A **Context** link under a string shows notes from the maintainers — where the
text appears, screenshots, tone guidance. **Add context** / **Edit context**
lead to the project wiki (one page per module, one `## message.key` heading per
string) where anyone can improve the notes. The **Help** page in the header has
project-wide guidance.

## Drafts and saving

Edits are saved as **drafts in your browser** as you type — closing the tab
loses nothing (drafts live only on that device, though). The bar at the bottom
counts your drafts across the whole locale, even spanning several modules.

**Save** publishes all your drafts for the locale in one go — it becomes a
single commit in the project's GitHub repository, authored by you. There is no
separate review step; git history is the review trail. Clearing a text box and
saving marks the string untranslated again.

If saving is refused with "not on the roster", the project restricts who may
translate which locale — ask the maintainers to add your GitHub login to
`translators.json`.

## Ground rules

- The English column is the source of truth and can't be edited here.
- Don't translate keys, placeholders, or ICU keywords.
- Two people editing the *same string* at the same time: last save wins — rare
  in practice, coordinate via the project's community channels if you're
  sprinting on the same module.
