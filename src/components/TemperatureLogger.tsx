import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Equipment, Unit, UserProfile } from '../types';
import { AlertCircle, CheckCircle2, Thermometer, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const formSchema = z.object({
  equipment_id: z.string().min(1, 'Selecione um equipamento'),
  measured_temp: z.string().refine((val) => !isNaN(Number(val)), 'Digite um número válido'),
  notes: z.string().optional(),
  recorded_by: z.string().min(2, 'Nome muito curto'),
});

export default function TemperatureLogger() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipment_id: '',
      measured_temp: '',
      notes: '',
      recorded_by: '',
    },
  });

  useEffect(() => {
    async function fetchData() {
      const [equipRes, unitsRes, usersRes] = await Promise.all([
        supabase
          .from('equipment')
          .select('*, sectors(name), units(name)')
          .eq('is_active', true)
          .order('name'),
        supabase.from('units').select('*').order('name'),
        supabase.from('profiles').select('*').order('full_name')
      ]);
      
      const formatted = (equipRes.data || []).map((e: any) => ({
        ...e,
        sector_name: e.sectors?.name,
        unit_name: e.units?.name
      }));

      setEquipment(formatted);
      setUnits(unitsRes.data || []);
      setUsers(usersRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const onEquipChange = (id: string) => {
    const equip = equipment.find(e => e.id?.toString() === id);
    setSelectedEquip(equip || null);
  };

  const filteredEquipment = equipment.filter(e => 
    selectedUnitId === 'all' || e.unit_id?.toString() === selectedUnitId
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const measured_temp = parseFloat(values.measured_temp);
      const status = (selectedEquip && (measured_temp < selectedEquip.min_temp || measured_temp > selectedEquip.max_temp)) 
        ? 'out_of_range' 
        : 'normal';

      const { error } = await supabase.from('temperature_logs').insert([{
        equipment_id: parseInt(values.equipment_id),
        measured_temp,
        notes: values.notes,
        recorded_by: values.recorded_by,
        status
      }]);
      
      if (!error) {
        setSuccess(true);
        form.reset({
          ...form.getValues(),
          measured_temp: '',
          notes: '',
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  const tempValue = parseFloat(form.watch('measured_temp'));
  const isOutOfRange = selectedEquip && !isNaN(tempValue) && (tempValue < selectedEquip.min_temp || tempValue > selectedEquip.max_temp);

  if (loading) return <div className="animate-pulse h-64 bg-zinc-100 rounded-xl" />;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-zinc-200 shadow-lg">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Novo Registro</CardTitle>
              <CardDescription>Registre a temperatura atual do equipamento</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormLabel>Filtrar por Unidade</FormLabel>
                  <Select value={selectedUnitId} onValueChange={(val) => {
                    setSelectedUnitId(val);
                    form.setValue('equipment_id', '');
                    setSelectedEquip(null);
                  }}>
                    <SelectTrigger className="bg-zinc-50/50">
                      <SelectValue placeholder="Todas as Unidades">
                        {selectedUnitId === 'all' ? 'Todas as Unidades' : units.find(u => u.id?.toString() === selectedUnitId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Unidades</SelectItem>
                      {units.map(u => (
                        <SelectItem key={u.id} value={u.id?.toString() || ''}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="equipment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipamento</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          onEquipChange(val);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o equipamento">
                              {selectedEquip?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredEquipment.length === 0 ? (
                            <div className="p-2 text-xs text-center text-zinc-500">
                              Nenhum equipamento nesta unidade.
                            </div>
                          ) : (
                            filteredEquipment.map((e) => (
                              <SelectItem key={e.id} value={e.id?.toString() || ''}>
                                {e.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {selectedEquip && (
                        <div className="flex flex-col gap-1 mt-1">
                          <p className="text-[10px] text-zinc-500">
                            Unidade: <span className="font-semibold text-zinc-700">{selectedEquip.unit_name || '-'}</span> | 
                            Setor: <span className="font-semibold text-zinc-700">{selectedEquip.sector_name || '-'}</span>
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Faixa permitida: <span className="font-semibold text-blue-600">{selectedEquip.min_temp}°C a {selectedEquip.max_temp}°C</span>
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="measured_temp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura Medida (°C)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="0.0" 
                            {...field} 
                            className={cn(
                              "pl-8",
                              isOutOfRange ? "border-red-500 focus-visible:ring-red-500" : ""
                            )}
                          />
                          <Thermometer className="w-4 h-4 absolute left-2.5 top-3 text-zinc-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recorded_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável">
                              {users.find(u => u.full_name === field.value)?.full_name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.full_name}>
                              {user.full_name} ({user.sector_name || 'Geral'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isOutOfRange && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold">Atenção: Temperatura fora da faixa!</p>
                    <p className="text-xs opacity-90">É obrigatório descrever a ocorrência ou ação tomada no campo de observações.</p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações {isOutOfRange && <span className="text-red-500">*</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isOutOfRange ? "Descreva o motivo do desvio..." : "Opcional"} 
                        {...field} 
                        required={!!isOutOfRange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className={cn(
                  "w-full transition-all duration-300",
                  success ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                )}
                disabled={submitting}
              >
                {submitting ? "Salvando..." : success ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Registro Salvo!
                  </span>
                ) : "Salvar Registro"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
