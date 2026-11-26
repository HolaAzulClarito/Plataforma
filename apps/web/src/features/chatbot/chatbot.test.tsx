import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { session } from "../../state/session";
import { renderWithProviders } from "../../test/utils";
import { Chatbot } from "./Chatbot";
import { answer } from "./faq";

describe("asistente de preguntas frecuentes", () => {
  it("responde sobre exámenes con el examen final único (sin examen por módulo)", () => {
    const es = answer("¿Qué pasa si repruebo el examen?", "es");
    expect(es).toBe(
      "Cada curso cierra con un examen final. El examen tiene un número de intentos y un tiempo límite que define la academia. Si agotas tus intentos, desde el mismo examen puedes pedir uno adicional; lo autoriza la administración y te avisamos por correo.",
    );
    expect(es).not.toMatch(/módulo/i);
    expect(answer("What if I fail the exam?", "en")).toMatch(/^Each course ends with a final exam\./);
    expect(answer("What if I fail the exam?", "en")).not.toMatch(/module/i);
  });

  it("busca sin acentos y tiene respuesta por defecto", () => {
    expect(answer("CEDULA", "es")).toMatch(/cédula profesional/);
    expect(answer("hola", "es")).toMatch(/Aún no tengo esa respuesta/);
  });

  it("se abre, responde una sugerencia y cambia de idioma", () => {
    renderWithProviders(<Chatbot />);
    const fab = screen.getByRole("button", { name: "Abrir asistente" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(fab);
    expect(screen.getByRole("button", { name: "Cerrar asistente" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "¿Cómo gano puntos?" }));
    expect(screen.getByText(/Sumas puntos al verificar tu cédula/)).toBeInTheDocument();
  });

  it("en inglés usa las respuestas en inglés", () => {
    session.setLang("en");
    renderWithProviders(<Chatbot />);
    fireEvent.click(screen.getByRole("button", { name: "Open assistant" }));
    fireEvent.click(screen.getByRole("button", { name: "What if I fail the exam?" }));
    expect(screen.getByText(/Each course ends with a final exam/)).toBeInTheDocument();
  });
});
