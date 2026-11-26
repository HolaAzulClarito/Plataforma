/* /academia/curso/:slug (curso() y cursoLanding() del demo).
   - Sin inscripción aprobada: landing del curso con inscripción (gratis: al momento; con precio: solicitud).
   - Con inscripción aprobada: vista del curso con avance, reproductor simulado, temario y examen final.
   - Administrador: vista previa sin inscripción si el ajuste adminSinInsc lo permite (no guarda avance). */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  DEMO_USER,
  isoToMx,
  type AcademySettings,
  type ClubReward,
  type Course,
  type CourseDetail,
  type CourseModule,
  type CourseProgress,
  type Enrollment,
  type ExamStatus,
  type LessonInfo,
  type LessonProgressResult,
  type LessonState,
} from "@kiron/shared";
import { ApiStatus, Icon, PageHead, Price, QrCode } from "../../components";
import { useI18n, useT, type TFunction } from "../../i18n";
import { ApiError, apiPost, useApi } from "../../lib/api";
import { prefersReducedMotion } from "../../lib/motion";
import { closeModal, openModal } from "../../state/modal";
import { navigate, useSession } from "../../state/session";
import { toast } from "../../state/toasts";
import { requireSession } from "../auth";
import { refreshMe } from "../panel/useMe";
import { useMyEnrollments } from "./Academia";
import { openExam } from "./Exam";
import { downloadCertificate, printMaterial } from "./print";

const nn = (i: number) => String(i).padStart(2, "0");
/* Los títulos generados por la API ("Lección 01") se traducen; los del editor son datos y se muestran tal cual. */
const lessonTitle = (l: Pick<LessonInfo, "titulo">, t: TFunction) => (/^Lección \d+$/.test(l.titulo) ? t(l.titulo) : l.titulo);
const toSecs = (d: string) => d.split(":").reduce((a, b) => a * 60 + Number(b || 0), 0);
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${nn(s % 60)}`;

/* Ajustes globales: solo el administrador puede leerlos (GET /api/admin/academia/ajustes). */
function useAdminSettings() {
  const { role } = useSession();
  return useApi<AcademySettings>(role === "admin" ? "/api/admin/academia/ajustes" : null).data;
}

/* Modo enfoque: sin encabezado ni pie; una barra mínima para salir del curso. */
function useFocusMode(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.body.classList.add("ac-focus");
    return () => document.body.classList.remove("ac-focus");
  }, [on]);
}

function FocusBar() {
  const t = useT();
  return (
    <div className="focus-bar">
      <div className="wrap">
        <Link to="/academia">
          <Icon name="arrow-left" /> {t("Salir del curso")}
        </Link>
        <img src="/img/kiron-logo.png" alt="Kirón" width={62} height={36} />
        <span className="fb-note">{t("Modo enfoque")}</span>
      </div>
    </div>
  );
}

export function CursoPage() {
  const { slug = "" } = useParams();
  const { role } = useSession();
  const detail = useApi<CourseDetail>(`/api/cursos/${encodeURIComponent(slug)}`);
  const enrs = useMyEnrollments();
  const settings = useAdminSettings();
  const preview = useApi<CourseDetail>(role === "admin" && settings?.adminSinInsc ? `/api/admin/cursos/${encodeURIComponent(slug)}/vista` : null);

  if (detail.status === 404) return <Unavailable />;
  if (!detail.data || (role === "mvz" && !enrs.data && !enrs.error))
    return (
      <div className="wrap" style={{ padding: "60px 32px" }}>
        <ApiStatus loading={detail.loading || enrs.loading} error={detail.error ?? enrs.error} onRetry={detail.refetch} />
      </div>
    );
  const d = detail.data;
  const mine = enrs.data?.find((e) => e.s === slug);
  if (role === "mvz" && mine?.st === "approved") return <CourseView d={d} onEnrollmentLost={enrs.refetch} />;
  if (role === "admin" && preview.data) return <AdminPreview d={preview.data} focus={!!preview.data.ajustes?.enfoque} />;
  return <Landing d={d} enr={mine} onChange={enrs.refetch} />;
}

function Unavailable() {
  const t = useT();
  const { role } = useSession();
  return (
    <>
      <PageHead eyebrow="Academia" title="Este curso no está disponible" />
      <div className="wrap" style={{ padding: "10px 32px 90px", maxWidth: 820 }}>
        <div className="notice">
          <Icon name="info" />
          <span>{t("Este curso no está disponible por ahora. Si ya lo terminaste, tus constancias siguen en tu panel y se pueden verificar con su folio.")}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" to="/academia">
            {t("Ver otros cursos")}
          </Link>
          {role === "mvz" ? (
            <Link className="btn btn-ghost" to="/panel/constancias">
              <Icon name="award" /> {t("Mis constancias")}
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ---------------- Landing (sin inscripción) ---------------- */

function CheckoutForm({ c, onSent }: { c: Course; onSent: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost<Enrollment>("/api/me/inscripciones", { curso: c.slug });
      closeModal();
      toast("Solicitud enviada. El equipo de Academia te contacta para confirmar tu inscripción.");
      onSent();
    } catch (err) {
      setBusy(false);
      toast(err instanceof ApiError ? err.message : "No pudimos enviar la solicitud");
    }
  };
  return (
    <form className="modal-b" onSubmit={submit}>
      <p style={{ marginBottom: 16 }}>
        <b>{c.title}</b>
      </p>
      <div className="price" style={{ marginTop: 0, marginBottom: 16 }}>
        <Price amount={c.price} />
      </div>
      <div className="form-row">
        <label className="l" htmlFor="ck-n">
          {t("Nombre")}
        </label>
        <input className="input" id="ck-n" defaultValue={DEMO_USER.name.replace(/^Dra?\.\s+/, "")} required autoComplete="name" />
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="ck-e">
            {t("Correo")}
          </label>
          <input className="input" id="ck-e" type="email" defaultValue={DEMO_USER.email} required autoComplete="email" />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="ck-t">
            {t("Teléfono")}
          </label>
          <input className="input" id="ck-t" type="tel" required autoComplete="tel" />
        </div>
      </div>
      <div className="notice" style={{ marginBottom: 16 }}>
        <Icon name="info" />
        <span>{t("El sitio no cobra en línea. El equipo de Academia te contacta y aprueba tu inscripción; en ese momento se abre el curso en tu panel.")}</span>
      </div>
      <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
        <Icon name="send" /> {t("Enviar solicitud")}
      </button>
    </form>
  );
}

function SyllabusSummary({ temario, modulos }: { temario: LessonInfo[]; modulos: CourseModule[] }) {
  const t = useT();
  const m1 = modulos[0];
  const L = temario.length;
  const end = m1 && modulos.length > 1 ? m1.to + 1 : L;
  const k = Math.min(end, 5);
  return (
    <div className="lrows">
      {modulos.length > 1 ? <div className="mod-h">{t("Módulo 1")}</div> : null}
      {temario.slice(0, k).map((l) => (
        <div className="lrow" key={l.i}>
          <span className="st">
            <Icon name="lock" />
          </span>
          {lessonTitle(l, t)}
          <span className="d">{l.bloqueadaHasta ? isoToMx(l.bloqueadaHasta) : l.duracion}</span>
        </div>
      ))}
      {end > k ? (
        <div className="lrow">
          <span className="st" />
          {t(`y ${end - k} lecciones más`)}
        </div>
      ) : null}
      {modulos.length > 2 ? (
        <div className="lrow">
          <span className="st" />
          {t(`Módulos 2 a ${modulos.length}`)}
        </div>
      ) : modulos.length === 2 ? (
        <div className="lrow">
          <span className="st" />
          {t("Módulo 2")}
        </div>
      ) : null}
      <div className="lrow mexam">
        <span className="st">
          <Icon name="lock" />
        </span>
        {t("Examen final")}
        <span className="d">{t("Examen")}</span>
      </div>
    </div>
  );
}

function Landing({ d, enr, onChange }: { d: CourseDetail; enr?: Enrollment; onChange: () => void }) {
  const t = useT();
  const { role } = useSession();
  const c = d.course;
  const rewards = useApi<ClubReward[]>(c.price ? "/api/club/premios" : null).data;
  const reward = rewards?.find((r) => r.id === c.slug);
  const [busy, setBusy] = useState(false);
  const mods = d.modulos.length;

  const enroll = () =>
    requireSession("mvz", async () => {
      setBusy(true);
      try {
        await apiPost<Enrollment>("/api/me/inscripciones", { curso: c.slug });
        toast("Inscripción confirmada");
        onChange();
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "No pudimos inscribirte");
      } finally {
        setBusy(false);
      }
    });
  const checkout = () =>
    requireSession("mvz", () => openModal({ title: "Quiero inscribirme", content: <CheckoutForm c={c} onSent={onChange} /> }));
  const redeem = () =>
    requireSession("mvz", () => {
      navigate("/panel/club");
      if (reward) setTimeout(() => toast(`Este curso cuesta ${reward.puntos.toLocaleString("es-MX")} puntos. Aquí ves tu saldo.`), 300);
    });

  const pending = enr?.st === "pending";
  const cancelled = enr?.st === "cancelled";
  let buy;
  if (pending)
    buy = (
      <div className="notice" style={{ margin: "8px 0 4px" }} role="status">
        <Icon name="clock" />
        <span>{t(`Solicitud enviada el ${enr.f}. El equipo de Academia confirma tu inscripción y te avisa por correo.`)}</span>
      </div>
    );
  else if (c.price)
    buy = (
      <>
        {cancelled ? (
          <div className="notice" style={{ margin: "8px 0 10px" }}>
            <Icon name="info" />
            <span>{t("Tu inscripción a este curso está cancelada. Tus constancias emitidas se conservan.")}</span>
          </div>
        ) : null}
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 16px" }}>{t("El equipo de Academia te contacta para confirmar tu inscripción.")}</p>
        <button className="btn btn-accent btn-block" type="button" onClick={checkout}>
          <Icon name="send" /> {t(cancelled ? "Solicitar de nuevo" : "Quiero inscribirme")}
        </button>
        {reward ? (
          <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 10 }} onClick={redeem}>
            <Icon name="gift" /> {t("Canjear con puntos Club MVZ")}
          </button>
        ) : null}
      </>
    );
  else
    buy = (
      <>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 16px" }}>{t("Solo necesitas tu cuenta de médico.")}</p>
        <button className="btn btn-accent btn-block" type="button" onClick={enroll} disabled={busy}>
          {t(cancelled ? "Inscribirme de nuevo" : "Inscribirme gratis")}
        </button>
      </>
    );

  const syllabusGated = !d.temario && !role;
  return (
    <>
      <section className={`course-hero tone-${c.tone}`}>
        <div className="cbg" />
        <div className="wrap">
          <nav className="crumbs light" aria-label={t("Ruta")}>
            <Link to="/academia">{t("Academia")}</Link>
            <Icon name="chevron-right" />
            <span>{c.cat}</span>
          </nav>
          <div className="course-hero-grid">
            <div>
              <span className="ccat">{c.cat}</span>
              <h1 className="h-lg" style={{ color: "#fff", marginTop: 16 }}>
                {c.title}
              </h1>
              <div className="cmeta light" style={{ marginTop: 18 }}>
                {c.lessons > 1 ? (
                  <span>
                    <Icon name="book-open" /> {t(`${c.lessons - 1} lecciones`)}
                  </span>
                ) : null}
                {mods > 1 ? (
                  <span>
                    <Icon name="layers" /> {t(`${mods} módulos`)}
                  </span>
                ) : null}
                <span>
                  <Icon name="list-checks" /> {t("Examen final")}
                </span>
                {c.reviews ? (
                  <span>
                    <Icon name="star" className="star" /> {c.rating.toFixed(1)} · {t(`${c.reviews} calificaciones`)}
                  </span>
                ) : null}
                <span>
                  <Icon name="qr-code" /> {t("Constancia con QR")}
                </span>
                <span>
                  <Icon name="clock" /> {t("A tu ritmo")}
                </span>
              </div>
            </div>
            <div className="buy-card">
              <div className="price">{c.price ? <Price amount={c.price} was={c.was} /> : <span className="free">{t("GRATUITO")}</span>}</div>
              {buy}
              <ul className="incl">
                <li>
                  <Icon name="check" /> {t("Acceso al confirmar tu inscripción")}
                </li>
                <li>
                  <Icon name="check" /> {t("Avance sincronizado en todos tus dispositivos")}
                </li>
                <li>
                  <Icon name="check" /> {t("Examen final al cierre del curso")}
                </li>
                <li>
                  <Icon name="check" /> {t("Constancia verificable")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {syllabusGated ? (
        <section className="sec">
          <div className="wrap" style={{ maxWidth: 820 }}>
            <div className="notice">
              <Icon name="lock" />
              <span>{t("El temario completo se muestra al iniciar sesión o al inscribirte.")}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="sec">
          <div className="wrap two" style={{ gridTemplateColumns: "1.3fr 1fr", margin: 0 }}>
            <div>
              <h2 className="h-md">{t("Lo que vas a ver")}</h2>
              {d.descripcion ? <p style={{ color: "var(--muted)", marginTop: 10, whiteSpace: "pre-line" }}>{d.descripcion.replace(/<[^>]*>/g, "")}</p> : null}
              {d.temario ? (
                <>
                  <p style={{ color: "var(--muted)", marginTop: 10 }}>
                    {t(`${d.temario.length} lecciones en video y un examen final de ${d.examen.preguntas} preguntas (mínimo ${d.examen.aprobatoria} %).`)}
                  </p>
                  <div className="syllabus" style={{ marginTop: 20 }}>
                    <SyllabusSummary temario={d.temario} modulos={d.modulos} />
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--muted)", marginTop: 10 }}>{t("El temario completo se muestra al inscribirte.")}</p>
              )}
            </div>
            <div className="panel">
              <h3>{t("Opiniones de alumnos")}</h3>
              {c.reviews ? (
                <>
                  <p className="sub">{t(`${c.rating.toFixed(1)} de 5 · ${c.reviews} calificaciones en la plataforma actual`)}</p>
                  <div className="stars" aria-hidden="true">
                    ★★★★★
                  </div>
                </>
              ) : (
                <p className="sub">{t("Todavía no hay calificaciones")}</p>
              )}
              <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 10 }}>{t("Las reseñas escritas se migran desde Tutor LMS con el nombre del alumno abreviado.")}</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------- Vista del curso (inscripción aprobada) ---------------- */

interface ViewModel {
  c: Course;
  lessons: LessonState[];
  modulos: CourseModule[];
  hechas: number;
  total: number;
  pct: number;
  examen: ExamStatus | null;
  folio: string | null;
  siguiente: number;
}

type Player = { i: number; p: number } | null;

function CourseView({ d, onEnrollmentLost }: { d: CourseDetail; onEnrollmentLost: () => void }) {
  const slug = d.course.slug;
  const progress = useApi<CourseProgress>(`/api/me/cursos/${encodeURIComponent(slug)}/progreso`);
  const [override, setOverride] = useState<CourseProgress | null>(null);
  /* Cuando llega una lectura nueva de la API, deja de usar la respuesta local del último avance. */
  useEffect(() => setOverride(null), [progress.data]);
  useEffect(() => {
    if (progress.status === 403) onEnrollmentLost();
  }, [progress.status, onEnrollmentLost]);

  const p = override ?? progress.data;
  if (!p)
    return (
      <div className="wrap" style={{ padding: "60px 32px" }}>
        <ApiStatus loading={progress.loading} error={progress.error} onRetry={progress.refetch} />
      </div>
    );
  const vm: ViewModel = {
    c: d.course,
    lessons: p.lecciones,
    modulos: p.modulos,
    hechas: p.hechas,
    total: p.total,
    pct: p.pct,
    examen: p.examen,
    folio: p.constancia?.folio ?? null,
    siguiente: p.siguiente,
  };
  /* Modo enfoque para el médico, como en el demo (legacy app.js: focusNow = !!G.enfoque). */
  return <LessonView vm={vm} onProgress={setOverride} reload={progress.refetch} focus={!!d.ajustes?.enfoque} />;
}

function AdminPreview({ d, focus }: { d: CourseDetail; focus: boolean }) {
  const lessons: LessonState[] = (d.temario ?? []).map((l) => ({ ...l, hecha: false, visto: 0 }));
  const vm: ViewModel = {
    c: d.course,
    lessons,
    modulos: d.modulos,
    hechas: 0,
    total: lessons.length,
    pct: 0,
    examen: null,
    folio: null,
    siguiente: lessons.length ? 0 : -1,
  };
  return <LessonView vm={vm} focus={focus} />;
}

function LessonView({
  vm,
  onProgress,
  reload,
  focus,
}: {
  vm: ViewModel;
  /* Ausente = vista previa del administrador: no se guarda avance. */
  onProgress?: (p: CourseProgress) => void;
  reload?: () => void;
  focus: boolean;
}) {
  const t = useT();
  const { lang } = useI18n();
  const { c, lessons, modulos, hechas, total: L, pct, examen, folio } = vm;
  const slug = c.slug;
  const adminPrev = !onProgress;
  const [sel, setSel] = useState<number | null>(null);
  const [player, setPlayer] = useState<Player>(null);
  const [live, setLive] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  useFocusMode(focus);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const passed = !!examen?.aprobado;
  const allL = hechas >= L;
  const finished = !!folio || (allL && passed);
  const defaultCur = vm.siguiente >= 0 ? vm.siguiente : -1;
  const cur = sel ?? defaultCur;
  const viewExam = cur < 0;
  const lesson = viewExam ? undefined : lessons[cur];
  const drip = finished || viewExam ? "" : (lesson?.bloqueadaHasta ?? "");
  const fileN = nn(viewExam ? Math.max(L, 1) : cur + 1);
  const playing = player && player.i === cur ? player : null;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlayer(null);
  };

  const report = async (i: number, pctSeen: number) => {
    if (!onProgress) return null;
    try {
      const r = await apiPost<LessonProgressResult>(`/api/me/cursos/${slug}/lecciones/${i}/avance`, { pct: pctSeen });
      onProgress(r.progreso);
      return r;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "No pudimos guardar tu avance");
      return null;
    }
  };

  const finish = async (i: number) => {
    stop();
    if (adminPrev) {
      toast("Vista de administrador: el video terminó, pero no se guarda avance");
      return;
    }
    const r = await report(i, 100);
    if (!r) return;
    if (!r.nueva) {
      toast("Video al 100 % · esta lección ya estaba completada");
      return;
    }
    refreshMe();
    const prog = r.progreso;
    setSel(null);
    let msg: string;
    if (prog.constancia) msg = "Video al 100 % · terminaste el curso. Tu constancia ya está en tu panel.";
    else if (prog.hechas >= prog.total) msg = "Video al 100 % · terminaste todas las lecciones. Ya puedes presentar el examen final.";
    else msg = `Video al 100 % · lección completada · +${r.puntos} puntos Club MVZ`;
    setLive(t(msg));
    toast(msg);
  };

  /* Reproductor simulado (APP.watch): el video avanza rápido y reporta el avance a la API (50 % y 100 %).
     En la plataforma lo reporta el reproductor de Bunny cada 15 s. No existe forma de marcar la lección a mano. */
  const watch = () => {
    if (timer.current || viewExam || drip) return;
    const i = cur;
    const dur = prefersReducedMotion() ? 1500 : 5000;
    const t0 = performance.now();
    let half = false;
    setPlayer({ i, p: 0 });
    timer.current = setInterval(() => {
      const prog = Math.min(1, (performance.now() - t0) / dur);
      setPlayer({ i, p: prog });
      if (!half && prog >= 0.5) {
        half = true;
        void report(i, 50);
      }
      if (prog >= 1) void finish(i);
    }, 100);
  };

  const goLesson = (i: number) => {
    const l = lessons[i];
    if (l?.bloqueadaHasta) return toast(`Esta lección se abre el ${isoToMx(l.bloqueadaHasta)}`);
    stop();
    if (i >= L) {
      if (adminPrev) {
        setSel(-1);
        return toast("Vista de administrador: el examen final se revisa desde el editor del curso");
      }
      if (examen?.estado === "bloqueado") return toast(examen.motivo || "Termina todas las lecciones para presentar el examen final");
      setSel(-1);
      if (examen && !passed) openExam(slug, examen, () => reload?.());
      return;
    }
    setSel(i);
    playerRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const fLock = examen?.estado === "programado";
  let lessonAction;
  if (finished)
    lessonAction = (
      <span className="badge badge-ok">
        <Icon name="award" /> {t("Curso aprobado")}
      </span>
    );
  else if (viewExam)
    lessonAction = fLock ? (
      <span className="badge badge-warn">
        <Icon name="lock" /> {t(`El examen final se abre el ${isoToMx(examen?.abreEl ?? "")}`)}
      </span>
    ) : adminPrev ? null : (
      <button className="btn btn-accent btn-sm" type="button" onClick={() => examen && openExam(slug, examen, () => reload?.())}>
        <Icon name="list-checks" /> {t(examen?.estado === "en_curso" ? "Continuar examen final" : "Presentar examen final")}
      </button>
    );
  else if (lesson?.hecha)
    lessonAction = (
      <span className="badge badge-ok">
        <Icon name="check" /> {t("Lección completada")}
      </span>
    );
  else
    lessonAction = (
      <span className="auto-note">
        <Icon name="circle-play" /> {t("La lección se marca sola al terminar el video")}
      </span>
    );

  const tot = toSecs(lesson?.duracion ?? "10:00");
  const pbody = finished ? (
    <div className="kstage">
      <span className="kplate">
        <img src="/img/kiron-logo.png" alt="Kirón" />
      </span>
      <span className="vlabel">{t("Curso terminado")}</span>
    </div>
  ) : viewExam ? (
    <div className="plock">
      <Icon name="list-checks" />
      <b>{t(L ? "Lecciones terminadas · sigue el examen final" : "Este curso es solo el examen final")}</b>
    </div>
  ) : drip ? (
    <div className="plock">
      <Icon name="lock" />
      <b>{t(`Disponible a partir del ${isoToMx(drip)}`)}</b>
    </div>
  ) : playing ? (
    <div className="kstage">
      <span className="kplate">
        <img src="/img/kiron-logo.png" alt="Kirón" />
      </span>
      <span className="vlabel">{t("Reproduciendo · simulación ×60")}</span>
    </div>
  ) : (
    <button className="playbtn" type="button" aria-label={t("Reproducir lección")} onClick={watch}>
      <Icon name="play" />
    </button>
  );
  const barPct = finished ? 100 : playing ? playing.p * 100 : viewExam || drip ? 0 : (lesson?.visto ?? 0);

  const rows: ReactNode[] = [];
  lessons.forEach((l, i) => {
    const m = modulos.find((x) => x.from === i);
    if (m && modulos.length > 1)
      rows.push(
        <div className="mod-h" key={`m${m.k}`}>
          {t(`Módulo ${m.k}`)}
        </div>,
      );
    const isCur = i === cur;
    rows.push(
      <button key={i} type="button" className={`lrow ${l.hecha ? "done" : ""} ${isCur ? "cur" : ""}`} onClick={() => goLesson(i)} aria-current={isCur ? "step" : undefined}>
        <span className="st">{l.hecha ? <Icon name="check" /> : l.bloqueadaHasta ? <Icon name="lock" /> : isCur ? <Icon name="play" /> : null}</span>
        {lessonTitle(l, t)}
        {l.hecha ? <span className="sr"> · {t("completada")}</span> : null}
        <span className="d">{l.bloqueadaHasta ? isoToMx(l.bloqueadaHasta) : l.duracion}</span>
      </button>,
    );
  });
  rows.push(
    <button key="exam" type="button" className={`lrow mexam ${passed ? "done" : ""} ${viewExam && !passed ? "cur" : ""}`} onClick={() => goLesson(L)}>
      <span className="st">{passed ? <Icon name="check" /> : allL ? <Icon name="list-checks" /> : <Icon name="lock" />}</span>
      {t("Examen final")}
      <span className="d">{passed && examen?.notaFinal != null ? examen.notaFinal.toFixed(1) : t("Examen")}</span>
    </button>,
  );

  return (
    <>
      {focus ? <FocusBar /> : null}
      <div className="wrap">
        {focus ? null : (
          <nav className="crumbs" aria-label={t("Ruta")}>
            <Link to="/academia">{t("Academia")}</Link>
            <Icon name="chevron-right" />
            <span>{c.title}</span>
          </nav>
        )}
        {adminPrev ? (
          <div className="notice warn" style={{ margin: `${focus ? "18px" : "0"} 0 18px` }}>
            <Icon name="shield-check" />
            <span>{t("Vista de administrador sin inscripción. Puedes recorrer el contenido; no se guarda avance.")}</span>
          </div>
        ) : null}
        <p className="sr" aria-live="polite">
          {live}
        </p>
        <div className="lesson">
          <div>
            <div className="player rv" id="lvid" ref={playerRef} data-i={cur}>
              <span className="ptitle">
                {c.title} · {t(finished ? "Curso terminado" : viewExam ? "Examen final" : `Lección ${fileN}`)}
              </span>
              {pbody}
              <div
                className="bar"
                role="progressbar"
                aria-label={t("Avance del video")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(barPct)}
              >
                <i style={{ width: `${barPct}%` }} />
              </div>
              {finished || viewExam || drip ? null : (
                <span className="ptime">
                  {fmtSecs(Math.round((playing ? playing.p : 0) * tot))} / {lesson?.duracion}
                </span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 8px", gap: 16, flexWrap: "wrap" }}>
              <h1 className="h-md">{c.title}</h1>
              <div className="lact">{lessonAction}</div>
            </div>
            <div className="progress" style={{ margin: "10px 0 6px" }}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              {L ? `${t(`${hechas} de ${L} lecciones`)} · ` : ""}
              {t(passed ? "examen final aprobado" : "examen final pendiente")}
            </p>
            <p style={{ color: "var(--muted)", marginTop: 14 }}>
              {t(
                L
                  ? "Puedes ver las lecciones en el orden que quieras. Cada una se marca como completada sola cuando el video llega al 100 %; no hay botón para marcarla a mano. Tu avance se guarda mientras ves el video, así que retomas en el mismo punto desde cualquier dispositivo. Al terminar todas las lecciones se abre el examen final, y la constancia se emite solo si lo apruebas."
                  : "Este curso no tiene lecciones en video: al aprobar el examen final se emite tu constancia.",
              )}
            </p>
            <div className="two" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="panel">
                <h3>{t("Tu constancia")}</h3>
                <p className="sub">
                  {t(finished ? "Emitida. Cualquiera puede verificarla con el QR." : "Se emite solo al terminar todas las lecciones y aprobar el examen final.")}
                </p>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 16 }}>
                  <div className={`qrbox ${folio ? "" : "dim"}`}>
                    <QrCode seed={folio ?? slug} size={66} />
                  </div>
                  <div>
                    <b style={{ color: "var(--web-navy)" }}>{folio ? `${t("Folio")} ${folio}` : t("Folio pendiente")}</b>
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>
                      {folio ? <Link to={`/verificar/${folio}`}>{t("Verificar en línea")}</Link> : t("Disponible al terminar")}
                    </p>
                  </div>
                </div>
                {folio ? (
                  <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 14 }} onClick={() => void downloadCertificate(folio, t, lang)}>
                    <Icon name="download" /> {t("Descargar constancia")}
                  </button>
                ) : null}
              </div>
              <div className="panel">
                <h3>{t("Archivos de la lección")}</h3>
                <p className="sub">{t("Ejercicios y documentación de la clase")}</p>
                <button className="list-row as-btn" type="button" onClick={() => printMaterial(c.title, Number(fileN), t, lang)}>
                  <span className="lr-ico">
                    <Icon name="file-text" />
                  </span>
                  <div>
                    <b>{t(`Presentación de la lección ${fileN}`)}</b>
                    <small>{t("PDF · se abre para imprimir o guardar")}</small>
                  </div>
                  <span className="end">
                    <Icon name="download" />
                  </span>
                </button>
                <button className="list-row as-btn" type="button" onClick={() => toast("Descarga con enlace firmado de corta duración")}>
                  <span className="lr-ico">
                    <Icon name="file-spreadsheet" />
                  </span>
                  <div>
                    <b>{t(`Ejercicios de la lección ${fileN}`)}</b>
                    <small>{t("ZIP · ejemplo")}</small>
                  </div>
                  <span className="end">
                    <Icon name="download" />
                  </span>
                </button>
              </div>
            </div>
          </div>
          <aside className="syllabus rv" aria-label={t("Temario")}>
            <div className="sh">
              <b style={{ color: "var(--web-navy)" }}>{t("Temario")}</b>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 10px" }}>{t("Títulos de ejemplo · duración de cada video")}</p>
              <div className="progress">
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="lrows">{rows}</div>
          </aside>
        </div>
      </div>
      <div style={{ height: 96 }} />
    </>
  );
}
