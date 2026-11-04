# Politique de sécurité

## Versions suivies

Seule la dernière release publiée reçoit des correctifs de sécurité.

## Signaler une faille

Ne publie pas la faille dans une issue publique.

1. Ouvre un [signalement privé](https://github.com/kevinmwambadrc/aruzen-web-media/security/advisories/new) (onglet **Security › Report a vulnerability**).
2. Indique l'extension et sa version, le navigateur, les étapes pour reproduire et l'impact (fuite de données, exécution de code, contournement de permission…).
3. Si possible, joins une preuve de concept minimale.

Tu reçois un accusé de réception sous 7 jours. Le correctif est publié dans une nouvelle release, avec une note de sécurité et, si tu le souhaites, une mention de ton nom.

## Ce qui entre dans le périmètre

- Les 16 extensions du dossier `extensions/`, l'hôte local `host/media_helper.py`, `install.sh` et le widget `widget/`.
- Par exemple : injection de script, accès à des données hors de l'onglet choisi, appel réseau non documenté, exécution de commande via l'hôte local.

## Hors périmètre

- Les failles de yt-dlp, ffmpeg ou du navigateur lui-même (signale-les à leurs projets).
- Les sites tiers sur lesquels les extensions sont utilisées.
