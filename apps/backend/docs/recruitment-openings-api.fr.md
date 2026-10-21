# API publique des offres de recrutement

Cette API permet au site partenaire d'afficher les besoins de recrutement validés par le siège. Elle ne reçoit pas de candidatures.

## Accès

- URL de base de production : `https://api.zhaosfamily.com/api`
- Endpoint : `GET /public/recruitment-openings`
- URL complète : `https://api.zhaosfamily.com/api/public/recruitment-openings`
- Authentification : aucune. Aucune clé API n'est nécessaire.
- Corps de requête et paramètres : aucun.

L'endpoint renvoie uniquement les demandes publiées par le siège et non terminées. Une demande retirée, terminée ou supprimée disparaît de la liste. S'il n'y a aucune offre, la réponse est `[]`.

## Réponse `200 OK`

```json
[
  {
    "id": 123,
    "address": "10 rue de Rivoli, 75004 Paris",
    "position": "waiter",
    "contractType": "full_time",
    "headcount": 2
  }
]
```

| Champ | Type | Description |
| --- | --- | --- |
| `id` | nombre entier | Identifiant stable de la demande, utilisable comme clé d'affichage. |
| `address` | chaîne | Adresse du restaurant qui recrute. |
| `position` | chaîne | Code du poste, voir ci-dessous. |
| `contractType` | chaîne | Code de la durée de travail, voir ci-dessous. |
| `headcount` | nombre entier | Nombre de personnes recherchées pour cette demande. |

### Valeurs à afficher

| `position` | Libellé français |
| --- | --- |
| `waiter` | Serveur |
| `chef` | Cuisinier |
| `kitchen_assistant` | Aide cuisine |

| `contractType` | Libellé français |
| --- | --- |
| `full_time` | Temps plein |
| `part_time` | Temps partiel |

`full_time` et `part_time` décrivent la durée de travail, pas un contrat CDI ou CDD. Les notes internes et les données des employés ne figurent pas dans cette réponse.

## Exemple d'appel

```bash
curl https://api.zhaosfamily.com/api/public/recruitment-openings
```

Les appels depuis un navigateur nécessitent que l'origine du site partenaire soit autorisée dans la configuration CORS du serveur (`CORS_ORIGINS`). Cette origine doit être communiquée à l'équipe ZHAO avant la mise en ligne de l'intégration. Les appels depuis le serveur du partenaire ne sont pas soumis à CORS.
