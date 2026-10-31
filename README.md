# randomisera
## PWA
Manifestet och ikonerna används på samtliga verktygssidor. Knappen i sidfoten öppnar installation när webbläsaren stöder det, annars visas instruktioner. Testa över HTTPS eller localhost; installation fungerar inte via file://.

Offlinefiler sparas endast efter användarens val. Inga namnlistor eller resultat sparas. Både installation och offlinefunktionen bör testas på iPhone och Android efter publicering. Installerad iPhone-app kan ha separat lagring från Safari; välj då offlineläge inifrån appen också.

Vid ändringar i cachade filer: höj CACHE-versionen i sw.js. Gamla offlinefiler ersätts när den nya service workern aktiveras efter att gamla flikar/appfönster stängts. Onlinebesök hämtar aktuella filer från nätet.
