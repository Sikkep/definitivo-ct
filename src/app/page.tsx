'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList, PieChart, Pie, Legend
} from 'recharts'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Users, GraduationCap, MapPin, TrendingUp, Target,
  AlertTriangle, CheckCircle, UserCheck,
  DollarSign, BookOpen, Search, Upload, RefreshCw, Lock, Settings,
  AlertCircle, TrendingDown
} from 'lucide-react'

// ====== TYPES ======
interface FilterOptions {
  ufs: string[]
  campus: string[]
  cursos: string[]
  turnos: string[]
}

interface CrivoData {
  SKU: number
  UF: string
  MUNICIPIO: string
  NOME_CAMPUS: string
  NOME_CURSO: string
  TURNO: string
  MODALIDADE: string
  INSCRITOS: number
  MAT_FIN: number
  FIN_DOC: number
  PE: number
  GAP: number
  MAT_ACAD: number
  STATUS_ORIGINAL: string
  STATUS_CURSO: string
  AREA_CONHECIMENTO: string
  REGIONAL: string
}

interface Totais {
  totalInscritos: number
  totalMatFin: number
  totalFinDoc: number
  totalPE: number
  totalGap: number
  totalMatAcad: number
  totalRegistros: number
  totalConfirmados: number
  totalStandby: number
}

interface DashboardData {
  data: CrivoData[]
  filters: FilterOptions
  totais: Totais
  porUF: Array<{ uf: string; inscritos: number; matFin: number; matAcad: number }>
  porCampus: Array<{ campus: string; inscritos: number; matFin: number; matAcad: number }>
  porCurso: Array<{ curso: string; inscritos: number; matFin: number; matAcad: number }>
  porTurno: Array<{ turno: string; inscritos: number; matFin: number; matAcad: number }>
}

interface CampusSummaryMeta {
  campus: string
  regional: string
  inscritosMeta: number
  matFinMeta: number
  finDocMeta: number
  matAcadMeta: number
  inscritosAtual: number
  matFinAtual: number
  finDocAtual: number
  matAcadAtual: number
  percInscritos?: number
  percMatFin?: number
  percFinDoc?: number
  percMatAcad?: number
}

interface MetaTotais {
  inscritosMeta: number
  matFinMeta: number
  finDocMeta: number
  matAcadMeta: number
  inscritosAtual: number
  matFinAtual: number
  finDocAtual: number
  matAcadAtual: number
  totalCampus: number
  campusComMeta: number
  campusAtingindoMatFin: number
}

interface MetaData {
  data: CampusSummaryMeta[]
  filters: {
    campuses: string[]
    cursos: string[]
    turnos: string[]
    regionais: string[]
  }
  totais: MetaTotais
  topPerformers: CampusSummaryMeta[]
  bottomPerformers: CampusSummaryMeta[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B']

// PE padrão por curso
const PE_POR_CURSO: Record<string, number> = {
  'ADMINISTRAÇÃO': 10,
  'ENFERMAGEM': 12,
  'AUTOMAÇÃO INDUSTRIAL': 12,
  'SEGURANÇA DO TRABALHO': 14,
  'RECURSOS HUMANOS': 11,
  'LOGÍSTICA': 10,
  'MARKETING': 10,
  'GESTÃO FINANCEIRA': 10,
  'ANÁLISE E DESENVOLVIMENTO DE SISTEMAS': 10,
  'REDES DE COMPUTADORES': 10,
  'MEIO AMBIENTE': 10,
  'GESTÃO DA PRODUÇÃO INDUSTRIAL': 10,
  'GESTÃO DE VAREJO': 10,
  'GESTÃO COMERCIAL': 10,
  'GESTÃO DE QUALIDADE': 10,
  'ESTÉTICA': 10,
  'ESTÉTICA E COSMÉTICA': 10,
  'FARMÁCIA': 10,
  'RADIOLOGIA': 10,
  'GESTÃO HOSPITALAR': 10,
  'EVENTOS': 10,
  'GASTRONOMIA': 10,
  'PROCESSOS GERENCIAIS': 10,
}

const abbreviateCampusName = (name: string): string => {
  return name
    .replace(/ESCOLA ESTÁCIO/gi, 'E. ESTÁCIO')
    .replace(/ESCOLA/gi, 'E.')
    .replace(/FACULDADE/gi, 'FAC.')
    .replace(/CENTRO UNIVERSITÁRIO/gi, 'CENTRO UNIV.')
    .replace(/UNIVERSIDADE/gi, 'UNIV.')
}

// ====== COMPONENTE PRINCIPAL ======
export default function Home() {
  const [activeTab, setActiveTab] = useState('visao-geral')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metaData, setMetaData] = useState<MetaData | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  
  const [ufSelecionado, setUfSelecionado] = useState('todos')
  const [campusSelecionado, setCampusSelecionado] = useState('todos')
  const [cursoSelecionado, setCursoSelecionado] = useState('todos')
  const [turnoSelecionado, setTurnoSelecionado] = useState('todos')
  
  const [metaCampusSelecionado, setMetaCampusSelecionado] = useState('todos')
  const [metaCursoSelecionado, setMetaCursoSelecionado] = useState('todos')
  const [metaTurnoSelecionado, setMetaTurnoSelecionado] = useState('todos')
  const [metaRegionalSelecionado, setMetaRegionalSelecionado] = useState('todos')
  
  const [searchCampus, setSearchCampus] = useState('')
  const [searchDetalhamento, setSearchDetalhamento] = useState('')
  const [searchPertoConfirmar, setSearchPertoConfirmar] = useState('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: boolean; message: string; stats?: any} | null>(null)

  // ====== FETCH VISÃO GERAL ======
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const localData = localStorage.getItem('crivo-data')
      if (localData) {
        console.log('Usando dados do localStorage')
        const parsedData = JSON.parse(localData)
        
        let filteredData = [...parsedData.data]
        if (ufSelecionado !== 'todos') filteredData = filteredData.filter((d: any) => d.UF === ufSelecionado)
        if (campusSelecionado !== 'todos') filteredData = filteredData.filter((d: any) => d.NOME_CAMPUS === campusSelecionado)
        if (cursoSelecionado !== 'todos') filteredData = filteredData.filter((d: any) => d.NOME_CURSO === cursoSelecionado)
        if (turnoSelecionado !== 'todos') filteredData = filteredData.filter((d: any) => d.TURNO === turnoSelecionado)

        const totais = {
          totalInscritos: filteredData.reduce((sum: number, d: any) => sum + d.INSCRITOS, 0),
          totalMatFin: filteredData.reduce((sum: number, d: any) => sum + d.MAT_FIN, 0),
          totalFinDoc: filteredData.reduce((sum: number, d: any) => sum + d.FIN_DOC, 0),
          totalPE: filteredData.reduce((sum: number, d: any) => sum + d.PE, 0),
          totalGap: filteredData.reduce((sum: number, d: any) => sum + d.GAP, 0),
          totalMatAcad: filteredData.reduce((sum: number, d: any) => sum + d.MAT_ACAD, 0),
          totalRegistros: filteredData.length,
          totalConfirmados: filteredData.filter((d: any) => d.FIN_DOC >= d.PE).length,
          totalStandby: filteredData.filter((d: any) => d.FIN_DOC < d.PE).length,
        }

        const porUF = Object.entries(
          filteredData.reduce((acc: any, d: any) => {
            if (!acc[d.UF]) acc[d.UF] = { inscritos: 0, matFin: 0, matAcad: 0 }
            acc[d.UF].inscritos += d.INSCRITOS
            acc[d.UF].matFin += d.MAT_FIN
            acc[d.UF].matAcad += d.MAT_ACAD
            return acc
          }, {})
        ).map(([uf, values]: [string, any]) => ({ uf, ...values }))

        const porCampus = Object.entries(
          filteredData.reduce((acc: any, d: any) => {
            if (!acc[d.NOME_CAMPUS]) acc[d.NOME_CAMPUS] = { inscritos: 0, matFin: 0, matAcad: 0 }
            acc[d.NOME_CAMPUS].inscritos += d.INSCRITOS
            acc[d.NOME_CAMPUS].matFin += d.MAT_FIN
            acc[d.NOME_CAMPUS].matAcad += d.MAT_ACAD
            return acc
          }, {})
        ).map(([campus, values]: [string, any]) => ({ campus, ...values }))
          .sort((a: any, b: any) => b.matFin - a.matFin)
          .slice(0, 10)

        const porCurso = Object.entries(
          filteredData.reduce((acc: any, d: any) => {
            if (!acc[d.NOME_CURSO]) acc[d.NOME_CURSO] = { inscritos: 0, matFin: 0, matAcad: 0 }
            acc[d.NOME_CURSO].inscritos += d.INSCRITOS
            acc[d.NOME_CURSO].matFin += d.MAT_FIN
            acc[d.NOME_CURSO].matAcad += d.MAT_ACAD
            return acc
          }, {})
        ).map(([curso, values]: [string, any]) => ({ curso, ...values }))
          .sort((a: any, b: any) => b.matFin - a.matFin)
          .slice(0, 10)

        const porTurno = Object.entries(
          filteredData.reduce((acc: any, d: any) => {
            if (!acc[d.TURNO]) acc[d.TURNO] = { inscritos: 0, matFin: 0, matAcad: 0 }
            acc[d.TURNO].inscritos += d.INSCRITOS
            acc[d.TURNO].matFin += d.MAT_FIN
            acc[d.TURNO].matAcad += d.MAT_ACAD
            return acc
          }, {})
        ).map(([turno, values]: [string, any]) => ({ turno, ...values }))

        setData({
          data: filteredData,
          filters: parsedData.filters,
          totais,
          porUF,
          porCampus,
          porCurso,
          porTurno
        })
        setLoading(false)
        return
      }

      console.log('Carregando dados da API...')
      const params = new URLSearchParams()
      if (ufSelecionado !== 'todos') params.append('uf', ufSelecionado)
      if (campusSelecionado !== 'todos') params.append('campus', campusSelecionado)
      if (cursoSelecionado !== 'todos') params.append('curso', cursoSelecionado)
      if (turnoSelecionado !== 'todos') params.append('turno', turnoSelecionado)

      const response = await fetch(`/api?${params.toString()}`)
      if (!response.ok) throw new Error('Erro ao carregar dados')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [ufSelecionado, campusSelecionado, cursoSelecionado, turnoSelecionado])

  // ====== FETCH VISÃO META ======
  const fetchMetaData = useCallback(async () => {
    setMetaLoading(true)
    try {
      const localData = localStorage.getItem('cap-meta-data')
      console.log('=== META DATA DEBUG ===')
      console.log('localStorage cap-meta-data:', localData ? 'existe' : 'não existe')
      
      if (localData) {
        console.log('Usando meta do localStorage')
        const parsedData = JSON.parse(localData)
        console.log('parsedData keys:', Object.keys(parsedData))
        console.log('parsedData.data length:', parsedData.data?.length)
        console.log('parsedData.totais:', parsedData.totais)
        
        // Usar os dados diretamente ou do campo data
        let rawData = parsedData.data || []
        console.log('rawData length:', rawData.length)
        
        let filteredData = [...rawData]
        if (metaCampusSelecionado !== 'todos') filteredData = filteredData.filter(d => d.campus === metaCampusSelecionado)
        if (metaRegionalSelecionado !== 'todos') filteredData = filteredData.filter(d => d.regional === metaRegionalSelecionado)

        const filteredTotais = {
          inscritosMeta: filteredData.reduce((s: number, d: any) => s + (d.inscritosMeta || 0), 0),
          matFinMeta: filteredData.reduce((s: number, d: any) => s + (d.matFinMeta || 0), 0),
          finDocMeta: filteredData.reduce((s: number, d: any) => s + (d.finDocMeta || 0), 0),
          matAcadMeta: filteredData.reduce((s: number, d: any) => s + (d.matAcadMeta || 0), 0),
          inscritosAtual: filteredData.reduce((s: number, d: any) => s + (d.inscritosAtual || 0), 0),
          matFinAtual: filteredData.reduce((s: number, d: any) => s + (d.matFinAtual || 0), 0),
          finDocAtual: filteredData.reduce((s: number, d: any) => s + (d.finDocAtual || 0), 0),
          matAcadAtual: filteredData.reduce((s: number, d: any) => s + (d.matAcadAtual || 0), 0),
          totalCampus: filteredData.length,
          campusComMeta: filteredData.filter((d: any) => d.matFinMeta > 0).length,
          campusAtingindoMatFin: filteredData.filter((d: any) => d.matFinMeta > 0 && d.matFinAtual >= d.matFinMeta).length,
        }
        
        console.log('filteredTotais:', filteredTotais)

        const comMeta = filteredData.filter((d: any) => d.matFinMeta > 0)
        
        const topPerformers = comMeta
          .map((d: any) => ({ ...d, percMatFin: d.matFinMeta > 0 ? (d.matFinAtual / d.matFinMeta) * 100 : 0 }))
          .sort((a: any, b: any) => b.percMatFin - a.percMatFin)
          .slice(0, 10)

        const bottomPerformers = comMeta
          .map((d: any) => ({ ...d, percMatFin: d.matFinMeta > 0 ? (d.matFinAtual / d.matFinMeta) * 100 : 0 }))
          .sort((a: any, b: any) => a.percMatFin - b.percMatFin)
          .slice(0, 10)

        setMetaData({
          data: filteredData,
          filters: parsedData.filters,
          totais: filteredTotais,
          topPerformers,
          bottomPerformers
        })
        setMetaLoading(false)
        return
      }

      console.log('Carregando meta da API...')
      const params = new URLSearchParams()
      params.append('view', 'summary')
      if (metaCampusSelecionado !== 'todos') params.append('campus', metaCampusSelecionado)
      if (metaCursoSelecionado !== 'todos') params.append('curso', metaCursoSelecionado)
      if (metaTurnoSelecionado !== 'todos') params.append('turno', metaTurnoSelecionado)
      if (metaRegionalSelecionado !== 'todos') params.append('regional', metaRegionalSelecionado)

      const response = await fetch(`/api/meta?${params.toString()}`)
      if (!response.ok) throw new Error('Erro ao carregar dados de meta')
      const result = await response.json()
      setMetaData(result)
    } catch (err) {
      console.error('Erro meta:', err)
    } finally {
      setMetaLoading(false)
    }
  }, [metaCampusSelecionado, metaCursoSelecionado, metaTurnoSelecionado, metaRegionalSelecionado])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeTab === 'meta') {
      fetchMetaData()
    }
  }, [activeTab, fetchMetaData])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num))
  }

  const formatPercent = (num: number) => {
    return num.toFixed(1) + '%'
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'crivo2026') {
      setIsAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Senha incorreta')
    }
  }

  // ====== PROCESSAR ARQUIVOS ======
  const processFiles = async (files: FileList) => {
    const XLSX = await import('xlsx')
    
    let portfolioData: any[] = []
    let capData: any[] = []
    let metaPorSku: Map<number, {inscritosMeta: number, matFinMeta: number, finDocMeta: number, matAcadMeta: number}> = new Map()
    const processedFiles: string[] = []

    const parseNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0
      const str = String(val).replace(/"/g, '').replace(',', '.').trim()
      const num = parseFloat(str)
      return isNaN(num) ? 0 : num
    }

    const getIntPart = (val: any): string => {
      if (val === undefined || val === null || val === '') return ''
      const str = String(val).replace(/"/g, '').trim()
      return str.split(/[,.]/)[0] || ''
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      processedFiles.push(file.name)
      const isCSV = file.name.toLowerCase().endsWith('.csv')
      
      if (isCSV) {
        // === PROCESSAR CAP CSV ===
        const arrayBuffer = await file.arrayBuffer()
        const text = new TextDecoder('iso-8859-1').decode(arrayBuffer)
        const lines = text.split('\n').filter(l => l.trim())
        
        const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim())
        const idx = {
          periodo: headers.indexOf('PERIODO_ACADEMICO'),
          campus: headers.indexOf('COD_CAMPUS'),
          curso: headers.indexOf('COD_CURSO'),
          turno: headers.indexOf('COD_TURNO'),
          nomeCampus: headers.indexOf('NOM_CAMPUS'),
          regional: headers.indexOf('NOM_REGIONAL'),
          inscritos: headers.indexOf('INSCRITOS_ATUAL'),
          matFin: headers.indexOf('MAT_FIN_ATUAL'),
          finDoc: headers.indexOf('FIN_DOC_ATUAL'),
          matAcad: headers.indexOf('MAT_ACAD_ATUAL'),
          inscritosMeta: headers.indexOf('INSCRITOS_META'),
          matFinMeta: headers.indexOf('MAT_FIN_META'),
          finDocMeta: headers.indexOf('FIN_DOC_META'),
          matAcadMeta: headers.indexOf('MAT_ACAD_META'),
          desistente: headers.indexOf('F_DESISTENTE'),
        }
        
        console.log('=== CAP CSV Headers ===', headers.slice(0, 15))
        console.log('=== Índices ===', idx)
        
        for (let j = 1; j < lines.length; j++) {
          const line = lines[j]
          if (!line.trim()) continue
          
          const values: string[] = []
          let current = '', inQuotes = false
          for (const char of line) {
            if (char === '"') inQuotes = !inQuotes
            else if (char === ';' && !inQuotes) { values.push(current.trim()); current = '' }
            else current += char
          }
          values.push(current.trim())
          
          const periodo = values[idx.periodo]?.replace(/"/g, '').trim() || ''
          if (!periodo.includes('2026.1')) continue
          
          const flagDesistente = values[idx.desistente]?.replace(/"/g, '').trim() || '0'
          if (!['0', '0,000000', ''].includes(flagDesistente)) continue
          
          const codCampus = getIntPart(values[idx.campus])
          const codCurso = getIntPart(values[idx.curso])
          const codTurno = getIntPart(values[idx.turno])
          const sku = parseInt(`${codCampus}${codCurso}${codTurno}`, 10)
          
          if (!sku || isNaN(sku)) continue
          
          const nomeCampus = values[idx.nomeCampus]?.replace(/"/g, '').trim() || ''
          const regional = values[idx.regional]?.replace(/"/g, '').trim() || ''
          
          capData.push({
            SKU: sku,
            NOME_CAMPUS: nomeCampus,
            REGIONAL: regional,
            INSCRITOS: parseNum(values[idx.inscritos]),
            MAT_FIN: parseNum(values[idx.matFin]),
            FIN_DOC: parseNum(values[idx.finDoc]),
            MAT_ACAD: parseNum(values[idx.matAcad]),
          })
          
          // Ler metas do CSV
          const inscritosMeta = parseNum(values[idx.inscritosMeta])
          const matFinMeta = parseNum(values[idx.matFinMeta])
          const finDocMeta = parseNum(values[idx.finDocMeta])
          const matAcadMeta = parseNum(values[idx.matAcadMeta])
          
          if (inscritosMeta > 0 || matFinMeta > 0 || finDocMeta > 0 || matAcadMeta > 0) {
            if (!metaPorSku.has(sku)) {
              metaPorSku.set(sku, { inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0 })
            }
            const entry = metaPorSku.get(sku)!
            entry.inscritosMeta += inscritosMeta
            entry.matFinMeta += matFinMeta
            entry.finDocMeta += finDocMeta
            entry.matAcadMeta += matAcadMeta
          }
        }
        console.log(`CAP CSV: ${capData.length} linhas, Metas: ${metaPorSku.size} SKUs`)
        
      } else {
        // === PROCESSAR EXCEL ===
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Portfolio (Sheet1)
        const portfolioSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('sheet') || name.toLowerCase().includes('portfolio')
        )
        
        if (portfolioSheet) {
          const sheet = workbook.Sheets[portfolioSheet]
          const data = XLSX.utils.sheet_to_json(sheet) as any[]
          
          data.forEach(row => {
            const sku = parseInt(String(row.SKU || 0), 10)
            if (!sku || isNaN(sku)) return
            
            portfolioData.push({
              SKU: sku,
              REGIONAL: String(row.REGIONAL || ''),
              UF: String(row.UF || ''),
              MUNICIPIO: String(row['NOME MUNICIPIO'] || ''),
              NOME_CAMPUS: String(row['NOME CAMPUS'] || ''),
              NOME_CURSO: String(row['NOME CURSO'] || ''),
              TURNO: String(row.TURNO || ''),
              MODALIDADE: String(row['MODELO DE ENSINO'] || 'PRESENCIAL'),
              AREA_CONHECIMENTO: String(row['AREA DO CONHECIMENTO'] || ''),
            })
          })
          console.log(`Portfolio: ${portfolioData.length} SKUs`)
        }
        
        // CAP Excel (aba CAP_CT)
        const capSheet = workbook.SheetNames.find(name => name.toUpperCase().includes('CAP'))
        if (capSheet) {
          const sheet = workbook.Sheets[capSheet]
          const data = XLSX.utils.sheet_to_json(sheet) as any[]
          
          data.forEach(row => {
            const periodo = String(row.PERIODO_ACADEMICO || '')
            if (!periodo.includes('2026.1')) return
            
            const flagDesistente = String(row.F_DESISTENTE || '0')
            if (!['0', '0,000000', '', '0.0'].includes(flagDesistente)) return
            
            const codCampus = getIntPart(row.COD_CAMPUS)
            const codCurso = getIntPart(row.COD_CURSO)
            const codTurno = getIntPart(row.COD_TURNO)
            const sku = parseInt(`${codCampus}${codCurso}${codTurno}`, 10)
            
            if (!sku || isNaN(sku)) return
            
            capData.push({
              SKU: sku,
              INSCRITOS: parseNum(row.INSCRITOS_ATUAL),
              MAT_FIN: parseNum(row.MAT_FIN_ATUAL),
              FIN_DOC: parseNum(row.FIN_DOC_ATUAL),
              MAT_ACAD: parseNum(row.MAT_ACAD_ATUAL),
            })
            
            // Ler metas
            const inscritosMeta = parseNum(row.INSCRITOS_META)
            const matFinMeta = parseNum(row.MAT_FIN_META)
            const finDocMeta = parseNum(row.FIN_DOC_META)
            const matAcadMeta = parseNum(row.MAT_ACAD_META)
            
            if (inscritosMeta > 0 || matFinMeta > 0 || finDocMeta > 0 || matAcadMeta > 0) {
              if (!metaPorSku.has(sku)) {
                metaPorSku.set(sku, { inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0 })
              }
              const entry = metaPorSku.get(sku)!
              entry.inscritosMeta += inscritosMeta
              entry.matFinMeta += matFinMeta
              entry.finDocMeta += finDocMeta
              entry.matAcadMeta += matAcadMeta
            }
          })
          console.log(`CAP Excel: ${capData.length} linhas, Metas: ${metaPorSku.size} SKUs`)
        }
      }
    }

    console.log('=== RESUMO ===')
    console.log('Portfolio:', portfolioData.length)
    console.log('CAP:', capData.length)

    // Se não há portfolio, usar dados existentes
    if (portfolioData.length === 0) {
      const existingData = localStorage.getItem('crivo-data')
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData)
          if (parsed.data?.length > 0) {
            portfolioData = parsed.data.map((d: any) => ({
              SKU: parseInt(String(d.SKU), 10),
              REGIONAL: d.REGIONAL || '',
              UF: d.UF || '',
              MUNICIPIO: d.MUNICIPIO || '',
              NOME_CAMPUS: d.NOME_CAMPUS || '',
              NOME_CURSO: d.NOME_CURSO || '',
              TURNO: d.TURNO || '',
              MODALIDADE: d.MODALIDADE || 'PRESENCIAL',
              AREA_CONHECIMENTO: d.AREA_CONHECIMENTO || '',
            }))
            console.log(`Usando ${portfolioData.length} SKUs do localStorage`)
          }
        } catch (e) {
          console.log('Erro ao carregar dados existentes:', e)
        }
      } else {
        // Buscar da API
        try {
          const response = await fetch('/api')
          if (response.ok) {
            const apiData = await response.json()
            if (apiData.data?.length > 0) {
              portfolioData = apiData.data.map((d: any) => ({
                SKU: parseInt(String(d.SKU), 10),
                REGIONAL: d.REGIONAL || '',
                UF: d.UF || '',
                MUNICIPIO: d.MUNICIPIO || '',
                NOME_CAMPUS: d.NOME_CAMPUS || '',
                NOME_CURSO: d.NOME_CURSO || '',
                TURNO: d.TURNO || '',
                MODALIDADE: d.MODALIDADE || 'PRESENCIAL',
                AREA_CONHECIMENTO: d.AREA_CONHECIMENTO || '',
              }))
              console.log(`Usando ${portfolioData.length} SKUs da API`)
            }
          }
        } catch (e) {
          console.log('Erro ao carregar dados da API:', e)
        }
      }
    }

    // Agrupar CAP por SKU
    const capMap = new Map<number, { INSCRITOS: number; MAT_FIN: number; FIN_DOC: number; MAT_ACAD: number }>()
    capData.forEach(row => {
      if (!capMap.has(row.SKU)) {
        capMap.set(row.SKU, { INSCRITOS: 0, MAT_FIN: 0, FIN_DOC: 0, MAT_ACAD: 0 })
      }
      const entry = capMap.get(row.SKU)!
      entry.INSCRITOS += row.INSCRITOS || 0
      entry.MAT_FIN += row.MAT_FIN || 0
      entry.FIN_DOC += row.FIN_DOC || 0
      entry.MAT_ACAD += row.MAT_ACAD || 0
    })

    // Totais CAP
    let totaisCap = { inscritos: 0, matFin: 0, finDoc: 0, matAcad: 0 }
    capMap.forEach(v => {
      totaisCap.inscritos += v.INSCRITOS
      totaisCap.matFin += v.MAT_FIN
      totaisCap.finDoc += v.FIN_DOC
      totaisCap.matAcad += v.MAT_ACAD
    })
    console.log('=== TOTAIS CAP ===')
    console.log(`Inscritos: ${totaisCap.inscritos} | Mat Fin: ${totaisCap.matFin} | Fin Doc: ${totaisCap.finDoc}`)
    console.log(`SKUs CAP: ${capMap.size}`)

    // Processar dados finais
    const processedData = portfolioData.map(row => {
      const capInfo = capMap.get(row.SKU) || { INSCRITOS: 0, MAT_FIN: 0, FIN_DOC: 0, MAT_ACAD: 0 }
      const pe = PE_POR_CURSO[row.NOME_CURSO] || 10
      const finDoc = capInfo.FIN_DOC
      
      return {
        SKU: row.SKU,
        UF: row.UF,
        MUNICIPIO: row.MUNICIPIO,
        NOME_CAMPUS: row.NOME_CAMPUS,
        NOME_CURSO: row.NOME_CURSO,
        TURNO: row.TURNO,
        MODALIDADE: row.MODALIDADE,
        INSCRITOS: capInfo.INSCRITOS,
        MAT_FIN: capInfo.MAT_FIN,
        FIN_DOC: finDoc,
        PE: pe,
        GAP: finDoc - pe,
        MAT_ACAD: capInfo.MAT_ACAD,
        STATUS_ORIGINAL: '',
        STATUS_CURSO: finDoc >= pe ? 'CONFIRMADO' : 'STANDBY',
        AREA_CONHECIMENTO: row.AREA_CONHECIMENTO,
        REGIONAL: row.REGIONAL,
      }
    })

    const matchedSkus = processedData.filter(d => d.INSCRITOS > 0 || d.MAT_FIN > 0).length
    const confirmados = processedData.filter(d => d.FIN_DOC >= d.PE).length
    console.log('=== RESULTADO FINAL ===')
    console.log(`SKUs com dados: ${matchedSkus} de ${processedData.length}`)
    console.log(`Confirmados: ${confirmados}`)

    const filters = {
      ufs: [...new Set(processedData.map(d => d.UF).filter(Boolean))].sort(),
      campus: [...new Set(processedData.map(d => d.NOME_CAMPUS).filter(Boolean))].sort(),
      cursos: [...new Set(processedData.map(d => d.NOME_CURSO).filter(Boolean))].sort(),
      turnos: [...new Set(processedData.map(d => d.TURNO).filter(Boolean))].sort(),
    }

    // Metas por campus
    const campusMap = new Map<string, any>()
    capData.forEach(row => {
      // Usar dados do capData (CSV tem NOME_CAMPUS e REGIONAL) ou fallback para portfolioData
      const campus = row.NOME_CAMPUS || portfolioData.find(p => p.SKU === row.SKU)?.NOME_CAMPUS || ''
      if (!campus) return
      
      const regional = row.REGIONAL || portfolioData.find(p => p.SKU === row.SKU)?.REGIONAL || ''
      
      if (!campusMap.has(campus)) {
        campusMap.set(campus, { 
          campus, 
          regional: regional, 
          inscritosAtual: 0, matFinAtual: 0, finDocAtual: 0, matAcadAtual: 0,
          inscritosMeta: 0, matFinMeta: 0, finDocMeta: 0, matAcadMeta: 0
        })
      }
      const entry = campusMap.get(campus)!
      entry.inscritosAtual += row.INSCRITOS || 0
      entry.matFinAtual += row.MAT_FIN || 0
      entry.finDocAtual += row.FIN_DOC || 0
      entry.matAcadAtual += row.MAT_ACAD || 0
      
      // Adicionar metas se existirem
      const metaSku = metaPorSku.get(row.SKU)
      if (metaSku) {
        entry.inscritosMeta += metaSku.inscritosMeta
        entry.matFinMeta += metaSku.matFinMeta
        entry.finDocMeta += metaSku.finDocMeta
        entry.matAcadMeta += metaSku.matAcadMeta
      }
    })

    const metaData = Array.from(campusMap.values())
    const metaTotais = {
      inscritosMeta: metaData.reduce((s, d) => s + d.inscritosMeta, 0),
      matFinMeta: metaData.reduce((s, d) => s + d.matFinMeta, 0),
      finDocMeta: metaData.reduce((s, d) => s + d.finDocMeta, 0),
      matAcadMeta: metaData.reduce((s, d) => s + d.matAcadMeta, 0),
      inscritosAtual: metaData.reduce((s, d) => s + d.inscritosAtual, 0),
      matFinAtual: metaData.reduce((s, d) => s + d.matFinAtual, 0),
      finDocAtual: metaData.reduce((s, d) => s + d.finDocAtual, 0),
      matAcadAtual: metaData.reduce((s, d) => s + d.matAcadAtual, 0),
      totalCampus: metaData.length,
      campusComMeta: metaData.filter(d => d.matFinMeta > 0).length,
      campusAtingindoMatFin: metaData.filter(d => d.matFinMeta > 0 && d.matFinAtual >= d.matFinMeta).length,
    }

    return {
      crivoData: { data: processedData, filters },
      metaData: { data: metaData, filters: { campuses: filters.campus, cursos: filters.cursos, turnos: filters.turnos, regionais: [...new Set(metaData.map(d => d.regional))].sort() }, totais: metaTotais },
      files: processedFiles,
      totais: { inscritos: totaisCap.inscritos, matFin: totaisCap.matFin, finDoc: totaisCap.finDoc, confirmados }
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadResult(null)

    try {
      setUploadResult({ success: false, message: 'Processando arquivo...' })

      const result = await processFiles(files)
      
      localStorage.removeItem('crivo-data')
      localStorage.removeItem('cap-meta-data')
      localStorage.setItem('crivo-data', JSON.stringify(result.crivoData))
      localStorage.setItem('cap-meta-data', JSON.stringify(result.metaData))
      localStorage.setItem('data-timestamp', new Date().toISOString())
      
      setUploadResult({
        success: true,
        message: `Processado! Inscritos: ${result.totais.inscritos}, Mat Fin: ${result.totais.matFin}, Fin Doc: ${result.totais.finDoc}, Confirmados: ${result.totais.confirmados}`,
        stats: result
      })
      
      setTimeout(() => window.location.reload(), 2000)

    } catch (error: any) {
      console.error('Erro:', error)
      setUploadResult({ success: false, message: error.message || 'Erro ao processar' })
    } finally {
      setUploading(false)
    }
  }
  
  const handleClearData = () => {
    localStorage.removeItem('crivo-data')
    localStorage.removeItem('cap-meta-data')
    localStorage.removeItem('data-timestamp')
    window.location.reload()
  }

  const filteredCampusData = metaData?.data?.filter(d => {
    if (!searchCampus) return true
    const searchLower = searchCampus.toLowerCase()
    return d.campus.toLowerCase().includes(searchLower) || d.regional.toLowerCase().includes(searchLower)
  }) || []
  
  const filteredDetalhamentoData = data?.data?.filter(d => {
    if (!searchDetalhamento) return true
    const searchLower = searchDetalhamento.toLowerCase()
    return d.NOME_CAMPUS.toLowerCase().includes(searchLower) || d.NOME_CURSO.toLowerCase().includes(searchLower) || d.UF.toLowerCase().includes(searchLower) || d.TURNO.toLowerCase().includes(searchLower)
  }) || []

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Erro</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#164bc8] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo-estacio.png" alt="Logo Estácio" width={60} height={60} className="object-contain rounded" />
              <div>
                <h1 className="text-2xl font-bold">Acompanhamento de Turmas - Curso Técnico Estácio 2026.1</h1>
                <p className="text-blue-200 text-sm">Controle de Captação - Visão Geral e Metas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-blue-300">©Daniel Villa</span>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" onClick={() => setModalOpen(true)} title="Configurações">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Visão Geral</TabsTrigger>
            <TabsTrigger value="meta" className="flex items-center gap-2"><Target className="w-4 h-4" />Meta vs Real</TabsTrigger>
            <TabsTrigger value="perto-confirmar" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Perto de Confirmar</TabsTrigger>
            <TabsTrigger value="gap-enturmacao" className="flex items-center gap-2"><TrendingDown className="w-4 h-4" />Gap de Enturmação</TabsTrigger>
          </TabsList>

          {/* ====== ABA VISÃO GERAL ====== */}
          <TabsContent value="visao-geral" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">UF</label>
                    <Select value={ufSelecionado} onValueChange={setUfSelecionado}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione UF" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as UFs</SelectItem>
                        {data?.filters?.ufs?.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Campus</label>
                    <Select value={campusSelecionado} onValueChange={setCampusSelecionado}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Campus" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="todos">Todos os Campus</SelectItem>
                        {data?.filters?.campus?.map(campus => <SelectItem key={campus} value={campus}>{campus}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Curso</label>
                    <Select value={cursoSelecionado} onValueChange={setCursoSelecionado}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Curso" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="todos">Todos os Cursos</SelectItem>
                        {data?.filters?.cursos?.map(curso => <SelectItem key={curso} value={curso}>{curso}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Turno</label>
                    <Select value={turnoSelecionado} onValueChange={setTurnoSelecionado}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Turno" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Turnos</SelectItem>
                        {data?.filters?.turnos?.map(turno => <SelectItem key={turno} value={turno}>{turno}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Inscritos</p>
                      <p className="text-2xl font-bold">{formatNumber(data?.totais?.totalInscritos || 0)}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Mat. Financeira</p>
                      <p className="text-2xl font-bold">{formatNumber(data?.totais?.totalMatFin || 0)}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Fin + Doc</p>
                      <p className="text-2xl font-bold">{formatNumber(data?.totais?.totalFinDoc || 0)}</p>
                    </div>
                    <UserCheck className="w-10 h-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">Mat. Acadêmica</p>
                      <p className="text-2xl font-bold">{formatNumber(data?.totais?.totalMatAcad || 0)}</p>
                    </div>
                    <BookOpen className="w-10 h-10 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-200 text-sm">Cursos Ofertados</p>
                      <p className="text-2xl font-bold">{data?.totais?.totalRegistros || 0}</p>
                    </div>
                    <GraduationCap className="w-10 h-10 text-slate-300" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Confirmados</p>
                      <p className="text-2xl font-bold">{data?.totais?.totalConfirmados || 0}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Faltam Confirmar</p>
                      <p className="text-2xl font-bold">{data?.totais?.totalStandby || 0}</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {(data?.totais?.totalRegistros || 0) > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Taxa de Confirmação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <PieChart width={350} height={300}>
                      <Pie
                        data={[
                          { name: 'Confirmados', value: data?.totais?.totalConfirmados || 0, fill: '#22c55e' },
                          { name: 'Faltam Confirmar', value: data?.totais?.totalStandby || 0, fill: '#f59e0b' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      />
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                      <Legend />
                    </PieChart>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-green-600 font-semibold">{formatNumber(data?.totais?.totalConfirmados || 0)}</span>
                    <span className="text-slate-500 mx-2">de</span>
                    <span className="text-slate-700 font-semibold">{formatNumber(data?.totais?.totalRegistros || 0)}</span>
                    <span className="text-slate-500 ml-1">turmas confirmadas</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Campus por Mat. Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {(data?.porCampus?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.porCampus || []} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                        <YAxis type="category" dataKey="campus" tick={{ fontSize: 10 }} width={95} tickFormatter={(v) => abbreviateCampusName(v)} />
                        <Tooltip formatter={(value: number) => formatNumber(value)} />
                        <Legend />
                        <Bar dataKey="matFin" name="Mat. Fin." fill="#3b82f6">
                          {data?.porCampus?.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">Sem dados para exibir</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Cursos por Mat. Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {(data?.porCurso?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.porCurso || []} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                        <YAxis type="category" dataKey="curso" tick={{ fontSize: 10 }} width={115} />
                        <Tooltip formatter={(value: number) => formatNumber(value)} />
                        <Legend />
                        <Bar dataKey="matFin" name="Mat. Fin." fill="#10b981">
                          {data?.porCurso?.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">Sem dados para exibir</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ABA META ====== */}
          <TabsContent value="meta" className="space-y-6">
            {metaLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
              <>
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Campus</label>
                        <Select value={metaCampusSelecionado} onValueChange={setMetaCampusSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="todos">Todos</SelectItem>
                            {metaData?.filters?.campuses?.map(campus => <SelectItem key={campus} value={campus}>{campus}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Regional</label>
                        <Select value={metaRegionalSelecionado} onValueChange={setMetaRegionalSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todas</SelectItem>
                            {metaData?.filters?.regionais?.map(regional => <SelectItem key={regional} value={regional}>{regional}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <CardTitle className="text-lg">Resumo por Campus</CardTitle>
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input placeholder="Buscar campus..." value={searchCampus} onChange={(e) => setSearchCampus(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resumo Total */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium">Meta Mat. Fin.</p>
                        <p className="text-xl font-bold text-blue-700">{formatNumber(metaData?.totais?.matFinMeta || 0)}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">Atual Mat. Fin.</p>
                        <p className="text-xl font-bold text-green-700">{formatNumber(metaData?.totais?.matFinAtual || 0)}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium">% Atingimento</p>
                        <p className="text-xl font-bold text-purple-700">
                          {metaData?.totais?.matFinMeta ? ((metaData.totais.matFinAtual / metaData.totais.matFinMeta) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-xs text-amber-600 font-medium">Campus Atingindo</p>
                        <p className="text-xl font-bold text-amber-700">{metaData?.totais?.campusAtingindoMatFin || 0}/{metaData?.totais?.campusComMeta || 0}</p>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100">
                            <TableHead className="font-semibold">Campus</TableHead>
                            <TableHead className="font-semibold">Regional</TableHead>
                            <TableHead className="font-semibold text-right">Meta Mat. Fin.</TableHead>
                            <TableHead className="font-semibold text-right">Atual Mat. Fin.</TableHead>
                            <TableHead className="font-semibold text-right">% Atingido</TableHead>
                            <TableHead className="font-semibold">Progresso</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCampusData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                <p>Nenhum dado disponível</p>
                                <p className="text-xs mt-1">Faça upload do arquivo CRIVO (com aba CAP_CT) para ver metas</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredCampusData.slice(0, 50).map((row, index) => {
                              const percAtingido = row.matFinMeta > 0 ? (row.matFinAtual / row.matFinMeta) * 100 : 0
                              const atingindoMeta = row.matFinMeta > 0 && row.matFinAtual >= row.matFinMeta
                              return (
                                <TableRow key={index} className="hover:bg-slate-50">
                                  <TableCell className="font-medium text-xs">{abbreviateCampusName(row.campus)}</TableCell>
                                  <TableCell className="text-xs">{row.regional}</TableCell>
                                  <TableCell className="text-right text-xs font-semibold text-blue-600">{row.matFinMeta > 0 ? formatNumber(row.matFinMeta) : '-'}</TableCell>
                                  <TableCell className="text-right text-xs font-semibold text-green-600">{formatNumber(row.matFinAtual)}</TableCell>
                                  <TableCell className="text-right text-xs">
                                    {row.matFinMeta > 0 ? (
                                      <span className={`px-2 py-1 rounded font-semibold ${atingindoMeta ? 'bg-green-100 text-green-700' : percAtingido >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                        {percAtingido.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="w-32">
                                    {row.matFinMeta > 0 ? (
                                      <Progress value={Math.min(percAtingido, 100)} className="h-2" />
                                    ) : (
                                      <span className="text-slate-400 text-xs">sem meta</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredCampusData.length > 50 && <p className="text-center text-slate-500 text-sm mt-4">Mostrando 50 de {filteredCampusData.length} campus</p>}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ====== ABA PERTO DE CONFIRMAR ====== */}
          <TabsContent value="perto-confirmar" className="space-y-6">
            <Card className="shadow-lg border-l-4 border-l-yellow-500 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-800 font-semibold">Turmas Próximas de Confirmar</p>
                    <p className="text-yellow-600 text-sm">Cursos que precisam de até 3 alunos para atingir o PE</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-yellow-700">{data?.data?.filter(d => d.FIN_DOC < d.PE && (d.PE - d.FIN_DOC) <= 3 && (d.PE - d.FIN_DOC) >= 1).length || 0}</p>
                    <p className="text-yellow-600 text-sm">turmas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Turmas que Precisam de Poucos Alunos</CardTitle>
                    <p className="text-sm text-slate-500">Ordenado por proximidade do PE</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input placeholder="Buscar..." value={searchPertoConfirmar} onChange={(e) => setSearchPertoConfirmar(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="font-semibold">Campus</TableHead>
                        <TableHead className="font-semibold">Curso</TableHead>
                        <TableHead className="font-semibold">Turno</TableHead>
                        <TableHead className="font-semibold">UF</TableHead>
                        <TableHead className="font-semibold text-right">Fin + Doc</TableHead>
                        <TableHead className="font-semibold text-right">PE</TableHead>
                        <TableHead className="font-semibold text-right">Faltam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.filter(d => d.FIN_DOC < d.PE && (d.PE - d.FIN_DOC) <= 3 && (d.PE - d.FIN_DOC) >= 1)
                        .filter(d => {
                          if (!searchPertoConfirmar) return true
                          const searchLower = searchPertoConfirmar.toLowerCase()
                          return d.NOME_CAMPUS.toLowerCase().includes(searchLower) || d.NOME_CURSO.toLowerCase().includes(searchLower) || d.UF.toLowerCase().includes(searchLower)
                        })
                        .sort((a, b) => (a.PE - a.FIN_DOC) - (b.PE - b.FIN_DOC))
                        .slice(0, 50)
                        .map((row, index) => {
                          const faltam = row.PE - row.FIN_DOC
                          return (
                            <TableRow key={index} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-xs">{row.NOME_CAMPUS}</TableCell>
                              <TableCell className="text-xs">{row.NOME_CURSO}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{row.TURNO}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{row.UF}</Badge></TableCell>
                              <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.FIN_DOC)}</TableCell>
                              <TableCell className="text-right text-xs font-semibold">{row.PE}</TableCell>
                              <TableCell className="text-right text-xs"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold">{faltam}</span></TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ABA GAP ENTURMACAO ====== */}
          <TabsContent value="gap-enturmacao" className="space-y-6">
            <Card className="shadow-lg border-l-4 border-l-blue-500 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 font-semibold">Gap de Enturmação</p>
                    <p className="text-blue-600 text-sm">Turmas confirmadas com diferença entre Fin+Doc e Mat. Acadêmica</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-700">{data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length || 0}</p>
                    <p className="text-blue-600 text-sm">turmas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="text-lg">Turmas com Gap de Enturmação</CardTitle>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input placeholder="Buscar..." value={searchDetalhamento} onChange={(e) => setSearchDetalhamento(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="font-semibold">Campus</TableHead>
                        <TableHead className="font-semibold">Curso</TableHead>
                        <TableHead className="font-semibold">Turno</TableHead>
                        <TableHead className="font-semibold">UF</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                        <TableHead className="font-semibold text-right">Fin + Doc</TableHead>
                        <TableHead className="font-semibold text-right">Mat. Acad.</TableHead>
                        <TableHead className="font-semibold text-right">Gap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC)
                        .filter(d => {
                          if (!searchDetalhamento) return true
                          const searchLower = searchDetalhamento.toLowerCase()
                          return d.NOME_CAMPUS.toLowerCase().includes(searchLower) || d.NOME_CURSO.toLowerCase().includes(searchLower) || d.UF.toLowerCase().includes(searchLower)
                        })
                        .sort((a, b) => (b.FIN_DOC - b.MAT_ACAD) - (a.FIN_DOC - a.MAT_ACAD))
                        .slice(0, 100)
                        .map((row, index) => {
                          const gapEnturmacao = row.FIN_DOC - row.MAT_ACAD
                          return (
                            <TableRow key={index} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-xs">{row.NOME_CAMPUS}</TableCell>
                              <TableCell className="text-xs">{row.NOME_CURSO}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{row.TURNO}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{row.UF}</Badge></TableCell>
                              <TableCell className="text-center"><Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">CONFIRMADO</Badge></TableCell>
                              <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.FIN_DOC)}</TableCell>
                              <TableCell className="text-right text-xs font-semibold text-cyan-600">{formatNumber(row.MAT_ACAD)}</TableCell>
                              <TableCell className="text-right text-xs"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">-{gapEnturmacao}</span></TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
                {(data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length || 0) > 100 && <p className="text-center text-slate-500 text-sm mt-4">Mostrando 100 de {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length} turmas</p>}
                {(data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length || 0) === 0 && <p className="text-center text-slate-500 text-sm py-8">Nenhuma turma com gap</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-slate-800 text-slate-400 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span className="text-sm">Acompanhamento de Turmas - Curso Técnico Estácio 2026.1</span>
          <button onClick={() => setModalOpen(true)} className="text-slate-500 hover:text-slate-300 transition-colors p-1" title="Configurações">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) { setIsAuthenticated(false); setPassword(''); setPasswordError(''); setUploadResult(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Atualização de Dados</DialogTitle>
          </DialogHeader>
          
          {!isAuthenticated ? (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="w-7 h-7 text-white" /></div>
                <p className="text-slate-500 text-sm">Digite a senha para continuar</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="text-center" />
                {passwordError && <p className="text-red-500 text-sm text-center">{passwordError}</p>}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Entrar</Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input type="file" accept=".xlsx,.xls,.csv" multiple onChange={handleUpload} disabled={uploading} className="hidden" id="file-upload-modal" />
                <label htmlFor="file-upload-modal" className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'pointer-events-none' : ''}`}>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><Upload className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <p className="font-medium text-slate-700">{uploading ? 'Processando...' : 'Selecionar arquivo(s)'}</p>
                    <p className="text-xs text-slate-500">Portfolio.xlsx (primeira vez) ou CAP_2026.csv (atualizações)</p>
                  </div>
                </label>
              </div>

              {uploading && <div className="flex items-center justify-center gap-2 text-blue-600 py-2"><RefreshCw className="w-5 h-5 animate-spin" /><span>Processando...</span></div>}

              {uploadResult && (
                <div className={`p-3 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {uploadResult.success ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                    <div>
                      <p className={`font-medium text-sm ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>{uploadResult.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded space-y-1">
                <p><strong>⚠️ Importante:</strong></p>
                <p>• O arquivo <strong>CSV CAP</strong> não tem colunas de meta preenchidas</p>
                <p>• Para ver <strong>Meta vs Real</strong>, envie o arquivo <strong>CRIVO Excel</strong> completo</p>
                <p>• O CRIVO tem a aba CAP_CT com as metas definidas</p>
              </div>
              
              <Button variant="outline" className="w-full text-red-600 border-red-300 hover:bg-red-50" onClick={handleClearData}>
                <AlertTriangle className="w-4 h-4 mr-2" />Limpar Dados e Recarregar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
