import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Countdown } from "../../components/Countdown";
import { countdownParts } from "../../lib/time";
import { FUTURE_WEBINAR, PAST_WEBINAR, webinarAt } from "../../test/fixtures";
import { renderWithProviders } from "../../test/utils";
import { NextWebinar } from "./NextWebinar";
import { DEFAULT_STARTS_AT, webinarIcs, webinarIsPast, webinarStart, webinarTimeZones } from "./status";

const NOW = Date.parse("2026-11-26T12:00:00-06:00");

describe("fecha del webinar", () => {
  it("usa startsAt y, si no viene, la fecha de respaldo", () => {
    expect(webinarStart(FUTURE_WEBINAR)).toBe(Date.parse(FUTURE_WEBINAR.startsAt));
    expect(webinarStart({ startsAt: "" })).toBe(Date.parse(DEFAULT_STARTS_AT));
  });

  it("calcula días, horas y minutos y nunca negativos", () => {
    const target = NOW + 2 * 864e5 + 3 * 36e5 + 5 * 6e4;
    expect(countdownParts(target, NOW)).toEqual({ days: 2, hours: 3, min: 5 });
    expect(countdownParts(NOW - 1000, NOW)).toEqual({ days: 0, hours: 0, min: 0 });
  });

  it("calcula la tabla de horarios por país desde startsAt", () => {
    expect(webinarTimeZones(webinarAt(DEFAULT_STARTS_AT)).map((r) => r[0])).toEqual(["20:00 Hrs", "21:00 Hrs", "22:00 Hrs"]);
  });

  it("genera el .ics con la hora real en UTC", () => {
    const ics = webinarIcs(webinarAt(DEFAULT_STARTS_AT), NOW);
    expect(ics).toContain("DTSTART:20261216T020000Z");
    expect(ics).toContain("DTEND:20261216T033000Z");
  });
});

describe("cuenta regresiva con fecha pasada", () => {
  it("Countdown no pinta 00/00/00 si la fecha ya pasó", () => {
    const { container } = renderWithProviders(<Countdown target={NOW - 60_000} now={NOW} />);
    expect(container.querySelector(".countdown")).toBeNull();
  });

  it("NextWebinar muestra 'Webinar concluido · ver grabaciones' y no 'Próximo webinar'", () => {
    expect(webinarIsPast(PAST_WEBINAR, NOW)).toBe(true);
    renderWithProviders(<NextWebinar webinar={PAST_WEBINAR} now={NOW} />);
    expect(screen.getByRole("link", { name: /Webinar concluido · ver grabaciones/ })).toHaveAttribute("href", "/academia?tab=webinars&sec=grabaciones");
    expect(screen.queryByText(/Próximo webinar/)).toBeNull();
    expect(screen.queryByText("00")).toBeNull();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.queryByRole("button", { name: /Registrarme/ })).toBeNull();
  });

  it("con fecha futura muestra la cuenta regresiva y el registro", () => {
    renderWithProviders(<NextWebinar webinar={FUTURE_WEBINAR} now={NOW} />);
    expect(screen.getByText("Próximo webinar · gratuito")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrarme/ })).toBeInTheDocument();
  });
});
