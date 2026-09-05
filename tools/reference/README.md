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
3. `cut_sonata.py` — snijdt die eerste sedan in panelen: wielen eruit als
   eigen componenten, deuren op stations (er zijn geen groeven), ruiten,
   lampen en grille uit de textuurklassen (masker van `uvmask2.js`, één
   cijfer per texel: 0 lak, 1 donker, 2 licht, 3 rood).
   `python3 cut_sonata.py model.obj mask.txt sedan_cut.json`
   (Heette `cut_sedan.py`; die naam is nu van de tweede sedan, hieronder.)
4. `pack_mesh.py` — pakt één bibliotheek en laat de andere staan:
   `python3 pack_mesh.py sportscar-studio.html sedan sedan_cut.json`
   (de stadsauto: `... city body_cut.json <obj>`, met de OBJ voor de losse
   groepen).

De belt heeft op zo weinig driehoeken een andere methode nodig: er zit geen
knik in de flank waar de schouder hoort, want het zijvlak loopt in een paar
vlakken door tot het dak. Daarom is de belt de hoogte waarop de flank voor
het eerst 8% smaller wordt dan het breedste punt van datzelfde station, in
plaats van de grootste sprong.

## De tweede sedan: een mesh mét losse delen (4 sep)

De opdrachtgever vond de eerste sedan niets en leverde een andere: een
vierdeurs saloon van 82 000 driehoeken als OBJ met MTL. Geen groepen per
onderdeel zoals bij de stadsauto, maar wel materialen, en de delen zijn
losse schillen: ze delen geen hoekpunten met de huid. Dat is genoeg.

1. `cut_sedan.py` — deelt de mesh in schillen (samenhangende driehoeken op
   hoekpuntindex) en geeft elke schil een rol uit haar materiaal en plek:
   de grote geverfde schil is de carrosserie, glas is voorruit / achterruit /
   deurruit / kwartraam naar station, chroom in de neus is grille of
   koplampreflector, het glas ervoor de lampkap, rood is achterlicht,
   de schillen met spiegelglas zijn de spiegels. Wielen (velg en band) en
   het interieur vallen af; de generator bouwt zijn eigen.
   De huid heeft geen groeven bij de deuren (naden van een paar graden),
   dus die worden op stations gesneden, afgelezen aan de knikken die er wél
   zijn: de B-stijlnaad op 0,52 L, de wielkasten op 0,10–0,25 en 0,70–0,86 L,
   de voorrand van de kofferklep op 0,845 L. De achterrand van de motorkap
   volgt de onderrand van de voorruit zelf.
   Het raamframe hoort bij de deur: de A- en B-stijllijnen liggen op elke
   hoogte midden tussen de aangrenzende ruiten, het achterportier draagt
   het kwartraam en eindigt net achter dat raam op de C-stijl; de daklijst
   snijdt op 0,968 H. De zijrand van de kofferklep is de gemeten schouder
   van het dek (0,80 hw voor, 0,74 hw achter). Het kwartraam krijgt een
   `host` (doorR) mee, die de packer in de bibliotheek zet.
   Elke driehoek vertrekt met een label (paneel of deel) en een
   materiaal-tag: `None` voor lak, of chrome / lens / tailred / amber /
   plastic / paint. Een getagde driehoek op een paneel is het sierwerk van
   dat paneel (de chroomlijst op een deur) en reist ermee mee.
   `python3 cut_sedan.py Sedan.obj sedan_cut.json`
2. `smeas.py` heeft er drie opties bij voor zo'n mesh: `--ground=<y>` als
   de OBJ zonder wielen wordt aangeboden, `--nose=low|high` als de twee
   uiteinden even hoog zijn, en `--belt=<h>:<f0>:<f1>` om de raamdorpel op
   te geven door de cabine (deze flank heeft een chroomlijst op 0,38 H en
   een schouder op 0,53 H, en de detector houdt die voor de belt).
   `python3 smeas.py body.obj --ground=0 --nose=low --belt=0.655:0.28:0.85`
3. `pack_mesh.py` leest de tags: op een deel worden ze subs met dat
   materiaal (koplamp = chroom reflector + lens), op een paneel worden ze
   `trim`, dat de generator in zijn eigen materiaal aan het paneel hangt.
   `python3 pack_mesh.py sportscar-studio.html sedan sedan_cut.json`

Gemeten aan deze mesh: L/H/HW 482,4 / 150,8 / 95,3 cm, wielbasis 0,599 L,
vooroverhang 0,176 L, band 65,5 cm op een velg van 45 cm, bandvlak op
0,895 van de halve breedte. Die getallen staan in het archetype.

## De supercar: geen materialen, wel vouwen (5 sep)

Een OBJ van 209 000 driehoeken met twee materialen die niets zeggen. De
onderdelen komen uit de vouwen van de huid: `cut_super.py` deelt de huid
bij een vouw van 12 graden in regio's, en voorruit, dak, zijruiten,
achterruit, portieren, wielkasten, koplampkommen, grille, achterlichtband
en spiegels komen dan als eigen regio's los; ze krijgen hun naam op hun
ligging. Kap, schermen, kwartpanelen, motorkap achter, bumpers, dorpels
worden met vlakken gesneden. De bodemplaat is wat omlaag kijkt.
Het model is tien eenheden lang; de cut wordt in centimeters weggeschreven
omdat de sliver-drempel van de packer in cm² is. Voor `smeas.py` geldt
hetzelfde: lever de OBJ in centimeters aan (het bemonstert in hele eenheden).
`python3 cut_super.py 18549_supercar_V1.obj super_cut.json` (ruim zes
minuten) en `python3 pack_mesh.py sportscar-studio.html supercar super_cut.json`.

## Lampen uit een gesneden huid

Een referentie levert de koplamp meestal als een stukje huid met een eigen
materiaaltag, dus als dekglas zonder binnenwerk. De studio bouwt het
binnenwerk er zelf bij (`lampInlay` in `stage_meshLighting`), en dat gaat
langs de hoofdas van het lampvlak, niet langs x of z: bij een druppel die
schuin over het spatbord ligt, wijzen de bakassen de verkeerde kant op.
Wie een nieuwe referentie snijdt, hoeft dus alleen het dekglas als één
groep met de tag `lens` (of `tailred`) af te leveren; de reflector en de
lichtbalk komen uit de vorm van die groep.
