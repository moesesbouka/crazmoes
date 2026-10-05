import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
export default function AdminResetPassword(){
 const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [ready,setReady]=useState(false); const [saving,setSaving]=useState(false); const navigate=useNavigate();
 useEffect(()=>{document.title="Reset Admin Password | Crazy Moe's"; supabase.auth.getSession().then(({data})=>setReady(!!data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"||session)setReady(true)}); return()=>subscription.unsubscribe()},[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault(); if(password.length<8){toast.error("Use at least 8 characters");return} if(password!==confirm){toast.error("Passwords do not match");return} setSaving(true); const {error}=await supabase.auth.updateUser({password}); setSaving(false); if(error){toast.error(error.message);return} toast.success("Password updated"); navigate("/admin")};
 return <div className="min-h-screen bg-background flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full hero-gradient"><KeyRound className="h-7 w-7"/></div><CardTitle>Choose a new password</CardTitle><CardDescription>{ready?"Enter your new Crazy Moe's admin password.":"Open this page from the password-reset email."}</CardDescription></CardHeader><CardContent>{ready?<form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label>New password</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></div><div className="space-y-2"><Label>Confirm password</Label><Input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required/></div><Button className="w-full hero-gradient" disabled={saving}>{saving?"Updating...":"Set New Password"}</Button></form>:<Button className="w-full" onClick={()=>navigate("/admin/login")}>Back to login</Button>}</CardContent></Card></div>
}