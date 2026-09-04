# Referentie meten van een mesh

Zo is de stadsauto gemeten (4 sep 2026). Zelfde methode als de dwarsdoorsnede
van de GT: ray-casten door de mesh, station voor station.

1. `parse2.py` — leest de `.obj` (pad bovenin aanpassen), zet de assen om naar
   de conventie van de generator (x = lengte met de neus op +x, y omhoog,
   z zijwaarts) en schrijft `city_mesh.json` plus een tabel van groepen en
   materialen met hun bounding boxes. Daaruit lees je neus/staart, hoogte,
   halve breedte, assen, wieldiameter, spoor, en de posities van lampen,
   grille, deurgreep en spiegel.
2. `clib.py` — de ray-caster en de constanten (NOSE, TAIL, L, H, HW). Grond op
   y = 0 (onderkant band).
3. `cmeas1.py` … `cmeas5.py` — silhouet (SIL), plan (PLAN), profiel hw(y) per
   station om de belt-knik te vinden, sectie sill→belt (SECTION), dakrand en
   DLO. De uitkomsten gaan als `REFC_*`-tabellen in `REFERENCES` en de
   verhoudingen als ranges in `ARCHETYPES`.

Let op wat een mesh niet geeft: stations 0–1 van het silhouet zijn de
bumperface, niet de motorkap (handmatig op de kaptop gezet), en spiegels
staan in het plan (geïnterpoleerd). De belt is de grootste helling-knik
tussen 0,55 en 0,75 H, gecontroleerd tegen deurgreep en spiegelvoet.
