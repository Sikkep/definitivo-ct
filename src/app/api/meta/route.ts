import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

export async function GET(request: NextRequest) {
  try {
    // Ler arquivo dinamicamente para evitar cache do build
    const filePath = path.join(process.cwd(), "public", "cap-meta-data.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const loadedData = JSON.parse(fileContent) as CapMetaData;
    const { dataDetailed, campusSummary, filters, totais } = loadedData;
    
    const { searchParams } = new URL(request.url);
    const campus = searchParams.get("campus");
    const curso = searchParams.get("curso");
    const turno = searchParams.get("turno");
    const regional = searchParams.get("regional");
    const view = searchParams.get("view") || "summary";

    // Usar campusSummary como base de dados
    let data = campusSummary || [];
    
    // Se tiver dataDetailed, calcular summary a partir dele com filtros
    if (dataDetailed && dataDetailed.length > 0) {
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

      // Calcular resumo agrupado por campus
      const campusMap: Record<string, CampusSummary> = {};
      filteredData.forEach(d => {
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
        campusMap[d.campus].inscritosMeta += d.inscritosMeta || 0;
        campusMap[d.campus].matFinMeta += d.matFinMeta || 0;
        campusMap[d.campus].finDocMeta += d.finDocMeta || 0;
        campusMap[d.campus].matAcadMeta += d.matAcadMeta || 0;
        campusMap[d.campus].inscritosAtual += d.inscritosAtual || 0;
        campusMap[d.campus].matFinAtual += d.matFinAtual || 0;
        campusMap[d.campus].finDocAtual += d.finDocAtual || 0;
        campusMap[d.campus].matAcadAtual += d.matAcadAtual || 0;
      });
      data = Object.values(campusMap).sort((a, b) => b.matFinAtual - a.matFinAtual);
    } else {
      // Aplicar filtros ao campusSummary
      if (campus && campus !== "todos") {
        data = data.filter(d => d.campus === campus);
      }
      if (regional && regional !== "todos") {
        data = data.filter(d => d.regional === regional);
      }
    }

    // Calcular totais
    const filteredTotais = {
      inscritosMeta: data.reduce((s, d) => s + (d.inscritosMeta || 0), 0),
      matFinMeta: data.reduce((s, d) => s + (d.matFinMeta || 0), 0),
      finDocMeta: data.reduce((s, d) => s + (d.finDocMeta || 0), 0),
      matAcadMeta: data.reduce((s, d) => s + (d.matAcadMeta || 0), 0),
      inscritosAtual: data.reduce((s, d) => s + (d.inscritosAtual || 0), 0),
      matFinAtual: data.reduce((s, d) => s + (d.matFinAtual || 0), 0),
      finDocAtual: data.reduce((s, d) => s + (d.finDocAtual || 0), 0),
      matAcadAtual: data.reduce((s, d) => s + (d.matAcadAtual || 0), 0),
      totalCampus: data.length,
      campusComMeta: data.filter(d => d.matFinMeta > 0).length,
      campusAtingindoMatFin: data.filter(d => d.matFinMeta > 0 && d.matFinAtual >= d.matFinMeta).length,
    };

    // Top/Bottom performers
    const comMeta = data.filter(d => d.matFinMeta > 0);
    
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

    const response = NextResponse.json({
      data,
      filters,
      totais: filteredTotais,
      topPerformers,
      bottomPerformers
    });
    
    // Evitar cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (error) {
    console.error("Erro ao processar dados de meta:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Erro ao processar dados de meta", details: errorMessage },
      { status: 500 }
    );
  }
}
