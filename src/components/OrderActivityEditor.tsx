import { useState } from 'react';
import { type BootstrapData, type OrderActivity, type OSApp } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// eslint-disable-next-line react-refresh/only-export-components
export function initialOrderActivities(os: OSApp, data: BootstrapData): OrderActivity[] {
  if (os.atividades?.length) return structuredClone(os.atividades);
  const service = data.services.find(s => s.id === os.servicoCatalogoId || s.nome === os.servico);
  const tags = [...new Set((os.tagEquipamentoServico || os.tags || '').split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean))];
  return (tags.length ? tags : ['']).map((tag, i) => ({
    id: `principal-${i+1}`, servicoId: service?.id || '', servicoNome: service?.nome || os.servico,
    quantidade: tags.length > 1 ? 1 : os.quantidade || 1, unidade: service?.unidade || os.unidade,
    localExecucao: os.localExecucao || '', tagEquipamento: tag, fotos: [], produtosUtilizados: [],
    contratoId: os.contratoId || null, checklistRespostas: (service?.checklistItens || []).map(item => ({ item, concluido: false })),
  }));
}

export function OrderActivityEditor({ activities, onChange, data, closing = false, preparePhoto, onBusyChange }: {
  activities: OrderActivity[]; onChange: (value: OrderActivity[]) => void; data: BootstrapData;
  closing?: boolean; preparePhoto: (file: File) => Promise<string>; onBusyChange?: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const patch = (index: number, value: Partial<OrderActivity>) => onChange(activities.map((a,i) => i === index ? { ...a, ...value } : a));
  async function photos(index: number, files: FileList | null) {
    if (!files || uploading) return;
    setUploading(true); onBusyChange?.(true);
    try {
      const remaining = 3 - activities[index].fotos.length;
      if (files.length > remaining) throw new Error('Cada atividade aceita até três fotos.');
      const loaded = await Promise.all(Array.from(files).map(preparePhoto));
      patch(index, { fotos: [...activities[index].fotos, ...loaded] });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as fotos.'); }
    finally { setUploading(false); onBusyChange?.(false); }
  }
  return <fieldset disabled={uploading} className="space-y-4">
    <legend className="mb-2 font-semibold">Atividades e equipamentos</legend>
    <p className="text-sm text-muted-foreground">Adicione um item por serviço e equipamento. Cada certificado usará somente as fotos desse item.</p>
    {activities.map((activity,index) => {
      const service = data.services.find(s => s.id === activity.servicoId);
      return <section key={activity.id} className="space-y-3 rounded-lg border p-4" aria-label={`Atividade ${index+1}`}>
        <div className="flex items-center justify-between"><strong>Atividade {index+1}</strong><Button type="button" variant="ghost" disabled={activities.length===1} onClick={()=>onChange(activities.filter((_,i)=>i!==index))}>Remover</Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Serviço
            <select className="h-10 w-full rounded-md border bg-background px-2" value={activity.servicoId} onChange={e=>{
              const s=data.services.find(s=>s.id===e.target.value);
              patch(index,{servicoId:e.target.value,servicoNome:s?.nome,unidade:s?.unidade,contratoId:null,fotos:[],produtosUtilizados:[],checklistRespostas:(s?.checklistItens||[]).map(item=>({item,concluido:false}))});
            }}><option value="">Selecione o serviço</option>{data.services.filter(s=>s.ativo).map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select>
          </label>
          <label className="space-y-1 text-sm">Quantidade ({activity.unidade || service?.unidade || 'un.'})<Input type="number" min="0.001" step="0.001" value={activity.quantidade} onChange={e=>patch(index,{quantidade:Number(e.target.value)})}/></label>
          <label className="space-y-1 text-sm">Local de execução<Input value={activity.localExecucao} onChange={e=>patch(index,{localExecucao:e.target.value})} placeholder="Ex.: Canteiro C2"/></label>
          <label className="space-y-1 text-sm">Equipamento / TAG (um por item)<Input value={activity.tagEquipamento} onChange={e=>patch(index,{tagEquipamento:e.target.value})} placeholder="Ex.: BEB-01"/></label>
        </div>
        {closing && <>
          {service?.permiteNaoExecucao && <label className="flex gap-2 text-sm"><Checkbox checked={activity.naoExecutada || false} onCheckedChange={checked=>patch(index,{naoExecutada:Boolean(checked),produtosUtilizados:checked?[]:activity.produtosUtilizados})}/>Não executada</label>}
          {activity.naoExecutada ? <Input aria-label={`Motivo da atividade ${index+1}`} placeholder="Motivo da não execução" value={activity.motivoNaoExecucao || ''} onChange={e=>patch(index,{motivoNaoExecucao:e.target.value})}/> : <>
            <Label>Fotos deste equipamento {service?.exigeFoto ? '(obrigatório)' : '(até 3)'}</Label>
            <Input aria-label={`Fotos da atividade ${index+1}`} type="file" accept="image/*" multiple onChange={e=>{void photos(index,e.target.files);e.target.value='';}}/>
            <div className="flex flex-wrap gap-3">{activity.fotos.map((photo,i)=><div key={i}><img src={photo} alt={`Atividade ${index+1}, foto ${i+1}`} className="h-20 w-24 rounded border object-contain"/><Button type="button" size="sm" variant="ghost" onClick={()=>patch(index,{fotos:activity.fotos.filter((_,j)=>i!==j)})}>Remover foto</Button></div>)}</div>
            {(activity.checklistRespostas || []).map((entry,i)=><label key={i} className="flex gap-2 text-sm"><Checkbox checked={entry.concluido} onCheckedChange={checked=>patch(index,{checklistRespostas:activity.checklistRespostas!.map((e,j)=>j===i?{...e,concluido:Boolean(checked)}:e)})}/>{entry.item}</label>)}
            <Label>Produtos realmente utilizados</Label>
            <select aria-label={`Adicionar produto à atividade ${index+1}`} className="h-10 w-full rounded-md border bg-background px-2" value="" onChange={e=>{if(e.target.value)patch(index,{produtosUtilizados:[...activity.produtosUtilizados,{produtoId:e.target.value,quantidade:1}]});}}>
              <option value="">Adicionar produto do estoque</option>{(data.stockProducts||[]).filter(p=>p.ativo && !activity.produtosUtilizados.some(u=>u.produtoId===p.id)).map(p=><option value={p.id} key={p.id}>{p.nome} ({p.unidade})</option>)}
            </select>
            {activity.produtosUtilizados.map((usage,i)=><div className="flex items-center gap-2" key={usage.produtoId}><span className="flex-1 text-sm">{data.stockProducts?.find(p=>p.id===usage.produtoId)?.nome || usage.produtoId}</span><Input className="w-24" aria-label={`Quantidade do produto ${i+1} da atividade ${index+1}`} type="number" step="0.001" min="0" value={usage.quantidade} onChange={e=>patch(index,{produtosUtilizados:activity.produtosUtilizados.map((p,j)=>i===j?{...p,quantidade:Number(e.target.value)}:p)})}/><Button type="button" variant="ghost" onClick={()=>patch(index,{produtosUtilizados:activity.produtosUtilizados.filter((_,j)=>i!==j)})}>Remover</Button></div>)}
          </>}
        </>}
      </section>;
    })}
    {uploading && <p role="status">Preparando fotos...</p>}
    <Button type="button" variant="outline" onClick={()=>onChange([...activities,{id:crypto.randomUUID(),servicoId:'',quantidade:1,localExecucao:activities[0]?.localExecucao || '',tagEquipamento:'',fotos:[],produtosUtilizados:[]}])}>Adicionar atividade</Button>
  </fieldset>;
}
