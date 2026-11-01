import datasetJson from "./dataset.json";

export type Harian = { tgl: string; rw: string; organik: number; anorganik: number; residu: number; entri: number };
export type Mingguan = { periode: string; bulan: string; minggu: number; rw: string; rumah: number; memilah: number };
export type Bank = { tgl: string; periode: string; unit: string; nama: string; rw: string; berat: number };

export type Dataset = {
  meta: {
    dibuat: string;
    rentangHarian: { dari: string; sampai: string } | null;
    jumlahHarian: number;
    jumlahMingguan: number;
    jumlahBank: number;
    jumlahRw: number;
    rw: string[];
    unitLain: string[];
    totalRumah: number | null;
  };
  harian: Harian[];
  mingguan: Mingguan[];
  bank: Bank[];
};

export const data = datasetJson as Dataset;
export const adaData = data.meta.jumlahHarian > 0;
export const rwList = data.meta.rw;

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export const num = (v: number, digits = 0): string => (Number.isFinite(v) ? (digits ? nf1.format(v) : nf0.format(v)) : "-");
export const kg = (v: number, digits = 1): string => `${num(v, digits)} kg`;

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const namaBulan = (mm: string, singkat = false): string => {
  const i = Number(mm) - 1;
  if (i < 0 || i > 11) return mm;
  return singkat ? SINGKAT[i] : NAMA_BULAN[i];
};

export const tanggalPendek = (iso: string): string => {
  const [, mm, dd] = iso.split("-");
  return `${Number(dd)} ${namaBulan(mm, true)}`;
};

export const tanggalPanjang = (iso: string): string => {
  const [yy, mm, dd] = iso.split("-");
  return `${Number(dd)} ${namaBulan(mm)} ${yy}`;
};

export const rwLabel = (rw: string): string => (/^\d{2}$/.test(rw) ? `RW ${rw}` : rw);

export const periodeLabel = (p: string, singkat = false): string => {
  const [, mm, w] = p.split("-");
  return `${namaBulan(mm, singkat)} M${w.replace("w", "")}`;
};

export type Bin = { key: string; label: string; organik: number; anorganik: number; residu: number; total: number };

const kosong = (key: string, label: string): Bin => ({ key, label, organik: 0, anorganik: 0, residu: 0, total: 0 });

export const filterRw = (rows: Harian[], rw: string): Harian[] => (rw === "semua" ? rows : rows.filter((r) => r.rw === rw));

export const byMonth = (rows: Harian[]): Bin[] => {
  const map = new Map<string, Bin>();
  for (const r of rows) {
    const key = r.tgl.slice(0, 7);
    const bin = map.get(key) ?? kosong(key, namaBulan(key.slice(5, 7)));
    bin.organik += r.organik;
    bin.anorganik += r.anorganik;
    bin.residu += r.residu;
    bin.total = bin.organik + bin.anorganik + bin.residu;
    map.set(key, bin);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const awalMinggu = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  const hari = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (hari === 0 ? -6 : 1 - hari));
  return d.toISOString().slice(0, 10);
};

const akhirMinggu = (start: string): string => {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
};

export const byWeek = (rows: Harian[]): Bin[] => {
  const map = new Map<string, Bin>();
  for (const r of rows) {
    const start = awalMinggu(r.tgl);
    const bin = map.get(start) ?? kosong(start, `${tanggalPendek(start)} - ${tanggalPendek(akhirMinggu(start))}`);
    bin.organik += r.organik;
    bin.anorganik += r.anorganik;
    bin.residu += r.residu;
    bin.total = bin.organik + bin.anorganik + bin.residu;
    map.set(start, bin);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const totalOf = (bins: Bin[]): Bin =>
  bins.reduce((acc, b) => {
    acc.organik += b.organik;
    acc.anorganik += b.anorganik;
    acc.residu += b.residu;
    acc.total += b.total;
    return acc;
  }, kosong("total", "Total"));

export type Partisipasi = { periode: string; rumah: number; memilah: number };

export const partisipasi = (rw = "semua"): Partisipasi[] => {
  const map = new Map<string, Partisipasi>();
  for (const m of data.mingguan) {
    if (rw !== "semua" && m.rw !== rw) continue;
    const acc = map.get(m.periode) ?? { periode: m.periode, rumah: 0, memilah: 0 };
    acc.rumah += m.rumah;
    acc.memilah += m.memilah;
    map.set(m.periode, acc);
  }
  return [...map.values()].sort((a, b) => a.periode.localeCompare(b.periode));
};

export type BankBin = { periode: string; berat: number; entri: number };

export const bankPerBulan = (rw = "semua"): BankBin[] => {
  const map = new Map<string, BankBin>();
  for (const b of data.bank) {
    if (rw !== "semua" && b.rw !== rw) continue;
    const acc = map.get(b.periode) ?? { periode: b.periode, berat: 0, entri: 0 };
    acc.berat += b.berat;
    acc.entri += 1;
    map.set(b.periode, acc);
  }
  return [...map.values()].sort((a, b) => a.periode.localeCompare(b.periode));
};

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export const card = (value: string, label: string, note = "", unit = "", accent = "#0f766e"): string => `
  <article class="card stat" style="--accent:${accent}">
    <div class="label">${esc(label)}</div>
    <div class="value">${value}${unit ? ` <small>${esc(unit)}</small>` : ""}</div>
    ${note ? `<div class="note">${esc(note)}</div>` : ""}
  </article>`;

export const section = (title: string, sub: string, body: string): string => `
  <section class="section">
    <h2>${esc(title)}</h2>
    ${sub ? `<p class="sub">${esc(sub)}</p>` : ""}
    ${body}
  </section>`;

export const pageHead = (eyebrow: string, title: string, desc: string): string => `
  <div class="page-head">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h1>${esc(title)}</h1>
    <p>${esc(desc)}</p>
  </div>`;

export const notice = (title: string, body: string): string =>
  `<div class="notice"><div><strong>${esc(title)}</strong>${esc(body)}</div></div>`;

export const opsiRw = (extra: boolean): string =>
  [
    `<option value="semua">Semua wilayah</option>`,
    ...rwList.map((rw) => `<option value="${esc(rw)}">${rwLabel(rw)}</option>`),
    ...(extra ? data.meta.unitLain.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`) : []),
  ].join("");
