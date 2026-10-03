const test = require('node:test');
const assert = require('node:assert/strict');
const {validateImageSubmit} = require('../image_submit_contract');
const gate = {scope:{jobId:'job-a',targetId:'target-a',href:'https://chatgpt.com/?mesajify_image_job_id=job-a'},expectedReferences:2};
const actual = {jobId:'job-a',href:gate.scope.href,userCount:0};
const attachments = {count:2,ready:true};
test('exact fresh owner, two ready attachments and approved prompt permit submit',()=>{
  assert.equal(validateImageSubmit(gate,actual,attachments,'approved prompt','approved prompt'),null);
});
for(const [name,patch] of [['navigation',{href:'https://chatgpt.com/c/canary'}],['owner change',{jobId:'job-b'}],['existing turn',{userCount:1}]])
  test(name+' prevents send',()=>{
    assert.equal(validateImageSubmit(gate,{...actual,...patch},attachments,'approved prompt','approved prompt'),'CDP_CONVERSATION_SCOPE_MISMATCH');
  });
for(const state of [{count:1,ready:true},{count:3,ready:true},{count:2,ready:false}])
  test(JSON.stringify(state)+' prevents send',()=>{
    assert.equal(validateImageSubmit(gate,actual,state,'approved prompt','approved prompt'),'REFERENCE_ATTACHMENT_FAILED');
  });
test('empty or replaced prompt cannot be mistaken for successful submit',()=>{
  for(const text of ['', 'other tenant prompt']) assert.equal(validateImageSubmit(gate,actual,attachments,text,'approved prompt'),'IMAGE_PROMPT_MISMATCH');
});
test('browser-serialized predicate remains self-contained',()=>{
  const serialized = require('node:vm').runInNewContext('('+validateImageSubmit.toString()+')');
  assert.equal(serialized(gate,actual,attachments,'approved prompt','approved prompt'),null);
});
test('editor paragraph whitespace does not change approved prompt content',()=>{
  assert.equal(validateImageSubmit(gate,actual,attachments,'Marka: Mesajify.\n\nÜrün korunmalı.','Marka: Mesajify.\nÜrün korunmalı.'),null);
  assert.equal(validateImageSubmit(gate,actual,attachments,'Marka: Mesajify.\nÜrün değiştirilmeli.','Marka: Mesajify.\nÜrün korunmalı.'),'IMAGE_PROMPT_MISMATCH');
});
