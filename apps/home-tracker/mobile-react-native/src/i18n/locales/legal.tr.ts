import type { LegalTexts } from './en';

const legal: LegalTexts = {
  updated: 'Son güncelleme: 25 Kasım 2026',
  privacy: [
    {
      title: 'Veri sorumlusu',
      text: 'Evlog’u işleten {{operator}} (“biz”), 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusudur.\nİletişim: {{email}}',
    },
    {
      title: 'Hangi verileri saklıyoruz',
      text: '• Hesap: adınız, e-postanız ve parolanızın geri döndürülemez özeti (parolanın kendisi asla).\n• Oturumlar: her cihazın ne zaman giriş yaptığı, uygulama veya tarayıcı adı ve oturum anahtarının özeti.\n• Evler: adres, oda sayısı, alan, evin sahibinin ve kiracısının kim olduğu ve ne zamandan beri.\n• Durum kayıtları: fotoğraflar, oda, telefonunuzun ve sunucumuzun kaydettiği zaman, her fotoğrafın parmak izi, notlar ve kaydı kimin onayladığı.\n• Fişler ve faturalar: fotoğraf ve ondan okunan mağaza, tarih, tutar, ürünler gibi bilgiler.\n• Puanlar: verdiğiniz puanlar, notunuz ve bunları destekleyen fişleriniz.\n• İlanlar: bağladığınız sahibinden.com ilanı, paylaşmayı seçtikleriniz ve eklediğiniz emlakçıların ofis adı ve e-postası.\n• Mutfak ve bakım: ürünler, fiyatlar, alışveriş listesi, cihazlar ve bakımları.\n• Bildirimler: neyi, neden bildirdiğiniz.',
    },
    {
      title: 'Konum ve cihaz verileri',
      text: 'Fotoğraflar yüklenmeden önce telefonunuzda yeniden kodlanır; bu, içlerindeki konum bilgisini kaldırır. Uygulama konumunuzu istemez, reklam göstermez ve reklam kimliği kullanmaz.',
    },
    {
      title: 'İşleme amaçları ve hukuki sebepler',
      text: '• Kaydolduğunuz hizmeti sunmak: hesabınız, kayıtlar, fişler, puanlar ve paylaşım (KVKK m. 5/2-c, sözleşmenin ifası).\n• Evlog’u güvende tutmak: giriş koruması, istek sınırları ve bildirilen içeriğin incelenmesi (m. 5/2-f, meşru menfaat).\n• Hukuki yükümlülükleri yerine getirmek, bir hakkı tesis etmek veya savunmak (m. 5/2-ç ve 5/2-e).\n• Anonim kullanım verisi: yalnızca Ayarlar’dan verip geri alabileceğiniz açık rızanızla (m. 5/1). Yalnızca özellik adlarını kaydeder ve siz açana kadar kapalıdır.',
    },
    {
      title: 'Kim neyi görebilir',
      text: '• Fiş fotoğrafları: yalnızca siz.\n• Ev, durum kayıtları, mutfak ve bakım: ev sahibi ve mevcut kiracı. Bir eve eklediğiniz market fişlerindeki ürün ve fiyatlar o evin mutfağının parçasıdır.\n• Puanlar: ev sahibi, evin kiracıları ve ev sahibinin paylaştığı emlakçılar. Adınız gösterilmez; ancak ev sahibi puanı hangi kiracının verdiğini çoğu zaman anlayabilir.\n• Emlakçılar: yalnızca ev sahibinin verdiği bağlantıya sahip kişiler, yalnızca paylaşılması seçilenleri görür; buna evin doğalgaz faturalarının aylık toplamları dahil olabilir. Ev sahibi erişimi geri alabilir.\n• Fiyat ortalamaları: isimsizdir ve yalnızca en az 3 hane katkı verdiğinde gösterilir.\n• Moderatörler: bildirilen içerik.',
    },
    {
      title: 'Toplama ve işleme yöntemi',
      text: 'Veriler, uygulamaya girdiğiniz bilgilerden ve çektiğiniz fotoğraflardan elektronik ortamda toplanır. Fişler kendi yazılımımızla otomatik okunur; dışarıdan bir tanıma hizmetine gönderilmez. Verilerinizi satmayız.',
    },
    {
      title: 'Aktarım',
      text: 'Verileri bizim adımıza barındırma hizmeti sağlayıcımız saklar. sahibinden.com eşitlemesi kullanılabiliyorsa ilan numarası sahibinden.com’a gönderilir. Kanunun gerektirdiği hallerde yetkili kurumlara veri veririz. Veriler yurt dışına yalnızca KVKK m. 9’a uygun olarak aktarılır.',
    },
    {
      title: 'Saklama süresi',
      text: 'Siz silene veya hesabınızı silene kadar. Gönderdiğiniz bir puanı desteklemiyorsa fişi kendiniz silebilirsiniz. Bildirimler, kararların izlenebilmesi için siz ayrıldıktan sonra adınız olmadan saklanır. Daha uzun süre yalnızca kanunun gerektirdiği hallerde saklanır.',
    },
    {
      title: 'Hesabınızı silme',
      text: 'Ayarlar → Hesabı sil hemen uygulanır ve geri alınamaz. Profiliniz, oturumlarınız, fişleriniz ve fotoğrafları, puanlarınız ve ilanlarınız, emlakçılarla daha önce paylaşılanlardan da silinir.\nSahibi olduğunuz evler içindeki her şeyle birlikte silinir; içinde bir kiracı yaşıyorsa ev kaydı kiracıda kalır ve kiracı ayrıldığında silinir.\nKalan bir evde çektiğiniz durum fotoğrafları, adınız ve konumunuz olmadan diğer taraf için saklanır. O evin mutfak ve bakım kayıtları da kalır.',
    },
    {
      title: 'Haklarınız',
      text: 'KVKK m. 11 uyarınca verilerinizin işlenip işlenmediğini, amacını ve kimlere aktarıldığını öğrenebilir; düzeltilmesini, silinmesini veya yok edilmesini ve bunun aktarılanlara bildirilmesini isteyebilir; yalnızca otomatik analizle aleyhinize çıkan bir sonuca itiraz edebilir; hukuka aykırı işleme nedeniyle zararınızın giderilmesini talep edebilirsiniz. {{email}} adresine yazın. En geç 30 gün içinde ücretsiz yanıtlarız. Kişisel Verileri Koruma Kurulu’na da şikâyette bulunabilirsiniz (kvkk.gov.tr).',
    },
    {
      title: 'Güvenlik, yaş ve değişiklikler',
      text: 'Parolalar özet olarak saklanır, dosyalar yalnızca erişim denetiminden sonra sunulur, oturum anahtarları telefonunuzun güvenli alanında tutulur. Evlog 18 yaş ve üzeri içindir. Bu metinde önemli bir değişiklik olursa, yürürlüğe girmeden önce e-postayla veya uygulamada bildiririz.',
    },
  ],
  terms: [
    {
      title: 'Sözleşme',
      text: 'Bu koşullar sizinle {{operator}} (“biz”) arasındadır. Hesap oluşturarak bunları kabul edersiniz. 18 yaşında veya daha büyük olmalı, doğru bilgi vermeli ve parolanızı kimseyle paylaşmamalısınız.',
    },
    {
      title: 'Evlog nedir',
      text: 'Evlog, ev sahibi ve kiracıların bir ev hakkında ortak kayıt tutmasına yardımcı olur: durum fotoğrafları, fişler, puanlar, mutfak ve bakım. Kira sözleşmenizin tarafı değildir; sözleşmenin, iki tarafın imzaladığı tutanağın, bilirkişi raporunun veya hukuki danışmanlığın yerine geçmez.',
    },
    {
      title: 'İçeriğiniz',
      text: 'İçeriğiniz size aittir. Evlog’u çalıştırmak için gerektiği kadar ve gizlilik metninde anlatıldığı gibi saklamamıza, işlememize ve göstermemize izin verirsiniz. İçerikten siz sorumlusunuz: yalnızca paylaşma hakkınız olan fotoğraf ve fişleri yükleyin; başkalarının yüzlerini, belgelerini ve özel eşyalarını kadraja almayın.',
    },
    {
      title: 'Puanlar',
      text: 'Yalnızca kiraladığınız evi, dürüstçe ve kendi deneyiminizle, kendi gerçek fişlerinize dayanarak puanlayın. Eve odaklanın: notlarda kişi adı veya iletişim bilgisi yer alamaz. Puan karşılığında bir şey teklif etmeyin veya istemeyin.',
    },
    {
      title: 'Yasak olanlar',
      text: 'Uygunsuz içeriğe ve kötüye kullanıma tolerans gösterilmez. Hakaret, tehdit, nefret söylemi, cinsel içerik, başkalarının kişisel verileri, gerçek dışı beyan, sahte fiş, reklam veya yasa dışı içerik paylaşmayın. Başkalarının hesaplarına girmeye, hizmeti aşırı yüklemeye veya otomatik kopyalamaya çalışmayın.',
    },
    {
      title: 'Bildirme ve denetim',
      text: 'Bir puanın veya fotoğrafın yanındaki Bildir’i kullanın ya da {{email}} adresine yazın. Bildirimleri 24 saat içinde incelemeyi hedefleriz. Notları, puanları, fotoğrafları veya ilanları gizleyebilir, bu koşulları ihlal eden hesapları kapatabiliriz. İçeriğinizin haksız yere gizlendiğini düşünüyorsanız {{email}} adresine yazın.',
    },
    {
      title: 'Emlakçılarla paylaşım',
      text: 'Emlakçıların ne göreceğine ev sahibi karar verir ve paylaşma hakkına sahip olmaktan sorumludur. Paylaşım bağlantısına sahip herkes, geri alınana kadar onu açabilir. Evlog’un sahibinden.com ile bağlantısı yoktur.',
    },
    {
      title: 'Otomatik okuma ve tahminler',
      text: 'Fişlerden okunan tutar ve ürünler, “azalanlar” önerileri, fiyat ortalamaları ve bakım tarihleri hatalı olabilir. Güvenmeden önce kontrol edin. Üreticinin talimatlarına uyun; doğalgazlı ve elektrikli cihazlar için yetkili servise başvurun.',
    },
    {
      title: 'Kullanılabilirlik ve sorumluluk',
      text: 'Evlog kesintiye uğrayabilir, değişebilir veya sona erebilir; sona erdirirsek kayıtlarınızı saklayabilmeniz için önceden e-postayla veya uygulamada bildiririz. Kanunun izin verdiği ölçüde dolaylı zararlardan ve kullanıcıların paylaştığı içerikten sorumlu değiliz. Buradaki hiçbir hüküm kast veya ağır kusurdan doğan sorumluluğu ya da tüketici haklarınızı sınırlamaz.',
    },
    {
      title: 'Sözleşmenin sona ermesi',
      text: 'Hesabınızı istediğiniz zaman Ayarlar’dan silebilirsiniz. Nelerin silindiği ve nelerin diğer tarafta kaldığı gizlilik metninde anlatılır.',
    },
    {
      title: 'Hukuk ve değişiklikler',
      text: 'Türk hukuku uygulanır. Tüketiciler, yerleşim yerlerindeki tüketici hakem heyetine veya tüketici mahkemesine başvurabilir. Bu koşullarda önemli bir değişiklik yaparsak önceden e-postayla veya uygulamada bildiririz; kabul etmezseniz hesabınızı silebilirsiniz.',
    },
  ],
  verification: [
    {
      title: 'Sözleşme değil, doğrulama',
      text: 'Durum kaydı, bir evin belirli bir anda nasıl göründüğünü ve iki tarafın fotoğraflarda uzlaştığını gösterir. Kira sözleşmesi, imzalı teslim tutanağı veya bilirkişi raporu değildir. Bir uyuşmazlıkta ne kadar ağırlık taşıyacağına mahkeme veya yetkili merci karar verir.',
    },
    {
      title: 'Nasıl çalışır',
      text: 'Fotoğraflar oda oda çekilir. Fotoğraf ulaştığında sunucumuz zamanı ve SHA-256 parmak izini kaydeder. Telefonunuzun bildirdiği zaman da saklanır; 24 saatten fazla fark olan fotoğraflar kabul edilmez. Kilitleme, fotoğraf setini dondurur ve tümü üzerinden tek bir parmak izi hesaplar; set, parmak izi değişmeden değişemez.',
    },
    {
      title: 'Onay',
      text: 'Kilitlendikten sonra ev sahibi ve mevcut kiracı kaydı ayrı ayrı onaylar. İkisi de onayladığında kayıt onaylanmış olur. Kiracı yoksa ev sahibinin onayı yeterlidir. Ev sahibi hesabını sildiyse yeni kayıtlar kilitlenebilir, ancak artık iki tarafça onaylanamaz.',
    },
    {
      title: 'Neyi kanıtlamaz',
      text: 'Parmak izi, fotoğrafların ulaştıktan sonra değişmediğini gösterir. Fotoğrafın nerede çekildiğini veya hasardan kimin sorumlu olduğunu kanıtlamaz. Önemli olanların kendi kopyalarını saklayın.',
    },
    {
      title: 'Kaldırılan fotoğraflar',
      text: 'Bir moderatör bir fotoğrafı gizlerse, parmak izinin eşleşmesi için fotoğraf gizli olarak listede kalır, ancak artık açılamaz.',
    },
  ],
};

export default legal;
