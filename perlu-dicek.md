# Catatan Pemeriksaan Data (versi bersih)

Dibuat: 1/11/2026

## Yang sudah diperbaiki otomatis
- 67 isian organik kehilangan titik desimal diperbaiki (mis. "05" menjadi 0,5; RW 05 dan RW 06 tanggal 30 Juli "23" menjadi 2,3). Perlu dikonfirmasi ke PPSU.
- 109 entri harian ganda (tanggal, RW, RT, sumber, dan berat sama, selisih input kurang dari 30 menit) dibuang.
- 11 tanggal harian salah ketik diganti tanggal input formulir.
- Bank sampah: 2 entri uji coba ("TES"), 2 entri ganda, dan 1 salinan ganda (RW 01, 15 September) dibuang. Isian berupa kata atau total (RW 03) dibetulkan manual.

## Yang tidak dihitung, perlu dicek ke PPSU
- 16 entri organik 100 kg atau lebih untuk satu RT dalam satu kali jemput (mis. 850, 956, 689, 580, 520 kg). Kemungkinan gram atau salah ketik. Daftar ada di log.json.

## Yang perlu dicek
- Rekap 2026-08-w3 dan w4: komposting, BSF, BSU, dan residu kembar persis (kemungkinan disalin). Kolom itu tidak dipakai di web.
- Rekap Sep–Okt: angka organik dan BSU hampir statis, tidak mengikuti timbangan harian. Tidak dipakai di web.
- 10 baris rekap per RT punya rumah memilah lebih besar dari jumlah rumah (RW 01 RT 4, 109%). Total rekap tetap memakai angka asli sheet.
- Bank sampah RW 05: isian bulan Mei (tutup botol 72,5 kg) tampak janggal.
- RW 09 tidak punya bank sampah; RW 03 melapor 3 kali; beberapa RW melapor tidak rutin.

## Yang tidak ditampilkan di web
- Data per RT (rekap mingguan digabung ke tingkat RW).
- Kolom komposting, BSF, BSU, residu rekap mingguan.
