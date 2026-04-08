import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { TemperatureLog, Unit, Sector } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Download, AlertCircle, CheckCircle2, Trash2, X, FileSpreadsheet } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { cn } from '../lib/utils';

export default function LogHistory() {
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      const [logsRes, unitsRes, sectorsRes] = await Promise.all([
        supabase
          .from('temperature_logs')
          .select(`
            *,
            equipment (
              name,
              sectors (
                name
              ),
              units (
                name
              )
            )
          `)
          .order('measured_at', { ascending: false }),
        supabase.from('units').select('*').order('name'),
        supabase.from('sectors').select('*').order('name')
      ]);

      const formatted = (logsRes.data || []).map((log: any) => ({
        ...log,
        equipment_name: log.equipment?.name,
        sector_name: log.equipment?.sectors?.name,
        unit_name: log.equipment?.units?.name
      }));

      setLogs(formatted as TemperatureLog[]);
      setUnits(unitsRes.data || []);
      setSectors(sectorsRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sector_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recorded_by.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesUnit = filterUnit === 'all' || log.unit_name === filterUnit;
    const matchesSector = filterSector === 'all' || log.sector_name === filterSector;

    return matchesSearch && matchesStatus && matchesUnit && matchesSector;
  });

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registros de Temperatura');

    // Define columns
    worksheet.columns = [
      { header: 'Equipamento', key: 'equipment', width: 25 },
      { header: 'Unidade', key: 'unit', width: 20 },
      { header: 'Setor', key: 'sector', width: 20 },
      { header: 'Temp (°C)', key: 'temp', width: 12 },
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Hora', key: 'time', width: 10 },
      { header: 'Responsável', key: 'user', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notas', key: 'notes', width: 30 },
    ];

    // Add rows
    filteredLogs.forEach(log => {
      worksheet.addRow({
        equipment: log.equipment_name,
        unit: log.unit_name,
        sector: log.sector_name,
        temp: log.measured_temp,
        date: format(new Date(log.measured_at), 'dd/MM/yyyy'),
        time: format(new Date(log.measured_at), 'HH:mm'),
        user: log.recorded_by,
        status: log.status === 'normal' ? 'Normal' : 'Desvio',
        notes: log.notes || '',
      });
    });

    // Style header row (Green background, white text - matching the screenshot)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF76A052' }, // A nice green similar to Excel default table
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Style data rows (Zebra stripes and borders)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const isEven = rowNumber % 2 === 0;
        row.eachCell((cell) => {
          if (isEven) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE9F2E1' }, // Light green stripe
            };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          };
          cell.alignment = { vertical: 'middle' };
        });
      }
    });

    // Generate buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `historico_temperaturas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const deleteLog = async (id: number) => {
    // confirm() doesn't work well in iframes, using a simpler check or just proceeding for now
    // In a real app we'd use a Dialog, but let's at least make it work
    const { error } = await supabase.from('temperature_logs').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir registro:', error);
    } else {
      setLogs(logs.filter(l => l.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Registros</h2>
          <p className="text-zinc-500">Visualize e audite todos os registros de temperatura.</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <Input 
                placeholder="Buscar por equipamento, setor ou responsável..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showFilters ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-2 text-zinc-500"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                Filtros Avançados
              </Button>
              {(filterStatus !== 'all' || filterUnit !== 'all' || filterSector !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-600"
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterUnit('all');
                    setFilterSector('all');
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="out_of_range">Desvio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Unidade</label>
                <Select value={filterUnit} onValueChange={setFilterUnit}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Unidades</SelectItem>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Setor</label>
                <Select value={filterSector} onValueChange={setFilterSector}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {sectors.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-600 border-y border-green-700">
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Equipamento</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Unidade</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Setor</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Temperatura</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Data e Hora</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Responsável</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3 max-w-[200px]">Observações</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-wider text-white py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-zinc-100 animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-zinc-500">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-green-50/50 transition-colors border-b border-zinc-100 group even:bg-zinc-50/30">
                      <TableCell className="font-semibold text-zinc-900 py-4">{log.equipment_name}</TableCell>
                      <TableCell className="text-zinc-600 py-4">{log.unit_name || '-'}</TableCell>
                      <TableCell className="text-zinc-600 py-4">{log.sector_name}</TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "font-mono font-medium px-2 py-1 rounded text-sm",
                          log.status === 'normal' ? "bg-zinc-100 text-zinc-700" : "bg-red-100 text-red-700"
                        )}>
                          {log.measured_temp.toFixed(1)}°C
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-[11px] py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-700">{format(new Date(log.measured_at), 'dd/MM/yyyy')}</span>
                          <span>{format(new Date(log.measured_at), 'HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            {log.recorded_by.split(' ').map(n => n[0]).join('')}
                          </div>
                          {log.recorded_by}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {log.status === 'normal' ? (
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 gap-1 font-medium shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Normal
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-100 gap-1 font-medium shadow-sm">
                            <AlertCircle className="w-3 h-3" /> Desvio
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs italic max-w-[200px] py-4" title={log.notes}>
                        <div className="truncate">
                          {log.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteLog(log.id)}
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
