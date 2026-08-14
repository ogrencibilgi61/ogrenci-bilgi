# Yoklama CRM

Yoklama CRM; kurum bazli ogrenci takibi, gunluk yoklama, devamsizlik raporlari ve veli iletisim sureclerini yonetmek icin hazirlanmis mobil uyumlu bir React uygulamasidir.

Uygulama iki farkli giris alanina sahiptir:

- **Mudur paneli:** Kuruma bagli mudur email/sifre ile giris yapar ve yalnizca kendi kurum verilerini gorur.
- **Idareci paneli:** Sehir ve kurum kayitlarini yonetmek icin `VITE_ADMIN_PASSWORD` ile acilir.

Veli kayit veya veli giris alani yoktur. Veli iletisimleri, ogrenci kartindaki veli bilgileri uzerinden WhatsApp linkleri ve notlar ile yonetilir.

## Teknolojiler

- React 19
- React Router 7
- Vite 8
- Supabase Auth ve Supabase Database
- GitHub Pages uyumlu statik build

## Ozellikler

- Supabase Auth ile mudur email/sifre girisi
- `institution_managers` tablosu uzerinden muduru kuruma baglama
- Kurum verilerini `institution_id` ile izole eden RLS politikalari
- Idareci panelinden sehir, kurum, kurum durumu ve kurum giris bilgileri yonetimi
- Eski/pasif kurumlari goruntuleme, geri aktiflestirme veya kalici silme
- Bolge idarecisi ekraninda kurum istatistikleri, kapasite ve doluluk takibi
- Ogrenci ekleme, duzenleme, pasife alma, arsivleme ve geri aktiflestirme
- Cinsiyet, sinif, veli adi ve veli telefonu alanlari
- Sinif bazli gunluk yoklama
- `Geldi`, `Gelmedi` ve `Izinli` yoklama durumlari
- Gelmeyen ogrenciler icin otomatik mesaj kaydi olusturma
- WhatsApp Web / uygulamasi icin `wa.me` linkleri
- Tekil ve toplu veli mesajlari
- Mesaj sablonu ekleme, duzenleme ve silme
- Veli notlari ve hatirlatma tarihleri
- Devamsizlik esigi, tarih araligi, sinif ve ogrenci bazli raporlar
- Kurum profili, kapasite, sinif listesi, personel listesi ve sifre ayarlari
- Supabase baglantisi olmadan deneme icin local veri modu

## Sayfalar

| Yol | Aciklama |
| --- | --- |
| `/login` | Mudur girisi |
| `/dashboard` | Gunluk ozet, yoklama durumu, veli notlari ve hazir mesajlar |
| `/ogrenciler` | Aktif ogrenci listesi ve ogrenci formlari |
| `/yoklama` | Sinif bazli gunluk yoklama |
| `/mesajlar` | Hazir mesajlar, sablonlar ve WhatsApp islemleri |
| `/raporlar` | Devamsizlik ve yoklama raporlari |
| `/eski-ogrenciler` | Pasif/arsiv ogrenciler |
| `/veli-notlari` | Veli notlari ve hatirlatmalar |
| `/ayarlar` | Kurum profili, siniflar, personel ve sifre |
| `/admin/login` | Idareci girisi |
| `/admin/kurumlar` | Aktif kurumlar |
| `/admin/kurum-ekle` | Yeni kurum ekleme |
| `/admin/eski-kurumlar` | Eski/pasif kurumlar |
| `/admin/bolge-idarecisi` | Kurum istatistikleri |

Uygulama `HashRouter` kullanir. GitHub Pages gibi statik hosting ortamlarinda sayfa yenileme sorunlarini azaltmak icin adresler `#/dashboard` biciminde calisir.

## Kurulum

```bash
npm install
npm run dev
```

Varsayilan gelistirme adresi:

```text
http://localhost:5173/ogrenci-bilgi/
```

## Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyalayin:

```bash
cp .env.example .env
```

Kullanilan degiskenler:

```text
VITE_SUPABASE_URL=https://proje-ref.supabase.co
VITE_SUPABASE_ANON_KEY=supabase-anon-key
VITE_ADMIN_PASSWORD=guclu-bir-idareci-sifresi
VITE_BASE_PATH=/ogrenci-bilgi/
VITE_DATA_MODE=supabase
```

| Degisken | Aciklama |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_ADMIN_PASSWORD` | `/admin/login` icin idareci sifresi |
| `VITE_BASE_PATH` | Vite base path. GitHub Pages icin genelde repo adidir. |
| `VITE_DATA_MODE` | Varsayilan `supabase`. `local` yapilirsa demo veriler localStorage ile kullanilir. |

`VITE_BASE_PATH` verilmezse Vite config once `GITHUB_REPOSITORY` ortam degiskeninden repo adini uretir. O da yoksa `/ogrenci-bilgi/` kullanilir.

## Local Veri Modu

Supabase kurmadan uygulamayi denemek icin `.env` icinde su degeri kullanabilirsiniz:

```text
VITE_DATA_MODE=local
VITE_ADMIN_PASSWORD=admin123
```

Bu modda veriler `src/data/institutionData.js` icindeki ornek kayitlardan baslar ve tarayici `localStorage` alaninda tutulur.

Ornek kurum girisleri:

```text
kadikoy@ornek.com / 1234
besiktas@ornek.com / 2468
cankaya@ornek.com / 1357
```

Idareci girisi icin `.env` icindeki `VITE_ADMIN_PASSWORD` kullanilir.

## Supabase Kurulumu

Supabase SQL Editor icinde ana migration dosyasini calistirin:

```text
supabase/migrations/20260707000000_multi_institution.sql
```

Migration su tablolari ve RLS politikalarini olusturur:

- `cities`
- `institutions`
- `institution_managers`
- `students`
- `attendance`
- `messages`
- `message_templates`
- `parent_notes`
- `settings`

Mevcut ve daha eski bir Supabase semasini guncelliyorsaniz `supabase/patch_*.sql` dosyalarini da ihtiyaca gore SQL Editor icinde calistirabilirsiniz.

Mudur kullanicisi olusturma akisi:

1. Supabase Auth icinde mudur email/sifre kullanicisini olusturun.
2. `cities` ve `institutions` tablolarinda sehir/kurum kaydini olusturun.
3. `institution_managers` tablosuna mudurun `auth.users.id` degeri ile kurum `id` degerini ekleyin.
4. Mudur `/login` ekranindan email/sifre ile giris yaptiginda kurum otomatik yuklenir.

## WhatsApp Mesajlari

Bu proje WhatsApp mesajlarini otomatik gondermez. Mesaji hazirlar, kaydeder ve kullaniciya WhatsApp linki acar.

Link formati:

```text
https://wa.me/90TELEFON?text=ENCODED_MESSAGE
```

Mesaj sablonlarinda kullanilabilen alanlar:

```text
{veli_adi}
{ogrenci_adi}
{sinif}
{tarih}
{toplam_devamsizlik}
{kurum_adi}
```

## Build ve Yayina Alma

Production build:

```bash
npm run build
```

Build ciktisi `docs/` klasorune yazilir. GitHub Pages icin:

1. `.env` icinde `VITE_BASE_PATH` degerini repo adina gore ayarlayin.
2. `npm run build` calistirin.
3. `docs/` klasorunu commit edin.
4. GitHub repo ayarlarinda `Settings > Pages` ekranini acin.
5. Source olarak `Deploy from a branch`, branch olarak `main`, klasor olarak `/docs` secin.

## Kontroller

```bash
npm run lint
npm run build
```

## Guvenlik Notlari

- `.env` dosyasi repoya eklenmemelidir.
- Supabase anon key frontend icin kullanilabilir; service role key asla frontend koduna eklenmemelidir.
- Kurum verileri `institution_id` ve RLS politikalari ile ayrilir.
- Mudur oturumu `sessionStorage` uzerinde tutulur ve yeni gun kontrolunde tekrar giris istenir.
- Idareci paneli icin guclu bir `VITE_ADMIN_PASSWORD` belirlenmelidir.
