import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import localCrivoData from "../../../public/crivo-data.json";

interface CrivoData {
  SKU: number;
  UF: string;
  MUNICIPIO: string;
  NOME_CAMPUS: string;
  NOME_CURSO: string;
  TURNO: string;
  MODALIDADE: string;
  INSCRITOS: number;
  MAT_FIN: number;
  FIN_DOC: number;
  PE: number;
  GAP: number;
  MAT_ACAD: number;
  STATUS_ORIGINAL: string;
  STATUS_CURSO: string;
  AREA_CONHECIMENTO: string;
  REGIONAL?: string;
}

interface FilterOptions {
  ufs: string[];
  campus: string[];
  cursos: string[];
  turnos: string[];
}

interface CrivoJsonData {
  data: CrivoData[];
  filters: FilterOptions;
}

// Cache em memória
let cachedData: CrivoJsonData | null = null;
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minuto

async function getData(): Promise<CrivoJsonData> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (cachedData && (now - lastFetch) < CACHE_TTL) {
    return cachedData;
  }

  try {
    // Verificar se existe dados no Blob
    const blobInfo = await head("crivo-data.json");
    
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
    console.log("Usando dados locais (Blob não disponível)");
  }

  // Fallback para dados locais
  return localCrivoData as CrivoJsonData;
}

export async function GET(request: NextRequest) {
  try {
    const loadedData = await getData();
    const { data, filters } = loadedData;
    
    const { searchParams } = new URL(request.url);
    const uf = searchParams.get("uf");
    const campus = searchParams.get("campus");
    const curso = searchParams.get("curso");
    const turno = searchParams.get("turno");
    const getFilters = searchParams.get("getFilters");

    // Retornar apenas filtros se solicitado
    if (getFilters === "true") {
      return NextResponse.json({ filters });
    }

    // Aplicar filtros
    let filteredData = [...data];
    
    if (uf && uf !== "todos") {
      filteredData = filteredData.filter(d => d.UF === uf);
    }
    if (campus && campus !== "todos") {
      filteredData = filteredData.filter(d => d.NOME_CAMPUS === campus);
    }
    if (curso && curso !== "todos") {
      filteredData = filteredData.filter(d => d.NOME_CURSO === curso);
    }
    if (turno && turno !== "todos") {
      filteredData = filteredData.filter(d => d.TURNO === turno);
    }

    // Calcular totais
    const totais = {
      totalInscritos: filteredData.reduce((sum, d) => sum + d.INSCRITOS, 0),
      totalMatFin: filteredData.reduce((sum, d) => sum + d.MAT_FIN, 0),
      totalFinDoc: filteredData.reduce((sum, d) => sum + d.FIN_DOC, 0),
      totalPE: filteredData.reduce((sum, d) => sum + d.PE, 0),
      totalGap: filteredData.reduce((sum, d) => sum + d.GAP, 0),
      totalMatAcad: filteredData.reduce((sum, d) => sum + d.MAT_ACAD, 0),
      totalRegistros: filteredData.length,
      totalConfirmados: filteredData.filter(d => d.STATUS_CURSO === 'CONFIRMADO').length,
      totalStandby: filteredData.filter(d => d.STATUS_CURSO === 'STANDBY').length,
    };

    // Agrupar por UF para gráfico
    const porUF = Object.entries(
      filteredData.reduce((acc, d) => {
        if (!acc[d.UF]) {
          acc[d.UF] = { inscritos: 0, matFin: 0, matAcad: 0 };
        }
        acc[d.UF].inscritos += d.INSCRITOS;
        acc[d.UF].matFin += d.MAT_FIN;
        acc[d.UF].matAcad += d.MAT_ACAD;
        return acc;
      }, {} as Record<string, { inscritos: number; matFin: number; matAcad: number }>)
    ).map(([uf, values]) => ({
      uf,
      ...values
    }));

    // Agrupar por Campus para gráfico
    const porCampus = Object.entries(
      filteredData.reduce((acc, d) => {
        if (!acc[d.NOME_CAMPUS]) {
          acc[d.NOME_CAMPUS] = { inscritos: 0, matFin: 0, matAcad: 0 };
        }
        acc[d.NOME_CAMPUS].inscritos += d.INSCRITOS;
        acc[d.NOME_CAMPUS].matFin += d.MAT_FIN;
        acc[d.NOME_CAMPUS].matAcad += d.MAT_ACAD;
        return acc;
      }, {} as Record<string, { inscritos: number; matFin: number; matAcad: number }>)
    )
      .map(([campus, values]) => ({
        campus,
        ...values
      }))
      .sort((a, b) => b.matFin - a.matFin)
      .slice(0, 10);

    // Agrupar por Curso para gráfico
    const porCurso = Object.entries(
      filteredData.reduce((acc, d) => {
        if (!acc[d.NOME_CURSO]) {
          acc[d.NOME_CURSO] = { inscritos: 0, matFin: 0, matAcad: 0 };
        }
        acc[d.NOME_CURSO].inscritos += d.INSCRITOS;
        acc[d.NOME_CURSO].matFin += d.MAT_FIN;
        acc[d.NOME_CURSO].matAcad += d.MAT_ACAD;
        return acc;
      }, {} as Record<string, { inscritos: number; matFin: number; matAcad: number }>)
    )
      .map(([curso, values]) => ({
        curso,
        ...values
      }))
      .sort((a, b) => b.matFin - a.matFin)
      .slice(0, 10);

    // Agrupar por Turno
    const porTurno = Object.entries(
      filteredData.reduce((acc, d) => {
        if (!acc[d.TURNO]) {
          acc[d.TURNO] = { inscritos: 0, matFin: 0, matAcad: 0 };
        }
        acc[d.TURNO].inscritos += d.INSCRITOS;
        acc[d.TURNO].matFin += d.MAT_FIN;
        acc[d.TURNO].matAcad += d.MAT_ACAD;
        return acc;
      }, {} as Record<string, { inscritos: number; matFin: number; matAcad: number }>)
    ).map(([turno, values]) => ({
      turno,
      ...values
    }));

    return NextResponse.json({
      data: filteredData,
      filters,
      totais,
      porUF,
      porCampus,
      porCurso,
      porTurno
    });

  } catch (error) {
    console.error("Erro ao processar dados:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Erro ao processar dados da planilha", details: errorMessage },
      { status: 500 }
    );
  }
}
