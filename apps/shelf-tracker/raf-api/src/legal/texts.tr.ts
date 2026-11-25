import type { LegalTexts } from './texts';

export const tr: LegalTexts = {
  updated: 'Son güncelleme: 26 Kasım 2026',
  languageName: 'Türkçe',
  documents: {
    privacy: {
      title: 'Gizlilik ve aydınlatma metni',
      sections: [
        {
          title: 'Veri sorumlusu',
          text: 'Raf uygulamasını işleten {{operator}} (“biz”), 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusudur.\nİletişim: {{email}}',
        },
        {
          title: 'Hangi verileri saklıyoruz',
          text: '• Hesap: e-postan, bir ad (Google’dan ya da e-postanın @ işaretinden önceki kısmı) ve şifrenin geri döndürülemez özeti. Google ile girişte şifre yerine Google hesap numaran.\n• Oturumlar: her cihazın ne zaman giriş yaptığı, uygulama adı ve oturum anahtarının özeti.\n• Fişler: çektiğin fotoğraflar ve onlardan okunan market, tarih, tutar, ürün, barkod gibi bilgiler. Fişlerde, üzerine basılmış başka bilgiler de (örneğin sadakat kartı numarası) bulunabilir.\n• Rafın: son tüketim tarihleri, açtıkların ve bitirdiklerin, evde bulunanlar ve market listelerin.\n• Ayarlar: para birimi ve hatırlatma tercihleri. Dil ve görünüm telefonunda kalır.',
        },
        {
          title: 'Ne yapmıyoruz',
          text: 'Reklam, reklam kimliği, başka şirketlerin analiz veya takip araçları yoktur; verilerini satmayız. Uygulama konumunu istemez; fotoğraflar yüklenmeden önce telefonunda yeniden kodlanır ve içlerindeki konum bilgisi kaldırılır. Paket tarihi fotoğrafları okunur ve saklanmaz.',
        },
        {
          title: 'İşleme amaçları ve hukuki sebepler',
          text: '• Kaydolduğun hizmeti sunmak: fiş okuma, geri sayım, listeler ve harcamalar (KVKK m. 5/2-c, sözleşmenin ifası).\n• Raf’ı güvende tutmak: giriş koruması ve istek sınırları (m. 5/2-f, meşru menfaat).\n• Hukuki yükümlülükleri yerine getirmek, bir hakkı tesis etmek veya savunmak (m. 5/2-ç ve 5/2-e).',
        },
        {
          title: 'Toplama ve işleme yöntemi',
          text: 'Veriler, uygulamaya girdiğin bilgilerden ve çektiğin fotoğraflardan elektronik ortamda toplanır. Fişler kendi yazılımımızla otomatik okunur; fotoğraflar dışarıdan bir tanıma hizmetine gönderilmez. Son tüketim hatırlatmaları telefonunda oluşturulur. Uygulamada verilerini yalnızca sen görürsün.',
        },
        {
          title: 'Aktarım',
          text: '• Verileri bizim adımıza barındırma hizmeti sağlayıcımız saklar.\n• Şifre sıfırlama kodlarını e-posta hizmeti sağlayıcımız adresine iletir.\n• Google ile girişi seçersen Google bize e-postanı, adını ve hesap numaranı bildirir.\n• Kanunun gerektirdiği hallerde yetkili kurumlar.\nVeriler yurt dışına yalnızca KVKK m. 9’a uygun olarak aktarılır.',
        },
        {
          title: 'Saklama süresi',
          text: 'Sen silene veya hesabını silene kadar. Fişler fotoğraflarıyla birlikte tek tek silinebilir. Artık kullanılamayan oturumlar kaldırılır. Yedeklerin üzerine 30 gün içinde yazılır. Daha uzun süre yalnızca kanunun gerektirdiği hallerde saklanır.',
        },
        {
          title: 'Hesabını silme',
          text: 'Uygulamada: Ayarlar → Hesabı sil. Hemen uygulanır, geri alınamaz ve fotoğraflar dahil yukarıdakilerin tümünü siler. Uygulama olmadan silmek için: {{deleteLink}}.',
        },
        {
          title: 'Hakların',
          text: 'KVKK m. 11 uyarınca verilerinin işlenip işlenmediğini, amacını ve kimlere aktarıldığını öğrenebilir; düzeltilmesini, silinmesini veya yok edilmesini ve bunun aktarılanlara bildirilmesini isteyebilir; yalnızca otomatik analizle aleyhine çıkan bir sonuca itiraz edebilir; hukuka aykırı işleme nedeniyle zararının giderilmesini talep edebilirsin. {{email}} adresine yaz. En geç 30 gün içinde ücretsiz yanıtlarız. Kişisel Verileri Koruma Kurulu’na da şikâyette bulunabilirsin (kvkk.gov.tr).',
        },
        {
          title: 'Güvenlik, yaş ve değişiklikler',
          text: 'Veriler şifreli iletilir, parolalar özet olarak saklanır, fotoğraflar yalnızca sahibine sunulur, oturum anahtarları telefonunun güvenli alanında tutulur. Raf 18 yaş ve üzeri içindir. Bu metinde önemli bir değişiklik olursa, yürürlüğe girmeden önce e-postayla veya uygulamada bildiririz.',
        },
      ],
    },
    terms: {
      title: 'Kullanım koşulları',
      sections: [
        {
          title: 'Sözleşme',
          text: 'Bu koşullar seninle {{operator}} (“biz”) arasındadır. Hesap oluşturarak bunları kabul edersin. 18 yaşında veya daha büyük olmalı ve şifreni kimseyle paylaşmamalısın.',
        },
        {
          title: 'Raf nedir',
          text: 'Raf market fişlerini okur; harcamalarını, ürünlerin ne kadar dayanacağını, evde neler olduğunu ve market listelerini takip eder. Kişisel kullanım içindir.',
        },
        {
          title: 'Tarihler tahmindir',
          text: 'Geri sayımlar tipik dayanma süreleridir; gıdanın güvenli olduğuna dair bir taahhüt değildir. Paketlerden okunan tarihler yanlış olabilir. Her zaman paketteki tarih ve talimatlara, gıdanın görünüşüne ve kokusuna bak. Uygulama hâlâ dayanır diyor diye bir gıdayı tüketme.',
        },
        {
          title: 'Tutarlar hatalı olabilir',
          text: 'Fişler otomatik okunur. Kaydetmeden önce satırları kontrol et. Raf muhasebe kaydı değildir; iade veya garanti gibi işlemlerde fişin yerine geçmez.',
        },
        {
          title: 'İçeriğin',
          text: 'Fotoğrafların ve verilerin sana aittir. Raf’ı çalıştırmak için gerektiği kadar ve gizlilik metninde anlatıldığı gibi saklamamıza ve işlememize izin verirsin. Yalnızca kullanma hakkın olan fişleri yükle.',
        },
        {
          title: 'Yasak olanlar',
          text: 'Yasa dışı içerik yükleme, başkalarının hesaplarına girmeye, hizmeti aşırı yüklemeye veya otomatik kopyalamaya çalışma. Bunu yapan hesapları kapatabiliriz.',
        },
        {
          title: 'Kullanılabilirlik ve sorumluluk',
          text: 'Raf kesintiye uğrayabilir, değişebilir veya sona erebilir; sona erdirirsek önceden e-postayla veya uygulamada bildiririz. Kanunun izin verdiği ölçüde dolaylı zararlardan sorumlu değiliz. Buradaki hiçbir hüküm kast veya ağır kusurdan doğan sorumluluğu ya da tüketici haklarını sınırlamaz.',
        },
        {
          title: 'Sözleşmenin sona ermesi',
          text: 'Hesabını istediğin zaman Ayarlar’dan silebilirsin. Nelerin silindiği gizlilik metninde anlatılır.',
        },
        {
          title: 'Hukuk ve değişiklikler',
          text: 'Türk hukuku uygulanır. Tüketiciler, yerleşim yerlerindeki tüketici hakem heyetine veya tüketici mahkemesine başvurabilir. Bu koşullarda önemli bir değişiklik yaparsak önceden e-postayla veya uygulamada bildiririz; kabul etmezsen hesabını silebilirsin. Sorular: {{email}}',
        },
      ],
    },
    'delete-account': {
      title: 'Raf hesabını sil',
      sections: [
        {
          title: 'Uygulamadan',
          text: '1. Raf’ı aç ve sağ üstteki baş harflerine dokun.\n2. En altta “Hesabı sil”e dokun ve onayla.\nHesabın hemen silinir.',
        },
        {
          title: 'Uygulama olmadan',
          text: 'Hesabının e-posta adresinden {{email}} adresine “Raf hesabımı sil” konusuyla yaz. 30 gün içinde siler ve e-postayla onaylarız.',
        },
        {
          title: 'Neler silinir',
          text: 'Her şey: hesabın ve oturumların, fişlerin ve fotoğrafları, ürünler ve son tüketim tarihleri, evde bulunanlar ve market listeleri. Yedeklerdeki kopyaların üzerine 30 gün içinde yazılır.',
        },
        {
          title: 'Yalnızca bazı verileri silmek',
          text: 'Hesabını silmeden, uygulamada tek tek fişleri fotoğraflarıyla (alışverişi aç, “Fişi sil”), listeleri ve ürünleri silebilirsin.',
        },
      ],
    },
  },
};
