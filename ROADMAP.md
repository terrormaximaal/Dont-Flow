# Procedural Vehicle Generator — analyse en roadmap

Stand: 4 sep 2026. Stappen 1, 2, 4 t/m 8 zijn gedaan; 3 is gemeten en afgewezen. Koerswijziging in §3b: families worden vanaf de grond gemeten van een eigen referentie; de stadsauto is de eerste.
Alle getallen hieronder zijn gemeten op `sportscar-studio.html`, seed 12345,
`super_gt`, tenzij anders vermeld. Metingen draaien op een software-rasteriser
(swiftshader); waar dat het resultaat beïnvloedt staat het erbij.

---

## 1. Wat er nu staat

Eén bestand van 5351 regels, twee scriptblokken: `#core` (de generator) en
`#app` (viewer, UI, QC-paneel).

### Pijplijn

```
generateDNA(opts)          171 regels   ARCHETYPES + RNG -> ~90 afgeleide getallen
  -> makeBody(d)           602 regels   B.*: alle oppervlakken als (u,v) -> [x,y,z]
  -> buildVehicle(opts)   1194 regels   alle onderdelen, één rechte lijn
       buildStructure      157 regels
       enforceSkinDominance / symmetriseVehicle / mergeBands
  -> qualityGate(v)       1295 regels   21 controles + geometrieverificatie
```

De carrosserie is geen verzameling primitieven: elk paneel is een band uit een
parametrisch oppervlak (`_grid` / `buildShell` / `surfRegion` / `bandsAround`),
en de vorm komt uit **gemeten curvetabellen** die van één orthografisch
stylingblad zijn afgelezen: `REF2_SIL`, `REF2_PLAN`, `REF_SECTION`, `REF2_BELT`,
`REF2_CABIN`, `REF2_DLO`, `REF2_TUMBLE`. Dat is de reden dat de auto
geloofwaardig oogt.

### Gemeten toestand

| | |
|---|---|
| bouwtijd (desktop, q=1) | 606 ms |
| tijd tot eerste beeld (telefoonpad) | ~2,0 s |
| parts / meshes | 53 / 319 |
| driehoeken / vertices | 59 058 / 56 031 |
| draw calls per frame | 251 (telefoonpad), 274 (desktop) |
| unieke geometries | 319 — **niets wordt gedeeld** |
| materialen | 62 |
| wielen | 76 meshes, 7216 driehoeken, 4x hetzelfde |
| damage: geheugen | 32 meshes met bewaarde originelen, 653 kB |
| damage: één inslag | 2,5 ms |
| damage: alles naar total loss | 3 ms, mesh-aantal onveranderd |
| repair | 4 ms |

---

## 2. De echte problemen, op volgorde van gewicht

### P1 — De vorm hangt aan één getraceerd stylingblad *(blokkeert alles in punt 2 van de opdracht)*

`REFERENCES` heeft precies één ingang. Een sedan of pickup toevoegen betekent nu
een nieuw blad tracen. `ARCHETYPES` heeft ook maar één ingang; `gt_coupe` bestaat
alleen als naam in de testset en valt stilletjes terug op `super_gt`.

Dit is het kernprobleem, en het heeft een spanning in zich: de tabellen zijn
precies waarom de auto er goed uitziet. De oplossing is niet ze weggooien, maar
ze **afleidbaar** maken — een curvegrammatica met benoemde controlepunten die de
DNA plaatst, waarbij de bestaande tabellen de ijkzaak worden: de gegenereerde
curve voor de sportwagen-DNA moet de getraceerde tabel binnen een tolerantie
reproduceren. Dat is meetbaar, en die meting wordt de regressietest.

### P2 — Geen deellaag: 319 geometries voor 53 onderdelen

Vier wielen bouwen elk hun eigen velg, band, schijf en klauw. Geen instancing,
geen gedeelde geometrie, geen LOD. 7216 driehoeken aan wielen waarvan 5412
duplicaat.

### P3 — `buildVehicle` is 1194 regels rechte lijn

Alles deelt één closure met lokale variabelen (`B`, `d`, `M`, `shell`, `patch`,
`fRef`, ...). Er is geen scheiding tussen proportie, body, panelen, wielen,
interieur en details. Een tweede voertuigfamilie zou het hele blok moeten
kopiëren — precies wat de opdracht verbiedt.

### P4 — De DNA is een platte zak afgeleide getallen, geen designtaal

`generateDNA` leest ranges uit `ARCHETYPES` en rekent stations uit. De
"design language" is één blok ternaries op `isS`. Er is geen laag waarin
*aggressive*, *elegant* of *rugged* meerdere onderdelen tegelijk logisch
verschuift. Zonder die laag wordt elke nieuwe familie weer handwerk.

### P5 — `_grid` roept elk oppervlak vijf keer per vertex aan

Voor de normaal worden vier extra monsters op ±1/900 genomen. Bij 56 031
vertices zijn dat ~280 000 evaluaties van functies die zelf curvelookups en
bisecties doen. Dat is het grootste deel van de 606 ms bouwtijd.

### P6 — `qualityGate` is 1295 regels en zit vast aan deze auto

De grootste functie in het bestand. Waardevol (21 controles die me deze sessie
meerdere keren voor fouten hebben behoed), maar vol aannames die alleen voor een
fastback-GT kloppen. Moet per voertuigfamilie configureerbaar worden.

### Wat *geen* probleem is

**Het damage-systeem is al ongeveer wat de opdracht vraagt.** Continue schade
0..4 per Part, vertexdeformatie op een bewaarde kopie, vertexkleur voor krassen,
losraken bij 4, bandtoestanden, glasgedrag. Total loss verandert het
mesh-aantal niet (319 voor en na) en kost 3 ms. Er is geen geometrieduplicatie
om op te ruimen. De enige echte winst zit in de broad-phase: `applyImpact` loopt
nu alle 319 meshes langs per inslag. Dat staat laag op de lijst.

---

## 3. Roadmap

Volgorde volgt de opdracht: eerst de sportwagen en de architectuur, dan pas
families. Elke stap is af als hij gemeten is en de bestaande controles
(QC 21/21, geometrie ok in beide paden, symmetrie 0 mm, 18/80 zaden) ongewijzigd
zijn.

| # | Stap | Waarom | Meetbaar aan |
|---|---|---|---|
| 1 | **Draw calls: banden samenvoegen** ✔ | 413 -> 319 meshes, 368 -> 274 calls, beeld pixelidentiek | draw calls, pixeldiff |
| 2 | **Gedeelde wiel-geometrie** ✔ | 76 -> 28 wielmeshes, 274 -> 226 calls, bouwtijd 606 -> 434 ms, pixelidentiek | geometries, geheugen |
| 3 | `_grid` goedkoper ✗ gemeten en afgewezen | rasternormalen: 370 -> 170 ms maar 30 639 pixels verschoven (plooien in de flank smaller dan een cel); voorwaartse differenties: -54 ms, nog 18 878 pixels | bouwtijd, pixeldiff |
| 4 | **`buildVehicle` in twaalf stages met één `ctx`** ✔ | mechanisch gesplitst op de sectiemarkeringen, 38 grensoverschrijdende namen via ctx, 0 pixels verschil | regels per functie, geen gedragsverandering |
| 5 | **Vehicle DNA-laag** ✔ | acht karakterassen, regels per proportie, kwaliteitspoort schuift mee; neutraal = 0 pixels verschil, alle acht presets QC 21/21 | zichtbare variatie bij vaste seed |
| 6 | **Curvegrammatica** ✔ | de vijf tabellen uit ~45 benoemde controles; geijkt op de GT: silhouet gemiddeld 4,6 mm (max 16), plan 2,4 mm, belt 1,5 mm - het niveau van de tracering zelf (1 px ≈ 10 mm). `?grammar=1` bouwt de GT uit de grammatica: QC 21/21, geometrie ok, visueel niet te onderscheiden | afwijking t.o.v. de getraceerde tabellen |
| 7 | **Kwaliteitspoort per familie** ✔ | `deriveGate`: uit de eigen ranges van de familie (24 neutrale builds, +15% spreiding, vloer per eenheid); designtaal uit een `design`-blok op het archetype | 21 controles blijven zinvol |
| 8 | **Familie: sedan** ✔ | één archetypeblok (~70 regels), geen enkele stage gedupliceerd. Daarvoor generiek gemaakt: achterportieren (`doors: 4` splitst de flank bij de B-stijl, eigen ruit per deur, B-stijl, jambs en naadstrips), motorkapventilatie optioneel. Drie zaden QC 21/21, geometrie ok, symmetrie 0 mm | hoeveel nieuwe regels? |
| 9 | **Familie: SUV** ◐ eerste versie | één archetypeblok, bouwt zonder wijziging aan de stages: QC 21/21 op seed 12345, symmetrie 0 mm, profiel klopt (hoog, 200 mm bodemvrijheid, lang dak, grote wielen). **Maar de achterkant is fout**: de generator kent één greenhouse-familie (fastback/notchback met een dek erachter). Een tweebox heeft een achterklep tot de belt, een cabineplan dat achteraan niet taps loopt en een DLO die tot de staart doorloopt. Dat is de volgende structurele stap - de *greenhouse-families* uit §4 - en die hoort vóór pickup en bestelwagen | idem |
| 10 | Familie: **pickup** | cabine + losse laadbak: vereist een cab/bed-splitsing achter de B-stijl - na stap 9b | idem |
| 11 | Familie: **van** / **truck** | verticale achterkant = tweebox-greenhouse (9b) + forward-cab; truck ook een aparte chassis/cabine-architectuur | idem |
| 9b | **Greenhouse-families** (nieuw, blokkeert 9-11) | `fastback` (GT), `notchback` (sedan), `two-box` (SUV, wagon, hatch, van): achterruit als klep, cabineplan zonder achtertaps, DLO tot de staart, kwartraam vervalt | SUV-achterkant leest als tailgate |

**Afbreekregel** (uit de opdracht, en ik houd me eraan): als een nieuwe familie
veel duplicaatcode nodig heeft, stop ik en verbeter eerst de architectuur.

Toegepast bij stap 9: de SUV had als data een fatsoenlijk profiel maar een
verkeerde achterkant. In plaats van de SUV met eigen code te lappen is de
oorzaak benoemd (één greenhouse-familie) en als stap 9b vóór 10 en 11 gezet.

## Gemeten na stap 9

| | GT | sedan | SUV |
|---|---|---|---|
| bouwtijd (desktop) | ~440 ms | ~450 ms | ~450 ms |
| parts / meshes | 53 / 271 | 59 / 286 | 59 / 286 |
| QC (seed 12345) | 21/21 | 21/21 | 21/21 |
| symmetrie | 0 mm | 0 mm | 0 mm |
| eigen code | tabellen + archetype | archetype (~75 regels) | archetype (~75 regels) |

### Later, niet nu

Op de lijst, expliciet nog niet ingepland: LOD-generatie, exportpijplijn,
trim levels, aandrijflijnvarianten, procedurele wieldesigns, lichtsignaturen als
eigen familie, modulaire interieurs. Die hebben pas waarde als 5 t/m 11 staan.

---

## 3b. Koerswijziging (4 sep, op aanwijzing van de opdrachtgever)

Sedan en SUV zijn geen afgeleiden van een sportcoupé en worden **vanaf de
grond** vormgegeven, elk met een eigen referentie. Eerste familie op die
manier: een **A-segment stadsauto**, gemeten van een aangeleverde mesh.

### Referentiepijplijn per familie (nieuw)

```
mesh (.obj)  ->  parse2.py  (assen naar: x lengte, neus +x; y omhoog; z zijwaarts; grond op 0)
             ->  clib.py    (ray-caster, zelfde als bij de GT-sectie)
             ->  cmeas*.py  (SIL, PLAN, SECTION, BELT, CABIN, DLO, TUMBLE + assen, wielen,
                             lampen, grille, deurgreep, spiegel, bodemvrijheid)
             ->  REFERENCES.<familie> + ARCHETYPES.<familie>
```

Stadsauto, gemeten: 3,58 × 1,88 × 1,48 m, wielbasis 2,38 m (0,665 L),
overhangen 0,18 / 0,16 L, cowl op 0,17 L (cab-forward, over het voorwiel),
belt 0,62–0,70 H oplopend naar achteren, tumblehome 0,20, glaslijn tot
0,985 H, koplampen 0,46–0,64 H, grille 0,28–0,42 H, vloer 0,157 H.

Wat daarvoor generiek moest worden:
- **two-box greenhouse** (`greenhouse: 'two-box'`): achterruit als steile
  klep vanaf het dakeinde naar de bovenkant van de staartkap, geen dek;
- **cab-forward**: het portier begint achter de wielkast als de cowl over
  het wiel zit (`xDoorF = min(cowl, wielkast)`);
- **motorruimte** schaalt naar de ruimte onder de kap (hoogte én lengte);
  de crashbalk staat nooit dichter dan 0,30 m bij de neus.

Stand stadsauto: QC 21/21, geometrie ok op drie zaden, GT 0 pixels verschil.
Proporties, stance, belt en de tweebox-staart kloppen met de referentie.

### Tweede ronde: de eigen vormtaal van de stadsauto (4 sep, later)

Opnieuw gemeten, nu van boven en van achteren, station voor station:

- De **motorkap is een verhoogd middendeel**: zijn zijrand loopt in plan van
  0,45 (bij de lamp) naar 0,78 van de halve breedte (bij de A-stijl) en
  stapt daar 0,10–0,13 H omlaag op een lage **spatbordschelp**. De eerdere
  belt vóór de cowl (0,55–0,64 H) was de bovenkant van die kapwand; de
  schelp zelf ligt op 0,46–0,55 H. Tabel `REFC_BELT` gecorrigeerd,
  `REFC_HOODEDGE` nieuw.
- De **koplampen zijn pods** op die schelp, in de wig tussen kapwand en
  flank, druppelvormig in plan (chroomhuis van 0,44 tot 0,81 van de halve
  breedte, station 0,05–0,215), bovenkant gelijk met de kaprand.
- Grille: elf **horizontale lamellen**, |z| 0,59, 0,28–0,42 H; geen
  mistlampen; zwarte valance 0,175–0,275 H.
- Achter: de **achterklep is smaller dan de carrosserie** op lamphoogte
  (halve breedte 0,45); buiten de klep loopt de staartband op tot de belt
  van de hoek (0,66 H) en draagt de twee achterlichten (|z| 0,49–0,80,
  0,55–0,66 H, om de hoek). Klepglas vanaf 0,64 H (dekpunt 0,94 L).
  Zijruit eindigt op 0,86: C-stijl van 0,86 tot 0,90.
- Zij: omlijste portierruit, B-stijl op een tweedeurs, greep op 0,90 van
  het portier, 4,5 cm onder de belt.

Generiek geworden (geen stadsauto-takken in de code):
`topSheet`/`closureEdge` lezen hun zijrand via `sideZ`/`sideY`
(`B.hoodSideZ/Y`, `B.deckSideZ/Y`); `B.wingTop` + `B.hoodWall`;
`lamp.on: 'wing'` met een plan-omtrek en een `xzSolver`; `mouth.slats`;
`fog`/`corner` optioneel; `diffuser` zonder `pill` = valance;
`apertures.tailgate.z`; `windowFrame: 'framed'`, `handleF`, `handleDrop`.
De GT loopt door dezelfde functies met de oude defaults en blijft 0 pixels
verschillend; de zaadlijst is identiek aan de basislijn.

Nog open aan de stadsauto: de A-stijl en dakrand hebben nog de dunne
GT-lijst (referentie: dikke stijlen in carrosseriekleur); de klep krijgt
nog geen kentekenuitsparing; de grille zit iets hoger dan op het model.

### Derde ronde: de mesh zelf, in onderdelen (4 sep, op aanwijzing van de opdrachtgever)

De opdrachtgever wil dat de stadsauto er precies uitziet als het ingeladen
model, met alle losse onderdelen. Dat is een ander product dan de
parametrische stadsauto hierboven, en het is zo gebouwd:

```
.obj  ->  tools/reference/cut_body.py   snijdt de carrosserie (een vlak) in panelen:
                                         deuren via hun eigen groef (wanden = vlakken die
                                         > 40 graden van het lokale oppervlak afwijken),
                                         de rest door driehoeken te clippen op velden
                                         (bumperbovenkant 0,475 H, klepzijkant 0,46 hw,
                                         kaprand, dak 0,72 H, dorpel 0,24 H, middenlijn ...);
                                         glas = donker in de textuur, boven de belt
      ->  tools/reference/pack_mesh.py  pakt losse groepen en panelen in MESH_LIB
                                         (uint16 posities, int8 normalen, uint16 indices,
                                         linkerhelften; 521 kB binair, 700 kB tekst)
      ->  stage_meshSkin / stage_meshDoors / stage_meshLighting
                                         panelen krijgen een rug en een rand (offsetShell,
                                         15 mm), scharnieren aan hun eigen box, glas als
                                         eigen delen; rechts = gespiegelde kopie
```

Wat de mesh gaf en wat niet: de deuren zijn dichte platen in een groef
van 5 mm; alle andere naden ontbreken (ook in de textuur), dus die zijn
gesneden. Geen binnenkant: motorruimte, interieur, structuur, schade en
scharnieren komen uit de generator. De parametrische afsluiters van de
generator (deurstijlen, flenzen, cowlpaneel, naadstrips) staan op een
mesh-huid uit: ze waren op het parametrische lijf getekend en staken door
de mesh heen.

Gemeten: GT 0 pixels verschil, zaadlijst identiek; stadsauto QC 21/21,
geometrie ok op drie zaden, symmetrie exact (gespiegelde helften);
bouwtijd 320 ms; 48 onderdelen, 158 meshes. Eén auto, geen zaadvariatie
in de vorm behalve lengte, hoogte en breedte (de panelen schalen mee).

Nog open: de deuren tonen hun kale binnenvlak (geen deurkaart); de
achterklep heeft in de mesh een kentekenuitsparing, maar de bovenkant van
de klep en het dak delen nog één rand zonder rubber; de A-stijl is nu wel
de echte. Variatie op de mesh (roosterdeformatie) is niet gedaan.

Wielen: op aanwijzing van de opdrachtgever komen die van het eigen
wielsysteem, ook op de mesh-stadsauto, zodat er één systeem is voor alle
families (band, velg, schijf, klauw, lekke band, velgstijl per zaad).
De maat klopt: de mesh meet band 20,4 cm breed, straal 28,9 cm, velg
19,3 cm; de DNA van de familie geeft 20,0-21,0 cm, 0,159-0,163 L en een
hoogte-breedteverhouding 0,42-0,46 (mesh: 0,47). De velg, band en schijf
van de mesh zitten niet meer in MESH_LIB (bestand 130 kB kleiner).

### Vierde ronde: zitpositie, karakter eruit, knoppen geordend (4 sep)

Drie aanwijzingen van de opdrachtgever, in één ronde:

**Zitpositie is een familieparameter.** De voorstoel stond op een vaste
0,74 m achter de cowl, voor alle families dezelfde. Dat kan niet: de cowl
van de stadsauto staat vrijwel boven de vooras en die van de GT bijna een
meter erachter, dus dezelfde millimeters geven vier verschillende auto's.
Nieuw is `seatSet` per archetype, het heuppunt achter de cowl uitgedrukt in
wielbasissen. Iedere familie zit nu 9 tot 11 cm verder naar achter:

| familie | heuppunt achter de vooras, was | nu |
|---|---|---|
| super GT | 0,593 wielbasis | 0,632 |
| stadsauto | 0,299 | 0,338 |
| sedan | 0,519 | 0,555 |
| SUV | 0,463 | 0,495 |

**Het karaktersysteem is weg.** Acht assen (sportief, agressief, elegant …)
duwden een set proporties samen tot buiten het gemeten bereik van de
familie, en de kwaliteitspoort moest dan mee opschuiven om te blijven
kloppen. Een auto die buiten de envelop van zijn eigen referentie stapt is
die auto niet meer. `DNA_AXES`, `DNA_RULES`, `DNA_STYLES`, `DNA_PRESETS`,
`dnaBias`, `normaliseCharacter`, `dominantAxis` en `shiftGate` zijn
verwijderd, samen met de keuzelijst in de balk. Variatie komt nu alleen
van het zaad binnen het gemeten bereik; de zaadlijst is er niet door
veranderd (18 van 80, identiek aan de basislijn), want een neutraal
karakter trok al geen enkel extra getal uit de stroom.

**De knoppenbalk is gesorteerd en gekleurd.** Achtentwintig knoppen in
zes naamloze grijze rijen zijn zes rijen met een naam in de kantlijn en een
eigen kleur geworden: auto (amber), aanzicht (blauw), bouwstap (violet),
bekijken (groenblauw), bewegen (groen), schade (rood). De kleur hoort bij
de groep, niet bij de knop, dus het oog vindt eerst de rij. De twee
schuifjes staan nu in de rij waar ze op werken: de stuurhoek bij de
scharnieren en de wielen, de klapkracht bij de schadeknoppen. De balk is
er niet hoger van geworden (279 px, was 278) omdat de rijen strakker
staan.

### Lak: kleur en afwerking als keuze (4 sep)

De twaalf gemeten lakken stonden al in de tabel maar de auto pakte er altijd
één, Liquid silver. Nu zijn ze te kiezen, met daarnaast een afwerking:

- **Kleur en afwerking zijn twee dingen.** De kleur draagt zijn eigen
  vlokbelading (hoeveel aluminium er in de basislaag zit); de afwerking is de
  laag erover en bepaalt wat die vlok met het licht mag doen. `metallic` is
  metaal: het metaalgehalte komt uit de vlokbelading (0,74 tot 0,99) in plaats
  van uit een derde getal per kleur, de ruwheid is de gemeten waarde maal 0,50,
  de blanke laag staat op 1,0 en verstrooit zelf vrijwel niets (0,015 tot 0,04),
  en de omgeving weerkaatst 1,55 keer zo hard. `mat` houdt de vlok maar maakt de
  lak en de blanke laag ruw (ruwheid +0,50 tot ten hoogste 0,94, blanke laag
  0,25 en ruwheid 0,75). De blanke laag gaat nooit naar nul: dan compileert
  three.js een tweede shaderprogramma voor dezelfde auto.
- **Er is een lichtstraat, geen gradiënt meer.** Een metallic lak heeft zelf
  bijna niets te tonen: hij geeft je een plaatje van de ruimte. De oude
  omgevingskaart was een gladde verticale verloop met drie platte witte vlakken,
  dus een gepolijst paneel spiegelde een glad verloop en bleef plastic hoe hoog
  het metaalgehalte ook stond. De nieuwe is een studio: een licht plafond, vier
  softboxen, een harde horizon waar de wand de vloer raakt, en een donkere
  vloer. Die horizon doet het werk, want een scherpe donkere rand die over een
  spatbord schuift is wat het oog vertelt dat het oppervlak een spiegel is.
- **Wat niet is gelukt.** Een echte vlok per fragment is gebouwd: een hash van
  de wereldpositie in cellen van een paar millimeter, elke cel kantelt de normaal
  van de basislaag terwijl de blanke laag erboven glad blijft, wat precies de
  opbouw van echte metallic is. Op deze schaal rendert dat als korrel en niet
  als glinstering: een vlok is hier kleiner dan een pixel, dus wat op het scherm
  komt is ruis die een zwarte auto grijs maakt. Weer verwijderd; het zou zijn
  plek verdienen in een close-upmodus.
- **De roughnessMap op de lak was dood.** 29 van de 30 gelakte meshes zijn
  analytische oppervlakken zonder UV-coördinaten, dus elke fragment las dezelfde
  texel: een constante vermenigvuldiging vermomd als textuur. Weg.
- **Overspuiten is niet opnieuw bouwen.** Alle gelakte panelen delen één
  materiaal, en klei, reflectietest en structuur bewaren een verwijzing in
  plaats van een kopie, dus een nieuwe kleur wordt er rechtstreeks in
  geschreven. Direct zichtbaar, en de keuze blijft staan bij een nieuw zaad of
  een andere familie.
- **De kleur is nu ook echt die kleur.** De renderer schrijft sRGB en tonemapt,
  maar een hex die aan three.js wordt gegeven geldt als lineair licht, dus
  0x9e1212 kwam er als zalmroze uit in plaats van het diepe rood dat het heet.
  De lak is het enige oppervlak waarvan de kleur bij naam wordt gekozen, dus
  die wordt op de weg naar binnen van sRGB naar lineair omgezet. Gevolg: de
  standaardauto in Liquid silver is een tint dieper dan voorheen (ongeveer 16%
  van de pixels verschilt, alleen de lak; de geometrie is onveranderd). De
  kleuren van sierlijsten, glas en interieur zijn met het oog op de
  ongecorrigeerde pijplijn gekozen en zijn niet aangeraakt.

### Kooiconstructie op de mesh (4 sep)

Als je de stadsauto sloopte kwamen er balken tevoorschijn die diagonaal door
de auto liepen. Oorzaak: de kooi werd gebouwd uit parametrische stations
(`d.xCowl`, `d.xDoorF`, `B.roofYAt`) terwijl de carrosserie van de mesh komt.
Die twee lopen tientallen centimeters uiteen, dus de A-stijl eindigde boven de
motorkap en een dakspant liep door het achterruit.

Nieuw is `meshCage(d)`: die leest de hoekpunten van de panelen zelf. Een
bounding box is niet genoeg, want een gehelde ruit heeft in drie van de acht
hoeken van zijn box geen enkel punt; `meshExtreme(geo, ax, ay, az)` vraagt het
paneel om het punt dat het verst in een richting ligt. Daaruit komen de dorpel
(voor- en achterhoek van de deur), de A-stijl (de buitenste onder- en
bovenhoek van de voorruit, dus met de echte helling), de B-stijl (achterste
bovenhoek van de deur), de achterstijl (achter het zijruitje) en de daklijn.
Alleen actief als de familie een mesh-huid heeft; de andere families houden
hun eigen kooi.

### Sedan: getraceerd van een eigen referentie (4 sep)

De opdrachtgever leverde een sedan-referentie aan. Die is van een andere
soort dan die van de stadsauto en dat bepaalt wat ermee kan:

| | stadsauto | sedan |
|---|---|---|
| driehoeken | 20 324 alleen al in de carrosserie | 668 in de hele auto |
| onderdelen | Body, Tire, Disk, brake, grid, koplampglas, achterlicht, spiegel, greep, wisser, diffuser | één mesh |
| lampen, ruiten, wielen | eigen geometrie | in de textuur gebakken |
| naden | groeven om de deuren | geen |

Uit 668 driehoeken valt niets te snijden: een deur zou zes driehoeken zijn.
De vorm is er wel, en die is op dezelfde manier gemeten als de andere twee.
Nieuw gereedschap in `tools/reference/`: `fbx2obj.js` (three.js in een
headless browser, want niets anders hier leest FBX) en `smeas.py` (assen
omzetten, zelf bepalen welke kant de neus is, en SIL, PLAN, BELT, CABIN,
DLO, SECTION en tumblehome meten).

De belt had een andere methode nodig. Op 668 driehoeken zit er geen knik in
de flank waar de schouder hoort: het zijvlak loopt in een paar vlakken door
tot het dak. De belt is daarom de hoogte waarop de flank voor het eerst 8%
smaller wordt dan het breedste punt van datzelfde station. Vóór de cowl is
de belt de bovenkant van het voorscherm en dus van het silhouet afgelezen,
2 mm eronder: de schouder die de detector daar vindt is de zijkreuk van de
motorkap, honderd millimeter te laag, en een kap die daarop landt steekt
boven zijn eigen scherm uit.

Gemeten: wielbasis 0,587 L, vooroverhang 0,191 L, achteroverhang 0,222 L,
hoogte 0,312 L, breedte 0,379 L. Dat is een D-segment sedan van rond de
4,86 m, en de ranges van de familie staan daar nu op.

Wat de sedan hiermee niet krijgt: het gezicht is nog dat van de familie zelf
(grille, lampen, bumper), niet dat van de referentie, want dat zit alleen in
de textuur. En de generator bouwt nog één deurpaar, dus de sedan heeft lange
coupédeuren; achterdeuren zijn de volgende structurele stap.

### Sedan: de mesh zelf, in onderdelen (4 sep, op aanwijzing van de opdrachtgever)

De opdrachtgever wil de sedan zoals de stadsauto: de aangeleverde mesh,
uitgeknipt in delen, modulair. Het is gedaan, met de kanttekening dat 668
driehoeken grove panelen geeft; het zijn wél de panelen van dit model.

```
.FBX  ->  tools/reference/fbx2obj.js   binaire FBX naar OBJ (three.js in een headless browser)
      ->  uvmask2.js                    klassen van de textuur: 0 lak, 1 donker, 2 licht, 3 rood
      ->  tools/reference/cut_sedan.py  wielen eruit als eigen componenten; snijden op stations
                                         (deuren 0,31 / 0,53 / 0,72 L uit de assen en de stijlen,
                                         belt 0,683 H, dorpel 0,25 H, cowl 0,275 + 0,05 z², dak /
                                         kofferklep 0,79 L, kap / scherm 0,86 hw); lampen en
                                         grille als dozen uit de textuur: klassen gemeten over
                                         het oppervlak van elke driehoek, teruggerekend naar 3D,
                                         en dan met vlakken uitgesneden
      ->  tools/reference/pack_mesh.py  nu voor meerdere bibliotheken: city blijft byte-identiek,
                                         sedan erbij (16 huidpanelen, 3 delen: koplamp, achterlicht,
                                         grille, met hun materiaal-tag)
      ->  stage_meshSkin / stage_meshDoors / stage_meshLighting
                                         kofferklep in plaats van achterklep (achterruit blijft in
                                         de carrosserie), tweede deurpaar door.rl/door.rr met eigen
                                         ruiten, lampen uit de huid met lens/tailred/grille,
                                         delen die de mesh niet heeft worden overgeslagen
```

Wat de textuur gaf dat de geometrie niet had: de ruiten (donker boven de
belt, begrensd op station omdat het dak in deze foto óók donker is), de
koplampen (licht), de achterlichten (rood), de grille (donker, laag in de
neus). Wat een monster per driehoek mist, want een lamp is een fractie van
één van deze driehoeken, vindt bemonstering over het oppervlak wel.

Gemeten: GT 0 pixels verschil, zaadlijst identiek; sedan QC 21/21 en
geometrie ok op drie zaden en op het telefoonpad, symmetrie 0 mm over
8765 punten, rooktest zonder JS-fouten; stadsauto ongewijzigd. Bouwtijd
van de mesh-sedan rond de 60 tot 100 ms.

Nog open: de panelen zijn zo grof als de mesh (een deur is 35 driehoeken),
de lampen zijn dozen met een lensmateriaal en geen lampen met een reflector,
en de sedan heeft geen spiegels, grepen, wissers of diffuser omdat de mesh
die niet heeft.

### Sedan, tweede poging: een andere mesh, weer in onderdelen (4 sep)

De opdrachtgever vond de eerste sedan niets en gaf een andere: een vierdeurs
saloon van 82 000 driehoeken (OBJ + MTL). Dezelfde opdracht: de mesh nemen
en de delen uitknippen zoals bij de stadsauto. Dit model heeft geen groepen
per onderdeel, maar wel materialen, en de delen zijn losse schillen die geen
hoekpunten met de huid delen. Dat is genoeg om ze uit elkaar te halen.

```
Sedan.obj  ->  tools/reference/cut_sedan.py  (nieuw; de oude heet nu cut_sonata.py)
               schillen op hoekpuntindex; rol per schil uit materiaal en plek:
                 huid (21 754 driehoeken), glas (5 ruiten, naar station), grille
                 (chroom in de neus + donkere achterwand), koplamp (chroom
                 reflector + glazen kap, twee per kant), achterlicht, spiegel
                 (lakhuis + spiegelglas), chroomlijsten; wielen en interieur eruit
               huid gesneden op stations uit de knikken die er zijn: B-stijlnaad
                 0,52 L, wielkasten 0,10-0,25 en 0,70-0,86 L, kofferklep vanaf
                 0,845 L; deuren 0,275 / 0,522 / 0,692 L, belt 0,655 H (de
                 raamdorpel), dorpel 0,215 H, kap / scherm 0,80 hw, kap-achterrand
                 langs de onderrand van de voorruit, kofferklep tussen de lampen
                 door tot op de bumper (zoals bij het echte model)
               elke driehoek: label + materiaal-tag (None = lak)
           ->  pack_mesh.py  tags op een deel = subs (koplamp: chroom + lens),
                             tags op een paneel = trim (de chroomlijst op een deur)
           ->  studio        meshSkinTrim: het sierwerk hangt aan zijn paneel;
                             materiaal-tags amber en paint erbij (M.amber voor de
                             knipperlichten, lak voor het spiegelhuis, dat daarmee
                             ook meelakt en deukt)
```

Het archetype is op deze mesh gezet: 4,80–4,86 m, H/L 0,3115–0,314,
W/L 0,3935–0,397, wielbasis 0,597–0,601 L, vooroverhang 0,434–0,444 van de
overhang, band 0,1345–0,137 L bij 25,5–27 cm breed, bandvlak op 0,895 van
de halve breedte (waar het model zijn eigen wielen had). De referentietabellen
zijn opnieuw gemeten met smeas.py, met de belt opgegeven (0,655 H door de
cabine) omdat de detector de chroomlijst of de schouder pakte. Achter de
achterruit is de belt de zijrand van de kofferklep (0,66 H, dan omlaag naar
de bumper); met het silhouet zelf daar zakte de parametrische klep 8 mm onder
de bumperrand en viel de geometriecontrole om.

Gemeten: GT 0 pixels verschil op vijf views, zaadlijst identiek (18/80);
sedan QC 21/21 en geometrie ok op drie zaden en op het telefoonpad,
symmetrie 0 mm over 66 768 punten, deurnaden 10–11 mm; stadsauto en SUV
ongewijzigd (het mesh-blok van de stadsauto byte-identiek; de SUV had 20/21
op twee zaden en heeft dat nog). Rooktest zonder JS-fouten. Bouwtijd van de
sedan 300–480 ms; het bestand is 1,25 MB (was 0,98).

Nog open: de deurnaden zijn vlakke sneden door een gladde huid, geen
gemodelleerde groeven; de deurramen zitten in het dakdeel en niet in een
raamframe aan de deur; de lampen zijn de reflector en de kap van het model
zonder gloeidraad; deurgrepen zitten in de huid geperst en zijn geen los deel.

### Sedan, tweede mesh: deuren met frame, kofferklep op de schouder, vier zitplaatsen (4 sep)

Opmerkingen van de opdrachtgever op de eerste versie: de maat moet kloppen
met de andere auto's, er moeten vier zitplaatsen in, en de deur- en
kofferklepsneden gingen niet goed.

- Maat: de sedan is 4,80–4,86 m bij 1,90–1,92 m breed en 1,50–1,52 m hoog
  (GT 4,78–4,82 × 1,98 × 1,32; SUV 4,70–4,80 × 1,93 × 1,67–1,72; stadsauto
  3,55–3,62 × 1,87 × 1,46–1,49). Dat is de maat van het model zelf (482 cm)
  en van een E-segment sedan. Niets gewijzigd.
- Vier zitplaatsen: een vierdeurs krijgt nu twee gevormde achterstoelen op
  een gedeeld kussen in plaats van de vlakke bank (die blijft in de
  tweedeurs, zodat de GT pixel-identiek blijft).
- Deuren: het raamframe hoort bij de deur en gaat nu mee. Waar een frame
  ophoudt en een stijl begint is aan het glas afgelezen: de A-stijllijn ligt
  op elke hoogte midden tussen de zijrand van de voorruit en de voorrand van
  de voorruit van het portier (0,293 L bij de belt, 0,435 L bovenaan), de
  B-stijllijn midden tussen de twee ruiten (0,526–0,539 L), en het frame
  van het achterportier draagt het kwartraam en eindigt net achter dat raam
  op de C-stijl (0,732 L). Bovenaan snijdt de daklijst op 0,968 H. Het
  kwartraam reist met het achterportier mee: de cut geeft het een `host`,
  de packer zet dat in de bibliotheek, en stage_meshDoors hangt het aan de
  deur.
- Kofferklep: de zijrand van de klep is de schouder van het dek, gemeten:
  0,80 hw aan de voorrand, naar 0,74 hw bij de staart. De vaste snede op
  0,86 hw zigzagde over de flank, die boven de belt precies tot die breedte
  intrekt, en gaf de klep gekartelde zijkanten en de hoeken boven de lampen.

### Cabine: stoelen op maat, achterbank en hoedenplank, stuur links (5 sep)

Vragen van de opdrachtgever: zijn de stoelen van alle auto's te klein, krijg
elk model een fatsoenlijke achterbank en hoedenplank zodat je door de ruiten
geen wielen ziet, en het stuur moet bij elke auto links.

- Te klein: ja. De stoel was een kussen van 44 cm breed op 6 cm boven de
  vloer, met een rugleuning van 60 cm en geen hoofdsteun. Nu: kussen 50 × 50
  cm, bovenkant 20–32 cm boven de vloer (36% van vloer-tot-belt, dus per
  familie: GT laag, SUV hoog), rugleuning 66 cm (60 in de tweedeurs, onder
  het lage dak), wangen, en een hoofdsteun op een steel. Gecontroleerd
  tegen de daklijn: 54–116 mm eronder, per familie.
- Elke auto heeft nu een gesloten cabine: vloer, schot bij de cowl, een
  achterbank over de volle breedte (twee gevormde plaatsen met hoofdsteunen
  in de vierdeurs, kussen en rugleuning in de tweedeurs), een schot achter
  de bank, een hoedenplank tot aan de voet van de achterruit (bij een
  mesh-auto de voet van haar eigen ruit, `meshExtreme` op glass.rear), en
  zijwanden over de achterste wielkasten van de laatste deur tot het schot.
  Boven de belt trekt de kabine in (tumblehome), dus wat zo hoog staat is op
  de breedte van de kas gesneden (`B.cabinHW`), niet op die van de flank.
  Alle hoeken van alle binnendelen liggen binnen de flank: 13–73 mm.
- Stuur links. De generator werkt met x vooruit, y omhoog, rechtshandig: +z
  is dan de RECHTERkant van de auto. Het commentaar bij `SIDE` zei het
  omgekeerde en het stuur stond op +z, dus rechts. Nu staat de bestuurder op
  `SIDE.l`, en `SIDE` is omgedraaid naar `{ l: -1, r: 1 }` zodat "Portier L"
  ook werkelijk het linkerportier is. Alles wat per kant gebouwd wordt is
  symmetrisch, dus dat verandert niets aan de vorm.
- De GT verandert hiermee wél (zichtbaar door het glas): 0,7–1,7% van de
  pixels per view. De GT-basislijn is daarom opnieuw gezet op deze build.

### Lichte studio-look, sedanstoelen naar voren (5 sep)

- De voorstoelen van de sedan staan 8 cm verder naar voren (`seatSet`
  0,290 naar 0,262 van de wielbasis achter de cowl).
- De look van de studio zelf is moderner gemaakt, de auto's niet: licht
  matglas over het studiogrijs in plaats van donkere platen, haarlijnen,
  pilvormige knoppen, donkere letters, de groepskleuren dieper zodat ze op
  wit leesbaar blijven, en dezelfde stijl voor de HUD, de lades
  (onderdelen, kwaliteitscheck, aanwijzen) en de laadkaart. De maten van
  de dock (padding, tussenruimte, knophoogte) zijn niet veranderd, dus de
  rooktest die op de dock klikt landt nog op dezelfde plek: 21/21 na deuken
  en na repareren, geen JS-fouten. De 3D-scène is ongewijzigd.

### Velgenbibliotheek en leesbare menu's (5 sep)

- De keuzemenu's waren slecht leesbaar: het veld was halfdoorzichtig en op
  een donker systeemthema tekende het platform de lijst in zijn eigen
  schema, grijs op grijs. Nu een dekkend wit veld met expliciete kleuren
  voor de opties (`select.c`, `option`, `optgroup`, `color-scheme: light`).
- Vijftien velgontwerpen in een catalogus (`RIMS`), per familie een paar:
  GT dubbelspaaks, vijfspaaks, blade, Y-spaak, kruisspaak; sedan tienspaaks,
  turbine, aeroschijf, zeven dubbel; SUV zesspaaks, ster, twaalfspaaks;
  stadsauto vierspaaks, bloemblad, stalen velg. Elk ontwerp is in de eigen
  maten van de velg getekend (spaakbreedte in velgstralen, diepte in
  bandbreedtes), dus hetzelfde ontwerp past op elke auto: de DNA geeft de
  velgstraal en de bandbreedte, het ontwerp het patroon. De vier waarmee de
  GT begon houden hun oorspronkelijke maten in meters, zodat het
  referentiewiel van de GT niet verandert (0 pixels verschil).
- Een menu "Velgen" in de rij Auto: standaard de eigen keuze van de auto
  (de eerste van haar lijst, of wat het zaad kiest), of elk ontwerp uit de
  catalogus op elke auto. De keuze overleeft een nieuwe variant en een
  andere familie. De zaadkeuze trekt nog steeds uit de RNG, dus de
  zaadlijst blijft staan.

### Supercar: vijfde familie, de mesh langs haar eigen vouwen gesneden (5 sep)

De opdrachtgever leverde een supercar-mesh (209 000 driehoeken, OBJ zonder
materialen) en vroeg dezelfde behandeling als de sedan en de stadsauto. Hij
staat er als vijfde familie naast de GT ("Aurelia R", middenmotor,
tweezits); de GT zelf is onveranderd (0 pixels).

```
18549_supercar_V1.obj  ->  tools/reference/cut_super.py
    schillen: één geverfde huid van 144 000 driehoeken, wielen als groepen
      (vallen af), zes diffuserlamellen als losse schillen (deel 'diffuser')
    de huid heeft geen materialen maar wél vouwen: bij 12 graden komen
      voorruit, dak, zijruiten, achterruit, portierhuiden, wielkasten,
      koplampkommen, grille, achterlichtband en spiegelhuizen los als eigen
      regio's; die krijgen hun naam op hun ligging (station, hoogte, kant)
    de rest met vlakken: neusvlak 0,035 L, bumpertop 0,45 H, bumper-achterrand
      0,11 L, kap / scherm 0,66 hw, kap-achterrand langs de voet van de
      voorruit, dorpel 0,30 H, deurstijlen 0,299 / 0,696 L (uit de
      portierregio), motorkap achter ('tailgate', de achterruit zit erin)
      0,755 L en 0,56 hw, achterbumper 0,93 L en 0,575 H
    de bodemplaat is wat naar de weg kijkt (normaal omlaag), geen hoogte:
      een vouw scheidt haar van dorpels en bumperlippen
    het model is in meters-of-zo (tien eenheden lang); de cut gaat in
      centimeters door, want de sliver-drempel van de packer is in cm²
->  pack_mesh.py  (bibliotheek 'supercar', 891 kB binair; het bestand is nu 2,5 MB)
->  studio: archetype 'supercar' (de GT-waarden waar het lichaam verborgen is,
      de eigen maten voor wielen, stand en cabine: 4,58-4,64 m, H/L 0,267,
      W/L 0,432, wielbasis 0,615 L, band 0,160 L, bandvlak 0,915 hw),
      tabellen REFX_* uit smeas.py (belt opgegeven op 0,70 H; de spiegels
      gladgestreken uit PLAN en CABIN), eigen kwaliteitspoort (cabine 40-44%
      van de lengte, motorkap 29-32%, dek 6-18 cm, achterruithoek 18-26°,
      dash-tot-as 16-22%, spoor 74-88%), velgen blade / Y / kruis / dubbel
```

Een coupé-rugleuning is nu op zijn hoofdruimte gesneden (hoofdsteun 10 cm
onder de daklijn); de GT houdt zijn 60 cm.

Gemeten: supercar QC 21/21 en geometrie ok op drie zaden; GT 0 pixels
verschil; zaadlijst identiek. Nog open: de motor staat in de generator
vooraan, ook bij deze middenmotor (de motorruimte is aan de kap gebouwd);
de deurgrepen en wissers ontbreken (niet in de mesh); het bestand is door
deze mesh 1,2 MB zwaarder.

### Middenmotor: de motorruimte volgt de lay-out (5 sep)

Openstaand punt van de supercar: de motor stond vooraan, ook bij een
middenmotor, omdat de motorruimte aan de motorkap was gebouwd.

- Het archetype zegt nu waar de motor hoort (`engineBay: 'mid'`); alle
  andere families staan op 'front' en veranderen niet.
- `stage_engine` bouwt dezelfde aankleding om het blok heen, maal een
  richting: bij een middenmotor staat het blok tussen de stoelen en de
  achteras (station 0,61 tot 0,85 van de lengte, de achteras op 0,81), en
  is de hele boel omgedraaid, zodat de poelies en de riemaandrijving naar
  de staart wijzen en de plaat de ruimte tegen het cabineschot afsluit. Het
  paneel erboven is de achterklep in plaats van de motorkap, en de
  krimpregels rekenen tegen de achterste kreukelbalk.
- Een middenmotor-tweezitter heeft geen achterbank meer: het schot staat
  direct achter de voorstoelen met een korte richel, en de ruimte
  daarachter is de motorruimte.

Gemeten: motor van de supercar op station 0,612-0,854 (stoel 0,489,
achteras 0,806), niets steekt door het paneel erboven; GT, sedan en
stadsauto onveranderd, hun motor nog op 0,11-0,40; zaadlijst identiek;
QC 21/21 op alle families behalve de bekende SUV-zaden.

### Koplampen met binnenwerk, en een metallic die spiegelt (5 sep)

Drie punten van de opdrachtgever: de supercar had geen zichtbare koplampen,
de metallic mocht veel spiegelender, en de motor moest verder naar achteren
met een schot ertussen.

- **Het binnenwerk van een lamp.** Een lamp die uit de huid gesneden is, is
  alleen een dekglas; een helder dekglas over carrosserie leest als
  carrosserie. Drie pogingen faalden en zeggen waarom: een geschaalde kopie
  van het dekglas zakt eronder (een bolle schaal die naar haar eigen midden
  krimpt, gaat naar binnen, niet naar buiten), chroom en gepolijst zwart
  komen op een bijna horizontale spatbordbovenkant wit terug (bij scherende
  hoek spiegelt alles het witte plafond van de studio), en een buis over de
  nokkenlijn liep de rand van de druppel op in plaats van het midden.
  Wat wel werkt is `lampInlay`: het lampvlak wordt langs zijn eigen hoofdas
  gesneden - via de covariantie van het vlak, want deze druppel ligt schuin
  over het spatbord - en elke plak levert het midden van het vlak op de
  hoogte van zijn nok. Daaruit komt een ingelegd element dat de omtrek van
  de lamp volgt: een reflector over de hele breedte en een lichtgevende balk
  van 13 mm hoog daarin, in een dekglas dat mat en bijna zwart is.
- Elke uit een mesh gesneden lamp krijgt dit nu, ook de lampen die al een
  chromen ring hadden: de stadsauto en de sedan lazen om dezelfde reden als
  een witte blaar. Het element schaalt mee met de vorm - hoe ronder de lamp,
  hoe breder de balk - zodat de ronde sedanlamp geen bothvorm krijgt.
- **De metallic.** De scherpte van een spiegeling zit in de ruwheid, niet in
  de omgeving: de lakruwheid staat op 0,004 en de blanke laag erover op
  0,004 tot 0,012, en de lichtbalken van de studio zijn nu als rechthoeken
  leesbaar in de flank. De metalness blijft bewust van het plafond af
  (0,52 tot 0,80), want bij metalness 1 tint een vlak alleen nog wat het
  spiegelt en kwam een blauwe auto wit terug.
- **De motor.** Staat nu op station 0,612-0,854 in plaats van 0,557-0,798,
  dus achter de stoelen (0,489) en over de achteras (0,806) heen, met de
  schotplaat en een korte hoedenplank ertussen.

Gemeten: QC 21/21 op alle families, geen JS-fouten, zaadlijst identiek
(80 varianten, 18 met bekende fouten), symmetrie ongewijzigd op 2,24 mm in
de grille. De GT-referentiebeelden zijn opnieuw vastgelegd: de lakwijziging
raakt elke auto, dus de GT verschilt van de oude basislijn in lakglans -
de vorm is pixel voor pixel dezelfde silhouet, alleen de spiegeling is
scherper.

## 4. Nieuwe designregels die ik wil voorstellen

Alleen regels met een aanwijsbare visuele of technische reden. Nog niet gebouwd.

- **Shoulder-line families** — `hoog en gespannen` (sport), `laag en recht`
  (sedan), `zwaar en hoekig` (pickup/truck). De schouderlijn bepaalt nu al de
  hele flank via `B.shoulderY`; hem als familie benoemen kost weinig en
  onderscheidt voertuigtypes onmiddellijk.
- **Greenhouse families** — `fastback`, `notchback`, `two-box`, `forward-cab`.
  Dit is de parameter die een sedan van een hatchback van een van scheidt; alles
  eromheen kan gedeeld blijven.
- **Bumper-architecturen** — `clamshell` (huidig: neus loopt door tot de
  wielkast), `split` (aparte bumper met eigen naad), `truck` (losse stalen
  bumper). De naadlogica die ik deze sessie heb gerepareerd is precies het
  gereedschap dat dit mogelijk maakt.
- **Wielkast-families** — `flush`, `flared`, `cladding` (SUV/pickup: zwarte
  kunststof rand). `B.archLip` bestaat al; er is één parameter nodig.
- **Lichtsignaturen als aparte laag** — nu zit de vorm van de koplamp vast aan
  het archetype. Als signatuur en behuizing gescheiden zijn, kan elke familie
  elke signatuur dragen.

---

## 5. Werkwijze

Inspect -> Plan -> Implement -> Generate -> Test -> Compare -> Optimize.
Na elke stap: renderen, meten, de vier controles draaien, en de grootste
resterende fout eerst. Geen tien wijzigingen zonder tussentijdse test.

## 6. Openstaand van vóór deze opdracht

Onveranderd, en niet vergeten: het paneel rond de koplamp, spikkels in het
lampinterieur, 2,24 mm restasymmetrie in de grille, en de naadspleet onder de
achterruit waar bij scherende hoek de rolbeugel zichtbaar is.
