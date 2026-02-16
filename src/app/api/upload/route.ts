import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import * as XLSX from "xlsx";

// Configuração para arquivos grandes - Route Segment Config
export const maxDuration = 60; // 60 segundos de timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Aceitar múltiplos arquivos
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File;
    
    // Se não veio no formato múltiplo, tenta o formato simples
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);
    
    if (allFiles.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipos de arquivo
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const validMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    
    for (const file of allFiles) {
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      const hasValidMimeType = validMimeTypes.includes(file.type);
      
      if (!hasValidExtension && !hasValidMimeType) {
        return NextResponse.json({ 
          error: `Formato inválido: ${file.name}. Envie arquivos Excel (.xlsx, .xls) ou CSV` 
        }, { status: 400 });
      }
    }

    let allCrivoData: any[] = [];
    let allCapData: any[] = [];
    const uploadedFiles: string[] = [];

    // Processar cada arquivo
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const timestamp = Date.now();
      
      // Upload do arquivo original para o Blob (com nome único)
      const blob = await put(`uploads/planilha-${timestamp}-${i}-${file.name}`, file, {
        access: "public",
        allowOverwrite: true,
      });
      uploadedFiles.push(file.name);

      // Processar o arquivo Excel
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
        error: "Nenhum dado encontrado. Verifique se as abas CRIVO e/ou CAP_CT existem na planilha." 
      }, { status: 400 });
    }

    // Processar dados do CRIVO
    const processedCrivo = processCrivoData(allCrivoData, allCapData);
    
    // Processar dados de Meta do CAP
    const processedMeta = processMetaData(allCapData);

    // Salvar dados processados no Blob
    const crivoBlob = await put("crivo-data.json", JSON.stringify(processedCrivo), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    });

    const metaBlob = await put("cap-meta-data.json", JSON.stringify(processedMeta), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    });

    return NextResponse.json({
      success: true,
      message: `${allFiles.length} arquivo(s) processado(s) com sucesso!`,
      stats: {
        arquivosProcessados: allFiles.length,
        arquivos: uploadedFiles,
        crivoRegistros: processedCrivo.data.length,
        metaRegistros: processedMeta.data.length,
        crivoBlobUrl: crivoBlob.url,
        metaBlobUrl: metaBlob.url,
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
  // Criar mapa de MAT_ACAD do CAP
  const matAcadMap = new Map<string, number>();
  
  if (capData.length > 0) {
    capData.forEach((row: any) => {
      const sku = row.SKU || row.sku || row.Sku;
      const matAcad = row.MAT_ACAD || row.mat_acad || row.MatAcad || 0;
      if (sku) {
        matAcadMap.set(String(sku), Number(matAcad) || 0);
      }
    });
  }

  const processedData = crivoData.map((row: any) => {
    const sku = String(row.SKU || "");
    const finDoc = Number(row.FIN_DOC || row.Fin_Doc || 0);
    const pe = Number(row.PE || 0);
    
    return {
      SKU: sku,
      UF: String(row.UF || ""),
      MUNICIPIO: String(row.MUNICIPIO || row.Municipio || ""),
      NOME_CAMPUS: String(row.NOME_CAMPUS || row.Nome_Campus || row.CAMPUS || ""),
      NOME_CURSO: String(row.NOME_CURSO || row.Nome_Curso || row.CURSO || ""),
      TURNO: String(row.TURNO || row.Turno || ""),
      MODALIDADE: String(row.MODALIDADE || row.Modalidade || ""),
      INSCRITOS: Number(row.INSCRITOS || row.Inscritos || 0),
      MAT_FIN: Number(row.MAT_FIN || row.Mat_Fin || 0),
      FIN_DOC: finDoc,
      PE: pe,
      GAP: finDoc - pe,
      MAT_ACAD: matAcadMap.get(sku) || Number(row.MAT_ACAD || 0),
      STATUS_ORIGINAL: String(row.STATUS || row.Status || row.STATUS_ORIGINAL || ""),
      STATUS_CURSO: finDoc >= pe ? "CONFIRMADO" : "STANDBY",
      AREA_CONHECIMENTO: String(row.AREA_CONHECIMENTO || row.Area || ""),
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
    return { data: [], filters: { campuses: [], cursos: [], turnos: [], regionais: [] } };
  }

  // Agrupar por campus
  const campusMap = new Map<string, any>();

  capData.forEach((row: any) => {
    const campus = String(row.NOME_CAMPUS || row.CAMPUS || row.Campus || "");
    const regional = String(row.REGIONAL || row.Regional || "");
    
    if (!campus) return;

    if (!campusMap.has(campus)) {
      campusMap.set(campus, {
        campus,
        regional,
        inscritosMeta: 0,
        matFinMeta: 0,
        finDocMeta: 0,
        matAcadMeta: 0,
        inscritosAtual: 0,
        matFinAtual: 0,
        finDocAtual: 0,
        matAcadAtual: 0,
      });
    }

    const entry = campusMap.get(campus)!;
    
    // Metas (colunas _FECH)
    entry.inscritosMeta += Number(row.INSCRITOS_META_FECH || row.INSCRITOS_META || 0);
    entry.matFinMeta += Number(row.MAT_FIN_META_FECH || row.MAT_FIN_META || 0);
    entry.finDocMeta += Number(row.FIN_DOC_META_FECH || row.FIN_DOC_META || 0);
    entry.matAcadMeta += Number(row.MAT_ACAD_META_FECH || row.MAT_ACAD_META || 0);
    
    // Valores atuais
    entry.inscritosAtual += Number(row.INSCRITOS || 0);
    entry.matFinAtual += Number(row.MAT_FIN || 0);
    entry.finDocAtual += Number(row.FIN_DOC || 0);
    entry.matAcadAtual += Number(row.MAT_ACAD || 0);
  });

  const processedData = Array.from(campusMap.values());

  // Calcular percentuais
  processedData.forEach(entry => {
    entry.percInscritos = entry.inscritosMeta > 0 ? (entry.inscritosAtual / entry.inscritosMeta) * 100 : 0;
    entry.percMatFin = entry.matFinMeta > 0 ? (entry.matFinAtual / entry.matFinMeta) * 100 : 0;
    entry.percFinDoc = entry.finDocMeta > 0 ? (entry.finDocAtual / entry.finDocMeta) * 100 : 0;
    entry.percMatAcad = entry.matAcadMeta > 0 ? (entry.matAcadAtual / entry.matAcadMeta) * 100 : 0;
  });

  // Extrair filtros
  const filters = {
    campuses: [...new Set(processedData.map(d => d.campus).filter(Boolean))].sort(),
    cursos: [...new Set(capData.map((d: any) => d.NOME_CURSO || d.CURSO).filter(Boolean))].sort(),
    turnos: [...new Set(capData.map((d: any) => d.TURNO || d.Turno).filter(Boolean))].sort(),
    regionais: [...new Set(processedData.map(d => d.regional).filter(Boolean))].sort(),
  };

  return { data: processedData, filters };
}
