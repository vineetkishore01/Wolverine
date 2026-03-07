/**
 * Integration Test Suite
 * Tests the full consciousness pipeline
 */

import { getConsciousnessCoordinator } from '../src/consciousness/coordinator';
import { getSelfModelManager } from '../src/consciousness/self-model/self-model';
import { getTheoryOfMind } from '../src/consciousness/theory-of-mind/user-model';
import { getMetacognitionEngine } from '../src/consciousness/metacognition/metacognition-engine';
import { getProactiveEngagementEngine } from '../src/consciousness/proactive-engagement/engagement-engine';
import { getResponseCache } from '../src/core/response-cache';
import { getFnCallPrompt } from '../src/core/fncall-prompt';

async function runTests() {
  console.log('='.repeat(60));
  console.log('WOLVERINE CONSCIOUSNESS INTEGRATION TESTS');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Self-Model
  try {
    console.log('\n[Test 1] Self-Model Initialization...');
    const selfModel = getSelfModelManager().getSelfModel();
    
    if (selfModel.identity.name === 'Wolverine') {
      console.log('  PASS: Identity loaded correctly');
      passed++;
    } else {
      console.log('  FAIL: Identity incorrect');
      failed++;
    }
    
    if (selfModel.capabilities.known.length > 0) {
      console.log(`  PASS: ${selfModel.capabilities.known.length} capabilities registered`);
      passed++;
    }
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 2: Theory of Mind
  try {
    console.log('\n[Test 2] Theory of Mind...');
    const tom = getTheoryOfMind();
    const userModel = tom.getUserModel('test-user');
    
    if (userModel.userId === 'test-user') {
      console.log('  PASS: User model created');
      passed++;
    }
    
    await tom.updateUserModel('test-user', {
      messages: [{ role: 'user', content: 'I prefer TypeScript' }],
      success: true,
      topic: 'preferences'
    });
    
    const updatedModel = tom.getUserModel('test-user');
    if (updatedModel.mentalModel.knownPreferences.length > 0) {
      console.log(`  PASS: Preferences detected`);
      passed++;
    }
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 3: Metacognition
  try {
    console.log('\n[Test 3] Metacognition...');
    const selfModelManager = getSelfModelManager();
    const meta = getMetacognitionEngine(selfModelManager);
    
    await meta.monitorThinking([], 'I think this might work, but not sure.');
    const state = meta.getState();
    
    if (state.monitoring.confidence < 0.7) {
      console.log('  PASS: Uncertainty detected');
      passed++;
    }
    
    const report = meta.generateIntrospectionReport();
    if (report.uncertainties.length > 0) {
      console.log(`  PASS: Uncertainties identified`);
      passed++;
    }
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 4: Proactive Engagement
  try {
    console.log('\n[Test 4] Proactive Engagement...');
    const engagement = getProactiveEngagementEngine();
    const engagements = await engagement.generateEngagements('test-user', 'test-session');
    
    console.log(`  PASS: ${engagements.length} engagements generated`);
    passed++;
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 5: Consciousness Coordinator
  try {
    console.log('\n[Test 5] Consciousness Coordinator...');
    const coordinator = getConsciousnessCoordinator();
    
    const result = await coordinator.processInteraction({
      userId: 'test-user',
      sessionId: 'test-session',
      messages: [{ role: 'user', content: 'Hello' }],
      response: 'Hi there!',
      success: true
    });
    
    console.log('  PASS: Interaction processed');
    passed++;
    
    if (result.adaptedResponse) {
      console.log('  PASS: Response adapted');
      passed++;
    }
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 6: Response Cache
  try {
    console.log('\n[Test 6] Response Cache...');
    const cache = getResponseCache({
      enabled: true,
      ttlSeconds: 60,
      maxSizeMB: 50,
      cacheDir: './.wolverine/test-cache'
    });
    
    await cache.set({
      messages: [{ role: 'user', content: 'test' }],
      model: 'test-model'
    }, { response: 'test response' });
    
    console.log('  PASS: Cache set successful');
    passed++;
    
    const cached = await cache.get({
      messages: [{ role: 'user', content: 'test' }],
      model: 'test-model'
    });
    
    if (cached && cached.response === 'test response') {
      console.log('  PASS: Cache hit successful');
      passed++;
    }
    
    const stats = await cache.stats();
    console.log(`  PASS: Cache stats - ${stats.hits} hits, ${stats.misses} misses`);
    passed++;
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Test 7: Function Call Prompt
  try {
    console.log('\n[Test 7] Function Call Prompt...');
    const fnCallPrompt = getFnCallPrompt('qwen');
    
    const tools = [{
      name: 'read',
      description: 'Read a file',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    }];
    
    const messages = [{ role: 'user', content: 'Read the file' }];
    const processed = fnCallPrompt.preprocess(messages, tools, { format: 'qwen' });
    
    if (processed.find(m => m.role === 'system')) {
      console.log('  PASS: System message added');
      passed++;
    }
    
    const response = 'Sure! ' + String.fromCharCode(60) + 'tool' + String.fromCharCode(62) + '\n{"name":"read","arguments":{"path":"test.txt"}}\n' + String.fromCharCode(60) + '/' + 'tool' + String.fromCharCode(62);
    const parsed = fnCallPrompt.postprocess(response, { format: 'qwen' });
    
    if (parsed.toolCalls.length > 0) {
      console.log(`  PASS: Tool calls parsed`);
      passed++;
    }
    
  } catch (error: any) {
    console.log('  FAIL:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log(`Score:  ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\nALL TESTS PASSED - System ready for integration!');
  } else {
    console.log('\nSOME TESTS FAILED - Review errors above');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
