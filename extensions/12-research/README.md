<img src="icons/128.png" width="64" alt="">

# Research

**Surligneur et carnet de citations, sessions d'onglets, libération de mémoire et veille de pages.** · version 1.0.0 · catégorie : Création & productivité

## Fonctionnalités

- Surlignage en 4 couleurs avec notes, restauré à chaque visite (⌥⇧H)
- Carnet par projet dans le panneau latéral, avec recherche et export Markdown
- Sessions d'onglets enregistrées et rouvertes à la demande
- Mise en veille des onglets inactifs (15 min à 2 h)
- Veille d'une page avec notification des nouveaux passages

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/12-research`).

Hôte local requis : Non.

## Utilisation

Sélectionne un texte pour le surligner, puis ouvre « Carnet ↗ ». Les sessions, la mémoire et la veille sont dans la fenêtre de l'extension.

Raccourcis : ⌥⇧H : Surligner la sélection · ⌥⇧K : ouvrir l'extension

## Permissions

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

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
