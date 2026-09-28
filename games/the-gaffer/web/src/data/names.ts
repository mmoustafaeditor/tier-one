// Name pools for generated players, as [English, Arabic] pairs so every player reads right in both languages.
// Arab pools use common Egyptian, Gulf and Maghreb names (the old game's players were Arabic-first).
import type { LocalizedName } from '../model/types';

type Pair = [string, string];
interface Pool { first: Pair[]; last: Pair[] }

const P = (s: string): Pair[] => s.split('|').map((x) => x.split('=') as Pair);

const POOLS: Record<string, Pool> = {
  ENG: {
    first: P('Harry=هاري|Jack=جاك|James=جيمس|Oliver=أوليفر|George=جورج|Charlie=تشارلي|Jordan=جوردان|Mason=ماسون|Declan=ديكلان|Reece=ريس|Kyle=كايل|Luke=لوك|Aaron=آرون|Ben=بن|Callum=كالوم|Marcus=ماركوس|Conor=كونور|Ollie=أولي|Tom=توم|Jarrod=جارود'),
    last: P('Walker=ووكر|Stones=ستونز|Rice=رايس|Mount=ماونت|Foden=فودن|Shaw=شو|Pickford=بيكفورد|Henderson=هندرسون|Grealish=غريليش|Bowen=بوين|Watkins=واتكينز|Gordon=غوردون|Palmer=بالمر|Gallagher=غالاغر|Trippier=تريبييه|Maguire=ماغواير|Chilwell=تشيلويل|Wharton=وارتون|Eze=إيزي|Branthwaite=برانثويت|Colwill=كولويل|Madders=ماديرز|Sancho=سانشو|Toney=توني|Ramsdale=رامسديل'),
  },
  ESP: {
    first: P('Pablo=بابلو|Álvaro=ألفارو|Sergio=سيرخيو|Dani=داني|Pedro=بيدرو|Mikel=ميكيل|Iker=إيكر|Rodrigo=رودريغو|Marcos=ماركوس|Fermín=فيرمين|Nico=نيكو|Unai=أوناي|Aitor=أيتور|Raúl=راؤول|Javi=خافي|Adrián=أدريان|Carlos=كارلوس|Hugo=هوغو|Alejandro=أليخاندرو|Ferran=فيران'),
    last: P('García=غارسيا|Fernández=فيرنانديز|López=لوبيز|Martínez=مارتينيز|Sánchez=سانشيز|Pérez=بيريز|Gómez=غوميز|Ruiz=رويز|Díaz=دياز|Moreno=مورينو|Muñoz=مونيوز|Romero=روميرو|Navarro=نافارو|Torres=توريس|Ramos=راموس|Olmo=أولمو|Merino=ميرينو|Zubimendi=زوبيميندي|Oyarzabal=أويارزابال|Carvajal=كارفاخال|Cucurella=كوكوريا|Baena=باينا|Iglesias=إغليسياس|Vivian=فيفيان|Raya=رايا'),
  },
  ITA: {
    first: P('Federico=فيديريكو|Lorenzo=لورينزو|Nicolò=نيكولو|Alessandro=أليساندرو|Davide=دافيدي|Matteo=ماتيو|Giacomo=جياكومو|Andrea=أندريا|Gianluca=جيانلوكا|Riccardo=ريكاردو|Sandro=ساندرو|Moise=مويس|Mattia=ماتيا|Francesco=فرانشيسكو|Marco=ماركو|Giovanni=جيوفاني|Simone=سيموني|Luca=لوكا|Daniele=دانييلي|Samuele=صامويلي'),
    last: P('Rossi=روسي|Bianchi=بيانكي|Barella=باريلا|Chiesa=كييزا|Bastoni=باستوني|Tonali=تونالي|Frattesi=فراتيسي|Retegui=ريتيغي|Scamacca=سكاماكا|Calafiori=كالافيوري|Dimarco=ديماركو|Buongiorno=بونجورنو|Donnarumma=دوناروما|Vicario=فيكاريو|Pellegrini=بيليغريني|Raspadori=راسبادوري|Locatelli=لوكاتيلي|Cambiaso=كامبياسو|Esposito=إسبوزيتو|Ricci=ريتشي|Colombo=كولومبو|Mancini=مانشيني|Gatti=غاتي|Udogie=أودوجي|Orsolini=أورسوليني'),
  },
  GER: {
    first: P('Florian=فلوريان|Jamal=جمال|Joshua=جوشوا|Leon=ليون|Kai=كاي|Niklas=نيكلاس|Jonathan=جوناثان|Maximilian=ماكسيميليان|Robin=روبن|David=دافيد|Marc-André=مارك أندريه|Antonio=أنطونيو|Pascal=باسكال|Aleksandar=ألكسندر|Julian=يوليان|Felix=فيليكس|Nico=نيكو|Tim=تيم|Deniz=دينيز|Chris=كريس'),
    last: P('Müller=مولر|Schmidt=شميت|Schneider=شنايدر|Fischer=فيشر|Weber=فيبر|Wagner=فاغنر|Becker=بيكر|Hoffmann=هوفمان|Kimmich=كيميتش|Goretzka=غوريتسكا|Havertz=هافيرتز|Sané=ساني|Gnabry=غنابري|Rüdiger=روديغر|Tah=تاه|Raum=راوم|Schlotterbeck=شلوتربيك|Wirtz=فيرتز|Musiala=موسيالا|Füllkrug=فولكروغ|Undav=أونداف|Andrich=أندريش|Groß=غروس|Mittelstädt=ميتلشتيت|Baumann=باومان'),
  },
  FRA: {
    first: P('Kylian=كيليان|Antoine=أنطوان|Ousmane=عثمان|Aurélien=أوريليان|Eduardo=إدواردو|Jules=جول|Théo=تيو|William=ويليام|Dayot=دايو|Randal=راندال|Marcus=ماركوس|Bradley=برادلي|Michael=مايكل|Warren=وارين|Désiré=ديزيريه|Mike=مايك|Lucas=لوكاس|Adrien=أدريان|Maxence=ماكسنس|Rayan=ريان'),
    last: P('Martin=مارتان|Bernard=برنار|Dubois=دوبوا|Thomas=توما|Robert=روبير|Richard=ريشار|Petit=بوتي|Durand=دوران|Leroy=لوروا|Moreau=مورو|Simon=سيمون|Laurent=لوران|Lefebvre=لوفيفر|Michel=ميشيل|Kolo=كولو|Koundé=كوندي|Saliba=صليبا|Konaté=كوناتي|Upamecano=أوباميكانو|Camavinga=كامافينغا|Rabiot=رابيو|Olise=أوليس|Barcola=باركولا|Doué=دويه|Maignan=مينيان'),
  },
  POR: {
    first: P('João=جواو|Rúben=روبن|Bernardo=برناردو|Diogo=ديوغو|Rafael=رافاييل|Gonçalo=غونسالو|Nuno=نونو|Vitinha=فيتينيا|Pedro=بيدرو|Francisco=فرانسيسكو|Gabriel=غابرييل|Vinícius=فينيسيوس|Lucas=لوكاس|Bruno=برونو|Matheus=ماتيوس|Thiago=تياغو|Rodrygo=رودريغو|Endrick=إندريك|André=أندريه|Éder=إيدير'),
    last: P('Silva=سيلفا|Santos=سانتوس|Costa=كوستا|Pereira=بيريرا|Oliveira=أوليفيرا|Rodrigues=رودريغيز|Ferreira=فيريرا|Almeida=ألميدا|Carvalho=كارفاليو|Gomes=غوميز|Dias=دياز|Neves=نيفيز|Leão=لياو|Ramos=راموس|Mendes=منديز|Cancelo=كانسيلو|Palhinha=باليينيا|Martinelli=مارتينيلي|Paquetá=باكيتا|Guimarães=غيماريش|Marquinhos=ماركينيوس|Militão=ميليتاو|Raphinha=رافينيا|Alisson=أليسون|Casemiro=كاسيميرو'),
  },
  AFR: {
    first: P('Sadio=ساديو|Ismaïla=إسماعيلا|Kalidou=كاليدو|Victor=فيكتور|Samuel=صامويل|Wilfred=ويلفريد|Serge=سيرج|Franck=فرانك|Moussa=موسى|Idrissa=إدريسا|Amadou=أمادو|Nicolas=نيكولا|Ademola=أديمولا|Alex=أليكس|Bamba=بامبا|Yves=إيف|Thomas=توماس|Iliman=إليمان|Pape=باب|Simon=سيمون'),
    last: P('Mané=ماني|Sarr=سار|Koulibaly=كوليبالي|Osimhen=أوسيمين|Chukwueze=تشوكويزي|Ndidi=نديدي|Kessié=كيسيه|Diallo=ديالو|Traoré=تراوري|Gueye=غي|Ndiaye=نداي|Pépé=بيبيه|Lookman=لوكمان|Iwobi=إيوبي|Dieng=دينغ|Bissouma=بيسوما|Partey=بارتي|Kudus=قدوس|Semenyo=سيمينيو|Onana=أونانا|Aboubakar=أبو بكر|Zaha=زاها|Adingra=أدينغرا|Boniface=بونيفاس|Diatta=دياتا'),
  },
  ARAB: {
    first: P('Mohamed=محمد|Ahmed=أحمد|Mahmoud=محمود|Mostafa=مصطفى|Omar=عمر|Ali=علي|Youssef=يوسف|Karim=كريم|Hossam=حسام|Tarek=طارق|Marwan=مروان|Ziad=زياد|Ashraf=أشرف|Ayman=أيمن|Islam=إسلام|Hamdi=حمدي|Emam=إمام|Salem=سالم|Nawaf=نواف|Saud=سعود|Fahad=فهد|Salman=سلمان|Abdullah=عبدالله|Hassan=حسن|Khaled=خالد|Mohannad=مهند|Sherif=شريف|Essam=عصام|Hamed=حامد|Nasser=ناصر'),
    last: P('Salaah=صلاح|El Shenawy=الشناوي|Zaghloul=زغلول|Shalaby=شلبي|Abdel Moneim=عبد المنعم|Hegazy=حجازي|Ashour=عاشور|Trezeguet=تريزيجيه|Marmoush=مرموش|Fathy=فتحي|Hamdy=حمدي|Zizo=زيزو|Shehata=شحاتة|Gomaa=جمعة|Kahraba=كهربا|Afsha=أفشة|El Said=السعيد|Rabia=ربيعة|Elneny=النني|Mohsen=محسن|Al Dawsari=الدوسري|Al Shehri=الشهري|Al Owais=العويس|Al Buraikan=البريكان|Kanno=كنو|Al Faraj=الفرج|Al Bulaihi=البليهي|Al Ghannam=الغنام|Afif=عفيف|Almoez Ali=المعز علي|Al Haydos=الهيدوس|Mabkhout=مبخوت|Al Hammadi=الحمادي|Barsham=برشم|Tambakti=تمبكتي|Gaber=جابر|Soliman=سليمان|Radwan=رضوان|Farouk=فاروق|Sobhi=صبحي'),
  },
  MAGHREB: {
    first: P('Achraf=أشرف|Hakim=حكيم|Youssef=يوسف|Sofyan=سفيان|Azzedine=عز الدين|Nayef=نايف|Brahim=إبراهيم|Bilal=بلال|Riyad=رياض|Islam=إسلام|Ismaël=إسماعيل|Rami=رامي|Aïssa=عيسى|Houssem=حسام|Ellyes=إلياس|Wahbi=وهبي|Anis=أنيس|Hannibal=حنبعل|Youcef=يوسف|Amine=أمين'),
    last: P('Hakimi=حكيمي|Ziyech=زياش|En-Nesyri=النصيري|Amrabat=أمرابط|Ounahi=أوناحي|Aguerd=أكرد|Bounou=بونو|Mazraoui=مزراوي|Saïss=سايس|Díaz=دياز|Mahrez=محرز|Bennacer=بن ناصر|Slimani=سليماني|Bensebaini=بن سبعيني|Aouar=عوار|Mandi=ماندي|Atal=عطال|Gouiri=قويري|Belaïli=بلايلي|Msakni=المساكني|Skhiri=السخيري|Khazri=الخزري|Laïdouni=العيدوني|Talbi=الطالبي|Mejbri=المجبري'),
  },
};

// Which pool a nationality draws from.
const POOL_OF: Record<string, string> = {
  ENG: 'ENG', ESP: 'ESP', ARG: 'ESP', ITA: 'ITA', GER: 'GER', AUT: 'GER', FRA: 'FRA', BEL: 'FRA',
  POR: 'POR', BRA: 'POR', SEN: 'AFR', NGA: 'AFR', CIV: 'AFR', GHA: 'AFR', CMR: 'AFR',
  EGY: 'ARAB', KSA: 'ARAB', UAE: 'ARAB', QAT: 'ARAB', MAR: 'MAGHREB', TUN: 'MAGHREB', ALG: 'MAGHREB',
};

export function playerName(nationality: string, rand: () => number): LocalizedName {
  const pool = POOLS[POOL_OF[nationality] ?? 'ENG'];
  const f = pool.first[Math.floor(rand() * pool.first.length)];
  const l = pool.last[Math.floor(rand() * pool.last.length)];
  // Short form like a team sheet: "M. Salaah" / "م. صلاح".
  return { en: `${f[0][0]}. ${l[0]}`, ar: `${f[1][0]}. ${l[1]}` };
}

// Where foreign players in each country's league come from.
export const FOREIGN_NATIONS: Record<string, string[]> = {
  ENG: ['FRA', 'ESP', 'POR', 'BRA', 'GER', 'SEN', 'NGA', 'GHA', 'BEL', 'ARG', 'EGY', 'MAR'],
  ESP: ['ARG', 'BRA', 'FRA', 'POR', 'MAR', 'SEN', 'GER', 'ITA'],
  ITA: ['BRA', 'ARG', 'FRA', 'SEN', 'NGA', 'ESP', 'POR', 'GER', 'MAR'],
  GER: ['FRA', 'AUT', 'POR', 'BRA', 'CIV', 'CMR', 'ESP', 'ENG'],
  FRA: ['SEN', 'CIV', 'CMR', 'MAR', 'ALG', 'TUN', 'BRA', 'POR', 'BEL'],
  EGY: ['TUN', 'MAR', 'ALG', 'NGA', 'GHA', 'CMR'],
  KSA: ['BRA', 'POR', 'FRA', 'SEN', 'EGY', 'MAR', 'ALG', 'ESP'],
  MAR: ['ALG', 'TUN', 'SEN', 'CIV', 'CMR'],
  TUN: ['ALG', 'MAR', 'SEN', 'CIV', 'EGY'],
  ALG: ['TUN', 'MAR', 'SEN', 'CMR', 'CIV'],
  UAE: ['BRA', 'POR', 'MAR', 'EGY', 'SEN', 'ARG'],
  QAT: ['BRA', 'ALG', 'MAR', 'POR', 'ESP', 'EGY', 'GHA'],
};

// Flags for the nationalities used above.
export const FLAG: Record<string, string> = {
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', ITA: '🇮🇹', GER: '🇩🇪', FRA: '🇫🇷', POR: '🇵🇹', BRA: '🇧🇷', ARG: '🇦🇷', BEL: '🇧🇪', AUT: '🇦🇹',
  SEN: '🇸🇳', NGA: '🇳🇬', CIV: '🇨🇮', GHA: '🇬🇭', CMR: '🇨🇲',
  EGY: '🇪🇬', KSA: '🇸🇦', UAE: '🇦🇪', QAT: '🇶🇦', MAR: '🇲🇦', TUN: '🇹🇳', ALG: '🇩🇿',
  NED: '🇳🇱', NOR: '🇳🇴', ECU: '🇪🇨', KOR: '🇰🇷', URU: '🇺🇾', POL: '🇵🇱', SVN: '🇸🇮', GEO: '🇬🇪', SRB: '🇷🇸', SUI: '🇨🇭', GUI: '🇬🇳', PLE: '🇵🇸', COD: '🇨🇩',
};
