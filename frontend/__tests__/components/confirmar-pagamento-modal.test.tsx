import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmarPagamentoModal } from "@/components/financeiro/confirmar-pagamento-modal";
import api from "@/lib/api";

jest.mock("@/lib/api", () => ({
  put: jest.fn().mockResolvedValue({ data: { id: "1", status: "pago" } }),
  post: jest.fn().mockResolvedValue({ data: { id: "1", comprovante_url: "/uploads/file.pdf" } }),
  get: jest.fn().mockResolvedValue({ data: new Blob(["test"]) }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ConfirmarPagamentoModal", () => {
  const mockItem = {
    id: "despesa-123",
    descricao: "Conta de Água",
    valor: 250.75,
    competencia: "2026-09-01",
    vencimento: "2026-09-10",
    status: "pendente",
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    item: mockItem,
    tipo: "despesas" as const,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders item details and payment form when open", () => {
    render(<ConfirmarPagamentoModal {...defaultProps} />);

    expect(screen.getByText("Confirmar Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Conta de Água")).toBeInTheDocument();
    expect(screen.getByText("Data do Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Clique para anexar comprovante")).toBeInTheDocument();
  });

  it("submits payment without file via PUT request", async () => {
    render(<ConfirmarPagamentoModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /confirmar como pago/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/despesas/despesa-123",
        expect.objectContaining({
          status: "pago",
          data_pagamento: expect.any(String),
        })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("submits payment with attached file via multipart POST request", async () => {
    render(<ConfirmarPagamentoModal {...defaultProps} />);

    const file = new File(["dummy content"], "recibo.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText(/clique para anexar comprovante/i);

    await userEvent.upload(input, file);

    expect(screen.getByText("recibo.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pagar e enviar comprovante/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /pagar e enviar comprovante/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/despesas/despesa-123/comprovante",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
