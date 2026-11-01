import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";

const DATA_DIR = join(process.cwd(), "data");
const OUT_JSON = join(process.cwd(), "dataset.json");
const OUT_REPORT = join(process.cwd(), "perlu-dicek.md");
const TAHUN = 2026;

type Harian = { tgl: string; rw: string; organik: number; anorganik: number; residu: number; entri: number };
type Mingguan = { periode: string; bulan: string; minggu: number; rw: string; rumah: number; memilah: number };
type Bank = { tgl: string; periode: string; unit: string; nama: string; rw: string; berat: number };

const BULAN: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
  juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
};

const catatan: string[] = [];
const catat = (pesan: string): void => {
  catatan.push(pesan);
};

const parseNum = (raw: string | undefined): number => {
  if (raw == null) return NaN;
  let s = String(raw).trim().toLowerCase().replace(/rp|kg|\u00a0/g, "").replace(/\s/g, "");
  if (s === "" || s === "-" || s === "o" || s === "tidak" || s === "tes") return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const parseTanggal = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const hari = m[1].padStart(2, "0");
    const bl = m[2].padStart(2, "0");
    return `${m[3]}-${bl}-${hari}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
};

const rwKode = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const m = String(raw).match(/\d+/);
  if (!m) return null;
  return String(Number(m[0])).padStart(2, "0");
};

const baca = (path: string): string[][] => {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const out = Papa.parse<string[]>(text, { header: false, skipEmptyLines: "greedy" });
  const rows = (out.data as string[][]).map((r) => r.map((c) => (c ?? "").toString()));
  return rows;
};

const pilihFile = (kunci: RegExp): string | null => {
  if (!existsSync(DATA_DIR)) return null;
  const f = readdirSync(DATA_DIR).filter((n) => n.toLowerCase().endsWith(".csv")).find((n) => kunci.test(n));
  return f ? join(DATA_DIR, f) : null;
};

const harianMap = new Map<string, Harian>();
const harianPath = pilihFile(/aksi pilah/i);
if (harianPath) {
  const rows = baca(harianPath);
  const header = rows[0].map((h) => h.trim());
  const idx = (nama: string): number => header.findIndex((h) => h.toLowerCase() === nama.toLowerCase());
  const iTgl = idx("Tangal Aksi Pilah Sampah");
  const iRw = idx("Wilayah Pilah Sampah");
  const iOrg = idx("Data Sampah Organik");
  const iAn1 = idx("Data Sampah AnOrganik");
  const iAn2 = idx("Data Sampah Anorganik");
  const iRes = idx("Data Sampah Residu / B3");

  let dilewati = 0;
  let nonNumerik = 0;
  const tahunAneh: string[] = [];
  const mentah: Harian[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const tgl = parseTanggal(row[iTgl]);
    const rw = rwKode(row[iRw]);
    if (!tgl || !rw) {
      dilewati++;
      continue;
    }
    if (tgl.slice(0, 4) !== String(TAHUN)) {
      tahunAneh.push(`${row[iTgl]?.trim()} (${row[iRw]?.trim()})`);
      continue;
    }
    const organik = parseNum(row[iOrg]);
    const anorganik = (parseNum(row[iAn1]) || 0) + (parseNum(row[iAn2]) || 0);
    const residu = parseNum(row[iRes]);
    if (!Number.isFinite(organik)) nonNumerik++;
    mentah.push({ tgl, rw, organik: organik, anorganik: anorganik, residu: residu, entri: 1 });
  }

  const tanggalUnik = [...new Set(mentah.map((m) => m.tgl))].sort();
  const selisihHari = (a: string, b: string): number =>
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000;
  let awal = 0;
  let panjang = 0;
  let iAwal = 0;
  for (let i = 1; i <= tanggalUnik.length; i++) {
    if (i === tanggalUnik.length || selisihHari(tanggalUnik[i - 1], tanggalUnik[i]) > 7) {
      if (i - iAwal > panjang) {
        panjang = i - iAwal;
        awal = iAwal;
      }
      iAwal = i;
    }
  }
  const rentang = new Set(tanggalUnik.slice(awal, awal + panjang));
  const luarRentang = tanggalUnik.filter((t) => !rentang.has(t));
  for (const m of mentah) {
    if (!rentang.has(m.tgl)) continue;
    const key = `${m.tgl}|${m.rw}`;
    const acc = harianMap.get(key) ?? { tgl: m.tgl, rw: m.rw, organik: 0, anorganik: 0, residu: 0, entri: 0 };
    acc.organik += m.organik;
    acc.anorganik += m.anorganik;
    acc.residu += m.residu;
    acc.entri += 1;
    harianMap.set(key, acc);
  }
  if (luarRentang.length) {
    catat(
      `${luarRentang.length} tanggal harian berada jauh di luar rentang pengisian dan tidak dihitung (kemungkinan salah ketik): ${luarRentang.join(", ")}.`,
    );
  }
  if (dilewati) catat(`${rows.length - 1} baris harian dibaca, ${dilewati} baris dilewati karena tanggal/RW tidak valid.`);
  if (tahunAneh.length) catat(`${tahunAneh.length} baris harian bertahun salah ketik sehingga tidak dihitung: ${tahunAneh.join("; ")}.`);
  if (nonNumerik) catat(`${nonNumerik} baris harian punya kolom organik kosong/tidak angka; dihitung 0.`);
} else {
  catat("File harian (Laporan Aksi Pilah Sampah) tidak ditemukan.");
}

const mingguan: Mingguan[] = [];
let totalRumah: number | null = null;
const rekapPath = pilihFile(/tabel pemilahan/i);
if (rekapPath) {
  const rows = baca(rekapPath);
  let bulanAktif = "";
  let mingguAktif = 0;
  let rwAktif = "";
  let blok = 0;

  for (const row of rows) {
    const gabung = row.join("|");
    if (/Periode\s*\/\s*Minggu/i.test(gabung)) {
      const m = gabung.match(/Minggu\s*ke-(\d+)/i);
      mingguAktif = m ? Number(m[1]) : 0;
      blok++;
      rwAktif = "";
      continue;
    }
    if (/^\s*Bulan/i.test(gabung)) {
      const m = gabung.match(/:\s*([A-Za-z]+)/);
      bulanAktif = m ? (BULAN[m[1].toLowerCase()] ?? "") : "";
      continue;
    }
    if (!/^\d+$/.test((row[0] ?? "").trim())) continue;

    const rwSel = rwKode(row[3]) ?? rwAktif;
    if (!rwSel) continue;
    rwAktif = rwSel;
    const rumah = parseNum(row[5]);
    const memilah = parseNum(row[6]);
    if (!bulanAktif || !mingguAktif || !Number.isFinite(rumah) || !Number.isFinite(memilah)) {
      continue;
    }
    mingguan.push({
      periode: `${TAHUN}-${bulanAktif}-w${mingguAktif}`,
      bulan: bulanAktif,
      minggu: mingguAktif,
      rw: rwSel,
      rumah,
      memilah,
    });
  }
  const perPeriode = new Map<string, number>();
  for (const m of mingguan) perPeriode.set(m.periode, (perPeriode.get(m.periode) ?? 0) + m.memilah);
  const duplikat = [...perPeriode.entries()].filter(([, v], i, arr) => arr.findIndex(([, x]) => x === v) !== i);
  for (const [p] of duplikat) catat(`Rekap ${p}: jumlah rumah memilah sama persis dengan periode lain - kemungkinan disalin, perlu dicek.`);

  const aneh = mingguan.filter((m) => m.memilah > m.rumah);
  if (aneh.length) catat(`${aneh.length} baris rekap punya rumah memilah > jumlah rumah (${aneh.map((a) => `RW ${a.rw} ${a.periode}`).slice(0, 5).join(", ")}).`);

  const periodeTerakhir = mingguan.map((m) => m.periode).sort().at(-1) ?? null;
  totalRumah = periodeTerakhir
    ? mingguan.filter((m) => m.periode === periodeTerakhir).reduce((s, m) => s + m.rumah, 0)
    : null;
  catat(`Rekap: ${blok} blok minggu terbaca, ${mingguan.length} baris per RT. Kolom komposting/BSF/BSU tidak dipakai karena tidak konsisten dengan data harian.`);
} else {
  catat("File rekap mingguan (Tabel Pemilahan) tidak ditemukan.");
}

const bank: Bank[] = [];
const bankPath = pilihFile(/penimbangan|bank sampah/i);
if (bankPath) {
  const rows = baca(bankPath);
  const header = rows[0].map((h) => h.trim());
  const iUnit = header.findIndex((h) => /^UNIT BANK SAMPAH$/i.test(h));
  const iNama = header.findIndex((h) => /^NAMA BANK SAMPAH$/i.test(h));
  const iTglTimbang = header.findIndex((h) => /TANGGAL PENIMBANGAN/i.test(h));
  const kolomBerat = header
    .map((h, i) => (/HASIL TIMBANGAN/i.test(h) ? i : -1))
    .filter((i) => i >= 0);

  let tanpaBerat = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const berat = kolomBerat.reduce((s, i) => {
      const v = parseNum(row[i]);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
    if (!(berat > 0)) {
      tanpaBerat++;
      continue;
    }
    const tgl = parseTanggal(row[iTglTimbang]) ?? parseTanggal(row[0]) ?? null;
    if (!tgl) {
      tanpaBerat++;
      continue;
    }
    const unit = (row[iUnit] ?? "").trim();
    bank.push({
      tgl,
      periode: tgl.slice(0, 7),
      unit,
      nama: (row[iNama] ?? "").trim(),
      rw: rwKode(unit) ?? (unit ? unit.toUpperCase() : "LAINNYA"),
      berat,
    });
  }
  catat(`Bank sampah: ${rows.length - 1} entri, ${tanpaBerat} dilewati karena berat/tanggal tidak terbaca (mis. isian "TES").`);
} else {
  catat("File bank sampah tidak ditemukan.");
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

const harian = [...harianMap.values()]
  .map((h) => ({ ...h, organik: r2(h.organik), anorganik: r2(h.anorganik), residu: r2(h.residu) }))
  .sort((a, b) => a.tgl.localeCompare(b.tgl) || a.rw.localeCompare(b.rw));
mingguan.sort((a, b) => a.periode.localeCompare(b.periode) || a.rw.localeCompare(b.rw));
bank.sort((a, b) => a.tgl.localeCompare(b.tgl));

const rwList = [...new Set([...harian.map((h) => h.rw), ...mingguan.map((m) => m.rw)])].sort();
const unitLain = [...new Set(bank.map((b) => b.rw).filter((r) => !/^\d{2}$/.test(r)))].sort();

const dataset = {
  meta: {
    dibuat: new Date().toISOString(),
    rentangHarian: harian.length ? { dari: harian[0].tgl, sampai: harian[harian.length - 1].tgl } : null,
    jumlahHarian: harian.reduce((s, h) => s + h.entri, 0),
    jumlahMingguan: mingguan.length,
    jumlahBank: bank.length,
    jumlahRw: rwList.length,
    rw: rwList,
    unitLain,
    totalRumah,
  },
  harian,
  mingguan,
  bank,
};

writeFileSync(OUT_JSON, JSON.stringify(dataset), "utf8");

const laporan = [
  "# Catatan Pemeriksaan Data",
  "",
  `Dibuat: ${new Date().toLocaleString("id-ID")}`,
  "",
  "## Ringkasan",
  "",
  `- Baris harian terbaca: ${dataset.meta.jumlahHarian}`,
  `- Rentang harian: ${dataset.meta.rentangHarian ? `${dataset.meta.rentangHarian.dari} s.d. ${dataset.meta.rentangHarian.sampai}` : "-"}`,
  `- Baris rekap mingguan: ${dataset.meta.jumlahMingguan}`,
  `- Entri bank sampah: ${dataset.meta.jumlahBank}`,
  `- Jumlah RW: ${dataset.meta.jumlahRw}`,
  "",
  "## Yang perlu dicek",
  "",
  ...(catatan.length ? catatan.map((c) => `- [ ] ${c}`) : ["Tidak ada catatan."]),
  "",
  "## Yang tidak ditampilkan di web",
  "",
  "- Kolom komposting, BSF magot, BSU, dan residu pada rekap mingguan (angkanya tidak konsisten dengan timbangan harian).",
  "- Isian bank sampah yang beratnya tidak terbaca (mis. \"TES\").",
  "",
].join("\n");

writeFileSync(OUT_REPORT, laporan, "utf8");

console.log(`harian=${dataset.meta.jumlahHarian} (${harian.length} baris harian-RW)`);
console.log(`mingguan=${mingguan.length} bank=${bank.length} rw=${rwList.length}`);
console.log(`catatan=${catatan.length} -> perlu-dicek.md`);


