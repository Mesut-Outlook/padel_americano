import React, { useEffect, useMemo, useState } from "react";

// --- Data --------------------------------------------------------------
const PLAYERS = [
  "Mesut",
  "Berk",
  "Mumtaz",
  "Ahmet",
  "Erdem",
  "Sercan",
  "Sezgin",
  "Batuhan",
  "Emre",
  "Okan",
];

// Dynamic fixture generator: 2 courts, 3 weeks, 3 slots per week
function generateFixture(players, weeks = 3, slotsPerWeek = 3, courts = ["Saha 1", "Saha 2"]) {
  const n = players.length;
  const perSlotCapacity = courts.length * 4; // 8 players per slot
  const waitCount = Math.max(0, n - perSlotCapacity);
  const out = [];
  for (let w = 1; w <= weeks; w++) {
    for (let s = 1; s <= slotsPerWeek; s++) {
      const slotIndex = (w - 1) * slotsPerWeek + (s - 1);
      const waiters = [];
      for (let k = 0; k < waitCount; k++) {
        waiters.push(players[(slotIndex * waitCount + k) % n]);
      }
      const available = players.filter((p) => !waiters.includes(p));
      const rot = slotIndex % available.length;
      const rotated = available.slice(rot).concat(available.slice(0, rot));
      for (let c = 0; c < courts.length; c++) {
        const base = c * 4;
        const t1 = [rotated[base], rotated[base + 1]];
        const t2 = [rotated[base + 2], rotated[base + 3]];
        out.push({ week: w, slot: s, court: courts[c], t1, t2, wait: waiters.join(" & ") });
      }
    }
  }
  return out;
}

// Schedule: Week, Slot, Court, Team1, Team2, Waiting
const FIXTURE = generateFixture(PLAYERS);

// --- Helpers -----------------------------------------------------------
const KEY_POINTS = "americano_points_v3"; // manual extras
const KEY_MATCHES = "americano_matches_v3"; // numeric scores per match

function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);
  return [state, setState];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// --- Main Component ----------------------------------------------------
export default function App() {
  const [activeWeek, setActiveWeek] = useState(1);
  // manual points (optional adjustments)
  const [points, setPoints] = useLocalStorage(
    KEY_POINTS,
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  // match scores: key -> { t1: number, t2: number }
  const [matches, setMatches] = useLocalStorage(KEY_MATCHES, {});

  const weekList = useMemo(() => Array.from(new Set(FIXTURE.map((m) => m.week))), []);
  const filtered = useMemo(
    () => FIXTURE.filter((m) => m.week === activeWeek).sort((a, b) => a.slot - b.slot || a.court.localeCompare(b.court)),
    [activeWeek]
  );

  // Compute auto points from recorded scores
  // Rule: each player gets team-score points, and winners (team with score === 32) get +10 bonus each.
  const autoAward = useMemo(() => {
    const award = Object.fromEntries(PLAYERS.map((p) => [p, 0]));
    for (const m of FIXTURE) {
      const key = `${m.week}-${m.slot}-${m.court}`;
      const rec = matches[key];
      if (!rec) continue;
      const t1 = clamp(Number(rec.t1) || 0, 0, 32);
      const t2 = clamp(Number(rec.t2) || 0, 0, 32);
      // add base points
      for (const p of m.t1) award[p] += t1;
      for (const p of m.t2) award[p] += t2;
      // winner bonus
      if (t1 === 32 && t2 <= 31) {
        for (const p of m.t1) award[p] += 10;
      } else if (t2 === 32 && t1 <= 31) {
        for (const p of m.t2) award[p] += 10;
      }
    }
    return award;
  }, [matches]);

  const leaderboard = useMemo(() => {
    const rows = PLAYERS.map((p) => ({
      player: p,
      manual: points[p] || 0,
      auto: autoAward[p] || 0,
      total: (points[p] || 0) + (autoAward[p] || 0),
    }));
    rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
    return rows;
  }, [points, autoAward]);

  function setScore(week, slot, court, side, value) {
    const key = `${week}-${slot}-${court}`;
    const cur = matches[key] || { t1: 0, t2: 0 };
    const next = { ...cur, [side]: clamp(Number(value) || 0, 0, 32) };
    setMatches({ ...matches, [key]: next });
  }

  function resetAll() {
    if (!confirm("Tüm skorlar ve sonuçlar sıfırlansın mı?")) return;
    setPoints(Object.fromEntries(PLAYERS.map((p) => [p, 0])));
    setMatches({});
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">Padel Americano — Fixture & Scoreboard</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-600">Maç kuralı: <strong>32'ye kadar</strong>, kazanan takımdaki her oyuncuya <strong>+10</strong> bonus.</div>
            <button onClick={resetAll} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-100">Sıfırla</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-8 lg:grid-cols-5">
        {/* Fixture */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex gap-2 flex-wrap">
            {weekList.map((w) => (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={
                  "px-3 py-1.5 rounded-xl border text-sm " +
                  (activeWeek === w ? "bg-gray-900 text-white" : "hover:bg-gray-100")
                }
              >
                Hafta {w}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {filtered.map((m) => {
              const k = `${m.week}-${m.slot}-${m.court}`;
              const rec = matches[k] || { t1: 0, t2: 0 };
              const t1 = rec.t1 ?? 0;
              const t2 = rec.t2 ?? 0;

              const validWinner = (t1 === 32 && t2 <= 31) || (t2 === 32 && t1 <= 31);

              return (
                <div key={k} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-gray-500">
                      Slot {m.slot} · {m.court} · Bekleyen: <span className="font-semibold text-gray-700">{m.wait}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-1">30 dk</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`rounded-xl border p-3 ${t1 === 32 ? "ring-2 ring-gray-800" : ""}`}>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Takım 1</div>
                      <div className="text-base font-semibold">{m.t1.join(" & ")}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={32}
                          value={t1}
                          onChange={(e) => setScore(m.week, m.slot, m.court, "t1", e.target.value)}
                          className="w-24 rounded-lg border px-2 py-1"
                          title="Takım 1 skoru (0-32)"
                        />
                        <span className="text-xs text-gray-500">/ 32</span>
                      </div>
                    </div>

                    <div className={`rounded-xl border p-3 ${t2 === 32 ? "ring-2 ring-gray-800" : ""}`}>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Takım 2</div>
                      <div className="text-base font-semibold">{m.t2.join(" & ")}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={32}
                          value={t2}
                          onChange={(e) => setScore(m.week, m.slot, m.court, "t2", e.target.value)}
                          className="w-24 rounded-lg border px-2 py-1"
                          title="Takım 2 skoru (0-32)"
                        />
                        <span className="text-xs text-gray-500">/ 32</span>
                      </div>
                    </div>
                  </div>

                  {!validWinner && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      Geçerli sonuç için: <strong>bir takım 32</strong> olmalı ve diğeri <strong>≤ 31</strong> kalmalı.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Scoreboard */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold">Skor Tablosu</h2>
              <div className="text-xs text-gray-500">Puanlama: takım skoru + (kazanana kişi başı +10).</div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">Oyuncu</th>
                    <th className="py-2 pr-4">Manuel (+/−)</th>
                    <th className="py-2 pr-4">Maçlardan</th>
                    <th className="py-2">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.player} className="border-t">
                      <td className="py-2 pr-4 font-medium">{row.player}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          className="w-24 rounded-lg border px-2 py-1"
                          value={row.manual}
                          onChange={(e) =>
                            setPoints({ ...points, [row.player]: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="py-2 pr-4">{row.auto}</td>
                      <td className="py-2 font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export / Import */}
          <div className="mt-4 grid gap-3">
            <button
              onClick={() => {
                const payload = { points, matches };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `americano-score-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100"
            >
              Verileri Dışa Aktar (JSON)
            </button>

            <label className="inline-flex items-center gap-2 text-sm">
              <span className="rounded-xl border px-3 py-2 hover:bg-gray-100 cursor-pointer">Veri Yükle (JSON)</span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try {
                    const data = JSON.parse(text);
                    if (data.points) setPoints(data.points);
                    if (data.matches) setMatches(data.matches);
                  } catch (err) {
                    alert("Dosya okunamadı. Geçerli bir JSON seçin.");
                  }
                }}
              />
            </label>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <div>Her Çarşamba · 1,5 saat · 2 saha · her maç 30 dk · {Math.max(0, PLAYERS.length - 8)} oyuncu beklemede</div>
          <div>© Americano Organizer</div>
        </div>
      </footer>
    </div>
  );
}
