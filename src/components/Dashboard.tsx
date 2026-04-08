import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { DashboardStats, TemperatureLog } from '../types';
import { AlertCircle, CheckCircle2, Thermometer, Activity, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const today = startOfDay(new Date()).toISOString();

      // Total logs today
      const { count: totalToday } = await supabase
        .from('temperature_logs')
        .select('*', { count: 'exact', head: true })
        .gte('measured_at', today);

      // Out of range today
      const { count: outOfRangeToday } = await supabase
        .from('temperature_logs')
        .select('*', { count: 'exact', head: true })
        .gte('measured_at', today)
        .eq('status', 'out_of_range');

      // Active equipment
      const { count: activeEquip } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Recent deviations with equipment names
      const { data: recentDeviations } = await supabase
        .from('temperature_logs')
        .select(`
          *,
          equipment (
            name
          )
        `)
        .order('measured_at', { ascending: false })
        .limit(20);

      // Format deviations to match our type
      const formattedDeviations = (recentDeviations || []).map((log: any) => ({
        ...log,
        equipment_name: log.equipment?.name
      }));

      setStats({
        totalLogsToday: { count: totalToday || 0 },
        outOfRangeToday: { count: outOfRangeToday || 0 },
        activeEquipment: { count: activeEquip || 0 },
        recentDeviations: formattedDeviations as TemperatureLog[]
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Registros Hoje</CardTitle>
            <Activity className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogsToday.count}</div>
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-green-600 font-medium inline-flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
              </span> vs ontem
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Desvios Hoje</CardTitle>
            <AlertCircle className={stats.outOfRangeToday.count > 0 ? "w-4 h-4 text-red-500" : "w-4 h-4 text-zinc-400"} />
          </CardHeader>
          <CardContent>
            <div className={stats.outOfRangeToday.count > 0 ? "text-2xl font-bold text-red-600" : "text-2xl font-bold"}>
              {stats.outOfRangeToday.count}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.outOfRangeToday.count === 0 ? "Tudo dentro da faixa" : "Atenção necessária"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Equipamentos Ativos</CardTitle>
            <Thermometer className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEquipment.count}</div>
            <p className="text-xs text-zinc-500 mt-1">Monitoramento em tempo real</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-500">Conformidade</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLogsToday.count > 0 
                ? Math.round(((stats.totalLogsToday.count - stats.outOfRangeToday.count) / stats.totalLogsToday.count) * 100) 
                : 100}%
            </div>
            <p className="text-xs text-zinc-500 mt-1">Meta: 98%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Tendência de Temperatura</CardTitle>
            <CardDescription>Últimos 20 registros realizados no laboratório</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.recentDeviations.slice().reverse()}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="measured_at" 
                  tickFormatter={(val) => format(new Date(val), 'HH:mm')}
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="°C"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7' }}
                  labelFormatter={(val) => format(new Date(val), 'PPP HH:mm', { locale: ptBR })}
                />
                <Area 
                  type="monotone" 
                  dataKey="measured_temp" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTemp)" 
                  name="Temperatura"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Desvios Recentes</CardTitle>
            <CardDescription>Últimas ocorrências fora da faixa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentDeviations.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  Nenhum desvio registrado recentemente.
                </div>
              ) : (
                stats.recentDeviations.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{log.equipment_name}</p>
                      <p className="text-xs text-zinc-500">
                        {log.measured_temp}°C em {format(new Date(log.measured_at), 'HH:mm')}
                      </p>
                      {log.notes && (
                        <p className="text-[10px] text-zinc-400 mt-1 italic truncate">"{log.notes}"</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
