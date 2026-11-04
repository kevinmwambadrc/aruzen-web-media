# Aruzen Web Media

**16 extensions Chrome et Edge, légères et locales, pour télécharger, capturer, créer et s'organiser.**

![Les 16 icônes](docs/icons.png)

Aruzen Web Media réunit des outils du quotidien pour les créatifs, chercheurs et community managers : récupérer une vidéo ou une image en HD, archiver une page en PDF, extraire la charte d'un site, préparer une publication, chronométrer un projet. Chaque extension fait une chose, ne charge rien tant que tu ne l'ouvres pas, et garde tes données sur ta machine.

- **Local d'abord** : aucun compte, aucun serveur, aucune télémétrie.
- **Léger** : 2 téléchargements simultanés au maximum, priorité basse, encodage matériel.
- **Vérifiable** : code lisible, sans obfuscation ni script distant, releases signées par empreinte SHA-256.

## Sommaire

- [Les extensions](#les-extensions)
- [Installation](#installation)
- [Hôte local](#hôte-local-téléchargements-vidéo-et-audio)
- [Détail par extension](#détail-par-extension)
- [Confidentialité](#confidentialité)
- [Vérifier une release](#vérifier-une-release)
- [Contribuer et signaler un bug](#contribuer-et-signaler-un-bug)
- [Licence](#licence)
- [Contact](#contact)

## Les extensions

| | Extension | En une phrase | Catégorie | Permissions |
|---|---|---|---|---|
| <img src="extensions/01-video-grab/icons/32.png" width="24" alt=""> | [Vidéo Grab](extensions/01-video-grab/) | Télécharge la vidéo de la page en MP4, qualité au choix. | Vidéo & audio | `nativeMessaging`, `contextMenus`, `storage`, `activeTab` |
| <img src="extensions/02-music-grab/icons/32.png" width="24" alt=""> | [Music Grab](extensions/02-music-grab/) | Extrait l'audio d'une page en MP3, M4A, Opus, FLAC ou WAV, avec pochette et tags. | Vidéo & audio | `nativeMessaging`, `contextMenus`, `storage`, `activeTab` |
| <img src="extensions/03-playlist-grab/icons/32.png" width="24" alt=""> | [Playlist Grab](extensions/03-playlist-grab/) | Télécharge une playlist, un album ou une chaîne entière, avec choix des éléments. | Vidéo & audio | `nativeMessaging`, `storage`, `activeTab` |
| <img src="extensions/04-media-sniffer/icons/32.png" width="24" alt=""> | [Media Sniffer](extensions/04-media-sniffer/) | Repère les fichiers vidéo et audio réellement chargés par la page (MP4, MP3, HLS, DASH). | Vidéo & audio | `nativeMessaging`, `webRequest`, `storage`, `downloads`, `<all_urls>` |
| <img src="extensions/05-pdf-studio/icons/32.png" width="24" alt=""> | [PDF Studio](extensions/05-pdf-studio/) | Enregistre une page en PDF A4 propre et récupère tous les PDF liés. | Images & documents | `debugger`, `downloads`, `scripting`, `activeTab`, `storage`, `offscreen` |
| <img src="extensions/06-image-grab/icons/32.png" width="24" alt=""> | [Image Grab](extensions/06-image-grab/) | Affiche toutes les images d'une page et télécharge la sélection en un clic. | Images & documents | `downloads`, `scripting`, `activeTab`, `storage` |
| <img src="extensions/07-subtitles-grab/icons/32.png" width="24" alt=""> | [Sous-titres & Miniatures](extensions/07-subtitles-grab/) | Télécharge les sous-titres d'une vidéo en SRT, et sa miniature HD. | Vidéo & audio | `nativeMessaging`, `activeTab`, `storage` |
| <img src="extensions/08-link-bulk/icons/32.png" width="24" alt=""> | [Liens en masse](extensions/08-link-bulk/) | Liste tous les fichiers liés d'une page et télécharge la sélection. | Images & documents | `downloads`, `scripting`, `activeTab`, `storage` |
| <img src="extensions/09-tab-recorder/icons/32.png" width="24" alt=""> | [Enregistreur d'onglet](extensions/09-tab-recorder/) | Enregistre l'image et le son d'un onglet en MP4. | Vidéo & audio | `tabCapture`, `offscreen`, `downloads`, `storage`, `activeTab` |
| <img src="extensions/10-video-widget/icons/32.png" width="24" alt=""> | [Widget vidéo](extensions/10-video-widget/) | Ajoute des boutons « Vidéo » et « MP3 » au survol de chaque vidéo. | Vidéo & audio | `nativeMessaging`, `storage`, `content_scripts` |
| <img src="extensions/11-design-kit/icons/32.png" width="24" alt=""> | [Design Kit](extensions/11-design-kit/) | Charte d'un site (couleurs, polices, export .ase), SVG, moodboard, règle et captures responsive. | Création & productivité | `scripting`, `downloads`, `storage`, `unlimitedStorage`, `contextMenus`, `debugger`, `offscreen`, `<all_urls>` |
| <img src="extensions/12-research/icons/32.png" width="24" alt=""> | [Research](extensions/12-research/) | Surligneur et carnet de citations, sessions d'onglets, libération de mémoire et veille de pages. | Création & productivité | `storage`, `unlimitedStorage`, `contextMenus`, `tabs`, `alarms`, `notifications`, `offscreen`, `sidePanel`, `downloads`, `<all_urls>`, `content_scripts` |
| <img src="extensions/13-social/icons/32.png" width="24" alt=""> | [Social](extensions/13-social/) | Studio d'aperçu de publications sur plusieurs réseaux, légendes et hashtags par marque, liens UTM. | Création & productivité | `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `sidePanel`, `downloads`, `<all_urls>` |
| <img src="extensions/14-workspace/icons/32.png" width="24" alt=""> | [Workspace](extensions/14-workspace/) | Capture de tâches, chronomètre par client avec feuille de temps, prompts à variables. | Création & productivité | `storage`, `unlimitedStorage`, `contextMenus`, `activeTab`, `scripting`, `alarms`, `idle`, `notifications`, `downloads`, `https://api.notion.com/*` |
| <img src="extensions/15-image-hd/icons/32.png" width="24" alt=""> | [Image HD](extensions/15-image-hd/) | Retrouve l'original haute définition des images, même quand le site n'affiche qu'une miniature. | Images & documents | `downloads`, `scripting`, `contextMenus`, `storage`, `<all_urls>` |
| <img src="extensions/16-retouche/icons/32.png" width="24" alt=""> | [Retouche](extensions/16-retouche/) | Gomme intelligente : peins une zone et l'image se reconstitue d'après son contenu, en local. | Images & documents | `downloads`, `contextMenus`, `storage`, `<all_urls>` |

Chaque permission est justifiée dans la section de l'extension ci-dessous et dans son propre README.

## Installation

1. Télécharge le ZIP de l'extension dans les [Releases](https://github.com/kevinmwambadrc/aruzen-web-media/releases) (et vérifie son empreinte, voir plus bas), puis décompresse-le. Ou clone le dépôt :

   ```bash
   git clone https://github.com/kevinmwambadrc/aruzen-web-media.git
   ```

2. Ouvre `chrome://extensions` (ou `edge://extensions` dans Edge).
3. Active le **Mode développeur** en haut à droite.
4. Clique sur **Charger l'extension non empaquetée** et choisis un dossier de `extensions/` (ou le dossier décompressé). Recommence pour chaque extension voulue.
5. Épingle les icônes utiles avec la pièce de puzzle 🧩.

Les extensions marquées `nativeMessaging` ont aussi besoin de l'hôte local.

## Hôte local (téléchargements vidéo et audio)

Les extensions Vidéo Grab, Music Grab, Playlist Grab, Media Sniffer, Sous-titres et Widget vidéo confient le travail lourd à un petit programme Python lancé sur ta machine (`host/media_helper.py`), qui utilise [yt-dlp](https://github.com/yt-dlp/yt-dlp) et ffmpeg. Le navigateur ne lui parle que par Native Messaging, et seules les extensions de ce dépôt (identifiants fixes, listés dans `host/extension_ids.json`) y ont accès.

Pour l'instant, l'installation est prévue pour macOS :

```bash
brew install yt-dlp ffmpeg
```

```bash
./install.sh
```

Le script copie l'hôte dans `~/Library/Application Support/AruzenWebMedia`, l'enregistre pour Chrome et Edge, et installe le widget de barre de menus s'il a été compilé (`widget/build.sh`). Si une plateforme renvoie « 403 », mets yt-dlp à jour avec `brew upgrade yt-dlp`.

## Détail par extension

### Vidéo & audio

#### <img src="extensions/01-video-grab/icons/32.png" width="20" alt=""> Vidéo Grab

Télécharge la vidéo de la page en MP4, qualité au choix.

- Choix de la qualité (meilleure, 1080p, 720p…) et du format (MP4, MKV)
- Clic droit sur la page ou sur un lien
- Raccourci ⌥⇧V
- Suivi des téléchargements dans la fenêtre

**Utilisation** : Ouvre une page vidéo, clique sur l'icône, choisis la qualité, puis « Télécharger ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

</details>

Installation : dossier `extensions/01-video-grab`. [README de l'extension](extensions/01-video-grab/README.md)

#### <img src="extensions/02-music-grab/icons/32.png" width="20" alt=""> Music Grab

Extrait l'audio d'une page en MP3, M4A, Opus, FLAC ou WAV, avec pochette et tags.

- MP3 universel, M4A sans réencodage, Opus, FLAC ou WAV
- Pochette et métadonnées intégrées
- Clic droit et raccourci ⌥⇧M

**Utilisation** : Sur une page qui lit du son, clique sur l'icône, choisis le format, puis « Extraire ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

</details>

Installation : dossier `extensions/02-music-grab`. [README de l'extension](extensions/02-music-grab/README.md)

#### <img src="extensions/03-playlist-grab/icons/32.png" width="20" alt=""> Playlist Grab

Télécharge une playlist, un album ou une chaîne entière, avec choix des éléments.

- Analyse de la liste avant téléchargement
- Vidéo ou audio MP3, qualité au choix
- Sélection élément par élément
- File d'attente limitée à 2 téléchargements simultanés

**Utilisation** : Ouvre une playlist, clique sur « Analyser », coche les éléments voulus, puis lance le téléchargement.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

</details>

Installation : dossier `extensions/03-playlist-grab`. [README de l'extension](extensions/03-playlist-grab/README.md)

#### <img src="extensions/04-media-sniffer/icons/32.png" width="20" alt=""> Media Sniffer

Repère les fichiers vidéo et audio réellement chargés par la page (MP4, MP3, HLS, DASH).

- Détection en direct des flux lus par la page
- Téléchargement direct ou via yt-dlp pour les flux segmentés
- Badge avec le nombre de médias trouvés

**Utilisation** : Lance la lecture du média, ouvre l'extension : les flux détectés apparaissent dans « Flux en cours ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `webRequest` | Observe sans les modifier les requêtes de la page pour repérer les fichiers MP4, MP3, m3u8 et DASH. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `<all_urls>` | Nécessaire pour que `webRequest` voie les requêtes de médias sur le site que tu consultes. |

</details>

Installation : dossier `extensions/04-media-sniffer`. [README de l'extension](extensions/04-media-sniffer/README.md)

#### <img src="extensions/07-subtitles-grab/icons/32.png" width="20" alt=""> Sous-titres & Miniatures

Télécharge les sous-titres d'une vidéo en SRT, et sa miniature HD.

- Toutes les langues disponibles, y compris les sous-titres automatiques
- Conversion en SRT
- Miniature en haute définition

**Utilisation** : Sur une page vidéo, choisis la langue puis « Télécharger les sous-titres (.srt) ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |

</details>

Installation : dossier `extensions/07-subtitles-grab`. [README de l'extension](extensions/07-subtitles-grab/README.md)

#### <img src="extensions/09-tab-recorder/icons/32.png" width="20" alt=""> Enregistreur d'onglet

Enregistre l'image et le son d'un onglet en MP4.

- Trois niveaux de qualité
- Encodage matériel H.264, peu gourmand
- Idéal pour un live, un cours ou une réunion web

**Utilisation** : Sur l'onglet à capturer, clique sur « Démarrer l'enregistrement », puis à nouveau pour arrêter.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `tabCapture` | Capture l'image et le son de l'onglet que tu choisis d'enregistrer. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

</details>

Installation : dossier `extensions/09-tab-recorder`. [README de l'extension](extensions/09-tab-recorder/README.md)

#### <img src="extensions/10-video-widget/icons/32.png" width="20" alt=""> Widget vidéo

Ajoute des boutons « Vidéo » et « MP3 » au survol de chaque vidéo.

- Boutons au survol, y compris dans les lecteurs intégrés
- Liste de tous les téléchargements
- Réglages de performance (téléchargements simultanés, qualité)

**Utilisation** : Survole une vidéo et clique sur « Vidéo » ou « MP3 ». La fenêtre de l'extension regroupe tous les téléchargements.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `content_scripts` | Un petit script vérifie la page toutes les 2,5 s, seulement quand l'onglet est visible, pour placer les boutons sur les vidéos. |

</details>

Installation : dossier `extensions/10-video-widget`. [README de l'extension](extensions/10-video-widget/README.md)

### Images & documents

#### <img src="extensions/05-pdf-studio/icons/32.png" width="20" alt=""> PDF Studio

Enregistre une page en PDF A4 propre et récupère tous les PDF liés.

- PDF A4 portrait ou paysage, sans publicités ni menus parasites
- Liste et téléchargement groupé des PDF liés à la page

**Utilisation** : Clique sur « Enregistrer la page en PDF », ou coche les PDF liés puis « Télécharger la sélection ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `debugger` | Utilise la commande d'impression PDF de Chrome (protocole DevTools `Page.printToPDF`) sur l'onglet actif. Chrome affiche un bandeau pendant l'opération. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |

</details>

Installation : dossier `extensions/05-pdf-studio`. [README de l'extension](extensions/05-pdf-studio/README.md)

#### <img src="extensions/06-image-grab/icons/32.png" width="20" alt=""> Image Grab

Affiche toutes les images d'une page et télécharge la sélection en un clic.

- Images, fonds CSS et versions haute résolution (srcset)
- Filtre par taille minimale
- Téléchargement groupé

**Utilisation** : Clique sur l'icône, filtre par taille, coche, puis « Télécharger la sélection ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |

</details>

Installation : dossier `extensions/06-image-grab`. [README de l'extension](extensions/06-image-grab/README.md)

#### <img src="extensions/08-link-bulk/icons/32.png" width="20" alt=""> Liens en masse

Liste tous les fichiers liés d'une page et télécharge la sélection.

- Documents, archives, audio, vidéo, applications…
- Filtres par type et par nom
- Téléchargement groupé avec file d'attente

**Utilisation** : Clique sur l'icône, filtre la liste, coche, puis « Télécharger ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |

</details>

Installation : dossier `extensions/08-link-bulk`. [README de l'extension](extensions/08-link-bulk/README.md)

#### <img src="extensions/15-image-hd/icons/32.png" width="20" alt=""> Image HD

Retrouve l'original haute définition des images, même quand le site n'affiche qu'une miniature.

- Analyse des srcset, attributs cachés, liens plein écran, fonds, métadonnées et code de la page
- Règles pour les plateformes d'images courantes et les paramètres de taille (w=, width=, resize=…)
- Chaque version HD est vérifiée par un vrai chargement, avec le gain affiché (« HD ×4.2 »)
- Clic droit › « Télécharger cette image en HD »

**Utilisation** : Clique sur l'icône : la page de résultats liste les images et leur meilleure version. Coche puis « Télécharger ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `<all_urls>` | Vérifie l'existence des versions HD sur les serveurs d'images du site consulté. |

</details>

Installation : dossier `extensions/15-image-hd`. [README de l'extension](extensions/15-image-hd/README.md)

#### <img src="extensions/16-retouche/icons/32.png" width="20" alt=""> Retouche

Gomme intelligente : peins une zone et l'image se reconstitue d'après son contenu, en local.

- Pinceau (B), rectangle (R), gomme du masque (E)
- Reconstruction PatchMatch calculée dans le navigateur, rien n'est envoyé en ligne
- Annulation ⌘Z, comparaison avec l'original (touche A)

**Utilisation** : Clic droit sur une image › « Retoucher cette image », ou glisse une image dans l'atelier. À utiliser sur tes propres images ou celles dont tu as les droits.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `<all_urls>` | Charge l'image choisie au clic droit depuis son serveur d'origine. |

</details>

Installation : dossier `extensions/16-retouche`. [README de l'extension](extensions/16-retouche/README.md)

### Création & productivité

#### <img src="extensions/11-design-kit/icons/32.png" width="20" alt=""> Design Kit

Charte d'un site (couleurs, polices, export .ase), SVG, moodboard, règle et captures responsive.

- Couleurs classées par rôle (fond, texte, accent), variables CSS et polices
- Export .ase, .svg, CSS ou JSON
- Récupération des icônes et logos SVG de la page
- Moodboard par client, exportable en PDF
- Règle ⌥⇧R, grille de colonnes, captures pleine page en 390, 820, 1440 et 1920 px

**Utilisation** : Ouvre l'extension sur un site : onglets Charte, SVG, Moodboard et Mesure. Clic droit sur une image › « Ajouter au moodboard ».

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `unlimitedStorage` | Le contenu enregistré (images, citations, bibliothèque) peut dépasser le quota de 10 Mo. Il reste sur ta machine. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `debugger` | Simule plusieurs largeurs d'écran (protocole DevTools) pour les captures responsives. Chrome affiche un bandeau pendant l'opération. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |
| `<all_urls>` | Récupère les images ajoutées au moodboard et les SVG externes du site analysé, et capture l'onglet. |

</details>

Installation : dossier `extensions/11-design-kit`. [README de l'extension](extensions/11-design-kit/README.md)

#### <img src="extensions/12-research/icons/32.png" width="20" alt=""> Research

Surligneur et carnet de citations, sessions d'onglets, libération de mémoire et veille de pages.

- Surlignage en 4 couleurs avec notes, restauré à chaque visite (⌥⇧H)
- Carnet par projet dans le panneau latéral, avec recherche et export Markdown
- Sessions d'onglets enregistrées et rouvertes à la demande
- Mise en veille des onglets inactifs (15 min à 2 h)
- Veille d'une page avec notification des nouveaux passages

**Utilisation** : Sélectionne un texte pour le surligner, puis ouvre « Carnet ↗ ». Les sessions, la mémoire et la veille sont dans la fenêtre de l'extension.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `unlimitedStorage` | Le contenu enregistré (images, citations, bibliothèque) peut dépasser le quota de 10 Mo. Il reste sur ta machine. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `tabs` | Lit le titre et l'adresse des onglets pour enregistrer une session et endormir les onglets inactifs. |
| `alarms` | Planifie des tâches périodiques légères. |
| `notifications` | Affiche une notification système. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |
| `sidePanel` | Ouvre son interface dans le panneau latéral. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `<all_urls>` | Le surligneur doit fonctionner sur toutes les pages, et la veille télécharge les pages que tu as choisi de surveiller. |
| `content_scripts` | Le script du surligneur ne fait rien tant que tu ne sélectionnes pas de texte. |

</details>

Installation : dossier `extensions/12-research`. [README de l'extension](extensions/12-research/README.md)

#### <img src="extensions/13-social/icons/32.png" width="20" alt=""> Social

Studio d'aperçu de publications sur plusieurs réseaux, légendes et hashtags par marque, liens UTM.

- Aperçu fidèle par réseau, avec alertes (limite de caractères, coupure « voir plus », hashtags)
- Recadrages exportés à la bonne taille pour chaque réseau
- Bibliothèque de légendes et de hashtags par marque, insertion par clic droit
- Générateur de liens UTM
- Réseaux, marques et devises entièrement modifiables dans ⚙ Réglages, export/import JSON

**Utilisation** : Ouvre « Studio d'aperçu ↗ », écris ta publication une fois et compare les rendus. Les marques fournies (Nova Telecom, Nova Home…) sont fictives : remplace-les dans ⚙ Réglages.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `unlimitedStorage` | Le contenu enregistré (images, citations, bibliothèque) peut dépasser le quota de 10 Mo. Il reste sur ta machine. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `sidePanel` | Ouvre son interface dans le panneau latéral. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `<all_urls>` | Lit l'aperçu (titre, image) des liens que tu colles et charge les images à recadrer. |

</details>

Installation : dossier `extensions/13-social`. [README de l'extension](extensions/13-social/README.md)

#### <img src="extensions/14-workspace/icons/32.png" width="20" alt=""> Workspace

Capture de tâches, chronomètre par client avec feuille de temps, prompts à variables.

- Capture de la page ou d'une sélection en tâche (⌥⇧W), avec client et échéance
- Envoi facultatif vers une base de tâches en ligne, avec ton propre jeton d'intégration
- Chronomètre par client (⌥⇧T), arrêt automatique en cas d'inactivité
- Feuille de temps avec tarifs et export CSV
- Bibliothèque de prompts avec {variables}

**Utilisation** : ⌥⇧W pour capturer une tâche, ⌥⇧T pour lancer le chrono. Les clients fournis (Client Démo A, B) sont fictifs.

<details><summary>Permissions et justification</summary>

| Permission | Pourquoi |
|---|---|
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `unlimitedStorage` | Le contenu enregistré (images, citations, bibliothèque) peut dépasser le quota de 10 Mo. Il reste sur ta machine. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `alarms` | Planifie des tâches périodiques légères. |
| `idle` | Détecte quand la machine est verrouillée ou inactive. |
| `notifications` | Affiche une notification système. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `https://api.notion.com/*` | Seul domaine contacté, et uniquement si tu colles toi-même un jeton d'intégration dans les Réglages. Le jeton reste dans le stockage local du navigateur. |

</details>

Installation : dossier `extensions/14-workspace`. [README de l'extension](extensions/14-workspace/README.md)

## Confidentialité

**Ce qui est lu**

- Le contenu de l'onglet actif, seulement quand tu utilises une extension (icône, clic droit ou raccourci) : adresse, images, liens, couleurs, texte sélectionné.
- Le Widget vidéo et le surligneur de Research ont un script présent sur les pages : le premier cherche les lecteurs vidéo, le second ne réagit qu'à une sélection de texte. Ils n'envoient rien.
- Research lit le titre et l'adresse de tes onglets quand tu enregistres une session ou endors des onglets.

**Où vont les données**

- Dans le stockage local du navigateur (`chrome.storage.local`, IndexedDB) et dans ton dossier Téléchargements › Web Media.
- Les seules connexions réseau sont celles que tu déclenches : télécharger un média depuis le site où il se trouve, vérifier une version HD sur le serveur d'images du site, relire une page que tu surveilles, lire l'aperçu d'un lien que tu colles.
- Workspace contacte `api.notion.com` uniquement si tu y connectes toi-même ta base de tâches avec ton jeton d'intégration.
- Design Kit peut ouvrir une page de recherche de polices dans un nouvel onglet quand tu cliques sur un nom de police.

**Ce qui n'est jamais collecté**

- Aucune statistique d'usage, aucun identifiant, aucune télémétrie, aucune publicité.
- Aucun serveur de l'auteur ni d'un tiers ne reçoit tes données. Il n'y a pas de compte à créer.
- Aucun script distant : tout le code exécuté est dans ce dépôt, lisible et non minifié.

Usage responsable : télécharge et retouche seulement les contenus dont tu as les droits, dans le respect des conditions des sites et du droit d'auteur.

## Vérifier une release

Chaque release contient un ZIP par extension et un fichier `SHA256SUMS.txt`. Les ZIP sont reproductibles : `python3 tools/package.py` recrée exactement les mêmes fichiers à partir du code du tag.

```bash
shasum -a 256 -c SHA256SUMS.txt
```

Sous Windows : `Get-FileHash .\01-video-grab-1.0.0.zip -Algorithm SHA256`.

## Contribuer et signaler un bug

- **Bug ou idée** : ouvre une [issue](https://github.com/kevinmwambadrc/aruzen-web-media/issues/new/choose) avec le modèle proposé (extension, navigateur, étapes, résultat attendu).
- **Contribution** : fork, branche, puis pull request vers `main`. La branche `main` est protégée : pas de push direct ni forcé. Voir [CONTRIBUTING.md](CONTRIBUTING.md).
- **Faille de sécurité** : ne l'ouvre pas en public, suis [SECURITY.md](SECURITY.md).

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE.md). Tu peux lire, vérifier, modifier et utiliser ce code à des fins personnelles ou non commerciales. Toute utilisation commerciale (revente, intégration à un produit payant, usage en entreprise à but lucratif) demande l'accord de l'auteur. © 2026 Aruzen Digital Group.

Les marques et clients présents dans les réglages par défaut (Nova Telecom, Nova Home, Boutique Démo, Client Démo…) sont fictifs.

## Contact

- Questions et demandes de licence commerciale : [Discussions](https://github.com/kevinmwambadrc/aruzen-web-media/discussions) ou issue avec l'étiquette `question`.
- Sécurité : [signalement privé](https://github.com/kevinmwambadrc/aruzen-web-media/security/advisories/new).
