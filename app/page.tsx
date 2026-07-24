"use client";

import { FormEvent, useMemo, useState } from "react";

type EventStatus = "aberto" | "atribuido" | "realizado";
type EventSource = "Manual" | "Google Agenda";

type Freelancer = {
  id: string;
  name: string;
  role: string;
  city: string;
  rating: number;
  pix: string;
  color: string;
};

type EventRecord = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  location: string;
  service: string;
  agreedValue: number;
  paidValue: number;
  freelancerId: string | null;
  status: EventStatus;
  source: EventSource;
  note: string;
};

const freelancers: Freelancer[] = [
  {
    id: "ana",
    name: "Ana Clara",
    role: "Fotografia",
    city: "Curitiba",
    rating: 4.9,
    pix: "ana.clara@pix.com",
    color: "#2f7d6c",
  },
  {
    id: "bruno",
    name: "Bruno Reis",
    role: "Vídeo",
    city: "Colombo",
    rating: 4.8,
    pix: "bruno.reis@pix.com",
    color: "#c8563d",
  },
  {
    id: "livia",
    name: "Livia Santos",
    role: "Assistente",
    city: "São José dos Pinhais",
    rating: 4.7,
    pix: "11988447766",
    color: "#6d64c8",
  },
  {
    id: "marcos",
    name: "Marcos Lima",
    role: "Drone",
    city: "Pinhais",
    rating: 4.9,
    pix: "marcos@pix.com",
    color: "#99702f",
  },
];

const initialEvents: EventRecord[] = [
  {
    id: "evt-1001",
    title: "Casamento Marina e Theo",
    date: "2026-08-01",
    start: "15:00",
    end: "22:00",
    location: "Villa Toscana, Curitiba",
    service: "Foto principal",
    agreedValue: 650,
    paidValue: 650,
    freelancerId: "ana",
    status: "realizado",
    source: "Manual",
    note: "Cerimônia externa e recepção no salão.",
  },
  {
    id: "evt-1002",
    title: "Aniversario Helena 1 ano",
    date: "2026-08-05",
    start: "13:30",
    end: "17:30",
    location: "Buffet Jardim das Artes",
    service: "Cobertura foto",
    agreedValue: 300,
    paidValue: 200,
    freelancerId: "bruno",
    status: "atribuido",
    source: "Google Agenda",
    note: "Chegar 30 min antes para detalhes da decoração.",
  },
  {
    id: "evt-1003",
    title: "Ensaio corporativo Aurora",
    date: "2026-08-09",
    start: "09:00",
    end: "12:00",
    location: "Sede Aurora Tech",
    service: "Retratos + bastidores",
    agreedValue: 280,
    paidValue: 360,
    freelancerId: "livia",
    status: "atribuido",
    source: "Manual",
    note: "Adiantamento lançado para compensar no próximo evento.",
  },
  {
    id: "evt-1004",
    title: "Pre-wedding Rafa e Caio",
    date: "2026-08-12",
    start: "16:00",
    end: "19:00",
    location: "Parque Tangua",
    service: "Assistente de luz",
    agreedValue: 180,
    paidValue: 0,
    freelancerId: null,
    status: "aberto",
    source: "Manual",
    note: "Job aberto para aceite do primeiro parceiro disponível.",
  },
  {
    id: "evt-1005",
    title: "Imobiliario Casa Alto da XV",
    date: "2026-08-15",
    start: "10:00",
    end: "12:00",
    location: "Alto da XV, Curitiba",
    service: "Drone + fachada",
    agreedValue: 220,
    paidValue: 100,
    freelancerId: "marcos",
    status: "atribuido",
    source: "Manual",
    note: "Imagens externas se o tempo estiver aberto.",
  },
];

const calendarEvents = [
  {
    googleId: "gcal-701",
    title: "Formatura Colegio Orion",
    date: "2026-08-19",
    start: "18:00",
    end: "22:30",
    location: "Teatro Positivo",
    service: "Foto + palco",
  },
  {
    googleId: "gcal-702",
    title: "Batizado Miguel",
    date: "2026-08-22",
    start: "09:30",
    end: "12:00",
    location: "Paroquia Santa Felicidade",
    service: "Cobertura igreja",
  },
  {
    googleId: "gcal-703",
    title: "Evento empresarial Vitta",
    date: "2026-08-27",
    start: "14:00",
    end: "19:00",
    location: "Expo Unimed",
    service: "Recepcao + palestras",
  },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function eventBalance(event: EventRecord) {
  return event.agreedValue - event.paidValue;
}

function statusLabel(status: EventStatus) {
  if (status === "aberto") return "Aberto";
  if (status === "atribuido") return "Atribuído";
  return "Realizado";
}

export default function Home() {
  const [events, setEvents] = useState<EventRecord[]>(initialEvents);
  const [activeArea, setActiveArea] = useState<"empresa" | "freelancer">(
    "empresa",
  );
  const [selectedFreelancerId, setSelectedFreelancerId] = useState("ana");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [form, setForm] = useState({
    title: "Evento familia Carvalho",
    date: "2026-08-30",
    start: "15:00",
    end: "18:00",
    location: "Espaco Botanico",
    service: "Foto social",
    agreedValue: "150",
    paidValue: "100",
    freelancerId: "open",
  });

  const selectedFreelancer =
    freelancers.find((freelancer) => freelancer.id === selectedFreelancerId) ??
    freelancers[0];

  const assignedEvents = events.filter((event) => event.freelancerId);
  const openEvents = events.filter((event) => event.status === "aberto");

  const totals = useMemo(() => {
    const agreed = assignedEvents.reduce(
      (sum, event) => sum + event.agreedValue,
      0,
    );
    const paid = assignedEvents.reduce((sum, event) => sum + event.paidValue, 0);
    const due = assignedEvents.reduce(
      (sum, event) => sum + Math.max(eventBalance(event), 0),
      0,
    );
    const advanced = assignedEvents.reduce(
      (sum, event) => sum + Math.abs(Math.min(eventBalance(event), 0)),
      0,
    );

    return {
      agreed,
      paid,
      due,
      advanced,
      monthEvents: events.length,
      completed: events.filter((event) => event.status === "realizado").length,
    };
  }, [assignedEvents, events]);

  const freelancerStats = useMemo(() => {
    return freelancers.map((freelancer) => {
      const freelancerEvents = events.filter(
        (event) => event.freelancerId === freelancer.id,
      );
      const agreed = freelancerEvents.reduce(
        (sum, event) => sum + event.agreedValue,
        0,
      );
      const paid = freelancerEvents.reduce(
        (sum, event) => sum + event.paidValue,
        0,
      );
      const balance = freelancerEvents.reduce(
        (sum, event) => sum + eventBalance(event),
        0,
      );
      const completed = freelancerEvents.filter(
        (event) => event.status === "realizado",
      ).length;

      return {
        ...freelancer,
        agreed,
        paid,
        balance,
        completed,
        totalEvents: freelancerEvents.length,
      };
    });
  }, [events]);

  const selectedStats =
    freelancerStats.find((item) => item.id === selectedFreelancer.id) ??
    freelancerStats[0];

  const selectedEvents = events.filter(
    (event) => event.freelancerId === selectedFreelancer.id,
  );

  function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agreedValue = Number(form.agreedValue);
    const paidValue = Number(form.paidValue);

    if (!form.title.trim() || Number.isNaN(agreedValue) || agreedValue <= 0) {
      return;
    }

    const nextEvent: EventRecord = {
      id: `evt-${Date.now()}`,
      title: form.title.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      location: form.location.trim(),
      service: form.service.trim(),
      agreedValue,
      paidValue: Number.isNaN(paidValue) ? 0 : paidValue,
      freelancerId: form.freelancerId === "open" ? null : form.freelancerId,
      status: form.freelancerId === "open" ? "aberto" : "atribuido",
      source: "Manual",
      note:
        form.freelancerId === "open"
          ? "Disponivel para aceite dos parceiros."
          : "Freelancer definido pela equipe.",
    };

    setEvents((current) =>
      [nextEvent, ...current].sort((a, b) => a.date.localeCompare(b.date)),
    );
  }

  function importCalendarEvent(googleId: string) {
    const calendarEvent = calendarEvents.find((item) => item.googleId === googleId);
    if (!calendarEvent) return;

    setEvents((current) => {
      if (current.some((event) => event.id === googleId)) return current;

      const imported: EventRecord = {
        id: googleId,
        title: calendarEvent.title,
        date: calendarEvent.date,
        start: calendarEvent.start,
        end: calendarEvent.end,
        location: calendarEvent.location,
        service: calendarEvent.service,
        agreedValue: 150,
        paidValue: 0,
        freelancerId: null,
        status: "aberto",
        source: "Google Agenda",
      note: "Importado do calendário e aberto para aceite.",
      };

      return [imported, ...current].sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  function assignFreelancer(eventId: string, freelancerId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              freelancerId,
              status: event.status === "realizado" ? "realizado" : "atribuido",
            }
          : event,
      ),
    );
  }

  function acceptEvent(eventId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId && !event.freelancerId
          ? {
              ...event,
              freelancerId: selectedFreelancer.id,
              status: "atribuido",
              note: `${selectedFreelancer.name} aceitou o job.`,
            }
          : event,
      ),
    );
  }

  function markDone(eventId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, status: "realizado" } : event,
      ),
    );
  }

  function addPayment(eventId: string, amount: number) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? { ...event, paidValue: Math.max(0, event.paidValue + amount) }
          : event,
      ),
    );
  }

  function settleEvent(eventId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, paidValue: event.agreedValue } : event,
      ),
    );
  }

  const visibleEvents =
    activeArea === "empresa"
      ? events
      : [...openEvents, ...selectedEvents].sort((a, b) =>
          a.date.localeCompare(b.date),
        );

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand">
          <span className="brand-mark">TD</span>
          <div>
            <strong>Traços Detalhados</strong>
            <span>Freelance Control</span>
          </div>
        </div>

        <div className="mode-switch" aria-label="Perfil de acesso">
          <button
            className={activeArea === "empresa" ? "is-active" : ""}
            onClick={() => setActiveArea("empresa")}
            type="button"
          >
            Empresa
          </button>
          <button
            className={activeArea === "freelancer" ? "is-active" : ""}
            onClick={() => setActiveArea("freelancer")}
            type="button"
          >
            Freelancer
          </button>
        </div>

        <label className="field compact">
          <span>Parceiro ativo</span>
          <select
            value={selectedFreelancerId}
            onChange={(event) => setSelectedFreelancerId(event.target.value)}
          >
            {freelancers.map((freelancer) => (
              <option key={freelancer.id} value={freelancer.id}>
                {freelancer.name}
              </option>
            ))}
          </select>
        </label>

        <nav className="side-links" aria-label="Áreas do sistema">
          <a href="#resumo">Resumo</a>
          <a href="#eventos">Eventos</a>
          <a href="#financeiro">Financeiro</a>
          <a href="#google">Google Agenda</a>
        </nav>

        <div className="sidebar-balance">
          <span>Saldo do parceiro</span>
          <strong className={selectedStats.balance >= 0 ? "positive" : "negative"}>
            {formatCurrency(Math.abs(selectedStats.balance))}
          </strong>
          <small>
            {selectedStats.balance >= 0
              ? "A pagar ao freelancer"
              : "Adiantado pela empresa"}
          </small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Controle operacional e financeiro</span>
            <h1>
              {activeArea === "empresa"
                ? "Agenda de freelances da Traços"
                : `Painel de ${selectedFreelancer.name}`}
            </h1>
          </div>
          <div className="top-actions">
            <a className="ghost-button" href="#google">
              Google Agenda
            </a>
            <a className="primary-button" href="#novo-evento">
              + Novo evento
            </a>
          </div>
        </header>

        <section className="summary-grid" id="resumo" aria-label="Resumo">
          <article className="metric-card accent-teal">
            <span>Eventos no mes</span>
            <strong>{totals.monthEvents}</strong>
            <small>{openEvents.length} abertos para aceite</small>
          </article>
          <article className="metric-card accent-coral">
            <span>Combinado</span>
            <strong>{formatCurrency(totals.agreed)}</strong>
            <small>{totals.completed} realizados</small>
          </article>
          <article className="metric-card accent-violet">
            <span>Pago</span>
            <strong>{formatCurrency(totals.paid)}</strong>
            <small>Somente eventos atribuídos</small>
          </article>
          <article className="metric-card accent-gold">
            <span>Saldo em aberto</span>
            <strong>{formatCurrency(totals.due)}</strong>
            <small>{formatCurrency(totals.advanced)} adiantado</small>
          </article>
        </section>

        {activeArea === "freelancer" && (
          <section className="freelancer-strip" aria-label="Resumo do freelancer">
            <div
              className="avatar large"
              style={{ backgroundColor: selectedFreelancer.color }}
            >
              {initials(selectedFreelancer.name)}
            </div>
            <div>
              <span className="eyebrow">Meu resultado</span>
              <h2>{selectedFreelancer.name}</h2>
            </div>
            <div>
              <span>Jobs realizados</span>
              <strong>{selectedStats.completed}</strong>
            </div>
            <div>
              <span>Valor recebido</span>
              <strong>{formatCurrency(selectedStats.paid)}</strong>
            </div>
            <div>
              <span>Saldo</span>
              <strong
                className={selectedStats.balance >= 0 ? "positive" : "negative"}
              >
                {formatCurrency(Math.abs(selectedStats.balance))}
              </strong>
            </div>
          </section>
        )}

        <div className="content-grid">
          <section className="event-board" id="eventos" aria-label="Eventos">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {activeArea === "empresa" ? "Gestão de jobs" : "Minha agenda"}
                </span>
                <h2>
                  {activeArea === "empresa"
                    ? "Eventos e pagamentos"
                    : "Jobs atribuidos e abertos"}
                </h2>
              </div>
              <span className="count-pill">{visibleEvents.length} registros</span>
            </div>

            <div className="event-list">
              {visibleEvents.map((event) => {
                const freelancer = freelancers.find(
                  (item) => item.id === event.freelancerId,
                );
                const balance = eventBalance(event);
                const canAccept =
                  activeArea === "freelancer" && event.status === "aberto";

                return (
                  <article className="event-card" key={event.id}>
                    <div className="date-box">
                      <strong>{formatDate(event.date)}</strong>
                      <span>
                        {event.start} - {event.end}
                      </span>
                    </div>

                    <div className="event-main">
                      <div className="event-title-line">
                        <h3>{event.title}</h3>
                        <span className={`status-badge ${event.status}`}>
                          {statusLabel(event.status)}
                        </span>
                      </div>
                      <p>{event.location}</p>
                      <div className="event-tags">
                        <span>{event.service}</span>
                        <span>{event.source}</span>
                      </div>
                    </div>

                    <div className="freelancer-cell">
                      {freelancer ? (
                        <>
                          <span
                            className="avatar"
                            style={{ backgroundColor: freelancer.color }}
                          >
                            {initials(freelancer.name)}
                          </span>
                          <div>
                            <strong>{freelancer.name}</strong>
                            <small>{freelancer.role}</small>
                          </div>
                        </>
                      ) : (
                        <div className="open-slot">
                          <strong>Sem parceiro</strong>
                  <small>Disponível para aceite</small>
                        </div>
                      )}
                    </div>

                    <div className="money-cell">
                      <span>Combinado</span>
                      <strong>{formatCurrency(event.agreedValue)}</strong>
                      <small>Pago {formatCurrency(event.paidValue)}</small>
                    </div>

                    <div className="balance-cell">
                      <span>{balance >= 0 ? "A pagar" : "Adiantado"}</span>
                      <strong className={balance >= 0 ? "positive" : "negative"}>
                        {formatCurrency(Math.abs(balance))}
                      </strong>
                    </div>

                    <div className="row-actions">
                      {activeArea === "empresa" ? (
                        <>
                          <select
                            aria-label={`Freelancer para ${event.title}`}
                            value={event.freelancerId ?? "open"}
                            onChange={(inputEvent) =>
                              inputEvent.target.value === "open"
                                ? setEvents((current) =>
                                    current.map((item) =>
                                      item.id === event.id
                                        ? {
                                            ...item,
                                            freelancerId: null,
                                            status: "aberto",
                                          }
                                        : item,
                                    ),
                                  )
                                : assignFreelancer(
                                    event.id,
                                    inputEvent.target.value,
                                  )
                            }
                          >
                            <option value="open">Aberto</option>
                            {freelancers.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => addPayment(event.id, 50)}>
                            + R$ 50
                          </button>
                          <button type="button" onClick={() => settleEvent(event.id)}>
                            Quitar
                          </button>
                          {event.status !== "realizado" && (
                            <button type="button" onClick={() => markDone(event.id)}>
                              Realizar
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {canAccept && (
                            <button
                              className="primary-button compact-button"
                              type="button"
                              onClick={() => acceptEvent(event.id)}
                            >
                              Aceitar job
                            </button>
                          )}
                          {!canAccept && <span className="quiet-note">{event.note}</span>}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="right-rail">
            <section className="panel" id="novo-evento">
              <div className="section-heading compact-heading">
                <div>
                  <span className="eyebrow">Cadastro rápido</span>
                  <h2>Novo evento</h2>
                </div>
              </div>

              <form className="event-form" onSubmit={submitEvent}>
                <label className="field">
                  <span>Nome do evento</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="two-columns">
                  <label className="field">
                    <span>Data</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Serviço</span>
                    <input
                      value={form.service}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          service: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="two-columns">
                  <label className="field">
                    <span>Início</span>
                    <input
                      type="time"
                      value={form.start}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          start: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Fim</span>
                    <input
                      type="time"
                      value={form.end}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          end: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Local</span>
                  <input
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="two-columns">
                  <label className="field">
                    <span>Valor do job</span>
                    <input
                      min="0"
                      step="10"
                      type="number"
                      value={form.agreedValue}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          agreedValue: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Pago agora</span>
                    <input
                      min="0"
                      step="10"
                      type="number"
                      value={form.paidValue}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          paidValue: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Freelancer</span>
                  <select
                    value={form.freelancerId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        freelancerId: event.target.value,
                      }))
                    }
                  >
                    <option value="open">Deixar aberto</option>
                    {freelancers.map((freelancer) => (
                      <option key={freelancer.id} value={freelancer.id}>
                        {freelancer.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button className="primary-button full-button" type="submit">
                  + Cadastrar evento
                </button>
              </form>
            </section>

            <section className="panel" id="google">
              <div className="section-heading compact-heading">
                <div>
                  <span className="eyebrow">Integração</span>
                  <h2>Google Agenda</h2>
                </div>
                <button
                  className={calendarConnected ? "connected-button" : "ghost-button"}
                  type="button"
                  onClick={() => setCalendarConnected((current) => !current)}
                >
                  {calendarConnected ? "Conectado" : "Conectar"}
                </button>
              </div>

              <div className="calendar-list">
                {calendarEvents.map((calendarEvent) => {
                  const alreadyImported = events.some(
                    (event) => event.id === calendarEvent.googleId,
                  );

                  return (
                    <article className="calendar-card" key={calendarEvent.googleId}>
                      <div>
                        <strong>{calendarEvent.title}</strong>
                        <span>
                          {formatDate(calendarEvent.date)} - {calendarEvent.start}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyImported}
                        onClick={() => importCalendarEvent(calendarEvent.googleId)}
                      >
                        {alreadyImported ? "Importado" : "Importar"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        <section className="finance-section" id="financeiro">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Controle por parceiro</span>
              <h2>Resumo financeiro</h2>
            </div>
            <span className="count-pill">{formatCurrency(totals.due)} a pagar</span>
          </div>

          <div className="freelancer-grid">
            {freelancerStats.map((freelancer) => (
              <article className="freelancer-card" key={freelancer.id}>
                <div className="freelancer-head">
                  <span
                    className="avatar"
                    style={{ backgroundColor: freelancer.color }}
                  >
                    {initials(freelancer.name)}
                  </span>
                  <div>
                    <strong>{freelancer.name}</strong>
                    <span>{freelancer.role}</span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Eventos</dt>
                    <dd>{freelancer.totalEvents}</dd>
                  </div>
                  <div>
                    <dt>Recebido</dt>
                    <dd>{formatCurrency(freelancer.paid)}</dd>
                  </div>
                  <div>
                    <dt>Saldo</dt>
                    <dd className={freelancer.balance >= 0 ? "positive" : "negative"}>
                      {formatCurrency(Math.abs(freelancer.balance))}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFreelancerId(freelancer.id);
                    setActiveArea("freelancer");
                  }}
                >
                  Ver painel
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
