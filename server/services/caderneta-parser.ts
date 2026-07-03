// Parser de caderneta predial (urbana/rústica) extraída em texto via pdf-parse.
// Não acede à BD — recebe texto puro e devolve dados estruturados + avisos.

export interface ParsedCadernetaUnit {
  code: string | null; // "A", "B", "J" — fração/andar
  affectation: string | null;
  areaM2: number | null;
  taxableValue: number | null;
}

export interface ParsedCadernetaTitular {
  taxNumber: string;
  name: string;
  address: string | null;
  tipoTitular: string;
  quotaParte: string | null;
  ownershipPercentage: number | null;
  isSpecialRegime: boolean;
}

export interface ParsedCaderneta {
  documentType: "urbana" | "rustica";
  matrixType: "U" | "R";
  districtName: string | null;
  municipalityName: string | null;
  parishName: string | null;
  matrixArticle: string | null;
  matrixSection: string | null;
  address: string | null;
  postalCode: string | null;
  locationName: string | null;
  taxableValueTotal: number | null;
  areaM2: number | null;
  units: ParsedCadernetaUnit[];
  titulares: ParsedCadernetaTitular[];
  warnings: string[];
}

function flatten(text: string): string {
  return text.replace(/\r/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function parsePtNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseFraction(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!den) return null;
  return Math.round((num / den) * 10000) / 100; // 2 casas decimais
}

export function parseCadernetaText(rawText: string): ParsedCaderneta {
  const text = flatten(rawText);
  const warnings: string[] = [];

  const isRustica = /CADERNETA PREDIAL R[ÚU]STICA/i.test(text);
  const documentType: "urbana" | "rustica" = isRustica ? "rustica" : "urbana";
  const matrixType: "U" | "R" = isRustica ? "R" : "U";

  // Distrito / Concelho / Freguesia — apenas a primeira ocorrência (a secção
  // "TEVE ORIGEM NOS ARTIGOS" repete o padrão para artigos de origem, extintos).
  let districtName: string | null = null;
  let municipalityName: string | null = null;
  let parishName: string | null = null;
  const locMatch = text.match(
    /DISTRITO:\s*\d+\s*-\s*(.+?)\s*CONCELHO:\s*\d+\s*-\s*(.+?)\s*FREGUESIA:\s*\d+\s*-\s*(.+?)(?=\s*(?:ARTIGO MATRICIAL|SEC[ÇC]ÃO:|Descrito na|TEVE ORIGEM|LOCALIZA[ÇC][ÃA]O DO PR[ÉE]DIO|NOME\/LOCALIZA|$))/i
  );
  if (locMatch) {
    districtName = locMatch[1].trim();
    municipalityName = locMatch[2].trim();
    parishName = locMatch[3].trim();
  } else {
    warnings.push("Não foi possível identificar distrito/concelho/freguesia.");
  }

  // Artigo matricial + secção
  let matrixArticle: string | null = null;
  let matrixSection: string | null = null;
  if (isRustica) {
    const m = text.match(/SEC[ÇC]ÃO:\s*(.*?)\s*ARTIGO MATRICIAL Nº:\s*(\d+)/i);
    if (m) {
      matrixSection = m[1].trim() || null;
      matrixArticle = m[2].trim();
    }
  } else {
    const m = text.match(/ARTIGO MATRICIAL:\s*(\d+)/i);
    if (m) matrixArticle = m[1].trim();
  }
  if (!matrixArticle) {
    warnings.push("Não foi possível identificar o artigo matricial.");
  }

  // Localização
  let address: string | null = null;
  let postalCode: string | null = null;
  let locationName: string | null = null;
  if (isRustica) {
    const m = text.match(/NOME\/LOCALIZA[ÇC][ÃA]O PR[ÉE]DIO\s*(.+?)\s*CONFRONTA[ÇC][ÕO]ES/i);
    if (m) locationName = m[1].trim();
  } else {
    const m = text.match(/Av\.\/Rua\/Pra[çc]a:\s*(.+?)\s*C[óo]digo Postal:\s*(\d{4}-\d{3})/i);
    if (m) {
      address = m[1].trim();
      postalCode = m[2].trim();
    } else {
      warnings.push("Não foi possível identificar a morada do prédio.");
    }
  }

  // VPT total
  let taxableValueTotal: number | null = null;
  if (isRustica) {
    const m = text.match(/Valor Patrimonial Actual:\s*€?\s*([\d.,]+)/i);
    taxableValueTotal = parsePtNumber(m?.[1]);
  } else {
    const total = text.match(/Valor patrimonial total:\s*€?\s*([\d.,]+)/i);
    const single = text.match(/Valor patrimonial actual \(CIMI\):\s*€?\s*([\d.,]+)/i);
    taxableValueTotal = parsePtNumber(total?.[1] ?? single?.[1]);
  }
  if (taxableValueTotal == null) warnings.push("Não foi possível identificar o valor patrimonial tributário.");

  // Área
  let areaM2: number | null = null;
  if (isRustica) {
    const m = text.match(/[ÁA]rea Total \(ha\):\s*([\d.,]+)/i);
    const ha = parsePtNumber(m?.[1]);
    areaM2 = ha != null ? Math.round(ha * 10000 * 100) / 100 : null;
  } else {
    const m = text.match(/[ÁA]rea bruta privativa total:\s*([\d.,]+)\s*m/i);
    areaM2 = parsePtNumber(m?.[1]);
  }

  // Frações / andares (só urbana)
  const units: ParsedCadernetaUnit[] = [];
  if (!isRustica) {
    const headerRe = /(?:ANDAR OU DIVIS[ÃA]O COM UTILIZA[ÇC][ÃA]O INDEPENDENTE|FRAC[ÇC][ÃA]O AUT[ÓO]NOMA):\s*([A-Z0-9]+)/gi;
    const headers: { code: string; index: number }[] = [];
    let hm: RegExpExecArray | null;
    while ((hm = headerRe.exec(text)) !== null) {
      headers.push({ code: hm[1], index: hm.index });
    }
    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.indexOf("TITULARES", start);
      const slice = text.slice(start, end === -1 ? undefined : end);
      const affect = slice.match(/Afecta[çc][ãa]o:\s*(.+?)\s*Tipologia/i);
      const area = slice.match(/[ÁA]rea bruta privativa:\s*([\d.,]+)\s*m/i);
      const vpt = slice.match(/Valor patrimonial actual \(CIMI\):\s*€?\s*([\d.,]+)/i);
      units.push({
        code: headers[i].code,
        affectation: affect?.[1]?.trim() ?? null,
        areaM2: parsePtNumber(area?.[1]),
        taxableValue: parsePtNumber(vpt?.[1]),
      });
    }
  }

  // Titulares
  const titulares: ParsedCadernetaTitular[] = [];
  const titularRe =
    /Identifica[çc][ãa]o fiscal:\s*(\d{9})\s*Nome:\s*(.+?)\s*Morada:\s*(.+?)\s*Tipo de titular:\s*(.+?)(?=Identifica[çc][ãa]o fiscal:\s*\d{9}|Emitido via internet|P[áa]gina \d|$)/gis;
  let tm: RegExpExecArray | null;
  while ((tm = titularRe.exec(text)) !== null) {
    const taxNumber = tm[1];
    const name = tm[2].trim();
    const address2 = tm[3].trim();
    const rest = tm[4].trim();

    const tipoMatch = rest.match(/^(.+?)(?:\s+Periodicidade:|\s+Parte:)/i);
    const tipoTitular = (tipoMatch?.[1] ?? rest.split(/\s+Parte:/i)[0] ?? "").trim();
    const quotaMatch = rest.match(/Parte:\s*(\d+\s*\/\s*\d+)/i);
    const quotaParte = quotaMatch?.[1]?.replace(/\s+/g, "") ?? null;
    const isSpecialRegime = !/^Propriedade plena/i.test(tipoTitular);

    titulares.push({
      taxNumber,
      name,
      address: address2 || null,
      tipoTitular: tipoTitular || "Desconhecido",
      quotaParte,
      ownershipPercentage: parseFraction(quotaParte),
      isSpecialRegime,
    });
  }

  if (titulares.length === 0) {
    warnings.push("Não foi possível identificar nenhum titular no documento.");
  }
  if (titulares.some((t) => t.isSpecialRegime)) {
    warnings.push(
      "Existem titulares em regime especial (herdeiro/usufruto/outro) — confirme a quota-parte manualmente antes de gravar."
    );
  }
  if (units.length > 1) {
    warnings.push(
      `O prédio tem ${units.length} frações/andares distintos — escolha quais pretende importar como imóveis.`
    );
  }

  const percentageSum = titulares.reduce((sum, t) => sum + (t.ownershipPercentage ?? 0), 0);
  if (titulares.length > 0 && Math.abs(percentageSum - 100) > 0.5) {
    warnings.push(
      `As quotas-parte dos titulares somam ${percentageSum.toFixed(2)}% (não 100%) — confirme as percentagens antes de gravar.`
    );
  }

  return {
    documentType,
    matrixType,
    districtName,
    municipalityName,
    parishName,
    matrixArticle,
    matrixSection,
    address,
    postalCode,
    locationName,
    taxableValueTotal,
    areaM2,
    units,
    titulares,
    warnings,
  };
}
