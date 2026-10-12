import { LevelConfig } from '../types/game';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: 1,
    nameTr: '1. Bölüm: Seddülbahir & Ertuğrul Koyu',
    locationTr: 'Seddülbahir Cephesi - Yarımada Güneyi',
    historicalDateTr: '25 Nisan 1915',
    descriptionTr: 'İngiliz donanmasının yoğun top ateşi altında Ertuğrul Koyu ve İkiz Koyu sahiline çıkan düşman birliklerine karşı Yahya Çavuş ve kahraman takımının ilk savunma hattını kur.',
    loreTr: '"Bir kahraman takım ve de yahşi oymak / Vefasız düşmana kurşun yağdırdı..." - Yahya Çavuş\'un 63 Mehmetçikle binlerce kişilik düşman alayını saatlerce durdurduğu destansı sahil hattı.',
    worldWidth: 12000,
    daysToWin: 4,
    baseEnemyMultiplier: 1.0,
    navalSupportAllowed: false,
    startingMecidiye: 0,
    relicsAvailable: [
      {
        id: 'statue_damage_1',
        titleTr: '🇹🇷 57. Alay & Mustafa Kemal Anıtı (Taarruz Yadigârı)',
        descriptionTr: 'Manevi taarruz azmi: Tüm Mehmetçiklerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir ve izli mermi kazandırır.',
        x: 1400,
      },
      {
        id: 'statue_health_1',
        titleTr: '🌙 Hilal-i Ahmer Şifa Anıtı (Can Yadigârı)',
        descriptionTr: 'Şefkat ve şifa: Bütün Mehmetçiklerin ve kumandanın azami canını %40 artırır ve yaralarını sarar.',
        x: 10600,
      }
    ]
  },
  {
    id: 2,
    nameTr: '2. Bölüm: Arıburnu & Kanlısırt',
    locationTr: 'Arıburnu - Anzak Koyu Sırtları',
    historicalDateTr: 'Mayıs 1915',
    descriptionTr: 'Sarp yamaçlar, derin dereler ve siperler arası mesafenin 8-10 metreye indiği Kanlısırt ve Cesarettepe\'de makineli tüfek yuvalarını ve dikenli telleri kurarak gece baskınlarını püskürt.',
    loreTr: '"Siperler arası mesafe sekiz metre... İlk siperdekilerin hiçbiri kurtulmamacasına şehit oluyor, ikinci siperdekiler onların yerine giriyor..." - Kanlısırt Siper Muharebeleri.',
    worldWidth: 14000,
    daysToWin: 5,
    baseEnemyMultiplier: 1.4,
    navalSupportAllowed: false,
    startingMecidiye: 4,
    relicsAvailable: [
      {
        id: 'statue_defense_2',
        titleTr: '🛡️ Çanakkale İstihkâm & Savunma Anıtı',
        descriptionTr: 'Sağlam tahkimat: Bütün mevzi, siper ve binaların azami dayanıklılığını %50 artırır ve mevcut hasarları onarır.',
        x: 1600,
      },
      {
        id: 'statue_damage_2',
        titleTr: '🇹🇷 57. Alay & Mustafa Kemal Anıtı (Taarruz Yadigârı)',
        descriptionTr: 'Manevi taarruz azmi: Tüm Mehmetçiklerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir ve izli mermi kazandırır.',
        x: 12400,
      }
    ]
  },
  {
    id: 3,
    nameTr: '3. Bölüm: Conkbayırı Zirvesi',
    locationTr: 'Conkbayırı & Kocaçimen Tepesi',
    historicalDateTr: '10 Ağustos 1915',
    descriptionTr: 'Yarımadanın kilit noktası olan Conkbayırı zirvesini tut! Mustafa Kemal\'in komutasında şafak vakti yapılacak süngü hücumuna kadar düşmanın amansız gece taarruzlarına dayan.',
    loreTr: '"Ben size taarruzu emretmiyorum, ölmeyi emrediyorum! Biz ölünceye kadar geçecek zaman zarfında yerimize başka kuvvetler ve kumandanlar gelecektir." - Anafartalar Grubu Komutanı Kurmay Albay Mustafa Kemal.',
    worldWidth: 16000,
    daysToWin: 6,
    baseEnemyMultiplier: 1.8,
    navalSupportAllowed: true,
    startingMecidiye: 8,
    relicsAvailable: [
      {
        id: 'statue_health_3',
        titleTr: '🌙 Hilal-i Ahmer Şifa Anıtı (Can Yadigârı)',
        descriptionTr: 'Şefkat ve şifa: Bütün Mehmetçiklerin ve kumandanın azami canını %40 artırır ve yaralarını sarar.',
        x: 1800,
      },
      {
        id: 'statue_defense_3',
        titleTr: '🛡️ Çanakkale İstihkâm & Savunma Anıtı',
        descriptionTr: 'Sağlam tahkimat: Bütün mevzi, siper ve binaların azami dayanıklılığını %50 artırır ve mevcut hasarları onarır.',
        x: 14200,
      }
    ]
  },
  {
    id: 4,
    nameTr: '4. Bölüm: Anafartalar Zaferi',
    locationTr: 'Anafartalar Ovası & Kireçtepe',
    historicalDateTr: 'Ağustos - Aralık 1915',
    descriptionTr: 'İtilaf devletlerinin tüm zırhlı ve taze kuvvetlerle başlattığı son büyük genel taarruza karşı tüm cepheyi tahkim et ve Çanakkale\'nin asla geçilemeyeceğini tarihe altın harflerle yazdır!',
    loreTr: 'Çanakkale Boğazı ve Gelibolu Yarımadası\'nın ebedi Türk yurdu olarak müdafaa edildiği ve düşmanın geri çekilmek zorunda kaldığı nihai tarihi zafer.',
    worldWidth: 18000,
    daysToWin: 7,
    baseEnemyMultiplier: 2.2,
    navalSupportAllowed: true,
    startingMecidiye: 12,
    relicsAvailable: [
      {
        id: 'statue_damage_4',
        titleTr: '🇹🇷 57. Alay & Mustafa Kemal Anıtı (Taarruz Yadigârı)',
        descriptionTr: 'Manevi taarruz azmi: Tüm Mehmetçiklerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir ve izli mermi kazandırır.',
        x: 2000,
      },
      {
        id: 'statue_defense_4',
        titleTr: '🛡️ Çanakkale İstihkâm & Savunma Anıtı',
        descriptionTr: 'Sağlam tahkimat: Bütün mevzi, siper ve binaların azami dayanıklılığını %50 artırır ve mevcut hasarları onarır.',
        x: 16000,
      }
    ]
  }
];

export const HISTORICAL_CODEX = [
  {
    title: 'Seyit Onbaşı (Seyit Ali Çabuk)',
    tag: 'Kahraman Topçu',
    text: '18 Mart 1915 Boğaz Muharebesi\'nde Mecidiye Tabyası\'nda topun vinci bozulunca, 276 kilogramlık devasa top mermisini tek başına sırtlayarak namluya sürmüş ve Ocean zırhlısını dümeninden vurarak saf dışı bırakmıştır.'
  },
  {
    title: '57. Piyade Alayı',
    tag: 'Efsanevi Birlik',
    text: 'Mustafa Kemal\'in "Ben size taarruzu değil, ölmeyi emrediyorum" emriyle Arıburnu ve Conkbayırı\'na koşan ve sancağını yere düşürmeden tamamı şehit düşen efsanevi alayımız.'
  },
  {
    title: 'Yahya Çavuş ve Takımı',
    tag: 'Ertuğrul Koyu Müdafaası',
    text: 'Ertuğrul Koyu\'na çıkarma yapan 3000 kişilik İngiliz tümenine karşı 63 askeriyle 10 saat boyunca siperleri savunmuş ve düşmana ağır kayıplar verdirerek çıkarmayı felç etmiştir.'
  },
  {
    title: 'Nusret Mayın Gemisi',
    tag: 'Boğazın Muhafızı',
    text: 'Yüzbaşı Tophaneli Hakkı Bey komutasında 8 Mart gecesi Karanlık Liman\'a kıyıya paralel olarak döşediği 26 mayın ile Bouvet, Irresistible ve Ocean zırhlılarını batırarak 18 Mart zaferinin mimarı olmuştur.'
  },
  {
    title: 'Hilal-i Ahmer (Kızılay) Sahra Çadırları',
    tag: 'Cephe Tıbbiyesi',
    text: 'Çanakkale sırtlarında kurulan çadır hastaneleri, ağır bombardıman altında gece gündüz demeden on binlerce yaralı askeri tedavi etmiş ve insanlık dersi vermiştir.'
  },
  {
    title: 'Mauser 1893 ve Osmanlı Siperleri',
    tag: 'Dönemin Silahları',
    text: '7.65mm mühimmat kullanan Türk Mauser tüfekleri, sağlam mekanizması ve yüksek isabetiyle Mehmetçik\'in siper muharebelerindeki en güvenilir yoldaşı olmuştur.'
  }
];
