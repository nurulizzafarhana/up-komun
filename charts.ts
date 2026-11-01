import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Tooltip,
  Legend,
  Filler,
);

export const WARNA = {
  organik: "#16a34a",
  anorganik: "#0ea5e9",
  residu: "#94a3b8",
  berat: "#0f766e",
  memilah: "#d97706",
  rumah: "#94a3b8",
} as const;

const hidup = new Set<Chart>();

export type Seri = { label: string; data: number[]; color: string; fill?: boolean; garisPutus?: boolean };

type Opsi = {
  type: "line" | "bar";
  labels: string[];
  seri: Seri[];
  unit?: string;
};

const konfigurasi = (opsi: Opsi): ChartConfiguration => {
  const bar = opsi.type === "bar";
  return {
    type: opsi.type,
    data: {
      labels: opsi.labels,
      datasets: opsi.seri.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: bar ? `${s.color}cc` : `${s.color}22`,
        borderWidth: bar ? 0 : 2,
        borderRadius: bar ? 6 : 0,
        borderDash: s.garisPutus ? [5, 4] : undefined,
        pointRadius: bar ? 0 : 2.5,
        pointHoverRadius: 5,
        tension: 0.32,
        fill: s.fill ?? false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: opsi.seri.length > 1,
          position: "top",
          align: "end",
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
        },
        tooltip: {
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const v = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Number(ctx.raw));
              return ` ${ctx.dataset.label}: ${v}${opsi.unit ? ` ${opsi.unit}` : ""}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 } },
        y: {
          beginAtZero: true,
          grid: { color: "#eef2f1" },
          border: { display: false },
          ticks: {
            font: { size: 11 },
            callback: (v) =>
              new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v)),
          },
        },
      },
    },
  };
};

export const gambar = (id: string, opsi: Opsi): void => {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  hidup.add(new Chart(canvas, konfigurasi(opsi)));
};

export const hapusGrafik = (): void => {
  for (const c of hidup) c.destroy();
  hidup.clear();
};
