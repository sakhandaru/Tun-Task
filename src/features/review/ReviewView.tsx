import { useRefreshToken, useWeeklyStats, useScoreStats } from '../../hooks/useLiveDb'

export function ReviewView() {
  const { token } = useRefreshToken()
  const stats = useWeeklyStats(token)
  const scores = useScoreStats(token)
  const rate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Review</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Refleksi & Skor Pencapaian</p>
      </header>

      <section>
        <h2 className="section-label mb-4">SKOR KAMU</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-muted)] p-6 text-white shadow-lg shadow-[var(--color-accent)]/20">
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-80">Hari Ini</p>
            <p className="mt-1 text-4xl font-bold">{scores.today}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Minggu Ini
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{scores.week}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <p className="font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Bulan Ini
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{scores.month}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{rate}%</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
              Kepatuhan Habit
            </p>
          </div>
          <div className="text-right font-mono text-[10px] text-[var(--color-text-muted)]">
            <p>{stats.done} SELESAI</p>
            <p>{stats.skipped} SKIP</p>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="space-y-3">
        <h2 className="section-label">Refleksi</h2>
        {[
          'Apa yang paling sering kamu lewati minggu ini?',
          'Satu hal kecil untuk minggu depan?',
          'Apa yang sudah berjalan baik — meski kecil?',
        ].map((q) => (
          <p
            key={q}
            className="py-4 text-sm leading-relaxed text-[var(--color-text)]"
          >
            {q}
          </p>
        ))}
      </section>

      <p className="text-center font-mono text-[10px] text-[var(--color-text-muted)]">
        KONSISTEN KECIL &gt; MOTIVASI BESAR
      </p>
    </div>
  )
}
