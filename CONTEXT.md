# Formatted Translator

Open-source web app for translating Literary Universe's intl strings, with GitHub
(`intl-web`) as the single source of truth. Replaces Weblate.

## Language

**Source Locale**:
The `en` locale — developer-edited only, never a translation target.
_Avoid_: default locale, base language

**Source String**:
The en value of a Message Key; what translators translate from.
_Avoid_: original, master string

**Message Key**:
The dot-namespaced identifier of one string (e.g. `workshop.publish.confirm`), stable across locales.
_Avoid_: string id, label

**Module**:
One JSON file per locale (`<locale>/<module>.json`) holding a flat Message Key → string map. The unit of browsing and of Context Pages.
_Avoid_: namespace (reserved for Isolated Namespace), file, component

**Isolated Namespace**:
One of the 8 Modules excluded from the Index Bundle and lazy-loaded by the LU app. Indistinguishable from other Modules inside the translator.

**Index Bundle**:
The generated `<locale>/index.json`, produced by intl-web CI. Never read or written by the translator.
_Avoid_: index, bundle (alone)

**Translator**:
An authenticated GitHub user editing translations. Becomes the git author of their Saves.
_Avoid_: user, contributor

**Roster**:
The optional `translators.json` in intl-web mapping GitHub logins to permitted locales (`"*"` = all). Absent Roster = anyone authenticated may translate.
_Avoid_: allowlist, whitelist, permissions

**Draft**:
An edit stored only in the Translator's browser (localStorage), not yet saved.
_Avoid_: pending change, local edit

**Save**:
The explicit act that turns all of a Translator's Drafts into one direct commit on `master`, author = Translator, committer = the App.
_Avoid_: submit, publish, push

**Untranslated**:
A Message Key whose value in a locale is missing or empty relative to the Source Locale. The only completeness state the tool tracks (there is deliberately no "outdated").
_Avoid_: missing, incomplete, outdated

**Context Page**:
The GitHub Wiki page for a Module, whose `## <Message Key>` sections hold translator-facing notes and images. Displayed in the tool, edited on GitHub.
_Avoid_: notes page, documentation
