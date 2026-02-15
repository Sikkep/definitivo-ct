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
  SKU: string
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

// Helper function to abbreviate campus names
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
  
  // Estado para visão geral
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para visão de metas
  const [metaData, setMetaData] = useState<MetaData | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  
  // Filtros visão geral
  const [ufSelecionado, setUfSelecionado] = useState('todos')
  const [campusSelecionado, setCampusSelecionado] = useState('todos')
  const [cursoSelecionado, setCursoSelecionado] = useState('todos')
  const [turnoSelecionado, setTurnoSelecionado] = useState('todos')
  
  // Filtros visão meta
  const [metaCampusSelecionado, setMetaCampusSelecionado] = useState('todos')
  const [metaCursoSelecionado, setMetaCursoSelecionado] = useState('todos')
  const [metaTurnoSelecionado, setMetaTurnoSelecionado] = useState('todos')
  const [metaRegionalSelecionado, setMetaRegionalSelecionado] = useState('todos')
  
  // Estado para pesquisa na tabela de campus
  const [searchCampus, setSearchCampus] = useState('')
  
  // Estado para pesquisa na tabela de detalhamento
  const [searchDetalhamento, setSearchDetalhamento] = useState('')
  const [searchPertoConfirmar, setSearchPertoConfirmar] = useState('')
  
  // Estado para modal de upload com proteção
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

  // ====== HANDLE LOGIN ======
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'crivo2026') {
      setIsAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Senha incorreta')
    }
  }

  // ====== HANDLE UPLOAD ======
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      // Enviar todos os arquivos selecionados
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          stats: result.stats
        })
        fetchData()
        if (activeTab === 'meta') fetchMetaData()
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Erro ao processar arquivo'
        })
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Erro de conexão ao enviar arquivo'
      })
    } finally {
      setUploading(false)
    }
  }

  // Filter campus data by search
  const filteredCampusData = metaData?.data?.filter(d => {
    if (!searchCampus) return true
    const searchLower = searchCampus.toLowerCase()
    return (
      d.campus.toLowerCase().includes(searchLower) ||
      d.regional.toLowerCase().includes(searchLower)
    )
  }) || []
  
  // Filter detalhamento data by search
  const filteredDetalhamentoData = data?.data?.filter(d => {
    if (!searchDetalhamento) return true
    const searchLower = searchDetalhamento.toLowerCase()
    return (
      d.NOME_CAMPUS.toLowerCase().includes(searchLower) ||
      d.NOME_CURSO.toLowerCase().includes(searchLower) ||
      d.UF.toLowerCase().includes(searchLower) ||
      d.TURNO.toLowerCase().includes(searchLower)
    )
  }) || []

  // ====== LOADING STATE ======
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

  // ====== RENDER ======
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#164bc8] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src="/logo-estacio.png" 
                alt="Logo Estácio" 
                width={60} 
                height={60}
                className="object-contain rounded"
              />
              <div>
                <h1 className="text-2xl font-bold">Acompanhamento de Turmas - Curso Técnico Estácio 2026.1</h1>
                <p className="text-blue-200 text-sm">Controle de Captação - Visão Geral e Metas</p>
              </div>
            </div>
            <span className="text-xs text-blue-300">©Daniel Villa</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="meta" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Meta vs Real
            </TabsTrigger>
            <TabsTrigger value="perto-confirmar" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Perto de Confirmar
            </TabsTrigger>
            <TabsTrigger value="gap-enturmacao" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Gap de Enturmação
            </TabsTrigger>
          </TabsList>

          {/* ====== ABA VISÃO GERAL ====== */}
          <TabsContent value="visao-geral" className="space-y-6">
            {/* Filtros */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">UF</label>
                    <Select value={ufSelecionado} onValueChange={setUfSelecionado}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione UF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as UFs</SelectItem>
                        {data?.filters?.ufs?.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Campus</label>
                    <Select value={campusSelecionado} onValueChange={setCampusSelecionado}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione Campus" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="todos">Todos os Campus</SelectItem>
                        {data?.filters?.campus?.map(campus => (
                          <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Curso</label>
                    <Select value={cursoSelecionado} onValueChange={setCursoSelecionado}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione Curso" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="todos">Todos os Cursos</SelectItem>
                        {data?.filters?.cursos?.map(curso => (
                          <SelectItem key={curso} value={curso}>{curso}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Turno</label>
                    <Select value={turnoSelecionado} onValueChange={setTurnoSelecionado}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione Turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Turnos</SelectItem>
                        {data?.filters?.turnos?.map(turno => (
                          <SelectItem key={turno} value={turno}>{turno}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards de Resumo */}
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

            {/* Cards de Status de Cursos e Gráfico de Pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cards de Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-200 text-sm">Cursos Ofertados</p>
                        <p className="text-2xl font-bold">{formatNumber(data?.totais?.totalRegistros || 0)}</p>
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
                        <p className="text-2xl font-bold">{formatNumber(data?.data?.filter(d => d.FIN_DOC >= d.PE).length || 0)}</p>
                      </div>
                      <CheckCircle className="w-10 h-10 text-green-300" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm">Faltam Confirmar</p>
                        <p className="text-2xl font-bold">{formatNumber(data?.data?.filter(d => d.FIN_DOC < d.PE).length || 0)}</p>
                      </div>
                      <Target className="w-10 h-10 text-yellow-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Pizza */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-center">Taxa de Confirmação de Cursos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Confirmados', value: data?.data?.filter(d => d.FIN_DOC >= d.PE).length || 0, fill: '#16a34a' },
                          { name: 'Faltam Confirmar', value: data?.data?.filter(d => d.FIN_DOC < d.PE).length || 0, fill: '#f59e0b' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                      </Pie>
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos em Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Mat. Financeira por UF</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data?.porUF || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="uf" fontSize={12} tick={{ fill: '#475569' }} />
                      <YAxis fontSize={12} tick={{ fill: '#475569' }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="matFin" fill="#10B981" name="Mat. Financeira" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="matFin" position="top" formatter={(value: number) => formatNumber(value)} style={{ fontSize: '10px', fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Campus por Mat. Financeira</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data?.porCampus?.slice(0, 10) || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="campus" fontSize={9} angle={-45} textAnchor="end" height={80} tick={{ fill: '#475569' }} interval={0} />
                      <YAxis fontSize={12} tick={{ fill: '#475569' }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="matFin" fill="#3B82F6" name="Mat. Financeira" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="matFin" position="top" formatter={(value: number) => formatNumber(value)} style={{ fontSize: '9px', fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Mat. Financeira por Curso</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data?.porCurso?.slice(0, 10) || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="curso" fontSize={9} angle={-45} textAnchor="end" height={80} tick={{ fill: '#475569' }} interval={0} />
                      <YAxis fontSize={12} tick={{ fill: '#475569' }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="matFin" fill="#8B5CF6" name="Mat. Financeira" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="matFin" position="top" formatter={(value: number) => formatNumber(value)} style={{ fontSize: '9px', fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Mat. Financeira por Turno</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data?.porTurno?.filter(t => t.turno !== 'INTEGRAL - PÓS') || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="turno" fontSize={12} tick={{ fill: '#475569' }} />
                      <YAxis fontSize={12} tick={{ fill: '#475569' }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="matFin" name="Mat. Financeira" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="matFin" position="top" formatter={(value: number) => formatNumber(value)} style={{ fontSize: '10px', fill: '#475569' }} />
                        {(data?.porTurno?.filter(t => t.turno !== 'INTEGRAL - PÓS') || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Dados */}
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Detalhamento por Curso</CardTitle>
                    <p className="text-sm text-slate-500">
                      {filteredDetalhamentoData.length} registros encontrados
                      {searchDetalhamento && ` para "${searchDetalhamento}"`}
                    </p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input placeholder="Buscar campus, curso, UF..." value={searchDetalhamento} onChange={(e) => setSearchDetalhamento(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="font-semibold">Campus</TableHead>
                        <TableHead className="font-semibold">UF</TableHead>
                        <TableHead className="font-semibold">Curso</TableHead>
                        <TableHead className="font-semibold">Turno</TableHead>
                        <TableHead className="font-semibold text-right">Inscritos</TableHead>
                        <TableHead className="font-semibold text-right">Mat. Fin.</TableHead>
                        <TableHead className="font-semibold text-right">Fin + Doc</TableHead>
                        <TableHead className="font-semibold text-right">PE</TableHead>
                        <TableHead className="font-semibold text-right">Mat. Acad.</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDetalhamentoData.slice(0, 50).map((row, index) => {
                        const isConfirmado = row.FIN_DOC >= row.PE;
                        return (
                          <TableRow key={index} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-xs">{row.NOME_CAMPUS}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{row.UF}</Badge></TableCell>
                            <TableCell className="text-xs">{row.NOME_CURSO}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-xs">{row.TURNO}</Badge></TableCell>
                            <TableCell className="text-right text-xs">{formatNumber(row.INSCRITOS)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold text-green-600">{formatNumber(row.MAT_FIN)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.FIN_DOC)}</TableCell>
                            <TableCell className="text-right text-xs text-orange-600">{formatNumber(row.PE)}</TableCell>
                            <TableCell className="text-right text-xs text-cyan-600">{formatNumber(row.MAT_ACAD)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={isConfirmado ? 'default' : 'secondary'} className={`text-xs ${isConfirmado ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}>
                                {isConfirmado ? 'CONFIRMADO' : 'STANDBY'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {filteredDetalhamentoData.length > 50 && (
                  <p className="text-center text-slate-500 text-sm mt-4">Mostrando 50 de {filteredDetalhamentoData.length} registros</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ABA META VS REAL ====== */}
          <TabsContent value="meta" className="space-y-6">
            {metaLoading && !metaData ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Carregando dados de meta...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Filtros Meta */}
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Filtros - Meta vs Real (Base CAP_CT)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Regional</label>
                        <Select value={metaRegionalSelecionado} onValueChange={setMetaRegionalSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Regional" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todas as Regionais</SelectItem>
                            {metaData?.filters?.regionais?.map(regional => (
                              <SelectItem key={regional} value={regional}>{regional}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Campus</label>
                        <Select value={metaCampusSelecionado} onValueChange={setMetaCampusSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Campus" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="todos">Todos os Campus</SelectItem>
                            {metaData?.filters?.campuses?.map(campus => (
                              <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Curso</label>
                        <Select value={metaCursoSelecionado} onValueChange={setMetaCursoSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Curso" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="todos">Todos os Cursos</SelectItem>
                            {metaData?.filters?.cursos?.map(curso => (
                              <SelectItem key={curso} value={curso}>{curso}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Turno</label>
                        <Select value={metaTurnoSelecionado} onValueChange={setMetaTurnoSelecionado}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Turno" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os Turnos</SelectItem>
                            {metaData?.filters?.turnos?.map(turno => (
                              <SelectItem key={turno} value={turno}>{turno}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cards de Resumo Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-lg border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-6 h-6 text-blue-600" />
                        <span className="font-semibold text-slate-700">Inscritos</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Meta:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(metaData?.totais?.inscritosMeta || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Atual:</span>
                          <span className="font-semibold text-blue-600">{formatNumber(metaData?.totais?.inscritosAtual || 0)}</span>
                        </div>
                        <Progress value={Math.min(metaData?.totais?.inscritosMeta ? (metaData.totais.inscritosAtual / metaData.totais.inscritosMeta) * 100 : 0, 150)} className="h-2" />
                        <p className="text-xs text-right text-slate-500">{metaData?.totais?.inscritosMeta ? formatPercent((metaData.totais.inscritosAtual / metaData.totais.inscritosMeta) * 100) : '0%'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        <span className="font-semibold text-slate-700">Mat. Financeira</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Meta:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(metaData?.totais?.matFinMeta || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Atual:</span>
                          <span className="font-semibold text-green-600">{formatNumber(metaData?.totais?.matFinAtual || 0)}</span>
                        </div>
                        <Progress value={Math.min(metaData?.totais?.matFinMeta ? (metaData.totais.matFinAtual / metaData.totais.matFinMeta) * 100 : 0, 150)} className="h-2" />
                        <p className="text-xs text-right text-slate-500">{metaData?.totais?.matFinMeta ? formatPercent((metaData.totais.matFinAtual / metaData.totais.matFinMeta) * 100) : '0%'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCheck className="w-6 h-6 text-purple-600" />
                        <span className="font-semibold text-slate-700">Fin + Doc</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Meta:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(metaData?.totais?.finDocMeta || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Atual:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(metaData?.totais?.finDocAtual || 0)}</span>
                        </div>
                        <Progress value={Math.min(metaData?.totais?.finDocMeta ? (metaData.totais.finDocAtual / metaData.totais.finDocMeta) * 100 : 0, 150)} className="h-2" />
                        <p className="text-xs text-right text-slate-500">{metaData?.totais?.finDocMeta ? formatPercent((metaData.totais.finDocAtual / metaData.totais.finDocMeta) * 100) : '0%'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-l-4 border-l-cyan-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-6 h-6 text-cyan-600" />
                        <span className="font-semibold text-slate-700">Mat. Acadêmica</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Meta:</span>
                          <span className="font-semibold text-purple-600">{formatNumber(metaData?.totais?.matAcadMeta || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Atual:</span>
                          <span className="font-semibold text-cyan-600">{formatNumber(metaData?.totais?.matAcadAtual || 0)}</span>
                        </div>
                        <Progress value={Math.min(metaData?.totais?.matAcadMeta ? (metaData.totais.matAcadAtual / metaData.totais.matAcadMeta) * 100 : 0, 150)} className="h-2" />
                        <p className="text-xs text-right text-slate-500">{metaData?.totais?.matAcadMeta ? formatPercent((metaData.totais.matAcadAtual / metaData.totais.matAcadMeta) * 100) : '0%'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Card de Resumo de Campus */}
                <Card className="shadow-md bg-gradient-to-r from-slate-50 to-slate-100">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-around flex-wrap gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{metaData?.totais?.totalCampus || 0}</p>
                        <p className="text-sm text-slate-600">Total de Campus</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{metaData?.totais?.campusAtingindoMatFin || 0}</p>
                        <p className="text-sm text-slate-600">Atingindo Meta</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{metaData?.totais?.campusComMeta || 0}</p>
                        <p className="text-sm text-slate-600">Com Meta Definida</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Performance por Campus */}
                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <CardTitle className="text-lg">Performance por Campus</CardTitle>
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input placeholder="Buscar campus..." value={searchCampus} onChange={(e) => setSearchCampus(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100">
                            <TableHead className="font-semibold">Campus</TableHead>
                            <TableHead className="font-semibold">Regional</TableHead>
                            <TableHead className="font-semibold text-right">Meta Mat. Fin.</TableHead>
                            <TableHead className="font-semibold text-right">Atual Mat. Fin.</TableHead>
                            <TableHead className="font-semibold text-right">% Atingido</TableHead>
                            <TableHead className="font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCampusData.slice(0, 30).map((row, index) => {
                            const percMatFin = row.matFinMeta > 0 ? (row.matFinAtual / row.matFinMeta) * 100 : 0;
                            const atingiuMeta = row.matFinAtual >= row.matFinMeta;
                            return (
                              <TableRow key={index} className="hover:bg-slate-50">
                                <TableCell className="font-medium text-xs">{abbreviateCampusName(row.campus)}</TableCell>
                                <TableCell className="text-xs">{row.regional}</TableCell>
                                <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.matFinMeta)}</TableCell>
                                <TableCell className="text-right text-xs font-semibold text-green-600">{formatNumber(row.matFinAtual)}</TableCell>
                                <TableCell className="text-right text-xs">
                                  <span className={percMatFin >= 100 ? 'text-green-600 font-semibold' : percMatFin >= 80 ? 'text-yellow-600' : 'text-red-600'}>{formatPercent(percMatFin)}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={atingiuMeta ? 'default' : 'secondary'} className={`text-xs ${atingiuMeta ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}>
                                    {atingiuMeta ? 'ATINGIDO' : 'PENDENTE'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredCampusData.length > 30 && (
                      <p className="text-center text-slate-500 text-sm mt-4">Mostrando 30 de {filteredCampusData.length} campus</p>
                    )}
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
                    <p className="text-3xl font-bold text-yellow-700">
                      {data?.data?.filter(d => d.FIN_DOC < d.PE && (d.PE - d.FIN_DOC) <= 3 && (d.PE - d.FIN_DOC) >= 1).length || 0}
                    </p>
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
                    <p className="text-sm text-slate-500">Ordenado por proximidade do PE (mais próximos primeiro)</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar campus, curso, UF..."
                      value={searchPertoConfirmar}
                      onChange={(e) => setSearchPertoConfirmar(e.target.value)}
                      className="pl-10"
                    />
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
                        <TableHead className="font-semibold text-right">% Alcançado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.filter(d => d.FIN_DOC < d.PE && (d.PE - d.FIN_DOC) <= 3 && (d.PE - d.FIN_DOC) >= 1)
                        .filter(d => {
                          if (!searchPertoConfirmar) return true;
                          const searchLower = searchPertoConfirmar.toLowerCase();
                          return d.NOME_CAMPUS.toLowerCase().includes(searchLower) ||
                                 d.NOME_CURSO.toLowerCase().includes(searchLower) ||
                                 d.UF.toLowerCase().includes(searchLower);
                        })
                        .sort((a, b) => (a.PE - a.FIN_DOC) - (b.PE - b.FIN_DOC))
                        .map((row, index) => {
                          const faltam = row.PE - row.FIN_DOC;
                          const percAlcancado = row.PE > 0 ? (row.FIN_DOC / row.PE) * 100 : 0;
                          return (
                            <TableRow key={index} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-xs">{row.NOME_CAMPUS}</TableCell>
                              <TableCell className="text-xs">{row.NOME_CURSO}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{row.TURNO}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{row.UF}</Badge></TableCell>
                              <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.FIN_DOC)}</TableCell>
                              <TableCell className="text-right text-xs text-orange-600">{formatNumber(row.PE)}</TableCell>
                              <TableCell className="text-right text-xs">
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold">
                                  -{faltam}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                <span className={percAlcancado >= 80 ? 'text-green-600 font-semibold' : 'text-yellow-600'}>
                                  {formatPercent(percAlcancado)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
                {data?.data?.filter(d => d.FIN_DOC < d.PE && (d.PE - d.FIN_DOC) <= 3 && (d.PE - d.FIN_DOC) >= 1).length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-8">Nenhuma turma próxima de confirmar no momento</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ABA GAP DE ENTURMAÇÃO ====== */}
          <TabsContent value="gap-enturmacao" className="space-y-6">
            <Card className="shadow-lg border-l-4 border-l-[#164bc8] bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#164bc8] font-semibold">Gap de Enturmação</p>
                    <p className="text-blue-600 text-sm">Turmas confirmadas com MAT_ACAD menor que FIN_DOC</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#164bc8]">
                      {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length || 0}
                    </p>
                    <p className="text-blue-600 text-sm">turmas com gap</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Turmas Confirmadas com Gap de Enturmação</CardTitle>
                    <p className="text-sm text-slate-500">Ordenado por gap de enturmação (maior para menor)</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar..."
                      value={searchDetalhamento}
                      onChange={(e) => setSearchDetalhamento(e.target.value)}
                      className="pl-10"
                    />
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
                        <TableHead className="font-semibold text-right">Gap Enturmação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC)
                        .filter(d => {
                          if (!searchDetalhamento) return true;
                          const searchLower = searchDetalhamento.toLowerCase();
                          return d.NOME_CAMPUS.toLowerCase().includes(searchLower) ||
                                 d.NOME_CURSO.toLowerCase().includes(searchLower) ||
                                 d.UF.toLowerCase().includes(searchLower);
                        })
                        .sort((a, b) => (b.FIN_DOC - b.MAT_ACAD) - (a.FIN_DOC - a.MAT_ACAD))
                        .slice(0, 100)
                        .map((row, index) => {
                          const gapEnturmacao = row.FIN_DOC - row.MAT_ACAD;
                          return (
                            <TableRow key={index} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-xs">{row.NOME_CAMPUS}</TableCell>
                              <TableCell className="text-xs">{row.NOME_CURSO}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{row.TURNO}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{row.UF}</Badge></TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                  CONFIRMADO
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold text-purple-600">{formatNumber(row.FIN_DOC)}</TableCell>
                              <TableCell className="text-right text-xs font-semibold text-cyan-600">{formatNumber(row.MAT_ACAD)}</TableCell>
                              <TableCell className="text-right text-xs">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                  -{gapEnturmacao}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
                {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length > 100 && (
                  <p className="text-center text-slate-500 text-sm mt-4">Mostrando 100 de {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length} turmas com gap</p>
                )}
                {data?.data?.filter(d => d.FIN_DOC >= d.PE && d.MAT_ACAD < d.FIN_DOC).length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-8">Nenhuma turma com gap de enturmação no momento</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer com link discreto */}
      <footer className="bg-slate-800 text-slate-400 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span className="text-sm">Acompanhamento de Turmas - Curso Técnico Estácio 2026.1 | Base: CAP_CT</span>
          <button 
            onClick={() => setModalOpen(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Modal de Atualização */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open)
        if (!open) {
          setIsAuthenticated(false)
          setPassword('')
          setPasswordError('')
          setUploadResult(null)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Atualização de Dados
            </DialogTitle>
          </DialogHeader>
          
          {!isAuthenticated ? (
            // TELA DE LOGIN
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-slate-500 text-sm">Digite a senha para continuar</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="text-center"
                />
                {passwordError && (
                  <p className="text-red-500 text-sm text-center">{passwordError}</p>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Entrar
                </Button>
              </form>
            </div>
          ) : (
            // ÁREA DE UPLOAD
            <div className="space-y-4 py-2">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload-modal"
                />
                <label htmlFor="file-upload-modal" className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'pointer-events-none' : ''}`}>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{uploading ? 'Processando...' : 'Selecionar planilha(s)'}</p>
                    <p className="text-xs text-slate-500">.xlsx, .xls ou .csv (múltiplos arquivos permitidos)</p>
                  </div>
                </label>
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-blue-600 py-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processando arquivos...</span>
                </div>
              )}

              {uploadResult && (
                <div className={`p-3 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-2">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium text-sm ${uploadResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.stats && (
                        <div className="text-xs text-slate-600 mt-1 space-y-1">
                          <p>{uploadResult.stats.crivoRegistros} registros CRIVO • {uploadResult.stats.metaRegistros} campus</p>
                          {uploadResult.stats.arquivos && (
                            <p className="text-slate-500">Arquivos: {uploadResult.stats.arquivos.join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded space-y-1">
                <p>• Planilha deve conter as abas <strong>CRIVO</strong> e/ou <strong>CAP_CT</strong></p>
                <p>• Aceita arquivos grandes (sem limite de tamanho)</p>
                <p>• Selecione múltiplos arquivos se necessário</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
