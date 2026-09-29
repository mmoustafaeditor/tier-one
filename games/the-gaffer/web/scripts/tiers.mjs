// Semba's own ability tiers for notable players, set by the studio's designers (V2_DESIGN §3.11, studio decision:
// "real names with in-house ratings"). These are OUR judgements of level for game balance, on our own 1-99 scale.
// Nothing here is copied from any game, ratings site or data vendor. Everyone not listed gets the in-house model
// (club band × squad role × age, seeded variation) in src/sim/seed.ts.
// Row: [name as in data/seed/players.json, rating, detailed position, optional clubId when the name is ambiguous]
export const TIERS = [
  // Manchester City
  ['Erling Haaland', 91, 'ST'], ['Gianluigi Donnarumma', 87, 'GK'], ['Rúben Dias', 85, 'CB'], ['Joško Gvardiol', 85, 'CB'], ['Phil Foden', 86, 'CAM'],
  ['Rayan Cherki', 84, 'CAM'], ['Jérémy Doku', 83, 'LW'], ['Enzo Fernández', 84, 'CM'], ['Marc Guéhi', 83, 'CB'], ['Rayan Aït-Nouri', 82, 'LB'],
  ['Elliot Anderson', 83, 'CDM'], ['Antoine Semenyo', 83, 'RW'], ['Mateo Kovačić', 81, 'CM'], ['Matheus Nunes', 80, 'RB'], ["Nico O'Reilly", 80, 'LB'],
  ['Abdukodir Khusanov', 79, 'CB'], ['Rico Lewis', 80, 'RB'], ['Iliman Ndiaye', 81, 'LW'],
  // Arsenal
  ['David Raya', 87, 'GK'], ['William Saliba', 88, 'CB'], ['Gabriel Magalhães', 87, 'CB'], ['Bukayo Saka', 89, 'RW'], ['Martin Ødegaard', 87, 'CAM'],
  ['Declan Rice', 88, 'CM'], ['Martín Zubimendi', 86, 'CDM'], ['Viktor Gyökeres', 86, 'ST'], ['Eberechi Eze', 84, 'CAM'], ['Jurriën Timber', 84, 'RB'],
  ['Riccardo Calafiori', 82, 'LB'], ['Kai Havertz', 83, 'ST'], ['Noni Madueke', 82, 'RW'], ['Mikel Merino', 83, 'CM'], ['Bruno Guimarães', 86, 'CM'],
  ['Piero Hincapié', 83, 'CB'], ['Ben White', 81, 'RB'], ['Myles Lewis-Skelly', 81, 'LB'], ['Ezri Konsa', 82, 'CB'], ['Cristhian Mosquera', 80, 'CB'],
  ['Christos Tzolis', 81, 'LW'], ['Kepa Arrizabalaga', 80, 'GK'],
  // Liverpool
  ['Alisson Becker', 87, 'GK'], ['Virgil van Dijk', 87, 'CB'], ['Florian Wirtz', 88, 'CAM'], ['Alexander Isak', 88, 'ST'], ['Dominik Szoboszlai', 86, 'CM'],
  ['Alexis Mac Allister', 86, 'CM'], ['Ryan Gravenberch', 86, 'CDM'], ['Hugo Ekitike', 85, 'ST'], ['Cody Gakpo', 84, 'LW'], ['Jeremie Frimpong', 83, 'RB'],
  ['Milos Kerkez', 82, 'LB'], ['Ronald Araújo', 83, 'CB'], ['Bradley Barcola', 84, 'LW'], ['Giorgi Mamardashvili', 83, 'GK'], ['Conor Bradley', 80, 'RB'],
  ['Federico Chiesa', 80, 'RW'], ['Joe Gomez', 80, 'CB'], ['Giovanni Leoni', 78, 'CB'], ['Jérémy Jacquet', 79, 'CB'],
  // Chelsea
  ['Cole Palmer', 88, 'CAM'], ['Moisés Caicedo', 88, 'CDM'], ['Emiliano Martínez', 85, 'GK'], ['Reece James', 84, 'RB'], ['Levi Colwill', 83, 'CB'],
  ['Wesley Fofana', 81, 'CB'], ['João Pedro', 84, 'ST'], ['Pedro Neto', 83, 'RW'], ['Morgan Rogers', 84, 'CAM'], ['Jamie Gittens', 81, 'LW'],
  ['Estêvão', 83, 'RW'], ['Malo Gusto', 81, 'RB'], ['Roméo Lavia', 81, 'CDM'], ['Jorrel Hato', 80, 'LB'], ['Maxence Lacroix', 81, 'CB'],
  // Manchester United
  ['Bruno Fernandes', 86, 'CAM'], ['Bryan Mbeumo', 85, 'RW'], ['Matheus Cunha', 84, 'LW'], ['Benjamin Šeško', 82, 'ST'], ['Lisandro Martínez', 83, 'CB'],
  ['Matthijs de Ligt', 83, 'CB'], ['Leny Yoro', 81, 'CB'], ['Carlos Baleba', 82, 'CDM'], ['Kobbie Mainoo', 81, 'CM'], ['Manuel Ugarte', 81, 'CDM'],
  ['Diogo Dalot', 80, 'RB'], ['Patrick Dorgu', 79, 'LB'], ['Senne Lammens', 80, 'GK'], ['Amad Diallo', 81, 'RW'], ['Mason Mount', 79, 'CAM'],
  ['Youri Tielemans', 81, 'CM'], ['Marcus Rashford', 81, 'LW'], ['Harry Maguire', 79, 'CB'], ['Noussair Mazraoui', 79, 'RB'],
  // Tottenham
  ['Xavi Simons', 84, 'CAM'], ['Micky van de Ven', 84, 'CB'], ['Sandro Tonali', 85, 'CDM'], ['Pedro Porro', 82, 'RB'], ['Mohammed Kudus', 83, 'RW'],
  ['Omar Marmoush', 84, 'ST'], ['Dejan Kulusevski', 82, 'RW'], ['James Maddison', 82, 'CAM'], ['Dominic Solanke', 81, 'ST'], ['Andy Robertson', 80, 'LB'],
  ['Jan Paul van Hecke', 81, 'CB'], ['Lucas Bergvall', 81, 'CM'], ['Destiny Udogie', 80, 'LB'], ['Conor Gallagher', 81, 'CM'], ['Richarlison', 79, 'ST'],
  ['Antonín Kinský', 78, 'GK'], ['Marcos Senesi', 80, 'CB'], ['Rodrigo Bentancur', 80, 'CM'],
  // Newcastle, Aston Villa and the rest of England
  ['Nick Pope', 83, 'GK'], ['Sven Botman', 82, 'CB'], ['Tino Livramento', 81, 'RB'], ['Lewis Hall', 81, 'LB'], ['Yoane Wissa', 82, 'ST'],
  ['Anthony Elanga', 81, 'RW'], ['Harvey Barnes', 80, 'LW'], ['Malick Thiaw', 81, 'CB'], ['Nico González', 81, 'CDM', 'eng-newcastle'], ['Joelinton', 81, 'CM'],
  ['Jacob Ramsey', 80, 'CM'], ['Amar Dedić', 80, 'RB'],
  ['Pau Torres', 82, 'CB'], ['Boubacar Kamara', 83, 'CDM'], ['Amadou Onana', 82, 'CDM'], ['John McGinn', 81, 'CM'], ['Emiliano Buendía', 80, 'CAM'],
  ['Nicolas Jackson', 81, 'ST'], ['Alejandro Garnacho', 81, 'LW'], ['Matty Cash', 80, 'RB'], ['Ian Maatsen', 79, 'LB'], ['Leon Goretzka', 81, 'CM'],
  ['João Gomes', 81, 'CDM'], ['Zion Suzuki', 79, 'GK'], ['Tammy Abraham', 79, 'ST'],
  ['Kaoru Mitoma', 81, 'LW'], ['Adam Wharton', 82, 'CDM'], ['Morgan Gibbs-White', 83, 'CAM'], ['Murillo', 83, 'CB'], ['Jordan Pickford', 83, 'GK'],
  ['Jean-Philippe Mateta', 81, 'ST'], ['Dean Henderson', 81, 'GK'], ['Ismaïla Sarr', 80, 'RW'], ['Daniel Muñoz', 80, 'RB'], ['Dan Ndoye', 80, 'RW'],
  ['Chris Wood', 79, 'ST'], ['Justin Kluivert', 80, 'CAM'], ['Evanilson', 79, 'ST'], ['Adrien Truffert', 79, 'LB'], ['Yankuba Minteh', 79, 'RW'],
  ['Georginio Rutter', 79, 'ST'], ['Jack Grealish', 80, 'LW'], ['Rodrigo Muniz', 78, 'ST'], ['Alex Iwobi', 79, 'CAM'], ['Mikkel Damsgaard', 79, 'CAM'],
  ['Kevin Schade', 79, 'LW'], ['Enzo Le Fée', 78, 'CM'], ['Hugo Larsson', 80, 'CM'],
  // Real Madrid
  ['Kylian Mbappé', 91, 'ST'], ['Vinícius Júnior', 89, 'LW'], ['Jude Bellingham', 89, 'CAM'], ['Federico Valverde', 87, 'CM'], ['Thibaut Courtois', 88, 'GK'],
  ['Aurélien Tchouaméni', 85, 'CDM'], ['Eduardo Camavinga', 84, 'CM'], ['Arda Güler', 84, 'CAM'], ['Trent Alexander-Arnold', 85, 'RB'], ['Dean Huijsen', 84, 'CB'],
  ['Antonio Rüdiger', 83, 'CB'], ['Éder Militão', 84, 'CB'], ['Ibrahima Konaté', 85, 'CB'], ['Marc Cucurella', 83, 'LB'], ['Álvaro Carreras', 82, 'LB'],
  ['Rodrygo', 84, 'RW'], ['Bernardo Silva', 85, 'CM'], ['Endrick', 79, 'ST'], ['Brahim Díaz', 81, 'CAM'], ['Denzel Dumfries', 81, 'RB'],
  ['Raúl Asencio', 79, 'CB'], ['Ferland Mendy', 79, 'LB'], ['Andriy Lunin', 80, 'GK'],
  // Barcelona
  ['Lamine Yamal', 91, 'RW'], ['Pedri', 89, 'CM'], ['Raphinha', 87, 'LW'], ['Rodri', 88, 'CDM'], ['Frenkie de Jong', 85, 'CM'], ['Jules Koundé', 85, 'RB'],
  ['Pau Cubarsí', 84, 'CB'], ['Joan Garcia', 84, 'GK'], ['Dani Olmo', 84, 'CAM'], ['Gavi', 82, 'CM'], ['Fermín López', 83, 'CAM'], ['Alejandro Balde', 82, 'LB'],
  ['Anthony Gordon', 84, 'LW'], ['Karim Adeyemi', 81, 'RW'], ['Gabriel Jesus', 80, 'ST'], ['Eric Garcia', 80, 'CB'], ['João Cancelo', 81, 'RB'],
  ['Andreas Christensen', 80, 'CB'], ['Marc Bernal', 78, 'CDM'], ['Wojciech Szczęsny', 80, 'GK'], ['Gerard Martín', 78, 'LB'],
  // Atlético and the rest of Spain
  ['Jan Oblak', 86, 'GK'], ['Julián Alvarez', 87, 'ST'], ['Álex Baena', 84, 'CAM'], ['Koke', 80, 'CM'], ['Pablo Barrios', 82, 'CM'], ['Cristian Romero', 84, 'CB'],
  ['Dávid Hancko', 82, 'CB'], ['Robin Le Normand', 81, 'CB'], ['Marcos Llorente', 82, 'RB'], ['Alexander Sørloth', 82, 'ST'], ['Jonathan David', 83, 'ST'],
  ['Ademola Lookman', 83, 'LW'], ['Giuliano Simeone', 80, 'RW'], ['Morten Hjulmand', 82, 'CDM'], ['Johnny Cardoso', 80, 'CDM'], ['Alejandro Grimaldo', 83, 'LB'],
  ['Lee Kang-in', 81, 'CAM'], ['Juan Musso', 78, 'GK'],
  ['Nico Williams', 85, 'LW'], ['Iñaki Williams', 81, 'RW'], ['Unai Simón', 84, 'GK'], ['Dani Vivian', 81, 'CB'], ['Mikel Oyarzabal', 83, 'ST'],
  ['Takefusa Kubo', 82, 'RW'], ['Isco', 81, 'CAM'], ['Gerard Moreno', 80, 'ST'], ['Ayoze Pérez', 80, 'LW'], ['Georges Mikautadze', 80, 'ST'],
  ['Nicolas Pépé', 79, 'RW'], ['Pape Gueye', 80, 'CDM'], ['Iago Aspas', 79, 'ST'], ['Borja Iglesias', 78, 'ST'], ['Ante Budimir', 78, 'ST'],
  ['Diego Llorente', 78, 'CB'], ['Pierre-Emerick Aubameyang', 77, 'ST'],
  // Italy
  ['Lautaro Martínez', 88, 'ST'], ['Nicolò Barella', 86, 'CM'], ['Alessandro Bastoni', 86, 'CB'], ['Hakan Çalhanoğlu', 84, 'CDM'], ['Marcus Thuram', 84, 'ST'],
  ['Federico Dimarco', 84, 'LB'], ['Manuel Akanji', 83, 'CB'], ['Piotr Zieliński', 81, 'CM'], ['Yann Bisseck', 81, 'CB'], ['Benjamin Pavard', 81, 'RB'],
  ['Petar Sučić', 80, 'CM'], ['Josep Martínez', 81, 'GK'], ['Francesco Pio Esposito', 79, 'ST'], ['Ange-Yoan Bonny', 79, 'ST'], ['John Stones', 81, 'CB'],
  ['Curtis Jones', 81, 'CM'], ['Henrikh Mkhitaryan', 79, 'CM'],
  ['Kevin De Bruyne', 84, 'CAM'], ['Scott McTominay', 85, 'CM'], ['Frank Anguissa', 83, 'CM'], ['Stanislav Lobotka', 83, 'CDM'], ['Alessandro Buongiorno', 83, 'CB'],
  ['Amir Rrahmani', 81, 'CB'], ['Giovanni Di Lorenzo', 81, 'RB'], ['Rasmus Højlund', 82, 'ST'], ['David Neres', 81, 'RW'], ['Matteo Politano', 80, 'RW'],
  ['Alex Meret', 81, 'GK'], ['Vanja Milinković-Savić', 82, 'GK'], ['Sam Beukema', 81, 'CB'], ['Mathías Olivera', 80, 'LB'], ['Billy Gilmour', 80, 'CM'], ['Noa Lang', 81, 'LW'],
  ['Kenan Yıldız', 85, 'LW'], ['Bremer', 84, 'CB'], ['Teun Koopmeiners', 82, 'CM'], ['Manuel Locatelli', 82, 'CDM'], ['Khéphren Thuram', 82, 'CM'],
  ['Andrea Cambiaso', 82, 'LB'], ['Francisco Conceição', 81, 'RW'], ['Edon Zhegrova', 81, 'RW'], ['Randal Kolo Muani', 81, 'ST'], ['Nick Woltemade', 81, 'ST'],
  ['Pierre Kalulu', 81, 'CB'], ['Federico Gatti', 80, 'CB'], ['Weston McKennie', 80, 'CM'], ['Guglielmo Vicario', 83, 'GK'], ['Pape Matar Sarr', 81, 'CM'], ['Jhon Lucumí', 80, 'CB'],
  ['Mike Maignan', 86, 'GK'], ['Christian Pulisic', 84, 'RW'], ['Luka Modrić', 82, 'CM'], ['Adrien Rabiot', 83, 'CM'], ['Fikayo Tomori', 81, 'CB'],
  ['Strahinja Pavlović', 81, 'CB'], ['Pervis Estupiñán', 80, 'LB'], ['Gonçalo Ramos', 81, 'ST'], ['Ardon Jashari', 81, 'CDM'], ['Alexis Saelemaekers', 80, 'RB'],
  ['Nico Paz', 83, 'CAM'], ['Moise Kean', 82, 'ST'], ['Martin Baturina', 80, 'CAM'], ['Assane Diao', 79, 'LW'], ['Charles De Ketelaere', 83, 'CAM'],
  ['Paulo Dybala', 81, 'CAM'], ['Evan Ndicka', 81, 'CB'], ['Mattia Zaccagni', 80, 'LW'], ['Albert Guðmundsson', 81, 'CAM'], ['Riccardo Orsolini', 80, 'RW'],
  ['Lewis Ferguson', 80, 'CM'], ['Artem Dovbyk', 80, 'ST'], ['Beto', 77, 'ST'],
  // Germany
  ['Harry Kane', 90, 'ST'], ['Jamal Musiala', 89, 'CAM'], ['Michael Olise', 88, 'RW'], ['Joshua Kimmich', 87, 'CDM'], ['Luis Díaz', 86, 'LW'],
  ['Dayot Upamecano', 85, 'CB'], ['Jonathan Tah', 84, 'CB'], ['Kim Min-jae', 83, 'CB'], ['Alphonso Davies', 84, 'LB'], ['Manuel Neuer', 84, 'GK'],
  ['Konrad Laimer', 82, 'RB'], ['Aleksandar Pavlović', 84, 'CM'], ['Serge Gnabry', 82, 'RW'], ['Josip Stanišić', 81, 'RB'], ['Hiroki Itō', 81, 'LB'],
  ['Tom Bischof', 80, 'CM'], ['Lennart Karl', 78, 'CAM'], ['Jonas Urbig', 79, 'GK'],
  ['Malik Tillman', 82, 'CAM'], ['Edmond Tapsoba', 82, 'CB'], ['Patrik Schick', 82, 'ST'], ['Aleix García', 81, 'CM'], ['Robert Andrich', 81, 'CDM'],
  ['Mark Flekken', 81, 'GK'], ['Jarell Quansah', 81, 'CB'], ['Loïc Badé', 80, 'CB'], ['Martin Terrier', 80, 'LW'], ['Victor Boniface', 81, 'ST'], ['Ibrahim Maza', 80, 'CAM'],
  ['Gregor Kobel', 86, 'GK'], ['Nico Schlotterbeck', 84, 'CB'], ['Serhou Guirassy', 85, 'ST'], ['Jobe Bellingham', 81, 'CM'], ['Felix Nmecha', 82, 'CM'],
  ['Julian Ryerson', 80, 'RB'], ['Waldemar Anton', 80, 'CB'], ['Maximilian Beier', 80, 'ST'], ['Marcel Sabitzer', 80, 'CM'], ['Ethan Nwaneri', 81, 'CAM'],
  ['Deniz Undav', 82, 'ST'], ['Ermedin Demirović', 80, 'ST'], ['Angelo Stiller', 82, 'CDM'], ['Chris Führich', 79, 'LW'], ['Can Uzun', 80, 'CAM'],
  ['Christopher Nkunku', 81, 'ST'], ['Andrej Kramarić', 79, 'ST'], ['Vincenzo Grifo', 79, 'LW'], ['Tim Kleindienst', 79, 'ST'],
  // France
  ['Ousmane Dembélé', 90, 'RW'], ['Khvicha Kvaratskhelia', 88, 'LW'], ['Vitinha', 88, 'CM', 'fra-psg'], ['João Neves', 87, 'CM'], ['Achraf Hakimi', 87, 'RB'],
  ['Nuno Mendes', 86, 'LB'], ['Marquinhos', 85, 'CB'], ['Willian Pacho', 85, 'CB'], ['Désiré Doué', 85, 'RW'], ['Fabián Ruiz', 84, 'CM'],
  ['Warren Zaïre-Emery', 82, 'CM'], ['Lucas Chevalier', 84, 'GK'], ['Lucas Hernandez', 82, 'CB'], ['Ferran Torres', 82, 'ST'], ['Illia Zabarnyi', 81, 'CB'],
  ['Maghnes Akliouche', 81, 'CAM'], ['Matvey Safonov', 80, 'GK'],
  ['Amine Gouiri', 81, 'ST'], ['Aleksandr Golovin', 80, 'CAM'], ['Folarin Balogun', 80, 'ST'], ['Mika Biereth', 79, 'ST'], ['Olivier Giroud', 77, 'ST'],
  ['Loïs Openda', 81, 'ST'], ['Corentin Tolisso', 79, 'CM'], ['Jonathan Clauss', 78, 'RB'], ['Esteban Lepaul', 78, 'ST'],
  // Saudi Arabia
  ['Cristiano Ronaldo', 84, 'ST'], ['Sadio Mané', 80, 'LW'], ['João Félix', 81, 'CAM'], ['Kingsley Coman', 81, 'RW'], ['Iñigo Martínez', 80, 'CB'],
  ['Bento', 80, 'GK'], ['Mohamed Simakan', 80, 'CB'], ['Rúben Neves', 82, 'CDM'], ['Sergej Milinković-Savić', 82, 'CM'], ['Kalidou Koulibaly', 79, 'CB'],
  ['Yassine Bounou', 83, 'GK'], ['Théo Hernandez', 83, 'LB'], ['Gabriel Martinelli', 83, 'LW'], ['Ollie Watkins', 83, 'ST'], ['Crysencio Summerville', 80, 'RW'],
  ['Salem Al-Dawsari', 77, 'LW'], ['Youssef En-Nesyri', 81, 'ST'], ['Houssem Aouar', 80, 'CAM'], ['Steven Bergwijn', 78, 'RW'], ['Predrag Rajković', 79, 'GK'],
  ['Ivan Toney', 83, 'ST'], ['Édouard Mendy', 81, 'GK'], ['Merih Demiral', 80, 'CB'], ['Roger Ibañez', 80, 'CB'], ['Francisco Trincão', 81, 'RW'], ['Galeno', 80, 'LW'],
  ['Mateo Retegui', 80, 'ST'],
  // Egypt
  ['Mohamed El Shenawy', 75, 'GK'], ['Emam Ashour', 78, 'CM'], ['Afsha', 75, 'CAM'], ['Achraf Dari', 76, 'CB'], ['Mostafa Shobeir', 74, 'GK'], ['Zizo', 77, 'RW'],
  ['Taher Mohamed', 73, 'LW'], ['Hussein El Shahat', 72, 'RW'], ['Yasser Ibrahim', 73, 'CB'], ['Nasser Mansi', 73, 'ST'], ['Abdallah El Said', 70, 'CAM'],
  ['Ahmed El Shenawy', 74, 'GK'], ['Mostafa Fathi', 74, 'RW'], ['Walid El Karti', 74, 'CM'], ['Nadhir Benbouali', 75, 'ST'], ['Mohanad Lasheen', 73, 'CDM'], ['Zalaka', 74, 'LW'],
];
