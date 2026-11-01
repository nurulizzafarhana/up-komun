import {
  data,
  adaData,
  num,
  kg,
  rwLabel,
  namaBulan,
  periodeLabel,
  byMonth,
  byWeek,
  filterRw,
  totalOf,
  partisipasi,
  bankPerBulan,
  esc,
  card,
  section,
  pageHead,
  notice,
  opsiRw,
  tanggalPanjang,
} from "./lib";
import { gambar, hapusGrafik, WARNA } from "./charts";
import "@fontsource-variable/inter";

const app = document.getElementById("app") as HTMLElement;

let rwPilah = "semua";
let rwBank = "semua";
let bulanBank = "semua";

const renderBeranda = (root: HTMLElement): void => {
  if (!adaData) {
    root.innerHTML = `${pageHead("Dasbor inovasi", "KOMUNITAS Utan Panjang", "Data belum tersedia.")}
      ${notice("Data belum dimuat.", "Letakkan file CSV di folder data/, lalu jalankan npm run data.")}`;
    return;
  }

  const bulan = byMonth(data.harian);
  const akhir = bulan.at(-1);
  const part = partisipasi();
  const pAkhir = part.at(-1);
  const pAwal = part[0];
  const bank = bankPerBulan();
  const bAkhir = bank.at(-1);

  root.innerHTML = `
    ${pageHead(
      "Dasbor inovasi",
      "KOMUNITAS Utan Panjang",
      "Rekap pemilahan sampah dari sumber dan setoran bank sampah, dihimpun dari data harian petugas PPSU dan rekap mingguan kelurahan.",
    )}

    <div class="grid cols">
      ${card(pAkhir ? num(pAkhir.memilah) : "-", "Rumah sudah memilah", pAkhir ? `dari ${num(pAkhir.rumah)} rumah terdata · ${periodeLabel(pAkhir.periode)}` : "-", "rumah", "#d97706")}
      ${card(akhir ? kg(akhir.organik) : "-", "Sampah organik", akhir ? akhir.label : "-", "", "#16a34a")}
      ${card(akhir ? kg(akhir.anorganik) : "-", "Sampah anorganik", akhir ? akhir.label : "-", "", "#0ea5e9")}
      ${card(akhir ? kg(akhir.residu) : "-", "Residu ke TPST", akhir ? akhir.label : "-", "", "#94a3b8")}
      ${card(bAkhir ? kg(bAkhir.berat) : "-", "Setoran bank sampah", bAkhir ? `${namaBulan(bAkhir.periode.slice(5, 7))} · ${bAkhir.entri} penimbangan` : "-", "", "#0f766e")}
    </div>

    ${section(
      "Tren berat sampah per bulan",
      "Timbangan harian petugas PPSU, dijumlahkan per bulan.",
      `<div class="card"><div class="chart-box"><canvas id="g-bulan"></canvas></div></div>`,
    )}

    ${section(
      "Partisipasi rumah memilah",
      "Rekap mingguan: jumlah rumah yang tercatat memilah dibanding total rumah terdata.",
      `<div class="card"><div class="chart-box short"><canvas id="g-partisipasi"></canvas></div></div>`,
    )}

    ${
      pAwal && pAkhir && pAkhir.memilah > pAwal.memilah
        ? `<div class="card" style="margin-top:16px">
            <span class="pill">Progres</span>
            <p style="margin:8px 0 0">Rumah yang memilah naik dari <strong>${num(pAwal.memilah)}</strong> rumah (${periodeLabel(pAwal.periode)}) menjadi <strong>${num(pAkhir.memilah)}</strong> rumah (${periodeLabel(pAkhir.periode)}) — bertambah <strong>${num(pAkhir.memilah - pAwal.memilah)}</strong> rumah.</p>
          </div>`
        : ""
    }
  `;

  if (bulan.length) {
    gambar("g-bulan", {
      type: "line",
      labels: bulan.map((b) => b.label),
      unit: "kg",
      seri: [
        { label: "Organik", data: bulan.map((b) => b.organik), color: WARNA.organik, fill: true },
        { label: "Anorganik", data: bulan.map((b) => b.anorganik), color: WARNA.anorganik, fill: true },
        { label: "Residu", data: bulan.map((b) => b.residu), color: WARNA.residu },
      ],
    });
  }

  if (part.length) {
    gambar("g-partisipasi", {
      type: "line",
      labels: part.map((p) => periodeLabel(p.periode, true)),
      unit: "rumah",
      seri: [
        { label: "Total rumah terdata", data: part.map((p) => p.rumah), color: WARNA.rumah, garisPutus: true },
        { label: "Sudah memilah", data: part.map((p) => p.memilah), color: WARNA.memilah, fill: true },
      ],
    });
  }
};

const renderPilah = (root: HTMLElement): void => {
  hapusGrafik();

  if (!adaData || !data.harian.length) {
    root.innerHTML = `${pageHead("Pilah sampah", "Data pemilahan per RW", "Berat sampah terpilah dari timbangan harian PPSU.")}
      ${notice("Data timbangan belum tersedia.", "Tambahkan CSV harian di folder data/, lalu jalankan npm run data.")}`;
    return;
  }

  const rows = filterRw(data.harian, rwPilah);
  const minggu = byWeek(rows);
  const total = totalOf(minggu);
  const part = partisipasi(rwPilah);
  const pAkhir = part.at(-1);
  const rentang = data.meta.rentangHarian;

  root.innerHTML = `
    ${pageHead(
      "Pilah sampah",
      "Data pemilahan per wilayah",
      "Berat sampah yang sudah dipilah warga dan ditimbang petugas PPSU, dijumlahkan per minggu.",
    )}

    <div class="toolbar">
      <div class="field">
        <label for="pilih-rw">Wilayah</label>
        <select id="pilih-rw">${opsiRw(false)}</select>
      </div>
      <div class="field">
        <label>Periode data</label>
        <div class="toolbar-note">${rentang ? `${tanggalPanjang(rentang.dari)} - ${tanggalPanjang(rentang.sampai)}` : "-"}</div>
      </div>
    </div>

    ${
      !rows.length
        ? notice("Belum ada data untuk wilayah ini.", "Pilih wilayah lain.")
        : `<div class="grid cols">
            ${card(kg(total.total, 0), "Total tertimbang", `${minggu.length} minggu`, "", "#0f766e")}
            ${card(kg(total.organik, 0), "Organik", `${num((total.organik / (total.total || 1)) * 100, 1)}% dari total`, "", "#16a34a")}
            ${card(kg(total.anorganik, 0), "Anorganik", `${num((total.anorganik / (total.total || 1)) * 100, 1)}% dari total`, "", "#0ea5e9")}
            ${card(kg(total.residu, 0), "Residu ke TPST", `${num((total.residu / (total.total || 1)) * 100, 1)}% dari total`, "", "#94a3b8")}
          </div>`
    }

    ${section(
      "Grafik mingguan",
      "Berat sampah per minggu (Senin - Minggu).",
      `<div class="card"><div class="chart-box"><canvas id="g-minggu"></canvas></div></div>`,
    )}

    ${section(
      "Rincian per minggu",
      "Satuan kilogram.",
      `<div class="card table-wrap">
        <table>
          <thead><tr><th>Minggu</th><th>Organik</th><th>Anorganik</th><th>Residu</th><th>Total</th></tr></thead>
          <tbody>
            ${
              minggu.length
                ? minggu
                    .slice()
                    .reverse()
                    .map(
                      (m) =>
                        `<tr><td>${esc(m.label)}</td><td>${num(m.organik, 1)}</td><td>${num(m.anorganik, 1)}</td><td>${num(m.residu, 1)}</td><td><strong>${num(m.total, 1)}</strong></td></tr>`,
                    )
                    .join("")
                : `<tr><td colspan="5" class="empty">Belum ada data</td></tr>`
            }
          </tbody>
          ${minggu.length ? `<tfoot><tr><td>Total</td><td>${num(total.organik, 1)}</td><td>${num(total.anorganik, 1)}</td><td>${num(total.residu, 1)}</td><td>${num(total.total, 1)}</td></tr></tfoot>` : ""}
        </table>
      </div>`,
    )}

    ${section(
      "Partisipasi rumah memilah",
      "Dari rekap mingguan kelurahan. Minggu mengikuti penomoran bulan pada rekap.",
      `<div class="card table-wrap">
        <table>
          <thead><tr><th>Periode</th><th>Rumah terdata</th><th>Sudah memilah</th><th>Persentase</th></tr></thead>
          <tbody>
            ${
              part.length
                ? part
                    .slice()
                    .reverse()
                    .map(
                      (p) =>
                        `<tr><td>${periodeLabel(p.periode)}</td><td>${num(p.rumah)}</td><td>${num(p.memilah)}</td><td>${num((p.memilah / (p.rumah || 1)) * 100, 1)}%</td></tr>`,
                    )
                    .join("")
                : `<tr><td colspan="4" class="empty">Belum ada data</td></tr>`
            }
          </tbody>
        </table>
      </div>`,
    )}

    <p class="catatan">
      Sumber: input harian "Laporan Aksi Pilah Sampah" (${num(data.meta.jumlahHarian)} entri) dan rekap mingguan
      "Tabel Pemilahan Sampah".${pAkhir ? ` Data terakhir: ${periodeLabel(pAkhir.periode)}.` : ""}
      Baris dengan tanggal atau RW tidak valid tidak ditampilkan dan dicatat di laporan pemeriksaan data.
    </p>
  `;

  const sel = document.getElementById("pilih-rw") as HTMLSelectElement;
  sel.value = rwPilah;
  sel.addEventListener("change", () => {
    rwPilah = sel.value;
    renderPilah(root);
  });

  if (minggu.length) {
    gambar("g-minggu", {
      type: "line",
      labels: minggu.map((m) => m.label),
      unit: "kg",
      seri: [
        { label: "Organik", data: minggu.map((m) => m.organik), color: WARNA.organik, fill: true },
        { label: "Anorganik", data: minggu.map((m) => m.anorganik), color: WARNA.anorganik, fill: true },
        { label: "Residu", data: minggu.map((m) => m.residu), color: WARNA.residu },
      ],
    });
  }
};

const renderBank = (root: HTMLElement): void => {
  hapusGrafik();

  if (!adaData || !data.bank.length) {
    root.innerHTML = `${pageHead("Bank sampah", "Setoran warga", "Data penimbangan bank sampah.")}
      ${notice("Data bank sampah belum tersedia.", "Tambahkan CSV bank sampah di folder data/, lalu jalankan npm run data.")}`;
    return;
  }

  const semuaPeriode = [...new Set(data.bank.map((b) => b.periode))].sort();
  if (bulanBank !== "semua" && !semuaPeriode.includes(bulanBank)) bulanBank = "semua";

  const rows = data.bank.filter(
    (b) => (rwBank === "semua" || b.rw === rwBank) && (bulanBank === "semua" || b.periode === bulanBank),
  );
  const seri = bankPerBulan(rwBank);

  const perUnit = new Map<string, { nama: string; rw: string; berat: number; entri: number }>();
  for (const b of rows) {
    const kunci = `${b.unit}|${b.nama}`;
    const acc = perUnit.get(kunci) ?? { nama: b.nama || b.unit || "Tanpa nama", rw: b.rw, berat: 0, entri: 0 };
    acc.berat += b.berat;
    acc.entri += 1;
    perUnit.set(kunci, acc);
  }
  const totalBerat = rows.reduce((s, b) => s + b.berat, 0);

  root.innerHTML = `
    ${pageHead(
      "Bank sampah",
      "Setoran warga per wilayah",
      "Berat sampah yang ditimbang di bank sampah, dihimpun dari form penimbangan bank sampah.",
    )}

    <div class="toolbar">
      <div class="field">
        <label for="pilih-rw">Wilayah</label>
        <select id="pilih-rw">${opsiRw(true)}</select>
      </div>
      <div class="field">
        <label for="pilih-bulan">Bulan</label>
        <select id="pilih-bulan">
          <option value="semua">Semua bulan</option>
          ${semuaPeriode.map((p) => `<option value="${esc(p)}">${esc(namaBulan(p.slice(5, 7)))} ${esc(p.slice(0, 4))}</option>`).join("")}
        </select>
      </div>
    </div>

    ${
      !rows.length
        ? notice("Belum ada setoran pada filter ini.", "Coba pilih wilayah atau bulan lain.")
        : `<div class="grid cols">
            ${card(kg(totalBerat, 1), "Total berat setoran", `${rows.length} penimbangan`, "", "#0f766e")}
            ${card(num(perUnit.size), "Bank sampah aktif", "unit penimbang pada filter ini", "unit", "#d97706")}
            ${card(kg(totalBerat / Math.max(perUnit.size, 1), 1), "Rata-rata per unit", "pada filter ini", "", "#0ea5e9")}
          </div>`
    }

    ${section(
      "Setoran per bulan",
      "Berat total sampah yang masuk ke bank sampah.",
      `<div class="card"><div class="chart-box"><canvas id="g-bank"></canvas></div></div>`,
    )}

    ${section(
      "Rincian per unit bank sampah",
      bulanBank === "semua" ? "Seluruh periode." : `${namaBulan(bulanBank.slice(5, 7))} ${bulanBank.slice(0, 4)}`,
      `<div class="card table-wrap">
        <table>
          <thead><tr><th>Bank sampah</th><th>Wilayah</th><th>Penimbangan</th><th>Berat (kg)</th></tr></thead>
          <tbody>
            ${
              perUnit.size
                ? [...perUnit.values()]
                    .sort((a, b) => b.berat - a.berat)
                    .map(
                      (u) =>
                        `<tr><td>${esc(u.nama)}</td><td>${esc(rwLabel(u.rw))}</td><td>${num(u.entri)}</td><td><strong>${num(u.berat, 1)}</strong></td></tr>`,
                    )
                    .join("")
                : `<tr><td colspan="4" class="empty">Belum ada data</td></tr>`
            }
          </tbody>
          ${perUnit.size ? `<tfoot><tr><td>Total</td><td></td><td>${num(rows.length)}</td><td>${num(totalBerat, 1)}</td></tr></tfoot>` : ""}
        </table>
      </div>`,
    )}

    <p class="catatan">
      Sumber: "Laporan Penimbangan Bank Sampah". Total berat adalah jumlah seluruh kolom hasil timbangan pada satu
      entri. Entri yang beratnya tidak terbaca (mis. diisi "TES") tidak dihitung.
    </p>
  `;

  const selRw = document.getElementById("pilih-rw") as HTMLSelectElement;
  selRw.value = rwBank;
  selRw.addEventListener("change", () => {
    rwBank = selRw.value;
    renderBank(root);
  });

  const selBulan = document.getElementById("pilih-bulan") as HTMLSelectElement;
  selBulan.value = bulanBank;
  selBulan.addEventListener("change", () => {
    bulanBank = selBulan.value;
    renderBank(root);
  });

  if (seri.length) {
    gambar("g-bank", {
      type: "bar",
      labels: seri.map((s) => namaBulan(s.periode.slice(5, 7))),
      unit: "kg",
      seri: [{ label: "Berat setoran", data: seri.map((s) => s.berat), color: WARNA.berat }],
    });
  }
};

// const renderTentang = (root: HTMLElement): void => {
//   const rentang = data.meta.rentangHarian;
//   root.innerHTML = `
//     ${pageHead(
//       "Tentang",
//       "Sumber dan batasan data",
//       "Halaman ini menjelaskan dari mana angka berasal, apa yang sengaja tidak ditampilkan, dan ke mana masyarakat bisa menyampaikan saran.",
//     )}

//     ${section(
//       "Inovasi",
//       "",
//       `<div class="card">
//         <p style="margin-top:0"><strong>KOMUNITAS</strong> - Kelola Olah Milah Untuk Nyiapin Jakarta Tanpa Sampah (Komunitas) adalah inovasi pelayanan publik Kelurahan Utan Panjang, Kecamatan Kemayoran, Jakarta Pusat, ditetapkan melalui Keputusan Lurah Utan Panjang Nomor 42 Tahun 2026 tanggal 29 Juni 2026.</p>
//         <p style="margin-bottom:0">Warga memilah sampah dari rumah dengan keterbatasan lahan, menaruhnya di titik yang disepakati, lalu petugas PPSU mengangkut dan mengolahnya di kantor kelurahan agar beban sampah ke TPST Bantar Gebang berkurang.</p>
//       </div>`,
//     )}

//     ${section(
//       "Sumber data",
//       "Tiga sumber, masing-masing untuk kebutuhan berbeda.",
//       `<div class="card table-wrap">
//         <table>
//           <thead><tr><th>Sumber</th><th>Dipakai untuk</th><th>Jumlah</th></tr></thead>
//           <tbody>
//             <tr><td>Laporan Aksi Pilah Sampah (input harian)</td><td>Berat organik, anorganik, residu per RW</td><td>${num(data.meta.jumlahHarian)} entri</td></tr>
//             <tr><td>Tabel Pemilahan Sampah (rekap mingguan)</td><td>Jumlah rumah dan rumah yang memilah</td><td>${num(data.meta.jumlahMingguan)} baris</td></tr>
//             <tr><td>Laporan Penimbangan Bank Sampah</td><td>Berat dan jumlah penimbangan bank sampah</td><td>${num(data.meta.jumlahBank)} entri</td></tr>
//           </tbody>
//         </table>
//       </div>
//       <p class="catatan">Periode data harian: ${rentang ? `${tanggalPanjang(rentang.dari)} - ${tanggalPanjang(rentang.sampai)}` : "-"} · ${rwList.length} RW.</p>`,
//     )}

//     ${section(
//       "Yang sengaja tidak ditampilkan",
//       "",
//       `<div class="card">
//         <ul class="catatan" style="margin:0;padding-left:18px">
//           <li>Kolom komposting, BSF magot, BSU, dan residu pada rekap mingguan, karena angkanya tidak konsisten dengan timbangan harian.</li>
//           <li>Entri bank sampah yang beratnya tidak terbaca.</li>
//           <li>Baris dengan tanggal atau RW tidak valid.</li>
//         </ul>
//         <p style="margin-bottom:0">Rincian baris yang perlu dicek ada di berkas <code>perlu-dicek.md</code> pada folder proyek.</p>
//       </div>`,
//     )}

//     ${section(
//       "Saran dan pengaduan",
//       "",
//       `<div class="card">
//         <p style="margin-top:0">Kelurahan Utan Panjang<br />Jl. D Bendungan Jago No. 49, Jakarta Pusat</p>
//         <p style="margin-bottom:0">Telepon 021-4208454 · kel_utanpanjang@jakarta.go.id</p>
//       </div>`,
//     )}
//   `;
// };

type Rute = { pola: string; render: (root: HTMLElement) => void };

const rute: Rute[] = [
  { pola: "/", render: renderBeranda },
  { pola: "/pilah", render: renderPilah },
  { pola: "/bank", render: renderBank },
  // { pola: "/tentang", render: renderTentang },
];

const navigasi = (): void => {
  const jalur = (location.hash.replace(/^#/, "") || "/").split("?")[0];
  const aktif = rute.find((r) => r.pola === jalur) ?? rute[0];
  hapusGrafik();
  document.querySelectorAll<HTMLAnchorElement>("#nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === aktif.pola);
  });
  aktif.render(app);
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
};

window.addEventListener("hashchange", navigasi);
navigasi();
