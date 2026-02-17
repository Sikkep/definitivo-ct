import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";

// Configuração para arquivos grandes
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Aceitar múltiplos arquivos
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File;
    
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);
    
    if (allFiles.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipos de arquivo
    const validExtensions = [".xlsx", ".xls", ".csv"];
    
    for (const file of allFiles) {
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        return NextResponse.json({ 
          error: `Formato inválido: ${file.name}. Envie arquivos Excel (.xlsx, .xls) ou CSV` 
        }, { status: 400 });
      }
    }

    let allCrivoData: any[] = [];
    let allCapData: any[] = [];
    const processedFiles: string[] = [];

    // Processar cada arquivo
    for (const file of allFiles) {
      processedFiles.push(file.name);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // Processar aba CRIVO
      const crivoSheetName = workbook.SheetNames.find(name => 
        name.toUpperCase().includes("CRIVO")
      );
      
      if (crivoSheetName) {
        const sheet = workbook.Sheets[crivoSheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        allCrivoData = [...allCrivoData, ...data];
      }

      // Processar aba CAP_CT
      const capSheetName = workbook.SheetNames.find(name => 
        name.toUpperCase().includes("CAP")
      );
      
      if (capSheetName) {
        const sheet = workbook.Sheets[capSheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        allCapData = [...allCapData, ...data];
      }
    }

    // Se não encontrou dados, retorna erro
    if (allCrivoData.length === 0 && allCapData.length === 0) {
      return NextResponse.json({ 
        error: "Nenhum dado encontrado. Verifique se as abas CRIVO e/ou CAP existem na planilha." 
      }, { status: 400 });
    }

    // Processar dados
    const processedCrivo = processCrivoData(allCrivoData, allCapData);
    const processedMeta = processMetaData(allCapData);

    // Salvar diretamente nos arquivos JSON locais
    const publicDir = path.join(process.cwd(), "public");
    
    await fs.writeFile(
      path.join(publicDir, "crivo-data.json"),
      JSON.stringify(processedCrivo, null, 2)
    );
    
    await fs.writeFile(
      path.join(publicDir, "cap-meta-data.json"),
      JSON.stringify(processedMeta, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: `${allFiles.length} arquivo(s) processado(s) com sucesso!`,
      stats: {
        arquivosProcessados: allFiles.length,
        arquivos: processedFiles,
        crivoRegistros: processedCrivo.data.length,
        metaRegistros: processedMeta.campusSummary?.length || 0,
      },
    });

  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao processar arquivo", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

function processCrivoData(crivoData: any[], capData: any[]) {
  // Helper para converter números com vírgula
  const parseNum = (val: any) => Number(String(val || 0).replace(',', '.')) || 0;
  
  // Criar mapa de dados do CAP por SKU
  const capMap = new Map<string, any>();
  
  if (capData.length > 0) {
    capData.forEach((row: any) => {
      // Filtrar apenas 2026.1 e não desistentes
      const periodo = String(row.PERIODO_ACADEMICO || row.PERIODO || '2026.1');
      const fDesistente = String(row.F_DESISTENTE || row.FLAG_DESISTENTE || '0');
      
      const isAtivo = fDesistente === '0' || fDesistente === '' || fDesistente === '0,000000';
      const isPeriodoCorreto = periodo.includes('2026.1');
      
      if (!isAtivo || !isPeriodoCorreto) return;
      
      const codCampus = String(row.COD_CAMPUS || '').split(/[,.]/)[0].trim();
      const codCurso = String(row.COD_CURSO || '').split(/[,.]/)[0].trim();
      const codTurno = String(row.COD_TURNO || '').split(/[,.]/)[0].trim();
      const sku = `${codCampus}${codCurso}${codTurno}`;
      
      if (!sku || sku.length < 3) return;
      
      if (!capMap.has(sku)) {
        capMap.set(sku, {
          INSCRITOS: 0, MAT_FIN: 0, FIN_DOC: 0, MAT_ACAD: 0,
          NOME_CAMPUS: row.NOM_CAMPUS || row.NOME_CAMPUS || '',
          NOME_CURSO: row.NOM_CURSO || row.NOME_CURSO || '',
          TURNO: row.NOM_TURNO || row.TURNO || '',
        });
      }
      
      const entry = capMap.get(sku)!;
      entry.INSCRITOS += parseNum(row.INSCRITOS_ATUAL || row.INSCRITOS);
      entry.MAT_FIN += parseNum(row.MAT_FIN_ATUAL || row.MAT_FIN);
      entry.FIN_DOC += parseNum(row.FIN_DOC_ATUAL || row.FIN_DOC);
      entry.MAT_ACAD += parseNum(row.MAT_ACAD_ATUAL || row.MAT_ACAD);
    });
  }

  // Mapear PE por curso dos dados do CRIVO
  const pePorCurso: Record<string, number> = {};
  crivoData.forEach((row: any) => {
    const curso = String(row['NOME DO CURSO'] || row.NOME_CURSO || '');
    const pe = Number(row['P.E.'] || row.PE || row['P.E'] || 0);
    if (curso && pe > 0 && !pePorCurso[curso]) {
      pePorCurso[curso] = pe;
    }
  });

  // Mapear PE por SKU dos dados do CRIVO
  const pePorSKU: Record<string, number> = {};
  crivoData.forEach((row: any) => {
    const sku = String(row.SKU || '');
    const pe = Number(row['P.E.'] || row.PE || row['P.E'] || 0);
    if (sku && pe > 0) {
      pePorSKU[sku] = pe;
    }
  });

  const processedData = crivoData.map((row: any) => {
    const sku = String(row.SKU || '');
    const capInfo = capMap.get(sku) || { INSCRITOS: 0, MAT_FIN: 0, FIN_DOC: 0, MAT_ACAD: 0 };
    
    // PE: primeiro do CRIVO, senão usa padrão por curso
    let pe = pePorSKU[sku] || 0;
    if (pe === 0) {
      const nomeCurso = String(row['NOME DO CURSO'] || row.NOME_CURSO || '');
      pe = pePorCurso[nomeCurso] || 0;
    }
    
    const finDoc = capInfo.FIN_DOC;
    
    return {
      SKU: sku,
      UF: String(row.UF || ''),
      MUNICIPIO: String(row.MUNICIPIO || row.Municipio || ''),
      NOME_CAMPUS: String(row['NOME DO CAMPUS'] || row.NOME_CAMPUS || capInfo.NOME_CAMPUS || ''),
      NOME_CURSO: String(row['NOME DO CURSO'] || row.NOME_CURSO || capInfo.NOME_CURSO || ''),
      TURNO: String(row.TURNO || capInfo.TURNO || ''),
      MODALIDADE: String(row.MODALIDADE || ''),
      INSCRITOS: capInfo.INSCRITOS,
      MAT_FIN: capInfo.MAT_FIN,
      FIN_DOC: finDoc,
      PE: pe,
      GAP: finDoc - pe,
      MAT_ACAD: capInfo.MAT_ACAD,
      STATUS_ORIGINAL: String(row.STATUS || ''),
      STATUS_CURSO: finDoc >= pe ? "CONFIRMADO" : "STANDBY",
      AREA_CONHECIMENTO: String(row['AREA DE \r\nCONHECIMENTO'] || row['AREA DE CONHECIMENTO'] || row.AREA_CONHECIMENTO || ''),
      REGIONAL: String(row['SIGLA REGIONAL'] || row.REGIONAL || ''),
    };
  });

  // Extrair filtros únicos
  const filters = {
    ufs: [...new Set(processedData.map(d => d.UF).filter(Boolean))].sort(),
    campus: [...new Set(processedData.map(d => d.NOME_CAMPUS).filter(Boolean))].sort(),
    cursos: [...new Set(processedData.map(d => d.NOME_CURSO).filter(Boolean))].sort(),
    turnos: [...new Set(processedData.map(d => d.TURNO).filter(Boolean))].sort(),
  };

  return { data: processedData, filters };
}

function processMetaData(capData: any[]) {
  if (!capData || capData.length === 0) {
    return { 
      dataDetailed: [], 
      campusSummary: [], 
      filters: { campuses: [], cursos: [], turnos: [], regionais: [] },
      totais: { inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0, inscritosAtual: 0, matFinAtual: 0, finDocAtual: 0, matAcadAtual: 0, totalCampus: 0, campusComMeta: 0, campusAtingindoMatFin: 0 }
    };
  }

  const parseNum = (val: any) => Number(String(val || 0).replace(',', '.')) || 0;

  // Filtrar dados do CAP
  const filteredData = capData.filter((row: any) => {
    const periodo = String(row.PERIODO_ACADEMICO || row.PERIODO || '2026.1');
    const fDesistente = String(row.F_DESISTENTE || row.FLAG_DESISTENTE || '0');
    
    const isAtivo = fDesistente === '0' || fDesistente === '' || fDesistente === '0,000000';
    const isPeriodoCorreto = periodo.includes('2026.1');
    
    return isAtivo && isPeriodoCorreto;
  });

  // Dados detalhados por curso/turno
  const detailedMap = new Map<string, any>();
  
  filteredData.forEach((row: any) => {
    const campus = String(row.NOM_CAMPUS || row.NOME_CAMPUS || '');
    const curso = String(row.NOM_CURSO || row.NOME_CURSO || '');
    const turno = String(row.NOM_TURNO || row.TURNO || '');
    const regional = String(row.NOM_REGIONAL || row.REGIONAL || '');
    const key = `${campus}|${curso}|${turno}`;
    
    if (!campus || !curso) return;
    
    if (!detailedMap.has(key)) {
      detailedMap.set(key, {
        campus, curso, turno, regional,
        inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0,
        inscritosAtual: 0, matFinAtual: 0, finDocAtual: 0, matAcadAtual: 0,
      });
    }
    
    const entry = detailedMap.get(key)!;
    entry.inscritosMeta += parseNum(row.INSCRITOS_META_FECH || row.INSCRITOS_META);
    entry.matFinMeta += parseNum(row.MAT_FIN_META_FECH || row.MAT_FIN_META);
    entry.finDocMeta += parseNum(row.FIN_DOC_META_FECH || row.FIN_DOC_META);
    entry.matAcadMeta += parseNum(row.MAT_ACAD_META_FECH || row.MAT_ACAD_META);
    entry.inscritosAtual += parseNum(row.INSCRITOS_ATUAL || row.INSCRITOS);
    entry.matFinAtual += parseNum(row.MAT_FIN_ATUAL || row.MAT_FIN);
    entry.finDocAtual += parseNum(row.FIN_DOC_ATUAL || row.FIN_DOC);
    entry.matAcadAtual += parseNum(row.MAT_ACAD_ATUAL || row.MAT_ACAD);
  });

  const dataDetailed = Array.from(detailedMap.values());

  // Resumo por campus
  const campusMap = new Map<string, any>();
  
  dataDetailed.forEach(d => {
    if (!campusMap.has(d.campus)) {
      campusMap.set(d.campus, {
        campus: d.campus,
        regional: d.regional,
        inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0,
        inscritosAtual: 0, matFinAtual: 0, finDocAtual: 0, matAcadAtual: 0,
      });
    }
    
    const entry = campusMap.get(d.campus)!;
    entry.inscritosMeta += d.inscritosMeta;
    entry.matFinMeta += d.matFinMeta;
    entry.finDocMeta += d.finDocMeta;
    entry.matAcadMeta += d.matAcadMeta;
    entry.inscritosAtual += d.inscritosAtual;
    entry.matFinAtual += d.matFinAtual;
    entry.finDocAtual += d.finDocAtual;
    entry.matAcadAtual += d.matAcadAtual;
  });

  const campusSummary = Array.from(campusMap.values());

  // Calcular totais
  const totais = {
    inscritosMeta: campusSummary.reduce((s, d) => s + d.inscritosMeta, 0),
    matFinMeta: campusSummary.reduce((s, d) => s + d.matFinMeta, 0),
    finDocMeta: campusSummary.reduce((s, d) => s + d.finDocMeta, 0),
    matAcadMeta: campusSummary.reduce((s, d) => s + d.matAcadMeta, 0),
    inscritosAtual: campusSummary.reduce((s, d) => s + d.inscritosAtual, 0),
    matFinAtual: campusSummary.reduce((s, d) => s + d.matFinAtual, 0),
    finDocAtual: campusSummary.reduce((s, d) => s + d.finDocAtual, 0),
    matAcadAtual: campusSummary.reduce((s, d) => s + d.matAcadAtual, 0),
    totalCampus: campusSummary.length,
    campusComMeta: campusSummary.filter(d => d.matFinMeta > 0).length,
    campusAtingindoMatFin: campusSummary.filter(d => d.matFinMeta > 0 && d.matFinAtual >= d.matFinMeta).length,
  };

  // Filtros
  const filters = {
    campuses: [...new Set(campusSummary.map(d => d.campus).filter(Boolean))].sort(),
    cursos: [...new Set(dataDetailed.map(d => d.curso).filter(Boolean))].sort(),
    turnos: [...new Set(dataDetailed.map(d => d.turno).filter(Boolean))].sort(),
    regionais: [...new Set(campusSummary.map(d => d.regional).filter(Boolean))].sort(),
  };

  return { dataDetailed, campusSummary, filters, totais };
}
