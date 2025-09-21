import React, { useEffect, useMemo, useState } from "react";

// --- Data --------------------------------------------------------------
// Players will be fetched from players.json
// const PLAYERS = [...]; // removed hardcoded list

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

// We'll create fixture after players are loaded
// const FIXTURE = generateFixture(PLAYERS);

// --- Helpers -----------------------------------------------------------
const KEY_POINTS = "americano_points_v3"; // manual extras
const KEY_MATCHES = "americano_matches_v3"; // numeric scores per match
const KEY_CONFIG = "americano_config_v1";
const KEY_PLAYERS_OVERRIDE = "americano_players_override_v1";

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
  const [players, setPlayers] = useState(null);
  const [fixture, setFixture] = useState([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [points, setPoints] = useLocalStorage(KEY_POINTS, {});
  const [matches, setMatches] = useLocalStorage(KEY_MATCHES, {});
  const [config, setConfig] = useLocalStorage(KEY_CONFIG, { weeks: 5, slotsPerWeek: 3, courts: ["Saha 1","Saha 2"] });
  const [playersOverride, setPlayersOverride] = useLocalStorage(KEY_PLAYERS_OVERRIDE, null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [plText, setPlText] = useState("");
  const [courtsText, setCourtsText] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [courtCount, setCourtCount] = useState(Array.isArray(config.courts) ? config.courts.length : 2);
  const [activeSlot, setActiveSlot] = useState("all");
  const [activeCourt, setActiveCourt] = useState("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (Array.isArray(playersOverride) && playersOverride.length > 0) return playersOverride;
      const r = await fetch('players.json');
      return await r.json();
    };
    load()
      .then((list) => {
        if (!mounted) return;
        setPlayers(list);
        setFixture(generateFixture(list, config.weeks, config.slotsPerWeek, config.courts));
        setPoints((prev) => {
          const hasAny = prev && Object.keys(prev).length > 0;
          if (hasAny) return prev;
          return Object.fromEntries(list.map((p) => [p, 0]));
        });
      })
      .catch(() => {
        const fallback = ["Mesut","Berk","Mumtaz","Ahmet","Erdem","Sercan","Sezgin","Batuhan","Emre","Okan"];
        setPlayers(fallback);
        setFixture(generateFixture(fallback, config.weeks, config.slotsPerWeek, config.courts));
        setPoints((prev) => {
          const hasAny = prev && Object.keys(prev).length > 0;
          if (hasAny) return prev;
          return Object.fromEntries(fallback.map((p) => [p, 0]));
        });
      });
    return () => { mounted = false; };
  }, [playersOverride, config.weeks, config.slotsPerWeek, config.courts]);

  useEffect(() => { if (players) setPlText(players.join("\n")); }, [players]);
  useEffect(() => { if (config) setCourtsText((config.courts || []).join(", ")); }, [config]);
  useEffect(() => { if (players) setFixture(generateFixture(players, config.weeks, config.slotsPerWeek, config.courts)); }, [players, config]);
  useEffect(() => { setCourtCount(Array.isArray(config.courts) ? config.courts.length : 2); }, [config]);

  const parsedPlayers = useMemo(() => {
    return Array.from(new Set((plText || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean)));
  }, [plText]);

  // Load config.json if no local override for config
  useEffect(() => {
    try { if (window.localStorage.getItem(KEY_CONFIG)) return; } catch {}
    (async () => {
      try {
        const r = await fetch('config.json');
        if (!r.ok) return;
        const cfg = await r.json();
        if (!cfg) return;
        const weeks = Number(cfg.weeks) || 5;
        const slotsPerWeek = Number(cfg.slotsPerWeek) || 3;
        const courts = Array.isArray(cfg.courts) ? cfg.courts.filter(Boolean) : ["Saha 1","Saha 2"];
        setConfig({ weeks, slotsPerWeek, courts });
      } catch {}
    })();
  }, []);

  const weekList = useMemo(() => Array.from(new Set(fixture.map((m) => m.week))), [fixture]);
  const slotList = useMemo(() => {
    const list = fixture.filter((m) => m.week === activeWeek).map(m=>m.slot);
    return Array.from(new Set(list)).sort((a,b)=>a-b);
  }, [fixture, activeWeek]);
  useEffect(()=> { setActiveSlot("all"); setActiveCourt("all"); }, [activeWeek, config.courts]);
  const filtered = useMemo(() => {
    return fixture
      .filter((m) => m.week === activeWeek)
      .filter((m) => (activeSlot === "all" ? true : m.slot === Number(activeSlot)))
      .filter((m) => (activeCourt === "all" ? true : m.court === activeCourt))
      .sort((a, b) => a.slot - b.slot || a.court.localeCompare(b.court));
  }, [activeWeek, fixture, activeSlot, activeCourt]);

  // Compute auto points from recorded scores
  // Rule: each player gets team-score points, and winners (team with score === 32) get +10 bonus each.
  const autoAward = useMemo(() => {
    if (!players) return {};
    const award = Object.fromEntries(players.map((p) => [p, 0]));
    for (const m of fixture) {
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
  }, [matches, players, fixture]);

  const leaderboard = useMemo(() => {
    if (!players) return [];
    const rows = players.map((p) => ({
      player: p,
      manual: points[p] || 0,
      auto: autoAward[p] || 0,
      total: (points[p] || 0) + (autoAward[p] || 0),
    }));
    rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
    return rows;
  }, [points, autoAward, players]);

  const uniqueOpponents = useMemo(() => {
    if (!players) return {};
    const map = {};
    for (const m of fixture) {
      const t1 = m.t1 || [], t2 = m.t2 || [];
      for (const a of t1) {
        map[a] = map[a] || new Set();
        for (const b of t2) map[a].add(b);
      }
      for (const b of t2) {
        map[b] = map[b] || new Set();
        for (const a of t1) map[b].add(a);
      }
    }
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.from(v).sort()]));
  }, [fixture, players]);

  function setScore(week, slot, court, side, value) {
    const key = `${week}-${slot}-${court}`;
    const cur = matches[key] || { t1: 0, t2: 0 };
    const next = { ...cur, [side]: clamp(Number(value) || 0, 0, 32) };
    setMatches({ ...matches, [key]: next });
  }

  function resetAll() {
    if (!confirm("Tüm skorlar ve sonuçlar sıfırlansın mı?")) return;
    if (players) setPoints(Object.fromEntries(players.map((p) => [p, 0])));
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
            <button onClick={() => setShowAdmin((v) => !v)} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-100">
              {showAdmin ? "Yönetimi Gizle" : "Yönetimi Aç"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-8 lg:grid-cols-5">
        {!players && (
          <div className="lg:col-span-5 text-sm text-gray-600">Oyuncular yükleniyor...</div>
        )}
        {/* Fixture */}
        {players && (
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
                Tur {w}
              </button>
            ))}
            <div className="ml-auto flex gap-2 items-center">
              <label className="text-xs text-gray-600">Slot:</label>
              <select value={activeSlot} onChange={(e)=> setActiveSlot(e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                <option value="all">Tümü</option>
                {slotList.map((s)=> (<option key={s} value={String(s)}>{s}</option>))}
              </select>
              <label className="text-xs text-gray-600">Saha:</label>
              <select value={activeCourt} onChange={(e)=> setActiveCourt(e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                <option value="all">Tümü</option>
                {(config.courts||[]).map((c)=> (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-amber-500 text-gray-900 px-2.5 py-1 text-xs font-semibold">Slot {m.slot}</span>
                      <span className="inline-flex items-center rounded-md bg-emerald-600 text-white px-2.5 py-1 text-xs font-semibold">{m.court}</span>
                      <span className="text-sm text-gray-600">Bekleyen: <span className="font-semibold text-gray-800">{m.wait || "-"}</span></span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1">30 dk</span>
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
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.target.select()}
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
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.target.select()}
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
        )}

        {/* Scoreboard */}
  {players && (
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
        )}
        {showAdmin && (
          <section className="lg:col-span-5">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-lg font-semibold">Yönetim Paneli</h2>
                <div className="text-xs text-gray-500">Bu değişiklikler localStorage'da saklanabilir; players.json'a yazmak için indirip depoya ekleyin.</div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Oyuncular (bir satır = bir oyuncu)</label>
                  <textarea value={plText} onChange={(e)=>setPlText(e.target.value)} rows={10} className="w-full rounded-lg border px-2 py-2" />
                  <div className="flex gap-2 items-center">
                    <input type="text" value={newPlayer} placeholder="Yeni oyuncu adı" onChange={(e)=> setNewPlayer(e.target.value)} className="flex-1 rounded-lg border px-2 py-1" />
                    <button className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-100" onClick={() => {
                      const name = (newPlayer || '').trim();
                      if (!name) return;
                      const arr = Array.from(new Set((plText || '').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).concat([name])));
                      setPlText(arr.join('\n'));
                      setNewPlayer('');
                    }}>Ekle</button>
                  </div>
                  <div className="max-h-48 overflow-auto rounded-lg border">
                    <ul className="divide-y">
                      {parsedPlayers.map((p) => (
                        <li key={p} className="flex items-center justify-between px-2 py-1.5 text-sm">
                          <span>{p}</span>
                          <button className="text-red-600 hover:underline" onClick={() => {
                            const next = parsedPlayers.filter(x => x !== p);
                            setPlText(next.join('\n'));
                          }}>Sil</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Tur (round) sayısı</label>
                  <input type="number" min={1} value={config.weeks} onChange={(e)=> setConfig({...config, weeks: Math.max(1, Number(e.target.value)||1)})} className="w-40 rounded-lg border px-2 py-1" />
                  <label className="text-sm font-medium mt-2">Tur başına slot</label>
                  <input type="number" min={1} value={config.slotsPerWeek} onChange={(e)=> setConfig({...config, slotsPerWeek: Math.max(1, Number(e.target.value)||1)})} className="w-40 rounded-lg border px-2 py-1" />
                  <label className="text-sm font-medium mt-2">Saha sayısı</label>
                  <input type="number" min={1} value={courtCount} onChange={(e)=> {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setCourtCount(n);
                    const auto = Array.from({ length: n }, (_, i) => `Saha ${i+1}`);
                    setCourtsText(auto.join(', '));
                    setConfig({ ...config, courts: auto });
                  }} className="w-40 rounded-lg border px-2 py-1" />
                  <label className="text-sm font-medium mt-2">Sahalar (virgülle ayırın)</label>
                  <input type="text" value={courtsText} onChange={(e)=> setCourtsText(e.target.value)} className="w-full rounded-lg border px-2 py-1" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                  const newPlayers = Array.from(new Set(plText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)));
                  const newCourts = courtsText.split(',').map(s=>s.trim()).filter(Boolean);
                  if (newPlayers.length === 0) { alert('En az 1 oyuncu girin.'); return; }
                  if (newCourts.length === 0) { alert('En az 1 saha girin.'); return; }
                  setPlayers(newPlayers);
                  setConfig((prev)=> ({...prev, courts: newCourts}));
                  setFixture(generateFixture(newPlayers, config.weeks, config.slotsPerWeek, newCourts));
                  setPoints((prev)=> {
                    const next = {};
                    for (const p of newPlayers) next[p] = prev?.[p] || 0;
                    return next;
                  });
                  setMatches({});
                }}>Ayarları Uygula (bu oturum)</button>

                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                  const newPlayers = Array.from(new Set(plText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)));
                  setPlayersOverride(newPlayers);
                  alert('Oyuncu listesi bu cihazda kaydedildi (override). Sayfayı yenilerseniz de bu liste kullanılacak.');
                }}>Yerelde Kaydet (override)</button>

                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                  const data = players || [];
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'players.json';
                  document.body.appendChild(a);
                  a.click(); a.remove();
                  URL.revokeObjectURL(url);
                }}>players.json indir</button>

                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                  const cfg = { weeks: config.weeks, slotsPerWeek: config.slotsPerWeek, courts: courtsText.split(',').map(s=>s.trim()).filter(Boolean) };
                  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'config.json';
                  document.body.appendChild(a);
                  a.click(); a.remove();
                  URL.revokeObjectURL(url);
                }}>config.json indir</button>

                <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                  if (!confirm("Yerel override temizlensin ve players.json'a geri dönülsün mü?")) return;
                  try { window.localStorage.removeItem(KEY_PLAYERS_OVERRIDE); } catch {}
                  window.location.reload();
                }}>Override'i Temizle</button>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-100" onClick={() => {
                    if (!confirm("Konfigürasyon (hafta/slot/saha) yerel olarak sıfırlansın mı?")) return;
                    try { window.localStorage.removeItem(KEY_CONFIG); } catch {}
                    window.location.reload();
                  }}>Config override'ı Temizle</button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Rakip Çeşitliliği</h3>
                {players && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1 pr-3">Oyuncu</th>
                          <th className="py-1 pr-3">Farklı Rakip Sayısı</th>
                          <th className="py-1">Liste</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => (
                          <tr key={p} className="border-t">
                            <td className="py-1 pr-3 font-medium">{p}</td>
                            <td className="py-1 pr-3">{(uniqueOpponents[p] || []).length || 0}</td>
                            <td className="py-1">{(uniqueOpponents[p] || []).join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
    <div>Her Çarşamba · 1,5 saat · {Array.isArray(config?.courts) ? config.courts.length : 2} saha · her maç 30 dk · {players ? Math.max(0, players.length - (Array.isArray(config?.courts) ? config.courts.length * 4 : 8)) : 0} oyuncu beklemede</div>
          <div>© Americano Organizer</div>
        </div>
      </footer>
    </div>
  );
}
