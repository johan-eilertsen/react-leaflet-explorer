# 0002 - Finpuss komboboks og kartvalg

Status: READY_FOR_QC
Owner: codex
Created: 2026-08-05
Updated: 2026-08-05

## Goal

Gjør den integrerte kartkontrollen visuelt stabil og la stedsvalg flytte kartet
forsiktig uten aggressiv innzooming.

## User and content contract

- Søkefeltet følger kartets venstrekant og overskriftens linje.
- Valgt stedsnavn er synlig i feltet når brukeren ikke skriver et nytt søk.
- Filtertekst og nullstillingsknapp flytter seg ikke når feltet åpnes eller lukkes.
- Dropdownen viser visuelt at listen kan rulles.
- Valg i kart eller liste beholder zoomnivået. Kartet flyttes bare hvis objektet
  er helt utenfor gjeldende visning.
- Synlig tekst er kort produkttekst, uten implementasjons- eller QA-språk.

## Acceptance

- Komboboksens innhold har identisk horisontal plassering i aktiv og inaktiv tilstand.
- Valgt sted og aktivt typefilter kan leses uten å åpne dropdownen.
- Listen har scroll-fade når det finnes skjult innhold.
- Valg av synlig objekt endrer ikke viewport.
- Valg av objekt utenfor viewport panorerer til objektet uten å endre zoom.
- Tester, bygg, pakking og Hysvær-integrasjon består.

## Result

- Portalen er flyttet ut av flex-raden, så filtertekst og X står stille når
  dropdownen åpnes.
- Søkefeltet følger kartets venstrekant og viser valgt stedsnavn når brukeren
  ikke skriver.
- Scroll-fade oppdateres fra listens faktiske scrollposisjon.
- Stedsvalg beholder zoom. Kartet panorerer bare når objektet ikke overlapper
  viewporten.
- Test, TypeScript-bygg og pakkekontroll består.
- Gjenstår: publisering av `0.1.6`, Hysvær staging og fysisk visuell QA.
