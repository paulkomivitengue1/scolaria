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
inconnues, fichiers illisibles, reprise après recréation de l'écran Android,
conservation d'un aperçu valide quand un nouveau fichier échoue, affichage de
l'erreur dans le panneau, défilement automatique sur téléphone, garde-fou
anti-boucle de reprise, journal de diagnostic, et double appui sur « Confirmer ».

### Comportement en cas de problème

- Les erreurs s'affichent **dans** le panneau d'aperçu (rouge), et l'écran défile
  automatiquement vers le résultat sur téléphone.
- Un aperçu déjà validé n'est **jamais** effacé par l'échec d'un nouveau fichier.
- Le fichier choisi est mémorisé **avant** sa lecture (IndexedDB) : si Android
  recrée la page pendant l'analyse, l'import reprend automatiquement (2 essais
  maximum, puis un bouton « Relancer l'analyse »).
- Un bloc **Diagnostic** (repliable) enregistre les étapes techniques, le nom du
  fichier et le message d'erreur — jamais de donnée d'élève — et se copie en un
  appui pour le support.
