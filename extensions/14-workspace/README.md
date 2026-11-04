<img src="icons/128.png" width="64" alt="">

# Workspace

**Capture de tâches, chronomètre par client avec feuille de temps, prompts à variables.** · version 1.0.0 · catégorie : Création & productivité

## Fonctionnalités

- Capture de la page ou d'une sélection en tâche (⌥⇧W), avec client et échéance
- Envoi facultatif vers une base de tâches en ligne, avec ton propre jeton d'intégration
- Chronomètre par client (⌥⇧T), arrêt automatique en cas d'inactivité
- Feuille de temps avec tarifs et export CSV
- Bibliothèque de prompts avec {variables}

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/14-workspace`).

Hôte local requis : Non.

## Utilisation

⌥⇧W pour capturer une tâche, ⌥⇧T pour lancer le chrono. Les clients fournis (Client Démo A, B) sont fictifs.

Raccourcis : ⌥⇧W : ouvrir l'extension · ⌥⇧T : Démarrer / arrêter le chronomètre

## Permissions

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

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
