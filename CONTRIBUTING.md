# Contribuer

Merci de ton aide ! Quelques règles simples :

1. **Fork** le dépôt et crée une branche (`fix/media-sniffer-dash`, `feat/research-export`…).
2. Le code commun se modifie dans `extensions/_shared/`, puis `python3 tools/build.py` le recopie dans chaque extension.
3. Garde le code **lisible** : pas de minification, pas d'obfuscation, pas de script ni de ressource chargés depuis Internet.
4. **Permissions minimales** : toute nouvelle permission doit être justifiée dans la pull request et dans le README de l'extension.
5. **Aucune donnée personnelle ni marque réelle** dans les valeurs par défaut : utilise des exemples fictifs.
6. **Aucun secret** : jamais de clé, jeton ou mot de passe dans le code. Le secret scanning de GitHub bloque les pushs qui en contiennent.
7. Ouvre une **pull request** vers `main` en décrivant le changement et comment le tester. Les vérifications automatiques doivent passer.

En contribuant, tu acceptes que ta contribution soit distribuée sous la licence du projet ([PolyForm Noncommercial 1.0.0](LICENSE.md)).
