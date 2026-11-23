# Journal des versions

## 2.0.0 — 23 novembre 2026

### Pour toutes les extensions de téléchargement
- Choix du format de sortie : vidéo MP4, WEBM, MKV, MOV, AVI, GIF animé ; audio MP3, M4A, AAC, OPUS, FLAC, WAV.
- Extraits : téléchargement d'un seul passage (début / fin), nommé « (extrait 0m20s-0m23s) ».
- Bouton ↻ pour relancer une tâche en erreur ou annulée ; messages d'erreur clairs en français.
- Hôte local 2.0 : chaque tâche écrit dans son propre dossier de travail, puis le résultat est rangé sans jamais écraser un fichier existant (« nom (2) »). Corrige un cas où une conversion (GIF, MOV…) pouvait supprimer un MP4 du même nom.
- Option « Comptes connectés » (désactivée par défaut) pour les contenus réservés aux abonnés.
- Carte « Nouveau dans la 2.0 » affichée une fois dans chaque fenêtre.

### Par extension
- **01-video-grab** : choix du format : MP4, WEBM, MKV, MOV, AVI, GIF animé ou audio seul (MP3, M4A, AAC, OPUS, FLAC, WAV) ; taille estimée pour chaque qualité, jusqu'à la 4K ; codec compatible (H.264) ou meilleure qualité (AV1/VP9) ; extrait : seulement un passage, début et fin (⏱ reprend la position de lecture) ; sous-titres intégrés à la vidéo ; clic droit › « Télécharger en… » pour choisir le format sans ouvrir la fenêtre.
- **02-music-grab** : nouveau format AAC, en plus de MP3, M4A, OPUS, FLAC et WAV ; débit au choix : meilleur, 320, 192 ou 128 kb/s ; extrait : seulement un passage ; pochette intégrée aussi en FLAC et OPUS.
- **03-playlist-grab** : tous les formats vidéo et audio pour toute la playlist ; éléments à cocher directement dans la liste ; qualités 4K et 360p, débit audio réglable.
- **04-media-sniffer** : filtre par type : vidéo, audio ou flux ; flux HLS/DASH reconstitués en MP4, MKV, WEBM, MOV, MP3 ou M4A ; « Tout télécharger » et « Copier les liens ».
- **05-pdf-studio** : pDF, ou image PNG / JPG / WEBP de la page entière ; papier A4, A3, A5, Lettre ou Légal, échelle et pages à imprimer ; en-tête (titre, date) et numéros de page en option.
- **06-image-grab** : filtre par type d'image (JPG, PNG, WEBP, GIF, SVG, AVIF…) ; conversion à l'enregistrement en PNG, JPG ou WEBP, qualité réglable ; copie des liens cochés.
- **07-subtitles-grab** : sous-titres en SRT, VTT, ASS, LRC ou TXT (transcription sans horodatage) ; miniature HD en JPG, PNG ou WEBP.
- **08-link-bulk** : export de la liste en TXT, CSV ou Markdown ; copie des liens cochés et sous-dossier de rangement au choix ; catégories Design et Code.
- **09-tab-recorder** : format MP4 (H.264) ou WEBM (VP9) ; définition jusqu'à la 4K et 60 images/s ; pause et reprise pendant l'enregistrement.
- **10-video-widget** : menu ▾ au survol des vidéos avec tous les formats vidéo et audio ; format par défaut des boutons ⬇ et ♪ réglable ; comptes connectés (désactivé par défaut) : contenus réservés aux abonnés via ta session d'un navigateur de ce Mac.
- **11-design-kit** : copie des couleurs en HEX, RGB, HSL, OKLCH ou CMJN ; exports de charte SCSS et Tailwind.
- **12-research** : export du carnet en Markdown, HTML, TXT, CSV ou JSON.
- **13-social** : recadrages exportés en JPG, PNG ou WEBP (fond blanc automatique en JPG).
- **14-workspace** : feuille de temps en CSV (Excel), Markdown, page imprimable HTML ou JSON, avec le total des heures.
- **15-image-hd** : enregistrement au format d'origine, PNG, JPG ou WEBP.
- **16-retouche** : qualité JPG / WEBP et taille d'export (origine, 4K, 2048 ou 1080 px).

## 1.0.0 — 4 novembre 2026

- Première publication des 16 extensions.
