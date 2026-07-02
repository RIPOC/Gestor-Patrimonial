import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  LEASE_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  PROPERTY_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  RENT_STATUS_LABELS,
  type LeaseStatus,
  type MaintenanceStatus,
  type PropertyStatus,
  type ReceiptStatus,
  type RentStatus,
} from "@/lib/types";

const PROPERTY_TONES: Record<PropertyStatus, BadgeTone> = {
  arrendado: "green",
  devoluto: "gray",
  em_obras: "yellow",
  reservado: "blue",
  vendido: "neutral",
  inativo: "neutral",
};

const LEASE_TONES: Record<LeaseStatus, BadgeTone> = {
  rascunho: "neutral",
  ativo: "green",
  terminado: "gray",
  suspenso: "yellow",
  em_renovacao: "blue",
};

const RENT_TONES: Record<RentStatus, BadgeTone> = {
  prevista: "neutral",
  por_cobrar: "yellow",
  paga: "green",
  parcialmente_paga: "yellow",
  vencida: "red",
  em_atraso: "red",
  em_litigio: "purple",
  anulada: "gray",
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return <Badge tone={PROPERTY_TONES[status]}>{PROPERTY_STATUS_LABELS[status]}</Badge>;
}

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return <Badge tone={LEASE_TONES[status]}>{LEASE_STATUS_LABELS[status]}</Badge>;
}

export function RentStatusBadge({ status }: { status: RentStatus }) {
  return <Badge tone={RENT_TONES[status]}>{RENT_STATUS_LABELS[status]}</Badge>;
}

const MAINTENANCE_TONES: Record<MaintenanceStatus, BadgeTone> = {
  aberta: "red",
  em_analise: "yellow",
  orcamentada: "purple",
  aprovada: "blue",
  em_execucao: "yellow",
  concluida: "green",
  cancelada: "gray",
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return <Badge tone={MAINTENANCE_TONES[status]}>{MAINTENANCE_STATUS_LABELS[status]}</Badge>;
}

const RECEIPT_TONES: Record<ReceiptStatus, BadgeTone> = {
  por_emitir: "blue",
  emitido: "green",
  comunicado: "purple",
  erro: "red",
  anulado: "gray",
};

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return <Badge tone={RECEIPT_TONES[status]}>{RECEIPT_STATUS_LABELS[status]}</Badge>;
}
