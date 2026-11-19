import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BY_ID, GENERAL, NEGATIVE, POSITIVE, type Buff } from './data/buffs';
import { conflictOf, readFromHash, readFromStorage, saveToStorage, shareUrl, summarize } from './build';
import untarLogo from './assets/untar-logo.png';
import eftLogo from './assets/eft-logo.png';

const iconUrl = (id: string) => `${import.meta.env.BASE_URL}icons/${id}.png`;

function signed(buff: Buff) {
  if (buff.kind === 'general') return '';
  return buff.kind === 'positive' ? ` (−${buff.points})` : ` (+${buff.points})`;
}

interface CardProps {
  buff: Buff;
  selected?: boolean;
  conflict?: string;
  onToggle?: () => void;
}

function BuffCard({ buff, selected = false, conflict, onToggle }: CardProps) {
  const interactive = buff.kind !== 'general';
  const disabled = !!conflict;
  const content = (
    <>
      <img className="card__icon" src={iconUrl(buff.id)} alt="" width={54} height={54} />
      <div className="card__body">
        <div className="card__title">
          {buff.name}
          {signed(buff)}
        </div>
        <ul className="card__lines">
          {buff.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {conflict && <div className="card__conflict">Нельзя вместе с «{BY_ID.get(conflict)?.name}»</div>}
      </div>
      {interactive && <span className="card__check" aria-hidden />}
    </>
  );

  if (!interactive) return <div className={`card card--${buff.kind}`}>{content}</div>;

  return (
    <button
      type="button"
      className={`card card--${buff.kind}${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      {content}
    </button>
  );
}

function Section({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className={`section section--${tone}`}>
      <h2 className="section__title">{title}</h2>
      <div className="grid">{children}</div>
    </section>
  );
}

export default function App() {
  const [selected, setSelected] = useState<Set<string>>(() => readFromHash() ?? readFromStorage());
  const [toast, setToast] = useState('');
  const stats = useMemo(() => summarize(selected), [selected]);

  useEffect(() => {
    saveToStorage(selected);
    // Держим ссылку в адресной строке актуальной, чтобы её можно было скопировать и вручную.
    history.replaceState(null, '', shareUrl(selected));
  }, [selected]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const share = async () => {
    const url = shareUrl(selected);
    try {
      await navigator.clipboard.writeText(url);
      setToast('Ссылка на сборку скопирована');
    } catch {
      window.prompt('Скопируйте ссылку:', url);
    }
  };

  const reset = () => {
    if (selected.size === 0) return;
    setSelected(new Set());
    setToast('Выбор сброшен');
  };

  const canCreate = stats.balance >= 0;
  const renderCard = (b: Buff) => (
    <BuffCard
      key={b.id}
      buff={b}
      selected={selected.has(b.id)}
      conflict={selected.has(b.id) ? undefined : conflictOf(b.id, selected)}
      onToggle={() => toggle(b.id)}
    />
  );

  return (
    <>
      <header className="hero">
        <img className="hero__logo" src={untarLogo} alt="Season 2: UNTAR Control" />
        <p className="hero__lead">
          Соберите сезонного персонажа. Отрицательные модификаторы дают очки, положительные их тратят.
          Персонажа можно создать, если баланс не ниже нуля.
        </p>
      </header>

      <div className="bar">
        <div className="bar__inner">
          <div className={`bar__balance ${canCreate ? 'is-ok' : 'is-bad'}`}>
            <span className="bar__label">Очки</span>
            <span className="bar__value">{stats.balance > 0 ? `+${stats.balance}` : stats.balance}</span>
          </div>
          <div className="bar__stats">
            <span>
              Получено <b className="t-neg">+{stats.earned}</b>
            </span>
            <span>
              Потрачено <b className="t-pos">−{stats.spent}</b>
            </span>
            <span>
              Выбрано <b>{stats.count}</b>
            </span>
          </div>
          <div className={`bar__status ${canCreate ? 'is-ok' : 'is-bad'}`} role="status">
            {canCreate ? 'Персонажа можно создать' : `Нельзя создать: не хватает ${-stats.balance}`}
          </div>
          <div className="bar__actions">
            <button type="button" className="btn" onClick={share}>
              Поделиться
            </button>
            <button type="button" className="btn btn--ghost" onClick={reset} disabled={selected.size === 0}>
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <main className="page">
        <Section title="Общие модификаторы" tone="general">
          {GENERAL.map((b) => (
            <BuffCard key={b.id} buff={b} />
          ))}
        </Section>
        <Section title="Личные положительные" tone="positive">
          {POSITIVE.map(renderCard)}
        </Section>
        <Section title="Личные отрицательные" tone="negative">
          {NEGATIVE.map(renderCard)}
        </Section>
      </main>

      <footer className="footer">
        <p>Значения модификаторов могут быть изменены до старта сезона в балансировочных целях</p>
        <img src={eftLogo} alt="Escape from Tarkov" width={175} height={60} />
      </footer>

      <div className={`toast${toast ? ' is-visible' : ''}`} aria-live="polite">
        {toast}
      </div>
    </>
  );
}
