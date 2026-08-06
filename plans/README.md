# Animasjonsplaner

Auditgrunnlag: Emil Kowalskis `improve-animations`, commit `aeb6a01`.

| Plan | Tittel | Grad | Status |
|---|---|---|---|
| 001 | Panorer rolig til valg utenfor kartutsnittet | Medium | DONE |
| 002 | Gjør tooltip-faden stabil og avbrytbar | Medium | DONE |
| 003 | Samle motion-tokens og bevar nyttig feedback | Medium | DONE |
| 004 | Animer kartets UI-lag uten å sinke kartet | Lav | DONE |
| 005 | Stopp programstyrt panorering ved redusert bevegelse | Medium | TODO |
| 006 | Fjern appens globale motion-bryter | Medium | TODO |
| 007 | Avgrens primitive-overganger eksplisitt | Medium | TODO |

## Rekkefølge

1. `003` etablerer tokens og reduced-motion-kontrakt.
2. `002` bruker tooltip-tokenet og stabiliserer hover-livssyklusen.
3. `001` endrer bare sjelden, programstyrt kartbevegelse.
4. `004` bygger resterende UI-overganger på tokenene.

`004` avhenger av `003`. De øvrige kan gjennomføres uavhengig.

Neste gjennomføring: `005`, `006`, `007`. Plan `005` lukker en JavaScript-del
som ikke ble dekket av CSS-kontrakten i `003`.
