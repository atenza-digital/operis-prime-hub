import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import QRCode from 'qrcode';
import { pool, query } from '../server/db.mjs';
import { hashPassword } from '../server/auth.mjs';

const baseUrl = process.env.OPERATIONAL_TEST_URL || 'http://localhost:14311';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl) && baseUrl !== 'https://fieldops-homologacao.atenza.digital') throw new Error('Use apenas desenvolvimento ou homologação.');
const run = crypto.randomBytes(5).toString('hex');
const tenantId = crypto.randomUUID(), userId = crypto.randomUUID(), roleId = crypto.randomUUID();
const slug = `qa-atividades-${run}`, email = `${slug}@example.invalid`, password = crypto.randomBytes(24).toString('base64url');
const ids = Object.fromEntries(['client','service','second','contract','product','order','open','stock'].map(key=>[key,`QA-${key.slice(0,3)}-${run}`]));
const output = process.env.OPERATIONAL_TEST_OUTPUT || `output/validacao-atividades-${run}`;
const today = new Date().toISOString().slice(0,10);
const results = [];
let token;
async function api(route, body, method = 'POST', status = 200) {
  const response = await fetch(baseUrl + '/api' + route, { method, headers: { 'Content-Type':'application/json', Origin:baseUrl, ...(token ? {Authorization:`Bearer ${token}`} : {}) }, ...(body!==undefined?{body:JSON.stringify(body)}:{}) });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(data).slice(0,500)}`);
  return data;
}
async function asset(name) { return 'data:image/png;base64,' + (await fs.readFile(new URL(`seed-assets/ciperprag/${name}`,import.meta.url))).toString('base64'); }
try {
  await fs.mkdir(output,{recursive:true});
  const config = { documentLogoLightUrl:await asset('logo-ciperprag-documental.png'),brandIconUrl:await asset('marca-dagua-icone-ciperprag.png'),
    seloInstitucionalUrl:await asset('brasao-municipio-parauapebas.png'),logoAnvisaUrl:await asset('logo-anvisa.png'),assinaturaUrl:await asset('assinatura-aline-costa-vieira.png'),
    responsavelTecnico:'Responsável de teste',cargoResponsavel:'Validação automatizada',assinaturaModo:'imagem',publicBaseUrl:baseUrl,
    titulo:'CERTIFICADO DE TESTE - NÃO USAR COMERCIALMENTE',corPrimaria:'#0f766e' };
  await query("INSERT INTO ciperprag_hub.tenants(id,slug,razao_social,nome_fantasia,status) VALUES($1,$2,'QA atividades','QA atividades','ativo')",[tenantId,slug]);
  await query("INSERT INTO ciperprag_hub.usuarios(id,tenant_id,nome,email,senha_hash,status,senha_temporaria,senha_alterada_em) VALUES($1,$2,'QA automatizado',$3,$4,'ativo',FALSE,NOW())",[userId,tenantId,email,await hashPassword(password)]);
  await query("INSERT INTO ciperprag_hub.perfis(id,tenant_id,codigo,nome) VALUES($1,$2,'admin_empresa','QA temporário')",[roleId,tenantId]);
  await query('INSERT INTO ciperprag_hub.perfil_permissoes(perfil_id,permissao_id) SELECT $1,id FROM ciperprag_hub.permissoes',[roleId]);
  await query('INSERT INTO ciperprag_hub.usuario_perfis(usuario_id,perfil_id) VALUES($1,$2)',[userId,roleId]);
  await query("INSERT INTO ciperprag_hub.empresa_config(tenant_id,razao_social,cnpj,certificado_config,responsavel_tecnico,certificado_validade_padrao_dias) VALUES($1,'Empresa QA LTDA','11.222.333/0001-44',$2,'Responsável de teste',90)",[tenantId,JSON.stringify(config)]);
  await query('INSERT INTO ciperprag_hub.numeracao_config(tenant_id) VALUES($1)',[tenantId]);
  await query("INSERT INTO ciperprag_hub.clientes(id,tenant_id,razao_social,nome_fantasia,cnpj,endereco,municipio,uf) VALUES($1,$2,'Cliente QA LTDA','Canteiro não é razão social','11.222.333/0001-44','Rua dos testes','Parauapebas','PA')",[ids.client,tenantId]);
  for (const [id,name,validity] of [[ids.service,'Higienização de bebedouro',0],[ids.second,'Manutenção técnica',30]]) await query("INSERT INTO ciperprag_hub.servicos_catalogo(id,tenant_id,nome,tipo,unidade,gera_certificado,validade_certificado_dias,exige_foto,permite_nao_execucao) VALUES($1,$2,$3,'sanitario','un.',TRUE,$4,TRUE,TRUE)",[id,tenantId,name,validity]);
  await query("INSERT INTO ciperprag_hub.produtos_estoque(id,tenant_id,codigo,nome,unidade,quantidade_atual) VALUES($1,$2,$1,'Produto QA','L',20)",[ids.product,tenantId]);
  await query("INSERT INTO ciperprag_hub.contratos(id,tenant_id,cliente_id,cliente,servico,tipo,contratado,executado,status,servico_catalogo_id,valor_unitario) VALUES($1,$2,$3,'Cliente QA LTDA','Higienização de bebedouro','sanitario',10,0,'ativo',$4,100)",[ids.contract,tenantId,ids.client,ids.service]);
  for (const [id,contract] of [[ids.order,ids.contract],[ids.open,null],[ids.stock,null]]) await query("INSERT INTO ciperprag_hub.ordens_servico(id,tenant_id,numero,cliente_id,cliente,cnpj,servico,tipo,contrato_id,servico_catalogo_id,local_execucao,status,data_emissao,quantidade,unidade) VALUES($1,$2,$1,$3,'Cliente QA LTDA','11.222.333/0001-44','Higienização de bebedouro','sanitario',$4,$5,'Canteiro C2','aberta',CURRENT_DATE,1,'un.')",[id,tenantId,ids.client,contract,ids.service]);
  const login = await api('/auth/login',{email,password,tenantSlug:slug});
  token = login.token;
  assert.ok(token,'Login deve retornar token');
  if (process.env.OPERATIONAL_TEST_UI === '1') {
    const { chromium } = await import('playwright-core');
    const { resolveChromiumExecutable } = await import('../server/render-pdf.mjs');
    const browser = await chromium.launch({executablePath:resolveChromiumExecutable(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    try {
      const page=await browser.newPage({viewport:{width:1440,height:1000}});
      const failures=[]; page.on('pageerror',e=>failures.push(e.message));
      await page.addInitScript(value=>localStorage.setItem('atenza_fieldops_auth_token',value),token);
      await page.goto(baseUrl+'/ordens');
      await page.getByRole('button',{name:'Editar',exact:true}).first().waitFor({timeout:30000}).catch(async error => {
        await page.screenshot({path:output+'/erro-interface.png',fullPage:true});
        console.error('Interface:',page.url(),(await page.locator('body').innerText()).slice(0,1500),failures);
        throw error;
      });
      await page.getByRole('button',{name:'Editar',exact:true}).first().click();
      const dialog=page.getByRole('dialog');
      await dialog.getByRole('button',{name:'Adicionar atividade',exact:true}).click();
      await dialog.getByRole('region',{name:'Atividade 2',exact:true}).getByRole('combobox').selectOption(ids.second);
      await dialog.getByRole('region',{name:'Atividade 2',exact:true}).getByPlaceholder('Ex.: Canteiro C2').fill('Canteiro C3');
      await page.screenshot({path:output+'/atividades-desktop.png',fullPage:true});
      await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await page.reload();
      await page.getByRole('button',{name:'Editar',exact:true}).first().click();
      assert.equal(await page.getByRole('region',{name:'Atividade 2',exact:true}).getByPlaceholder('Ex.: Canteiro C2').inputValue(),'Canteiro C3');
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:output+'/atividades-mobile.png',fullPage:true});
      await page.getByRole('region',{name:'Atividade 2',exact:true}).getByRole('button',{name:'Remover',exact:true}).click();
      await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await page.goto(baseUrl+'/comercial/produtos');
      await page.getByText('Produto QA',{exact:true}).first().waitFor();
      await page.screenshot({path:output+'/estoque.png',fullPage:true});
      assert.deepEqual(failures,[]);
      results.push('Interface desktop/mobile: atividade adicionada, salva, recarregada e removida; catálogo de estoque carregado');
    } finally { await browser.close(); }
  }
  await api(`/orders/${ids.open}/certificado`,undefined,'POST',409);
  results.push('Emissão de OS aberta bloqueada');
  const scheduled=await api('/agendamentos',{clienteId:ids.client,servicoCatalogoId:ids.service,dataAgendada:today,localExecucao:'Canteiro livre C2'});
  const generated=await Promise.all([api(`/agendamentos/${scheduled.id}/gerar-os`,{}),api(`/agendamentos/${scheduled.id}/gerar-os`,{})]);
  assert.equal(generated[0].id,generated[1].id);
  const scheduleData=await api('/bootstrap',undefined,'GET');
  const generatedOrder=scheduleData.orders.find(o=>o.id===generated[0].id);
  assert.equal(generatedOrder.localExecucao,'Canteiro livre C2');
  assert.equal(generatedOrder.contratoId,null);
  results.push('Agendamento avulso com local livre; geração concorrente sem duplicar OS');
  const activities = await Promise.all(Array.from({length:5},async(_,i)=>({id:`beb-${i+1}`,servicoId:ids.service,quantidade:1,localExecucao:'Canteiro C2',tagEquipamento:`BEB-0${i+1}`,fotos:[await QRCode.toDataURL(`FOTO TESTE EQUIPAMENTO ${i+1}`)],produtosUtilizados:[{produtoId:ids.product,quantidade:1}]})));
  await api(`/orders/${ids.order}`,{atividades:[...activities,{...activities[0],id:'remover',servicoId:ids.second,fotos:[]}]},'PATCH');
  await api(`/orders/${ids.order}`,{atividades:activities},'PATCH');
  const draft = await api('/bootstrap',undefined,'GET');
  assert.equal(draft.orders.find(o=>o.id===ids.order).atividades.length,5);
  await api(`/orders/${ids.order}/encerrar`,{dataExecucao:today,atividades:activities.map((a,i)=>i===1?{...a,fotos:activities[0].fotos}:a)},'POST',400);
  await api(`/orders/${ids.order}/encerrar`,{dataExecucao:today,atividades:[{...activities[0],quantidade:0}]},'POST',400);
  await api(`/orders/${ids.order}/encerrar`,{dataExecucao:today,atividades:[{...activities[0],quantidade:11}]},'POST',409);
  await api(`/orders/${ids.stock}/encerrar`,{dataExecucao:today,atividades:[{...activities[0],produtosUtilizados:[{produtoId:ids.product,quantidade:100}]}]},'POST',409);
  results.push('Edição/remoção persistida; fotos duplicadas, quantidade zero, falta de saldo contratual e estoque bloqueadas');
  const payload={dataExecucao:today,atividades:activities};
  const [closed,repeated] = await Promise.all([api(`/orders/${ids.order}/encerrar`,payload),api(`/orders/${ids.order}/encerrar`,payload)]);
  assert.equal(closed.certificateHashes.length,5);
  assert.deepEqual([...repeated.certificateHashes].sort(),[...closed.certificateHashes].sort());
  const issued=await api(`/orders/${ids.order}/certificado`);
  assert.equal(issued.hashes.length,5);
  const bootstrap=await api('/bootstrap',undefined,'GET');
  const certs=bootstrap.certificates.filter(c=>c.osId===ids.order);
  assert.equal(certs.length,5);
  for(const cert of certs){
    assert.equal(cert.validadeDias,0,'Zero não pode virar a validade padrão');
    const activity=activities.find(a=>a.id===cert.atividadeId);
    assert.deepEqual(cert.snapshotDados.os.fotos,activity.fotos);
    assert.equal(cert.snapshotDados.cliente.nome,'Cliente QA LTDA');
    const verified=await api(`/certificates/${cert.snapshotDados.certificado.codigoPublico}`,undefined,'GET');
    assert.equal(verified.certificate.id,cert.id);
    const attachment=bootstrap.attachments.find(a=>a.entidadeTipo==='certificado'&&a.entidadeId===cert.id&&a.templateVersao==='documental-v1');
    assert.ok(attachment);
    const response=await fetch(baseUrl+`/api/attachments/${attachment.id}/download`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);
    const pdf=Buffer.from(await response.arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'),attachment.hashSha256);
    await fs.writeFile(`${output}/certificado-${activity.tagEquipamento}.pdf`,pdf);
  }
  const {rows:stock}=await query('SELECT quantidade_atual FROM ciperprag_hub.produtos_estoque WHERE id=$1 AND tenant_id=$2',[ids.product,tenantId]);
  const {rows:contract}=await query('SELECT executado FROM ciperprag_hub.contratos WHERE id=$1 AND tenant_id=$2',[ids.contract,tenantId]);
  assert.equal(Number(stock[0].quantidade_atual),15);
  assert.equal(Number(contract[0].executado),5);
  const {rows:movements}=await query('SELECT * FROM ciperprag_hub.estoque_movimentacoes WHERE os_id=$1 AND tenant_id=$2',[ids.order,tenantId]);
  assert.equal(movements.length,5);
  results.push('Encerramento concorrente e reemissão de solicitação sem duplicidade; cinco certificados, cinco fotos distintas e cinco baixas');
  await api(`/orders/${ids.order}`,{atividades:activities},'PATCH',409);
  const measurement=await api('/measurements/generate',{clienteNome:'Cliente QA LTDA',dataInicio:today,dataFim:today});
  assert.equal(measurement.measurement.itens.length,5);
  assert.equal(measurement.measurement.total,500);
  const replacement=await api(`/certificates/${certs[0].id}/reissue`,{motivo:'Validação da reemissão individual'});
  assert.equal(replacement.hashes.length,1);
  const updated=await api('/bootstrap',undefined,'GET');
  assert.equal(updated.certificates.filter(c=>c.status==='emitido').length,5);
  assert.equal(updated.certificates.filter(c=>c.status==='revogado').length,1);
  results.push('OS encerrada protegida; medição por atividade; substituição de um único certificado');
  // Issued bytes must not change when company settings or customer names change.
  await query("UPDATE ciperprag_hub.empresa_config SET razao_social='Nome alterado após emissão',certificado_config='{}' WHERE tenant_id=$1",[tenantId]);
  await query("UPDATE ciperprag_hub.clientes SET razao_social='Cliente alterado após emissão' WHERE id=$1 AND tenant_id=$2",[ids.client,tenantId]);
  for(const a of updated.attachments.filter(a=>a.templateVersao==='documental-v1')) {
    const response=await fetch(baseUrl+`/api/attachments/${a.id}/download`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),a.hashSha256);
  }
  results.push('PDFs imutáveis: hash dos arquivos preservado após alteração da empresa e do cliente');
  for(const attachment of updated.attachments.filter(a=>['os','medicao'].includes(a.entidadeTipo)&&a.templateVersao==='documental-v1')){
    const r=await fetch(baseUrl+`/api/attachments/${attachment.id}/download`,{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(r.status,200);
    await fs.writeFile(`${output}/${attachment.entidadeTipo}.pdf`,Buffer.from(await r.arrayBuffer()));
  }
  await fs.writeFile(`${output}/resultado.json`,JSON.stringify({ok:true,baseUrl,tenant:slug,results,generatedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({ok:true,output,baseUrl,results},null,2));
} finally {
  // Keep evidence auditable, but disable the isolated QA company and its temporary login.
  await query("UPDATE ciperprag_hub.usuarios SET status='inativo' WHERE id=$1 AND tenant_id=$2",[userId,tenantId]).catch(()=>{});
  await query("UPDATE ciperprag_hub.tenants SET status='inativo' WHERE id=$1 AND slug=$2",[tenantId,slug]).catch(()=>{});
  await pool.end();
}
