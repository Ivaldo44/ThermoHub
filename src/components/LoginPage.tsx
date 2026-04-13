import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Thermometer, Lock, Mail, AlertCircle, Loader2, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      
      // If sign up is successful, create the profile
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          role: 'operator' // New accounts are now 'operator' (normal) by default
        });
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      setSuccess('Conta criada com sucesso! Você já pode entrar com seu e-mail e senha.');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 text-white mb-4 shadow-lg shadow-green-200">
            <Thermometer className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">ThermoHub</h1>
          <p className="text-zinc-500 mt-2">Monitoramento Térmico Laboratorial</p>
        </div>

        <Card className="border-zinc-200 shadow-xl bg-white/80 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent h-12">
              <TabsTrigger value="login" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none bg-transparent">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none bg-transparent">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Acesso ao Sistema</CardTitle>
                <CardDescription>Entre com suas credenciais para gerenciar o laboratório.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" />
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Entrar'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Criar Conta de Administrador</CardTitle>
                <CardDescription>Cadastre-se para começar a gerenciar sua equipe.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-center gap-3 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {success}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <div className="relative">
                      <Input id="signup-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10" placeholder="Seu nome" />
                      <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" />
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Criar Conta'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
