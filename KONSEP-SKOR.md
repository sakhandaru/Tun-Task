# Konsep Skor Persentase — TunTask

Dokumen ini mendeskripsikan konsep final penggantian skema skor poin menjadi skema persentase, beserta pemanfaatan 8 kotak di tampilan Review.

## Latar Belakang & Masalah

Skema poin lama:

| Komponen               | Nilai |
| ---------------------- | ----- |
| Habit selesai          | +10   |
| Todo tepat waktu       | +10   |
| Todo telat            | +5    |
| Skip habit             | −5    |
| Batal todo             | −5    |
| Perfect day (bonus)    | +20   |

Masalahnya:

1. **Tidak fair antar hari.** Jumlah task berubah-ubah tiap hari, tapi poin dihitung dari volume. Hari dengan 10 task selalu "menang" dari hari dengan 2 task, walau di hari 2-task semuanya beres sempurna.
2. **Kurang interpretatif.** Angka 120 poin tidak menjawab pertanyaan: "apakah aku sudah maksimal 100% hari ini?"
3. **Bonus perfect day tidak konsisten** dengan sistem poin secara keseluruhan.

**Solusi:** ganti semua angka poin menjadi **persentase** yang dihitung dari target yang *memang due* hari itu.

---

## Formula Persentase

### Harian

```
target = (habit yang due hari ini) + (todo yang due hari ini) − (todo yang dicancel)
beres  = (habit selesai) + (todo selesai sebelum tengah malam)

daily% = round( beres / target × 100 )
```

Catatan:

- `daily%` di-*clamp* antara 0 dan 100 (tidak ada minus).
- `target = 0` → hari diabaikan (tidak punya kewajiban), tidak ikut dihitung dalam agregasi minggu/bulan.
- **Todo telat TAPI selesai di hari yang sama** dihitung beres (100%). Tidak ada penalti selama masih hari yang sama.
- **Cancel = netral.** Task yang dicancel dikeluarkan dari target. Cancel adalah reprioritasi sadar, bukan kegagalan.
- **Skip = 0.** Habit yang di-skip tetap masuk target tapi tidak berkontribusi ke pembilang.

### Minggu (7 hari terakhir)

```
week% = round( Σ beres(7 hari) / Σ target(7 hari) × 100 )
```

Hanya hari dengan `target > 0` yang ikut dihitung.

### Bulan (tanggal 1 sampai hari ini)

```
month% = round( Σ beres(1..hari ini) / Σ target(1..hari ini) × 100 )
```

Hanya hari dengan `target > 0` yang ikut dihitung.

> **Kenapa pakai Σ beres/Σ target, bukan rata-rata daily%?**
> Rata-rata daily% membuat hari dengan 1 task punya bobot sama dengan hari dengan 10 task. Menjumlahkan pembilang & penyebut lebih adil karena merefleksikan *total usaha*.

---

## Aturan Skor (Ringkasan)

| Kejadian                  | Efek                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| Habit selesai             | Masuk pembilang (target penuh)                                        |
| Todo selesai hari itu     | Masuk pembilang (target penuh), walau telat selama masih 1 hari       |
| Todo selesai di hari lain | Tidak masuk pembilang hari due-nya (hari itu jadi di bawah 100%)      |
| Habit di-skip             | Tetap di penyebut, tidak di pembilang (0)                             |
| Todo dibatalkan           | Dikeluarkan dari penyebut (netral)                                    |
| Tidak ada target hari itu | Hari diabaikan, tidak mengurangi agregasi minggu/bulan                |

Prinsip inti: **100% = semua yang direncanakan hari itu tuntas tepat di hari itu.**

---

## Pemanfaatan 8 Kotak di Review

Tata letak saat ini (grid 4 kolom × 6 baris):

```
┌──────────────┬────────────────┐
│ 1 TANGGAL+JAM │ 2 TUGAS   2/4  │   ← % todo hari ini (pill putih)
│  (jam + tanggal)├────────────────┤
│              │ 3 HABIT   1/1  │   ← % habit hari ini (pill gelap)
├──────────────┼────────────────┤
│ 4 STREAK      │ 5 HARI INI  78%│   ← daily% utama (ketuk → rincian)
│  PERFECT n hr│  "sisa 1 todo" │
├──────────────┼────────────────┤
│ 7 MINGGU 82% │ 6 BACKLOG  3   │   ← backlog tetap
│ 8 BULAN  74% │   (daftar tugas)│
└──────────────┴────────────────┘
```

### Perubahan per kotak

| # | Nama (sekarang)     | Nama (baru)                            | Perubahan konten                                                                              |
| - | ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 | TANGGAL + JAM       | TANGGAL + JAM                          | **Tidak berubah.** Jam & tanggal besar.                                                       |
| 2 | TUGAS (poin minggu) | TUGAS (target hari ini)                | Ganti dari angka mingguan jadi `todo selesai / todo due` hari ini, mis. `2/4`.                  |
| 3 | HABIT (poin minggu) | HABIT (target hari ini)                | Ganti dari angka mingguan jadi `habit done / habit due` hari ini, mis. `1/1`.                   |
| 4 | STREAK (habit)      | STREAK (perfect day)                   | Dari streak habit jadi **streak hari berturut-turut dengan daily% = 100%**. Metrik disiplin inti. |
| 5 | SKOR HARI INI       | HARI INI (daily%)                      | Angka utama jadi `%` besar (mis. 78%). Label sisa: `sisa 1 todo · 2 habit buat perfect day`.    |
| 6 | BACKLOG             | BACKLOG                                | **Tidak berubah.**                                                                             |
| 7 | MINGGU (poin)       | MINGGU (week%)                         | Angkanya jadi `week%` (mis. 82%).                                                              |
| 8 | BULAN (poin)        | BULAN (month%)                         | Angkanya jadi `month%` (mis. 74%).                                                             |

### Panduan visual

- `100%` = hijau (perfect) → kotak #5 menampilkan label `PERFECT`.
- `>= 70%` = normal.
- `< 70%` = bisa diberi indikator warna redup/kuning untuk peringatan lembut.
- Warna & bentuk (pill/circle/rounded-rect) dipertahankan agar identitas visual tampilan tidak berubah.

---

## Tampilan Rincian (tabel dalam / drill-down)

### Rincian HARI INI (ketuk kotak #5)

- Habit: `selesai/due · %` — mis. `1/1 · 100%`
- Todo: `selesai/due · %` — mis. `2/4 · 50%`
- Skip habit: `skip ×0` (netral, ditampilkan sebagai catatan)
- Todo dibatalkan: `cancel ×2` (dikeluarkan dari target)
- Total: `daily%`

### Rincian MINGGU / BULAN (ketuk kotak #7 / #8)

- Daftar 7 hari (atau hari-hari bulan ini) dengan `target`, `beres`, dan `%` masing-masing.
- Hanya hari dengan `target > 0` yang muncul.
- Angka agregasi `week%` / `month%` di header.

---

## Perubahan Kode (ringkasan implementasi)

| Lokasi                                                    | Perubahan                                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/hooks/useLiveDb.ts` — `useScoreStats`                | Hitung `daily%`, `week%`, `month%` dan breakdown baru (`target`, `beres`)           |
| `src/hooks/useLiveDb.ts` — interface `ScoreBreakdown`     | Ganti field poin dengan: `habitDue`, `habitDone`, `todoDue`, `todoDone`, `skipped`, `cancelled`, `target`, `beres`, `percent`, `perfect` |
| `src/features/review/ReviewView.tsx`                      | Kotak #2, #3, #4, #5, #7, #8 memakai nilai persentase; tambah label "sisa" di #5; teks Rincian & PERIOD view disesuaikan |
| `src/hooks/useLiveDb.ts` — `calcStreak` / streak PERFECT  | Hitung streak hari dengan `daily% === 100` (bukan streak habit)                     |

### Catatan data

- Tidak ada migrasi schema. Semua dihitung *reactive* dari `habitLogs` + `todos` yang sudah ada (Dexie live query).
- Nilai lama (poin) tidak disimpan; digantikan sepenuhnya oleh persen saat runtime.

---

## Ringkasan Keputusan

1. Skor utama = **persentase harian vs target yang due hari itu**.
2. Telat tetap dihitung beres **asalkan selesai sebelum tengah malam** hari yang sama.
3. **Cancel netral** (keluar target), **skip = 0** (tetap di target tapi tanpa poin).
4. Minggu/bulan pakai **Σ beres / Σ target** (fair lintas hari dengan jumlah task berbeda).
5. Streak = **hari perfect 100% berturut-turut**.
6. 8 kotak dipertahankan; hanya konten angka yang dialihkan ke persen.