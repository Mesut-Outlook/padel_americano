# 3 Hafta vs 5 Hafta Karşılaştırması (10 Oyuncu, 2 Saha, Haftada 3 Slot)

Bu döküman, mevcut oyuncu listesi (`players.json`) ve varsayılan konfigürasyon (2 saha, haftada 3 slot) için 3 hafta ile 5 hafta senaryolarını karşılaştırır.

## Özet
- Slot başına kapasite: 8 oyuncu (2 saha × 4 oyuncu)
- Haftada toplam kapasite: 3 slot × 8 = 24 oyuncu-katılımı

### 3 Hafta
- Toplam slot sayısı: 3 hafta × 3 slot = 9
- Toplam oyuncu-katılımı: 9 × 8 = 72
- 10 oyuncuya bölünce ortalama: 72 / 10 = 7.2
- Eşitlik mümkün değil: bazıları 7, bazıları 8 maç oynar.

Oyuncu başına sonuçlar:
- 8 maç oynayanlar: Emre, Okan (bekleme 1 kez)
- 7 maç oynayanlar: Mesut, Berk, Mumtaz, Ahmet, Erdem, Sercan, Sezgin, Batuhan (bekleme 2 kez)

### 5 Hafta
- Toplam slot sayısı: 5 hafta × 3 slot = 15
- Toplam oyuncu-katılımı: 15 × 8 = 120
- 10 oyuncuya bölünce ortalama: 120 / 10 = 12
- Tam eşitlik: herkes 12 maç oynar (bekleme 3 kez)

## Detay Tablosu
Aşağıda her oyuncu için maç sayısı ve bekleme sayısı verilmiştir.

| Oyuncu   | 3 Hafta Maç | 3 Hafta Bekleme | 5 Hafta Maç | 5 Hafta Bekleme |
|----------|--------------|------------------|-------------|------------------|
| Mesut    | 7            | 2                | 12          | 3                |
| Berk     | 7            | 2                | 12          | 3                |
| Mumtaz   | 7            | 2                | 12          | 3                |
| Ahmet    | 7            | 2                | 12          | 3                |
| Erdem    | 7            | 2                | 12          | 3                |
| Sercan   | 7            | 2                | 12          | 3                |
| Sezgin   | 7            | 2                | 12          | 3                |
| Batuhan  | 7            | 2                | 12          | 3                |
| Emre     | 8            | 1                | 12          | 3                |
| Okan     | 8            | 1                | 12          | 3                |

## Sonuç
- 3 hafta: Eşit dağılım mümkün değil (7 veya 8 maç). 
- 5 hafta: Herkes eşit (12 maç).

Not: Genel kural olarak, (hafta × slot × saha) çarpımı 5’in katı olduğunda 10 oyuncu için eşit dağılım sağlanır (çünkü toplam katılım = 4 × hafta × slot × saha, bunun 10’a bölünebilmesi gerekir).