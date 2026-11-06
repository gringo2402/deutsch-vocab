# Sources

Every file downloaded for the vocab site. Each source sits in its own folder under `_data/sources/`.
Downloaded on 6 November 2026. Sizes in bytes.

| Folder / file | URL | Size | Licence | Used for |
|---|---|---|---|---|
| `derewo-320000g/derewo-v-ww-bll-320000g-2012-12-31-1.0.zip` | https://www.ids-mannheim.de/fileadmin/kl/derewo/derewo-v-ww-bll-320000g-2012-12-31-1.0.zip | 2,235,255 | CC BY-NC 3.0 (stated in the file header), © IDS Mannheim | **Frequency rank** of list A (lemma list, rank = data line number) |
| ↳ extracted `derewo-v-ww-bll-320000g-2012-12-31-1.0.txt` (Latin-1) | (from the zip) | 5,475,916 | same | read by `_build/common.py` and the checker |
| ↳ extracted `derewo-v-ww-bll-320000g-2012-12-31-1.0.pdf`, `derewo-general-remarks-2013.pdf` | (from the zip) | 73,869 / 85,870 | same | documentation only |
| `dereko-2014-stt-100000/DeReKo-2014-II-MainArchive-STT.100000.freq.zip` | https://www.ids-mannheim.de/fileadmin/kl/derewo/DeReKo-2014-II-MainArchive-STT.100000.freq.zip | 1,304,398 | CC BY-NC 3.0 (readme) | Not used by list A. Word form + lemma + part-of-speech tag + frequency (TreeTagger STTS tags). Useful for list B (rank verbs: tags VV*, VA*, VM*). |
| ↳ extracted `.freq` and `.readme` | (from the zip) | 3,367,035 / 1,538 | same | — |
| `leipzig-mixed-typical-2011-300K/deu_mixed-typical_2011_300K.tar.gz` | https://downloads.wortschatz-leipzig.de/corpora/deu_mixed-typical_2011_300K.tar.gz | 30,077,028 | Leipzig Corpora Collection, CC BY 4.0 per its terms of use (the licence text was not on the fetched download page; check before republishing) | **Cross-check rank** (`rank_leipzig`) |
| ↳ extracted `deu_mixed-typical_2011_300K-words.txt` only | (from the tar.gz) | 4,866,703 | same | word-form frequencies |
| `goethe-a1/A1_SD1_Wortliste_02.pdf` | https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf | 712,341 | © Goethe-Institut, public PDF; used only to tag levels, no sentences copied | **CEFR tag A1** |
| `goethe-a2/Goethe-Zertifikat_A2_Wortliste.pdf` | https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_A2_Wortliste.pdf | 1,252,100 | © Goethe-Institut, as above | **CEFR tag A2** |
| `goethe-b1/Goethe-Zertifikat_B1_Wortliste.pdf` | https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf | 475,500 | © Goethe-Institut, as above | **CEFR tag B1** |
| `german-nouns/nouns.csv` | https://raw.githubusercontent.com/gambolputty/german-nouns/main/german_nouns/nouns.csv | 20,194,356 | CC BY-SA 4.0 (repo licence; data from Wiktionary) | **Gender and plural** of every noun; the checker compares against it |

## Derived files (made by scripts, not downloaded)

| File | Made by | Content |
|---|---|---|
| `_data/derived/goethe_levels.json` | `_build/extract_goethe.py` (via `_build/pdftext.py`) | headword → lowest Goethe level (A1/A2/B1), Swiss spelling |
| `_data/derived/a_selection.json` | `_build/build_list_a.py` | which DeReWo lines list A kept, excluded (with reason) or merged |
| `_build/tmp/goethe-*.tsv` | `_build/pdftext.py` | raw text runs extracted from the Goethe PDFs (working files) |

## Attribution line for the pages

Frequency: IDS Mannheim DeReWo (CC BY-NC 3.0) and Leipzig Corpora Collection. Levels: Goethe-Institut word lists. Gender and plural: german-nouns (Wiktionary, CC BY-SA 4.0). Translations, notes and example sentences are original.

## List C (business & tech) sources

Added 6 November 2026 by the list-C build. Sizes in bytes.

| Folder / file | URL | Size | Licence | Used for |
|---|---|---|---|---|
| `wikipedia-domain-c/articles/<pageid>.txt` (380 files) | https://de.wikipedia.org/w/api.php (MediaWiki API: `generator=categorymembers` + `prop=revisions` wikitext, reduced to plain text by `_build/c_fetch_wikipedia.py`; the first 24 pages via `prop=extracts`) | 3,497,495 total (3,413,098 characters, 417,585 tokens) | CC BY-SA 4.0, German Wikipedia contributors | **Domain corpus** for list C: domain counts and keyness. 200 articles from business categories (Betriebswirtschaftslehre, Management, Projektmanagement, Marketing, Finanzwesen, Rechnungswesen, Personalwesen, Vertragsrecht, Controlling, Arbeitsrecht) and 180 from IT categories (Informatik, Softwaretechnik, Informationstechnik, Datenbank, Cloud Computing, IT-Sicherheit, Datenschutz, Künstliche Intelligenz, Programmierung), 20 per category. Unternehmensführung, Vertrieb, Softwareentwicklung and Rechnernetz returned no usable pages. |
| `wikipedia-domain-c/manifest.json` | (written by the fetch script) | 121,273 | same | title, page id, revision id, category, URL, characters, format, fetch date for every article |

Fetching: one request at a time, 6.5 s apart (Wikimedia allows about 10 requests a minute for clients without contact details), User-Agent `DeutschKursVocabBuilder/1.0 (personal offline German vocabulary study list; python-urllib)`, `maxlag=5`, Retry-After honoured. Page text is used only for counting; no sentences are copied into the list.

Already-downloaded sources reused by list C: DeReWo (general lemma frequency → `general_pm`, `rank`), DeReKo STT (calibrates DeReWo frequency classes to per-million values), Leipzig 300K (`rank_leipzig`; the sentences file inside the existing tar.gz gives the general frequency of the 27 set phrases), german-nouns (gender, plural, inflected forms for counting), Goethe levels.

| Derived file | Made by | Content |
|---|---|---|
| `data/c.json` → `data/c.js` | `_build/c_build_list.py` (stats via `_build/c_corpus.py`) | list C, 300 entries, with `domain_count`, `domain_pm`, `general_pm`, `general_source`, `keyness` per entry |
| `_build/c_rejected.txt` | hand selection | 152 written candidates not selected (A = in list A, K = lower keyness / workplace value) |

Attribution line for list C: Domain corpus: German Wikipedia (CC BY-SA 4.0). General frequency: IDS Mannheim DeReWo and DeReKo (CC BY-NC 3.0); phrases: Leipzig Corpora Collection. Levels: Goethe-Institut word lists. Gender and plural: german-nouns (Wiktionary, CC BY-SA 4.0). Translations, notes, verb partners and example sentences are original.

## List B (verbs) sources

Added 6 November 2026 by the list-B build. Sizes in bytes. Fetch scripts live in `_build/` (`b_http.py`: one request at a time, 1–5 s apart, Retry-After honoured, User-Agent `DeutschKursVocabBuilder/1.0 (personal offline German study list; one request at a time)`, no email). Downloaded files are data only; nothing downloaded is executed.

| Folder / file | URL | Size | Licence | Used for |
|---|---|---|---|---|
| `wikipedia-domain-b/articles/<pageid>.txt` (440 files) | https://de.wikipedia.org/w/api.php (MediaWiki API: `list=categorymembers`, then `prop=revisions` wikitext 50 pages per request, reduced to plain text by `_build/b_fetch_wikipedia.py`; the first 21 pages via `prop=extracts`) | 3,798,721 with manifest (3,633,751 characters, 455,550 tokens) | CC BY-SA 4.0, German Wikipedia contributors | **Domain corpus** for the Business & tech 300: verb-form counts and keyness. Up to 30 articles each from Betriebswirtschaftslehre, Management, Projektmanagement, Marketing, Finanzwesen, Controlling, Rechnungswesen, Personalwesen, Qualitätsmanagement, Geschäftsprozessmanagement, Informatik, Softwaretechnik, Agile Softwareentwicklung, Informationstechnik, Datenbank, Cloud Computing, IT-Sicherheit, Künstliche Intelligenz, Programmierung, Datenschutz, Rechnernetze (direct members first, then subcategories; articles under 2,000 characters skipped). Unternehmensführung and Softwareentwicklung returned no new usable pages. |
| `wikipedia-domain-b/manifest.json` | (written by the fetch script) | (in the total above) | same | title, page id, revision id, category, characters, method, URL per article |
| `kaikki-b/<verb>.jsonl` (1,056 pages) + `index.json` | https://kaikki.org/dictionary/German/meaning/<a>/<ab>/<verb>.jsonl (English Wiktionary extract by kaikki.org / wiktextract) | 21,585,314 total | CC BY-SA 4.0 and GFDL (Wiktionary) | **Principal parts, auxiliaries and all six-tense tables** for 492 of the 500 verbs; single-token forms for corpus counting; `_data/derived/b_reference.json`. 36 candidates had no page (listed in `index.json` with status 404). |
| `dewiktionary-b/<verb>.wikitext` (20 pages) + `index.json` | https://de.wiktionary.org/w/api.php (`prop=revisions`, one batch request) | 62,365 total | CC BY-SA 4.0 (Wiktionary) | **Principal parts** (`{{Deutsch Verb Übersicht}}`) for 7 selected verbs missing on kaikki.org: aggregieren, visualisieren, gewichten, authentifizieren, bilanzieren, selektieren, herausarbeiten. Their tables are generated by the weak pattern (`forms_source: "generated"`). |

Already-downloaded sources reused by list B: DeReWo (core-200 ranking order, `rank`, `freq_class`), DeReKo-2014 STT (verb share of each lemma via the VV*/VA*/VM* tags, `stt_verb_freq`), Leipzig 300K words file (reference corpus for keyness, `rank_leipzig`), Goethe levels.

| Derived file | Made by | Content |
|---|---|---|
| `_build/b_work/core200.json` | `_build/b_rank_core.py` | the 200 most frequent verbs: DeReWo rank, verb rank, STT verb frequency |
| `_build/b_work/candidates.txt`, `candidates_extra.txt` | `_build/b_keyness.py shortlist` + hand-added verbs (participle lemmas and common workplace verbs) | 892 candidate verbs for the domain ranking |
| `_build/b_work/keyness.json` | `_build/b_keyness.py final` | per candidate: domain count, articles, reference count, per-million rates, keyness (simple maths, N = 10), log-likelihood |
| `_build/b_work/business300.json`, `business_selection.json` | `_build/b_select_business.py` with `_build/b_rules.json` | the 300 selected, exclusions with reasons, forced inclusions with reasons |
| `_data/derived/b_reference.json` | `_build/build_list_b.py` | Präteritum (er) and Partizip II per verb from all Wiktionary verb entries (Swiss spelling applied), the judge's cross-check |
| `data/b.json` → `data/b.js` | `_build/build_list_b.py` from `_build/content_b/*.txt` | list B, 500 entries |

Attribution line for list B: Core 200: IDS Mannheim DeReWo and DeReKo-2014 STT (CC BY-NC 3.0). Business & tech 300: German Wikipedia domain corpus (CC BY-SA 4.0) against the Leipzig Corpora Collection. Verb forms: Wiktionary via kaikki.org and de.wiktionary (CC BY-SA). Levels: Goethe-Institut word lists. Translations, notes and example sentences are original.
