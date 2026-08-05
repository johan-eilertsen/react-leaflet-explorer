# 0001 - Gjenopprett integrert søk og filter

Status: READY_FOR_QC
Owner: codex
Created: 2026-08-05
Updated: 2026-08-05
Started: regresjonstesten viser tre `role="combobox"` i stedet for én

## Goal

Gjenopprett den tidligere kartkontrollen med ett søkefelt, typefilter inne i
komboboksen og en X som nullstiller søk, filter og valgt sted.

## User and content contract

- Brukeren skal møte én samlet kontroll over kartet.
- Feltet skal fortsatt hete «Søk etter stedsnavn» i Hysvær.
- Aktivt typefilter skal være synlig uten å lage et ekstra inputfelt.
- Nullstilling skal være tilgjengelig for tastatur og skjermleser.
- Pakke-, test- og implementasjonsspråk skal ikke vises i produktflaten.

## Acceptance

- Bare ett komboboksfelt rendres.
- Typevalg ligger i samme popup som stedsforslagene.
- X vises når søk, typefilter eller valgt sted er aktivt.
- X nullstiller søk, typefilter og valgt sted.
- Eksisterende kart-, trackpad-, touch- og fullskjermatferd er urørt.
- Tester, bygg, pakking og Hysvær-integrasjon består.

## Result

- Én Base UI-komboboks håndterer nå søk, typefilter og nullstilling.
- Typevalgene ligger øverst i samme popup som stedsforslagene.
- X nullstiller søk, aktivt typefilter og valgt sted.
- Regresjonstest, bygg og `npm pack --dry-run` består for versjon `0.1.5`.
- Gjenstår: publisering til npm og verifisering i Hysvær staging.
