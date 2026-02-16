import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import localCapMetaData from "../../../../public/cap-meta-data.json";

interface CampusSummary {
  campus: string;
  regional: string;
  inscritosMeta: number;
  matFinMeta: number;
  finDocMeta: number;
  matAcadMeta: number;
  inscritosAtual: number;
  matFinAtual: number;
  finDocAtual: number;
  matAcadAtual: number;
}

interface DataDetailed {
  campus: string;
  curso: string;
  turno: string;
  regional: string;
  inscritosMeta: number;
  matFinMeta: number;
  finDocMeta: number;
  matAcadMeta: number;
  inscritosAtual: number;
  matFinAtual: number;
  finDocAtual: number;
  matAcadAtual: number;
}

interface CapMetaData {
  dataDetailed: DataDetailed[];
  campusSummary: CampusSummary[];
  filters: {
    campuses: string[];
    cursos: string[];
    turnos: string[];
    regionais: string[];
  };
  totais: {
    inscritosMeta: number;
    matFinMeta: number;
    finDocMeta: number;
    matAcadMeta: number;
    inscritosAtual: number;
    matFinAtual: number;
    finDocAtual: number;
    matAcadAtual: number;
    totalCampus: number;
    campusComMeta: number;
    campusAtingindoMatFin: number;
  };
}

// Cache em memória
let cachedData: CapMetaData | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minuto

async function getData(): Promise<CapMetaData> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (cachedData && (now - lastFetch) < CACHE_TTL) {
    return cachedData;
  }

  try {
    // Verificar se existe dados no Blob
    const blobInfo = await head("cap-meta-data.json");
    
    if (blobInfo) {
      const response = await fetch(blobInfo.url);
      if (response.ok) {
        const data = await response.json();
        cachedData = data;
        lastFetch = now;
        return data;
      }
    }
  } catch (error) {
    console.log("Usando dados locais de meta (Blob não disponível)");
  }

  // Fallback para dados locais
  return localCapMetaData as CapMetaData;
}

export async function GET(request: NextRequest) {
  try {
    const loadedData = await getData();
    const { dataDetailed, campusSummary, filters, totais } = loadedData;
    
    const { searchParams } = new URL(request.url);
    const campus = searchParams.get("campus");
    const curso = searchParams.get("curso");
    const turno = searchParams.get("turno");
    const regional = searchParams.get("regional");
    const view = searchParams.get("view") || "summary";

    // Aplicar filtros aos dados detalhados
    let filteredData = [...dataDetailed];
    
    if (campus && campus !== "todos") {
      filteredData = filteredData.filter(d => d.campus === campus);
    }
    if (curso && curso !== "todos") {
      filteredData = filteredData.filter(d => d.curso === curso);
    }
    if (turno && turno !== "todos") {
      filteredData = filteredData.filter(d => d.turno === turno);
    }
    if (regional && regional !== "todos") {
      filteredData = filteredData.filter(d => d.regional === regional);
    }

    // Função para calcular resumo agrupado
    const calculateSummary = (data: DataDetailed[]) => {
      const campusMap: Record<string, CampusSummary> = {};
      data.forEach(d => {
        if (!campusMap[d.campus]) {
          campusMap[d.campus] = {
            campus: d.campus,
            regional: d.regional,
            inscritosMeta: 0,
            matFinMeta: 0,
            finDocMeta: 0,
            matAcadMeta: 0,
            inscritosAtual: 0,
            matFinAtual: 0,
            finDocAtual: 0,
            matAcadAtual: 0
          };
        }
        campusMap[d.campus].inscritosMeta += d.inscritosMeta;
        campusMap[d.campus].matFinMeta += d.matFinMeta;
        campusMap[d.campus].finDocMeta += d.finDocMeta;
        campusMap[d.campus].matAcadMeta += d.matAcadMeta;
        campusMap[d.campus].inscritosAtual += d.inscritosAtual;
        campusMap[d.campus].matFinAtual += d.matFinAtual;
        campusMap[d.campus].finDocAtual += d.finDocAtual;
        campusMap[d.campus].matAcadAtual += d.matAcadAtual;
      });
      return Object.values(campusMap).sort((a, b) => b.matFinAtual - a.matFinAtual);
    };

    // view=summary - retorna resumo por campus
    if (view === "summary") {
      const summaryData = calculateSummary(filteredData);

      // Calcular totais filtrados
      const filteredTotais = {
        inscritosMeta: summaryData.reduce((s, d) => s + d.inscritosMeta, 0),
        matFinMeta: summaryData.reduce((s, d) => s + d.matFinMeta, 0),
        finDocMeta: summaryData.reduce((s, d) => s + d.finDocMeta, 0),
        matAcadMeta: summaryData.reduce((s, d) => s + d.matAcadMeta, 0),
        inscritosAtual: summaryData.reduce((s, d) => s + d.inscritosAtual, 0),
        matFinAtual: summaryData.reduce((s, d) => s + d.matFinAtual, 0),
        finDocAtual: summaryData.reduce((s, d) => s + d.finDocAtual, 0),
        matAcadAtual: summaryData.reduce((s, d) => s + d.matAcadAtual, 0),
        totalCampus: summaryData.length,
        campusComMeta: summaryData.filter(d => d.matFinMeta > 0).length,
        campusAtingindoMatFin: summaryData.filter(d => d.matFinMeta > 0 && d.matFinAtual >= d.matFinMeta).length,
      };

      // Top performers por cada métrica
      const comMeta = summaryData.filter(d => d.matFinMeta > 0);
      
      const topPerformers = comMeta
        .map(d => ({
          ...d,
          percInscritos: d.inscritosMeta > 0 ? (d.inscritosAtual / d.inscritosMeta) * 100 : 0,
          percMatFin: d.matFinMeta > 0 ? (d.matFinAtual / d.matFinMeta) * 100 : 0,
          percFinDoc: d.finDocMeta > 0 ? (d.finDocAtual / d.finDocMeta) * 100 : 0,
          percMatAcad: d.matAcadMeta > 0 ? (d.matAcadAtual / d.matAcadMeta) * 100 : 0,
        }))
        .sort((a, b) => b.percMatFin - a.percMatFin)
        .slice(0, 10);

      const bottomPerformers = comMeta
        .map(d => ({
          ...d,
          percInscritos: d.inscritosMeta > 0 ? (d.inscritosAtual / d.inscritosMeta) * 100 : 0,
          percMatFin: d.matFinMeta > 0 ? (d.matFinAtual / d.matFinMeta) * 100 : 0,
          percFinDoc: d.finDocMeta > 0 ? (d.finDocAtual / d.finDocMeta) * 100 : 0,
          percMatAcad: d.matAcadMeta > 0 ? (d.matAcadAtual / d.matAcadMeta) * 100 : 0,
        }))
        .sort((a, b) => a.percMatFin - b.percMatFin)
        .slice(0, 10);

      return NextResponse.json({
        data: summaryData,
        filters,
        totais: filteredTotais,
        topPerformers,
        bottomPerformers
      });
    }

    // view=detail - retorna dados detalhados por curso/turno
    const filteredTotais = {
      inscritosMeta: filteredData.reduce((s, d) => s + d.inscritosMeta, 0),
      matFinMeta: filteredData.reduce((s, d) => s + d.matFinMeta, 0),
      finDocMeta: filteredData.reduce((s, d) => s + d.finDocMeta, 0),
      matAcadMeta: filteredData.reduce((s, d) => s + d.matAcadMeta, 0),
      inscritosAtual: filteredData.reduce((s, d) => s + d.inscritosAtual, 0),
      matFinAtual: filteredData.reduce((s, d) => s + d.matFinAtual, 0),
      finDocAtual: filteredData.reduce((s, d) => s + d.finDocAtual, 0),
      matAcadAtual: filteredData.reduce((s, d) => s + d.matAcadAtual, 0),
      totalRegistros: filteredData.length,
    };

    // Dados por curso
    const porCurso = Object.entries(
      filteredData.reduce((acc, d) => {
        if (!acc[d.curso]) {
          acc[d.curso] = { 
            inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0,
            inscritosAtual: 0, matFinAtual: 0, finDocAtual: 0, matAcadAtual: 0
          };
        }
        acc[d.curso].inscritosMeta += d.inscritosMeta;
        acc[d.curso].matFinMeta += d.matFinMeta;
        acc[d.curso].finDocMeta += d.finDocMeta;
        acc[d.curso].matAcadMeta += d.matAcadMeta;
        acc[d.curso].inscritosAtual += d.inscritosAtual;
        acc[d.curso].matFinAtual += d.matFinAtual;
        acc[d.curso].finDocAtual += d.finDocAtual;
        acc[d.curso].matAcadAtual += d.matAcadAtual;
        return acc;
      }, {} as Record<string, { 
        inscritosMeta: number; matFinMeta: number; finDocMeta: number; matAcadMeta: number;
        inscritosAtual: number; matFinAtual: number; finDocAtual: number; matAcadAtual: number;
      }>)
    )
      .map(([curso, values]) => ({
        curso,
        ...values,
        percMatFin: values.matFinMeta > 0 ? (values.matFinAtual / values.matFinMeta) * 100 : 0
      }))
      .sort((a, b) => b.matFinAtual - a.matFinAtual);

    return NextResponse.json({
      data: filteredData,
      filters,
      totais: filteredTotais,
      porCurso
    });

  } catch (error) {
    console.error("Erro ao processar dados de meta:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Erro ao processar dados de meta", details: errorMessage },
      { status: 500 }
    );
  }
}
