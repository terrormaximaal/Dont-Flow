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

## Een referentie die geen losse delen heeft (sedan, 4 sep)

De sedan-referentie is een low-poly model: één mesh van 668 driehoeken met
alles in de textuur gebakken. Geen losse lampen, ruiten of wielen, en geen
naden. Daar valt niets uit te snijden zoals bij de stadsauto; wel is de vorm
te meten.

1. `fbx2obj.js` — zet een binaire FBX om naar de OBJ die de rest leest, met
   posities, normalen, UV's en een groep per mesh. three.js kan FBX lezen en
   niets anders hier, dus dat gebeurt in een headless browser.
   `node fbx2obj.js model.FBX model.obj`
2. `smeas.py` — leest die OBJ, zet de assen om, bepaalt zelf welke kant de
   neus is (de lage kant), en meet SIL, PLAN, BELT, CABIN, DLO, SECTION en de
   tumblehome. `python3 smeas.py model.obj`
3. `cut_sedan.py` — snijdt de sedan in panelen: wielen eruit als eigen
   componenten, deuren op stations (er zijn geen groeven), ruiten, lampen en
   grille uit de textuurklassen (masker van `uvmask2.js`, één cijfer per
   texel: 0 lak, 1 donker, 2 licht, 3 rood).
   `python3 cut_sedan.py model.obj mask.txt sedan_cut.json`
4. `pack_mesh.py` — pakt één bibliotheek en laat de andere staan:
   `python3 pack_mesh.py sportscar-studio.html sedan sedan_cut.json`
   (de stadsauto: `... city body_cut.json <obj>`, met de OBJ voor de losse
   groepen).

De belt heeft op zo weinig driehoeken een andere methode nodig: er zit geen
knik in de flank waar de schouder hoort, want het zijvlak loopt in een paar
vlakken door tot het dak. Daarom is de belt de hoogte waarop de flank voor
het eerst 8% smaller wordt dan het breedste punt van datzelfde station, in
plaats van de grootste sprong.
