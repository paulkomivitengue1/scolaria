# gestilys

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-hbdyamk1)

## Import des élèves (Excel / CSV)

L'espace **Direction → Import élèves** lit les fichiers `.xlsx`, `.xls`, `.xlsm` et `.csv`.

- Colonnes attendues : `Prénom`, `Nom`, `Classe` (les variantes `PRÉNOMS`, `NOM(S)`,
  `Classe fréquentée`, `Téléphone parent`, `Date naissance`… sont reconnues, y compris
  sous une ligne de titre).
- Les dates de naissance peuvent être de vraies cellules date Excel, `JJ/MM/AAAA`,
  `AAAA-MM-JJ` ou `AAAAMMJJ`.
- Les CSV exportés par Excel en Windows-1252 (accents) sont décodés correctement.
- L'aperçu signale chaque ligne : à importer, doublon du fichier, élève déjà inscrit,
  classe inconnue. Seules les lignes valides sont envoyées, et un seul import peut
  tourner à la fois (pas de doublon en cas de double appui).
- Si Android recrée la page en revenant du sélecteur de fichiers, l'aperçu est
  restauré depuis IndexedDB (`src/lib/importSession.ts`).

### Tests

```bash
npm test          # analyse + parcours d'import complets (jsdom + fake-indexeddb)
npm run typecheck
npm run build
```

Les tests couvrent : fichiers Excel propres, vraies cellules date, `.xls`, CSV
Windows-1252/UTF-8, fichier mal nommé, en-têtes variantes, doublons, classes
inconnues, fichiers illisibles, reprise après recréation de l'écran Android, et
double appui sur « Confirmer ».
