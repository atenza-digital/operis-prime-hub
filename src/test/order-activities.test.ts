import { describe, expect, it } from 'vitest';
import { assertExecutionDate, legacyActivities, normalizeActivities } from '../../server/order-activities.mjs';
import { sanitizeOrders, sanitizeMeasurements } from '../../server/commercial-visibility.mjs';
import { initialOrderActivities } from '@/components/OrderActivityEditor';
import { buildOsPrintHtml } from '@/lib/osPrint';

const activity = { id:'a1',servicoId:'s1',quantidade:1,localExecucao:'Canteiro C2',tagEquipamento:'BEB-01',fotos:['data:image/png;base64,AAAA'],produtosUtilizados:[] };
describe('atividades independentes da OS', () => {
  it('preserva serviço, local e fotos de cada equipamento', () => {
    const result=normalizeActivities([activity,{...activity,id:'a2',servicoId:'s2',tagEquipamento:'BEB-02',fotos:['data:image/png;base64,BBBB']}],{closing:true});
    expect(result[0].localExecucao).toBe('Canteiro C2');
    expect(result[1].servicoId).toBe('s2');
    expect(result[1].fotos).not.toEqual(result[0].fotos);
  });
  it('não redistribui fotos legadas entre equipamentos', () => {
    expect(()=>legacyActivities({tags:'01,02',fotos:['foto']})).toThrow(/individualmente/);
    const drafts=initialOrderActivities({tags:'01,02',quantidade:2,servico:'Serviço',localExecucao:'C2',fotos:['foto']} as never,{services:[{id:'s1',nome:'Serviço'}]} as never);
    expect(drafts).toHaveLength(2);
    expect(drafts.every(a=>a.fotos.length===0)).toBe(true);
  });
  it('rejeita duplicidade, quantidade inválida e múltiplas tags', () => {
    expect(()=>normalizeActivities([activity,{...activity,id:'a2'}],{closing:true})).toThrow(/mesma foto/);
    expect(()=>normalizeActivities([activity,activity])).toThrow(/única/);
    for (const quantidade of [0,-1,Infinity,NaN]) expect(()=>normalizeActivities([{...activity,quantidade}])).toThrow(/quantidade/);
    expect(()=>normalizeActivities([{...activity,tagEquipamento:'01,02'}])).toThrow(/um equipamento/);
    expect(()=>normalizeActivities([{...activity,fotos:['1','2','3','4']}])).toThrow(/três/);
  });
  it('não executada exige motivo e não consome estoque', () => {
    expect(()=>normalizeActivities([{...activity,naoExecutada:true}],{closing:true})).toThrow(/motivo/);
    expect(()=>normalizeActivities([{...activity,naoExecutada:true,motivoNaoExecucao:'Sem acesso',produtosUtilizados:[{produtoId:'p1',quantidade:1}]}],{closing:true})).toThrow(/consumo/);
  });
  it('valida datas impossíveis sem erro interno', () => {
    for(const date of ['2026-13-01','2026-02-30','abc','2026-00-00']) expect(()=>assertExecutionDate(date)).toThrow(/data de execução válida/);
    expect(()=>assertExecutionDate('2026-09-24')).not.toThrow();
  });
  it('não expõe valores nas atividades nem nos snapshots operacionais', () => {
    const input=[{atividades:[{...activity,valorUnitario:99}],snapshotDados:{encerramento:{contrato:{valorUnitario:99},operacao:{atividades:[{valorUnitario:99}]}}}}];
    expect(JSON.stringify(sanitizeOrders(input,['os.manage']))).not.toContain('valorUnitario');
    expect(sanitizeOrders(input,['medicoes.manage'])).toEqual(input);
    expect(JSON.stringify(sanitizeMeasurements([{snapshotDados:{itens:[{valorTotal:99}],total:99}}],[]))).not.toContain('99');
    expect(input[0].atividades[0].valorUnitario).toBe(99);
  });
  it('imprime todos os itens, sem truncar o documento', () => {
    const html=buildOsPrintHtml({id:'OS1',numero:'OS-1',dataEmissao:'2026-09-24',servico:'Serviço',atividades:Array.from({length:20},(_,i)=>({...activity,id:`a${i}`,servicoNome:`Serviço ${i+1}`}))} as never,{bootstrap:null});
    expect(html).toContain('Serviço 20');
    expect(html).not.toContain('height: 284mm');
    expect(html).not.toContain('CPF:');
  });
});
