# Kodgranskning efter UI-ombyggnaden

Granskad och refaktorerad 2026-11-01.

## Genomförd städning

- Tog bort den gamla scrollfunktionen, dess extra bottenutrymme och CSS-variabler. Alla verktyg använder nu separata förberedelse- och presentationsvyer.
- Tog bort den gamla vägen för resultat direkt under formuläret, den oanvända tomtexten och dubblerad nollställning.
- Tog bort dolda listfält från Nummer och Slumpval, dolda nummerfält från listverktygen och Slumpval samt gamla typväljare från sidor där de inte används.
- Ersatte Slumpvals dolda select-element med det befintliga lägesvalets tillstånd i JavaScript.
- Tog bort permanent dolda omgångsknappar från Nummer och Slumpval.
- Tog bort CSS för den gamla resultatrutan, dess huvud och fot, den tidigare sidfotstexten, sajtnamnet i sidfoten och den gamla Rensa-placeringen.
- Slog ihop överlagrade stilar för listfält, sparade listor, listpaneler och lägesväljare.
- Delade upp den långa formulärhanteraren i separata funktioner för nummer, listor, Slumpval, kopierbar text, resultat och presentation.
- Samlade rubriker, hjälptexter, knapptexter och historiketiketter i lägeskonfigurationerna.
- Tog bort tillståndsflaggan för en gammal resultatvy och dubblerad hantering av sista deldragningen. Omgångsnumret är fortfarande oberoende av historiken.
- Minskade upprepad läsning av listinmatningen och dubblerade sessionStorage-skrivningar vid redigering.
- Avgränsade listornas hash-lägen till listverktyget, så att exempelvis `#blanda` inte kan aktivera listläge på Nummer-sidan.

## Avsiktligt behållet

- Befintliga adresser, inklusive de separata listadresserna och `singla-slant/`.
- Statiska HTML-sidor utan ett nytt ramverk eller en mallmotor. Listadresserna har likartad HTML, men rätt ingångsläge och metadata.
- Format och nycklar för sparade listor, tillfälliga listor och offlineval.
- Kompatibilitet för äldre installerade service workers och migrering av äldre installationsinställningar. Dessa kodvägar behövs för användare som inte har uppdaterat ännu.
- Slumpalgoritmerna, inklusive rejection sampling och urval av unika nummer utan att skapa hela intervallet.
- Reservvägen för kopiering i webbläsare där Clipboard API inte kan användas.

## Verifiering

- Alla 36 tester passerar, inklusive sparade listor, tillfälliga listor, tärningstyper, nummerintervall, dubbletter, omgångar, tillgänglig återkoppling och offlineuppdateringar.
- Testerna för navigering omfattar även främmande listfragment på Nummer och Slumpval.
- Produktionsbygget passerar. De publicerade filerna minskade från 129 074 till 120 501 byte, cirka 6,6 procent, utan nya beroenden.
- Före/efter-jämförelse av 12 förberedelse- och presentationsvyer: Listverktyg, Nummer och Slumpval vid 390 och 1 024 pixlars bredd. Inga skillnader i de kontrollerade elementens mått, marginaler, textstorlek eller färg.
- Manuellt kontrollerat grupper, tärningskast, omkastning, återgång till redigering och bevarad lista efter verktygsbyte i webbläsaren.

Ändringarna är inte committade eller pushade.
